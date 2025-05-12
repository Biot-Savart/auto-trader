import { Migration } from '@mikro-orm/migrations';

export class Migration20250423135240 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "trade" ("id" serial primary key, "symbol" varchar(255) not null, "side" varchar(255) not null, "price" int not null, "amount" int not null, "timestamp" timestamptz not null);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "trade" cascade;`);
  }

}
