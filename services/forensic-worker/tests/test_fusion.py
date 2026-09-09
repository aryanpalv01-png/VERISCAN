from __future__ import annotations

import pytest
from modules.fusion_engine import fuse_scores


def test_fusion_verified_high_score():
    checks = [
        {"checkName": "checksum_validation", "result": "pass", "confidence": 99},
        {"checkName": "qr_signature_verification", "result": "pass", "confidence": 98},
        {"checkName": "ela_compression_analysis", "result": "pass", "confidence": 90},
        {"checkName": "copy_move_clone_detection", "result": "pass", "confidence": 88},
        {"checkName": "metadata_exif_inspection", "result": "pass", "confidence": 88},
    ]

    report = fuse_scores(checks)
    assert report["status"] == "verified"
    assert report["verdict"] == "Verified"
    assert report["score"] > 80
    assert report["hard_fail"] is False


def test_fusion_hard_fail_override_on_checksum_flag():
    # Even if all image-level AI models return 100% pass, a checksum failure is mathematical proof of invalidity!
    checks = [
        {"checkName": "checksum_validation", "result": "flag", "confidence": 5, "explanation": "Invalid Verhoeff digit"},
        {"checkName": "ela_compression_analysis", "result": "pass", "confidence": 95},
        {"checkName": "copy_move_clone_detection", "result": "pass", "confidence": 95},
        {"checkName": "trufor_inference", "result": "pass", "confidence": 95},
        {"checkName": "catnet_inference", "result": "pass", "confidence": 95},
    ]

    report = fuse_scores(checks)
    # MUST be likely_forged and score strictly < 40!
    assert report["hard_fail"] is True
    assert report["status"] == "likely_forged"
    assert report["verdict"] == "Likely Forged"
    assert report["score"] < 40


def test_fusion_hard_fail_override_on_qr_flag():
    checks = [
        {"checkName": "qr_signature_verification", "result": "flag", "confidence": 5, "explanation": "Invalid digital signature"},
        {"checkName": "metadata_exif_inspection", "result": "pass", "confidence": 90},
        {"checkName": "ela_compression_analysis", "result": "pass", "confidence": 85},
    ]

    report = fuse_scores(checks)
    assert report["hard_fail"] is True
    assert report["status"] == "likely_forged"
    assert report["score"] < 40


def test_fusion_needs_review_threshold():
    # Mixed signals: some pass, some moderate flags, without hard fail
    checks = [
        {"checkName": "metadata_exif_inspection", "result": "flag", "confidence": 35, "explanation": "Derivative file"},
        {"checkName": "ela_compression_analysis", "result": "flag", "confidence": 45, "explanation": "Slight recompression"},
        {"checkName": "screenshot_capture_detection", "result": "pass", "confidence": 80},
    ]

    report = fuse_scores(checks)
    assert report["status"] == "needs_review"
    assert 40 <= report["score"] <= 80
    assert report["hard_fail"] is False


def test_fusion_handles_not_applicable():
    checks = [
        {"checkName": "checksum_validation", "result": "not_applicable", "confidence": 0},
        {"checkName": "qr_signature_verification", "result": "not_applicable", "confidence": 0},
        {"checkName": "metadata_exif_inspection", "result": "pass", "confidence": 85},
        {"checkName": "ela_compression_analysis", "result": "pass", "confidence": 85},
    ]

    report = fuse_scores(checks)
    assert report["status"] == "verified"
    assert report["score"] > 80
    assert "checksum_validation" in report["not_applicable_checks"]


def test_fusion_unconfigured_neural_modules_zero_weight():
    # When neural models return 503 or unconfigured/missing weights,
    # they must get weight 0.0, be tracked in dormant_neural_checks,
    # and MUST NOT drag the genuine score down to neutral (50-70).
    checks = [
        {"checkName": "checksum_validation", "result": "pass", "confidence": 98},
        {"checkName": "qr_signature_verification", "result": "pass", "confidence": 96},
        {"checkName": "metadata_exif_inspection", "result": "pass", "confidence": 90},
        {"checkName": "trufor_inference", "result": "error", "confidence": None, "explanation": "503 Service Unavailable: missing local weights"},
        {"checkName": "catnet_inference", "result": "not_applicable", "confidence": 0, "explanation": "Model weights missing or uninitialized"},
        {"checkName": "ai_generated_image_detector", "result": "error", "confidence": None, "explanation": "Add HF_API_TOKEN to environment to run neural checks"},
    ]

    report = fuse_scores(checks)
    assert report["status"] == "verified"
    assert report["score"] >= 90
    assert report["active_modules_count"] == 3
    assert "trufor_inference" in report["dormant_neural_checks"]
    assert "catnet_inference" in report["dormant_neural_checks"]
    assert "ai_generated_image_detector" in report["dormant_neural_checks"]

    for c in report["checks"]:
        if c["checkName"] in ("trufor_inference", "catnet_inference", "ai_generated_image_detector"):
            assert c["result"] == "not_applicable"
            assert c["weight"] == 0.0
            assert c["effective_weight"] == 0.0


def test_fusion_null_and_missing_data_zero_deduction():
    # Extreme null/missing checks: 1 pristine verified pass, 8 completely null/missing checks
    checks = [
        {"checkName": "checksum_validation", "result": "pass", "confidence": 100},
        {"checkName": "qr_signature_verification", "result": None, "confidence": None},
        {"checkName": "ela_compression_analysis", "result": "not_applicable", "confidence": 0},
        {"checkName": "copy_move_clone_detection", "result": "error", "confidence": None},
        {"checkName": "metadata_exif_inspection", "result": "unknown", "confidence": None},
    ]

    report = fuse_scores(checks)
    # MUST NOT anchor to 50; must maintain pristine verified status (> 90) based on verified executed metric
    assert report["status"] == "verified"
    assert report["score"] >= 95
    assert report["active_modules_count"] == 1
    assert report["hard_fail"] is False


def test_fusion_tier_a_veto_strictly_sub_30():
    # Deterministic failure must clamp strictly below 30.0
    checks = [
        {"checkName": "checksum_validation", "result": "flag", "confidence": 5, "explanation": "Verhoeff check failure"},
        {"checkName": "ocr_typography_consistency", "result": "pass", "confidence": 99},
        {"checkName": "ela_compression_analysis", "result": "pass", "confidence": 99},
        {"checkName": "copy_move_clone_detection", "result": "pass", "confidence": 99},
    ]

    report = fuse_scores(checks)
    assert report["hard_fail"] is True
    assert report["tier_a_veto"] is True
    assert report["status"] == "likely_forged"
    assert report["verdict"] == "Likely Forged"
    assert report["score"] < 30.0
    assert 15.0 <= report["score"] <= 25.0


def test_fusion_pipeline_class_direct_usage():
    from modules.fusion_engine import VeriScanScoringPipeline
    pipeline = VeriScanScoringPipeline()
    checks = [
        {"checkName": "checksum_validation", "result": "pass", "confidence": 95},
        {"checkName": "ocr_typography_consistency", "result": "pass", "confidence": 90},
    ]
    res = pipeline.evaluate(checks)
    assert res["status"] == "verified"
    assert res["score"] >= 90


