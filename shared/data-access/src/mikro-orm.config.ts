import { MikroOrmModuleOptions } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { ConfigService } from '@nestjs/config';
import { BalanceSnapshot } from './entities/balance-snapshot.entity';
import { Trade } from './entities/trade.entity';

export const mikroOrmConfigFactory = (
  configService: ConfigService
): MikroOrmModuleOptions => ({
  entities: [Trade, BalanceSnapshot],
  //entitiesTs: ['./shared/data-access/src/entities'],
  migrations: {
    path: './shared/data-access/src/migrations',
  },
  dbName: configService.getOrThrow('DATABASE_NAME'),
  tsNode: true,
  driver: PostgreSqlDriver,
  host: configService.getOrThrow('DATABASE_HOST'),
  port: parseInt(configService.getOrThrow('DATABASE_PORT'), 10),
  user: configService.getOrThrow('DATABASE_USER'),
  password: configService.getOrThrow('DATABASE_PASSWORD'),
  metadataProvider: TsMorphMetadataProvider,
  debug: true,
});
