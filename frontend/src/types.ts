export type TicketStatus = 'open' | 'in_progress' | 'closed';

export interface Ticket {
  id: string;
  organization_id: string;
  customer_email: string;
  subject: string;
  message: string;
  category: string | null;
  suggested_reply: string | null;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  priority?: 'critical' | 'high' | 'normal' | 'low' | null;
  sla_deadline?: string | null;
  sentiment?: 'frustrated' | 'negative' | 'neutral' | 'positive' | null;
  urgency_score?: number | null;
  grounding_doc?: string | null;
  _meta?: {
    cache_hit: boolean;
    llm_processed: boolean;
    provider?: string;
  };
}

export interface TicketFeedbackPayload {
  rating: 'thumbs_up' | 'thumbs_down';
  notes?: string;
  human_correction?: string;
}

export interface AnalyticsSummaryResponse {
  tenant: {
    organization_id: string;
    name: string;
  };
  total_tickets: number;
  metrics: {
    status_breakdown: Record<string, number>;
    category_breakdown: Record<string, number>;
    priority_breakdown: Record<string, number>;
    sentiment_breakdown: Record<string, number>;
    sla_compliance: {
      breached: number;
      at_risk_urgent: number;
      healthy: number;
      breached_percentage: number;
    };
    avg_urgency_score: number;
  };
  critical_tickets: Array<{
    id: string;
    subject: string;
    customer_email: string;
    priority: string | null;
    urgency_score: number | null;
    sla_deadline: string | null;
    status: string;
    category: string | null;
  }>;
  knowledge_base: {
    grounding_sops_count: number;
    available_sops: string[];
  };
}

export interface OrganizationTenant {
  id: string;
  name: string;
  apiKey: string;
  badgeColor: string;
}

export interface NlpAnalysisResult {
  entities: {
    emails: string[];
    phone_numbers: string[];
    invoice_or_order_ids: string[];
    error_codes: string[];
    monetary_amounts: string[];
  };
  predicted_category: string;
  confidence: number;
  urgency: string;
  sentiment_hint: string;
  summary: string;
}
