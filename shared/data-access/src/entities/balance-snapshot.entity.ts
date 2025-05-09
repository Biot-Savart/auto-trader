// src/entities/balance-snapshot.entity.ts
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class BalanceSnapshot {
  @PrimaryKey()
  id!: number;

  @Property()
  asset!: string;

  @Property({ type: 'decimal', precision: 17, scale: 8 })
  total!: string;

  @Property({ type: 'decimal', precision: 17, scale: 8 })
  free!: string;

  @Property()
  timestamp: Date = new Date();
}
