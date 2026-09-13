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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
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
import { CreateMessageDto } from './dto/create-message.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
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

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Enterprise: Post multi-turn reply or internal whisper note',
    description:
      'Appends a message to the multi-turn thread or records an internal staff-only private whisper note.',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID identifier' })
  @ApiResponse({ status: 201, description: 'Message or note successfully appended.' })
  async createMessage(
    @CurrentOrg() org: Organization,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.ticketsService.createMessage(org.id, id, dto);
  }

  @Patch(':id/assign')
  @ApiOperation({
    summary: 'Enterprise: Assign ticket to agent or team tier',
    description: 'Assigns or routes ticket to a designated support specialist or team tier.',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID identifier' })
  @ApiResponse({ status: 200, description: 'Ticket assignment successfully updated.' })
  async assignTicket(
    @CurrentOrg() org: Organization,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: AssignTicketDto,
  ) {
    return this.ticketsService.assignTicket(org.id, id, dto);
  }

  @Get(':id/audit-logs')
  @ApiOperation({
    summary: 'Enterprise: Get immutable audit trail for ticket',
    description: 'Retrieves all SOC-2 / ISO compliance event logs associated with this ticket.',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID identifier' })
  @ApiResponse({ status: 200, description: 'Audit logs for ticket.' })
  async getAuditLogs(
    @CurrentOrg() org: Organization,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.ticketsService.getAuditLogs(org.id, id);
  }

  @Post(':id/presence')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enterprise: Report agent presence for real-time collision detection',
    description: 'Heartbeats the presence of an active agent viewing or editing a ticket to prevent collision.',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID identifier' })
  @ApiResponse({ status: 200, description: 'Presence registered. Returns active collision list.' })
  async recordPresence(
    @CurrentOrg() org: Organization,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { agent_name?: string },
  ) {
    const otherAgents = this.ticketsService.recordPresence(
      org.id,
      id,
      body?.agent_name || 'Support Agent',
    );
    return {
      collision_detected: otherAgents.length > 0,
      active_agents: otherAgents,
    };
  }

  @Post(':id/ai-stream')
  @ApiOperation({
    summary: 'Fase 3: Stream AI Copilot suggested reply (Server-Sent Events)',
    description:
      'Streams token-by-token suggested reply with pre-LLM PII masking, semantic caching, and Vector RAG grounding.',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID identifier' })
  @ApiResponse({ status: 200, description: 'SSE stream established.' })
  async streamAiReply(
    @CurrentOrg() org: Organization,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    let isAborted = false;
    res.on('close', () => {
      isAborted = true;
    });

    try {
      await this.ticketsService.streamAiReply(id, org.id, (chunk) => {
        if (!isAborted) {
          sendEvent(chunk);
        }
      });
    } catch (err: any) {
      if (!isAborted) {
        sendEvent({ error: err.message || 'Stream generation failed', done: true });
      }
    } finally {
      if (!isAborted) {
        res.end();
      }
    }
  }
}


