from __future__ import annotations

import os
import re
from typing import Any
import requests
from modules.pii_redactor import redact_pii_in_memory

PRIMARY_MODEL_URL = "https://router.huggingface.co/hf-inference/models/Organika/sdxl-detector"
FALLBACK_MODEL_URL = "https://router.huggingface.co/hf-inference/models/umm-maybe/AI-image-detector"


def detect_ai_generation(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    explicit_boxes: list[tuple[int, int, int, int]] | None = None,
) -> dict[str, Any]:
    token = os.getenv("HF_API_TOKEN")

    if not token:
        return {
            "checkName": "ai_generated_image_detector",
            "result": "not_applicable",
            "confidence": 0,
            "explanation": "Hugging Face inference API token (HF_API_TOKEN) is not configured. Add HF_API_TOKEN to enable AI-image generation screening.",
            "provider": "huggingface",
            "available": False,
            "ai_probability": None,
        }

    # Zero-Trust PII Redaction: Mask all citizen identifiers, faces, and text blocks before external dispatch
    _, sanitized_bytes, redaction_stats = redact_pii_in_memory(
        image_bytes,
        explicit_boxes=explicit_boxes,
        output_format=".jpg",
    )
    send_bytes = sanitized_bytes if sanitized_bytes else image_bytes

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "image/jpeg",
    }

    response_payload = None
    used_model = "Organika/sdxl-detector"

    # Try primary model
    try:
        res = requests.post(PRIMARY_MODEL_URL, headers=headers, data=send_bytes, timeout=12)
        if res.status_code == 200:
            response_payload = res.json()
        elif res.status_code in (503, 404, 429):
            # Fallback model
            used_model = "umm-maybe/AI-image-detector"
            fb_res = requests.post(FALLBACK_MODEL_URL, headers=headers, data=send_bytes, timeout=12)
            if fb_res.status_code == 200:
                response_payload = fb_res.json()
            else:
                return {
                    "checkName": "ai_generated_image_detector",
                    "result": "not_applicable",
                    "confidence": 0,
                    "explanation": f"Hugging Face models returned status {fb_res.status_code}; AI generation signal excluded.",
                    "provider": "huggingface",
                    "available": False,
                    "ai_probability": None,
                }
        else:
            return {
                "checkName": "ai_generated_image_detector",
                "result": "not_applicable",
                "confidence": 0,
                "explanation": f"Hugging Face API returned status {res.status_code}; AI generation signal excluded.",
                "provider": "huggingface",
                "available": False,
                "ai_probability": None,
            }
    except Exception as exc:
        return {
            "checkName": "ai_generated_image_detector",
            "result": "not_applicable",
            "confidence": 0,
            "explanation": f"Hugging Face network request failed: {exc}",
            "provider": "huggingface",
            "available": False,
            "ai_probability": None,
        }

    # Parse response array
    if not isinstance(response_payload, list):
        return {
            "checkName": "ai_generated_image_detector",
            "result": "not_applicable",
            "confidence": 0,
            "explanation": "Unexpected response structure from Hugging Face inference API.",
            "provider": "huggingface",
            "available": False,
            "ai_probability": None,
        }

    # Find AI/synthetic label
    ai_score = 0.0
    for item in response_payload:
        if isinstance(item, dict):
            label = str(item.get("label", "")).lower()
            score = float(item.get("score", 0.0))
            if re.search(r"ai|art|fake|synthetic|generated", label):
                ai_score = score
                break

    ai_percentage = round(ai_score * 100)
    is_ai = ai_percentage > 70
    conf = 100 - ai_percentage if not is_ai else max(15, 100 - ai_percentage)

    if is_ai:
        return {
            "checkName": "ai_generated_image_detector",
            "result": "flag",
            "confidence": conf,
            "explanation": f"Hugging Face detector ({used_model}) detected high AI-generation likelihood ({ai_percentage}%). Potential synthetic or AI-inpainted image.",
            "provider": "huggingface",
            "available": True,
            "ai_probability": ai_score,
        }

    return {
        "checkName": "ai_generated_image_detector",
        "result": "pass",
        "confidence": conf,
        "explanation": f"Hugging Face detector ({used_model}) detected low AI-generation likelihood ({ai_percentage}%).",
        "provider": "huggingface",
        "available": True,
        "ai_probability": ai_score,
    }
