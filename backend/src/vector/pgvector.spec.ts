import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VectorService } from './vector.service';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';

describe('VectorService (pgvector Native Integration)', () => {
  let service: VectorService;
  let mockPrisma: any;
  let mockKb: any;
  let mockConfig: any;

  beforeEach(async () => {
    mockPrisma = {
      knowledgeVector: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([
          {
            doc_id: 'SOP-BIL-2026',
            title: 'Billing & Refund Policy',
            category: 'billing',
            content: 'Official billing refund policy and payment procedures.',
            embedding: JSON.stringify(new Array(256).fill(0.0625)),
          },
        ]),
        create: jest.fn().mockResolvedValue({ id: 'mock-id-1' }),
        update: jest.fn().mockResolvedValue({ id: 'mock-id-1' }),
        count: jest.fn().mockResolvedValue(3),
      },
      $queryRawUnsafe: jest.fn(),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    };

    mockKb = {
      getAllDocuments: jest.fn().mockReturnValue([
        {
          docId: 'SOP-BIL-2026',
          title: 'Billing & Refund Policy',
          category: 'billing',
          content: 'Official billing refund policy and payment procedures.',
          keywords: ['refund', 'billing', 'payment'],
        },
      ]),
      retrieveRelevantSop: jest.fn().mockReturnValue({
        docId: 'SOP-BIL-2026',
        category: 'billing',
        title: 'Billing & Refund Policy',
        excerpt: 'Refund policy details...',
        relevanceScore: 0.95,
      }),
    };

    mockConfig = {
      get: jest.fn().mockReturnValue('mock-val'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: KnowledgeBaseService, useValue: mockKb },
      ],
    }).compile();

    service = module.get<VectorService>(VectorService);
  });

  describe('1. pgvector Detection & Operational Status', () => {
    it('should detect when pgvector extension is installed in PostgreSQL', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ '?column?': 1 }]);

      const isSupported = await service.checkPgVectorSupport();
      expect(isSupported).toBe(true);

      const status = await service.getPgVectorStatus();
      expect(status.pgvector_enabled).toBe(true);
      expect(status.engine).toContain('PostgreSQL Native pgvector');
      expect(status.dimensions).toBe(256);
      expect(status.distance_metric).toBe('cosine_distance (<=>)');
      expect(status.hybrid_weights.dense_vector).toBe(0.6);
      expect(status.hybrid_weights.sparse_keyword).toBe(0.4);
    });

    it('should fall back gracefully to in-memory mode when pgvector extension is absent', async () => {
      // Simulate no pgvector extension or query error
      mockPrisma.$queryRawUnsafe.mockRejectedValueOnce(new Error('relation pg_extension does not exist'));

      const isSupported = await service.checkPgVectorSupport();
      expect(isSupported).toBe(false);

      const status = await service.getPgVectorStatus();
      expect(status.pgvector_enabled).toBe(false);
      expect(status.engine).toBe('In-Memory Fallback');
    });
  });

  describe('2. Document Vector Synchronization', () => {
    it('should sync SOP documents into knowledge_vectors table and execute raw update when pgvector is active', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ '?column?': 1 }]);

      const count = await service.syncSopVectors();
      expect(count).toBe(1);
      expect(mockPrisma.knowledgeVector.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "knowledge_vectors" SET "embedding_vec" = $1::vector'),
        expect.stringMatching(/^\[-?[0-9.]+.*\]$/),
        'SOP-BIL-2026',
      );
    });
  });

  describe('3. Native pgvector Hybrid Search & Fallback Execution', () => {
    it('should query native pgvector via <=> operator and calculate hybrid scores', async () => {
      // Mock pgvector extension active
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ '?column?': 1 }]) // checkPgVectorSupport
        .mockResolvedValueOnce([ // native query
          {
            doc_id: 'SOP-BIL-2026',
            title: 'Billing & Refund Policy',
            category: 'billing',
            content: 'Official billing refund policy and payment procedures.',
            dense_score: 0.92,
          },
        ]);

      const results = await service.hybridSearch('refund policy question', 3);

      expect(results.length).toBe(1);
      expect(results[0].docId).toBe('SOP-BIL-2026');
      expect(results[0].denseScore).toBe(0.92);
      expect(results[0].sparseScore).toBe(0.95);
      // hybrid = 0.6 * 0.92 + 0.4 * 0.95 = 0.552 + 0.380 = 0.932
      expect(results[0].hybridScore).toBeCloseTo(0.932, 2);
    });

    it('should seamlessly fall back to memory cosine calculation if native pgvector query fails', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ '?column?': 1 }]); // checkPgVectorSupport = true
      mockPrisma.$queryRawUnsafe.mockRejectedValueOnce(new Error('syntax error in vector literal')); // query fails

      const results = await service.hybridSearch('refund policy question', 3);

      expect(results.length).toBe(1);
      expect(results[0].docId).toBe('SOP-BIL-2026');
      expect(results[0].hybridScore).toBeGreaterThan(0);
    });
  });
});
