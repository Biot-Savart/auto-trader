import { Module } from '@nestjs/common';
import { ExchangeModule } from '../exchange/exchange.module';
import { DcaStrategyService } from './services/dca-strategy.service';

@Module({
  imports: [ExchangeModule],
  providers: [DcaStrategyService],
  exports: [DcaStrategyService],
})
export class StrategyModule {}
