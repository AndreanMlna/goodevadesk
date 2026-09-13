"""
GoodevaDesk NLP Microservice - Lexical Category & Urgency Classifier
"""

from typing import List, Tuple
from constants import (
    BILLING_KEYWORDS,
    TECHNICAL_KEYWORDS,
    URGENT_KEYWORDS,
)


def classify_category(lower_text: str) -> Tuple[str, float, float, float]:
    """
    Computes weighted keyword matches to categorize the ticket into
    'billing', 'technical', or 'general'. Returns (category, confidence, billing_score, technical_score).
    """
    billing_score = sum(weight for kw, weight in BILLING_KEYWORDS.items() if kw in lower_text)
    technical_score = sum(weight for kw, weight in TECHNICAL_KEYWORDS.items() if kw in lower_text)

    if billing_score > technical_score and billing_score > 0.5:
        confidence = min(0.95, 0.65 + (billing_score * 0.08))
        return "billing", confidence, billing_score, technical_score

    if technical_score > billing_score and technical_score > 0.5:
        confidence = min(0.95, 0.65 + (technical_score * 0.08))
        return "technical", confidence, billing_score, technical_score

    return "general", 0.70, billing_score, technical_score


def determine_urgency(
    lower_text: str,
    error_codes: List[str],
    billing_score: float,
    technical_score: float,
) -> str:
    """
    Determines ticket priority level ('high', 'medium', 'low') based on critical
    keywords, presence of error codes, and lexical intensity.
    """
    is_urgent = any(kw in lower_text for kw in URGENT_KEYWORDS) or len(error_codes) > 0
    if is_urgent:
        return "high"

    if billing_score > 2.0 or technical_score > 2.0:
        return "medium"

    return "low"


def determine_sentiment(billing_score: float, technical_score: float) -> str:
    """
    Infers an initial sentiment hint from issue severity indicators.
    """
    return "negative" if (billing_score > 0 or technical_score > 0) else "neutral"
