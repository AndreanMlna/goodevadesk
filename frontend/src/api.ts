import {
  Ticket,
  TicketStatus,
  NlpAnalysisResult,
  AnalyticsSummaryResponse,
  TicketFeedbackPayload,
} from './types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
const NLP_BASE_URL = (import.meta as any).env?.VITE_NLP_URL || 'http://localhost:8000';

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

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: 'Failed to fetch tickets' }));
    throw new Error(errorData.message || `HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.data || [];
}

export async function fetchTicketById(apiKey: string, id: string): Promise<Ticket> {
  const res = await fetch(`${API_BASE_URL}/tickets/${id}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  });

  if (!res.ok) {
    throw new Error('Ticket not found or unauthorized');
  }

  return res.json();
}

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

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Creation failed' }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

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

  if (!res.ok) {
    throw new Error('Failed to update ticket status');
  }

  return res.json();
}

let isNlpServiceAvailable: boolean | null = null;
let lastNlpCheckTime = 0;
const NLP_CHECK_COOLDOWN_MS = 15000;

export async function analyzeWithPythonNlp(
  subject: string,
  message: string,
): Promise<NlpAnalysisResult | null> {
  const now = Date.now();
  if (isNlpServiceAvailable === false && now - lastNlpCheckTime < NLP_CHECK_COOLDOWN_MS) {
    return null;
  }

  try {
    const res = await fetch(`${NLP_BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, message }),
    });
    if (!res.ok) {
      isNlpServiceAvailable = false;
      lastNlpCheckTime = now;
      return null;
    }
    isNlpServiceAvailable = true;
    return await res.json();
  } catch {
    isNlpServiceAvailable = false;
    lastNlpCheckTime = now;
    return null; // Graceful failure if NLP service is not running locally
  }
}

export async function fetchAnalyticsSummary(apiKey: string): Promise<AnalyticsSummaryResponse> {
  const res = await fetch(`${API_BASE_URL}/analytics/summary`, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch executive analytics summary');
  }

  const json = await res.json();
  return json.data || json;
}

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

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Approval failed' }));
    throw new Error(err.message || 'Failed to approve reply');
  }

  const json = await res.json();
  return json.data || json;
}

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

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Feedback failed' }));
    throw new Error(err.message || 'Failed to submit feedback');
  }

  return res.json();
}

