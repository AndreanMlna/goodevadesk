import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { RedisCacheService } from '../redis/redis.service';
import { LlmService } from '../llm/llm.service';
import { TicketsService } from './tickets.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('GoodevaDesk 5 Enterprise Innovations', () => {
  let kbService: KnowledgeBaseService;
  let redisService: RedisCacheService;
  let llmService: LlmService;
  let ticketsService: TicketsService;
  let analyticsService: AnalyticsService;

  const mockPrisma = {
    ticket: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    ticketFeedback: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBaseService,
        RedisCacheService,
        LlmService,
        TicketsService,
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'REDIS_URL') return undefined;
              if (key === 'LLM_PROVIDER') return 'mock';
              return null;
            }),
          },
        },
      ],
    }).compile();

    kbService = module.get<KnowledgeBaseService>(KnowledgeBaseService);
    redisService = module.get<RedisCacheService>(RedisCacheService);
    llmService = module.get<LlmService>(LlmService);
    ticketsService = module.get<TicketsService>(TicketsService);
    analyticsService = module.get<AnalyticsService>(AnalyticsService);

    kbService.onModuleInit();
  });

  describe('Innovation 1 & 2: RAG Knowledge Base Grounding & Smart Triage', () => {
    it('should retrieve SOP-BIL-2026 for billing/refund disputes', () => {
      const sop = kbService.retrieveRelevantSop('Refund request', 'I was double charged on my invoice');
      expect(sop.docId).toBe('SOP-BIL-2026');
      expect(sop.category).toBe('billing');
      expect(sop.excerpt).toBeDefined();
    });

    it('should retrieve SOP-ENG-2026 for production outage / 504 errors', () => {
      const sop = kbService.retrieveRelevantSop('504 Gateway Timeout', 'API is failing in production with 500 error');
      expect(sop.docId).toBe('SOP-ENG-2026');
      expect(sop.category).toBe('technical');
    });

    it('should classify critical outage as P1 priority with high urgency and grounded SOP', async () => {
      const result = await llmService.classifyAndDraft(
        '504 Gateway Timeout on Production',
        'Our system is down and returning 504 timeout on checkout',
      );

      expect(result).not.toBeNull();
      expect(result?.category).toBe('technical');
      expect(result?.priority).toBe('critical');
      expect(result?.urgency_score).toBeGreaterThanOrEqual(0.8);
      expect(result?.sentiment).toMatch(/frustrated|angry|negative/);
      expect(result?.grounding_doc).toBe('SOP-ENG-2026');
      expect(result?.suggested_reply).toContain('SOP-ENG-2026');
    });
  });

  describe('Innovation 3: Semantic Similarity Cache', () => {
    it('should find semantic cache match for differently phrased similar queries', async () => {
      const originalSubject = 'Duplicate invoice billing charged';
      const originalMessage = 'Subscription payment double billed on customer account';

      // Store in cache
      await redisService.setClassification(
        originalSubject,
        originalMessage,
        'billing',
        'We have processed your refund per SOP-BIL-2026',
        {
          priority: 'high',
          urgency_score: 80,
          sentiment: 'frustrated',
          grounding_doc: 'SOP-BIL-2026',
        },
      );

      // Query with high semantic overlap
      const similarSubject = 'Duplicate invoice billing charged';
      const similarMessage = 'Subscription payment double billed on customer';

      const match = await redisService.getClassification(similarSubject, similarMessage);
      expect(match).not.toBeNull();
      expect(match?.category).toBe('billing');
      expect(match?.grounding_doc).toBe('SOP-BIL-2026');
      expect(match?.similarity_score).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('Innovation 4: Human-in-the-Loop (HITL) Approval & RLHF Feedback', () => {
    it('should approve suggested reply and mark ticket in_progress', async () => {
      const orgId = 'org-hitl';
      const ticketId = 'tick-123';
      const mockTicket = {
        id: ticketId,
        organization_id: orgId,
        subject: 'Billing issue',
        message: 'Charged twice',
        suggested_reply: 'Refund issued per SOP-BIL-2026',
        status: 'open',
      };

      mockPrisma.ticket.findFirst.mockResolvedValueOnce(mockTicket);
      mockPrisma.ticket.update.mockResolvedValueOnce({
        ...mockTicket,
        status: 'in_progress',
      });

      const approved = await ticketsService.approveSuggestedReply(orgId, ticketId);
      expect(approved.status).toBe('in_progress');
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ticketId },
          data: expect.objectContaining({ status: 'in_progress' }),
        }),
      );
    });

    it('should record human feedback for model quality training', async () => {
      const orgId = 'org-hitl';
      const ticketId = 'tick-123';
      mockPrisma.ticket.findFirst.mockResolvedValueOnce({
        id: ticketId,
        organization_id: orgId,
      });
      mockPrisma.ticketFeedback.create.mockResolvedValueOnce({
        id: 'fb-1',
        ticket_id: ticketId,
        organization_id: orgId,
        rating: 'thumbs_up',
        agent_notes: 'Great and accurate SOP response',
      });

      const fb = await ticketsService.submitFeedback(orgId, ticketId, {
        rating: 'thumbs_up',
        agent_notes: 'Great and accurate SOP response',
      });

      expect(fb.rating).toBe('thumbs_up');
      expect(mockPrisma.ticketFeedback.create).toHaveBeenCalled();
    });
  });

  describe('Innovation 5: Executive Sentiment & Topic Analytics', () => {
    it('should compute aggregated executive dashboard metrics with strict tenant scoping', async () => {
      const orgId = 'org-analytics-1';
      const now = new Date();
      const pastDeadline = new Date(now.getTime() - 3600000); // 1h ago = breached

      mockPrisma.ticket.findMany.mockResolvedValueOnce([
        {
          id: 't-1',
          subject: 'Production crash with 504 gateway timeout',
          category: 'technical',
          priority: 'critical',
          sentiment: 'frustrated',
          sla_deadline: pastDeadline,
          status: 'open',
          created_at: now,
          message: 'system down',
        },
        {
          id: 't-2',
          subject: 'How to invite users',
          category: 'general',
          priority: 'normal',
          sentiment: 'neutral',
          sla_deadline: new Date(now.getTime() + 86400000),
          status: 'closed',
          created_at: now,
          message: 'need help',
        },
      ]);

      mockPrisma.ticketFeedback.findMany.mockResolvedValueOnce([
        { rating: 'thumbs_up' },
        { rating: 'thumbs_up' },
      ]);

      const analytics = await analyticsService.getSummary(orgId);

      expect(analytics.organization_id).toBe(orgId);
      expect(analytics.total_tickets).toBe(2);
      expect(analytics.priority_breakdown['critical']).toBe(1);
      expect(analytics.sentiment_breakdown['frustrated']).toBe(1);
      expect(analytics.sla_metrics.breached_tickets_count).toBe(1);
      expect(analytics.sla_metrics.sla_compliance_rate_percent).toBe(50);
      expect(analytics.feedback_metrics.approval_rate_percent).toBe(100);
      expect(analytics.trending_topics.length).toBeGreaterThan(0);
    });
  });
});
