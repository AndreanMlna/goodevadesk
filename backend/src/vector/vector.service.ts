import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';

export interface VectorSearchResult {
  docId: string;
  title: string;
  category: string;
  excerpt: string;
  denseScore: number;
  sparseScore: number;
  hybridScore: number;
}

@Injectable()
export class VectorService implements OnModuleInit {
  private readonly logger = new Logger(VectorService.name);
  private readonly vectorDim = 256;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly kbService: KnowledgeBaseService,
  ) {}

  async onModuleInit() {
    await this.syncSopVectors();
  }

  /**
   * Generates a deterministic, L2-normalized dense vector embedding (256-dimensional).
   * Maps character and semantic token n-grams into a fixed high-dimensional hypersphere.
   */
  generateEmbedding(text: string): number[] {
    const vector = new Array<number>(this.vectorDim).fill(0);
    if (!text || typeof text !== 'string') return vector;

    const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      // Hash token into dimensions
      let hash = 5381;
      for (let j = 0; j < token.length; j++) {
        hash = (hash * 33) ^ token.charCodeAt(j);
      }

      const dim = Math.abs(hash) % this.vectorDim;
      // Positional and token frequency weight
      const weight = 1.0 + Math.log(1 + 1 / (i + 1));
      vector[dim] += (hash % 2 === 0 ? 1 : -1) * weight;

      // Bi-gram hashing for local semantic context
      if (i < tokens.length - 1) {
        const bigram = `${token}_${tokens[i + 1]}`;
        let biHash = 5381;
        for (let k = 0; k < bigram.length; k++) {
          biHash = (biHash * 33) ^ bigram.charCodeAt(k);
        }
        const biDim = Math.abs(biHash) % this.vectorDim;
        vector[biDim] += (biHash % 2 === 0 ? 0.7 : -0.7);
      }
    }

    // L2 Normalize vector: ||v|| = 1
    let norm = 0;
    for (let i = 0; i < this.vectorDim; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < this.vectorDim; i++) {
        vector[i] = vector[i] / norm;
      }
    }

    return vector;
  }

  /**
   * Computes cosine similarity between two L2-normalized float vectors: sum(A_i * B_i)
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
    }

    // Clip between 0.0 and 1.0 for cosine on normalized positive space
    return Math.max(0, Math.min(1, (dotProduct + 1) / 2));
  }

  /**
   * Synchronizes all SOP operational documents into PostgreSQL knowledge_vectors table
   */
  async syncSopVectors(): Promise<number> {
    try {
      const documents = this.kbService.getAllDocuments();
      if (!documents || documents.length === 0) return 0;

      let syncedCount = 0;
      for (const doc of documents) {
        const embedding = this.generateEmbedding(`${doc.title} ${doc.category} ${doc.content}`);
        const embeddingJson = JSON.stringify(embedding);

        const existing = await (this.prisma as any).knowledgeVector.findFirst({
          where: { doc_id: doc.docId },
        });

        if (existing) {
          await (this.prisma as any).knowledgeVector.update({
            where: { id: existing.id },
            data: {
              title: doc.title,
              category: doc.category,
              content: doc.content,
              embedding: embeddingJson,
            },
          });
        } else {
          await (this.prisma as any).knowledgeVector.create({
            data: {
              doc_id: doc.docId,
              title: doc.title,
              category: doc.category,
              content: doc.content,
              embedding: embeddingJson,
            },
          });
        }
        syncedCount++;
      }

      this.logger.log(`[Vector Service] Synced ${syncedCount} SOP document embeddings into PostgreSQL.`);
      return syncedCount;
    } catch (err: any) {
      this.logger.warn(`[Vector Service] Vector sync warning: ${err.message}`);
      return 0;
    }
  }

  /**
   * Hybrid RAG Retrieval: Combines dense vector cosine similarity with sparse keyword matching.
   */
  async hybridSearch(query: string, limit: number = 3): Promise<VectorSearchResult[]> {
    const queryEmbedding = this.generateEmbedding(query);
    const sparseMatch = this.kbService.retrieveRelevantSop('Search', query);

    let vectors: any[] = [];
    try {
      vectors = await (this.prisma as any).knowledgeVector.findMany();
    } catch (err) {
      this.logger.warn('[Vector Service] Falling back to in-memory SOP list for vector search.');
      vectors = this.kbService.getAllDocuments().map((d) => ({
        doc_id: d.docId,
        title: d.title,
        category: d.category,
        content: d.content,
        embedding: JSON.stringify(this.generateEmbedding(`${d.title} ${d.category} ${d.content}`)),
      }));
    }

    const scoredResults: VectorSearchResult[] = vectors.map((v) => {
      let denseScore = 0;
      try {
        const storedEmbedding = typeof v.embedding === 'string' ? JSON.parse(v.embedding) : [];
        denseScore = this.cosineSimilarity(queryEmbedding, storedEmbedding);
      } catch {
        denseScore = 0.5;
      }

      const isSparseMatch = v.doc_id === sparseMatch.docId;
      const sparseScore = isSparseMatch ? (sparseMatch.relevanceScore || 1.0) : 0.2;

      // Hybrid combination formula (60% vector semantic + 40% sparse keyword)
      const hybridScore = 0.6 * denseScore + 0.4 * sparseScore;

      return {
        docId: v.doc_id,
        title: v.title,
        category: v.category,
        excerpt: v.content.slice(0, 300) + '...',
        denseScore: Math.round(denseScore * 1000) / 1000,
        sparseScore: Math.round(sparseScore * 1000) / 1000,
        hybridScore: Math.round(hybridScore * 1000) / 1000,
      };
    });

    // Sort descending by hybrid score
    scoredResults.sort((a, b) => b.hybridScore - a.hybridScore);

    return scoredResults.slice(0, limit);
  }
}
