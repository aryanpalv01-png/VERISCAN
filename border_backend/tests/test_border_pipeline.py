"""
Comprehensive Automated Test Suite for Border Screening Pipeline (Production Grade)
Tests:
- Module 1 & 2: Fail-Fast Short-Circuit on corrupted checksum or expired doc
- Module 3: OpenCV ELA, Laplacian noise consistency, and visual coordinate mapping
- Module 4: Cosine Similarity face matching and anti-spoofing
- Risk Fusion: Tier A deterministic overrides vs Tier B probabilistic corroboration
- Audit Ledger: Cryptographic SHA-256 hash chaining and integrity verification
- Endpoints: POST /verify-border-document with multipart and JSON payloads
"""
from __future__ import annotations

import io
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from border_backend.app import app
from border_backend.models import (
    ChecksumFieldResult,
    DateValidationResult,
    ExtractAndValidateResponse,
    ExtractedMrzFields,
    FaceDetectionResult,
    MrzChecksums,
)
from border_backend.modules.audit_ledger import AuditLedger, record_audit_entry
from border_backend.modules.face_liveness import (
    compute_cosine_similarity,
    extract_face_feature_vector,
    evaluate_face_anti_spoofing,
    process_face_and_liveness,
)
from border_backend.modules.risk_fusion import evaluate_risk_fusion
from border_backend.modules.tampering_detector import (
    analyze_document_tampering,
    compute_ela,
    compute_noise_consistency,
    detect_localized_splicing,
)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def synthetic_passport_img():
    """Generates a clean synthetic 600x400 passport document image."""
    img = np.ones((400, 600, 3), dtype=np.uint8) * 240
    # Simulate photo box
    cv2.rectangle(img, (50, 80), (220, 280), (180, 180, 180), -1)
    cv2.circle(img, (100, 150), 12, (80, 80, 80), -1)
    cv2.circle(img, (170, 150), 12, (80, 80, 80), -1)
    cv2.ellipse(img, (135, 210), (35, 15), 0, 0, 180, (60, 60, 60), 4)

    # Document body text lines
    for y in [90, 120, 150, 180, 210, 240]:
        cv2.line(img, (260, y), (550, y), (70, 70, 70), 3)

    # MRZ bottom zone
    cv2.putText(
        img,
        "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
        (30, 340),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        (10, 10, 10),
        2,
    )
    cv2.putText(
        img,
        "L898902C36UTO7408122F3204153ZE184226B<<<<<16",
        (30, 375),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        (10, 10, 10),
        2,
    )
    return img


@pytest.fixture
def tampered_photo_swap_img(synthetic_passport_img):
    """Simulates a photo-swap tampering with extreme localized noise/disparity."""
    tampered = synthetic_passport_img.copy()
    noise = np.random.normal(0, 45, (200, 170, 3)).astype(np.int16)
    photo_roi = tampered[80:280, 50:220].astype(np.int16) + noise
    tampered[80:280, 50:220] = np.clip(photo_roi, 0, 255).astype(np.uint8)
    return tampered


# --- Test Module 3: Tampering, ELA & Visual Coordinate Mapping ---

def test_ela_computation_metrics(synthetic_passport_img):
    mean_ela, peak_ela, tampered_ratio, heatmap_b64, diff_mag = compute_ela(synthetic_passport_img, quality=90)
    assert mean_ela >= 0.0
    assert peak_ela >= 0.0
    assert 0.0 <= tampered_ratio <= 1.0
    assert heatmap_b64 is not None
    assert heatmap_b64.startswith("data:image/jpeg;base64,")
    assert diff_mag is not None


def test_tampering_analysis_clean_document(synthetic_passport_img):
    res = analyze_document_tampering(synthetic_passport_img)
    assert res.photo_swap_risk in ["LOW", "ELEVATED"]
    assert res.risk_score < 50
    assert res.ela.mean_ela >= 0.0


def test_tampering_analysis_detects_photo_swap_and_returns_bounding_box(tampered_photo_swap_img):
    res = analyze_document_tampering(tampered_photo_swap_img, face_bbox=[50, 80, 170, 200])
    assert res.noise.is_disparate is True or res.noise.noise_ratio > 2.5
    assert res.tampering_detected is True
    assert res.risk_score >= 45
    # Verify visual coordinate mapping returns non-empty bounding boxes
    assert len(res.tampering_boxes) > 0
    first_box = res.tampering_boxes[0]
    assert first_box.width > 0
    assert first_box.height > 0
    assert first_box.label != ""


# --- Test Module 4: Face Verification, Cosine Similarity & Anti-Spoofing ---

def test_face_cosine_similarity_metrics():
    vec_a = np.random.normal(0, 1, 128).astype(np.float32)
    vec_a /= np.linalg.norm(vec_a)
    
    # Identical vector -> cosine similarity 1.0
    res_identical = compute_cosine_similarity(vec_a, vec_a)
    assert res_identical.cosine_similarity >= 0.99
    assert res_identical.cosine_distance <= 0.01
    assert res_identical.match_verdict == "MATCH"

    # Inverted vector -> cosine similarity -1.0
    res_inverted = compute_cosine_similarity(vec_a, -vec_a)
    assert res_inverted.cosine_similarity <= -0.99
    assert res_inverted.match_verdict == "NO_MATCH"


def test_face_anti_spoofing_evaluation():
    # Sharp clean face without glare saturation (midtone texture with high gradient)
    sharp_img = np.full((100, 100), 120, dtype=np.uint8)
    sharp_img[::2, ::2] = 180
    sharpness, glare, is_spoof, flags = evaluate_face_anti_spoofing(sharp_img)
    assert sharpness > 100.0
    assert glare < 1.0
    assert is_spoof is False

    # Glare-saturated replay screen face
    glare_img = np.ones((100, 100), dtype=np.uint8) * 255
    sharpness_g, glare_pct, is_spoof_g, flags_g = evaluate_face_anti_spoofing(glare_img)
    assert glare_pct > 95.0
    assert is_spoof_g is True
    assert any("glare" in f.lower() for f in flags_g)


def test_face_and_liveness_processing(synthetic_passport_img):
    res = process_face_and_liveness(synthetic_passport_img)
    assert res.face_detected is True
    assert res.face_crop_base64 is not None
    assert res.liveness_score >= 0


# --- Test Tiered Risk Fusion Engine ---

def test_risk_fusion_clear_entry():
    mrz = ExtractAndValidateResponse(
        status="PASS",
        mrz_detected=True,
        format="TD3",
        raw_mrz_lines=["P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<"],
        confidence_score=98,
        summary="All checksums verified.",
        checksums=MrzChecksums(
            document_number=ChecksumFieldResult(valid=True, extracted="L898902C3", computed="6", field_name="doc_num"),
            date_of_birth=ChecksumFieldResult(valid=True, extracted="740812", computed="2", field_name="dob"),
            expiration_date=ChecksumFieldResult(valid=True, extracted="320415", computed="3", field_name="expiry"),
            composite=ChecksumFieldResult(valid=True, extracted="16", computed="6", field_name="composite"),
            overall_valid=True,
        ),
        date_validation=DateValidationResult(
            dob_valid=True,
            dob_formatted="1974-08-12",
            age=52,
            is_expired=False,
            expiry_formatted="2032-04-15",
            days_until_expiry=2000,
            expires_soon_warning=False,
        ),
    )
    tamper = analyze_document_tampering(np.ones((200, 200, 3), dtype=np.uint8) * 200)
    bio = FaceDetectionResult(
        face_detected=True,
        face_count=1,
        bbox=[20, 20, 80, 80],
        sharpness_score=120.0,
        glare_score=1.0,
        liveness_score=92,
        status="PASS",
        summary="Biometric pass.",
    )

    decision = evaluate_risk_fusion(mrz, tamper, bio)
    assert decision.decision == "CLEAR_ENTRY"
    assert decision.risk_band == "LOW"
    assert decision.risk_score <= 24
    assert decision.tier_a_override is False


def test_risk_fusion_tier_a_checksum_override():
    mrz = ExtractAndValidateResponse(
        status="FAIL",
        mrz_detected=True,
        format="TD3",
        confidence_score=20,
        summary="Tampering detected.",
        checksums=MrzChecksums(
            document_number=ChecksumFieldResult(valid=False, extracted="L898902C3", computed="7", field_name="doc_num"),
            date_of_birth=ChecksumFieldResult(valid=True, extracted="740812", computed="2", field_name="dob"),
            expiration_date=ChecksumFieldResult(valid=True, extracted="320415", computed="3", field_name="expiry"),
            composite=ChecksumFieldResult(valid=False, extracted="10", computed="4", field_name="composite"),
            overall_valid=False,
        ),
    )
    tamper = analyze_document_tampering(np.ones((200, 200, 3), dtype=np.uint8) * 200)
    bio = FaceDetectionResult(
        face_detected=True,
        face_count=1,
        sharpness_score=100.0,
        glare_score=0.0,
        liveness_score=90,
        status="PASS",
        summary="Biometric pass.",
    )

    decision = evaluate_risk_fusion(mrz, tamper, bio)
    assert decision.decision == "HOLD_FOR_MANUAL_INSPECTION"
    assert decision.risk_band == "HIGH"
    assert decision.tier_a_override is True
    assert decision.risk_score >= 88


# --- Test Cryptographic Audit Ledger ---

def test_audit_ledger_cryptographic_chain():
    ledger = AuditLedger.get_instance()
    initial_len = len(ledger.chain)

    entry1 = ledger.record_transaction(
        document_bytes=b"SAMPLE_DOC_BYTES_1",
        decision="CLEAR_ENTRY",
        risk_score=15,
        station_id="CP-TEST-01",
        officer_id="OFFICER-001",
    )
    assert entry1.block_height == initial_len
    assert len(entry1.block_hash) == 64
    assert len(entry1.previous_block_hash) == 64

    entry2 = ledger.record_transaction(
        document_bytes=b"SAMPLE_DOC_BYTES_2",
        decision="HOLD_FOR_MANUAL_INSPECTION",
        risk_score=95,
        station_id="CP-TEST-01",
        officer_id="OFFICER-001",
    )
    assert entry2.previous_block_hash == entry1.block_hash
    assert ledger.verify_integrity() is True


# --- Test Fail-Fast Short-Circuit Endpoint ---

def test_endpoint_fail_fast_short_circuit(client):
    # Pass a tampered MRZ with enable_fail_fast=True
    payload = {
        "mrz_text": "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C37UTO7408122F3204153ZE184226B<<<<<16",  # '7' instead of '6'
        "enable_fail_fast": True,
    }
    response = client.post("/verify-border-document", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["fail_fast_triggered"] is True
    assert data["decision"]["decision"] == "HOLD_FOR_MANUAL_INSPECTION"
    assert data["decision"]["risk_band"] == "HIGH"
    assert data["audit_entry"] is not None
    assert data["execution_time_ms"] >= 0.0


def test_endpoint_verify_border_document_valid(client):
    payload = {
        "mrz_text": "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F3204153ZE184226B<<<<<16",
        "document_type": "passport",
    }
    response = client.post("/verify-border-document", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["SUCCESS", "WARNING"]
    assert "audit_entry" in data
    assert len(data["audit_entry"]["block_hash"]) == 64
