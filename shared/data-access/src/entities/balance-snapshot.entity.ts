// src/entities/balance-snapshot.entity.ts
import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class BalanceSnapshot {
  @PrimaryKey()
  id!: number;

  @Property()
  asset!: string;

  @Property()
  total!: number;

  @Property()
  free!: number;

  @Property()
  timestamp: Date = new Date();
}
