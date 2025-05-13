import {
  BalanceSnapshot,
  PortfolioSnapshot,
  Trade,
} from '@forex-trader/shared/data-access';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { BalancesModule } from '../balances/balances.module';
import { ExchangeModule } from '../exchange/exchange.module';
import { TradesModule } from '../trades/trades.module';
import { DcaStrategyService } from './services/dca-strategy.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([Trade, BalanceSnapshot, PortfolioSnapshot]),
    ExchangeModule,
    TradesModule,
    BalancesModule,
  ],
  providers: [DcaStrategyService],
  exports: [DcaStrategyService],
})
export class StrategyModule {}
