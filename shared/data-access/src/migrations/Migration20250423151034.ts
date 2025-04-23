import { Migration } from '@mikro-orm/migrations';

export class Migration20250423151034 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "balance_snapshot" ("id" serial primary key, "asset" varchar(255) not null, "total" int not null, "free" int not null, "timestamp" timestamptz not null);`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "balance_snapshot" cascade;`);
  }

}
