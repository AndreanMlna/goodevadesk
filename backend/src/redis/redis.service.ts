import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import {
  DEFAULT_REDIS_HOST,
  DEFAULT_REDIS_PORT,
  DEFAULT_REDIS_TTL_SECONDS,
  DEFAULT_MAX_SEMANTIC_POOL_SIZE,
  SEMANTIC_SIMILARITY_THRESHOLD,
  MIN_TOKEN_LENGTH,
  MIN_TOKENS_FOR_SIMILARITY,
  CACHE_KEY_PREFIX,
} from './redis.constants';

export interface CachedClassification {
  category: string;
  suggested_reply: string;
  cached_at: string;
  source: 'redis_cache' | 'redis_semantic_cache' | 'local_semantic_cache';
  similarity_score?: number;
  priority?: string;
  sentiment?: string;
  urgency_score?: number;
  grounding_doc?: string;
}

interface SemanticCacheEntry {
  rawText: string;
  tokens: Set<string>;
  category: string;
  suggested_reply: string;
  priority?: string;
  sentiment?: string;
  urgency_score?: number;
  grounding_doc?: string;
  cached_at: string;
}

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: Redis | null = null;
  private isConnected = false;
  private readonly defaultTtl: number;
  private readonly semanticPool: SemanticCacheEntry[] = [];
  private readonly maxSemanticPoolSize = DEFAULT_MAX_SEMANTIC_POOL_SIZE;

  constructor(private readonly configService: ConfigService) {
    this.defaultTtl = parseInt(
      this.configService.get<string>('REDIS_CACHE_TTL_SECONDS', DEFAULT_REDIS_TTL_SECONDS.toString()),
      10,
    );
  }

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', DEFAULT_REDIS_HOST);
    const port = parseInt(this.configService.get<string>('REDIS_PORT', DEFAULT_REDIS_PORT.toString()), 10);
    const password = this.configService.get<string>('REDIS_PASSWORD') || undefined;

    try {
      this.client = new Redis({
        host,
        port,
        password,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('Redis reconnection limit reached, running in non-cached mode');
            return null;
          }
          return Math.min(times * 200, 1000);
        },
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Connected to Redis at ${host}:${port}`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis error (running in degraded non-cache mode): ${err.message}`);
      });

      await this.client.connect();
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(`Could not connect to Redis initially. Running with in-memory semantic fallback: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
      this.logger.log('Disconnected from Redis');
    }
  }

  /**
   * Generates a normalized SHA-256 fingerprint for exact match ticket queries.
   */
  generateCacheKey(subject: string, message: string): string {
    const normalizedSubject = subject.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedMessage = message.toLowerCase().trim().replace(/\s+/g, ' ');
    const combined = `${normalizedSubject}:::${normalizedMessage}`;

    const hash = crypto.createHash('sha256').update(combined).digest('hex');
    return `${CACHE_KEY_PREFIX}${hash}`;
  }

  /**
   * Tokenizes and normalizes text for semantic similarity comparison.
   */
  private tokenizeText(text: string): Set<string> {
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= MIN_TOKEN_LENGTH);
    return new Set(tokens);
  }

  /**
   * Computes Jaccard Similarity coefficient between two token sets.
   */
  private computeSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0;
    let intersection = 0;
    for (const token of a) {
      if (b.has(token)) {
        intersection++;
      }
    }
    const union = a.size + b.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Looks up cached classification via exact key match or semantic fallback pool.
   */
  async getClassification(subject: string, message: string): Promise<CachedClassification | null> {
    const key = this.generateCacheKey(subject, message);

    if (this.isConnected && this.client) {
      try {
        const data = await this.client.get(key);
        if (data) {
          this.logger.log(`Redis L1 Exact Cache HIT for key: ${key.substring(0, 32)}...`);
          const parsed = JSON.parse(data);
          return {
            ...parsed,
            source: 'redis_cache',
          };
        }
      } catch (err: any) {
        this.logger.warn(`Redis getClassification L1 error: ${err.message}`);
      }
    }

    const queryText = `${subject} ${message}`;
    const queryTokens = this.tokenizeText(queryText);

    if (queryTokens.size >= MIN_TOKENS_FOR_SIMILARITY && this.semanticPool.length > 0) {
      let bestMatch: SemanticCacheEntry | null = null;
      let highestSimilarity = 0;

      for (const entry of this.semanticPool) {
        const sim = this.computeSimilarity(queryTokens, entry.tokens);
        if (sim > highestSimilarity) {
          highestSimilarity = sim;
          bestMatch = entry;
        }
      }

      if (bestMatch && highestSimilarity >= SEMANTIC_SIMILARITY_THRESHOLD) {
        this.logger.log(
          `Semantic Similarity Cache HIT! [Score: ${(highestSimilarity * 100).toFixed(1)}%] matched with: "${bestMatch.rawText.slice(0, 30)}..."`,
        );
        return {
          category: bestMatch.category,
          suggested_reply: bestMatch.suggested_reply,
          priority: bestMatch.priority,
          sentiment: bestMatch.sentiment,
          urgency_score: bestMatch.urgency_score,
          grounding_doc: bestMatch.grounding_doc,
          cached_at: bestMatch.cached_at,
          source: this.isConnected ? 'redis_semantic_cache' : 'local_semantic_cache',
          similarity_score: Math.round(highestSimilarity * 100) / 100,
        };
      }
    }

    this.logger.debug(`Cache MISS for key: ${key.substring(0, 32)}...`);
    return null;
  }

  /**
   * Stores classification results in both the exact cache (Redis) and semantic pool.
   */
  async setClassification(
    subject: string,
    message: string,
    category: string,
    suggestedReply: string,
    extra?: {
      priority?: string;
      sentiment?: string;
      urgency_score?: number;
      grounding_doc?: string;
    },
    ttlSeconds?: number,
  ): Promise<void> {
    const rawText = `${subject} ${message}`;
    const tokens = this.tokenizeText(rawText);
    const cachedAt = new Date().toISOString();

    if (tokens.size >= MIN_TOKENS_FOR_SIMILARITY) {
      if (this.semanticPool.length >= this.maxSemanticPoolSize) {
        this.semanticPool.shift();
      }
      this.semanticPool.push({
        rawText,
        tokens,
        category,
        suggested_reply: suggestedReply,
        priority: extra?.priority,
        sentiment: extra?.sentiment,
        urgency_score: extra?.urgency_score,
        grounding_doc: extra?.grounding_doc,
        cached_at: cachedAt,
      });
    }

    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      const key = this.generateCacheKey(subject, message);
      const payload = JSON.stringify({
        category,
        suggested_reply: suggestedReply,
        priority: extra?.priority,
        sentiment: extra?.sentiment,
        urgency_score: extra?.urgency_score,
        grounding_doc: extra?.grounding_doc,
        cached_at: cachedAt,
      });

      const ttl = ttlSeconds || this.defaultTtl;
      await this.client.set(key, payload, 'EX', ttl);
      this.logger.log(`Saved classification to Redis cache (TTL: ${ttl}s)`);
    } catch (err: any) {
      this.logger.warn(`Redis setClassification error: ${err.message}`);
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }
}
