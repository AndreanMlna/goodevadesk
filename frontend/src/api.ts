import {
  Ticket,
  TicketStatus,
  NlpAnalysisResult,
  AnalyticsSummaryResponse,
  TicketFeedbackPayload,
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

const EMAIL_REGEX = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
const PHONE_REGEX = /(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3,4})[-. ]*(\d{4,6})/g;
const INVOICE_ORDER_REGEX = /(?:#|INV-|ORD-|PO-|ORDER-)[A-Za-z0-9-_]+/gi;
const ERROR_CODE_REGEX = /\b(?:500|502|503|504|400|401|403|404|ECONNREFUSED|ETIMEDOUT|ERR_[A-Z0-9_]+|SQLSTATE_[A-Z0-9_]+)\b/gi;
const MONEY_REGEX = /(?:\$|USD|EUR|Rp|IDR)\s?[\d,.]+/gi;

const BILLING_KEYWORDS: Record<string, number> = {
  billing: 1.5, invoice: 2.0, charge: 1.8, charged: 1.8, refund: 2.0,
  payment: 1.5, subscription: 1.5, 'credit card': 1.8, receipt: 1.2,
  tax: 1.0, pricing: 1.2, cost: 1.0, vat: 1.5,
  order: 1.2, ordered: 1.2, paid: 1.5, pay: 1.2, fee: 1.2,
  bayar: 1.8, pembayaran: 1.8, tagihan: 1.8, transaksi: 1.5, saldo: 1.5,
};

const TECHNICAL_KEYWORDS: Record<string, number> = {
  error: 1.5, bug: 1.8, crash: 2.0, timeout: 1.8, '500': 1.5, '504': 1.5,
  api: 1.5, database: 1.5, postgres: 1.5, 'stack trace': 2.0, broken: 1.5,
  exception: 1.8, gateway: 1.5, latency: 1.2, webhook: 1.5,
  sqlstate: 1.8, failed: 1.2, failure: 1.5, down: 1.5, rusak: 1.5,
  gangguan: 1.5, kendala: 1.2,
};

const URGENT_KEYWORDS = ['urgent', 'asap', 'immediately', 'critical', 'production down', 'blocker', 'severe'];

/**
 * Resilient fallback NLP extraction engine.
 * Matches python-nlp/main.py 1:1 so that the user interface never breaks
 * if external ZeroGPU quota limits or network outages occur.
 */
export function runLocalNlpFallback(
  subject: string,
  message: string,
  customerEmail?: string,
): NlpAnalysisResult {
  const combinedText = `${subject || ''} ${message || ''}`;
  const lowerText = combinedText.toLowerCase();

  // 1. Entities extraction
  const rawEmails = Array.from(new Set(combinedText.match(EMAIL_REGEX) || []));
  const emails = [...rawEmails];
  if (customerEmail && customerEmail.trim() && !emails.includes(customerEmail.trim())) {
    emails.unshift(customerEmail.trim());
  }

  const rawPhones = combinedText.match(PHONE_REGEX) || [];
  const phoneNumbers = Array.from(
    new Set(rawPhones.map((p) => p.replace(/[^0-9+]/g, '')).filter((p) => p.length >= 8)),
  );

  const invoiceOrOrderIds = Array.from(new Set(combinedText.match(INVOICE_ORDER_REGEX) || []));
  const errorCodes = Array.from(new Set(combinedText.match(ERROR_CODE_REGEX) || []));
  const monetaryAmounts = Array.from(new Set(combinedText.match(MONEY_REGEX) || []));

  // 2. Classification
  let billingScore = 0;
  for (const [kw, weight] of Object.entries(BILLING_KEYWORDS)) {
    if (lowerText.includes(kw)) billingScore += weight;
  }

  let technicalScore = 0;
  for (const [kw, weight] of Object.entries(TECHNICAL_KEYWORDS)) {
    if (lowerText.includes(kw)) technicalScore += weight;
  }

  let predictedCategory = 'general';
  let confidence = 0.7;
  if (billingScore > technicalScore && billingScore > 0.5) {
    predictedCategory = 'billing';
    confidence = Math.min(0.95, 0.65 + billingScore * 0.08);
  } else if (technicalScore > billingScore && technicalScore > 0.5) {
    predictedCategory = 'technical';
    confidence = Math.min(0.95, 0.65 + technicalScore * 0.08);
  }

  // 3. Urgency
  const isUrgent = URGENT_KEYWORDS.some((kw) => lowerText.includes(kw)) || errorCodes.length > 0;
  const urgency: 'high' | 'medium' | 'low' = isUrgent
    ? 'high'
    : billingScore > 2 || technicalScore > 2
      ? 'medium'
      : 'low';

  const sentimentHint = billingScore > 0 || technicalScore > 0 ? 'negative' : 'neutral';

  const detectedItems: string[] = [];
  if (emails.length > 0) detectedItems.push(`${emails.length} email(s)`);
  if (invoiceOrOrderIds.length > 0) detectedItems.push(`${invoiceOrOrderIds.length} invoice ID(s)`);
  if (errorCodes.length > 0) detectedItems.push(`${errorCodes.length} error code(s)`);
  if (phoneNumbers.length > 0) detectedItems.push(`${phoneNumbers.length} phone(s)`);
  if (monetaryAmounts.length > 0) detectedItems.push(`${monetaryAmounts.length} amount(s)`);

  const summary =
    detectedItems.length > 0
      ? `Detected: ${detectedItems.join(', ')}.`
      : 'No specialized entities detected.';

  return {
    entities: {
      emails,
      phone_numbers: phoneNumbers,
      invoice_or_order_ids: invoiceOrOrderIds,
      error_codes: errorCodes,
      monetary_amounts: monetaryAmounts,
    },
    predicted_category: predictedCategory,
    confidence: Number(confidence.toFixed(2)),
    urgency,
    sentiment_hint: sentimentHint,
    summary,
  };
}

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
