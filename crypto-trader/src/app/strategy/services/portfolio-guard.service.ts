import {
  BalanceSnapshot,
  PortfolioSnapshot,
} from '@forex-trader/shared/data-access';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PortfolioGuardService {
  private readonly logger = new Logger(PortfolioGuardService.name);

  private maxWeightPercent: Record<string, number> = {
    BTC: 35,
    ETH: 20,
    LTC: 10,
    XRP: 15,
    DOGE: 10,
    ADA: 10,
  };

  constructor(
    @InjectRepository(BalanceSnapshot)
    private readonly snapshotRepo: EntityRepository<BalanceSnapshot>,
    @InjectRepository(PortfolioSnapshot)
    private readonly portfolioRepo: EntityRepository<PortfolioSnapshot>
  ) {}

  async isWithinMaxAllocation(
    symbol: string,
    usdToSpend: number
  ): Promise<boolean> {
    const asset = symbol.split('/')[0];
    const snapshot = await this.portfolioRepo.findOne(
      {},
      { orderBy: { timestamp: 'DESC' } }
    );
    if (!snapshot) return true;

    const totalValue = parseFloat(snapshot.totalValueUSDT);
    const lastBalances = await this.snapshotRepo.find(
      { asset },
      { orderBy: { timestamp: 'DESC' }, limit: 1 }
    );
    const assetBalance = parseFloat(lastBalances[0]?.usdtValue ?? '0');

    const currentWeight = (assetBalance / totalValue) * 100;
    const projectedWeight = ((assetBalance + usdToSpend) / totalValue) * 100;

    const maxAllowed = this.maxWeightPercent[asset] ?? 100;
    this.logger.log(
      `[${asset}] Current: ${currentWeight.toFixed(
        2
      )}%, Projected: ${projectedWeight.toFixed(2)}%, Max: ${maxAllowed}%`
    );

    return projectedWeight <= maxAllowed;
  }
}
