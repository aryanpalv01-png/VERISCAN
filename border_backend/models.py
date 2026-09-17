"""
Border Checkpoint Screening System - Unified Data Models (Phases 1-4 Production Grade)
Includes:
- Fail-fast status flags and performance timing
- Module 3 Visual Tampering Bounding Box coordinates
- Module 4 Cosine Similarity metrics & anti-spoofing flags
- Cryptographic Hash-Chained Audit Ledger models
"""
from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field


# --- Module 1 & 2: MRZ & Date Validation Models ---

class ChecksumFieldResult(BaseModel):
    valid: bool
    extracted: str
    computed: str
    field_name: str


class MrzChecksums(BaseModel):
    document_number: ChecksumFieldResult
    date_of_birth: ChecksumFieldResult
    expiration_date: ChecksumFieldResult
    optional_data: Optional[ChecksumFieldResult] = None
    composite: ChecksumFieldResult
    overall_valid: bool


class DateValidationResult(BaseModel):
    dob_valid: bool
    dob_formatted: Optional[str] = None
    age: Optional[int] = None
    is_expired: bool
    expiry_formatted: Optional[str] = None
    days_until_expiry: Optional[int] = None
    expires_soon_warning: bool = False
    warnings: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


class ExtractedMrzFields(BaseModel):
    document_type: str
    issuing_country: str
    surname: str
    given_names: str
    document_number: str
    nationality: str
    date_of_birth: str
    sex: str
    expiration_date: str
    optional_data: Optional[str] = None


class ExtractAndValidateResponse(BaseModel):
    status: str = Field(description="'PASS' | 'FAIL' | 'REVIEW'")
    mrz_detected: bool
    format: Optional[str] = Field(default=None, description="'TD1' | 'TD2' | 'TD3' | 'UNKNOWN'")
    raw_mrz_lines: list[str] = Field(default_factory=list)
    fields: Optional[ExtractedMrzFields] = None
    checksums: Optional[MrzChecksums] = None
    date_validation: Optional[DateValidationResult] = None
    confidence_score: int = Field(ge=0, le=100)
    summary: str
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class ExtractAndValidateRequestJson(BaseModel):
    mrz_text: Optional[str] = None
    image_base64: Optional[str] = None
    document_type: Optional[str] = "passport"


# --- Module 3: Tampering, Photo-Swap & Coordinate Mapping Models ---

class TamperingBoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int
    label: str
    confidence: float
    color: str = "#ef4444"


class ElaMetrics(BaseModel):
    mean_ela: float
    peak_ela: float
    tampered_pixel_ratio: float
    heatmap_base64: Optional[str] = None


class NoiseMetrics(BaseModel):
    full_noise_var: float
    photo_noise_var: float
    bg_noise_var: float
    noise_ratio: float
    is_disparate: bool


class TamperingAnalysisResult(BaseModel):
    tampering_detected: bool
    photo_swap_risk: str = Field(description="'LOW' | 'ELEVATED' | 'HIGH'")
    splicing_detected: bool
    risk_score: int = Field(ge=0, le=100)
    ela: ElaMetrics
    noise: NoiseMetrics
    tampering_boxes: list[TamperingBoundingBox] = Field(default_factory=list)
    anomalies: list[str] = Field(default_factory=list)
    summary: str


# --- Module 4: Face Verification & Liveness Models ---

class CosineSimilarityMetrics(BaseModel):
    cosine_similarity: float
    cosine_distance: float
    match_verdict: str = Field(description="'MATCH' | 'NO_MATCH' | 'INCONCLUSIVE'")
    threshold: float = 0.72


class FaceDetectionResult(BaseModel):
    face_detected: bool
    face_count: int
    bbox: Optional[list[int]] = None  # [x, y, w, h]
    face_crop_base64: Optional[str] = None
    sharpness_score: float
    glare_score: float
    liveness_score: int = Field(ge=0, le=100)
    match_score: Optional[int] = Field(default=None, ge=0, le=100)
    cosine_metrics: Optional[CosineSimilarityMetrics] = None
    is_spoof_detected: bool = False
    anti_spoof_flags: list[str] = Field(default_factory=list)
    status: str = Field(description="'PASS' | 'SUSPICIOUS' | 'NO_FACE_DETECTED'")
    flags: list[str] = Field(default_factory=list)
    summary: str


# --- Cryptographic Hash-Chained Audit Ledger Models ---

class AuditChainEntry(BaseModel):
    block_height: int
    timestamp: str
    document_sha256: str
    decision: str
    risk_score: int
    station_id: str
    officer_id: str
    previous_block_hash: str
    block_hash: str


# --- Risk Fusion & Master Border Verification Models ---

class RiskFusionDecision(BaseModel):
    decision: str = Field(description="'CLEAR_ENTRY' | 'SECONDARY_INSPECTION' | 'HOLD_FOR_MANUAL_INSPECTION'")
    risk_score: int = Field(ge=0, le=100)
    risk_band: str = Field(description="'LOW' | 'MEDIUM' | 'HIGH'")
    tier_a_override: bool = False
    primary_reasons: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    module_scores: dict[str, int] = Field(default_factory=dict)


class BorderVerificationResponse(BaseModel):
    status: str = Field(description="'SUCCESS' | 'WARNING' | 'FAILED'")
    timestamp: str
    station_id: str = "CP-DEL-04"
    officer_id: Optional[str] = "OFFICER-7749"
    document_type: str
    decision: RiskFusionDecision
    module_1_2_mrz: ExtractAndValidateResponse
    module_3_tampering: TamperingAnalysisResult
    module_4_biometrics: FaceDetectionResult
    visual_highlights: list[TamperingBoundingBox] = Field(default_factory=list)
    audit_entry: Optional[AuditChainEntry] = None
    fail_fast_triggered: bool = False
    execution_time_ms: float = 0.0


class BorderVerificationRequestJson(BaseModel):
    image_base64: Optional[str] = None
    live_selfie_base64: Optional[str] = None
    mrz_text: Optional[str] = None
    document_type: Optional[str] = "passport"
    officer_id: Optional[str] = "OFFICER-7749"
    station_id: Optional[str] = "CP-DEL-04"
    enable_fail_fast: bool = True
