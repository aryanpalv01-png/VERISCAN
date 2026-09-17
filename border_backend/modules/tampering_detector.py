"""
Border Checkpoint Screening System - Module 3: Tampering & Photo-Swap Analyzer
Implements:
- OpenCV-based Error Level Analysis (ELA)
- Laplacian Noise Variance Consistency
- Localized Splicing Grid Detection
- Visual Coordinate Mapping: extracts [x, y, w, h] bounding boxes for detected tampering
"""
from __future__ import annotations

import base64
from typing import Optional, Tuple, List
import cv2
import numpy as np

from border_backend.models import (
    ElaMetrics,
    NoiseMetrics,
    TamperingAnalysisResult,
    TamperingBoundingBox,
)


def _decode_image(img_input: bytes | np.ndarray) -> Optional[np.ndarray]:
    """Decodes bytes or validates numpy image array."""
    if isinstance(img_input, np.ndarray):
        return img_input
    if isinstance(img_input, (bytes, bytearray)):
        nparr = np.frombuffer(img_input, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return None


def compute_ela(
    image: np.ndarray,
    quality: int = 90,
    diff_scale: float = 12.0
) -> Tuple[float, float, float, Optional[str], Optional[np.ndarray]]:
    """
    Performs Error Level Analysis (ELA) by re-compressing the image at JPEG `quality`,
    measuring the difference matrix, and producing localized anomaly metrics.
    
    Returns:
        (mean_ela, peak_ela, tampered_pixel_ratio, heatmap_base64, diff_magnitude)
    """
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    _, enc_buf = cv2.imencode(".jpg", image, encode_param)
    decompressed = cv2.imdecode(enc_buf, cv2.IMREAD_COLOR)

    if decompressed is None or decompressed.shape != image.shape:
        return 0.0, 0.0, 0.0, None, None

    # Compute absolute difference
    diff = cv2.absdiff(image, decompressed).astype(np.float32)
    mean_ela = float(np.mean(diff))
    peak_ela = float(np.max(diff))

    # Tampered pixel ratio: pixels with high reconstruction error (> 24 on 0-255 scale)
    diff_magnitude = np.max(diff, axis=2)
    high_diff_mask = diff_magnitude > 24.0
    tampered_pixel_ratio = float(np.sum(high_diff_mask) / high_diff_mask.size)

    # Generate colorized heatmap visualization (scaled)
    scaled_diff = np.clip(diff_magnitude * diff_scale, 0, 255).astype(np.uint8)
    heatmap = cv2.applyColorMap(scaled_diff, cv2.COLORMAP_JET)

    # Resize heatmap for thumbnail display in frontend (max dimension 480)
    h, w = heatmap.shape[:2]
    max_dim = 480
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        heatmap_thumb = cv2.resize(heatmap, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    else:
        heatmap_thumb = heatmap

    _, heat_buf = cv2.imencode(".jpg", heatmap_thumb, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    heatmap_base64 = "data:image/jpeg;base64," + base64.b64encode(heat_buf).decode("utf-8")

    return round(mean_ela, 3), round(peak_ela, 2), round(tampered_pixel_ratio, 4), heatmap_base64, diff_magnitude


def compute_noise_consistency(
    image: np.ndarray,
    face_bbox: Optional[list[int]] = None
) -> Tuple[NoiseMetrics, list[str], list[int]]:
    """
    Computes Laplacian variance noise consistency between document photo crop
    and the background security / guilloche pattern area.
    Returns: (NoiseMetrics, anomalies, photo_roi_coords)
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    h, w = gray.shape[:2]

    # Full document noise variance
    full_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # Determine photo region
    if face_bbox and len(face_bbox) == 4 and face_bbox[2] > 20 and face_bbox[3] > 20:
        fx, fy, fw, fh = face_bbox
        px1 = max(0, fx - int(fw * 0.15))
        py1 = max(0, fy - int(fh * 0.15))
        px2 = min(w, fx + fw + int(fw * 0.15))
        py2 = min(h, fy + fh + int(fh * 0.15))
        photo_crop = gray[py1:py2, px1:px2]
        photo_roi = [px1, py1, px2 - px1, py2 - py1]
    else:
        # Canonical ICAO passport photo placement: left 8-46% width, 18-72% height
        px1 = int(w * 0.08)
        py1 = int(h * 0.18)
        px2 = int(w * 0.46)
        py2 = int(h * 0.72)
        photo_crop = gray[py1:py2, px1:px2]
        photo_roi = [px1, py1, px2 - px1, py2 - py1]

    # Document body / background crop (right half middle, avoiding MRZ bottom strip)
    bx1 = int(w * 0.52)
    by1 = int(h * 0.18)
    bx2 = int(w * 0.94)
    by2 = int(h * 0.70)
    bg_crop = gray[by1:by2, bx1:bx2]

    if photo_crop.size == 0 or bg_crop.size == 0:
        return NoiseMetrics(
            full_noise_var=round(full_var, 2),
            photo_noise_var=0.0,
            bg_noise_var=0.0,
            noise_ratio=1.0,
            is_disparate=False,
        ), [], photo_roi

    photo_var = float(cv2.Laplacian(photo_crop, cv2.CV_64F).var())
    bg_var = float(cv2.Laplacian(bg_crop, cv2.CV_64F).var())

    # Ratio of noise energy
    safe_bg = max(bg_var, 1.0)
    noise_ratio = round(photo_var / safe_bg, 3)

    anomalies: list[str] = []
    is_disparate = False

    # Genuine printed document usually has balanced sensor/print noise (0.35 <= ratio <= 2.5)
    if noise_ratio > 2.5:
        is_disparate = True
        anomalies.append(
            f"High noise discrepancy detected: Photo region exhibits {noise_ratio}x higher noise energy than document background (indicator of digital paste/photo-swap)."
        )
    elif noise_ratio < 0.28 and photo_var < 45.0:
        is_disparate = True
        anomalies.append(
            f"Artificial smoothing detected: Photo region has unnaturally low noise variance ({round(photo_var, 1)} vs document {round(bg_var, 1)}), characteristic of AI-generated or digital face replacement."
        )

    return NoiseMetrics(
        full_noise_var=round(full_var, 2),
        photo_noise_var=round(photo_var, 2),
        bg_noise_var=round(bg_var, 2),
        noise_ratio=noise_ratio,
        is_disparate=is_disparate,
    ), anomalies, photo_roi


def detect_localized_splicing(image: np.ndarray, tile_size: int = 24) -> Tuple[bool, list[str], list[list[int]]]:
    """
    Scans image for localized splicing anomalies via block-level gradient standard deviation.
    Returns: (splicing_detected, flags, outlier_tile_boxes)
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    h, w = gray.shape[:2]

    sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag = np.sqrt(sobel_x**2 + sobel_y**2)

    block_data = []
    h_limit = int(h * 0.75)
    for y in range(0, h_limit - tile_size, tile_size):
        for x in range(0, w - tile_size, tile_size):
            tile = grad_mag[y:y+tile_size, x:x+tile_size]
            block_data.append((x, y, float(np.std(tile))))

    if not block_data:
        return False, [], []

    stds = [b[2] for b in block_data]
    mean_std = float(np.mean(stds))
    std_std = float(np.std(stds))

    # Outliers
    outlier_threshold = mean_std + 3.8 * max(std_std, 1.0)
    outlier_boxes: list[list[int]] = []

    for x, y, val in block_data:
        if val > outlier_threshold:
            outlier_boxes.append([x, y, tile_size, tile_size])

    outlier_ratio = len(outlier_boxes) / max(len(block_data), 1)
    splicing_detected = outlier_ratio > 0.045
    flags: list[str] = []

    if splicing_detected:
        flags.append(
            f"Localized edge discontinuity detected across {len(outlier_boxes)} grid blocks ({round(outlier_ratio*100, 1)}% of surface), suggesting physical or digital text alteration."
        )

    return splicing_detected, flags, outlier_boxes[:6]


def extract_tampering_bounding_boxes(
    image: np.ndarray,
    diff_magnitude: Optional[np.ndarray],
    photo_roi: list[int],
    is_photo_disparate: bool,
    splicing_boxes: list[list[int]],
) -> list[TamperingBoundingBox]:
    """
    Visual Coordinate-Mapping Function:
    Generates [x, y, width, height] bounding boxes for UI inspection highlights.
    """
    boxes: list[TamperingBoundingBox] = []

    # 1. Photo-Swap Disparity Bounding Box
    if is_photo_disparate and len(photo_roi) == 4:
        px, py, pw, ph = photo_roi
        boxes.append(
            TamperingBoundingBox(
                x=int(px),
                y=int(py),
                width=int(pw),
                height=int(ph),
                label="PHOTO-SWAP NOISE DISPARITY",
                confidence=0.92,
                color="#a855f7",
            )
        )

    # 2. Localized Splicing Discontinuities
    for sb in splicing_boxes:
        boxes.append(
            TamperingBoundingBox(
                x=int(sb[0]),
                y=int(sb[1]),
                width=int(sb[2]),
                height=int(sb[3]),
                label="SPLICED EDGE RESAMPLE",
                confidence=0.86,
                color="#ef4444",
            )
        )

    # 3. High ELA Reconstruction Error Clusters
    if diff_magnitude is not None:
        h, w = diff_magnitude.shape[:2]
        # Binary mask of severe ELA error
        mask = (diff_magnitude > 28.0).astype(np.uint8) * 255
        
        # Morphological close to group character clusters
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
        closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            area = cv2.contourArea(cnt)
            # Filter tiny noise and bottom MRZ region
            if 80 < area < (h * w * 0.25):
                cx, cy, cw, ch = cv2.boundingRect(cnt)
                # Skip if inside bottom MRZ strip
                if cy + ch > int(h * 0.78):
                    continue
                # Skip if identical to photo_roi already added
                if is_photo_disparate and abs(cx - photo_roi[0]) < 20 and abs(cy - photo_roi[1]) < 20:
                    continue

                boxes.append(
                    TamperingBoundingBox(
                        x=int(cx),
                        y=int(cy),
                        width=int(cw),
                        height=int(ch),
                        label="LOCALIZED ELA ANOMALY",
                        confidence=round(float(min(0.98, 0.70 + (area / 1000))), 2),
                        color="#ef4444",
                    )
                )

    # Return top 8 distinct bounding boxes
    return boxes[:8]


def analyze_document_tampering(
    img_input: bytes | np.ndarray,
    face_bbox: Optional[list[int]] = None
) -> TamperingAnalysisResult:
    """
    Main entry point for Module 3.
    Combines ELA, Laplacian noise consistency, localized splicing, and visual coordinate mapping.
    """
    img = _decode_image(img_input)
    if img is None:
        return TamperingAnalysisResult(
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
            anomalies=["Image could not be parsed for tampering analysis."],
            summary="Tampering analysis skipped: invalid or empty image buffer.",
        )

    # 1. Error Level Analysis
    mean_ela, peak_ela, tampered_ratio, heatmap_b64, diff_mag = compute_ela(img, quality=90)
    ela_metrics = ElaMetrics(
        mean_ela=mean_ela,
        peak_ela=peak_ela,
        tampered_pixel_ratio=tampered_ratio,
        heatmap_base64=heatmap_b64,
    )

    # 2. Laplacian Noise Consistency
    noise_metrics, noise_anomalies, photo_roi = compute_noise_consistency(img, face_bbox)

    # 3. Localized Splicing
    splicing_detected, splicing_anomalies, splicing_boxes = detect_localized_splicing(img)

    all_anomalies: list[str] = []
    all_anomalies.extend(noise_anomalies)
    all_anomalies.extend(splicing_anomalies)

    # ELA Anomaly Flagging
    if tampered_ratio > 0.085:
        all_anomalies.append(
            f"Elevated ELA compression error across {round(tampered_ratio * 100, 1)}% of surface (exceeds 8.5% threshold), indicating multi-generation JPEG splicing."
        )

    # 4. Visual Coordinate Mapping for Inspection Highlights
    tampering_boxes = extract_tampering_bounding_boxes(
        image=img,
        diff_magnitude=diff_mag,
        photo_roi=photo_roi,
        is_photo_disparate=noise_metrics.is_disparate,
        splicing_boxes=splicing_boxes,
    )

    # Scoring logic
    risk_score = 10

    if noise_metrics.is_disparate:
        risk_score += 45
    if splicing_detected:
        risk_score += 30
    if tampered_ratio > 0.085:
        risk_score += 25
    elif tampered_ratio > 0.045:
        risk_score += 15

    risk_score = min(100, max(0, risk_score))

    # Photo-swap risk assessment
    if noise_metrics.is_disparate and (tampered_ratio > 0.05 or risk_score >= 60):
        photo_swap_risk = "HIGH"
    elif noise_metrics.is_disparate or tampered_ratio > 0.06:
        photo_swap_risk = "ELEVATED"
    else:
        photo_swap_risk = "LOW"

    tampering_detected = risk_score >= 45 or noise_metrics.is_disparate or splicing_detected

    if tampering_detected:
        summary = f"Forensic Alert: {photo_swap_risk} risk of tampering/photo-swap. Detected {len(all_anomalies)} structural anomaly indicator(s) and mapped {len(tampering_boxes)} inspection coordinate(s)."
    else:
        summary = "Forensic Clear: Document surface exhibits uniform compression artifacts and consistent noise variance."

    return TamperingAnalysisResult(
        tampering_detected=tampering_detected,
        photo_swap_risk=photo_swap_risk,
        splicing_detected=splicing_detected,
        risk_score=risk_score,
        ela=ela_metrics,
        noise=noise_metrics,
        tampering_boxes=tampering_boxes,
        anomalies=all_anomalies,
        summary=summary,
    )
