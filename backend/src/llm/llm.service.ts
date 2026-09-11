import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import {
  DEFAULT_LLM_TIMEOUT_MS,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_LLM_MAX_TOKENS,
  DEFAULT_LLM_TEMPERATURE,
  BILLING_KEYWORDS,
  TECHNICAL_KEYWORDS,
  FRUSTRATED_KEYWORDS,
  POSITIVE_KEYWORDS,
} from './llm.constants';

export interface LlmClassificationResult {
  category: 'billing' | 'technical' | 'general';
  suggested_reply: string;
  provider: string;
  model: string;
  priority?: 'critical' | 'high' | 'normal' | 'low';
  sentiment?: string;
  urgency_score?: number;
  grounding_doc?: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly provider: string;
  private readonly timeoutMs = DEFAULT_LLM_TIMEOUT_MS;

  constructor(
    private readonly configService: ConfigService,
    private readonly kbService: KnowledgeBaseService,
  ) {
    this.provider = this.configService.get<string>('LLM_PROVIDER', 'mock').toLowerCase();
  }

  getSystemPrompt(sopContext?: string): string {
    return `You are GoodevaDesk's Enterprise Customer Support AI Assistant.
Your task is to analyze an incoming customer support ticket and produce structured JSON output:
1. "category": Strictly one of ["billing", "technical", "general"].
   - "billing": invoices, charges, refunds, subscription plans, pricing, payment failures.
   - "technical": bugs, error codes, timeouts, API failures, integration issues, broken features.
   - "general": product questions, sales inquiries, feedback, SLAs, account assistance, miscellaneous.
2. "suggested_reply": A professional, empathetic, and concise reply (2-4 sentences) that directly references official GoodevaDesk SOP guidelines.
3. "priority": Strictly one of ["critical", "high", "normal", "low"].
   - "critical": Complete service outage, data loss, 500/504 gateway timeout in production, critical security report.
   - "high": Impaired major features, duplicate billing complaints, rate limiting on business pipeline.
   - "normal": Standard billing questions, general inquiries, minor bug.
   - "low": Feature suggestions, non-urgent feedback.
4. "sentiment": One of ["positive", "neutral", "frustrated", "angry"].
5. "urgency_score": A float between 0.0 and 1.0 indicating urgency level.

OFFICIAL GOODEVA DESK SOP GUIDELINES (GROUNDING KNOWLEDGE BASE):
${sopContext || 'Adhere to standard enterprise customer support best practices.'}

You MUST reply ONLY with a valid, raw JSON object matching this schema:
{
  "category": "billing" | "technical" | "general",
  "suggested_reply": "string",
  "priority": "critical" | "high" | "normal" | "low",
  "sentiment": "positive" | "neutral" | "frustrated" | "angry",
  "urgency_score": number
}`;
  }

  getUserPrompt(subject: string, message: string): string {
    return `TICKET SUBJECT:
${subject}

TICKET MESSAGE:
${message}`;
  }

  /**
   * Classifies ticket and drafts response using either live LLM providers or grounded rule engine fallback.
   */
  async classifyAndDraft(
    subject: string,
    message: string,
  ): Promise<LlmClassificationResult | null> {
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');

    const sop = this.kbService.retrieveRelevantSop(subject, message);
    const sopContext = `OFFICIAL POLICY (${sop.docId} - ${sop.title}):\n${sop.excerpt}`;

    try {
      if (this.provider === 'openai' && openaiKey) {
        return await this.callOpenAi(subject, message, openaiKey, sop.docId, sopContext);
      } else if (this.provider === 'anthropic' && anthropicKey) {
        return await this.callAnthropic(subject, message, anthropicKey, sop.docId, sopContext);
      } else if (this.provider === 'gemini' && geminiKey) {
        return await this.callGemini(subject, message, geminiKey, sop.docId, sopContext);
      }
    } catch (error: any) {
      this.logger.warn(`External LLM call failed: ${error.message}. Falling back gracefully.`);
    }

    return this.mockClassification(subject, message);
  }

  private async callOpenAi(
    subject: string,
    message: string,
    apiKey: string,
    sopDocId: string,
    sopContext: string,
  ): Promise<LlmClassificationResult> {
    const model = this.configService.get<string>('OPENAI_MODEL', DEFAULT_OPENAI_MODEL);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      this.logger.log(`Invoking OpenAI model [${model}] for ticket classification (RAG: ${sopDocId})...`);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: this.getSystemPrompt(sopContext) },
            { role: 'user', content: this.getUserPrompt(subject, message) },
          ],
          response_format: { type: 'json_object' },
          temperature: DEFAULT_LLM_TEMPERATURE,
          max_tokens: DEFAULT_LLM_MAX_TOKENS,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenAI HTTP ${response.status}: ${await response.text()}`);
      }

      const data: any = await response.json();
      const content = data.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content);

      return {
        category: this.sanitizeCategory(parsed.category),
        suggested_reply: parsed.suggested_reply || 'Thank you for reaching out. We are reviewing your ticket.',
        priority: this.sanitizePriority(parsed.priority),
        sentiment: parsed.sentiment || 'neutral',
        urgency_score: typeof parsed.urgency_score === 'number' ? parsed.urgency_score : 0.5,
        grounding_doc: sopDocId,
        provider: 'openai',
        model,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async callAnthropic(
    subject: string,
    message: string,
    apiKey: string,
    sopDocId: string,
    sopContext: string,
  ): Promise<LlmClassificationResult> {
    const model = this.configService.get<string>('ANTHROPIC_MODEL', DEFAULT_ANTHROPIC_MODEL);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      this.logger.log(`Invoking Anthropic model [${model}] for ticket classification (RAG: ${sopDocId})...`);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: DEFAULT_LLM_MAX_TOKENS,
          system: this.getSystemPrompt(sopContext),
          messages: [
            {
              role: 'user',
              content: this.getUserPrompt(subject, message),
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Anthropic HTTP ${response.status}: ${await response.text()}`);
      }

      const data: any = await response.json();
      const rawText = data.content?.[0]?.text;
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);

      return {
        category: this.sanitizeCategory(parsed.category),
        suggested_reply: parsed.suggested_reply || 'Thank you for contacting GoodevaDesk.',
        priority: this.sanitizePriority(parsed.priority),
        sentiment: parsed.sentiment || 'neutral',
        urgency_score: typeof parsed.urgency_score === 'number' ? parsed.urgency_score : 0.5,
        grounding_doc: sopDocId,
        provider: 'anthropic',
        model,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async callGemini(
    subject: string,
    message: string,
    apiKey: string,
    sopDocId: string,
    sopContext: string,
  ): Promise<LlmClassificationResult> {
    const model = this.configService.get<string>('GEMINI_MODEL', DEFAULT_GEMINI_MODEL);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      this.logger.log(`Invoking Gemini model [${model}] for ticket classification (RAG: ${sopDocId})...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: this.getSystemPrompt(sopContext) },
                { text: this.getUserPrompt(subject, message) },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: DEFAULT_LLM_TEMPERATURE,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Gemini HTTP ${response.status}: ${await response.text()}`);
      }

      const data: any = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(rawText);

      return {
        category: this.sanitizeCategory(parsed.category),
        suggested_reply: parsed.suggested_reply || 'Thank you for reaching out to GoodevaDesk.',
        priority: this.sanitizePriority(parsed.priority),
        sentiment: parsed.sentiment || 'neutral',
        urgency_score: typeof parsed.urgency_score === 'number' ? parsed.urgency_score : 0.5,
        grounding_doc: sopDocId,
        provider: 'gemini',
        model,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private mockClassification(subject: string, message: string): LlmClassificationResult {
    const text = `${subject} ${message}`.toLowerCase();
    const sop = this.kbService.retrieveRelevantSop(subject, message);

    let category: 'billing' | 'technical' | 'general' = 'general';
    let priority: 'critical' | 'high' | 'normal' | 'low' = 'normal';
    let sentiment: string = 'neutral';
    let urgencyScore = 0.5;

    if (FRUSTRATED_KEYWORDS.some((kw) => text.includes(kw))) {
      sentiment = 'frustrated';
    } else if (POSITIVE_KEYWORDS.some((kw) => text.includes(kw))) {
      sentiment = 'positive';
    }

    let suggestedReply = `Hello, thank you for reaching out to GoodevaDesk Support. In accordance with ${sop.docId} (${sop.title}), our customer support team is reviewing your inquiry.`;

    if (BILLING_KEYWORDS.some((k) => text.includes(k))) {
      category = 'billing';
      if (text.includes('duplicate') || text.includes('twice') || text.includes('dobel') || text.includes('refund')) {
        priority = 'high';
        urgencyScore = 0.8;
        suggestedReply = `Hi, thank you for contacting GoodevaDesk Billing Support. Pursuant to GoodevaDesk SOP-BIL-2026 Section 1, we have flagged your duplicate billing claim for verification. A 100% refund will be disbursed back to your original payment method within 3-5 business days.`;
      } else {
        priority = 'normal';
        urgencyScore = 0.5;
        suggestedReply = `Hi, thank you for contacting GoodevaDesk Billing Support. We have received your billing inquiry and are reviewing your invoice records according to SOP-BIL-2026 guidelines.`;
      }
    } else if (TECHNICAL_KEYWORDS.some((k) => text.includes(k))) {
      category = 'technical';
      if (text.includes('500') || text.includes('504') || text.includes('crash') || text.includes('down') || text.includes('timeout')) {
        priority = 'critical';
        urgencyScore = 0.95;
        suggestedReply = `Hello, thank you for reporting this technical incident. In compliance with GoodevaDesk SOP-ENG-2026 (P1 Escalation), this ticket has been prioritized for our on-call platform engineering team with a 1-hour response SLA target.`;
      } else {
        priority = 'high';
        urgencyScore = 0.7;
        suggestedReply = `Hello, thank you for reporting this technical issue. Our engineering team has been notified and is analyzing system diagnostics in accordance with SOP-ENG-2026.`;
      }
    } else {
      category = 'general';
      if (text.includes('sla') || text.includes('contract') || text.includes('enterprise')) {
        priority = 'high';
        urgencyScore = 0.75;
        suggestedReply = `Hello, thank you for your inquiry regarding GoodevaDesk Enterprise SLAs. Pursuant to SOP-GEN-2026, our dedicated customer success team guarantees a 99.99% uptime commitment and will follow up with dedicated terms within 24 business hours.`;
      } else {
        priority = 'normal';
        urgencyScore = 0.3;
      }
    }

    this.logger.log(`Grounded RAG Rule-Engine classification: [${category}] Priority: [${priority}] Grounding: [${sop.docId}]`);

    return {
      category,
      suggested_reply: suggestedReply,
      priority,
      sentiment,
      urgency_score: urgencyScore,
      grounding_doc: sop.docId,
      provider: 'mock-engine',
      model: 'deterministic-rules-v1',
    };
  }

  private sanitizeCategory(val: any): 'billing' | 'technical' | 'general' {
    const norm = String(val || '').toLowerCase().trim();
    if (norm === 'billing' || norm === 'technical' || norm === 'general') {
      return norm;
    }
    return 'general';
  }

  private sanitizePriority(val: any): 'critical' | 'high' | 'normal' | 'low' {
    const norm = String(val || '').toLowerCase().trim();
    if (norm === 'critical' || norm === 'high' || norm === 'normal' || norm === 'low') {
      return norm;
    }
    return 'normal';
  }
}
