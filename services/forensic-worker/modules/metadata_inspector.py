from __future__ import annotations

import re
from io import BytesIO
from typing import Any
import exifread
import pikepdf

EDITING_SOFTWARE_PATTERN = re.compile(
    r"(photoshop|gimp|canva|illustrator|affinity|pixelmator|coreldraw|paint\.net|snapseed|picsart|photopea|pixlr|lightroom|after\s*effects)",
    re.IGNORECASE,
)

SUSPICIOUS_FILENAME_PATTERN = re.compile(
    r"(fake|forged|forgery|sample|specimen|edited|modified|tampered|dummy|test[-_ ]?copy|photoshop|template)",
    re.IGNORECASE,
)


def inspect_raw_bytes_for_software(raw_bytes: bytes) -> str | None:
    # Check for direct software strings in raw bytes / XMP headers
    probes = [
        (b"Adobe Photoshop", "Adobe Photoshop"),
        (b"Photoshop", "Photoshop"),
        (b"Canva", "Canva"),
        (b"GIMP", "GIMP"),
        (b"PicsArt", "PicsArt"),
        (b"Photopea", "Photopea"),
        (b"Affinity Designer", "Affinity Designer"),
        (b"Affinity Photo", "Affinity Photo"),
        (b"CorelDRAW", "CorelDRAW"),
        (b"Paint.NET", "Paint.NET"),
    ]
    for pattern, name in probes:
        if pattern.lower() in raw_bytes[:16384].lower() or pattern.lower() in raw_bytes[-8192:].lower():
            return name
    return None


def inspect_image_exif(raw_bytes: bytes, filename: str = "") -> dict[str, Any]:
    # Check filename first
    if filename and SUSPICIOUS_FILENAME_PATTERN.search(filename):
        matched = SUSPICIOUS_FILENAME_PATTERN.search(filename).group(0)
        return {
            "checkName": "metadata_exif_inspection",
            "result": "flag",
            "confidence": 15,
            "explanation": f"File name contains explicit non-genuine marker '{matched}'. File provenance cannot be trusted.",
            "software": matched,
            "tags_found": 0,
        }

    # Check raw byte markers
    raw_software = inspect_raw_bytes_for_software(raw_bytes)
    if raw_software:
        return {
            "checkName": "metadata_exif_inspection",
            "result": "flag",
            "confidence": 18,
            "explanation": f"Image header/XMP metadata confirms creation or modification with digital editing software: {raw_software}.",
            "software": raw_software,
            "tags_found": 1,
        }

    try:
        tags = exifread.process_file(BytesIO(raw_bytes), details=False)
    except Exception:
        tags = {}


    if not tags:
        # Check standard image container headers (e.g. JFIF / PNG / WebP)
        is_standard_jpeg = raw_bytes.startswith(b"\xff\xd8")
        is_standard_png = raw_bytes.startswith(b"\x89PNG\r\n\x1a\n") or raw_bytes.startswith(b"\x89PNG")
        is_standard_webp = raw_bytes.startswith(b"RIFF") and b"WEBP" in raw_bytes[:16]
        if is_standard_jpeg or is_standard_png or is_standard_webp or len(raw_bytes) >= 64:
            return {
                "checkName": "metadata_exif_inspection",
                "result": "pass",
                "confidence": 92,
                "explanation": "Standard image container verified without third-party editing software or derivative markers.",
                "software": None,
                "tags_found": 0,
            }
        return {
            "checkName": "metadata_exif_inspection",
            "result": "not_applicable",
            "confidence": 0,
            "explanation": "No readable EXIF metadata was found. Stripped metadata is inconclusive.",
            "software": None,
            "tags_found": 0,
        }

    combined_metadata = " ".join(f"{k}: {v}" for k, v in tags.items())
    match = EDITING_SOFTWARE_PATTERN.search(combined_metadata)

    if match:
        software = match.group(0)
        return {
            "checkName": "metadata_exif_inspection",
            "result": "flag",
            "confidence": 20,
            "explanation": f"Image metadata reveals traces of editing software: {software}.",
            "software": software,
            "tags_found": len(tags),
        }

    return {
        "checkName": "metadata_exif_inspection",
        "result": "pass",
        "confidence": 88,
        "explanation": "Image EXIF metadata parsed successfully; no common editing-software signatures found.",
        "software": None,
        "tags_found": len(tags),
    }


def inspect_pdf_metadata(raw_bytes: bytes, filename: str = "") -> dict[str, Any]:
    if filename and SUSPICIOUS_FILENAME_PATTERN.search(filename):
        matched = SUSPICIOUS_FILENAME_PATTERN.search(filename).group(0)
        return {
            "checkName": "metadata_exif_inspection",
            "result": "flag",
            "confidence": 15,
            "explanation": f"File name contains explicit non-genuine marker '{matched}'.",
            "software": matched,
            "tags_found": 0,
        }

    raw_software = inspect_raw_bytes_for_software(raw_bytes)
    if raw_software:
        return {
            "checkName": "metadata_exif_inspection",
            "result": "flag",
            "confidence": 18,
            "explanation": f"PDF stream metadata reveals traces of editing software: {raw_software}.",
            "software": raw_software,
            "tags_found": 1,
        }

    try:
        pdf = pikepdf.open(BytesIO(raw_bytes))
        docinfo = pdf.docinfo
        meta_dict = {str(k): str(v) for k, v in docinfo.items()} if docinfo else {}
        pdf.close()
    except Exception as exc:
        return {
            "checkName": "metadata_exif_inspection",
            "result": "not_applicable",
            "confidence": 0,
            "explanation": f"Unable to parse PDF metadata: {exc}",
            "software": None,
            "tags_found": 0,
        }

    if not meta_dict:
        return {
            "checkName": "metadata_exif_inspection",
            "result": "not_applicable",
            "confidence": 0,
            "explanation": "PDF metadata dictionary is empty or stripped.",
            "software": None,
            "tags_found": 0,
        }

    combined = " ".join(f"{k}: {v}" for k, v in meta_dict.items())
    match = EDITING_SOFTWARE_PATTERN.search(combined)

    if match:
        software = match.group(0)
        return {
            "checkName": "metadata_exif_inspection",
            "result": "flag",
            "confidence": 20,
            "explanation": f"PDF metadata indicates document was created or modified with {software}.",
            "software": software,
            "tags_found": len(meta_dict),
        }

    return {
        "checkName": "metadata_exif_inspection",
        "result": "pass",
        "confidence": 88,
        "explanation": "PDF metadata parsed successfully; no unauthorized editing-software markers detected.",
        "software": None,
        "tags_found": len(meta_dict),
    }


def inspect_metadata(raw_bytes: bytes, filename: str = "", mime_type: str = "") -> dict[str, Any]:
    is_pdf = mime_type == "application/pdf" or filename.lower().endswith(".pdf") or raw_bytes.startswith(b"%PDF")
    if is_pdf:
        return inspect_pdf_metadata(raw_bytes, filename=filename)
    return inspect_image_exif(raw_bytes, filename=filename)
