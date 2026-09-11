from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_analyze_billing_ticket():
    payload = {
        "subject": "Invoice dispute for #INV-2026-99",
        "message": "We were charged $500 twice on our card. Contact accountant@acme.com immediately.",
    }
    response = client.post("/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_category"] == "billing"
    assert "accountant@acme.com" in data["entities"]["emails"]
    assert any("INV-2026-99" in inv for inv in data["entities"]["invoice_or_order_ids"])
    assert len(data["entities"]["monetary_amounts"]) > 0

def test_analyze_technical_ticket():
    payload = {
        "subject": "504 Gateway Timeout on webhook sync",
        "message": "Production server crashed with error code 504 and ECONNREFUSED during sync.",
    }
    response = client.post("/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_category"] == "technical"
    assert "504" in data["entities"]["error_codes"]
    assert data["urgency"] == "high"
