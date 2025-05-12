import { Module } from '@nestjs/common';
import { BinanceService } from './services/binance.service';

@Module({
  providers: [BinanceService],
  exports: [BinanceService],
})
export class ExchangeModule {}
