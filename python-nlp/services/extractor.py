"""
GoodevaDesk NLP Microservice - Entity Extraction Service
"""

import re
from typing import Optional
from models import ExtractedEntities
from constants import (
    EMAIL_REGEX,
    PHONE_REGEX,
    INVOICE_ORDER_REGEX,
    ERROR_CODE_REGEX,
    MONEY_REGEX,
)


def extract_entities(text: str, customer_email: Optional[str] = None) -> ExtractedEntities:
    """
    Extracts structured entities (emails, phone numbers, order IDs, error codes, money)
    from the raw ticket text and prepends customer_email if valid.
    """
    emails = list(set(re.findall(EMAIL_REGEX, text)))
    if customer_email and re.match(EMAIL_REGEX, customer_email.strip()):
        clean_cust_email = customer_email.strip()
        if clean_cust_email not in emails:
            emails.insert(0, clean_cust_email)

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


def build_pipeline_summary(entities: ExtractedEntities) -> str:
    """
    Constructs a human-readable summary string of detected entities.
    """
    detected_items = []
    if entities.emails:
        detected_items.append(f"{len(entities.emails)} email(s)")
    if entities.invoice_or_order_ids:
        detected_items.append(f"{len(entities.invoice_or_order_ids)} invoice/order ID(s)")
    if entities.error_codes:
        detected_items.append(f"{len(entities.error_codes)} error code(s)")
    if entities.phone_numbers:
        detected_items.append(f"{len(entities.phone_numbers)} phone number(s)")
    if entities.monetary_amounts:
        detected_items.append(f"{len(entities.monetary_amounts)} amount(s)")

    if not detected_items:
        return "No specialized entities detected."

    return f"Detected: {', '.join(detected_items)}."
