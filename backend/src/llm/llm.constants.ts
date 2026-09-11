export enum LlmProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
  MOCK = 'mock',
}

export enum SupportedGeminiModel {
  GEMINI_3_5_FLASH_LITE = 'gemini-3.5-flash-lite',
  GEMINI_2_5_FLASH = 'gemini-2.5-flash',
  GEMINI_2_5_PRO = 'gemini-2.5-pro',
}

export enum SupportedOpenAiModel {
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_4O = 'gpt-4o',
}

export enum SupportedAnthropicModel {
  CLAUDE_3_5_SONNET = 'claude-3-5-sonnet-20241022',
  CLAUDE_3_5_HAIKU = 'claude-3-5-haiku-20241022',
}

export const DEFAULT_LLM_TIMEOUT_MS = 7000;
export const DEFAULT_LLM_PROVIDER = LlmProvider.MOCK;
export const DEFAULT_OPENAI_MODEL = SupportedOpenAiModel.GPT_4O_MINI;
export const DEFAULT_ANTHROPIC_MODEL = SupportedAnthropicModel.CLAUDE_3_5_SONNET;
export const DEFAULT_GEMINI_MODEL = SupportedGeminiModel.GEMINI_3_5_FLASH_LITE;
export const DEFAULT_LLM_MAX_TOKENS = 450;
export const DEFAULT_LLM_TEMPERATURE = 0.2;

/**
 * Resolves and validates LLM provider from environment or config.
 * Falls back to LlmProvider.MOCK if invalid or unconfigured.
 */
export function resolveLlmProvider(value?: string | null): LlmProvider {
  if (!value) return DEFAULT_LLM_PROVIDER;
  const normalized = value.trim().toLowerCase();
  const validProviders = Object.values(LlmProvider) as string[];
  if (validProviders.includes(normalized)) {
    return normalized as LlmProvider;
  }
  return DEFAULT_LLM_PROVIDER;
}

/**
 * Resolves and validates Gemini model name.
 * Handles deprecation fallback (e.g. gemini-1.5-flash is auto-migrated to gemini-3.5-flash-lite).
 */
export function resolveGeminiModel(value?: string | null): string {
  if (!value) return DEFAULT_GEMINI_MODEL;
  const trimmed = value.trim();

  // Automatic enterprise migration for deprecated models
  if (trimmed === 'gemini-1.5-flash' || trimmed === 'gemini-1.5-pro') {
    return DEFAULT_GEMINI_MODEL;
  }

  const validModels = Object.values(SupportedGeminiModel) as string[];
  if (validModels.includes(trimmed)) {
    return trimmed;
  }

  return trimmed || DEFAULT_GEMINI_MODEL;
}

/**
 * Resolves and validates OpenAI model name.
 */
export function resolveOpenAiModel(value?: string | null): string {
  if (!value) return DEFAULT_OPENAI_MODEL;
  const trimmed = value.trim();
  const validModels = Object.values(SupportedOpenAiModel) as string[];
  if (validModels.includes(trimmed)) {
    return trimmed;
  }
  return trimmed || DEFAULT_OPENAI_MODEL;
}

/**
 * Resolves and validates Anthropic model name.
 */
export function resolveAnthropicModel(value?: string | null): string {
  if (!value) return DEFAULT_ANTHROPIC_MODEL;
  const trimmed = value.trim();
  const validModels = Object.values(SupportedAnthropicModel) as string[];
  if (validModels.includes(trimmed)) {
    return trimmed;
  }
  return trimmed || DEFAULT_ANTHROPIC_MODEL;
}

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
