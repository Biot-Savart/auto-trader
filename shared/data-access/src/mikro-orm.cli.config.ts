import { MikroOrmModuleOptions } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import * as dotenv from 'dotenv';

dotenv.config();

const config: MikroOrmModuleOptions = {
  entities: ['./dist/shared/data-access/src/entities'], // Adjust as needed
  entitiesTs: ['./shared/data-access/src/entities'],
  dbName: process.env['DATABASE_NAME'],
  host: process.env['DATABASE_HOST'],
  port: Number(process.env['DATABASE_PORT']),
  user: process.env['DATABASE_USER'],
  password: process.env['DATABASE_PASSWORD'],
  driver: PostgreSqlDriver,
  metadataProvider: TsMorphMetadataProvider,
  debug: true,
  migrations: {
    path: './shared/data-access/src/migrations',
    pathTs: './shared/data-access/src/migrations',
  },
};

export default config;
