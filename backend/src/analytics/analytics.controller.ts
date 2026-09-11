import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentOrg } from '../auth/current-org.decorator';
import { Organization } from '@prisma/client';

@ApiTags('Analytics')
@ApiHeader({
  name: 'x-api-key',
  description: 'Tenant authentication API Key',
  required: true,
})
@UseGuards(ApiKeyGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get Executive Sentiment & Topic Analytics Summary',
    description:
      'Provides aggregated metrics on SLA compliance rate, category breakdown, priority distribution, customer sentiment index, and recurring issue keywords strictly scoped to the authenticated organization.',
  })
  @ApiResponse({ status: 200, description: 'Executive analytics summary returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: missing or invalid x-api-key header.' })
  async getSummary(@CurrentOrg() org: Organization) {
    return this.analyticsService.getSummary(org.id);
  }
}
