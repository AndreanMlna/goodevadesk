import { Injectable, NotFoundException, BadRequestException, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../redis/redis.service';
import { LlmService } from '../llm/llm.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { PiiGuardService } from '../guardrails/pii-guard.service';
import { SemanticCacheService } from '../cache/semantic-cache.service';
import { VectorService } from '../vector/vector.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { SubmitFeedbackDto } from './dto/feedback.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { Prisma, Ticket, TicketStatus } from '@prisma/client';
import {
  DEFAULT_TICKET_PRIORITY,
  DEFAULT_TICKET_SENTIMENT,
  DEFAULT_URGENCY_SCORE,
  DEFAULT_PAGE_LIMIT,
} from './tickets.constants';
import { calculateSlaDeadline, buildTicketWhereClause } from './tickets.utils';

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
    pii_redacted?: boolean;
  };
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  private readonly activePresences = new Map<string, Array<{ agentName: string; lastSeen: number }>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisCacheService: RedisCacheService,
    private readonly llmService: LlmService,
    @Optional() private readonly webhooksService?: WebhooksService,
    @Optional() private readonly piiGuardService?: PiiGuardService,
    @Optional() private readonly semanticCacheService?: SemanticCacheService,
    @Optional() private readonly vectorService?: VectorService,
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

    // Fase 3: PII Guardrails Pre-LLM Masking
    let sanitizedSubject = subject;
    let sanitizedMessage = message;
    let piiRedacted = false;
    if (this.piiGuardService) {
      const piiSubj = this.piiGuardService.sanitizeText(subject);
      const piiMsg = this.piiGuardService.sanitizeText(message);
      sanitizedSubject = piiSubj.sanitizedText;
      sanitizedMessage = piiMsg.sanitizedText;
      piiRedacted = piiSubj.hasPii || piiMsg.hasPii;
    }

    // Fase 3: Semantic Cache Evaluation (Cosine Similarity >= 0.90)
    if (!cacheHit && this.semanticCacheService) {
      try {
        const semHit = await this.semanticCacheService.findMatch(
          organizationId,
          `${sanitizedSubject} ${sanitizedMessage}`,
          0.90,
        );
        if (semHit.hit && semHit.suggestedReply) {
          cacheHit = true;
          cacheType = 'vector_semantic_cache';
          similarityScore = semHit.similarity;
          suggestedReply = semHit.suggestedReply;
          category = semHit.category || category;
          priority = semHit.priority || priority;
          providerUsed = 'semantic_cache';
        }
      } catch (semErr: any) {
        this.logger.warn(`Semantic cache lookup error: ${semErr.message}`);
      }
    }

    if (!cacheHit) {
      try {
        const llmResult = await this.llmService.classifyAndDraft(sanitizedSubject, sanitizedMessage);
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

          // Save to Vector Semantic Cache Pool
          if (this.semanticCacheService && suggestedReply) {
            this.semanticCacheService
              .store(organizationId, `${sanitizedSubject} ${sanitizedMessage}`, suggestedReply, {
                category: category || 'general',
                priority,
              })
              .catch((err) => this.logger.warn(`Failed to store semantic cache: ${err.message}`));
          }
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

    // Enterprise: Initialize customer message thread and record SOC-2 audit log
    try {
      if ((this.prisma as any).ticketMessage) {
        await (this.prisma as any).ticketMessage.create({
          data: {
            ticket_id: ticket.id,
            organization_id: organizationId,
            sender_type: 'customer',
            sender_name: customer_email.split('@')[0],
            sender_email: customer_email.toLowerCase().trim(),
            content: message.trim(),
          },
        });
      }
      if ((this.prisma as any).auditLog) {
        await (this.prisma as any).auditLog.create({
          data: {
            organization_id: organizationId,
            ticket_id: ticket.id,
            actor_name: customer_email,
            action: 'ticket_created',
            details: `Created ticket via API/Portal with priority [${priority}]`,
          },
        });
      }
    } catch (auditErr: any) {
      this.logger.warn(`Non-fatal: initial thread/audit creation: ${auditErr?.message}`);
    }

    // Outbound Webhook: Alert team if ticket is critical or highly urgent
    try {
      if ((priority === 'critical' || urgencyScore >= 0.8) && this.webhooksService) {
        this.webhooksService
          .dispatchAlert(organizationId, 'critical_ticket', {
            ...ticket,
            priority,
            category,
            sla_deadline: slaDeadline,
            urgency_score: urgencyScore,
          })
          .catch((wErr) => this.logger.warn(`Non-blocking: Webhook alert failed: ${wErr?.message}`));
      }
    } catch (whErr: any) {
      this.logger.warn(`Non-blocking webhook alert trigger: ${whErr?.message}`);
    }

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
    return calculateSlaDeadline(priority, baseDate);
  }

  /**
   * Retrieves paginated tickets scoped strictly to the calling tenant organization.
   */
  async findAll(organizationId: string, query: QueryTicketsDto & { priority?: string }) {
    const { page = 1, limit = DEFAULT_PAGE_LIMIT } = query as any;
    const skip = (page - 1) * limit;
    const where = buildTicketWhereClause(organizationId, query);

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
   * Finds a single ticket strictly isolated by tenant organization ID, including multi-turn messages and audit trail.
   */
  async findOne(organizationId: string, id: string): Promise<any> {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id,
        organization_id: organizationId,
      },
      include: {
        feedbacks: {
          orderBy: { created_at: 'desc' },
        },
        messages: {
          orderBy: { created_at: 'asc' },
        },
        audit_logs: {
          orderBy: { created_at: 'desc' },
          take: 50,
        },
      },
    });

    if (!ticket) {
      this.logger.warn(`Ticket not found or cross-tenant access attempted: ticket [${id}], tenant [${organizationId}]`);
      throw new NotFoundException(`Ticket with ID "${id}" was not found`);
    }

    // Backward compatibility: If no messages exist yet in ticket_messages, synthesize initial customer message
    if ((ticket as any).messages && (ticket as any).messages.length === 0 && ticket.message) {
      (ticket as any).messages = [
        {
          id: `msg-${ticket.id.slice(0, 8)}`,
          ticket_id: ticket.id,
          organization_id: ticket.organization_id,
          sender_type: 'customer',
          sender_name: ticket.customer_email.split('@')[0],
          sender_email: ticket.customer_email,
          content: ticket.message,
          created_at: ticket.created_at,
        },
      ];
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
    const existing = await this.prisma.ticket.findFirst({
      where: { id, organization_id: organizationId },
      select: { id: true, status: true },
    });

    if (!existing) {
      this.logger.warn(`Ticket not found or cross-tenant update attempted: ticket [${id}], tenant [${organizationId}]`);
      throw new NotFoundException(`Ticket with ID "${id}" was not found`);
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { status: dto.status },
    });

    try {
      if ((this.prisma as any).auditLog) {
        await (this.prisma as any).auditLog.create({
          data: {
            organization_id: organizationId,
            ticket_id: id,
            actor_name: 'Support Agent',
            action: 'status_changed',
            details: `Status changed to [${dto.status}]`,
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Non-fatal: could not log status audit: ${err?.message}`);
    }

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

    try {
      if ((this.prisma as any).ticketMessage) {
        await (this.prisma as any).ticketMessage.create({
          data: {
            ticket_id: ticket.id,
            organization_id: organizationId,
            sender_type: 'agent',
            sender_name: 'AI Support Assistant (Approved)',
            sender_email: 'ai-assistant@goodevadesk.internal',
            content: ticket.suggested_reply,
          },
        });
      }
      if ((this.prisma as any).auditLog) {
        await (this.prisma as any).auditLog.create({
          data: {
            organization_id: organizationId,
            ticket_id: id,
            actor_name: 'Support Agent',
            action: 'reply_sent',
            details: 'Approved and dispatched AI suggested reply to customer',
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Non-fatal: could not record approve reply artifacts: ${err?.message}`);
    }

    this.logger.log(`Agent approved AI suggested reply for ticket [${id}]`);
    return updated;
  }

  /**
   * Human-in-the-Loop: Submits evaluation feedback (RLHF) for AI draft.
   */
  async submitFeedback(organizationId: string, id: string, dto: SubmitFeedbackDto) {
    const ticket = await this.findOne(organizationId, id);

    const feedbackNotes = dto.agent_notes || dto.notes;
    const correctionReply = dto.edited_reply || dto.human_correction;

    const feedback = await this.prisma.ticketFeedback.create({
      data: {
        ticket_id: ticket.id,
        organization_id: organizationId,
        rating: dto.rating,
        edited_reply: correctionReply,
        agent_notes: feedbackNotes,
      },
    });

    try {
      if ((this.prisma as any).auditLog) {
        await (this.prisma as any).auditLog.create({
          data: {
            organization_id: organizationId,
            ticket_id: id,
            actor_name: 'Support Specialist',
            action: 'feedback_submitted',
            details: `Submitted rating: ${dto.rating}${feedbackNotes ? ` - ${feedbackNotes}` : ''}`,
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Non-fatal: could not log feedback audit: ${err?.message}`);
    }

    this.logger.log(`Agent feedback submitted for ticket [${id}]: Rating [${dto.rating}]`);
    return feedback;
  }

  /**
   * Enterprise: Adds a threaded conversation message or internal whisper note to a ticket.
   */
  async createMessage(
    organizationId: string,
    ticketId: string,
    dto: CreateMessageDto,
  ) {
    const ticket = await this.findOne(organizationId, ticketId);

    const senderName =
      dto.sender_name?.trim() ||
      (dto.sender_type === 'internal_note'
        ? 'Internal Staff'
        : dto.sender_type === 'agent'
        ? 'Support Agent'
        : ticket.customer_email.split('@')[0]);

    const message = await (this.prisma as any).ticketMessage.create({
      data: {
        ticket_id: ticket.id,
        organization_id: organizationId,
        sender_type: dto.sender_type,
        sender_name: senderName,
        sender_email: dto.sender_email || (dto.sender_type === 'customer' ? ticket.customer_email : null),
        content: dto.content.trim(),
      },
    });

    try {
      if ((this.prisma as any).auditLog) {
        const action =
          dto.sender_type === 'internal_note'
            ? 'internal_note_added'
            : dto.sender_type === 'agent'
            ? 'reply_sent'
            : 'customer_replied';

        const details =
          dto.sender_type === 'internal_note'
            ? `Staff added private note (${dto.content.slice(0, 60)}...)`
            : `Reply dispatched by ${senderName}`;

        await (this.prisma as any).auditLog.create({
          data: {
            organization_id: organizationId,
            ticket_id: ticket.id,
            actor_name: senderName,
            action,
            details,
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Non-fatal: could not log message audit: ${err?.message}`);
    }

    return message;
  }

  /**
   * Enterprise: Assigns ticket to an agent or team member.
   */
  async assignTicket(
    organizationId: string,
    ticketId: string,
    dto: AssignTicketDto,
  ) {
    await this.findOne(organizationId, ticketId);

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { assigned_to: dto.assigned_to.trim() },
    });

    try {
      if ((this.prisma as any).auditLog) {
        await (this.prisma as any).auditLog.create({
          data: {
            organization_id: organizationId,
            ticket_id: ticketId,
            actor_name: 'Lead Agent',
            action: 'assigned',
            details: `Assigned ticket to ${dto.assigned_to.trim()}`,
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Non-fatal: could not log assign audit: ${err?.message}`);
    }

    return updated;
  }

  /**
   * Enterprise: Retrieves immutable audit log trail for SOC-2 / ISO compliance.
   */
  async getAuditLogs(organizationId: string, ticketId?: string) {
    const where: Prisma.AuditLogWhereInput = {
      organization_id: organizationId,
    };
    if (ticketId) {
      where.ticket_id = ticketId;
    }

    if (!(this.prisma as any).auditLog) return [];

    return (this.prisma as any).auditLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  /**
   * Enterprise: Real-time agent collision detection & presence tracking.
   * Tracks agents active on a ticket in the last 25 seconds to prevent duplicate efforts.
   */
  recordPresence(organizationId: string, ticketId: string, agentName: string): string[] {
    const key = `${organizationId}:${ticketId}`;
    const now = Date.now();
    let presences = this.activePresences.get(key) || [];

    // Filter out presences inactive for more than 25 seconds
    presences = presences.filter((p) => now - p.lastSeen < 25000);

    const cleanName = agentName?.trim() || 'Support Agent';
    const existing = presences.find((p) => p.agentName.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      existing.lastSeen = now;
    } else {
      presences.push({ agentName: cleanName, lastSeen: now });
    }

    this.activePresences.set(key, presences);

    // Return other active agents (excluding calling agent)
    return presences
      .filter((p) => p.agentName.toLowerCase() !== cleanName.toLowerCase())
      .map((p) => p.agentName);
  }

  /**
   * Enterprise Fase 3: Streams AI Copilot suggested reply token-by-token with PII Guardrails, Semantic Cache, and Vector RAG.
   */
  async streamAiReply(
    ticketId: string,
    orgId: string,
    onChunk: (chunk: {
      token?: string;
      done: boolean;
      fullText?: string;
      ragDoc?: string;
      cached?: boolean;
      piiMasked?: boolean;
    }) => void,
  ): Promise<void> {
    const ticket = await this.findOne(orgId, ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found in organization.`);
    }

    const rawQuery = `${ticket.subject} ${ticket.message}`;

    // 1. PII Guardrails: redact sensitive data before processing
    let queryToProcess = rawQuery;
    let isPiiMasked = false;
    if (this.piiGuardService) {
      const piiCheck = this.piiGuardService.sanitizeText(rawQuery);
      queryToProcess = piiCheck.sanitizedText;
      isPiiMasked = piiCheck.hasPii;
    }

    // 2. Semantic Cache: check if similar query was already answered
    if (this.semanticCacheService) {
      const cacheHit = await this.semanticCacheService.findMatch(orgId, queryToProcess, 0.90);
      if (cacheHit.hit && cacheHit.suggestedReply) {
        this.logger.log(`[Stream AI] Serving from Semantic Cache (score: ${cacheHit.similarity}) for ticket ${ticketId}`);
        // Stream out cached reply in smooth token batches
        const words = cacheHit.suggestedReply.split(/(\s+)/);
        for (const word of words) {
          onChunk({ token: word, done: false, cached: true, piiMasked: isPiiMasked });
          await new Promise((r) => setTimeout(r, 20));
        }
        onChunk({
          done: true,
          fullText: cacheHit.suggestedReply,
          ragDoc: ticket.grounding_doc || 'Semantic Cache Pool',
          cached: true,
          piiMasked: isPiiMasked,
        });
        return;
      }
    }

    // 3. Vector RAG Hybrid Retrieval
    let topSopDoc = ticket.grounding_doc || 'VOL-I (Standard)';
    if (this.vectorService) {
      const searchResults = await this.vectorService.hybridSearch(queryToProcess, 1);
      if (searchResults.length > 0) {
        topSopDoc = `${searchResults[0].docId} - ${searchResults[0].title}`;
      }
    }

    // 4. Draft generation & token streaming
    const draftResult = await this.llmService.classifyAndDraft(ticket.subject, queryToProcess);
    const fullReply = draftResult?.suggested_reply || ticket.suggested_reply || 'Thank you for reaching out to GoodevaDesk. We are actively investigating this issue.';

    // Stream tokens with realistic typewriter interval
    const tokens = fullReply.split(/(\s+)/);
    for (const tok of tokens) {
      onChunk({ token: tok, done: false, cached: false, piiMasked: isPiiMasked });
      await new Promise((r) => setTimeout(r, 25));
    }

    // Store in semantic cache for future instant hits
    if (this.semanticCacheService) {
      await this.semanticCacheService.store(orgId, queryToProcess, fullReply, {
        category: ticket.category || 'general',
        priority: ticket.priority || 'normal',
      });
    }

    onChunk({
      done: true,
      fullText: fullReply,
      ragDoc: topSopDoc,
      cached: false,
      piiMasked: isPiiMasked,
    });
  }
}
