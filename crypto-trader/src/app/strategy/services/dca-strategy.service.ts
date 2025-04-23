import { Trade } from '@forex-trader/shared/data-access';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BinanceService } from '../../exchange/services/binance.service';

@Injectable()
export class DcaStrategyService {
  private readonly logger = new Logger(DcaStrategyService.name);
  private symbol = 'BTC/USDT';
  private tradeAmount = 0.001; // in BTC
  private fastPeriod = 5; // 5 candles
  private slowPeriod = 20; // 20 candles
  private lastAction: 'BUY' | 'SELL' | null = null;
  private lastTradeTimestamp = 0;
  private cooldownMs = 60 * 1000; // 1 minute cooldown

  constructor(
    private readonly binanceService: BinanceService,
    @InjectRepository(Trade)
    private readonly tradeRepo: EntityRepository<Trade>,
    private readonly em: EntityManager
  ) {
    this.logger.log('DCA Strategy Service Initialized');
  }

  //@Cron('0 */6 * * *') // Every 6 hours
  @Cron('*/10 * * * * *') // Every 10 seconds
  async executeSmartTrade() {
    const now = Date.now();
    if (now - this.lastTradeTimestamp < this.cooldownMs) {
      this.logger.log('Cooldown active. Skipping this cycle.');
      return;
    }

    this.logger.log(`Checking crossover strategy for ${this.symbol}`);
    try {
      const candles = await this.binanceService.getCandles(
        this.symbol,
        '1m',
        this.slowPeriod
      );
      const closes = candles.map((c) => c[4]);

      const fastMA = this.calculateSMA(closes.slice(-this.fastPeriod));
      const slowMA = this.calculateSMA(closes);

      this.logger.log(`fastMA: ${fastMA}, slowMA: ${slowMA}`);

      if (fastMA > slowMA && this.lastAction !== 'BUY') {
        this.logger.log(
          `Buy signal detected. Executing market buy for ${this.symbol}`
        );
        const order = await this.binanceService.placeMarketBuy(
          this.symbol,
          this.tradeAmount
        );
        this.logger.log(`Buy order executed: ${JSON.stringify(order)}`);
        await this.logTrade('BUY', order);
        this.lastAction = 'BUY';
        this.lastTradeTimestamp = now;
      } else if (fastMA < slowMA && this.lastAction !== 'SELL') {
        this.logger.log(
          `Sell signal detected. Executing market sell for ${this.symbol}`
        );
        const order = await this.binanceService.placeMarketSell(
          this.symbol,
          this.tradeAmount
        );
        this.logger.log(`Sell order executed: ${JSON.stringify(order)}`);
        await this.logTrade('SELL', order);
        this.lastAction = 'SELL';
        this.lastTradeTimestamp = now;
      } else {
        this.logger.log('No actionable signal. Skipping trade.');
      }
    } catch (error) {
      this.logger.error(`Failed to execute smart trade: ${error.message}`);
    }
  }

  private calculateSMA(data: number[]): number {
    const sum = data.reduce((acc, val) => acc + val, 0);
    return sum / data.length;
  }

  private async logTrade(side: 'BUY' | 'SELL', order: any) {
    const price = order?.price?.toString() ?? '0.00000';
    const amount = order?.amount?.toString() ?? '0.00000';
    const trade = new Trade();
    trade.symbol = this.symbol;
    trade.side = side;
    trade.price = this.ensureFiveDecimals(price);
    trade.amount = this.ensureFiveDecimals(amount);
    //await this.em.persistAndFlush(trade);
    await this.tradeRepo.getEntityManager().fork().persistAndFlush(trade);
  }

  private ensureFiveDecimals(value: string | number): string {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return num.toFixed(5); // Ensures exactly 5 decimal places
  }
}
