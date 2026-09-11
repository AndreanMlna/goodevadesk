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

/**
 * Calls the real Python NLP Microservice on Hugging Face (or local) for NER & category extraction.
 */
export async function analyzeWithPythonNlp(
  subject: string,
  message: string,
  customerEmail?: string,
): Promise<NlpAnalysisResult | null> {
  try {
    const res = await fetch(`${NLP_BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        message,
        customer_email: customerEmail,
      }),
    });

    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;

    return await res.json();
  } catch {
    return null; // Graceful non-blocking degradation if NLP service is unreachable
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
