import {
  Ticket,
  TicketStatus,
  NlpAnalysisResult,
  AnalyticsSummaryResponse,
  TicketFeedbackPayload,
  TicketMessage,
  AuditLogItem,
} from './types';

// Real Backend REST API and NLP Microservice Base URLs
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
const NLP_BASE_URL = (import.meta as any).env?.VITE_NLP_URL || 'http://localhost:8000';

/**
 * Helper to validate and parse JSON responses from the backend.
 * Throws clean, descriptive errors if the backend responds with HTML error pages or non-OK status.
 */
async function handleResponse<T>(res: Response, defaultErrorMessage: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const errorJson = await res.json().catch(() => ({ message: defaultErrorMessage }));
      throw new Error(errorJson.message || `HTTP ${res.status}: ${res.statusText}`);
    } else {
      const text = await res.text().catch(() => '');
      if (text.includes('<!doctype') || text.includes('<html')) {
        throw new Error(
          `Backend API endpoint unreachable (${res.status}). Server returned HTML instead of API JSON. Please verify VITE_API_URL.`,
        );
      }
      throw new Error(`HTTP ${res.status}: ${res.statusText || defaultErrorMessage}`);
    }
  }

  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    if (text.includes('<!doctype') || text.includes('<html')) {
      throw new Error(
        'Server returned HTML webpage instead of JSON. Ensure VITE_API_URL points to the backend API, not frontend or Gradio UI.',
      );
    }
  }

  const json = await res.json();
  return (json.data !== undefined ? json.data : json) as T;
}

/**
 * Fetches real tickets from the PostgreSQL database filtered by organization tenant API key.
 */
export async function fetchTickets(
  apiKey: string,
  params?: { status?: TicketStatus; category?: string; search?: string },
): Promise<Ticket[]> {
  const url = new URL(`${API_BASE_URL}/tickets`);
  if (params?.status) url.searchParams.append('status', params.status);
  if (params?.category) url.searchParams.append('category', params.category);
  if (params?.search) url.searchParams.append('search', params.search);

  const res = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  });

  return handleResponse<Ticket[]>(res, 'Failed to fetch tickets from database');
}

/**
 * Fetches a single real ticket by ID from the database with multi-tenant isolation.
 */
export async function fetchTicketById(apiKey: string, id: string): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/tickets/${id}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  });

  return handleResponse<Ticket>(res, `Failed to fetch ticket ${id}`);
}

/**
 * Creates a real ticket in the database.
 * Triggers LLM classification, suggested reply with RAG grounding, and Redis cache persistence.
 */
export async function createTicket(
  apiKey: string,
  data: { customer_email: string; subject: string; message: string },
): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(data),
  });

  return handleResponse<Ticket>(res, 'Failed to create ticket');
}

/**
 * Updates a ticket's status in PostgreSQL (open -> in_progress -> closed) with optimistic locking.
 */
export async function updateTicketStatus(
  apiKey: string,
  id: string,
  status: TicketStatus,
): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/tickets/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ status }),
  });

  return handleResponse<Ticket>(res, `Failed to update status for ticket ${id}`);
}

export { runLocalNlpFallback } from './lib/nlpFallback';
import { runLocalNlpFallback } from './lib/nlpFallback';


/**
 * Calls the real Python NLP Microservice on Hugging Face (Gradio 5 API) or local FastAPI for NER & category extraction.
 * If Hugging Face is sleeping, rate-limited, or ZeroGPU quota is exceeded, seamlessly falls back to the client-side
 * rule engine so the user experience is never interrupted.
 */
export async function analyzeWithPythonNlp(
  subject: string,
  message: string,
  customerEmail?: string,
): Promise<NlpAnalysisResult | null> {
  try {
    // 1. If pointing to Hugging Face Space (Gradio 5 engine)
    if (NLP_BASE_URL.includes('hf.space') || NLP_BASE_URL.includes('gradio')) {
      const callRes = await fetch(`${NLP_BASE_URL}/gradio_api/call/gradio_fn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [subject, message, customerEmail || ''],
        }),
      });

      if (callRes.ok) {
        const callJson = await callRes.json();
        if (callJson?.event_id) {
          const eventRes = await fetch(`${NLP_BASE_URL}/gradio_api/call/gradio_fn/${callJson.event_id}`);
          if (eventRes.ok) {
            const text = await eventRes.text();
            const match = text.match(/data:\s*(\[[\s\S]*?\])\s*(\n|$)/);
            if (match) {
              const raw = JSON.parse(match[1]);
              return {
                predicted_category: typeof raw[0] === 'object' && raw[0]?.label ? raw[0].label : String(raw[0] || 'general'),
                confidence: typeof raw[1] === 'string' ? (parseFloat(raw[1]) / 100 || 0.95) : (Number(raw[1]) || 0.95),
                urgency: (raw[2] as any) || 'medium',
                sentiment_hint: (raw[3] as any) || 'neutral',
                summary: String(raw[4] || ''),
                entities: (raw[5] as any) || {
                  emails: [],
                  phone_numbers: [],
                  invoice_or_order_ids: [],
                  error_codes: [],
                  monetary_amounts: [],
                },
              };
            }
          }
        }
      }

      // If Hugging Face failed (e.g. ZeroGPU quota limit or cold start), fall back gracefully
      console.warn('[NLP Microservice] Hugging Face Space unavailable or quota reached. Engaging resilient fallback.');
      return runLocalNlpFallback(subject, message, customerEmail);
    }

    // 2. Standard Local FastAPI (/analyze)
    const res = await fetch(`${NLP_BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        message,
        customer_email: customerEmail,
      }),
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await res.json();
      }
    }

    return runLocalNlpFallback(subject, message, customerEmail);
  } catch (err) {
    console.warn('[NLP Microservice] Network error reaching NLP service. Using resilient fallback.', err);
    return runLocalNlpFallback(subject, message, customerEmail);
  }
}

/**
 * Fetches real-time tenant operational analytics computed directly from the PostgreSQL database.
 */
export async function fetchAnalyticsSummary(apiKey: string): Promise<AnalyticsSummaryResponse> {
  const res = await fetch(`${API_BASE_URL}/analytics/summary`, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  });

  return handleResponse<AnalyticsSummaryResponse>(res, 'Failed to fetch analytics summary');
}

/**
 * Approves an AI-suggested draft reply and closes the ticket in the database.
 */
export async function approveTicketReply(
  apiKey: string,
  ticketId: string,
  customMessage?: string,
): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}/approve-reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ custom_message: customMessage }),
  });

  return handleResponse<Ticket>(res, `Failed to approve reply for ticket ${ticketId}`);
}

/**
 * Submits agent feedback (thumbs up/down, notes) for continuous LLM RLHF learning.
 */
export async function submitTicketFeedback(
  apiKey: string,
  ticketId: string,
  payload: TicketFeedbackPayload,
): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<any>(res, `Failed to submit feedback for ticket ${ticketId}`);
}

/**
 * Enterprise: Appends a multi-turn conversation message or internal staff whisper note.
 */
export async function addTicketMessage(
  apiKey: string,
  ticketId: string,
  payload: {
    content: string;
    sender_type: 'customer' | 'agent' | 'internal_note';
    sender_name?: string;
    sender_email?: string;
  },
): Promise<TicketMessage> {
  const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<TicketMessage>(res, `Failed to post message for ticket ${ticketId}`);
}

/**
 * Enterprise: Assigns or routes a ticket to a support specialist or team tier.
 */
export async function assignTicket(
  apiKey: string,
  ticketId: string,
  assigned_to: string,
): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}/assign`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ assigned_to }),
  });

  return handleResponse<Ticket>(res, `Failed to assign ticket ${ticketId}`);
}

/**
 * Enterprise: Fetches immutable SOC-2 audit logs for a ticket.
 */
export async function fetchAuditLogs(
  apiKey: string,
  ticketId: string,
): Promise<AuditLogItem[]> {
  const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}/audit-logs`, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  });

  return handleResponse<AuditLogItem[]>(res, `Failed to fetch audit logs for ticket ${ticketId}`);
}

/**
 * Enterprise Fase 2: Reports agent presence to detect real-time editing collisions.
 */
export async function recordTicketPresence(
  apiKey: string,
  ticketId: string,
  agentName: string,
): Promise<{ collision_detected: boolean; active_agents: string[] }> {
  const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}/presence`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ agent_name: agentName }),
  });

  return handleResponse<{ collision_detected: boolean; active_agents: string[] }>(
    res,
    'Failed to record agent presence',
  );
}

/**
 * Enterprise Fase 2: Fetches active webhook configuration for tenant.
 */
export async function fetchWebhookConfig(apiKey: string): Promise<{ url: string; platform: string; enabled: boolean }> {
  const res = await fetch(`${API_BASE_URL}/webhooks/config`, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  });

  return handleResponse<{ url: string; platform: string; enabled: boolean }>(res, 'Failed to fetch webhook config');
}

/**
 * Enterprise Fase 2: Updates webhook destination (Slack / Discord).
 */
export async function updateWebhookConfig(
  apiKey: string,
  config: { url: string; platform: string; enabled: boolean; events?: string[] },
): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/webhooks/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(config),
  });

  return handleResponse<any>(res, 'Failed to update webhook config');
}

/**
 * Enterprise Fase 2: Tests outbound webhook connectivity.
 */
export async function testWebhookPing(
  apiKey: string,
  payload: { url: string; platform: string },
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/webhooks/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<{ success: boolean; message: string }>(res, 'Failed to test webhook');
}

/**
 * Enterprise Fase 2: Fetches active SOP documents for RAG grounding.
 */
export async function fetchSopDocuments(apiKey: string): Promise<any[]> {
  const res = await fetch(`${API_BASE_URL}/knowledge-base`, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  });

  return handleResponse<any[]>(res, 'Failed to fetch SOP documents');
}

/**
 * Enterprise Fase 2: Ingests a new SOP standard operating procedure document.
 */
export async function ingestSopDocument(
  apiKey: string,
  doc: { title: string; category: string; content: string },
): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/knowledge-base`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(doc),
  });

  return handleResponse<any>(res, 'Failed to ingest SOP document');
}

/**
 * Enterprise Fase 2: Triggers immediate SLA auto-escalation evaluation.
 */
export async function triggerSlaEscalationCheck(apiKey: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/escalation/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  });

  return handleResponse<any>(res, 'Failed to trigger SLA check');
}

/**
 * Enterprise Fase 3: Streams AI Copilot suggested reply in real-time via Server-Sent Events (SSE).
 * Features pre-LLM PII masking, sub-15ms semantic caching, and Vector RAG grounding.
 */
export async function streamTicketAiReply(
  apiKey: string,
  ticketId: string,
  callbacks: {
    onToken: (token: string) => void;
    onDone: (data: { fullText: string; ragDoc?: string; cached?: boolean; piiMasked?: boolean }) => void;
    onError: (err: any) => void;
  },
): Promise<() => void> {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/ai-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE stream failed: HTTP ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by browser environment.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr) continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                callbacks.onError(new Error(parsed.error));
                return;
              }
              if (parsed.token) {
                callbacks.onToken(parsed.token);
              }
              if (parsed.done) {
                callbacks.onDone({
                  fullText: parsed.fullText || '',
                  ragDoc: parsed.ragDoc,
                  cached: parsed.cached,
                  piiMasked: parsed.piiMasked,
                });
                return;
              }
            } catch {
              // Ignore non-JSON ping or partial chunk
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        callbacks.onError(err);
      }
    }
  })();

  return () => {
    controller.abort();
  };
}

/**
 * Enterprise Fase 3: Performs Vector RAG Hybrid Semantic Search against PostgreSQL knowledge vectors.
 */
export async function fetchVectorSearchResults(apiKey: string, query: string, limit: number = 3): Promise<any[]> {
  const url = new URL(`${API_BASE_URL}/knowledge-base/vector-search`);
  url.searchParams.append('query', query);
  url.searchParams.append('limit', String(limit));

  const res = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  });

  return handleResponse<any[]>(res, 'Failed to perform vector semantic search');
}

/**
 * Enterprise Fase 3: Fetches Google BigQuery AI/ML production query blueprint.
 */
export async function fetchBigQueryBlueprint(apiKey: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/analytics/bigquery-ml/blueprint`, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  });

  return handleResponse<any>(res, 'Failed to fetch BigQuery ML blueprint');
}


