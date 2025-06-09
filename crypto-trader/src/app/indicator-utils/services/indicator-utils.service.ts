import { Injectable } from '@nestjs/common';

@Injectable()
export class IndicatorUtilsService {
  // Technical indicators calculation utils
  calculateSMA(data: number[], period: number): number {
    if (data.length < period) return NaN;
    return data.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  calculateRSI(data: number[], period = 14): number {
    if (data.length < period + 1) return NaN;
    let gains = 0,
      losses = 0;

    for (let i = data.length - period; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      if (change >= 0) gains += change;
      else losses -= change;
    }

    if (losses === 0) return 100;
    const rs = gains / losses;
    return 100 - 100 / (1 + rs);
  }

  calculateEMA(values: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const ema: number[] = [];

    // Start with simple moving average
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += values[i];
    }
    ema[period - 1] = sum / period;

    // Continue with EMA
    for (let i = period; i < values.length; i++) {
      ema[i] = values[i] * k + ema[i - 1] * (1 - k);
    }

    return ema;
  }

  calculateMACD(
    closes: number[],
    fastPeriod = 12,
    slowPeriod = 26,
    signalPeriod = 9
  ): { macd: number; signalLine: number; histogram: number } {
    const emaFast = this.calculateEMA(closes, fastPeriod);
    const emaSlow = this.calculateEMA(closes, slowPeriod);
    const macdLine: number[] = [];

    for (let i = 0; i < closes.length; i++) {
      if (emaFast[i] !== undefined && emaSlow[i] !== undefined) {
        macdLine[i] = emaFast[i] - emaSlow[i];
      } else {
        macdLine[i] = 0;
      }
    }

    const signalLineArr = this.calculateEMA(macdLine, signalPeriod);
    const lastIndex = signalLineArr.length - 1;

    const macd = macdLine[lastIndex];
    const signalLine = signalLineArr[lastIndex];
    const histogram = macd - signalLine;

    return {
      macd,
      signalLine,
      histogram,
    };
  }

  calculateBollingerBands(
    data: number[],
    period = 20,
    multiplier = 2
  ): { upper: number; middle: number; lower: number } {
    if (data.length < period) return { upper: 0, middle: 0, lower: 0 };
    const slice = data.slice(-period);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const stdDev = Math.sqrt(
      slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period
    );
    return {
      upper: mean + multiplier * stdDev,
      middle: mean,
      lower: mean - multiplier * stdDev,
    };
  }

  calculateMarketVolatility(closes: number[]): number {
    if (closes.length < 2) return 0;
    const returns = closes.slice(1).map((price, i) => {
      const prev = closes[i];
      return (price - prev) / prev;
    });

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      returns.length;

    return Math.sqrt(variance); // standard deviation of returns
  }

  // Optional: categorize volatility level
  categorizeVolatility(stdDev: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (stdDev < 0.001) return 'LOW';
    if (stdDev < 0.003) return 'MEDIUM';
    return 'HIGH';
  }
}
