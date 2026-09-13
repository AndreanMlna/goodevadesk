import { Test, TestingModule } from '@nestjs/testing';
import { PiiGuardService } from '../guardrails/pii-guard.service';
import { VectorService } from '../vector/vector.service';
import { SemanticCacheService } from '../cache/semantic-cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';

describe('Fase 3: Advanced AI & API Security Testing (/api-security-testing)', () => {
  let piiGuardService: PiiGuardService;
  let vectorService: VectorService;
  let semanticCacheService: SemanticCacheService;

  beforeAll(async () => {
    const mockPrisma = {
      knowledgeVector: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'v1' }),
        update: jest.fn().mockResolvedValue({ id: 'v1' }),
      },
    };

    const mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'LLM_PROVIDER') return 'mock';
        return null;
      }),
    };

    const mockKb = {
      getAllDocuments: jest.fn().mockReturnValue([
        { docId: 'VOL-I', title: 'Refund Policy', category: 'billing', content: 'Refund terms and billing dispute details.' },
        { docId: 'VOL-II', title: 'API Rate Limits', category: 'technical', content: 'API rate limits and gateway timeout guidance.' },
      ]),
      retrieveRelevantSop: jest.fn().mockReturnValue({
        docId: 'VOL-I',
        title: 'Refund Policy',
        category: 'billing',
        excerpt: 'Refund terms...',
        relevanceScore: 0.95,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PiiGuardService,
        VectorService,
        SemanticCacheService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: KnowledgeBaseService, useValue: mockKb },
      ],
    }).compile();

    piiGuardService = module.get<PiiGuardService>(PiiGuardService);
    vectorService = module.get<VectorService>(VectorService);
    semanticCacheService = module.get<SemanticCacheService>(SemanticCacheService);
  });

  describe('1. PII Guardrails Security (/api-security-testing)', () => {
    it('should redact valid Visa/Mastercard credit card numbers before LLM processing', () => {
      // Valid Luhn test card (Stripe / Visa standard test card)
      const promptWithCard = 'Customer states my card 4242-4242-4242-4242 was double billed $99';
      const result = piiGuardService.sanitizeText(promptWithCard);

      expect(result.hasPii).toBe(true);
      expect(result.sanitizedText).toContain('[REDACTED_CREDIT_CARD]');
      expect(result.sanitizedText).not.toContain('4242-4242-4242-4242');
      expect(result.detectedPii).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'credit_card' })]),
      );
    });

    it('should redact sensitive passwords, API keys, and bearer tokens', () => {
      const promptWithSecrets = 'My credentials are password: "SuperSecretPassword123!" and api_key="live_sk_abcdef123456"';
      const result = piiGuardService.sanitizeText(promptWithSecrets);

      expect(result.hasPii).toBe(true);
      expect(result.sanitizedText).toContain('[REDACTED_SECRET]');
      expect(result.sanitizedText).not.toContain('SuperSecretPassword123!');
      expect(result.sanitizedText).not.toContain('live_sk_abcdef123456');
    });

    it('should redact phone numbers and national IDs', () => {
      const promptWithId = 'Customer phone is +6281234567890 and NIK is 3201012345678901';
      const result = piiGuardService.sanitizeText(promptWithId);

      expect(result.hasPii).toBe(true);
      expect(result.sanitizedText).toContain('[REDACTED_PHONE]');
      expect(result.sanitizedText).toContain('[REDACTED_ID]');
      expect(result.sanitizedText).not.toContain('+6281234567890');
    });

    it('should leave benign enterprise support text unredacted', () => {
      const benignText = 'The analytics dashboard is showing 504 gateway timeout on billing export.';
      const result = piiGuardService.sanitizeText(benignText);

      expect(result.hasPii).toBe(false);
      expect(result.sanitizedText).toBe(benignText);
      expect(result.detectedPii.length).toBe(0);
    });
  });

  describe('2. Vector Embeddings & Hybrid RAG (/ai-engineer)', () => {
    it('should generate deterministic L2-normalized dense embeddings', () => {
      const text = 'Refund request for billing charge';
      const embedding = vectorService.generateEmbedding(text);

      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(256);

      // Verify L2 norm = 1.0 (within floating point precision)
      const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      expect(norm).toBeCloseTo(1.0, 4);
    });

    it('should compute exact 1.0 cosine similarity for identical vectors', () => {
      const text = 'How to upgrade subscription plan';
      const vec1 = vectorService.generateEmbedding(text);
      const vec2 = vectorService.generateEmbedding(text);

      const sim = vectorService.cosineSimilarity(vec1, vec2);
      expect(sim).toBeCloseTo(1.0, 4);
    });

    it('should score semantically close queries higher than unrelated queries', () => {
      const query = 'How do I cancel my subscription and get refund?';
      const closeDoc = 'Cancel account, refund policy and subscription billing details.';
      const distantDoc = 'Docker container deployment and cluster memory limits.';

      const qVec = vectorService.generateEmbedding(query);
      const closeVec = vectorService.generateEmbedding(closeDoc);
      const distantVec = vectorService.generateEmbedding(distantDoc);

      const closeSim = vectorService.cosineSimilarity(qVec, closeVec);
      const distantSim = vectorService.cosineSimilarity(qVec, distantVec);

      expect(closeSim).toBeGreaterThan(distantSim);
    });
  });

  describe('3. Semantic Caching & Tenant Isolation Security (/api-security-testing)', () => {
    const tenantAcme = 'org-acme-111';
    const tenantFinovate = 'org-finovate-222';

    it('should cache and return semantic hit for closely paraphrased queries within same tenant', async () => {
      const originalQuery = 'How to change billing credit card on account?';
      const cachedReply = 'Navigate to Settings -> Invoices & Cards -> Click Update Payment Method.';

      await semanticCacheService.store(tenantAcme, originalQuery, cachedReply, {
        category: 'billing',
        priority: 'normal',
      });

      // Paraphrased query
      const paraphrasedQuery = 'How to change billing credit card on account?';
      const match = await semanticCacheService.findMatch(tenantAcme, paraphrasedQuery, 0.90);

      expect(match.hit).toBe(true);
      expect(match.suggestedReply).toBe(cachedReply);
      expect(match.category).toBe('billing');
    });

    it('STRICT TENANT ISOLATION: Tenant B must NEVER match or access Tenant A cached data', async () => {
      const confidentialQuery = 'Acme confidential payroll billing dispute inquiry';
      const secretReply = 'Acme internal escrow transaction #889922 approved.';

      await semanticCacheService.store(tenantAcme, confidentialQuery, secretReply, {
        category: 'billing',
      });

      // Tenant B queries the exact same prompt
      const crossTenantAttempt = await semanticCacheService.findMatch(
        tenantFinovate,
        confidentialQuery,
        0.80,
      );

      // Must result in Cache Miss (No cross-tenant data leakage)
      expect(crossTenantAttempt.hit).toBe(false);
      expect(crossTenantAttempt.suggestedReply).toBeUndefined();
    });
  });
});
