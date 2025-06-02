import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BinanceService } from '../../exchange/services/binance.service';
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
    'BTC/USDT': 2000,
    'ETH/USDT': 2000,
    'LTC/USDT': 2000,
    'XRP/USDT': 2000,
    'DOGE/USDT': 2000,
    'ADA/USDT': 2000,
  };

  private maxWeightPercent: Record<string, number> = {
    BTC: 35,
    ETH: 20,
    LTC: 10,
    XRP: 15,
    DOGE: 10,
    ADA: 10,
  };

  private fastPeriod = 10;
  private slowPeriod = 50;
  private cooldownMs = 60 * 1000;
  private priceTrendDelta = 0.1;

  private lastActions: Record<string, 'BUY' | 'SELL' | null> = {};
  private lastTradeTimestamps: Record<string, number> = {};
  private previousFastMAs: Record<string, number> = {};

  private assetsToLog = ['BTC', 'ETH', 'LTC', 'XRP', 'USDT', 'DOGE', 'ADA'];

  constructor(
    private readonly tradeDecisionService: TradeDecisionService,
    private readonly tradeExecutionService: TradeExecutionService,
    private readonly binanceService: BinanceService
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

    const buyCandidates = this.tradeDecisionService.getCandidates(
      symbolSignals,
      'BUY'
    );
    const sellCandidates = this.tradeDecisionService.getCandidates(
      symbolSignals,
      'SELL'
    );

    if (buyCandidates.length && sellCandidates.length) {
      await this.tradeExecutionService.performRebalance(
        buyCandidates,
        sellCandidates,
        now,
        balance,
        markets,
        this.maxTradeUSDBySymbol,
        this.assetsToLog
      );
    } else {
      for (const [symbol] of buyCandidates) {
        await this.tradeExecutionService.tryStandaloneBuy(
          symbol,
          now,
          balance,
          markets,
          this.fastPeriod,
          this.slowPeriod,
          this.maxTradeUSDBySymbol,
          this.assetsToLog
        );
      }
    }
  }
}
