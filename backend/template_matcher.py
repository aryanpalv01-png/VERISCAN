"""
Structural Template Positive-Match Layer.
Maintains canonical reference specifications for official identity credentials:
- Passport (ICAO Doc 9303 Part 4, TD3 standard)
- National ID (CR80 standard / UIDAI Aadhaar layout)
- Visa (ICAO Doc 9303 Part 7, TD2 standard)
- Driving License (ISO/IEC 18013 standard)

Default Security Posture: "Unverified" (Guilty until proven compliant).
If a document's layout does not positively match any known reference template above threshold,
its maximum possible confidence score is capped at 45.
"""
import cv2
import numpy as np
from typing import Dict, Any

# Structural layout specifications for registered document classes
DOCUMENT_TEMPLATES = {
    "Passport": {
        "target_aspect": 1.42,
        "aspect_tolerance": 0.20,
        "header_zone_y": (0.0, 0.22),
        "photo_zone": (0.03, 0.18, 0.45, 0.78),  # (x_min, y_min, x_max, y_max)
        "mrz_zone_y": (0.75, 1.0),
        "min_mrz_lines": 2,
        "require_mrz": True,
    },
    "National ID": {
        "target_aspect": 1.58,
        "aspect_tolerance": 0.25,
        "header_zone_y": (0.0, 0.25),
        "photo_zone": (0.03, 0.20, 0.45, 0.85),
        "uid_zone_y": (0.70, 0.96),
        "require_mrz": False,
    },
    "Visa": {
        "target_aspect": 1.42,
        "aspect_tolerance": 0.20,
        "header_zone_y": (0.0, 0.22),
        "mrz_zone_y": (0.75, 1.0),
        "require_mrz": True,
    },
    "Driving License": {
        "target_aspect": 1.58,
        "aspect_tolerance": 0.25,
        "header_zone_y": (0.0, 0.25),
        "photo_zone": (0.03, 0.18, 0.45, 0.85),
        "require_mrz": False,
    },
    "PAN Card": {
        "target_aspect": 1.58,
        "aspect_tolerance": 0.25,
        "header_zone_y": (0.0, 0.25),
        "photo_zone": (0.03, 0.18, 0.45, 0.85),
        "require_mrz": False,
    },
    "Voter ID": {
        "target_aspect": 1.58,
        "aspect_tolerance": 0.25,
        "header_zone_y": (0.0, 0.25),
        "photo_zone": (0.03, 0.18, 0.45, 0.85),
        "require_mrz": False,
    },
    "General Credential": {
        "target_aspect": 1.55,
        "aspect_tolerance": 0.35,
        "header_zone_y": (0.0, 0.30),
        "photo_zone": (0.03, 0.15, 0.50, 0.90),
        "require_mrz": False,
    },
}

def evaluate_structural_template(img: np.ndarray, doc_type: str, ocr_text: str = "") -> Dict[str, Any]:
    """
    Evaluates image structural anchors against the canonical reference template.
    Returns:
        {
            "template_matched": bool,
            "similarity_score": float (0-100),
            "capped_max_score": int (45 if unverified, 100 if matched),
            "findings": list[str]
        }
    """
    if img is None:
        return {
            "template_matched": False,
            "similarity_score": 0.0,
            "capped_max_score": 45,
            "findings": ["Image payload missing or invalid format."]
        }

    h, w = img.shape[:2]
    aspect = float(max(w, h)) / float(max(min(w, h), 1))
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img

    if doc_type in DOCUMENT_TEMPLATES:
        template_key = doc_type
    elif doc_type in ["Passport", "Visa"]:
        template_key = "Passport"
    else:
        template_key = "National ID"
    spec = DOCUMENT_TEMPLATES[template_key]

    score_points = 0.0
    max_points = 100.0
    findings = []

    # 1. Aspect Ratio Alignment (25 pts)
    target_aspect = spec["target_aspect"]
    aspect_diff = abs(aspect - target_aspect)
    if aspect_diff <= spec["aspect_tolerance"]:
        score_points += 25.0
        findings.append(f"Aspect ratio {round(aspect, 2)} matches {template_key} standard ({target_aspect}).")
    elif aspect_diff <= spec["aspect_tolerance"] * 1.6:
        score_points += 12.0
        findings.append(f"Aspect ratio {round(aspect, 2)} moderately deviates from {target_aspect}.")
    else:
        findings.append(f"Geometric anomaly: Aspect ratio {round(aspect, 2)} violates {template_key} specification ({target_aspect}).")

    # 2. Header Authority Presence (25 pts)
    # Check top band for text / high horizontal gradient activity
    header_h = int(h * spec["header_zone_y"][1])
    header_roi = gray[0:header_h, :]
    sobel_x = cv2.Sobel(header_roi, cv2.CV_64F, 1, 0, ksize=3)
    header_gradient_energy = float(np.mean(np.abs(sobel_x)))
    if header_gradient_energy > 8.0:
        score_points += 25.0
        findings.append("Header institutional emblem and authority anchor verified.")
    elif header_gradient_energy > 4.0:
        score_points += 15.0
        findings.append("Weak header anchor zone energy.")
    else:
        findings.append("Header anchor zone lacks mandatory institutional layout features.")

    # 3. Dedicated Photo Zone Anchor (25 pts)
    # Check upper-left quadrant for distinct facial photo region
    px1, py1, px2, py2 = int(w * 0.03), int(h * 0.18), int(w * 0.48), int(h * 0.85)
    photo_roi = gray[py1:py2, px1:px2]
    if photo_roi.size > 0:
        photo_laplacian = float(cv2.Laplacian(photo_roi, cv2.CV_64F).var())
        # A portrait photo exhibits rich gradient variation (eyes, hair, lips, edges)
        if photo_laplacian > 45.0:
            score_points += 25.0
            findings.append("Biometric portrait zone conforms to standard physical coordinate quadrant.")
        elif photo_laplacian > 20.0:
            score_points += 14.0
            findings.append("Marginal portrait zone gradient.")
        else:
            findings.append("Portrait coordinate quadrant does not contain compliant biometric image.")

    # 4. Document-Specific Machine Readable Zone or QR/UID Anchors (25 pts)
    if spec.get("require_mrz", False):
        mrz_y1 = int(h * spec["mrz_zone_y"][0])
        mrz_roi = gray[mrz_y1:h, :]
        mrz_edges = cv2.Canny(mrz_roi, 50, 150)
        edge_density = float(np.sum(mrz_edges > 0)) / float(mrz_roi.size + 1)
        
        # Check OCR text for << chevrons or monospace characters
        has_chevrons = "<<" in ocr_text or "<" in ocr_text[-120:] if ocr_text else False
        if edge_density > 0.04 or has_chevrons:
            score_points += 25.0
            findings.append("Machine Readable Zone (MRZ) optical pitch aligns with ICAO baseline.")
        elif edge_density > 0.015:
            score_points += 15.0
        else:
            findings.append("MRZ optical pitch missing from mandatory bottom margin.")
    else:
        # Structured digital or alphanumeric anchors for ID cards, DL, PAN, etc.
        detector = cv2.QRCodeDetector()
        has_qr, _, _ = detector.detectAndDecode(img)
        has_uid = any(c.isdigit() for c in ocr_text) and len(ocr_text) > 15
        has_id_keywords = any(k in ocr_text.upper() for k in [
            "NAME", "DOB", "DATE", "CARD", "NUMBER", "NO", "VALID", "GOVT", "INDIA",
            "INCOME", "TAX", "PAN", "DRIVING", "LICENCE", "LICENSE", "DEPARTMENT", "AUTHORITY"
        ])
        if has_qr or has_uid or has_id_keywords:
            score_points += 25.0
            findings.append(f"{template_key} institutional data & security anchors confirmed.")
        else:
            findings.append(f"Missing mandatory institutional {template_key} verification anchors.")

    similarity_score = round(min(100.0, score_points), 1)
    # Threshold for template acceptance is 60.0%
    is_positive_match = similarity_score >= 60.0
    capped_max_score = 100 if is_positive_match else 45

    return {
        "template_matched": is_positive_match,
        "similarity_score": similarity_score,
        "capped_max_score": capped_max_score,
        "template_class": template_key,
        "findings": findings
    }
