from __future__ import annotations

import gc
import os
from io import BytesIO
from typing import Any
import cv2
import numpy as np
from PIL import Image

MODULES_DIR = os.path.dirname(os.path.abspath(__file__))
WORKER_ROOT = os.path.dirname(MODULES_DIR)
YUNET_PATH = os.path.join(WORKER_ROOT, "face_detection_yunet.onnx")
HAAR_PATH = os.path.join(WORKER_ROOT, "haarcascade_frontalface_default.xml")


def detect_faces_opencv(img_bgr: np.ndarray) -> list[tuple[int, int, int, int]]:
    """
    Detects human faces using lightweight OpenCV FaceDetectorYN (YuNet ONNX).
    Falls back to Haar Cascade Classifier if available.
    Returns list of (x, y, w, h) bounding boxes.
    """
    h, w = img_bgr.shape[:2]
    face_boxes: list[tuple[int, int, int, int]] = []

    # 1. Primary: YuNet DNN
    try:
        if os.path.exists(YUNET_PATH) and hasattr(cv2, "FaceDetectorYN"):
            detector = cv2.FaceDetectorYN.create(YUNET_PATH, "", (w, h))
            detector.setInputSize((w, h))
            _, faces = detector.detect(img_bgr)
            if faces is not None:
                for face in faces:
                    fx, fy, fw, fh = map(int, face[:4])
                    pad_w = int(fw * 0.08)
                    pad_h = int(fh * 0.08)
                    x1 = max(0, fx - pad_w)
                    y1 = max(0, fy - pad_h)
                    w1 = min(w - x1, fw + 2 * pad_w)
                    h1 = min(h - y1, fh + 2 * pad_h)
                    if w1 > 10 and h1 > 10:
                        face_boxes.append((x1, y1, w1, h1))
    except Exception:
        pass

    # 2. Fallback: Haar Cascade
    if not face_boxes and hasattr(cv2, "CascadeClassifier") and os.path.exists(HAAR_PATH):
        try:
            cascade = cv2.CascadeClassifier(HAAR_PATH)
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            detected = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
            for (fx, fy, fw, fh) in detected:
                face_boxes.append((int(fx), int(fy), int(fw), int(fh)))
        except Exception:
            pass

    return face_boxes


def detect_dense_text_blocks_opencv(img_bgr: np.ndarray) -> list[tuple[int, int, int, int]]:
    """
    Detects dense text blocks across document surfaces using morphological horizontal dilation.
    Connects letter glyphs into word/sentence bounding rectangles.
    Returns list of (x, y, w, h) bounding boxes.
    """
    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    kw = max(13, int(w * 0.025))
    kh = max(3, int(h * 0.006))
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kw, kh))
    dilated = cv2.dilate(thresh, kernel, iterations=2)

    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    text_boxes: list[tuple[int, int, int, int]] = []
    min_area = (w * h) * 0.0003
    max_area = (w * h) * 0.85

    for c in contours:
        x, y, bw, bh = cv2.boundingRect(c)
        area = bw * bh
        if min_area < area < max_area and bw > 15 and bh >= 6:
            text_boxes.append((x, y, bw, bh))

    return text_boxes


def redact_pii_in_memory(
    image_input: np.ndarray | bytes,
    explicit_boxes: list[tuple[int, int, int, int]] | None = None,
    output_format: str = ".jpg",
) -> tuple[np.ndarray | None, bytes, dict[str, int]]:
    """
    Zero-disk in-memory PII redactor.
    Draws solid black rectangles (BGR: 0, 0, 0) over:
      - Detected faces
      - Detected dense text blocks
      - Explicit caller-provided bounding boxes (e.g. from OCR)
      - Protective middle band fallback if no boxes found on valid image

    Returns (redacted_bgr_image, encoded_bytes, stats).
    """
    img_bgr: np.ndarray | None = None

    if isinstance(image_input, bytes):
        nparr = np.frombuffer(image_input, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None or img_bgr.size == 0:
            try:
                pil_img = Image.open(BytesIO(image_input)).convert("RGB")
                img_bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            except Exception:
                img_bgr = None
    elif isinstance(image_input, np.ndarray):
        img_bgr = image_input.copy()

    if img_bgr is None or img_bgr.size == 0:
        raw_b = image_input if isinstance(image_input, bytes) else b""
        return None, raw_b, {"faces": 0, "text_blocks": 0, "total": 0}

    h, w = img_bgr.shape[:2]
    redacted = img_bgr.copy()

    face_boxes = detect_faces_opencv(img_bgr)
    text_boxes = detect_dense_text_blocks_opencv(img_bgr)

    for (x, y, bw, bh) in face_boxes:
        cv2.rectangle(redacted, (x, y), (min(w, x + bw), min(h, y + bh)), (0, 0, 0), -1)

    for (x, y, bw, bh) in text_boxes:
        cv2.rectangle(redacted, (x, y), (min(w, x + bw), min(h, y + bh)), (0, 0, 0), -1)

    if explicit_boxes:
        for (x, y, bw, bh) in explicit_boxes:
            cv2.rectangle(redacted, (max(0, x), max(0, y)), (min(w, x + bw), min(h, y + bh)), (0, 0, 0), -1)

    total_redactions = len(face_boxes) + len(text_boxes) + (len(explicit_boxes) if explicit_boxes else 0)

    # If no specific boxes were detected, apply conservative middle-band protection
    if total_redactions == 0:
        band_y1 = int(h * 0.35)
        band_y2 = int(h * 0.78)
        band_x1 = int(w * 0.12)
        band_x2 = int(w * 0.88)
        cv2.rectangle(redacted, (band_x1, band_y1), (band_x2, band_y2), (0, 0, 0), -1)
        total_redactions = 1

    ext = output_format if output_format.startswith(".") else f".{output_format}"
    success, encoded = cv2.imencode(ext, redacted)
    encoded_bytes = encoded.tobytes() if success else (image_input if isinstance(image_input, bytes) else b"")

    stats = {
        "faces": len(face_boxes),
        "text_blocks": len(text_boxes),
        "total": total_redactions,
    }

    return redacted, encoded_bytes, stats
