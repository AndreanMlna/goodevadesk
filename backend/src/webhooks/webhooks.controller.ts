import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { WebhooksService, WebhookConfig } from './webhooks.service';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentOrg } from '../auth/current-org.decorator';
import { Organization } from '@prisma/client';

@ApiTags('Webhooks')
@ApiHeader({
  name: 'x-api-key',
  description: 'Tenant authentication API Key',
  required: true,
})
@UseGuards(ApiKeyGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('config')
  @ApiOperation({
    summary: 'Get outbound webhook configuration',
    description: 'Retrieves active Slack/Discord webhook URL and enablement status for tenant.',
  })
  @ApiResponse({ status: 200, description: 'Webhook configuration.' })
  getConfig(@CurrentOrg() org: Organization) {
    return this.webhooksService.getWebhookConfig(org.id);
  }

  @Post('config')
  @ApiOperation({
    summary: 'Update outbound webhook configuration',
    description: 'Sets or updates Slack or Discord incoming webhook destination for real-time alerting.',
  })
  @ApiResponse({ status: 200, description: 'Webhook configuration updated.' })
  updateConfig(
    @CurrentOrg() org: Organization,
    @Body() config: WebhookConfig,
  ) {
    return this.webhooksService.setWebhookConfig(org.id, config);
  }

  @Post('test')
  @ApiOperation({
    summary: 'Send a test ping alert to the webhook URL',
    description: 'Verifies webhook reachability and formatting on Slack or Discord.',
  })
  @ApiResponse({ status: 200, description: 'Test result.' })
  testWebhook(
    @Body() body: { url: string; platform: 'slack' | 'discord' | 'generic' },
  ) {
    return this.webhooksService.testWebhook(body.url, body.platform);
  }
}
