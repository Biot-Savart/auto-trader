import { BalanceSnapshot, Trade } from '@forex-trader/shared/data-access';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { BalancesController } from './controllers/balances.controller';
import { BalancesGateway } from './gateways/balances.gateway';
import { BalancesService } from './services/balances.service';

@Module({
  imports: [MikroOrmModule.forFeature([Trade, BalanceSnapshot])],
  providers: [BalancesService, BalancesGateway],
  controllers: [BalancesController],
  exports: [BalancesService, BalancesGateway], // Export BalancesService if needed in other modules
})
export class BalancesModule {}
