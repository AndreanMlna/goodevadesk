import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../redis/redis.service';
import { LlmService } from '../llm/llm.service';
import { NotFoundException } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';


describe('TicketsService', () => {
  let service: TicketsService;
  let prisma: any;
  let redis: any;
  let llm: any;

  const mockOrgId = 'org-uuid-acme';

  beforeEach(async () => {
    prisma = {
      ticket: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    redis = {
      getClassification: jest.fn(),
      setClassification: jest.fn().mockResolvedValue(undefined),
    };

    llm = {
      classifyAndDraft: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisCacheService, useValue: redis },
        { provide: LlmService, useValue: llm },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a ticket with LLM classification on cache miss', async () => {
      redis.getClassification.mockResolvedValue(null);
      llm.classifyAndDraft.mockResolvedValue({
        category: 'billing',
        suggested_reply: 'We have processed your refund request.',
        provider: 'openai',
        model: 'gpt-4o-mini',
      });

      const mockSavedTicket = {
        id: 'ticket-1',
        organization_id: mockOrgId,
        customer_email: 'user@example.com',
        subject: 'Need refund for order',
        message: 'I was charged twice yesterday.',
        category: 'billing',
        suggested_reply: 'We have processed your refund request.',
        status: TicketStatus.open,
        created_at: new Date(),
        updated_at: new Date(),
      };
      prisma.ticket.create.mockResolvedValue(mockSavedTicket);

      const result = await service.create(mockOrgId, {
        customer_email: 'user@example.com',
        subject: 'Need refund for order',
        message: 'I was charged twice yesterday.',
      });

      expect(redis.getClassification).toHaveBeenCalled();
      expect(llm.classifyAndDraft).toHaveBeenCalled();
      expect(prisma.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organization_id: mockOrgId,
            category: 'billing',
          }),
        }),
      );
      expect(result.category).toBe('billing');
      expect(result._meta?.cache_hit).toBe(false);
    });

    it('should use Redis cache on cache hit and avoid calling LLM', async () => {
      redis.getClassification.mockResolvedValue({
        category: 'technical',
        suggested_reply: 'Please restart your integration token.',
        source: 'redis_cache',
      });

      const mockSavedTicket = {
        id: 'ticket-2',
        organization_id: mockOrgId,
        customer_email: 'dev@example.com',
        subject: 'API Timeout 504',
        message: 'Gateway timeout on POST endpoint',
        category: 'technical',
        suggested_reply: 'Please restart your integration token.',
        status: TicketStatus.open,
        created_at: new Date(),
        updated_at: new Date(),
      };
      prisma.ticket.create.mockResolvedValue(mockSavedTicket);

      const result = await service.create(mockOrgId, {
        customer_email: 'dev@example.com',
        subject: 'API Timeout 504',
        message: 'Gateway timeout on POST endpoint',
      });

      expect(redis.getClassification).toHaveBeenCalled();
      expect(llm.classifyAndDraft).not.toHaveBeenCalled();
      expect(result.category).toBe('technical');
      expect(result._meta?.cache_hit).toBe(true);
    });

    it('should still create ticket if LLM fails (graceful degradation)', async () => {
      redis.getClassification.mockResolvedValue(null);
      llm.classifyAndDraft.mockRejectedValue(new Error('OpenAI API timeout'));

      const mockSavedTicket = {
        id: 'ticket-3',
        organization_id: mockOrgId,
        customer_email: 'customer@example.com',
        subject: 'General inquiry',
        message: 'Hello, need help.',
        category: null,
        suggested_reply: null,
        status: TicketStatus.open,
        created_at: new Date(),
        updated_at: new Date(),
      };
      prisma.ticket.create.mockResolvedValue(mockSavedTicket);

      const result = await service.create(mockOrgId, {
        customer_email: 'customer@example.com',
        subject: 'General inquiry',
        message: 'Hello, need help.',
      });

      expect(prisma.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: null,
            suggested_reply: null,
          }),
        }),
      );
      expect(result.category).toBeNull();
      expect(result.id).toBe('ticket-3');
    });
  });

  describe('tenant isolation', () => {
    it('findOne should throw NotFoundException if ticket belongs to another organization', async () => {
      prisma.ticket.findFirst.mockResolvedValue(null);

      await expect(service.findOne('another-org-id', 'ticket-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.ticket.findFirst).toHaveBeenCalledWith({
        where: { id: 'ticket-1', organization_id: 'another-org-id' },
      });
    });

    it('findAll should strictly scope query by organization_id', async () => {
      prisma.ticket.findMany.mockResolvedValue([]);
      prisma.ticket.count.mockResolvedValue(0);

      await service.findAll(mockOrgId, { status: TicketStatus.open });

      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organization_id: mockOrgId,
            status: TicketStatus.open,
          }),
        }),
      );
    });
  });
});
