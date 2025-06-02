import { Migration } from '@mikro-orm/migrations';

export class Migration20250513083257 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "portfolio_snapshot" ("id" serial primary key, "total_value_usdt" numeric(17,8) not null, "timestamp" timestamptz not null);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "portfolio_snapshot" cascade;`);
  }

}
