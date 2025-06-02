import { Injectable, Logger } from '@nestjs/common';
import { IndicatorUtilsService } from '../../indicator-utils/services/indicator-utils.service';

@Injectable()
export class TradeDecisionService {
  private readonly logger = new Logger(TradeDecisionService.name);

  constructor(private readonly indicatorUtils: IndicatorUtilsService) {}

  async evaluateSignals(
    symbols: string[],
    markets: any,
    binanceService: any,
    lastActions: Record<string, 'BUY' | 'SELL' | null>,
    previousFastMAs: Record<string, number>,
    cooldownMs: number,
    lastTradeTimestamps: Record<string, number>,
    fastPeriod: number,
    slowPeriod: number,
    priceTrendDelta: number,
    now: number
  ): Promise<
    Record<string, { signal: 'BUY' | 'SELL' | null; strength: number }>
  > {
    const symbolSignals: Record<
      string,
      { signal: 'BUY' | 'SELL' | null; strength: number }
    > = {};

    for (const symbol of symbols) {
      if (now - (lastTradeTimestamps[symbol] || 0) < cooldownMs) {
        this.logger.log(`[${symbol}] Skipped due to cooldown.`);
        continue;
      }

      const market = markets[symbol];
      if (!market?.limits?.amount?.min || !market?.limits?.cost?.min) {
        this.logger.warn(`[${symbol}] Skipped due to missing market limits.`);
        continue;
      }

      const closes = (
        await binanceService.getCandles(symbol, '1m', Math.max(slowPeriod, 30))
      ).map((c) => c[4]);

      const volatility = this.indicatorUtils.calculateMarketVolatility(closes);
      const dynamicSlowPeriod = volatility > 0.0025 ? 100 : 50;
      const level = this.indicatorUtils.categorizeVolatility(volatility);
      this.logger.log(
        `[${symbol}] Volatility: ${volatility.toFixed(6)} (${level})`
      );

      const fastMA = this.indicatorUtils.calculateSMA(closes, fastPeriod);
      const slowMA = this.indicatorUtils.calculateSMA(
        closes,
        dynamicSlowPeriod
      );
      const rsi = this.indicatorUtils.calculateRSI(closes);
      const { macd, histogram } = this.indicatorUtils.calculateMACD(closes);
      const { middle } = this.indicatorUtils.calculateBollingerBands(closes);

      const currentPrice = closes[closes.length - 1];
      const prevFastMA = previousFastMAs[symbol] ?? fastMA;
      const lastAction = lastActions[symbol] || null;
      const delta = priceTrendDelta;
      const strength = Math.abs(fastMA - slowMA);

      const shouldBuy =
        fastMA > slowMA &&
        rsi < 70 &&
        histogram > 0 &&
        currentPrice < middle &&
        (lastAction !== 'BUY' || fastMA - prevFastMA > delta);

      const shouldSell =
        fastMA < slowMA &&
        rsi > 30 &&
        histogram < 0 &&
        currentPrice > middle &&
        (lastAction !== 'SELL' || prevFastMA - fastMA > delta);

      const signal = shouldBuy ? 'BUY' : shouldSell ? 'SELL' : null;
      symbolSignals[symbol] = { signal, strength };

      this.logger.log(
        `[${symbol}] fastMA=${fastMA.toFixed(4)} slowMA=${slowMA.toFixed(
          4
        )} rsi=${rsi.toFixed(2)} macd=${macd.toFixed(
          2
        )} BB-mid=${middle.toFixed(2)} signal=${signal}`
      );

      previousFastMAs[symbol] = fastMA;
    }

    return symbolSignals;
  }

  getCandidates(
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

  selectStrongestCandidate(
    candidates: [string, { signal: 'BUY' | 'SELL'; strength: number }][]
  ): [string, { signal: 'BUY' | 'SELL'; strength: number }] {
    return candidates.sort((a, b) => b[1].strength - a[1].strength)[0];
  }
}
