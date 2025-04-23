import {
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // adjust path if .env is elsewhere
    }),
    ExchangeModule,
    StrategyModule,
    ScheduleModule.forRoot(),
    DataAccessModule,
    MikroOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: mikroOrmConfigFactory,
    }),
    MikroOrmModule.forFeature([Trade]), // Import entities you want available
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
