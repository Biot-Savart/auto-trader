import { Injectable, Logger } from '@nestjs/common';
import * as ccxt from 'ccxt';

@Injectable()
export class BinanceService {
  private client: ccxt.binance;
  private readonly exchange = new ccxt.binance({
    options: { defaultType: 'spot' },
  });
  private readonly logger = new Logger(BinanceService.name);

  constructor() {
    this.client = new ccxt.binance({
      apiKey: process.env.BINANCE_API_KEY,
      secret: process.env.BINANCE_SECRET_KEY,
      options: {
        defaultType: 'spot',
        adjustForTimeDifference: true,
      },
    });

    this.client.setSandboxMode(true); // Enable sandbox mode
  }

  async getMarkets(): Promise<any> {
    return await this.exchange.loadMarkets();
  }

  async placeMarketBuy(symbol: string, amount: number) {
    this.logger.warn(
      `Placing market buy order: ${symbol} for amount: ${amount}`
    );
    return await this.client.createMarketBuyOrder(symbol, amount);
  }

  async placeMarketSell(symbol: string, amount: number) {
    this.logger.warn(
      `Placing market sell order: ${symbol} for amount: ${amount}`
    );
    return await this.client.createMarketSellOrder(symbol, amount);
  }

  async getCandles(symbol: string, timeframe: string, limit: number) {
    return await this.client.fetchOHLCV(symbol, timeframe, undefined, limit);
  }

  async getBalance() {
    return await this.client.fetchBalance();
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    const ticker = await this.client.fetchTicker(symbol);
    return ticker.last;
  }
}
