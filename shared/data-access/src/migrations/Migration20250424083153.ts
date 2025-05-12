import { Migration } from '@mikro-orm/migrations';

export class Migration20250424083153 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "balance_snapshot" alter column "total" type numeric(17,8) using ("total"::numeric(17,8));`);
    this.addSql(`alter table "balance_snapshot" alter column "free" type numeric(17,8) using ("free"::numeric(17,8));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "balance_snapshot" alter column "total" type int using ("total"::int);`);
    this.addSql(`alter table "balance_snapshot" alter column "free" type int using ("free"::int);`);
  }

}
