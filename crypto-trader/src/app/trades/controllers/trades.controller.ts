import { Controller, Get, Query } from '@nestjs/common';
import { TradesService } from '../services/trades.service';

@Controller('trades')
export class TradesController {
  constructor(private readonly tradeService: TradesService) {}

  @Get()
  async getAllTrades(
    @Query('symbol') symbol?: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    return this.tradeService.getAllTrades(symbol, from, to);
  }
}
