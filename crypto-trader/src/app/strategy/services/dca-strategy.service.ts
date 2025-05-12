import { BalanceSnapshot, Trade } from '@forex-trader/shared/data-access';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import ccxt from 'ccxt';
import { BinanceService } from '../../exchange/services/binance.service';

@Injectable()
export class DcaStrategyService {
  private readonly logger = new Logger(DcaStrategyService.name);

  private symbolsToTrade = ['BTC/USDT', 'ETH/USDT', 'LTC/USDT', 'XRP/USDT'];
  private maxTradeUSDBySymbol: Record<string, number> = {
    'BTC/USDT': 200,
    'ETH/USDT': 200,
    'LTC/USDT': 200,
    'XRP/USDT': 200,
  };
  private fastPeriod = 5;
  private slowPeriod = 20;
  private cooldownMs = 60 * 1000;
  private priceTrendDelta = 0.1;

  private lastActions: Record<string, 'BUY' | 'SELL' | null> = {};
  private lastTradeTimestamps: Record<string, number> = {};
  private previousFastMAs: Record<string, number> = {};

  private assetsToLog = ['BTC', 'ETH', 'LTC', 'XRP', 'USDT'];
  private readonly ccxtClient = new ccxt.binance({
    options: { defaultType: 'spot' },
  });

  constructor(
    private readonly binanceService: BinanceService,
    @InjectRepository(Trade)
    private readonly tradeRepo: EntityRepository<Trade>,
    @InjectRepository(BalanceSnapshot)
    private readonly snapshotRepo: EntityRepository<BalanceSnapshot>
  ) {
    this.logger.log('DCA Strategy Service Initialized');
  }

  @Cron('0 * * * * *')
  async executeSmartTrade() {
    const now = Date.now();
    const balance = await this.binanceService.getBalance();
    const markets = await this.ccxtClient.loadMarkets();
    const symbolSignals = await this.evaluateSignals(now, markets);
    const buyCandidates = this.getCandidates(symbolSignals, 'BUY');
    const sellCandidates = this.getCandidates(symbolSignals, 'SELL');

    if (buyCandidates.length && sellCandidates.length) {
      await this.performRebalance(
        buyCandidates,
        sellCandidates,
        now,
        balance,
        markets
      );
    } else {
      for (const [symbol] of buyCandidates) {
        await this.tryStandaloneBuy(symbol, now, balance, markets);
      }
    }
  }

  private async evaluateSignals(now: number, markets: any) {
    const symbolSignals: Record<
      string,
      { signal: 'BUY' | 'SELL' | null; strength: number }
    > = {};

    for (const symbol of this.symbolsToTrade) {
      if (now - (this.lastTradeTimestamps[symbol] || 0) < this.cooldownMs) {
        this.logger.log(`[${symbol}] Skipped due to cooldown.`);
        continue;
      }

      const market = markets[symbol];
      if (!market?.limits?.amount?.min || !market?.limits?.cost?.min) {
        this.logger.warn(`[${symbol}] Skipped due to missing market limits.`);
        continue;
      }

      const closes = (
        await this.binanceService.getCandles(symbol, '1m', this.slowPeriod)
      ).map((c) => c[4]);
      const fastMA = this.calculateSMA(closes.slice(-this.fastPeriod));
      const slowMA = this.calculateSMA(closes);

      const prevFastMA = this.previousFastMAs[symbol] ?? fastMA;
      const lastAction = this.lastActions[symbol] || null;
      const delta = this.priceTrendDelta;
      const strength = Math.abs(fastMA - slowMA);

      const shouldBuy =
        fastMA > slowMA &&
        (lastAction !== 'BUY' || fastMA - prevFastMA > delta);
      const shouldSell =
        fastMA < slowMA &&
        (lastAction !== 'SELL' || prevFastMA - fastMA > delta);

      const signal = shouldBuy ? 'BUY' : shouldSell ? 'SELL' : null;
      symbolSignals[symbol] = { signal, strength };
      this.logger.log(
        `[${symbol}] fastMA=${fastMA.toFixed(4)} slowMA=${slowMA.toFixed(
          4
        )} signal=${signal}`
      );

      this.previousFastMAs[symbol] = fastMA;
    }

    return symbolSignals;
  }

  private getCandidates(
    signals: Record<
      string,
      { signal: 'BUY' | 'SELL' | null; strength: number }
    >,
    targetSignal: 'BUY' | 'SELL'
  ) {
    return Object.entries(signals).filter(
      ([_, s]) => s.signal === targetSignal
    );
  }

  private async performRebalance(
    buyCandidates: [string, { signal: 'BUY' | 'SELL'; strength: number }][],
    sellCandidates: [string, { signal: 'BUY' | 'SELL'; strength: number }][],
    now: number,
    balance: any,
    markets: any
  ) {
    const [buySymbol] = this.selectStrongestCandidate(buyCandidates);
    const [sellSymbol] = this.selectStrongestCandidate(sellCandidates);

    this.logger.log(`Rebalancing: Selling ${sellSymbol} to buy ${buySymbol}`);

    const sellAsset = sellSymbol.split('/')[0];
    const sellBalance = parseFloat(balance[sellAsset]?.free ?? '0');
    const sellPrice = await this.binanceService.getCurrentPrice(sellSymbol);
    const sellMaxAmount =
      (this.maxTradeUSDBySymbol[sellSymbol] ?? Infinity) / sellPrice;
    const sellAmount = Math.min(sellBalance, sellMaxAmount);

    if (sellAmount <= 0) {
      return this.logger.warn(`Insufficient balance to sell ${sellSymbol}`);
    }

    try {
      const sellOrder = await this.binanceService.placeMarketSell(
        sellSymbol,
        sellAmount
      );
      this.logger.log(`[${sellSymbol}] Sold ${sellAmount}`);
      await this.logTrade('SELL', sellOrder, sellSymbol);
      this.lastActions[sellSymbol] = 'SELL';
      this.lastTradeTimestamps[sellSymbol] = now;

      const proceeds = Number(sellOrder.cost ?? '0');
      await this.buySymbolWithProceeds(buySymbol, proceeds, now, markets);
    } catch (e) {
      this.logger.error(`Rebalancing error: ${JSON.stringify(e)}`);
    }
  }

  private async tryStandaloneBuy(
    symbol: string,
    now: number,
    balance: any,
    markets: any
  ) {
    const usdtFree = parseFloat(balance['USDT']?.free ?? '0');
    const price = await this.binanceService.getCurrentPrice(symbol);
    const maxUSD = this.maxTradeUSDBySymbol[symbol] ?? Infinity;
    const usdToSpend = Math.min(maxUSD, usdtFree);

    if (usdToSpend <= 0) {
      this.logger.log(`[${symbol}] No USDT available for standalone buy`);
      return;
    }

    const market = markets[symbol];
    let amount = usdToSpend / price;

    if (amount < market.limits.amount.min) amount = market.limits.amount.min;
    if (amount * price < market.limits.cost.min)
      amount = market.limits.cost.min / price;

    try {
      const order = await this.binanceService.placeMarketBuy(symbol, amount);
      this.logger.log(`[${symbol}] Bought ${amount}`);
      await this.logTrade('BUY', order, symbol);
      this.lastActions[symbol] = 'BUY';
      this.lastTradeTimestamps[symbol] = now;
    } catch (e) {
      this.logger.error(
        `Standalone buy error for ${symbol}: ${JSON.stringify(e)}`
      );
    }
  }

  private async buySymbolWithProceeds(
    symbol: string,
    usdAmount: number,
    now: number,
    markets: any
  ) {
    const price = await this.binanceService.getCurrentPrice(symbol);
    const market = markets[symbol];
    let amount = Math.min(
      usdAmount / price,
      (this.maxTradeUSDBySymbol[symbol] ?? Infinity) / price
    );

    if (amount < market.limits.amount.min) amount = market.limits.amount.min;
    if (amount * price < market.limits.cost.min)
      amount = market.limits.cost.min / price;

    const order = await this.binanceService.placeMarketBuy(symbol, amount);
    this.logger.log(`[${symbol}] Bought approx ${amount}`);
    await this.logTrade('BUY', order, symbol);
    this.lastActions[symbol] = 'BUY';
    this.lastTradeTimestamps[symbol] = now;
  }

  private selectStrongestCandidate(
    candidates: [string, { signal: 'BUY' | 'SELL'; strength: number }][]
  ): [string, { signal: 'BUY' | 'SELL'; strength: number }] {
    return candidates.sort((a, b) => b[1].strength - a[1].strength)[0];
  }

  @Cron('0 */5 * * * *')
  async logBalanceCron() {
    await this.logBalance();
  }

  private async logTrade(side: 'BUY' | 'SELL', order: any, symbol: string) {
    const trade = new Trade();
    trade.symbol = symbol;
    trade.side = side;
    trade.price = this.ensureEightDecimals(order?.price ?? '0.00000');
    trade.amount = this.ensureEightDecimals(order?.amount ?? '0.00000');
    await this.tradeRepo.getEntityManager().fork().persistAndFlush(trade);
  }

  private async logBalance() {
    this.logger.log('Logging balance');
    const balance = await this.binanceService.getBalance();
    const forkedEM = this.snapshotRepo.getEntityManager().fork();
    const balancesMap: Record<string, { free: string; locked: string }> = {};

    if (balance.info?.balances) {
      for (const item of balance.info.balances) {
        balancesMap[item.asset] = {
          free: item.free.toString(),
          locked: item.locked.toString(),
        };
      }
    }

    for (const asset of this.assetsToLog) {
      const bal = balancesMap[asset];
      const free = bal?.free ?? '0';
      const locked = bal?.locked ?? '0';
      const total = (parseFloat(free) + parseFloat(locked)).toString();

      const snap = new BalanceSnapshot();
      snap.asset = asset;
      snap.total = this.ensureEightDecimals(total);
      snap.free = this.ensureEightDecimals(free);

      forkedEM.persist(snap);
    }

    await forkedEM.flush();
  }

  private calculateSMA(data: number[]): number {
    return data.reduce((acc, val) => acc + val, 0) / data.length;
  }

  private ensureEightDecimals(value: string | number): string {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return num.toFixed(8);
  }
}
