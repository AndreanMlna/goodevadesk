import { Injectable, Logger } from '@nestjs/common';
import { VectorService } from '../vector/vector.service';

export interface SemanticCacheHit {
  hit: boolean;
  similarity?: number;
  suggestedReply?: string;
  category?: string;
  priority?: string;
  source?: 'semantic_cache';
}

interface CachedSemanticItem {
  orgId: string;
  query: string;
  vector: number[];
  reply: string;
  category?: string;
  priority?: string;
  timestamp: number;
}

@Injectable()
export class SemanticCacheService {
  private readonly logger = new Logger(SemanticCacheService.name);
  private readonly cachePool: CachedSemanticItem[] = [];
  private readonly maxPoolSize = 500;
  private readonly ttlMs = 3600 * 1000; // 1 Hour

  constructor(private readonly vectorService: VectorService) {}

  /**
   * Evaluates query against cached vectors strictly isolated by organization_id (Tenant Isolation).
   */
  async findMatch(
    orgId: string,
    query: string,
    similarityThreshold: number = 0.90,
  ): Promise<SemanticCacheHit> {
    if (!orgId || !query) return { hit: false };

    const now = Date.now();
    const queryVector = this.vectorService.generateEmbedding(query);

    // Filter by tenant and TTL
    const tenantEntries = this.cachePool.filter(
      (item) => item.orgId === orgId && now - item.timestamp < this.ttlMs,
    );

    let bestMatch: CachedSemanticItem | null = null;
    let highestSim = 0;

    for (const item of tenantEntries) {
      const sim = this.vectorService.cosineSimilarity(queryVector, item.vector);
      if (sim > highestSim) {
        highestSim = sim;
        bestMatch = item;
      }
    }

    if (bestMatch && highestSim >= similarityThreshold) {
      this.logger.log(
        `[Semantic Cache HIT] org=${orgId} score=${highestSim.toFixed(3)} query="${query.slice(0, 40)}..."`,
      );
      return {
        hit: true,
        similarity: Math.round(highestSim * 1000) / 1000,
        suggestedReply: bestMatch.reply,
        category: bestMatch.category,
        priority: bestMatch.priority,
        source: 'semantic_cache',
      };
    }

    return { hit: false };
  }

  /**
   * Stores a newly drafted response into the semantic cache.
   */
  async store(
    orgId: string,
    query: string,
    reply: string,
    meta?: { category?: string; priority?: string },
  ): Promise<void> {
    if (!orgId || !query || !reply) return;

    const vector = this.vectorService.generateEmbedding(query);

    // Evict oldest if pool is full
    if (this.cachePool.length >= this.maxPoolSize) {
      this.cachePool.shift();
    }

    this.cachePool.push({
      orgId,
      query,
      vector,
      reply,
      category: meta?.category,
      priority: meta?.priority,
      timestamp: Date.now(),
    });
  }
}
