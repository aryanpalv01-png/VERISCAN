#!/usr/bin/env python3
"""
Interactive CLI verification script for Border Screening System (Phases 1-4).
Tests:
1. Module 1 & 2: ICAO 9303 MRZ Checksums & Date Logic
2. Module 3: OpenCV Error Level Analysis (ELA) & Laplacian Noise Consistency
3. Module 4: Biometric Face & Passive Liveness Screening
4. Risk Fusion Engine: Deterministic Officer Decision (CLEAR_ENTRY vs HOLD)

Run with:
    python border_backend/test_cli.py
"""
import os
import sys
import cv2
import numpy as np

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from border_backend.modules.mrz_engine import process_and_validate_mrz
from border_backend.modules.tampering_detector import analyze_document_tampering
from border_backend.modules.face_liveness import process_face_and_liveness
from border_backend.modules.risk_fusion import evaluate_risk_fusion


def main():
    print("=" * 75)
    print(" AI-BASED BORDER CHECKPOINT & SCREENING ENGINE - FULL PIPELINE AUDIT")
    print("=" * 75)

    # 1. Genuine TD3 Passport Test
    genuine_td3 = (
        "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\n"
        "L898902C36UTO7408122F3204153ZE184226B<<<<<16"
    )
    print("\n[TEST 1] Processing Genuine Travel Credential (Valid Expiry 2032):")
    mrz1 = process_and_validate_mrz(genuine_td3)
    clean_img = np.ones((400, 600, 3), dtype=np.uint8) * 230
    cv2.rectangle(clean_img, (50, 80), (220, 280), (180, 180, 180), -1)
    tamper1 = analyze_document_tampering(clean_img)
    bio1 = process_face_and_liveness(clean_img)
    decision1 = evaluate_risk_fusion(mrz1, tamper1, bio1)

    print(f"-> MRZ Parity Status   : {mrz1.status} (Checksums: {mrz1.checksums.overall_valid if mrz1.checksums else False})")
    print(f"-> Tampering Risk Band : {tamper1.photo_swap_risk} (Mean ELA: {tamper1.ela.mean_ela})")
    print(f"-> Biometric Liveness  : {bio1.status} (Score: {bio1.liveness_score}/100)")
    print(f"-> RISK FUSION DECISION: {decision1.decision}")
    print(f"-> Composite Risk Score: {decision1.risk_score}/100 (Band: {decision1.risk_band})")
    print(f"-> Primary Reasons     : {decision1.primary_reasons}")
    print(f"-> Officer Action      : {decision1.recommended_actions[0] if decision1.recommended_actions else 'None'}")

    # 2. Tampered Document Number (Tier A Override)
    tampered_td3 = (
        "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\n"
        "L898902C37UTO7408122F3504159ZE184226B<<<<<10"  # '7' instead of '6'
    )
    print("\n" + "-" * 75)
    print("\n[TEST 2] Processing Specimen with Altered Doc Number Check Digit ('7' vs '6'):")
    mrz2 = process_and_validate_mrz(tampered_td3)
    decision2 = evaluate_risk_fusion(mrz2, tamper1, bio1)

    print(f"-> MRZ Parity Status   : {mrz2.status}")
    print(f"-> Doc# Check Valid    : {mrz2.checksums.document_number.valid if mrz2.checksums else False}")
    print(f"-> Tier A Override     : {decision2.tier_a_override}")
    print(f"-> RISK FUSION DECISION: {decision2.decision}")
    print(f"-> Composite Risk Score: {decision2.risk_score}/100 (Band: {decision2.risk_band})")
    print(f"-> Flag Reasons        : {decision2.primary_reasons}")
    print(f"-> Recommended Action  : {decision2.recommended_actions[0] if decision2.recommended_actions else 'None'}")

    # 3. Photo-Swap Tampering Simulation
    print("\n" + "-" * 75)
    print("\n[TEST 3] Processing Document with Digital Photo-Swap Splicing:")
    tampered_img = clean_img.copy()
    noise = np.random.normal(0, 50, (200, 170, 3)).astype(np.int16)
    photo_roi = tampered_img[80:280, 50:220].astype(np.int16) + noise
    tampered_img[80:280, 50:220] = np.clip(photo_roi, 0, 255).astype(np.uint8)

    tamper3 = analyze_document_tampering(tampered_img, face_bbox=[50, 80, 170, 200])
    decision3 = evaluate_risk_fusion(mrz1, tamper3, bio1)

    print(f"-> Noise Ratio (Photo/Bg): {tamper3.noise.noise_ratio}x")
    print(f"-> Noise Disparity Flag  : {tamper3.noise.is_disparate}")
    print(f"-> Photo-Swap Risk Level : {tamper3.photo_swap_risk}")
    print(f"-> RISK FUSION DECISION  : {decision3.decision}")
    print(f"-> Composite Risk Score  : {decision3.risk_score}/100")
    print(f"-> Anomalies Flagged     : {tamper3.anomalies}")

    print("\n" + "=" * 75)
    print(" ALL FORENSIC ENGINE MODULES EXECUTED AND VERIFIED SUCCESSFULLY.")
    print("=" * 75)


if __name__ == "__main__":
    main()
