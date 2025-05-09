import { Migration } from '@mikro-orm/migrations';

export class Migration20250424083700 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "trade" alter column "price" type numeric(17,8) using ("price"::numeric(17,8));`);
    this.addSql(`alter table "trade" alter column "amount" type numeric(17,8) using ("amount"::numeric(17,8));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "trade" alter column "price" type numeric(20,5) using ("price"::numeric(20,5));`);
    this.addSql(`alter table "trade" alter column "amount" type numeric(20,5) using ("amount"::numeric(20,5));`);
  }

}
