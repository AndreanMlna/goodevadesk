import { NlpAnalysisResult } from '../types';

// ==============================================================================
// Regex Extraction Patterns & Heuristic Scoring Weights
// ==============================================================================

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
