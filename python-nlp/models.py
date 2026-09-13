"""
GoodevaDesk NLP Microservice - Pydantic Data Transfer Objects (DTOs)
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class AnalyzeTicketRequest(BaseModel):
    """Input payload for ticket text analysis."""
    subject: str = Field(
        ...,
        min_length=1,
        examples=["Double billing on invoice #INV-2026-09"],
    )
    message: str = Field(
        ...,
        min_length=1,
        examples=["Contact me at finance@acme.com or +628123456789. We were charged $450 twice."],
    )
    customer_email: Optional[str] = Field(
        None,
        examples=["customer@example.com"],
    )


class ExtractedEntities(BaseModel):
    """Extracted named entities, IDs, error codes, and PII contact points."""
    emails: List[str] = []
    phone_numbers: List[str] = []
    invoice_or_order_ids: List[str] = []
    error_codes: List[str] = []
    monetary_amounts: List[str] = []


class AnalyzeTicketResponse(BaseModel):
    """Structured response containing extracted entities, category, urgency, and sentiment."""
    entities: ExtractedEntities
    predicted_category: str
    confidence: float
    urgency: str
    sentiment_hint: str
    summary: str
