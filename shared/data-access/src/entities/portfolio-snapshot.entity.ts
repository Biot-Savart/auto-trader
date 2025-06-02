import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class PortfolioSnapshot {
  @PrimaryKey()
  id!: number;

  @Property({ type: 'decimal', precision: 17, scale: 8 })
  totalValueUSDT!: string;

  @Property()
  timestamp: Date = new Date();
}
