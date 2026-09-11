import re
from typing import List, Dict, Any, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="GoodevaDesk NLP & Entity Extraction Microservice",
    description="Extracts named entities, contact info, and performs rule-based NLI category classification",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeTicketRequest(BaseModel):
    subject: str = Field(..., min_length=1, examples=["Double billing on invoice #INV-2026-09"])
    message: str = Field(..., min_length=1, examples=["Contact me at finance@acme.com or +628123456789. We were charged $450 twice."])

class ExtractedEntities(BaseModel):
    emails: List[str] = []
    phone_numbers: List[str] = []
    invoice_or_order_ids: List[str] = []
    error_codes: List[str] = []
    monetary_amounts: List[str] = []

class AnalyzeTicketResponse(BaseModel):
    entities: ExtractedEntities
    predicted_category: str
    confidence: float
    urgency: str
    sentiment_hint: str
    summary: str

EMAIL_REGEX = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
PHONE_REGEX = r'(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3,4})[-. ]*(\d{4,6})'
INVOICE_ORDER_REGEX = r'(?:#|INV-|ORD-|PO-|ORDER-)[A-Za-z0-9-_]+'
ERROR_CODE_REGEX = r'\b(?:500|502|503|504|400|401|403|404|ECONNREFUSED|ETIMEDOUT|ERR_[A-Z0-9_]+)\b'
MONEY_REGEX = r'(?:\$|USD|EUR|Rp|IDR)\s?[\d,.]+'

BILLING_KEYWORDS = {
    'billing': 1.5, 'invoice': 2.0, 'charge': 1.8, 'charged': 1.8, 'refund': 2.0,
    'payment': 1.5, 'subscription': 1.5, 'credit card': 1.8, 'receipt': 1.2,
    'tax': 1.0, 'pricing': 1.2, 'cost': 1.0, 'vat': 1.5,
}

TECHNICAL_KEYWORDS = {
    'error': 1.5, 'bug': 1.8, 'crash': 2.0, 'timeout': 1.8, '500': 1.5, '504': 1.5,
    'api': 1.5, 'database': 1.5, 'postgres': 1.5, 'stack trace': 2.0, 'broken': 1.5,
    'exception': 1.8, 'gateway': 1.5, 'latency': 1.2, 'webhook': 1.5,
}

URGENT_KEYWORDS = ['urgent', 'asap', 'immediately', 'critical', 'production down', 'blocker', 'severe']

def extract_entities(text: str) -> ExtractedEntities:
    emails = list(set(re.findall(EMAIL_REGEX, text)))

    raw_phones = re.findall(PHONE_REGEX, text)
    phone_numbers = []
    for match in raw_phones:
        cleaned = "".join([part for part in match if part])
        if len(cleaned) >= 8:
            phone_numbers.append(cleaned)

    invoice_ids = list(set(re.findall(INVOICE_ORDER_REGEX, text, re.IGNORECASE)))
    error_codes = list(set(re.findall(ERROR_CODE_REGEX, text, re.IGNORECASE)))
    money = list(set(re.findall(MONEY_REGEX, text, re.IGNORECASE)))

    return ExtractedEntities(
        emails=emails,
        phone_numbers=list(set(phone_numbers)),
        invoice_or_order_ids=invoice_ids,
        error_codes=error_codes,
        monetary_amounts=money,
    )

def classify_category(lower_text: str) -> tuple[str, float, float, float]:
    billing_score = sum(weight for kw, weight in BILLING_KEYWORDS.items() if kw in lower_text)
    technical_score = sum(weight for kw, weight in TECHNICAL_KEYWORDS.items() if kw in lower_text)

    if billing_score > technical_score and billing_score > 0.5:
        return "billing", min(0.95, 0.65 + (billing_score * 0.08)), billing_score, technical_score
    elif technical_score > billing_score and technical_score > 0.5:
        return "technical", min(0.95, 0.65 + (technical_score * 0.08)), billing_score, technical_score
    else:
        return "general", 0.70, billing_score, technical_score

def determine_urgency(lower_text: str, error_codes: List[str], billing_score: float, technical_score: float) -> str:
    is_urgent = any(kw in lower_text for kw in URGENT_KEYWORDS) or len(error_codes) > 0
    if is_urgent:
        return "high"
    if billing_score > 2 or technical_score > 2:
        return "medium"
    return "low"

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "goodevadesk-python-nlp", "version": "1.0.0"}

@app.post("/analyze", response_model=AnalyzeTicketResponse)
def analyze_ticket(request: AnalyzeTicketRequest):
    combined_text = f"{request.subject} {request.message}"
    lower_text = combined_text.lower()

    entities = extract_entities(combined_text)
    category, confidence, billing_score, technical_score = classify_category(lower_text)
    urgency = determine_urgency(lower_text, entities.error_codes, billing_score, technical_score)
    sentiment_hint = "negative" if (billing_score > 0 or technical_score > 0) else "neutral"

    summary = (
        f"Detected {len(entities.emails)} email(s), "
        f"{len(entities.invoice_or_order_ids)} invoice reference(s), "
        f"{len(entities.error_codes)} error code(s)."
    )

    return AnalyzeTicketResponse(
        entities=entities,
        predicted_category=category,
        confidence=round(confidence, 2),
        urgency=urgency,
        sentiment_hint=sentiment_hint,
        summary=summary,
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
