import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class Trade {
  @PrimaryKey()
  id!: number;

  @Property()
  symbol!: string;

  @Property()
  side!: 'BUY' | 'SELL';

  @Property()
  price!: number;

  @Property()
  amount!: number;

  @Property()
  timestamp: Date = new Date();
}
