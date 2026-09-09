from __future__ import annotations

import numpy as np
from PIL import Image, ImageDraw
from modules.typography_checker import analyze_typography, extract_fields_from_text


def test_extract_fields_from_text():
    sample_text = """
    GOVERNMENT OF INDIA
    Name: Rahul Sharma
    DOB: 15/08/1990
    Gender: MALE
    1234 5678 9012
    ABCDE1234F
    """
    fields = extract_fields_from_text(sample_text)
    assert fields.get("dob") == "15/08/1990"
    assert fields.get("gender") == "MALE"
    assert fields.get("aadhaar_number") == "1234 5678 9012"
    assert fields.get("pan_number") == "ABCDE1234F"
    assert fields.get("name") == "Rahul Sharma"


def test_analyze_typography_blank_and_pattern():
    img = Image.new("RGB", (400, 200), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    for y in range(40, 160, 20):
        draw.line([(50, y), (350, y)], fill=(0, 0, 0), width=2)

    res = analyze_typography(img)
    assert "checkName" in res
    assert res["checkName"] == "ocr_typography_consistency"
    assert res["result"] in ("pass", "flag", "not_applicable")
    assert 0 <= res["confidence"] <= 100


def test_analyze_typography_real_text_extraction():
    img = Image.new("RGB", (600, 200), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((30, 30), "GOVERNMENT OF INDIA", fill=(0, 0, 0))
    draw.text((30, 70), "Name: Aryan Sharma", fill=(0, 0, 0))
    draw.text((30, 110), "DOB: 15/08/1998", fill=(0, 0, 0))
    draw.text((30, 150), "Aadhaar: 9999 4105 7033", fill=(0, 0, 0))

    res = analyze_typography(img)
    assert res["checkName"] == "ocr_typography_consistency"
    assert res["result"] == "pass"
    assert res["confidence"] >= 80
    assert "Aryan" in res.get("extracted_text", "") or "Sharma" in res.get("extracted_text", "")
    assert res.get("extracted_fields", {}).get("name") == "Aryan Sharma"
    assert "9999 4105 7033" in res.get("extracted_fields", {}).get("aadhaar_number", "")

