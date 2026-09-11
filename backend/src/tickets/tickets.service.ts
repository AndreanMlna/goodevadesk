import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../redis/redis.service';
import { LlmService } from '../llm/llm.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { SubmitFeedbackDto } from './dto/feedback.dto';
import { Prisma, Ticket, TicketStatus } from '@prisma/client';
import {
  SLA_HOURS_BY_PRIORITY,
  DEFAULT_TICKET_PRIORITY,
  DEFAULT_TICKET_SENTIMENT,
  DEFAULT_URGENCY_SCORE,
  DEFAULT_PAGE_LIMIT,
} from './tickets.constants';

export interface CreateTicketResponse {
  id: string;
  organization_id: string;
  customer_email: string;
  subject: string;
  message: string;
  category: string | null;
  suggested_reply: string | null;
  status: TicketStatus;
  priority?: string;
  sla_deadline?: Date | null;
  sentiment?: string | null;
  urgency_score?: number | null;
  grounding_doc?: string | null;
  created_at: Date;
  updated_at: Date;
  _meta?: {
    cache_hit: boolean;
    cache_type?: string;
    similarity_score?: number;
    llm_processed: boolean;
    provider?: string;
  };
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisCacheService: RedisCacheService,
    private readonly llmService: LlmService,
  ) {}

  /**
   * Creates a customer support ticket with semantic caching, LLM RAG triage, and dynamic SLA deadline.
   */
  async create(organizationId: string, dto: CreateTicketDto): Promise<CreateTicketResponse> {
    const { subject, message, customer_email } = dto;
    let category: string | null = null;
    let suggestedReply: string | null = null;
    let priority = DEFAULT_TICKET_PRIORITY;
    let sentiment = DEFAULT_TICKET_SENTIMENT;
    let urgencyScore = DEFAULT_URGENCY_SCORE;
    let groundingDoc: string | null = null;
    let cacheHit = false;
    let cacheType: string | undefined = undefined;
    let similarityScore: number | undefined = undefined;
    let llmProcessed = false;
    let providerUsed = 'none';

    try {
      const cached = await this.redisCacheService.getClassification(subject, message);
      if (cached) {
        category = cached.category;
        suggestedReply = cached.suggested_reply;
        priority = cached.priority || DEFAULT_TICKET_PRIORITY;
        sentiment = cached.sentiment || DEFAULT_TICKET_SENTIMENT;
        urgencyScore = cached.urgency_score ?? DEFAULT_URGENCY_SCORE;
        groundingDoc = cached.grounding_doc || null;
        cacheHit = true;
        cacheType = cached.source;
        similarityScore = cached.similarity_score;
        providerUsed = cached.source;
        this.logger.log(`Reusing cached classification (${cached.source}) for ticket: [${category}] Priority: [${priority}]`);
      }
    } catch (cacheErr: any) {
      this.logger.warn(`Redis lookup failed (non-fatal): ${cacheErr.message}`);
    }

    if (!cacheHit) {
      try {
        const llmResult = await this.llmService.classifyAndDraft(subject, message);
        if (llmResult) {
          category = llmResult.category;
          suggestedReply = llmResult.suggested_reply;
          priority = llmResult.priority || DEFAULT_TICKET_PRIORITY;
          sentiment = llmResult.sentiment || DEFAULT_TICKET_SENTIMENT;
          urgencyScore = llmResult.urgency_score ?? DEFAULT_URGENCY_SCORE;
          groundingDoc = llmResult.grounding_doc || null;
          llmProcessed = true;
          providerUsed = `${llmResult.provider}:${llmResult.model}`;

          this.redisCacheService
            .setClassification(subject, message, category, suggestedReply, {
              priority,
              sentiment,
              urgency_score: urgencyScore,
              grounding_doc: groundingDoc || undefined,
            })
            .catch((err) => this.logger.warn(`Failed to cache LLM result: ${err.message}`));
        }
      } catch (llmError: any) {
        this.logger.error(
          `LLM Classification failed: ${llmError.message}. Proceeding with unclassified fallback.`,
        );
        category = null;
        suggestedReply = null;
        priority = DEFAULT_TICKET_PRIORITY;
      }
    }

    const slaDeadline = this.calculateSlaDeadline(priority);

    const ticket = await this.prisma.ticket.create({
      data: {
        organization_id: organizationId,
        customer_email: customer_email.toLowerCase().trim(),
        subject: subject.trim(),
        message: message.trim(),
        category,
        suggested_reply: suggestedReply,
        status: TicketStatus.open,
        priority,
        sla_deadline: slaDeadline,
        sentiment,
        urgency_score: urgencyScore,
        grounding_doc: groundingDoc,
      },
    });

    this.logger.log(
      `Created ticket [${ticket.id}] for tenant [${organizationId}] (Category: ${category || 'unclassified'}, Priority: ${priority})`,
    );

    return {
      ...ticket,
      _meta: {
        cache_hit: cacheHit,
        cache_type: cacheType,
        similarity_score: similarityScore,
        llm_processed: llmProcessed,
        provider: providerUsed,
      },
    };
  }

  /**
   * Computes the SLA deadline based on urgency priority level.
   */
  private calculateSlaDeadline(priority: string, baseDate: Date = new Date()): Date {
    const slaHours = SLA_HOURS_BY_PRIORITY[priority.toLowerCase()] ?? SLA_HOURS_BY_PRIORITY.normal;
    const millisecondsPerHour = 60 * 60 * 1000;
    return new Date(baseDate.getTime() + slaHours * millisecondsPerHour);
  }

  /**
   * Retrieves paginated tickets scoped strictly to the calling tenant organization.
   */
  async findAll(organizationId: string, query: QueryTicketsDto & { priority?: string }) {
    const { status, category, search, page = 1, limit = DEFAULT_PAGE_LIMIT, priority } = query as any;
    const skip = (page - 1) * limit;

    const where: Prisma.TicketWhereInput = {
      organization_id: organizationId,
    };

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = {
        equals: category.toLowerCase().trim(),
        mode: 'insensitive',
      };
    }

    if (priority) {
      where.priority = priority.toLowerCase().trim();
    }

    if (search && search.trim().length > 0) {
      const searchTerm = search.trim();
      where.OR = [
        { subject: { contains: searchTerm, mode: 'insensitive' } },
        { message: { contains: searchTerm, mode: 'insensitive' } },
        { customer_email: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [tickets, totalCount] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy: [{ created_at: 'desc' }],
        skip,
        take: limit,
        include: {
          feedbacks: {
            orderBy: { created_at: 'desc' },
            take: 5,
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data: tickets,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }

  /**
   * Finds a single ticket strictly isolated by tenant organization ID.
   */
  async findOne(organizationId: string, id: string): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id,
        organization_id: organizationId,
      },
    });

    if (!ticket) {
      this.logger.warn(`Ticket not found or cross-tenant access attempted: ticket [${id}], tenant [${organizationId}]`);
      throw new NotFoundException(`Ticket with ID "${id}" was not found`);
    }

    return ticket;
  }

  /**
   * Updates ticket lifecycle status.
   */
  async updateStatus(
    organizationId: string,
    id: string,
    dto: UpdateTicketStatusDto,
  ): Promise<Ticket> {
    await this.findOne(organizationId, id);

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { status: dto.status },
    });

    this.logger.log(`Updated ticket [${id}] status to [${dto.status}] for tenant [${organizationId}]`);
    return updated;
  }

  /**
   * Human-in-the-Loop: Approves AI suggested reply and sets ticket to in_progress.
   */
  async approveSuggestedReply(organizationId: string, id: string): Promise<Ticket> {
    const ticket = await this.findOne(organizationId, id);

    if (!ticket.suggested_reply) {
      throw new BadRequestException('Ticket does not have an AI suggested reply to approve.');
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { status: TicketStatus.in_progress },
    });

    this.logger.log(`Agent approved AI suggested reply for ticket [${id}]`);
    return updated;
  }

  /**
   * Human-in-the-Loop: Submits evaluation feedback (RLHF) for AI draft.
   */
  async submitFeedback(organizationId: string, id: string, dto: SubmitFeedbackDto) {
    const ticket = await this.findOne(organizationId, id);

    const feedback = await this.prisma.ticketFeedback.create({
      data: {
        ticket_id: ticket.id,
        organization_id: organizationId,
        rating: dto.rating,
        edited_reply: dto.edited_reply,
        agent_notes: dto.agent_notes,
      },
    });

    this.logger.log(`Agent feedback submitted for ticket [${id}]: Rating [${dto.rating}]`);
    return feedback;
  }
}
