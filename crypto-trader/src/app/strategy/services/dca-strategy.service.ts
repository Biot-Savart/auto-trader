import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BinanceService } from '../../exchange/services/binance.service';
import { LoggingService } from './logging.service';
import { TradeDecisionService } from './trade-decision.service';
import { TradeExecutionService } from './trade-execution.service';

@Injectable()
export class DcaStrategyService {
  private symbolsToTrade = [
    'BTC/USDT',
    'ETH/USDT',
    'LTC/USDT',
    'XRP/USDT',
    'DOGE/USDT',
    'ADA/USDT',
  ];

  private maxTradeUSDBySymbol: Record<string, number> = {
    'BTC/USDT': 2500,
    'ETH/USDT': 2000,
    'LTC/USDT': 1000,
    'XRP/USDT': 1500,
    'DOGE/USDT': 750,
    'ADA/USDT': 1000,
  };

  private maxWeightPercent: Record<string, number> = {
    BTC: 30,
    ETH: 25,
    LTC: 10,
    XRP: 20,
    DOGE: 10,
    ADA: 5,
  };

  private fastPeriod = 10;
  private slowPeriod = 50;
  private cooldownMs = 60 * 1000;
  private priceTrendDelta = 0.5;

  private lastActions: Record<string, 'BUY' | 'SELL' | null> = {};
  private lastTradeTimestamps: Record<string, number> = {};
  private previousFastMAs: Record<string, number> = {};

  private assetsToLog = ['BTC', 'ETH', 'LTC', 'XRP', 'USDT', 'DOGE', 'ADA'];

  constructor(
    private readonly tradeDecisionService: TradeDecisionService,
    private readonly tradeExecutionService: TradeExecutionService,
    private readonly binanceService: BinanceService,
    private readonly loggingService: LoggingService
  ) {}

  @Cron('0 * * * * *')
  async executeSmartTrade() {
    const now = Date.now();
    const balance = await this.binanceService.getBalance();
    const markets = await this.binanceService.getMarkets();

    const symbolSignals = await this.tradeDecisionService.evaluateSignals(
      this.symbolsToTrade,
      markets,
      this.binanceService,
      this.lastActions,
      this.previousFastMAs,
      this.cooldownMs,
      this.lastTradeTimestamps,
      this.fastPeriod,
      this.slowPeriod,
      this.priceTrendDelta,
      now
    );

    await this.tradeExecutionService.executeSmartTrade(
      symbolSignals,
      now,
      balance,
      markets,
      this.fastPeriod,
      this.slowPeriod,
      this.maxTradeUSDBySymbol,
      this.assetsToLog
    );
  }

  @Cron('0 */5 * * * *')
  async logBalanceCron() {
    await this.loggingService.logBalance(this.assetsToLog);
  }
}
