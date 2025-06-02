import { Module } from '@nestjs/common';
import { IndicatorUtilsService } from './services/indicator-utils.service';

@Module({
  providers: [IndicatorUtilsService],
  exports: [IndicatorUtilsService],
})
export class IndicatorUtilsModule {}
