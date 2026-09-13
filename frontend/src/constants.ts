import { OrganizationTenant, TicketStatus } from './types';

export const DEFAULT_TENANTS: OrganizationTenant[] = [
  {
    id: 'acme',
    name: 'Acme Corp',
    apiKey: 'acme_live_key_12345',
    badgeColor: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
  },
  {
    id: 'techflow',
    name: 'TechFlow Inc',
    apiKey: 'techflow_live_key_67890',
    badgeColor: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  },
];

// Team & Agent Identity Constants
export const TEAM_MEMBERS: string[] = [
  'Unassigned',
  'Sarah Connor (L2 Tech Lead)',
  'Alex Mercer (Billing Specialist)',
  'Elena Rostova (Incident Commander)',
  'Marcus Vance (Security Ops)',
  'Devin Hayes (Support Tier 1)',
];

export const UNASSIGNED_AGENT = 'Unassigned';
export const DEFAULT_ACTIVE_AGENT_NAME = 'Support Agent (Active)';
export const DEFAULT_INTERNAL_WHISPER_SENDER = 'Staff Specialist';
export const DEFAULT_AGENT_SENDER = 'Support Agent';

// Ticket Lifecycle Constants
export const LIFECYCLE_STATUSES: TicketStatus[] = ['open', 'in_progress', 'closed'];

// Polling, Notification, and Delay Durations (ms)
export const PRESENCE_POLL_INTERVAL_MS = 10000;
export const AUTO_DISMISS_NOTIFICATION_MS = 3000;
export const COPY_FEEDBACK_TIMEOUT_MS = 2000;
export const FEEDBACK_MODAL_TIMEOUT_MS = 4000;
export const MILLISECONDS_PER_HOUR = 1000 * 60 * 60;

export interface SlaDeadlineStatus {
  text: string;
  isBreached: boolean;
  isUrgent?: boolean;
}

export function formatDeadline(deadlineStr?: string | null): SlaDeadlineStatus | null {
  if (!deadlineStr) return null;
  const deadline = new Date(deadlineStr);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / MILLISECONDS_PER_HOUR);

  if (diffMs < 0) {
    return { text: 'SLA Breached', isBreached: true };
  }
  if (diffHours <= 1) {
    return { text: '<1h remaining', isBreached: false, isUrgent: true };
  }
  return { text: `${diffHours}h remaining`, isBreached: false, isUrgent: false };
}

export const PRIORITY_STYLES: Record<string, string> = {
  critical: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
  high: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  normal: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  low: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

export const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  in_progress: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  closed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
};

export const CATEGORY_STYLES: Record<string, string> = {
  billing: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  technical: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  general: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
};

export const SENTIMENT_ICONS: Record<string, string> = {
  frustrated: '😡',
  negative: '🙁',
  positive: '😊',
  neutral: '😐',
};
