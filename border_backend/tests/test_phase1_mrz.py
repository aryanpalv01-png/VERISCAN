"""
Unit & Integration Tests for Phase 1: Module 1 & 2 (OCR & ICAO 9303 Deterministic Validation)
"""
from __future__ import annotations

from io import BytesIO
import cv2
import numpy as np
from datetime import date
from fastapi.testclient import TestClient

from border_backend.app import app
from border_backend.modules.mrz_engine import (
    compute_icao_check_digit,
    icao_char_value,
    parse_td3_passport,
    parse_td1_id_card,
    process_and_validate_mrz,
)
from border_backend.modules.date_validator import validate_mrz_dates, parse_yymmdd

client = TestClient(app)

# Official ICAO Doc 9303 Sample TD3 Passport
VALID_ICAO_TD3_LINE1 = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<"
VALID_ICAO_TD3_LINE2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<10"
VALID_TD3_MRZ = f"{VALID_ICAO_TD3_LINE1}\n{VALID_ICAO_TD3_LINE2}"

# Future valid passport sample (expires 2030)
# Doc: G23456789 (check: 7)
# DOB: 900520 (check: 8) -> 20 May 1990
# Exp: 300815 (check: 4) -> 15 Aug 2030
# Opt: <<<<<<<<<<<<<< (check: <)
# Comp: G23456789790052083008154<<<<<<<<<<<<<<0
def make_valid_future_td3() -> str:
    l1 = "P<INDSHARMA<<RAHUL<<<<<<<<<<<<<<<<<<<<<<<<<<"
    doc_num = "G23456789"
    doc_cd = compute_icao_check_digit(doc_num)
    dob = "900520"
    dob_cd = compute_icao_check_digit(dob)
    exp = "300815"
    exp_cd = compute_icao_check_digit(exp)
    opt = "<<<<<<<<<<<<<<"
    opt_cd = "<"
    comp_body = doc_num + doc_cd + dob + dob_cd + exp + exp_cd + opt + "0"
    comp_cd = compute_icao_check_digit(comp_body)
    l2 = f"{doc_num}{doc_cd}IND{dob}{dob_cd}M{exp}{exp_cd}{opt}{opt_cd}{comp_cd}"
    return f"{l1}\n{l2}"


def create_synthetic_passport_image(mrz_text: str) -> bytes:
    """Generates a clean synthetic passport image with MRZ rendered crisply."""
    from PIL import Image, ImageDraw

    img = Image.new("RGB", (800, 520), color=(245, 245, 245))
    draw = ImageDraw.Draw(img)
    draw.text((50, 40), "PASSPORT / PASSEPORT", fill=(0, 0, 0))
    draw.text((50, 80), "REPUBLIC OF INDIA", fill=(20, 20, 120))
    draw.text((50, 140), "Surname: SHARMA", fill=(0, 0, 0))
    draw.text((50, 180), "Given Name: RAHUL", fill=(0, 0, 0))
    draw.text((50, 220), "Nationality: INDIAN", fill=(0, 0, 0))

    lines = [l.strip() for l in mrz_text.strip().splitlines() if l.strip()]
    if len(lines) >= 2:
        draw.text((30, 410), lines[0], fill=(0, 0, 0))
        draw.text((30, 450), lines[1], fill=(0, 0, 0))

    out_buf = BytesIO()
    img.save(out_buf, format="PNG")
    return out_buf.getvalue()


# --------------------------------------------------------------------------
# 1. Checksum & Character Value Math Tests
# --------------------------------------------------------------------------
def test_icao_char_values():
    assert icao_char_value("0") == 0
    assert icao_char_value("9") == 9
    assert icao_char_value("A") == 10
    assert icao_char_value("Z") == 35
    assert icao_char_value("<") == 0


def test_icao_731_check_digit_calculation():
    # Official sample: Doc 'L898902C3' -> 6
    assert compute_icao_check_digit("L898902C3") == "6"
    # Official sample: DOB '740812' -> 2
    assert compute_icao_check_digit("740812") == "2"
    # Official sample: Expiry '120415' -> 9
    assert compute_icao_check_digit("120415") == "9"
    # Official sample: Optional 'ZE184226B<<<<<' -> 1
    assert compute_icao_check_digit("ZE184226B<<<<<") == "1"


# --------------------------------------------------------------------------
# 2. TD3 Passport Parser & Validation Tests
# --------------------------------------------------------------------------
def test_parse_valid_official_icao_td3():
    fields, checksums, errors = parse_td3_passport([VALID_ICAO_TD3_LINE1, VALID_ICAO_TD3_LINE2])
    assert fields.surname == "ERIKSSON"
    assert fields.given_names == "ANNA MARIA"
    assert fields.document_number == "L898902C3"
    assert fields.nationality == "UTO"
    assert fields.sex == "F"

    assert checksums.document_number.valid is True
    assert checksums.date_of_birth.valid is True
    assert checksums.expiration_date.valid is True
    assert checksums.composite.valid is True
    assert checksums.overall_valid is True
    assert len(errors) == 0


def test_tampered_document_number_fails_checksum():
    # Change first digit from 'L' to 'M' (altering document number)
    tampered_line2 = "M898902C36UTO7408122F1204159ZE184226B<<<<<10"
    fields, checksums, errors = parse_td3_passport([VALID_ICAO_TD3_LINE1, tampered_line2])
    
    assert checksums.document_number.valid is False
    assert checksums.composite.valid is False
    assert checksums.overall_valid is False
    assert any("Document Number Checksum" in err for err in errors)


def test_tampered_expiration_date_fails_checksum():
    # Alter expiry from 120415 to 120416 without changing check digit
    tampered_line2 = "L898902C36UTO7408122F1204169ZE184226B<<<<<10"
    fields, checksums, errors = parse_td3_passport([VALID_ICAO_TD3_LINE1, tampered_line2])
    
    assert checksums.expiration_date.valid is False
    assert checksums.overall_valid is False
    assert any("Expiration Date Checksum" in err for err in errors)


# --------------------------------------------------------------------------
# 3. Date Logic & Temporal Validation Tests
# --------------------------------------------------------------------------
def test_expired_document_detected():
    # Reference date is 2026-09-15. Expiry '120415' (2012-04-15) is expired.
    result = validate_mrz_dates("740812", "120415", reference_date=date(2026, 9, 15))
    assert result.is_expired is True
    assert result.days_until_expiry is not None and result.days_until_expiry < 0
    assert any("expired" in err.lower() for err in result.errors)


def test_future_valid_document_date_logic():
    # DOB: 1990-05-20, Expiry: 2030-08-15
    result = validate_mrz_dates("900520", "300815", reference_date=date(2026, 9, 15))
    assert result.dob_valid is True
    assert result.is_expired is False
    assert result.age == 36
    assert result.days_until_expiry is not None and result.days_until_expiry > 0
    assert len(result.errors) == 0


def test_invalid_future_dob_flagged():
    # DOB: '261215' -> 2026-12-15 relative to September 15, 2026 (future date)
    result = validate_mrz_dates("261215", "300815", reference_date=date(2026, 9, 15))
    assert result.dob_valid is False
    assert any("future" in err.lower() for err in result.errors)


# --------------------------------------------------------------------------
# 4. TD1 ID Card Parser Test
# --------------------------------------------------------------------------
def test_parse_td1_id_card():
    # Official TD1 ID Card format (3 lines of 30)
    l1 = "I<UTOD231458907<<<<<<<<<<<<<<<"
    l2 = "7408122F1204159UTO<<<<<<<<<<<8"
    l3 = "ERIKSSON<<ANNA<MARIA<<<<<<<<<<"
    
    fields, checksums, _ = parse_td1_id_card([l1, l2, l3])
    assert fields.document_type == "I"
    assert fields.document_number == "D23145890"
    assert fields.surname == "ERIKSSON"
    assert checksums.document_number.valid is True
    assert checksums.date_of_birth.valid is True
    assert checksums.expiration_date.valid is True


# --------------------------------------------------------------------------
# 5. FastAPI Endpoint /extract-and-validate Integration Tests
# --------------------------------------------------------------------------
def test_endpoint_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "Phase 1" in data["phase"]


def test_endpoint_with_valid_future_mrz_json():
    future_mrz = make_valid_future_td3()
    resp = client.post("/extract-and-validate", json={"mrz_text": future_mrz})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "PASS"
    assert data["mrz_detected"] is True
    assert data["format"] == "TD3"
    assert data["checksums"]["overall_valid"] is True
    assert data["date_validation"]["is_expired"] is False
    assert data["confidence_score"] >= 90


def test_endpoint_with_tampered_mrz_json():
    tampered_mrz = (
        f"{VALID_ICAO_TD3_LINE1}\n"
        "M898902C36UTO7408122F1204159ZE184226B<<<<<10"  # altered doc number
    )
    resp = client.post("/extract-and-validate", json={"mrz_text": tampered_mrz})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "FAIL"
    assert data["checksums"]["overall_valid"] is False
    assert len(data["errors"]) > 0


def test_endpoint_with_multipart_image_upload():
    future_mrz = make_valid_future_td3()
    image_bytes = create_synthetic_passport_image(future_mrz)

    resp = client.post(
        "/extract-and-validate",
        files={"file": ("passport.png", image_bytes, "image/png")},
        data={"document_type": "passport"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["mrz_detected"] is True
    assert "checksums" in data
