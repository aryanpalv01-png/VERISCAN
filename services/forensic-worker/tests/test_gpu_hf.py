from __future__ import annotations

import os
from PIL import Image
from modules.trufor_adapter import run_trufor_analysis
from modules.catnet_adapter import run_catnet_analysis
from modules.hf_detector import detect_ai_generation


def test_trufor_not_configured_and_synthetic():
    img = Image.new("RGB", (200, 200), color=(128, 128, 128))
    
    # When checkpoint not configured and mock disabled
    old_mock = os.environ.get("ALLOW_SYNTHETIC_MODEL_INFERENCE")
    os.environ.pop("ALLOW_SYNTHETIC_MODEL_INFERENCE", None)
    os.environ.pop("TRUFOR_CHECKPOINT", None)
    
    res = run_trufor_analysis(img)
    assert res["checkName"] == "trufor_inference"
    assert res["result"] == "not_applicable"
    
    # With synthetic enabled
    os.environ["ALLOW_SYNTHETIC_MODEL_INFERENCE"] = "true"
    res_mock = run_trufor_analysis(img)
    assert res_mock["checkName"] == "trufor_inference"
    assert res_mock["result"] in ("pass", "flag")
    assert res_mock["available"] is True
    
    if old_mock is not None:
        os.environ["ALLOW_SYNTHETIC_MODEL_INFERENCE"] = old_mock
    else:
        os.environ.pop("ALLOW_SYNTHETIC_MODEL_INFERENCE", None)


def test_catnet_not_configured_and_synthetic():
    img = Image.new("RGB", (200, 200), color=(128, 128, 128))
    
    old_mock = os.environ.get("ALLOW_SYNTHETIC_MODEL_INFERENCE")
    os.environ.pop("ALLOW_SYNTHETIC_MODEL_INFERENCE", None)
    os.environ.pop("CATNET_CHECKPOINT", None)
    
    res = run_catnet_analysis(img)
    assert res["checkName"] == "catnet_inference"
    assert res["result"] == "not_applicable"
    
    os.environ["ALLOW_SYNTHETIC_MODEL_INFERENCE"] = "true"
    res_mock = run_catnet_analysis(img)
    assert res_mock["checkName"] == "catnet_inference"
    assert res_mock["result"] in ("pass", "flag")
    assert res_mock["available"] is True
    
    if old_mock is not None:
        os.environ["ALLOW_SYNTHETIC_MODEL_INFERENCE"] = old_mock
    else:
        os.environ.pop("ALLOW_SYNTHETIC_MODEL_INFERENCE", None)


def test_hf_detector_without_token():
    old_token = os.environ.get("HF_API_TOKEN")
    os.environ.pop("HF_API_TOKEN", None)
    
    dummy_bytes = b"fake_image_bytes"
    res = detect_ai_generation(dummy_bytes, mime_type="image/jpeg")
    assert res["checkName"] == "ai_generated_image_detector"
    assert res["result"] == "not_applicable"
    assert "HF_API_TOKEN" in res["explanation"]
    
    if old_token is not None:
        os.environ["HF_API_TOKEN"] = old_token


def test_hf_detector_redacts_payload_before_dispatch(monkeypatch):
    import io
    import numpy as np
    import cv2
    from unittest.mock import MagicMock, patch

    # Create an image with white background and text
    img = Image.new("RGB", (300, 200), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    original_bytes = buf.getvalue()

    monkeypatch.setenv("HF_API_TOKEN", "hf_test_token_12345")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = [{"label": "artificial", "score": 0.05}]

    with patch("requests.post", return_value=mock_resp) as mock_post:
        res = detect_ai_generation(original_bytes, mime_type="image/jpeg")
        assert res["checkName"] == "ai_generated_image_detector"
        assert res["result"] == "pass"

        # Verify that requests.post was called
        assert mock_post.called
        call_kwargs = mock_post.call_args[1]
        dispatched_bytes = call_kwargs["data"]

        # Dispatched payload MUST NOT be raw original bytes
        assert dispatched_bytes != original_bytes

        # Dispatched image MUST contain solid black redaction pixels
        dispatched_img = cv2.imdecode(np.frombuffer(dispatched_bytes, np.uint8), cv2.IMREAD_COLOR)
        assert dispatched_img is not None
        black_pixels = np.all(dispatched_img == [0, 0, 0], axis=-1)
        assert np.sum(black_pixels) > 0, "Dispatched image must have black redaction pixels masking PII"

