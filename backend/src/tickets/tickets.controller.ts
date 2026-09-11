import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { SubmitFeedbackDto } from './dto/feedback.dto';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentOrg } from '../auth/current-org.decorator';
import { Organization } from '@prisma/client';

@ApiTags('Tickets')
@ApiHeader({
  name: 'x-api-key',
  description: 'Tenant authentication API Key (e.g. acme_live_key_12345)',
  required: true,
})
@UseGuards(ApiKeyGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new support ticket',
    description:
      'Creates a support ticket, automatically checks Redis cache for similar queries, calls LLM for category classification, SLA triage, and grounded suggested reply, and securely persists the ticket scoped to the authenticated organization.',
  })
  @ApiResponse({
    status: 201,
    description: 'Ticket successfully created with LLM classification, SLA triage & suggested reply.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed on request payload.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid x-api-key header.' })
  async create(
    @CurrentOrg() org: Organization,
    @Body() createTicketDto: CreateTicketDto,
  ) {
    return this.ticketsService.create(org.id, createTicketDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List organization tickets with filters',
    description:
      'Retrieves all tickets belonging to the authenticated organization. Supports filtering by status (open/in_progress/closed), category (billing/technical/general), search term, priority, and pagination.',
  })
  @ApiResponse({ status: 200, description: 'Filtered list of organization tickets.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid x-api-key header.' })
  async findAll(
    @CurrentOrg() org: Organization,
    @Query() query: QueryTicketsDto,
  ) {
    return this.ticketsService.findAll(org.id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get ticket details',
    description:
      'Returns complete ticket information including LLM-generated category, SLA deadline, and suggested reply. Strictly isolated: returns 404 if ticket belongs to another organization.',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID identifier' })
  @ApiResponse({ status: 200, description: 'Ticket found and returned.' })
  @ApiResponse({ status: 404, description: 'Ticket not found in this organization.' })
  async findOne(
    @CurrentOrg() org: Organization,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.ticketsService.findOne(org.id, id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update ticket status',
    description: 'Updates ticket status to open, in_progress, or closed.',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID identifier' })
  @ApiResponse({ status: 200, description: 'Ticket status successfully updated.' })
  @ApiResponse({ status: 404, description: 'Ticket not found in this organization.' })
  async updateStatus(
    @CurrentOrg() org: Organization,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateDto: UpdateTicketStatusDto,
  ) {
    return this.ticketsService.updateStatus(org.id, id, updateDto);
  }

  @Post(':id/approve-reply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Human-in-the-Loop: One-click approve and adopt suggested reply',
    description: 'Marks ticket as in-progress and accepts the AI suggested reply for dispatch.',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID identifier' })
  @ApiResponse({ status: 200, description: 'Reply approved and ticket status updated.' })
  async approveReply(
    @CurrentOrg() org: Organization,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.ticketsService.approveSuggestedReply(org.id, id);
  }

  @Post(':id/feedback')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Human-in-the-Loop: Submit evaluation feedback on AI reply',
    description: 'Records human agent rating (thumbs_up / thumbs_down) and optional edited reply for RLHF model quality tracking.',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID identifier' })
  @ApiResponse({ status: 201, description: 'Feedback recorded successfully.' })
  async submitFeedback(
    @CurrentOrg() org: Organization,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() feedbackDto: SubmitFeedbackDto,
  ) {
    return this.ticketsService.submitFeedback(org.id, id, feedbackDto);
  }
}
