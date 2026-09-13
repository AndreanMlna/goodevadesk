import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { BigQueryMlService } from './bigquery-ml.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, BigQueryMlService],
  exports: [AnalyticsService, BigQueryMlService],
})
export class AnalyticsModule {}
