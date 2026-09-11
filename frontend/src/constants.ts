import { OrganizationTenant } from './types';

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
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

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
