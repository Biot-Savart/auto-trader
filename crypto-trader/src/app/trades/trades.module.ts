import { BalanceSnapshot, Trade } from '@forex-trader/shared/data-access';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { TradesController } from './controllers/trades.controller';
import { TradeGateway } from './gateways/trade.gateway';
import { TradesService } from './services/trades.service';

@Module({
  imports: [MikroOrmModule.forFeature([Trade, BalanceSnapshot])],
  controllers: [TradesController],
  providers: [TradesService, TradeGateway],
  exports: [TradesService, TradeGateway], // Export TradeService if needed in other modules
})
export class TradesModule {}
