import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface RetrievedSop {
  docId: string;
  category: 'billing' | 'technical' | 'general';
  title: string;
  excerpt: string;
  relevanceScore: number;
}

export interface SopDocument {
  docId: string;
  category: 'billing' | 'technical' | 'general';
  title: string;
  content: string;
  keywords: string[];
}

@Injectable()
export class KnowledgeBaseService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  private documents: SopDocument[] = [];

  onModuleInit() {
    this.loadDocuments();
  }

  private loadDocuments() {
    const docsDir = path.join(__dirname, 'documents');
    
    // Fallback search locations in case of build/nest dist directory structures
    const possiblePaths = [
      docsDir,
      path.join(process.cwd(), 'src', 'knowledge-base', 'documents'),
      path.join(process.cwd(), 'dist', 'src', 'knowledge-base', 'documents'),
      path.join(process.cwd(), 'backend', 'src', 'knowledge-base', 'documents'),
    ];

    let foundDir = possiblePaths.find((p) => fs.existsSync(p));

    if (!foundDir) {
      this.logger.warn('Documents directory not found on disk, initializing with embedded memory fallback.');
      this.initEmbeddedDocuments();
      return;
    }

    try {
      const files = [
        { file: 'billing_sop.md', category: 'billing' as const, docId: 'SOP-BIL-2026', title: 'Billing & Refund Policy' },
        { file: 'technical_sop.md', category: 'technical' as const, docId: 'SOP-ENG-2026', title: 'Technical Incidents & Escalations' },
        { file: 'general_sop.md', category: 'general' as const, docId: 'SOP-GEN-2026', title: 'Enterprise SLA & Account Governance' },
      ];

      this.documents = files.map((meta) => {
        const filePath = path.join(foundDir!, meta.file);
        let content = '';
        if (fs.existsSync(filePath)) {
          content = fs.readFileSync(filePath, 'utf-8');
        } else {
          content = this.getDefaultContent(meta.category);
        }

        return {
          docId: meta.docId,
          category: meta.category,
          title: meta.title,
          content,
          keywords: this.extractKeywords(content),
        };
      });

      this.logger.log(`📚 Loaded ${this.documents.length} official SOP Knowledge Base documents for RAG grounding.`);
    } catch (err: any) {
      this.logger.error(`Failed loading SOP documents: ${err.message}`, err.stack);
      this.initEmbeddedDocuments();
    }
  }

  private initEmbeddedDocuments() {
    this.documents = [
      {
        docId: 'SOP-BIL-2026',
        category: 'billing',
        title: 'Billing & Refund Policy',
        content: this.getDefaultContent('billing'),
        keywords: ['refund', 'invoice', 'charge', 'payment', 'billing', 'duplicate', 'subscription', 'prorata'],
      },
      {
        docId: 'SOP-ENG-2026',
        category: 'technical',
        title: 'Technical Incidents & Escalations',
        content: this.getDefaultContent('technical'),
        keywords: ['500', '504', 'timeout', 'webhook', 'rate', 'limit', 'api', 'gateway', 'database', 'error'],
      },
      {
        docId: 'SOP-GEN-2026',
        category: 'general',
        title: 'Enterprise SLA & Account Governance',
        content: this.getDefaultContent('general'),
        keywords: ['sla', 'uptime', 'contract', 'saml', 'sso', 'enterprise', 'isolation', 'dedicated', 'account'],
      },
    ];
  }

  private getDefaultContent(category: 'billing' | 'technical' | 'general'): string {
    switch (category) {
      case 'billing':
        return `GoodevaDesk SOP-BIL-2026: Duplicate charges are 100% refunded within 3-5 business days upon verifying invoice ID. Annual plans can receive prorated refund within 14 days of renewal. Supported currencies: USD, EUR, IDR.`;
      case 'technical':
        return `GoodevaDesk SOP-ENG-2026: P1 incidents (500/502/503/504 gateway timeouts) require CRITICAL urgency with 1-hour response SLA and on-call platform engineer escalation. Webhooks retry with exponential backoff (1s to 10m). Rate limits are 1,000 req/min for Standard and 10,000 req/min for Enterprise.`;
      case 'general':
        return `GoodevaDesk SOP-GEN-2026: Enterprise tier guarantees 99.99% uptime and 24/7 dedicated Slack/Teams support. SAML 2.0 SSO is configured in Organization Settings. Multi-tenant cryptographic data isolation is strictly enforced.`;
    }
  }

  private extractKeywords(text: string): string[] {
    return Array.from(
      new Set(
        text
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 3),
      ),
    );
  }

  /**
   * RAG Retrieval: Finds the most authoritative SOP document matching user ticket context.
   */
  retrieveRelevantSop(subject: string, message: string, categoryHint?: string): RetrievedSop {
    const queryTokens = `${subject} ${message} ${categoryHint || ''}`
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    let bestDoc = this.documents[0];
    let maxScore = -1;

    for (const doc of this.documents) {
      let score = 0;
      if (categoryHint && doc.category === categoryHint.toLowerCase()) {
        score += 5.0; // Strong prior if category is hinted
      }

      for (const token of queryTokens) {
        if (doc.keywords.includes(token)) {
          score += 1.0;
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestDoc = doc;
      }
    }

    // Extract first 300 chars of SOP content as authoritative policy excerpt
    const excerpt = bestDoc.content.replace(/#+/g, '').replace(/\n+/g, ' ').trim().slice(0, 280) + '...';

    return {
      docId: bestDoc.docId,
      category: bestDoc.category,
      title: bestDoc.title,
      excerpt,
      relevanceScore: Math.max(maxScore, 1.0),
    };
  }

  getAllDocuments() {
    return this.documents.map((d) => ({
      docId: d.docId,
      category: d.category,
      title: d.title,
      summary: d.content.slice(0, 200) + '...',
      content: d.content,
      keywords: d.keywords,
    }));
  }

  /**
   * Enterprise: Dynamically ingests a new SOP standard operating procedure document.
   * Extracts keywords automatically and indexes the policy for immediate RAG grounding.
   */
  addDocument(doc: {
    title: string;
    category: 'billing' | 'technical' | 'general';
    content: string;
    docId?: string;
  }): SopDocument {
    const docId = doc.docId || `SOP-CUSTOM-${Date.now().toString().slice(-4)}`;
    const newDoc: SopDocument = {
      docId,
      category: doc.category,
      title: doc.title,
      content: doc.content,
      keywords: this.extractKeywords(doc.content + ' ' + doc.title),
    };

    // Prepend to documents so freshly ingested SOPs take priority
    this.documents.unshift(newDoc);
    this.logger.log(
      `Ingested new SOP document [${docId}]: "${doc.title}" (${newDoc.keywords.length} keywords indexed)`,
    );
    return newDoc;
  }
}

