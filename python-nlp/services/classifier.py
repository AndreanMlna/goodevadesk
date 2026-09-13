"""
GoodevaDesk NLP Microservice - Lexical Category & Urgency Classifier
"""

from typing import List, Tuple
from constants import (
    BILLING_KEYWORDS,
    TECHNICAL_KEYWORDS,
    URGENT_KEYWORDS,
    CATEGORY_BILLING,
    CATEGORY_TECHNICAL,
    CATEGORY_GENERAL,
    URGENCY_HIGH,
    URGENCY_MEDIUM,
    URGENCY_LOW,
    SENTIMENT_NEGATIVE,
    SENTIMENT_NEUTRAL,
    MIN_CATEGORY_THRESHOLD,
    MEDIUM_URGENCY_THRESHOLD,
    DEFAULT_GENERAL_CONFIDENCE,
    BASE_CONFIDENCE,
    MAX_CONFIDENCE,
    CONFIDENCE_STEP,
)


def classify_category(lower_text: str) -> Tuple[str, float, float, float]:
    """
    Computes weighted keyword matches to categorize the ticket into
    'billing', 'technical', or 'general'. Returns (category, confidence, billing_score, technical_score).
    """
    billing_score = sum(weight for kw, weight in BILLING_KEYWORDS.items() if kw in lower_text)
    technical_score = sum(weight for kw, weight in TECHNICAL_KEYWORDS.items() if kw in lower_text)

    if billing_score > technical_score and billing_score > MIN_CATEGORY_THRESHOLD:
        confidence = min(MAX_CONFIDENCE, BASE_CONFIDENCE + (billing_score * CONFIDENCE_STEP))
        return CATEGORY_BILLING, confidence, billing_score, technical_score

    if technical_score > billing_score and technical_score > MIN_CATEGORY_THRESHOLD:
        confidence = min(MAX_CONFIDENCE, BASE_CONFIDENCE + (technical_score * CONFIDENCE_STEP))
        return CATEGORY_TECHNICAL, confidence, billing_score, technical_score

    return CATEGORY_GENERAL, DEFAULT_GENERAL_CONFIDENCE, billing_score, technical_score


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
        return URGENCY_HIGH

    if billing_score > MEDIUM_URGENCY_THRESHOLD or technical_score > MEDIUM_URGENCY_THRESHOLD:
        return URGENCY_MEDIUM

    return URGENCY_LOW


def determine_sentiment(billing_score: float, technical_score: float) -> str:
    """
    Infers an initial sentiment hint from issue severity indicators.
    """
    return SENTIMENT_NEGATIVE if (billing_score > 0 or technical_score > 0) else SENTIMENT_NEUTRAL
