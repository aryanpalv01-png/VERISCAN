import pytest
import cv2
import numpy as np
from fastapi.testclient import TestClient
from backend.main import app, compute_mrz_checksum_parity, forensic_pixel_deep_inspection

client = TestClient(app)


def test_home_endpoint():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json() == {"status": "VeriScan Ultra-Accuracy Forensic Engine Online"}


def test_compute_mrz_checksum_parity_short():
    res = compute_mrz_checksum_parity("TOO_SHORT")
    assert res["valid"] is False
    assert "Insufficient MRZ length" in res["reason"]


def test_compute_mrz_checksum_parity_valid():
    sample = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F3204153ZE184226B<<<<<16"
    res = compute_mrz_checksum_parity(sample)
    assert res["valid"] is True
    assert "7-3-1 Weight Matrix Matched" in res["checksum_parity"]


def test_forensic_pixel_deep_inspection_corrupted():
    res = forensic_pixel_deep_inspection(b"unreadable_corrupted_payload", "Passport")
    assert res["tampered"] is True
    assert res["score"] == 99.0
    assert "Unreadable" in res["reason"]


def test_forensic_pixel_deep_inspection_clean():
    # Normal image with good natural variance
    img = np.random.randint(60, 180, (200, 300, 3), dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", img)
    res = forensic_pixel_deep_inspection(buf.tobytes(), "Passport")
    assert "tampered" in res
    assert "compression_anomaly_score" in res
    assert "sharpness_variance" in res
    assert "forensic_status" in res


def test_verify_border_document_passport_clear():
    img = np.full((300, 500, 3), 220, dtype=np.uint8)
    cv2.putText(img, "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<", (10, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
    cv2.putText(img, "L898902C36UTO7408122F3204153ZE184226B<<<<<16", (10, 270), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
    img = cv2.GaussianBlur(img, (3, 3), 0.8)
    _, buf = cv2.imencode(".jpg", img)

    res = client.post(
        "/verify-border-document",
        files={"file": ("passport.jpg", buf.tobytes(), "image/jpeg")},
        data={"doc_type": "Passport"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["document_type"] == "Passport"
    assert data["verdict"] == "CLEAR_ENTRY"
    assert data["trust_score"] >= 75
    assert data["modules_breakdown"]["module_2_validation"]["valid"] is True
    assert "7-3-1 Weight Matrix Matched" in data["modules_breakdown"]["module_2_validation"]["checksum_parity"]


def test_verify_border_document_national_id():
    img = np.full((300, 500, 3), 220, dtype=np.uint8)
    cv2.putText(img, "GOVERNMENT OF INDIA UNIQUE IDENTIFICATION AADHAAR CARD NUMBER 1234 5678 9012", (10, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 0), 1)
    _, buf = cv2.imencode(".jpg", img)

    res = client.post(
        "/verify-border-document",
        files={"file": ("national_id.jpg", buf.tobytes(), "image/jpeg")},
        data={"doc_type": "National ID"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["document_type"] == "National ID"
    assert "checksum_parity" in data["modules_breakdown"]["module_2_validation"]


def test_verify_border_document_tampered_blur():
    img = np.full((200, 200, 3), 128, dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", img)

    res = client.post(
        "/verify-border-document",
        files={"file": ("flat.jpg", buf.tobytes(), "image/jpeg")},
        data={"doc_type": "Passport"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["verdict"] == "HOLD_FOR_MANUAL_INSPECTION"
    assert data["trust_score"] < 75
    assert data["modules_breakdown"]["module_3_tampering"]["tampered"] is True
    assert ("FORGERY" in data["modules_breakdown"]["module_3_tampering"]["forensic_status"] or
            "VETOED" in data["modules_breakdown"]["module_3_tampering"]["forensic_status"])


def test_screenshot_resolution_adjustment():
    # 1080x1920 standard screenshot resolution
    img = np.full((1920, 1080, 3), 230, dtype=np.uint8)
    cv2.putText(img, "AADHAAR CARD UNIQUE IDENTIFICATION GOVERNMENT OF INDIA", (50, 400), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2)
    cv2.putText(img, "1234 5678 9012", (50, 500), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (20, 20, 20), 2)
    img = cv2.GaussianBlur(img, (3, 3), 0.5)
    _, buf = cv2.imencode(".jpg", img)

    res = forensic_pixel_deep_inspection(buf.tobytes(), "National ID")
    assert res["screenshot_detected"] is True
    assert res["resolution_adjusted"] is True
    assert res["tampered"] is False


def test_mrz_single_digit_spliced_tamper():
    # Valid line 2: L898902C36UTO7408122F3204153ZE184226B<<<<<16
    # Tampered: L898902C37UTO... (check digit 6 altered to 7)
    tampered_mrz = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C37UTO7408122F3204153ZE184226B<<<<<16"
    res = compute_mrz_checksum_parity(tampered_mrz)
    assert res["valid"] is False
    assert res["checksum_parity"] == "PARITY_FAIL_SPLICED_DIGITS"


def test_republic_of_aravasa_fails_tier_a_hard_override():
    # Critical test: Republic of Aravasa document must fail ISO 3166-1 whitelist,
    # score below 40 (in fact <= 15 via early-return Tier A veto), and return HOLD_FOR_MANUAL_INSPECTION.
    img = np.full((350, 500, 3), 235, dtype=np.uint8)
    cv2.putText(img, "PASSPORT REPUBLIC OF ARAVASA", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (10, 10, 10), 2)
    cv2.putText(img, "NATIONAL IDENTITY AUTHORITY", (20, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (10, 10, 10), 1)
    cv2.putText(img, "P<ARVTESTER<<JOHN<DOE<<<<<<<<<<<<<<<<<<<<<<<", (20, 270), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (10, 10, 10), 1)
    cv2.putText(img, "A123456784ARV8501014M3001018<<<<<<<<<<<<<<04", (20, 300), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (10, 10, 10), 1)
    img = cv2.GaussianBlur(img, (3, 3), 0.6)
    _, buf = cv2.imencode(".jpg", img)

    res = client.post(
        "/verify-border-document",
        files={"file": ("aravasa_passport.jpg", buf.tobytes(), "image/jpeg")},
        data={"doc_type": "Passport", "country_hint": "Republic of Aravasa"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    # MUST score below 40 and return HOLD_FOR_MANUAL_INSPECTION, not 74/Needs Review
    assert data["trust_score"] < 40
    assert data["trust_score"] <= 15
    assert data["verdict"] == "HOLD_FOR_MANUAL_INSPECTION"
    assert data["tier_a_override"] is True
    assert "CRITICAL_TIER_A" in data["tier_a_failure_reason"]


def test_structural_template_matching_cap():
    from backend.template_matcher import evaluate_structural_template
    # A blank or wrong-proportioned image (aspect ratio 3.5) violates template
    img = np.full((100, 350, 3), 200, dtype=np.uint8)
    res = evaluate_structural_template(img, "Passport")
    assert res["template_matched"] is False
    assert res["capped_max_score"] == 45


def test_copy_move_detection_opencv():
    from backend.forensic_cv import detect_copy_move_forgery
    # Create image with cloned patch
    img = np.random.randint(100, 200, (400, 400), dtype=np.uint8)
    # Paste an identical complex patch in two distinct locations
    patch = np.random.randint(20, 240, (80, 80), dtype=np.uint8)
    img[40:120, 40:120] = patch
    img[220:300, 220:300] = patch
    res = detect_copy_move_forgery(img)
    assert "copy_move_detected" in res
    assert "cloned_clusters_count" in res


def test_font_stroke_consistency_opencv():
    from backend.forensic_cv import inspect_font_stroke_consistency
    # Clean document with uniform text
    img = np.full((200, 500), 245, dtype=np.uint8)
    for i in range(5):
        cv2.putText(img, "STANDARD UNIFORM BORDER SCREENING SPECIMEN", (20, 35 + i * 35), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    res = inspect_font_stroke_consistency(img)
    assert "consistent" in res
    assert "stroke_variance" in res


def test_cnn_forensic_multi_class_inference():
    from backend.cnn_forensic import run_cnn_forensic_classification
    # Test realistic document image
    img = np.full((600, 800, 3), 245, dtype=np.uint8)
    for y in range(40, 560, 40):
        cv2.line(img, (20, y), (780, y), (230, 235, 240), 1)
    cv2.rectangle(img, (50, 100), (250, 350), (180, 180, 180), -1)
    cv2.putText(img, "REPUBLIC OF UTOPIA PASSPORT", (280, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (30, 30, 30), 2)
    cv2.putText(img, "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<", (50, 480), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (20, 20, 20), 2)
    cv2.putText(img, "L898902C36UTO7408122F1204159ZE184226B<<<<<10", (50, 520), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (20, 20, 20), 2)

    res = run_cnn_forensic_classification(img, doc_type="Passport")
    assert "tamper_probability" in res
    assert "predicted_type" in res
    assert "model_confidence" in res
    assert "class_probabilities" in res
    assert "inference_latency_ms" in res

    # 1. Verify all 5 classes exist
    expected_classes = {
        "PRISTINE_REAL",
        "PHOTO_REPLACEMENT",
        "TEXT_TAMPERING",
        "STAMP_OR_SEAL_ANOMALY",
        "SCREENSHOT_RECOMPRESSION"
    }
    assert set(res["class_probabilities"].keys()) == expected_classes

    # 2. Verify probability sum ~ 1.0
    prob_sum = sum(res["class_probabilities"].values())
    assert abs(prob_sum - 1.0) < 0.02

    # 3. Verify CPU inference latency is strictly under 100ms
    assert res["inference_latency_ms"] < 100.0


def test_verify_border_document_includes_cnn_telemetry():
    img = np.full((300, 500, 3), 220, dtype=np.uint8)
    cv2.putText(img, "GOVERNMENT OF INDIA UNIQUE IDENTIFICATION AADHAAR CARD NUMBER 1234 5678 9012", (10, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 0), 1)
    _, buf = cv2.imencode(".jpg", img)

    response = client.post(
        "/verify-border-document",
        files={"file": ("id.jpg", buf.tobytes(), "image/jpeg")},
        data={"doc_type": "National ID", "country_hint": "INDIA"}
    )
    assert response.status_code == 200
    data = response.json()
    mod3 = data["modules_breakdown"]["module_3_tampering"]
    assert "cnn_forensics" in mod3
    cnn = mod3["cnn_forensics"]
    assert "predicted_type" in cnn
    assert "tamper_probability" in cnn
    assert "inference_latency_ms" in cnn
    assert cnn["inference_latency_ms"] < 100.0


def test_verify_border_document_driving_license_not_static_at_10():
    """Verify that Driving License does NOT get stuck at static score 10 and executes full forensics."""
    img = np.random.randint(230, 245, (350, 550, 3), dtype=np.uint8)
    cv2.putText(img, "UNION DRIVING LICENCE", (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (20, 20, 20), 2)
    cv2.putText(img, "TRANSPORT DEPARTMENT DELHI", (30, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (20, 20, 20), 1)
    cv2.putText(img, "DL NO: DL-0420110012345", (30, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (20, 20, 20), 2)
    cv2.putText(img, "NAME: RAJESH SHARMA", (30, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (20, 20, 20), 1)
    cv2.putText(img, "DOB: 15/08/1990  VALID: 2038", (30, 170), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (20, 20, 20), 1)
    photo = np.random.randint(50, 200, (180, 140, 3), dtype=np.uint8)
    img[80:260, 380:520] = photo
    img = cv2.GaussianBlur(img, (3, 3), 0.5)
    _, buf = cv2.imencode(".jpg", img)

    response = client.post(
        "/verify-border-document",
        files={"file": ("driving_licence.jpg", buf.tobytes(), "image/jpeg")},
        data={"doc_type": "Driving License"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    # CRITICAL: Must NOT be static at 10 or 15!
    assert data["trust_score"] > 15
    assert data["tier_a_override"] is False
    assert data["modules_breakdown"]["module_2_validation"]["valid"] is True
    # Module 3 must contain full CV telemetry
    mod3 = data["modules_breakdown"]["module_3_tampering"]
    assert "compression_anomaly_score" in mod3
    assert "sharpness_variance" in mod3
    assert "cnn_forensics" in mod3
    assert "copy_move_analysis" in mod3
    assert "font_stroke_analysis" in mod3


def test_verify_border_document_driving_license_regional_authority():
    """Verify that a DL without explicit sovereign country name is handled as regional authority, not rejected with 10."""
    img = np.random.randint(230, 245, (350, 550, 3), dtype=np.uint8)
    cv2.putText(img, "DRIVER LICENSE", (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (20, 20, 20), 2)
    cv2.putText(img, "LIC: 9876543210", (30, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (20, 20, 20), 2)
    cv2.putText(img, "NAME: JANE DOE", (30, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (20, 20, 20), 1)
    cv2.putText(img, "DOB: 01/01/1992  EXPIRES: 2030", (30, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (20, 20, 20), 1)
    photo = np.random.randint(50, 200, (180, 140, 3), dtype=np.uint8)
    img[80:260, 380:520] = photo
    img = cv2.GaussianBlur(img, (3, 3), 0.5)
    _, buf = cv2.imencode(".jpg", img)

    response = client.post(
        "/verify-border-document",
        files={"file": ("driver_license.jpg", buf.tobytes(), "image/jpeg")},
        data={"doc_type": "Driving License"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    # Must NOT fail Tier A with unauthorized issuer (score 10)
    assert data["tier_a_override"] is False
    assert data["trust_score"] != 10
    assert data["modules_breakdown"]["module_2_validation"]["valid"] is True
    assert data["modules_breakdown"]["module_3_tampering"]["issuer_verification"]["valid"] is True


def test_verify_border_document_pan_card_auto_detect():
    """Verify that PAN Card is auto-detected and scores dynamically, not rejected with 10."""
    img = np.random.randint(230, 245, (320, 500, 3), dtype=np.uint8)
    cv2.putText(img, "INCOME TAX DEPARTMENT", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (10, 10, 10), 2)
    cv2.putText(img, "GOVT. OF INDIA", (20, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (10, 10, 10), 1)
    cv2.putText(img, "Permanent Account Number", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (10, 10, 10), 1)
    cv2.putText(img, "ABCDE1234F", (20, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (10, 10, 10), 2)
    cv2.putText(img, "NAME: VIKRAM MALHOTRA", (20, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (10, 10, 10), 1)
    photo = np.random.randint(50, 200, (140, 110, 3), dtype=np.uint8)
    img[80:220, 360:470] = photo
    img = cv2.GaussianBlur(img, (3, 3), 0.5)
    _, buf = cv2.imencode(".jpg", img)

    response = client.post(
        "/verify-border-document",
        files={"file": ("pan_card.jpg", buf.tobytes(), "image/jpeg")},
        data={"doc_type": "Auto-Detect"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["document_type"] == "PAN Card"
    assert data["tier_a_override"] is False
    assert data["trust_score"] > 15
    assert data["modules_breakdown"]["module_2_validation"]["valid"] is True


def test_verify_border_document_pan_declared_as_passport_overrides_to_pan():
    """Verify that uploading a PAN Card while declared type is default Passport auto-resolves to PAN Card."""
    img = np.random.randint(230, 245, (320, 500, 3), dtype=np.uint8)
    cv2.putText(img, "INCOME TAX DEPARTMENT", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (10, 10, 10), 2)
    cv2.putText(img, "Permanent Account Number", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (10, 10, 10), 1)
    cv2.putText(img, "ABCDE1234F", (20, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (10, 10, 10), 2)
    photo = np.random.randint(50, 200, (140, 110, 3), dtype=np.uint8)
    img[80:220, 360:470] = photo
    img = cv2.GaussianBlur(img, (3, 3), 0.5)
    _, buf = cv2.imencode(".jpg", img)

    response = client.post(
        "/verify-border-document",
        files={"file": ("my_pan.jpg", buf.tobytes(), "image/jpeg")},
        data={"doc_type": "Passport"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["document_type"] == "PAN Card"
    assert data["tier_a_override"] is False
    assert data["trust_score"] > 15


def test_verify_border_document_empty_payload_rejected():
    """Verify that uploading zero or near-zero byte payload triggers explicit HTTP 400 error."""
    response = client.post(
        "/verify-border-document",
        files={"file": ("empty.jpg", b"", "image/jpeg")},
        data={"doc_type": "Passport"}
    )
    assert response.status_code == 400
    assert "EMPTY_FILE_PAYLOAD" in response.json()["detail"]


def test_verify_border_document_corrupted_raster_rejected():
    """Verify that uploading unparseable binary stream triggers explicit HTTP 422 error."""
    response = client.post(
        "/verify-border-document",
        files={"file": ("corrupt.jpg", b"NOT_A_VALID_RASTER_IMAGE_DATA_1234567890", "image/jpeg")},
        data={"doc_type": "Passport"}
    )
    assert response.status_code == 422
    assert "IMAGE_DECODING_FAILURE" in response.json()["detail"]


def test_compute_mrz_checksum_parity_fuzzy_ocr_recovery():
    """Verify that common OCR confusion characters ('O' vs '0', 'I' vs '1') are corrected in numeric slots."""
    # Valid line 2: L898902C36UTO7408122F3204153ZE184226B<<<<<16
    # Simulated OCR noise: '7408122' read as '74O8122' ('O' in place of '0')
    noisy_mrz = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO74O8122F3204153ZE184226B<<<<<16"
    res = compute_mrz_checksum_parity(noisy_mrz)
    assert res["valid"] is True
    assert "7-3-1 Weight Matrix Matched" in res["checksum_parity"]


def test_verify_border_document_generic_unrecognized_fails():
    """Verify that a generic text document without any recognized ID structure fails validation and scores < 40."""
    img = np.random.randint(230, 245, (300, 450, 3), dtype=np.uint8)
    cv2.putText(img, "SUPERMARKET GROCERY STORE RECEIPT", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (10, 10, 10), 1)
    cv2.putText(img, "TOTAL ITEMS: 5  TAX PAID: 12.50", (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (10, 10, 10), 1)
    cv2.putText(img, "THANK YOU FOR SHOPPING WITH US", (20, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (10, 10, 10), 1)
    _, buf = cv2.imencode(".jpg", img)

    response = client.post(
        "/verify-border-document",
        files={"file": ("receipt.jpg", buf.tobytes(), "image/jpeg")},
        data={"doc_type": "Auto-Detect"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    # Unrecognized structure MUST fail validation
    assert data["modules_breakdown"]["module_2_validation"]["valid"] is False
    # Score MUST drop below 40 and result in unequivocal HOLD_FOR_MANUAL_INSPECTION
    assert data["trust_score"] < 40
    assert data["verdict"] == "HOLD_FOR_MANUAL_INSPECTION"

