export const DEFAULT_LLM_TIMEOUT_MS = 7000;
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
export const DEFAULT_ANTHROPIC_MODEL = 'claude-3-5-sonnet-20241022';
export const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash';
export const DEFAULT_LLM_MAX_TOKENS = 450;
export const DEFAULT_LLM_TEMPERATURE = 0.2;

export const BILLING_KEYWORDS = [
  'billing', 'invoice', 'charge', 'charged', 'refund', 'payment',
  'credit card', 'subscription', 'price', 'pricing', 'receipt', 'tax',
];

export const TECHNICAL_KEYWORDS = [
  'error', 'bug', 'crash', 'timeout', '500', '504', '404', 'api',
  'database', 'postgres', 'stack trace', 'exception', 'failure',
  'integration', 'broken', 'latency', 'webhook', 'gateway',
];

export const FRUSTRATED_KEYWORDS = [
  'urgent', 'kecewa', 'marah', 'twice', 'dobel', 'immediately',
  'down', 'outage', 'crash', 'fail',
];

export const POSITIVE_KEYWORDS = ['terima kasih', 'thank you', 'great'];
