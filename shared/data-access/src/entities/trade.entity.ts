import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class Trade {
  @PrimaryKey()
  id!: number;

  @Property()
  symbol!: string;

  @Property()
  side!: 'BUY' | 'SELL';

  @Property({ type: 'decimal', precision: 20, scale: 5 })
  price!: string;

  @Property({ type: 'decimal', precision: 20, scale: 5 })
  amount!: string;

  @Property()
  timestamp: Date = new Date();
}
