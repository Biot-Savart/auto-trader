import { Test, TestingModule } from '@nestjs/testing';
import { BinanceService } from './binance.service';

jest.setTimeout(20000); // Allow enough time for real API calls

describe('BinanceService', () => {
  let service: BinanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BinanceService],
    }).compile();

    service = module.get<BinanceService>(BinanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fetch markets', async () => {
    const markets = await service.getMarkets();
    expect(markets).toBeDefined();
    expect(markets['BTC/USDT']).toBeDefined();
  });

  it('should fetch balance', async () => {
    const balance = await service.getBalance();
    expect(balance).toBeDefined();
    expect(balance.total).toBeDefined();
  });

  it('should fetch current price for BTC/USDT', async () => {
    const price = await service.getCurrentPrice('BTC/USDT');
    expect(price).toBeGreaterThan(0);
  });

  it('should fetch recent candles', async () => {
    const candles = await service.getCandles('BTC/USDT', '1m', 5);
    expect(candles).toBeInstanceOf(Array);
    expect(candles.length).toBeGreaterThan(0);
    expect(candles[0].length).toBe(6); // [timestamp, open, high, low, close, volume]
  });

  // it('should simulate market buy without throwing', async () => {
  //   try {
  //     const order = await service.placeMarketBuy('BTC/USDT', 0.0001);
  //     expect(order).toBeDefined();
  //     expect(order.side).toBe('buy');
  //   } catch (e) {
  //     expect(e.message).toMatch(
  //       /insufficient balance|Invalid quantity|MIN_NOTIONAL|API/
  //     );
  //   }
  // });

  // it('should simulate market sell without throwing', async () => {
  //   try {
  //     const order = await service.placeMarketSell('BTC/USDT', 0.0001);
  //     console.log('Order:', order);
  //     expect(order).toBeDefined();
  //     expect(order.side).toBe('sell');
  //   } catch (e) {
  //     expect(e.message).toMatch(
  //       /insufficient balance|Invalid quantity|MIN_NOTIONAL|API/
  //     );
  //   }
  // });
});
