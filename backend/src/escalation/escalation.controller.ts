import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { EscalationService } from './escalation.service';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentOrg } from '../auth/current-org.decorator';
import { Organization } from '@prisma/client';

@ApiTags('Escalation')
@ApiHeader({
  name: 'x-api-key',
  description: 'Tenant authentication API Key',
  required: true,
})
@UseGuards(ApiKeyGuard)
@Controller('escalation')
export class EscalationController {
  constructor(private readonly escalationService: EscalationService) {}

  @Post('check')
  @ApiOperation({
    summary: 'Trigger SLA auto-escalation check',
    description: 'Manually triggers SLA evaluation for active tickets and auto-escalates nearing deadlines.',
  })
  @ApiResponse({ status: 200, description: 'Escalation check completed.' })
  async triggerCheck(@CurrentOrg() org: Organization) {
    return this.escalationService.evaluateSlaEscalations(org.id);
  }
}
