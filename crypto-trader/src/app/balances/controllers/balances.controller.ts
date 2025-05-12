import { Controller, Get, Query } from '@nestjs/common';
import { BalancesService } from '../services/balances.service';

@Controller('balances')
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Get()
  async getAllSnapshots(
    @Query('asset') asset?: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    return this.balancesService.getAllSnapshots(asset, from, to);
  }
}
