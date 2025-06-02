import {
  BalanceSnapshot,
  DataAccessModule,
  mikroOrmConfigFactory,
  Trade,
} from '@forex-trader/shared/data-access'; // Adjust the import path as necessary
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExchangeModule } from './exchange/exchange.module';
import { StrategyModule } from './strategy/strategy.module';
import { TradesModule } from './trades/trades.module';
import { BalancesModule } from './balances/balances.module';
import { IndicatorUtilsModule } from './indicator-utils/indicator-utils.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // adjust path if .env is elsewhere
    }),
    MikroOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: mikroOrmConfigFactory,
    }),
    MikroOrmModule.forFeature([Trade, BalanceSnapshot]), // Import entities you want available
    ExchangeModule,
    StrategyModule,
    ScheduleModule.forRoot(),
    DataAccessModule,
    TradesModule,
    BalancesModule,
    IndicatorUtilsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
