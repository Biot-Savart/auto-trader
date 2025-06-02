import {
  BalanceSnapshot,
  PortfolioSnapshot,
} from '@forex-trader/shared/data-access';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BalancesService {
  constructor(
    @InjectRepository(BalanceSnapshot)
    private readonly snapshotRepo: EntityRepository<BalanceSnapshot>,
    @InjectRepository(PortfolioSnapshot)
    private readonly portfolioRepo: EntityRepository<PortfolioSnapshot>
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

  async getPortfolioSnapshots(
    from?: string,
    to?: string
  ): Promise<PortfolioSnapshot[]> {
    const qb = this.portfolioRepo.createQueryBuilder('b');

    if (from) qb.andWhere('b.timestamp >= ?', [new Date(from)]);
    if (to) qb.andWhere('b.timestamp <= ?', [new Date(to)]);

    const result = await qb.orderBy({ timestamp: 'ASC' }).getResultList();

    return this.filterOutliers(result, 'totalValueUSDT');
  }

  /**
   * Filters out outliers using the z-score method.
   * @param data Array of snapshots with a numeric property (e.g., total or totalValueUSDT)
   * @param key The property to check for outliers
   * @param threshold Z-score threshold (commonly 2 or 3)
   */
  private filterOutliers<T extends { [key: string]: any }>(
    data: T[],
    key: string,
    threshold = 3
  ): T[] {
    const values = data.map((d) => parseFloat(d[key]));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(
      values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
    );

    return data.filter((d, i) => {
      const z = std === 0 ? 0 : Math.abs((values[i] - mean) / std);
      return z <= threshold;
    });
  }
}
