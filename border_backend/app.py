"""
AI-Based Border Checkpoint Screening Engine - FastAPI Backend (Production Grade)
Orchestrates:
- Module 1 & 2: OCR & ICAO 9303 MRZ Engine & Date Validator (with Fail-Fast Short-Circuit)
- Module 3: OpenCV ELA, Laplacian Noise Consistency & Visual Tampering Bounding Box Mapper
- Module 4: OpenCV Face Extraction, Cosine Similarity Biometric Matcher & Anti-Spoofing
- Tiered Risk Fusion Engine: Tier A Deterministic Overrides vs. Tier B Probabilistic Scoring
- Tamper-Evident SHA-256 Hash-Chained Audit Ledger
"""
from __future__ import annotations

import base64
import time
from datetime import datetime, timezone
from typing import Optional
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from border_backend.models import (
    AuditChainEntry,
    BorderVerificationRequestJson,
    BorderVerificationResponse,
    ElaMetrics,
    ExtractAndValidateRequestJson,
    ExtractAndValidateResponse,
    FaceDetectionResult,
    NoiseMetrics,
    RiskFusionDecision,
    TamperingAnalysisResult,
    TamperingBoundingBox,
)
from border_backend.modules.audit_ledger import record_audit_entry, AuditLedger
from border_backend.modules.face_liveness import process_face_and_liveness
from border_backend.modules.mrz_engine import process_and_validate_mrz
from border_backend.modules.risk_fusion import evaluate_risk_fusion
from border_backend.modules.tampering_detector import analyze_document_tampering

app = FastAPI(
    title="AI-Based Border Checkpoint & Identity Document Screening System",
    description="Deterministic ICAO 9303 MRZ extraction, OpenCV ELA tampering detection, Cosine Similarity facial biometrics, and Tiered Risk Fusion with Fail-Fast execution.",
    version="2.1.0",
)

# CORS Policy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AI-Based Border Checkpoint Screening System",
        "version": "2.1.0",
        "phase": "Phase 1-4 Production Grade: Modules 1-4 + Tiered Risk Fusion + Audit Ledger",
        "capabilities": [
            "ICAO_9303_MRZ_TD1",
            "ICAO_9303_MRZ_TD2",
            "ICAO_9303_MRZ_TD3",
            "7_3_1_CHECKSUMS",
            "FAIL_FAST_SHORT_CIRCUIT",
            "OPENCV_ERROR_LEVEL_ANALYSIS",
            "LAPLACIAN_NOISE_CONSISTENCY",
            "VISUAL_TAMPERING_COORDINATE_MAPPING",
            "BIOMETRIC_FACE_EXTRACTION",
            "COSINE_SIMILARITY_MATCHING",
            "PASSIVE_ANTI_SPOOFING",
            "TIER_A_B_RISK_FUSION",
            "HASH_CHAINED_AUDIT_LEDGER",
        ],
    }


@app.get("/audit-ledger")
def get_audit_ledger():
    """Returns the cryptographic hash-chained audit ledger chain and verification status."""
    ledger = AuditLedger.get_instance()
    return {
        "chain_length": len(ledger.chain),
        "is_valid": ledger.verify_integrity(),
        "latest_block": ledger.get_latest_block(),
        "chain": ledger.chain[-20:],  # Return up to 20 recent blocks
    }


@app.post("/extract-and-validate", response_model=ExtractAndValidateResponse)
async def extract_and_validate_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(None),
    document_type: Optional[str] = Form("passport"),
):
    """Module 1 & 2 Dedicated Endpoint for MRZ & Date Validation."""
    content_type = request.headers.get("content-type", "")

    if "application/json" in content_type:
        try:
            body = await request.json()
            payload = ExtractAndValidateRequestJson(**body)
            doc_type = payload.document_type or "passport"

            if payload.mrz_text:
                return process_and_validate_mrz(payload.mrz_text, doc_type)
            elif payload.image_base64:
                b64_clean = payload.image_base64.split(",")[-1]
                raw_bytes = base64.b64decode(b64_clean)
                return process_and_validate_mrz(raw_bytes, doc_type)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="JSON payload must supply either 'mrz_text' or 'image_base64'."
                )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid JSON request: {exc}")

    if file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Multipart request must include a document image under form field 'file'."
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    return process_and_validate_mrz(file_bytes, document_type or "passport")


@app.post("/verify-border-document", response_model=BorderVerificationResponse)
async def verify_border_document_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(None),
    live_selfie: Optional[UploadFile] = File(None),
    mrz_text: Optional[str] = Form(None),
    document_type: Optional[str] = Form("passport"),
    officer_id: Optional[str] = Form("OFFICER-7749"),
    station_id: Optional[str] = Form("CP-DEL-04"),
    enable_fail_fast: Optional[bool] = Form(True),
):
    """
    Master Border Checkpoint Screening Endpoint (with Fail-Fast & Audit Ledger):
    Executes full 4-module forensic pipeline and outputs Tiered Risk Fusion Decision.
    """
    start_time = time.perf_counter()
    content_type = request.headers.get("content-type", "")
    doc_bytes: Optional[bytes] = None
    selfie_bytes: Optional[bytes] = None
    mrz_text_input: Optional[str] = None
    doc_type = document_type or "passport"
    active_officer = officer_id or "OFFICER-7749"
    active_station = station_id or "CP-DEL-04"
    fail_fast_enabled = enable_fail_fast if enable_fail_fast is not None else True

    # 1. Parse Input from JSON or Multipart
    if "application/json" in content_type:
        try:
            body = await request.json()
            payload = BorderVerificationRequestJson(**body)
            doc_type = payload.document_type or doc_type
            active_officer = payload.officer_id or active_officer
            active_station = payload.station_id or active_station
            mrz_text_input = payload.mrz_text
            fail_fast_enabled = payload.enable_fail_fast

            if payload.image_base64:
                b64_clean = payload.image_base64.split(",")[-1]
                doc_bytes = base64.b64decode(b64_clean)
            if payload.live_selfie_base64:
                b64_s_clean = payload.live_selfie_base64.split(",")[-1]
                selfie_bytes = base64.b64decode(b64_s_clean)
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid JSON request: {exc}")
    else:
        if file is not None:
            doc_bytes = await file.read()
        if live_selfie is not None:
            selfie_bytes = await live_selfie.read()
        if mrz_text is not None:
            mrz_text_input = mrz_text

    if not doc_bytes and not mrz_text_input:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request must provide document image (file upload or 'image_base64') or 'mrz_text'."
        )

    # 2. Module 1 & 2: OCR & ICAO 9303 Checksum Engine
    if doc_bytes:
        mrz_result = process_and_validate_mrz(doc_bytes, doc_type)
    else:
        mrz_result = process_and_validate_mrz(mrz_text_input or "", doc_type)

    # --- FAIL-FAST SHORT-CIRCUIT GATE ---
    # If MRZ checksum fails or document is expired, immediately return High Risk
    # without expending CPU cycles on OpenCV ELA or heavy face models
    is_mrz_corrupt = (mrz_result.checksums and not mrz_result.checksums.overall_valid)
    is_expired = (mrz_result.date_validation and mrz_result.date_validation.is_expired)

    if fail_fast_enabled and (is_mrz_corrupt or is_expired):
        fail_fast_triggered = True
        tampering_result = TamperingAnalysisResult(
            tampering_detected=True if is_mrz_corrupt else False,
            photo_swap_risk="LOW",
            splicing_detected=False,
            risk_score=95 if is_mrz_corrupt else 85,
            ela=ElaMetrics(mean_ela=0.0, peak_ela=0.0, tampered_pixel_ratio=0.0),
            noise=NoiseMetrics(full_noise_var=0.0, photo_noise_var=0.0, bg_noise_var=0.0, noise_ratio=1.0, is_disparate=False),
            tampering_boxes=[],
            anomalies=["Bypassed: Fail-Fast Short-Circuit triggered by Tier A fatal check."],
            summary="Fail-Fast Triggered: Analysis short-circuited due to fatal ICAO checksum or expiration violation.",
        )
        biometric_result = FaceDetectionResult(
            face_detected=False,
            face_count=0,
            sharpness_score=0.0,
            glare_score=0.0,
            liveness_score=0,
            status="NO_FACE_DETECTED",
            flags=["Biometrics bypassed via Fail-Fast trigger."],
            summary="Biometric verification bypassed: Document failed deterministic gate.",
        )
        decision_result = evaluate_risk_fusion(mrz_result, tampering_result, biometric_result)

        # Cryptographic Audit Trail Record
        audit_entry = record_audit_entry(
            document_bytes=doc_bytes,
            decision=decision_result.decision,
            risk_score=decision_result.risk_score,
            station_id=active_station,
            officer_id=active_officer,
            fallback_mrz_text=mrz_text_input,
        )

        exec_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
        now_iso = datetime.now(timezone.utc).isoformat()

        return BorderVerificationResponse(
            status="FAILED",
            timestamp=now_iso,
            station_id=active_station,
            officer_id=active_officer,
            document_type=doc_type,
            decision=decision_result,
            module_1_2_mrz=mrz_result,
            module_3_tampering=tampering_result,
            module_4_biometrics=biometric_result,
            visual_highlights=[],
            audit_entry=audit_entry,
            fail_fast_triggered=True,
            execution_time_ms=exec_ms,
        )

    # 3. Module 4: Face Verification, Cosine Similarity & Anti-Spoofing Screening
    if doc_bytes:
        biometric_result = process_face_and_liveness(doc_bytes, selfie_bytes)
        face_bbox = biometric_result.bbox
    else:
        biometric_result = FaceDetectionResult(
            face_detected=False,
            face_count=0,
            sharpness_score=0.0,
            glare_score=0.0,
            liveness_score=0,
            status="NO_FACE_DETECTED",
            flags=["Biometrics skipped: text-only MRZ input."],
            summary="Biometrics bypassed (no specimen image).",
        )
        face_bbox = None

    # 4. Module 3: OpenCV ELA, Laplacian Noise Consistency & Visual Coordinate Mapping
    if doc_bytes:
        tampering_result = analyze_document_tampering(doc_bytes, face_bbox)
    else:
        tampering_result = TamperingAnalysisResult(
            tampering_detected=False,
            photo_swap_risk="LOW",
            splicing_detected=False,
            risk_score=0,
            ela=ElaMetrics(mean_ela=0.0, peak_ela=0.0, tampered_pixel_ratio=0.0),
            noise=NoiseMetrics(
                full_noise_var=0.0,
                photo_noise_var=0.0,
                bg_noise_var=0.0,
                noise_ratio=1.0,
                is_disparate=False,
            ),
            tampering_boxes=[],
            anomalies=[],
            summary="Tampering analysis skipped (text-only input).",
        )

    # 5. Tiered Risk Fusion Engine
    decision_result = evaluate_risk_fusion(mrz_result, tampering_result, biometric_result)

    # 6. Collate Visual Inspection Highlights
    visual_highlights: list[TamperingBoundingBox] = []
    visual_highlights.extend(tampering_result.tampering_boxes)

    # Add isolated face crop highlight if detected
    if biometric_result.bbox:
        fb = biometric_result.bbox
        visual_highlights.append(
            TamperingBoundingBox(
                x=fb[0],
                y=fb[1],
                width=fb[2],
                height=fb[3],
                label="ISOLATED BIOMETRIC PORTRAIT",
                confidence=0.98,
                color="#06b6d4",
            )
        )

    # 7. Record Cryptographic Tamper-Evident Audit Ledger Block
    audit_entry = record_audit_entry(
        document_bytes=doc_bytes,
        decision=decision_result.decision,
        risk_score=decision_result.risk_score,
        station_id=active_station,
        officer_id=active_officer,
        fallback_mrz_text=mrz_text_input,
    )

    # 8. Overall Status Determination
    overall_status = "SUCCESS"
    if decision_result.decision == "HOLD_FOR_MANUAL_INSPECTION":
        overall_status = "FAILED"
    elif decision_result.decision == "SECONDARY_INSPECTION":
        overall_status = "WARNING"

    now_iso = datetime.now(timezone.utc).isoformat()
    exec_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

    return BorderVerificationResponse(
        status=overall_status,
        timestamp=now_iso,
        station_id=active_station,
        officer_id=active_officer,
        document_type=doc_type,
        decision=decision_result,
        module_1_2_mrz=mrz_result,
        module_3_tampering=tampering_result,
        module_4_biometrics=biometric_result,
        visual_highlights=visual_highlights,
        audit_entry=audit_entry,
        fail_fast_triggered=False,
        execution_time_ms=exec_ms,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("border_backend.app:app", host="0.0.0.0", port=8000, reload=True)
