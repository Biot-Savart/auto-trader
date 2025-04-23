import { Trade } from '@forex-trader/shared/data-access';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ExchangeModule } from '../exchange/exchange.module';
import { DcaStrategyService } from './services/dca-strategy.service';

@Module({
  imports: [MikroOrmModule.forFeature([Trade]), ExchangeModule],
  providers: [DcaStrategyService],
  exports: [DcaStrategyService],
})
export class StrategyModule {}
