"""
Border Checkpoint Screening System - Tiered Risk Fusion Engine
Combines:
- Tier A: Deterministic Hard Overrides (MRZ checksum, expiry, anti-spoof, photo-swap)
- Tier B: Probabilistic Multi-Factor Corroborations (Minor anomalies, ELA softness)
Generates:
- Risk Score (0-100)
- Risk Band: LOW (0-24), MEDIUM (25-54), HIGH (55-100)
- Officer Decision: CLEAR_ENTRY | SECONDARY_INSPECTION | HOLD_FOR_MANUAL_INSPECTION
"""
from __future__ import annotations

from typing import Optional
from border_backend.models import (
    ExtractAndValidateResponse,
    FaceDetectionResult,
    RiskFusionDecision,
    TamperingAnalysisResult,
)


def evaluate_risk_fusion(
    mrz: ExtractAndValidateResponse,
    tampering: TamperingAnalysisResult,
    biometrics: FaceDetectionResult,
) -> RiskFusionDecision:
    """
    Executes Tier A deterministic checks followed by Tier B probabilistic corroboration.
    """
    primary_reasons: list[str] = []
    recommended_actions: list[str] = []
    tier_a_override = False

    # --- 1. Sub-module Risk Score Calculations (0-100 scale) ---

    # Module 1 & 2 MRZ Score
    mrz_risk = 0
    if not mrz.mrz_detected:
        mrz_risk = 75
        primary_reasons.append("MRZ optical pattern could not be isolated from credential.")
    elif mrz.checksums and not mrz.checksums.overall_valid:
        mrz_risk = 95
        if not mrz.checksums.document_number.valid:
            primary_reasons.append("CRITICAL: Document Number Checksum Mismatch (potential number manipulation).")
        if not mrz.checksums.composite.valid:
            primary_reasons.append("CRITICAL: Composite ICAO 9303 Checksum Failed (cross-field parity violation).")
        if not mrz.checksums.date_of_birth.valid:
            primary_reasons.append("Date of Birth Checksum Failed.")
        if not mrz.checksums.expiration_date.valid:
            primary_reasons.append("Expiration Date Checksum Failed.")
    else:
        mrz_risk = 5

    # Date Logic Penalties
    if mrz.date_validation:
        if mrz.date_validation.is_expired:
            mrz_risk = max(mrz_risk, 90)
            primary_reasons.append(f"CRITICAL: Document Expired (Expired on {mrz.date_validation.expiry_formatted}).")
        elif mrz.date_validation.expires_soon_warning:
            mrz_risk = max(mrz_risk, 28)
            primary_reasons.append(f"Validity Notice: Credential expires in {mrz.date_validation.days_until_expiry} days (<180 days rule).")
            recommended_actions.append("Advise passenger regarding destination country 6-month validity threshold.")

        if not mrz.date_validation.dob_valid:
            mrz_risk = max(mrz_risk, 85)
            primary_reasons.append("Date of Birth Anomaly: Temporal paradox detected.")

    # Module 3 Tampering Score
    tampering_risk = tampering.risk_score
    if tampering.photo_swap_risk == "HIGH":
        primary_reasons.append("CRITICAL: High Probability Photo-Swap / Biometric Surface Tampering Detected.")
    elif tampering.splicing_detected:
        primary_reasons.append("Localized ELA Splicing Discontinuity identified.")

    # Module 4 Biometrics Score
    if not biometrics.face_detected:
        bio_risk = 55
        primary_reasons.append("Biometric Notice: Document facial crop could not be isolated.")
    else:
        bio_risk = 100 - biometrics.liveness_score
        # Check Anti-spoofing
        if biometrics.is_spoof_detected:
            bio_risk = max(bio_risk, 88)
            for flag in biometrics.anti_spoof_flags:
                primary_reasons.append(f"Anti-Spoof Alert: {flag}")

        # Check Cosine Similarity Match
        if biometrics.cosine_metrics is not None:
            if biometrics.cosine_metrics.match_verdict == "NO_MATCH":
                bio_risk = max(bio_risk, 92)
                primary_reasons.append(
                    f"CRITICAL: Biometric Match Failure (Cosine similarity {biometrics.cosine_metrics.cosine_similarity} < {biometrics.cosine_metrics.threshold})."
                )
            elif biometrics.cosine_metrics.match_verdict == "INCONCLUSIVE":
                bio_risk = max(bio_risk, 45)
                primary_reasons.append(
                    f"Biometric Match Inconclusive (Cosine similarity {biometrics.cosine_metrics.cosine_similarity})."
                )

    module_scores = {
        "mrz_integrity_score": max(0, 100 - mrz_risk),
        "forensic_authenticity_score": max(0, 100 - tampering_risk),
        "biometric_confidence_score": max(0, 100 - bio_risk),
    }

    # --- 2. Tier A Deterministic Hard Overrides ---
    # Trigger 0: ISO 3166-1 Country Whitelist Check (Requirement 1 & 2)
    from backend.iso3166_whitelist import validate_iso3166_issuer
    issuer_to_check = ""
    if mrz.fields:
        issuer_to_check = mrz.fields.issuing_country or mrz.fields.nationality or ""
    if issuer_to_check:
        issuer_valid, _, issuer_expl = validate_iso3166_issuer(issuer_to_check)
        if not issuer_valid:
            return RiskFusionDecision(
                decision="HOLD_FOR_MANUAL_INSPECTION",
                risk_score=95,
                risk_band="HIGH",
                tier_a_override=True,
                primary_reasons=[f"CRITICAL TIER A: {issuer_expl}"],
                recommended_actions=[
                    "Deny automated e-Gate passage: Unrecognized issuing country not on ISO 3166-1 whitelist.",
                    "Escort passenger to Secondary Inspection Facility.",
                ],
                module_scores=module_scores,
            )

    # Trigger 1: ICAO 9303 Parity Mismatch
    if mrz.checksums and (not mrz.checksums.document_number.valid or not mrz.checksums.composite.valid):
        tier_a_override = True
        return RiskFusionDecision(
            decision="HOLD_FOR_MANUAL_INSPECTION",
            risk_score=max(92, mrz_risk),
            risk_band="HIGH",
            tier_a_override=True,
            primary_reasons=primary_reasons,
            recommended_actions=[
                "Escort passenger to Secondary Inspection Facility immediately.",
                "Seize travel credential for spectral comparator forensic examination.",
                "Verify origin database / INTERPOL SLTD database.",
            ],
            module_scores=module_scores,
        )

    # Trigger 2: Travel Document Expired
    if mrz.date_validation and mrz.date_validation.is_expired:
        tier_a_override = True
        return RiskFusionDecision(
            decision="HOLD_FOR_MANUAL_INSPECTION",
            risk_score=88,
            risk_band="HIGH",
            tier_a_override=True,
            primary_reasons=primary_reasons,
            recommended_actions=[
                "Deny automated e-Gate passage due to expired travel credential.",
                "Verify return flight booking and emergency travel certificate eligibility.",
            ],
            module_scores=module_scores,
        )

    # Trigger 3: Photo-Swap / Severe Tampering
    if tampering.photo_swap_risk == "HIGH" or tampering_risk >= 70:
        tier_a_override = True
        return RiskFusionDecision(
            decision="HOLD_FOR_MANUAL_INSPECTION",
            risk_score=max(92, tampering_risk),
            risk_band="HIGH",
            tier_a_override=True,
            primary_reasons=primary_reasons,
            recommended_actions=[
                "Inspect document for physical foil lifting, split-lamination, or printed sticker overlay.",
                "Examine security guilloche pattern under 10x magnification loupe.",
                "Verify biometric RFID chip signature if e-Passport.",
            ],
            module_scores=module_scores,
        )

    # Trigger 4: Anti-Spoofing / Biometric Mismatch
    if biometrics.is_spoof_detected or (biometrics.cosine_metrics and biometrics.cosine_metrics.match_verdict == "NO_MATCH"):
        tier_a_override = True
        return RiskFusionDecision(
            decision="HOLD_FOR_MANUAL_INSPECTION",
            risk_score=max(88, bio_risk),
            risk_band="HIGH",
            tier_a_override=True,
            primary_reasons=primary_reasons,
            recommended_actions=[
                "Biometric anti-spoofing alert triggered. Direct passenger to manual officer inspection lane.",
                "Perform live fingerprint capture and face re-acquisition under controlled lighting.",
            ],
            module_scores=module_scores,
        )

    # --- 3. Tier B Probabilistic Corroborations ---
    # Weighted Multi-Factor Score: MRZ 35%, Tampering 35%, Biometrics 30%
    weighted_risk = int(0.35 * mrz_risk + 0.35 * tampering_risk + 0.30 * bio_risk)
    risk_score = min(100, max(0, weighted_risk))

    if risk_score <= 24:
        risk_band = "LOW"
        decision = "CLEAR_ENTRY"
        if not primary_reasons:
            primary_reasons.append("All ICAO 9303 checksums verified; biometric face and document surface verified.")
        recommended_actions.append("Grant automated border clearance.")
        recommended_actions.append("Release e-Gate turnstile.")
    elif risk_score <= 54:
        risk_band = "MEDIUM"
        decision = "SECONDARY_INSPECTION"
        recommended_actions.append("Direct traveler to Officer Counter for physical document validation.")
        recommended_actions.append("Check passenger travel itinerary and visa entry conditions.")
    else:
        risk_band = "HIGH"
        decision = "HOLD_FOR_MANUAL_INSPECTION"
        recommended_actions.append("Intercept passenger at gate and conduct detailed manual forensic audit.")

    return RiskFusionDecision(
        decision=decision,
        risk_score=risk_score,
        risk_band=risk_band,
        tier_a_override=tier_a_override,
        primary_reasons=primary_reasons,
        recommended_actions=recommended_actions,
        module_scores=module_scores,
    )
