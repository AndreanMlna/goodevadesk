export const SLA_HOURS_BY_PRIORITY: Record<string, number> = {
  critical: 1,
  high: 4,
  normal: 24,
  low: 48,
};

export const DEFAULT_TICKET_PRIORITY = 'normal';
export const DEFAULT_TICKET_SENTIMENT = 'neutral';
export const DEFAULT_URGENCY_SCORE = 0.5;
export const DEFAULT_PAGE_LIMIT = 20;
