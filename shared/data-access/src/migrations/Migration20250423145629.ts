import { Migration } from '@mikro-orm/migrations';

export class Migration20250423145629 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "trade" alter column "price" type numeric(20,5) using ("price"::numeric(20,5));`);
    this.addSql(`alter table "trade" alter column "amount" type numeric(20,5) using ("amount"::numeric(20,5));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "trade" alter column "price" type int using ("price"::int);`);
    this.addSql(`alter table "trade" alter column "amount" type int using ("amount"::int);`);
  }

}
