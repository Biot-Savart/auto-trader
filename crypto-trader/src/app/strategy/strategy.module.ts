import {
  BalanceSnapshot,
  PortfolioSnapshot,
  Trade,
} from '@forex-trader/shared/data-access';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { BalancesModule } from '../balances/balances.module';
import { ExchangeModule } from '../exchange/exchange.module';
import { IndicatorUtilsModule } from '../indicator-utils/indicator-utils.module';
import { TradesModule } from '../trades/trades.module';
import { DcaStrategyService } from './services/dca-strategy.service';
import { TradeDecisionService } from './services/trade-decision.service';
import { PortfolioGuardService } from './services/portfolio-guard.service';
import { LoggingService } from './services/logging.service';
import { TradeExecutionService } from './services/trade-execution.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([Trade, BalanceSnapshot, PortfolioSnapshot]),
    ExchangeModule,
    TradesModule,
    BalancesModule,
    IndicatorUtilsModule,
  ],
  providers: [
    DcaStrategyService,
    TradeDecisionService,
    PortfolioGuardService,
    LoggingService,
    TradeExecutionService,
  ],
  exports: [DcaStrategyService],
})
export class StrategyModule {}
