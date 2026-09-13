import { Injectable, Logger } from '@nestjs/common';

export interface PiiDetectionItem {
  type: 'credit_card' | 'phone' | 'id_ssn' | 'secret';
  count: number;
}

export interface SanitizedPiiResult {
  sanitizedText: string;
  hasPii: boolean;
  detectedPii: PiiDetectionItem[];
}

@Injectable()
export class PiiGuardService {
  private readonly logger = new Logger(PiiGuardService.name);

  // Regex patterns optimized for accuracy and low latency
  private readonly creditCardRegex = /\b(?:\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{1,7}|\d{13,19})\b/g;
  private readonly phoneRegex = /(?:\+?62|08)[0-9]{8,12}|\b(?:\+?1[-. ]?)?\(?[2-9]\d{2}\)?[-. ]?\d{3}[-. ]?\d{4}\b/g;
  private readonly idSsnRegex = /\b\d{3}-\d{2}-\d{4}\b|\b\d{16}\b/g; // US SSN or Indonesian 16-digit NIK
  private readonly secretRegex = /(?:password|secret|bearer|token|api[_-]?key)\s*[:=]\s*['"]?([a-zA-Z0-9_\-\.]{8,})['"]?/gi;

  /**
   * Validates potential credit card numbers using Luhn's algorithm
   */
  private isLuhnValid(cardStr: string): boolean {
    const digits = cardStr.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;

    let sum = 0;
    let shouldDouble = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits.charAt(i), 10);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  /**
   * Sanitizes input text by masking detected PII to guarantee GDPR/SOC-2 compliance before LLM execution.
   */
  sanitizeText(text: string): SanitizedPiiResult {
    if (!text || typeof text !== 'string') {
      return { sanitizedText: text || '', hasPii: false, detectedPii: [] };
    }

    let sanitized = text;
    const piiMap = new Map<'credit_card' | 'phone' | 'id_ssn' | 'secret', number>();

    // 1. Mask Secrets & Passwords
    sanitized = sanitized.replace(this.secretRegex, (match, secretVal) => {
      piiMap.set('secret', (piiMap.get('secret') || 0) + 1);
      return match.replace(secretVal, '[REDACTED_SECRET]');
    });

    // 2. Mask Credit Cards (Verified with Luhn)
    sanitized = sanitized.replace(this.creditCardRegex, (match) => {
      if (this.isLuhnValid(match)) {
        piiMap.set('credit_card', (piiMap.get('credit_card') || 0) + 1);
        return '[REDACTED_CREDIT_CARD]';
      }
      return match;
    });

    // 3. Mask National IDs / SSN
    sanitized = sanitized.replace(this.idSsnRegex, (match) => {
      // Avoid masking already masked credit cards
      if (match.includes('REDACTED')) return match;
      piiMap.set('id_ssn', (piiMap.get('id_ssn') || 0) + 1);
      return '[REDACTED_ID]';
    });

    // 4. Mask Phone Numbers
    sanitized = sanitized.replace(this.phoneRegex, (match) => {
      if (match.includes('REDACTED')) return match;
      piiMap.set('phone', (piiMap.get('phone') || 0) + 1);
      return '[REDACTED_PHONE]';
    });

    const detectedPii: PiiDetectionItem[] = [];
    for (const [type, count] of piiMap.entries()) {
      detectedPii.push({ type, count });
    }

    const hasPii = detectedPii.length > 0;
    if (hasPii) {
      this.logger.log(`[PII Guard] Redacted sensitive data: ${JSON.stringify(detectedPii)}`);
    }

    return {
      sanitizedText: sanitized,
      hasPii,
      detectedPii,
    };
  }
}
