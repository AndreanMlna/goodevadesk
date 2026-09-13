"""
GoodevaDesk NLP Microservice - Regular Expressions & Lexical Scoring Constants
"""

# ==============================================================================
# 1. Regex Patterns for Entity Extraction
# ==============================================================================

EMAIL_REGEX = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
PHONE_REGEX = r'(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3,4})[-. ]*(\d{4,6})'
INVOICE_ORDER_REGEX = r'(?:#|INV-|ORD-|PO-|ORDER-)[A-Za-z0-9-_]+'
ERROR_CODE_REGEX = r'\b(?:500|502|503|504|400|401|403|404|ECONNREFUSED|ETIMEDOUT|ERR_[A-Z0-9_]+|SQLSTATE_[A-Z0-9_]+)\b'
MONEY_REGEX = r'(?:\$|USD|EUR|Rp|IDR)\s?[\d,.]+'

# ==============================================================================
# 2. Weighted Keyword Dictionaries for Classification
# ==============================================================================

BILLING_KEYWORDS = {
    'billing': 1.5,
    'invoice': 2.0,
    'charge': 1.8,
    'charged': 1.8,
    'refund': 2.0,
    'payment': 1.5,
    'subscription': 1.5,
    'credit card': 1.8,
    'receipt': 1.2,
    'tax': 1.0,
    'pricing': 1.2,
    'cost': 1.0,
    'vat': 1.5,
    'order': 1.2,
    'ordered': 1.2,
    'paid': 1.5,
    'pay': 1.2,
    'fee': 1.2,
    'bayar': 1.8,
    'pembayaran': 1.8,
    'tagihan': 1.8,
    'transaksi': 1.5,
    'saldo': 1.5,
}

TECHNICAL_KEYWORDS = {
    'error': 1.5,
    'bug': 1.8,
    'crash': 2.0,
    'timeout': 1.8,
    '500': 1.5,
    '504': 1.5,
    'api': 1.5,
    'database': 1.5,
    'postgres': 1.5,
    'stack trace': 2.0,
    'broken': 1.5,
    'exception': 1.8,
    'gateway': 1.5,
    'latency': 1.2,
    'webhook': 1.5,
    'sqlstate': 1.8,
    'failed': 1.2,
    'failure': 1.5,
    'down': 1.5,
    'rusak': 1.5,
    'gangguan': 1.5,
    'kendala': 1.2,
}

URGENT_KEYWORDS = [
    'urgent',
    'asap',
    'immediately',
    'critical',
    'production down',
    'blocker',
    'severe',
]

# ==============================================================================
# 3. Security & CORS Origin Configuration
# ==============================================================================

ALLOWED_ORIGINS = [
    'https://goodevadesk.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8000',
]

# ==============================================================================
# 4. Classification Categories, Urgencies & Scoring Thresholds
# ==============================================================================

CATEGORY_BILLING = "billing"
CATEGORY_TECHNICAL = "technical"
CATEGORY_GENERAL = "general"

URGENCY_HIGH = "high"
URGENCY_MEDIUM = "medium"
URGENCY_LOW = "low"

SENTIMENT_NEGATIVE = "negative"
SENTIMENT_NEUTRAL = "neutral"

MIN_CATEGORY_THRESHOLD = 0.5
MEDIUM_URGENCY_THRESHOLD = 2.0
DEFAULT_GENERAL_CONFIDENCE = 0.70
BASE_CONFIDENCE = 0.65
MAX_CONFIDENCE = 0.95
CONFIDENCE_STEP = 0.08
MIN_PHONE_DIGITS = 8
