import { Migration } from '@mikro-orm/migrations';

export class Migration20250512140318 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "balance_snapshot" add column "usdt_value" numeric(17,8) not null default 0;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "balance_snapshot" drop column "usdt_value";`);
  }

}
