from __future__ import annotations

from io import BytesIO
from fastapi.testclient import TestClient
from PIL import Image
import pytest

from app import app

client = TestClient(app)


def get_test_image_bytes() -> bytes:
    img = Image.new("RGB", (150, 150), color=(200, 200, 200))
    buf = BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "ocr" in data
    assert "uidaiCertificate" in data
    assert "trufor" in data
    assert "catnet" in data


def test_analyze_fast_endpoint():
    img_bytes = get_test_image_bytes()
    response = client.post(
        "/analyze-fast",
        files={"file": ("test.jpg", img_bytes, "image/jpeg")},
        data={"documentType": "pan"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "checks" in data
    assert len(data["checks"]) >= 5
    assert "sha256" in data


def test_analyze_full_endpoint():
    img_bytes = get_test_image_bytes()
    response = client.post(
        "/analyze-full",
        files={"file": ("test_aadhaar.jpg", img_bytes, "image/jpeg")},
        data={"documentType": "aadhaar"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "verdict" in data
    assert "confidence_score" in data
    assert "status" in data
    assert "checks" in data
    assert isinstance(data["confidence_score"], int)


def test_fuse_scores_endpoint():
    payload = {
        "checks": [
            {"checkName": "checksum_validation", "result": "pass", "confidence": 95},
            {"checkName": "ela_compression_analysis", "result": "pass", "confidence": 90},
        ]
    }
    response = client.post("/fuse-scores", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "verified"
    assert data["score"] >= 80


def test_webhook_supabase_ignored_when_no_url():
    payload = {
        "type": "INSERT",
        "record": {
            "id": 123,
            "document_type": "aadhaar",
        }
    }
    response = client.post("/webhook/supabase", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "ignored"


def test_redact_pii_endpoint():
    img_bytes = get_test_image_bytes()
    import base64
    b64_str = f"data:image/jpeg;base64,{base64.b64encode(img_bytes).decode('utf-8')}"
    response = client.post("/redact-pii", json={"content_base64": b64_str})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "redacted_image_base64" in data
    assert data["total_redactions"] >= 1

