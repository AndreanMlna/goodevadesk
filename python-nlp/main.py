"""
GoodevaDesk NLP Microservice - FastAPI Application Entrypoint
"""

import os
import sys
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure current package directory is in sys.path for serverless and local execution
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from constants import ALLOWED_ORIGINS
from models import AnalyzeTicketRequest, AnalyzeTicketResponse
from services.classifier import classify_category, determine_sentiment, determine_urgency
from services.extractor import build_pipeline_summary, extract_entities

app = FastAPI(
    title="GoodevaDesk NLP & Entity Extraction Microservice",
    description="Extracts named entities, contact info, and performs rule-based NLI category classification",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
@app.get("/health")
@app.get("/api")
@app.get("/api/health")
@app.get("/api/index")
@app.get("/api/index/health")
@app.get("/api/index.py")
@app.get("/api/index.py/health")
def health_check():
    """Health check endpoint for container probes and load balancers."""
    return {"status": "ok", "service": "goodevadesk-python-nlp", "version": "1.0.0"}


@app.post("/analyze", response_model=AnalyzeTicketResponse)
@app.post("/api/analyze", response_model=AnalyzeTicketResponse)
@app.post("/api/index/analyze", response_model=AnalyzeTicketResponse)
@app.post("/api/index.py/analyze", response_model=AnalyzeTicketResponse)
def analyze_ticket(request: AnalyzeTicketRequest) -> AnalyzeTicketResponse:
    """Analyzes ticket text to extract entities, infer categories, and assess urgency."""
    combined_text = f"{request.subject} {request.message}"
    lower_text = combined_text.lower()

    entities = extract_entities(combined_text, request.customer_email)
    category, confidence, billing_score, technical_score = classify_category(lower_text)
    urgency = determine_urgency(lower_text, entities.error_codes, billing_score, technical_score)
    sentiment_hint = determine_sentiment(billing_score, technical_score)
    summary = build_pipeline_summary(entities)

    return AnalyzeTicketResponse(
        entities=entities,
        predicted_category=category,
        confidence=round(confidence, 2),
        urgency=urgency,
        sentiment_hint=sentiment_hint,
        summary=summary,
    )


@app.api_route("/{full_path:path}", methods=["GET", "POST", "OPTIONS"])
async def catch_all_fallback(request: Request, full_path: str):
    """Fallback router for Vercel Serverless path normalization."""
    if request.method == "POST":
        try:
            body = await request.json()
            payload = AnalyzeTicketRequest(**body)
            return analyze_ticket(payload)
        except Exception:
            return JSONResponse({"detail": "Invalid request payload"}, status_code=400)
    return {"status": "ok", "service": "goodevadesk-python-nlp", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
