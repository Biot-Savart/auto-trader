import {
  BalanceSnapshot,
  PortfolioSnapshot,
  Trade,
} from '@forex-trader/shared/data-access';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable, Logger } from '@nestjs/common';
import { BalancesGateway } from '../../balances/gateways/balances.gateway';
import { BinanceService } from '../../exchange/services/binance.service';
import { TradeGateway } from '../../trades/gateways/trade.gateway';

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);
  constructor(
    private readonly tradeGateway: TradeGateway,
    private readonly balancesGateway: BalancesGateway,
    private readonly binanceService: BinanceService,
    @InjectRepository(Trade)
    private readonly tradeRepo: EntityRepository<Trade>,
    @InjectRepository(BalanceSnapshot)
    private readonly snapshotRepo: EntityRepository<BalanceSnapshot>,
    @InjectRepository(PortfolioSnapshot)
    private readonly portfolioRepo: EntityRepository<PortfolioSnapshot>
  ) {}

  async logTrade(side: 'BUY' | 'SELL', order: any, symbol: string) {
    const em = this.tradeRepo.getEntityManager().fork();
    const trade = new Trade();
    trade.symbol = symbol;
    trade.side = side;
    trade.price = this.ensureEightDecimals(order?.price ?? '0.00000');
    trade.amount = this.ensureEightDecimals(order?.amount ?? '0.00000');

    await em.persistAndFlush(trade);

    this.tradeGateway.emitTrade({
      symbol,
      side,
      price: trade.price,
      amount: trade.amount,
      timestamp: new Date(),
    });
  }

  async logBalance(assetsToLog: string[]) {
    const balance = await this.binanceService.getBalance();
    const em = this.snapshotRepo.getEntityManager().fork();
    const balancesMap: Record<string, { free: string; locked: string }> = {};

    if (balance.info?.balances) {
      for (const item of balance.info.balances) {
        balancesMap[item.asset] = {
          free: item.free.toString(),
          locked: item.locked.toString(),
        };
      }
    }

    let totalUSDTValue = 0;

    for (const asset of assetsToLog) {
      const bal = balancesMap[asset];
      const free = bal?.free ?? '0';
      const locked = bal?.locked ?? '0';
      const total = (parseFloat(free) + parseFloat(locked)).toString();

      const snap = new BalanceSnapshot();
      snap.asset = asset;
      snap.total = this.ensureEightDecimals(total);
      snap.free = this.ensureEightDecimals(free);

      let usdtValue = 0;
      if (asset === 'USDT') {
        usdtValue = parseFloat(total);
      } else {
        const price = await this.binanceService
          .getCurrentPrice(`${asset}/USDT`)
          .catch((err) => {
            this.logger.warn(
              `Failed to get price for ${asset}/USDT: ${err.message}`
            );
            return 0;
          });
        usdtValue = parseFloat(total) * price;
        this.logger.log(
          `${asset}: amount=${total}, price=${price}, valueUSDT=${usdtValue}`
        );
      }

      totalUSDTValue += usdtValue;
      snap.usdtValue = this.ensureEightDecimals(usdtValue);

      em.persist(snap);

      this.balancesGateway.emitBalance({
        asset,
        total: snap.total,
        free: snap.free,
        timestamp: new Date(),
      });

      this.logger.log(
        `Emitted balance for ${asset}: total=${snap.total}, free=${snap.free}`
      );
    }

    const snapshot = new PortfolioSnapshot();
    snapshot.totalValueUSDT = this.ensureEightDecimals(totalUSDTValue);
    snapshot.timestamp = new Date();

    //em.persist(snapshot);
    await this.portfolioRepo
      .getEntityManager()
      .fork()
      .persistAndFlush(snapshot);

    this.balancesGateway.emitPortfolio({
      totalValueUSDT: snapshot.totalValueUSDT,
      timestamp: snapshot.timestamp,
    });

    await em.flush();
    this.logger.log('Balance snapshots flushed to DB.');
  }

  private ensureEightDecimals(value: string | number): string {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return num.toFixed(8);
  }
}
