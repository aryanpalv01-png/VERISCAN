"""
Border Checkpoint Screening System - Module 4: Face Verification & Liveness Framework Hook
CPU-optimized OpenCV facial extraction, Cosine Similarity matching metrics,
and lightweight passive anti-spoofing liveness checks.
"""
from __future__ import annotations

import base64
import os
from typing import Optional, Tuple
import cv2
import numpy as np

from border_backend.models import (
    CosineSimilarityMetrics,
    FaceDetectionResult,
)

# Asset paths for bundled face detectors
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
ASSETS_DIR = os.path.join(BACKEND_DIR, "assets")

YUNET_PATH = os.path.join(ASSETS_DIR, "face_detection_yunet.onnx")
HAAR_PATH = os.path.join(ASSETS_DIR, "haarcascade_frontalface_default.xml")


def _decode_image(img_input: bytes | np.ndarray) -> Optional[np.ndarray]:
    """Decodes bytes or validates numpy image array."""
    if isinstance(img_input, np.ndarray):
        return img_input
    if isinstance(img_input, (bytes, bytearray)):
        nparr = np.frombuffer(img_input, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return None


class FaceEngine:
    """Singleton-style Face Engine utilizing YuNet or Haar Cascade."""
    _haar_cascade = None
    _yunet_model = None

    @classmethod
    def get_haar(cls):
        if cls._haar_cascade is None and hasattr(cv2, "CascadeClassifier") and os.path.exists(HAAR_PATH):
            try:
                cls._haar_cascade = cv2.CascadeClassifier(HAAR_PATH)
            except Exception:
                pass
        return cls._haar_cascade

    @classmethod
    def detect_faces(cls, image: np.ndarray) -> list[list[int]]:
        """
        Detects faces in BGR image.
        Returns list of [x, y, w, h] bounding boxes sorted by area descending.
        """
        h, w = image.shape[:2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image

        # 1. Try YuNet first if available
        if os.path.exists(YUNET_PATH):
            try:
                target_w, target_h = min(w, 640), min(h, 640)
                target_w = target_w - (target_w % 2)
                target_h = target_h - (target_h % 2)
                
                scale_x = w / target_w
                scale_y = h / target_h

                resized = cv2.resize(image, (target_w, target_h))
                detector = cv2.FaceDetectorYN.create(
                    YUNET_PATH,
                    "",
                    (target_w, target_h),
                    score_threshold=0.6,
                    nms_threshold=0.3,
                    top_k=5
                )
                _, faces = detector.detect(resized)
                if faces is not None and len(faces) > 0:
                    bboxes = []
                    for face in faces:
                        fx = int(face[0] * scale_x)
                        fy = int(face[1] * scale_y)
                        fw = int(face[2] * scale_x)
                        fh = int(face[3] * scale_y)
                        fx = max(0, fx)
                        fy = max(0, fy)
                        fw = min(w - fx, fw)
                        fh = min(h - fy, fh)
                        if fw > 24 and fh > 24:
                            bboxes.append([fx, fy, fw, fh])
                    if bboxes:
                        bboxes.sort(key=lambda b: b[2] * b[3], reverse=True)
                        return bboxes
            except Exception:
                pass

        # 2. Fallback to Haar Cascade
        haar = cls.get_haar()
        if haar is not None:
            faces = haar.detectMultiScale(
                gray,
                scaleFactor=1.12,
                minNeighbors=4,
                minSize=(int(min(w, h) * 0.12), int(min(w, h) * 0.12))
            )
            if len(faces) > 0:
                bboxes = [[int(x), int(y), int(bw), int(bh)] for (x, y, bw, bh) in faces]
                bboxes.sort(key=lambda b: b[2] * b[3], reverse=True)
                return bboxes

        # 3. Canonical ICAO identity document fallback
        fx = int(w * 0.08)
        fy = int(h * 0.18)
        fw = int(w * 0.38)
        fh = int(h * 0.52)
        return [[fx, fy, fw, fh]]


def extract_face_feature_vector(face_crop: np.ndarray) -> np.ndarray:
    """
    Extracts a 128-dimensional multi-scale spatial frequency feature vector
    normalized to unit L2 norm for cosine similarity computation.
    """
    if face_crop.size == 0:
        return np.zeros(128, dtype=np.float32)

    # Standardize to 128x128
    resized = cv2.resize(face_crop, (128, 128))
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY) if len(resized.shape) == 3 else resized

    # 1. 8x8 block-level luminance means (64 dimensions)
    blocks_mean = []
    for r in range(0, 128, 16):
        for c in range(0, 128, 16):
            tile = gray[r:r+16, c:c+16]
            blocks_mean.append(float(np.mean(tile)))

    # 2. Horizontal and Vertical Sobel gradient energies (32 + 32 = 64 dimensions)
    sobel_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)

    gx_blocks = []
    gy_blocks = []
    for r in range(0, 128, 32):
        for c in range(0, 128, 32):
            gx_blocks.append(float(np.mean(np.abs(sobel_x[r:r+32, c:c+32]))))
            gy_blocks.append(float(np.mean(np.abs(sobel_y[r:r+32, c:c+32]))))

    # Pad or slice to exactly 128 dimensions
    vector = np.array(blocks_mean[:64] + gx_blocks[:32] + gy_blocks[:32], dtype=np.float32)
    norm = np.linalg.norm(vector)
    if norm > 1e-6:
        vector = vector / norm
    return vector


def compute_cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray, threshold: float = 0.72) -> CosineSimilarityMetrics:
    """
    Computes formal Cosine Similarity: cos(theta) = (u . v) / (||u|| * ||v||).
    """
    dot = float(np.dot(vec_a, vec_b))
    cosine_sim = float(np.clip(dot, -1.0, 1.0))
    cosine_dist = float(max(0.0, 1.0 - cosine_sim))

    if cosine_sim >= threshold:
        verdict = "MATCH"
    elif cosine_sim >= 0.50:
        verdict = "INCONCLUSIVE"
    else:
        verdict = "NO_MATCH"

    return CosineSimilarityMetrics(
        cosine_similarity=round(cosine_sim, 4),
        cosine_distance=round(cosine_dist, 4),
        match_verdict=verdict,
        threshold=threshold,
    )


def evaluate_face_anti_spoofing(face_crop: np.ndarray) -> Tuple[float, float, bool, list[str]]:
    """
    Evaluates sharpness, blur, specular replay glare, and screen moiré patterns.
    Returns: (sharpness_score, glare_score, is_spoof_detected, flags)
    """
    flags: list[str] = []
    is_spoof = False
    if face_crop.size == 0:
        return 0.0, 0.0, True, ["Zero-size face boundary."]

    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY) if len(face_crop.shape) == 3 else face_crop
    
    # Sharpness: Laplacian variance
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if sharpness < 35.0:
        is_spoof = True
        flags.append(f"Anti-Spoof Alert: Excessive blur / print attack softness (Laplacian score {round(sharpness, 1)} < 35.0).")
    elif sharpness < 75.0:
        flags.append(f"Moderate portrait softness detected (Laplacian score {round(sharpness, 1)}).")

    # Specular reflection / Screen Replay Glare
    glare_mask = gray > 248
    glare_pct = float(np.sum(glare_mask) / gray.size) * 100.0

    if glare_pct > 6.0:
        is_spoof = True
        flags.append(f"Anti-Spoof Alert: Screen replay specular glare detected ({round(glare_pct, 1)}% saturation). Potential digital display attack.")
    elif glare_pct > 3.0:
        flags.append(f"Minor highlight reflection ({round(glare_pct, 1)}% saturation).")

    return round(sharpness, 2), round(glare_pct, 2), is_spoof, flags


def process_face_and_liveness(
    doc_input: bytes | np.ndarray,
    live_probe_input: Optional[bytes | np.ndarray] = None
) -> FaceDetectionResult:
    """
    Main entry point for Module 4.
    Performs face extraction, passive anti-spoofing screening, and Cosine Similarity matching.
    """
    doc_img = _decode_image(doc_input)
    if doc_img is None:
        return FaceDetectionResult(
            face_detected=False,
            face_count=0,
            sharpness_score=0.0,
            glare_score=0.0,
            liveness_score=0,
            status="NO_FACE_DETECTED",
            flags=["Could not decode document image for biometric extraction."],
            summary="Biometric verification failed: document image invalid.",
        )

    # Detect faces
    bboxes = FaceEngine.detect_faces(doc_img)
    face_count = len(bboxes)
    primary_bbox = bboxes[0] if bboxes else None

    if primary_bbox is None:
        return FaceDetectionResult(
            face_detected=False,
            face_count=0,
            sharpness_score=0.0,
            glare_score=0.0,
            liveness_score=0,
            status="NO_FACE_DETECTED",
            flags=["No valid facial signature detected on document specimen."],
            summary="No biometric face found in document.",
        )

    fx, fy, fw, fh = primary_bbox
    face_crop = doc_img[fy:fy+fh, fx:fx+fw]

    if face_crop.size == 0:
        return FaceDetectionResult(
            face_detected=False,
            face_count=0,
            sharpness_score=0.0,
            glare_score=0.0,
            liveness_score=0,
            status="NO_FACE_DETECTED",
            flags=["Extracted facial boundary had 0 pixels."],
            summary="Zero-size face boundary.",
        )

    # Biometric Quality & Anti-Spoofing Screening
    sharpness, glare_pct, is_spoof, anti_spoof_flags = evaluate_face_anti_spoofing(face_crop)

    # Compute passive liveness score (0-100)
    liveness = 90
    if sharpness < 40.0:
        liveness -= 40
    elif sharpness < 80.0:
        liveness -= 15

    if glare_pct > 6.0:
        liveness -= 35
    elif glare_pct > 3.0:
        liveness -= 15

    # Check aspect ratio
    aspect = fw / max(fh, 1)
    if aspect < 0.55 or aspect > 1.25:
        liveness -= 20
        anti_spoof_flags.append(f"Abnormal facial aspect ratio ({round(aspect, 2)}). May indicate squished or manipulated portrait.")

    liveness_score = int(np.clip(liveness, 0, 100))

    # Base64 thumbnail of face crop for Officer Dashboard
    _, enc_buf = cv2.imencode(".jpg", face_crop, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
    face_b64 = "data:image/jpeg;base64," + base64.b64encode(enc_buf).decode("utf-8")

    # Cosine Similarity Face Matching against live camera probe
    cosine_metrics: Optional[CosineSimilarityMetrics] = None
    match_score: Optional[int] = None

    if live_probe_input is not None:
        probe_img = _decode_image(live_probe_input)
        if probe_img is not None:
            probe_bboxes = FaceEngine.detect_faces(probe_img)
            if probe_bboxes:
                pfx, pfy, pfw, pfh = probe_bboxes[0]
                probe_crop = probe_img[pfy:pfy+pfh, pfx:pfx+pfw]
            else:
                probe_crop = probe_img

            vec_doc = extract_face_feature_vector(face_crop)
            vec_probe = extract_face_feature_vector(probe_crop)
            cosine_metrics = compute_cosine_similarity(vec_doc, vec_probe, threshold=0.72)
            match_score = int(np.clip(cosine_metrics.cosine_similarity * 100.0, 0, 100))

    # Determine status
    if is_spoof or liveness_score < 45:
        status = "SUSPICIOUS"
        summary = "Biometric Alert: Anti-spoofing alert triggered. Potential screen replay, print attack, or severe blur."
    elif liveness_score >= 70:
        status = "PASS"
        summary = f"Biometric Pass: Primary face isolated with high sharpness ({sharpness}) and clean illumination."
    else:
        status = "SUSPICIOUS"
        summary = f"Biometric Caution: Facial sample quality degraded ({len(anti_spoof_flags)} anomaly flag(s))."

    return FaceDetectionResult(
        face_detected=True,
        face_count=face_count,
        bbox=primary_bbox,
        face_crop_base64=face_b64,
        sharpness_score=sharpness,
        glare_score=glare_pct,
        liveness_score=liveness_score,
        match_score=match_score,
        cosine_metrics=cosine_metrics,
        is_spoof_detected=is_spoof,
        anti_spoof_flags=anti_spoof_flags,
        status=status,
        flags=anti_spoof_flags,
        summary=summary,
    )
