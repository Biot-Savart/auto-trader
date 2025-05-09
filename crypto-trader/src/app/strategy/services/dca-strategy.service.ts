import { BalanceSnapshot, Trade } from '@forex-trader/shared/data-access';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BinanceService } from '../../exchange/services/binance.service';

@Injectable()
export class DcaStrategyService {
  private readonly logger = new Logger(DcaStrategyService.name);

  private symbolsToTrade = ['BTC/USDT', 'ETH/USDT', 'LTC/USDT', 'XRP/USDT'];
  private tradeAmountBySymbol: Record<string, number> = {
    'BTC/USDT': 0.005,
    'ETH/USDT': 0.05,
    'LTC/USDT': 0.5,
    'XRP/USDT': 10,
  };
  private fastPeriod = 5;
  private slowPeriod = 20;
  private cooldownMs = 60 * 1000;

  // Track last action and timestamp per symbol
  private lastActions: Record<string, 'BUY' | 'SELL' | null> = {};
  private lastTradeTimestamps: Record<string, number> = {};

  private assetsToLog = ['BTC', 'ETH', 'LTC', 'XRP', 'USDT'];

  private previousFastMAs: Record<string, number> = {};
  private priceTrendDelta = 0.1; // Minimum delta to justify re-buy or re-sell (tweak as needed)

  constructor(
    private readonly binanceService: BinanceService,
    @InjectRepository(Trade)
    private readonly tradeRepo: EntityRepository<Trade>,
    @InjectRepository(BalanceSnapshot)
    private readonly snapshotRepo: EntityRepository<BalanceSnapshot>
  ) {
    this.logger.log('DCA Strategy Service Initialized');
  }

  @Cron('0 * * * * *') // Every minute
  async executeSmartTrade() {
    const now = Date.now();

    for (const symbol of this.symbolsToTrade) {
      const lastTime = this.lastTradeTimestamps[symbol] || 0;
      if (now - lastTime < this.cooldownMs) {
        this.logger.log(`[${symbol}] Cooldown active. Skipping.`);
        continue;
      }

      this.logger.log(`[${symbol}] Checking crossover strategy`);
      try {
        const candles = await this.binanceService.getCandles(
          symbol,
          '1m',
          this.slowPeriod
        );
        const closes = candles.map((c) => c[4]);
        const fastMA = this.calculateSMA(closes.slice(-this.fastPeriod));
        const slowMA = this.calculateSMA(closes);

        this.logger.log(`[${symbol}] fastMA: ${fastMA}, slowMA: ${slowMA}`);

        const lastAction = this.lastActions[symbol] || null;
        const amount = this.tradeAmountBySymbol[symbol];

        const prevFastMA = this.previousFastMAs[symbol] ?? fastMA;

        const shouldBuy =
          fastMA > slowMA &&
          (lastAction !== 'BUY' || fastMA - prevFastMA > this.priceTrendDelta);
        const shouldSell =
          fastMA < slowMA &&
          (lastAction !== 'SELL' || prevFastMA - fastMA > this.priceTrendDelta);

        if (shouldBuy) {
          this.logger.log(
            `[${symbol}] Buy signal confirmed. Executing market buy.`
          );
          const order = await this.binanceService.placeMarketBuy(
            symbol,
            amount
          );
          await this.logTrade('BUY', order, symbol);
          this.lastActions[symbol] = 'BUY';
          this.lastTradeTimestamps[symbol] = now;
          //await this.logBalance();
        } else if (shouldSell) {
          this.logger.log(
            `[${symbol}] Sell signal confirmed. Executing market sell.`
          );
          const order = await this.binanceService.placeMarketSell(
            symbol,
            amount
          );
          await this.logTrade('SELL', order, symbol);
          this.lastActions[symbol] = 'SELL';
          this.lastTradeTimestamps[symbol] = now;
          //await this.logBalance();
        } else {
          this.logger.log(`[${symbol}] No actionable signal.`);
        }

        // Update last seen fastMA
        this.previousFastMAs[symbol] = fastMA;
      } catch (error) {
        this.logger.error(
          `[${symbol}] Failed to execute smart trade: ${JSON.stringify(error)}`
        );
      }
    }
  }

  @Cron('0 */5 * * * *') // Every 5 minutes
  async logBalanceCron() {
    await this.logBalance();
  }

  private calculateSMA(data: number[]): number {
    const sum = data.reduce((acc, val) => acc + val, 0);
    return sum / data.length;
  }

  private async logTrade(side: 'BUY' | 'SELL', order: any, symbol: string) {
    const price = order?.price?.toString() ?? '0.00000';
    const amount = order?.amount?.toString() ?? '0.00000';
    const trade = new Trade();
    trade.symbol = symbol;
    trade.side = side;
    trade.price = this.ensureEightDecimals(price);
    trade.amount = this.ensureEightDecimals(amount);
    await this.tradeRepo.getEntityManager().fork().persistAndFlush(trade);
  }

  private async logBalance() {
    this.logger.log('Logging balance');
    const balance = await this.binanceService.getBalance();
    const forkedEM = this.snapshotRepo.getEntityManager().fork();

    // Convert Binance response to a quick lookup map
    const balancesMap: Record<string, { free: string; locked: string }> = {};

    if (balance.info?.balances) {
      for (const item of balance.info.balances) {
        balancesMap[item.asset] = {
          free: item.free.toString(),
          locked: item.locked.toString(),
        };
      }
    }

    // Loop through only target assets
    for (const asset of this.assetsToLog) {
      const bal = balancesMap[asset];
      const free = bal?.free ?? '0';
      const locked = bal?.locked ?? '0';
      const total = (parseFloat(free) + parseFloat(locked)).toString();

      const snap = new BalanceSnapshot();
      snap.asset = asset;
      snap.total = this.ensureEightDecimals(total);
      snap.free = this.ensureEightDecimals(free);

      forkedEM.persist(snap); // batch persist
    }

    await forkedEM.flush(); // single flush
  }

  private ensureEightDecimals(value: string | number): string {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return num.toFixed(8);
  }
}
