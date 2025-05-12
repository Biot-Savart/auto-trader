import { Trade } from '@forex-trader/shared/data-access';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TradesService {
  constructor(
    @InjectRepository(Trade)
    private readonly tradeRepo: EntityRepository<Trade>
  ) {}

  async getAllTrades(
    symbol?: string,
    from?: string,
    to?: string
  ): Promise<Trade[]> {
    const qb = this.tradeRepo.createQueryBuilder('t');

    if (symbol) qb.andWhere({ symbol });
    if (from) qb.andWhere('t.timestamp >= ?', [new Date(from)]);
    if (to) qb.andWhere('t.timestamp <= ?', [new Date(to)]);

    return qb.orderBy({ timestamp: 'ASC' }).getResultList();
  }
}
