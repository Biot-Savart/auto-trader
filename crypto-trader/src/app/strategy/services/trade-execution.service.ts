import { Trade } from '@forex-trader/shared/data-access';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable, Logger } from '@nestjs/common';
import { BinanceService } from '../../exchange/services/binance.service';
import { LoggingService } from './logging.service';
import { PortfolioGuardService } from './portfolio-guard.service';
import { TradeDecisionService } from './trade-decision.service';

@Injectable()
export class TradeExecutionService {
  private readonly logger = new Logger(TradeExecutionService.name);

  constructor(
    private readonly binanceService: BinanceService,
    private readonly portfolioGuard: PortfolioGuardService,
    private readonly loggingService: LoggingService,
    private readonly tradeDecisionService: TradeDecisionService
  ) {}

  async tryStandaloneBuy(
    symbol: string,
    now: number,
    balance: any,
    markets: any,
    fastPeriod: number,
    slowPeriod: number,
    maxTradeUSDBySymbol: Record<string, number>,
    assetsToLog: string[]
  ) {
    const usdtFree = parseFloat(balance['USDT']?.free ?? '0');
    const price = await this.binanceService.getCurrentPrice(symbol);
    const maxUSD = maxTradeUSDBySymbol[symbol] ?? Infinity;
    const market = markets[symbol];
    const closes = (
      await this.binanceService.getCandles(
        symbol,
        '1m',
        Math.max(slowPeriod, 30)
      )
    ).map((c) => c[4]);

    const fastMA =
      fastPeriod > 0
        ? this.tradeDecisionService['indicatorUtils'].calculateSMA(
            closes,
            fastPeriod
          )
        : 0;
    const slowMA =
      slowPeriod > 0
        ? this.tradeDecisionService['indicatorUtils'].calculateSMA(
            closes,
            slowPeriod
          )
        : 0;
    const strength = Math.abs(fastMA - slowMA);

    const confidenceMultiplier = Math.min(1.5, Math.max(0.5, strength * 5));
    const adjustedUSDToSpend =
      Math.min(maxUSD, usdtFree) * confidenceMultiplier;
    let amount = adjustedUSDToSpend / price;

    if (amount < market.limits.amount.min) amount = market.limits.amount.min;
    if (amount * price < market.limits.cost.min)
      amount = market.limits.cost.min / price;

    const allowed = await this.portfolioGuard.isWithinMaxAllocation(
      symbol,
      amount * price
    );
    if (!allowed) {
      this.logger.warn(
        `[${symbol}] Trade blocked: would exceed portfolio allocation.`
      );
      return;
    }

    if (amount * price > usdtFree) {
      this.logger.warn(
        `[${symbol}] Not enough USDT. Required: ${(amount * price).toFixed(
          2
        )}, Available: ${usdtFree}`
      );
      return;
    }

    try {
      const order = await this.binanceService.placeMarketBuy(symbol, amount);
      this.logger.log(
        `[${symbol}] Bought ${amount} (Confidence x${confidenceMultiplier.toFixed(
          2
        )}, Strength=${strength.toFixed(2)})`
      );
      await this.loggingService.logTrade('BUY', order, symbol);
      await this.loggingService.logBalance(assetsToLog);
    } catch (e) {
      this.logger.error(
        `Standalone buy error for ${symbol}: ${JSON.stringify(e)}`
      );
    }
  }

  async tryStandaloneSell(
    symbol: string,
    balance: any,
    markets: any,
    maxTradeUSDBySymbol: Record<string, number>,
    assetsToLog: string[]
  ) {
    const asset = symbol.split('/')[0];
    const freeBalance = parseFloat(balance[asset]?.free ?? '0');
    const price = await this.binanceService.getCurrentPrice(symbol);
    const maxUSD = maxTradeUSDBySymbol[symbol] ?? Infinity;
    const market = markets[symbol];

    if (freeBalance <= 0) {
      this.logger.warn(`[${symbol}] No balance to sell.`);
      return;
    }

    let sellAmount = Math.min(freeBalance, maxUSD / price);
    if (sellAmount < market.limits.amount.min)
      sellAmount = market.limits.amount.min;
    if (sellAmount * price < market.limits.cost.min)
      sellAmount = market.limits.cost.min / price;

    try {
      const order = await this.binanceService.placeMarketSell(
        symbol,
        sellAmount
      );
      this.logger.log(`[${symbol}] Sold ${sellAmount} as standalone SELL`);
      await this.loggingService.logTrade('SELL', order, symbol);
      await this.loggingService.logBalance(assetsToLog);
    } catch (e) {
      this.logger.error(
        `Standalone sell error for ${symbol}: ${JSON.stringify(e)}`
      );
    }
  }

  // This file builds on Dca-trade-execution.service.ts

  async performRebalance(
    buyCandidates: [string, { signal: 'BUY' | 'SELL'; strength: number }][],
    sellCandidates: [string, { signal: 'BUY' | 'SELL'; strength: number }][],
    now: number,
    balance: any,
    markets: any,
    maxTradeUSDBySymbol: Record<string, number>,
    assetsToLog: string[]
  ) {
    const [buySymbol] =
      this.tradeDecisionService.selectStrongestCandidate(buyCandidates);
    const [sellSymbol] =
      this.tradeDecisionService.selectStrongestCandidate(sellCandidates);

    this.logger.log(`Rebalancing: Selling ${sellSymbol} to buy ${buySymbol}`);

    const sellAsset = sellSymbol.split('/')[0];
    const sellBalance = parseFloat(balance[sellAsset]?.free ?? '0');
    const sellPrice = await this.binanceService.getCurrentPrice(sellSymbol);
    const sellMaxAmount =
      (maxTradeUSDBySymbol[sellSymbol] ?? Infinity) / sellPrice;
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
      await this.loggingService.logTrade('SELL', sellOrder, sellSymbol);

      const proceeds = Number(sellOrder.cost ?? '0');
      await this.buySymbolWithProceeds(
        buySymbol,
        proceeds,
        now,
        markets,
        maxTradeUSDBySymbol,
        assetsToLog
      );
    } catch (e) {
      this.logger.error(`Rebalance error: ${JSON.stringify(e)}`);
    }
  }

  async buySymbolWithProceeds(
    symbol: string,
    usdAmount: number,
    now: number,
    markets: any,
    maxTradeUSDBySymbol: Record<string, number>,
    assetsToLog: string[]
  ) {
    const price = await this.binanceService.getCurrentPrice(symbol);
    const market = markets[symbol];
    const balance = await this.binanceService.getBalance();
    const usdtFree = Number(balance['USDT']?.free ?? 0);

    const maxUSD = maxTradeUSDBySymbol[symbol] ?? Infinity;
    const usdToSpend = Math.min(maxUSD, usdAmount, usdtFree);

    if (usdToSpend <= 0) {
      this.logger.warn(`[${symbol}] Insufficient USDT to rebuy.`);
      return;
    }

    let amount = usdToSpend / price;
    if (amount < market.limits.amount.min) amount = market.limits.amount.min;
    if (amount * price < market.limits.cost.min)
      amount = market.limits.cost.min / price;

    const allowed = await this.portfolioGuard.isWithinMaxAllocation(
      symbol,
      amount * price
    );
    if (!allowed) return;

    try {
      const order = await this.binanceService.placeMarketBuy(symbol, amount);
      this.logger.log(`[${symbol}] Bought approx ${amount}`);
      await this.loggingService.logTrade('BUY', order, symbol);
      await this.loggingService.logBalance(assetsToLog);
    } catch (e) {
      this.logger.error(`Buy error for ${symbol}: ${JSON.stringify(e)}`);
    }
  }

  async sellWorstPerformingAssetToFund(
    symbol: string,
    neededUSDT: number,
    balance: any,
    markets: any,
    tradeRepo: EntityRepository<Trade>
  ): Promise<boolean> {
    const assets = Object.keys(balance).filter(
      (a) => a !== 'USDT' && parseFloat(balance[a]?.free ?? '0') > 0
    );

    type AssetPerformance = {
      asset: string;
      value: number;
      amount: number;
      symbol: string;
      entryPrice: number;
      currentPrice: number;
      pnlPercent: number;
    };
    const assetPerformances: AssetPerformance[] = [];

    for (const asset of assets) {
      try {
        const symbol = `${asset}/USDT`;
        const currentPrice = await this.binanceService.getCurrentPrice(symbol);
        const amount = parseFloat(balance[asset]?.free ?? '0');
        const value = currentPrice * amount;
        const lastBuy = await tradeRepo.findOne(
          { symbol, side: 'BUY' },
          { orderBy: { timestamp: 'DESC' } }
        );
        const entryPrice = Number(lastBuy?.price ?? currentPrice);
        const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
        assetPerformances.push({
          asset,
          value,
          amount,
          symbol,
          entryPrice,
          currentPrice,
          pnlPercent,
        });
      } catch (e) {
        this.logger.warn(
          `Price or PnL calc failed for ${asset}/USDT: ${e.message}`
        );
      }
    }

    assetPerformances.sort((a, b) => a.pnlPercent - b.pnlPercent);

    for (const asset of assetPerformances) {
      if (asset.value < neededUSDT * 0.5) continue;

      try {
        const sellAmount = Math.min(
          asset.amount,
          neededUSDT / asset.currentPrice
        );
        const order = await this.binanceService.placeMarketSell(
          asset.symbol,
          sellAmount
        );
        this.logger.log(
          `Sold ${sellAmount} of ${
            asset.asset
          } (PnL: ${asset.pnlPercent.toFixed(2)}%)`
        );
        await this.loggingService.logTrade('SELL', order, asset.symbol);
        return true;
      } catch (e) {
        this.logger.error(
          `Failed to sell ${asset.asset}: ${JSON.stringify(e)}`
        );
      }
    }

    this.logger.warn(`Could not sell any assets to fund ${symbol} purchase.`);
    return false;
  }

  async executeFallbackSell(
    sellCandidates: [string, { signal: 'BUY' | 'SELL'; strength: number }][],
    balance: any,
    markets: any,
    maxTradeUSDBySymbol: Record<string, number>,
    assetsToLog: string[]
  ) {
    if (!sellCandidates.length) return;

    const [symbol] =
      this.tradeDecisionService.selectStrongestCandidate(sellCandidates);
    await this.tryStandaloneSell(
      symbol,
      balance,
      markets,
      maxTradeUSDBySymbol,
      assetsToLog
    );
  }

  async executeSmartTradeFallback(
    buyCandidates: [string, { signal: 'BUY' | 'SELL'; strength: number }][],
    sellCandidates: [string, { signal: 'BUY' | 'SELL'; strength: number }][],
    now: number,
    balance: any,
    markets: any,
    fastPeriod: number,
    slowPeriod: number,
    maxTradeUSDBySymbol: Record<string, number>,
    assetsToLog: string[]
  ) {
    if (buyCandidates.length) {
      for (const [symbol] of buyCandidates) {
        await this.tryStandaloneBuy(
          symbol,
          now,
          balance,
          markets,
          fastPeriod,
          slowPeriod,
          maxTradeUSDBySymbol,
          assetsToLog
        );
      }
    } else if (sellCandidates.length) {
      await this.executeFallbackSell(
        sellCandidates,
        balance,
        markets,
        maxTradeUSDBySymbol,
        assetsToLog
      );
    } else {
      this.logger.log('No actionable signals this cycle.');
    }
  }

  async executeSmartTrade(
    symbolSignals: Record<
      string,
      { signal: 'BUY' | 'SELL' | null; strength: number }
    >,
    now: number,
    balance: any,
    markets: any,
    fastPeriod: number,
    slowPeriod: number,
    maxTradeUSDBySymbol: Record<string, number>,
    assetsToLog: string[]
  ) {
    const buyCandidates = this.tradeDecisionService.getCandidates(
      symbolSignals,
      'BUY'
    );
    const sellCandidates = this.tradeDecisionService.getCandidates(
      symbolSignals,
      'SELL'
    );

    if (buyCandidates.length && sellCandidates.length) {
      await this.performRebalance(
        buyCandidates,
        sellCandidates,
        now,
        balance,
        markets,
        maxTradeUSDBySymbol,
        assetsToLog
      );
    } else {
      await this.executeSmartTradeFallback(
        buyCandidates,
        sellCandidates,
        now,
        balance,
        markets,
        fastPeriod,
        slowPeriod,
        maxTradeUSDBySymbol,
        assetsToLog
      );
    }
  }
}
