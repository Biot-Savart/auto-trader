import { BalanceSnapshot } from '@forex-trader/shared/data-access';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BalancesService {
  constructor(
    @InjectRepository(BalanceSnapshot)
    private readonly snapshotRepo: EntityRepository<BalanceSnapshot>
  ) {}

  async getAllSnapshots(
    asset?: string,
    from?: string,
    to?: string
  ): Promise<BalanceSnapshot[]> {
    const qb = this.snapshotRepo.createQueryBuilder('b');

    if (asset) qb.andWhere({ asset });
    if (from) qb.andWhere('b.timestamp >= ?', [new Date(from)]);
    if (to) qb.andWhere('b.timestamp <= ?', [new Date(to)]);

    return qb.orderBy({ timestamp: 'ASC' }).getResultList();
  }
}
