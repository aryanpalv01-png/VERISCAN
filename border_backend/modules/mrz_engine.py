"""
ICAO 9303 Machine Readable Zone (MRZ) Parser & Checksum Engine
Supports TD1 (3x30), TD2 (2x36), and TD3 (2x44 Passports) with 7-3-1 weighting.
"""
from __future__ import annotations

import re
from io import BytesIO
from typing import Optional, Union
import numpy as np
from PIL import Image
import cv2

from border_backend.models import (
    ChecksumFieldResult,
    ExtractedMrzFields,
    MrzChecksums,
    ExtractAndValidateResponse,
)
from border_backend.modules.date_validator import validate_mrz_dates

# 7-3-1 Weighting constant per ICAO 9303 specifications
ICAO_WEIGHTS = (7, 3, 1)

# OCR engine fallbacks
try:
    from rapidocr_onnxruntime import RapidOCR
    _rapid_ocr = RapidOCR()
except Exception:
    _rapid_ocr = None

try:
    import pytesseract
except ImportError:
    pytesseract = None


def icao_char_value(char: str) -> int:
    """
    Returns character numerical value according to ICAO Doc 9303:
    0-9 -> 0-9
    A-Z -> 10-35
    < (filler) -> 0
    """
    c = char.upper()
    if "0" <= c <= "9":
        return ord(c) - ord("0")
    if "A" <= c <= "Z":
        return ord(c) - ord("A") + 10
    if c == "<":
        return 0
    # Any unrecognized character is treated as 0 for parity tolerance
    return 0


def compute_icao_check_digit(data: str) -> str:
    """
    Calculates check digit for a string using ICAO 9303 (7, 3, 1) cyclic weights modulo 10.
    """
    total = sum(icao_char_value(c) * ICAO_WEIGHTS[i % 3] for i, c in enumerate(data))
    return str(total % 10)


def sanitize_mrz_line(line: str) -> str:
    """
    Normalizes a candidate MRZ line:
    - Removes spaces and invisible control characters
    - Converts to uppercase
    - Replaces common OCR misreads ('«' -> '<', '{' -> '<', etc.)
    """
    clean = line.strip().upper()
    clean = clean.replace(" ", "").replace("«", "<").replace("‹", "<").replace("(", "<").replace("{", "<")
    clean = re.sub(r"[^A-Z0-9<]", "<", clean)
    return clean


def correct_numeric_field(data: str) -> str:
    """
    Substitutes common OCR letter confusions in strictly numeric MRZ zones (dates, check digits).
    """
    replacements = {
        "O": "0", "D": "0", "Q": "0",
        "I": "1", "L": "1", "|": "1", "T": "1",
        "Z": "2",
        "S": "5",
        "B": "8",
    }
    chars = list(data)
    for i, c in enumerate(chars):
        if c in replacements:
            chars[i] = replacements[c]
    return "".join(chars)


def parse_td3_passport(lines: list[str]) -> tuple[ExtractedMrzFields, MrzChecksums, list[str]]:
    """
    Parses ICAO 9303 TD3 (Passport: 2 lines of 44 characters).
    """
    line1 = sanitize_mrz_line(lines[0])[:44].ljust(44, "<")
    line2 = sanitize_mrz_line(lines[1])[:44].ljust(44, "<")
    errors: list[str] = []

    # Line 1 Breakdown
    doc_type = line1[0:2].replace("<", "")
    issuing_country = line1[2:5].replace("<", "")
    name_field = line1[5:44]
    name_parts = name_field.split("<<", 1)
    surname = name_parts[0].replace("<", " ").strip()
    given_names = name_parts[1].replace("<", " ").strip() if len(name_parts) > 1 else ""

    # Line 2 Breakdown
    # Document number: chars 0..9 (9 chars)
    raw_doc_num = line2[0:9]
    extracted_doc_cd = correct_numeric_field(line2[9:10])
    computed_doc_cd = compute_icao_check_digit(raw_doc_num)
    doc_num_valid = (extracted_doc_cd == computed_doc_cd)
    if not doc_num_valid:
        errors.append(f"Document Number Checksum mismatch: Extracted '{extracted_doc_cd}', Computed '{computed_doc_cd}'.")

    # Nationality: chars 10..13 (3 chars)
    nationality = line2[10:13].replace("<", "")

    # Date of Birth: chars 13..19 (6 chars) + check digit at char 19
    raw_dob = correct_numeric_field(line2[13:19])
    extracted_dob_cd = correct_numeric_field(line2[19:20])
    computed_dob_cd = compute_icao_check_digit(raw_dob)
    dob_valid = (extracted_dob_cd == computed_dob_cd)
    if not dob_valid:
        errors.append(f"Date of Birth Checksum mismatch: Extracted '{extracted_dob_cd}', Computed '{computed_dob_cd}'.")

    # Sex: char 20
    sex = line2[20:21]
    if sex not in ("M", "F"):
        sex = "X"

    # Expiration Date: chars 21..27 (6 chars) + check digit at char 27
    raw_exp = correct_numeric_field(line2[21:27])
    extracted_exp_cd = correct_numeric_field(line2[27:28])
    computed_exp_cd = compute_icao_check_digit(raw_exp)
    exp_valid = (extracted_exp_cd == computed_exp_cd)
    if not exp_valid:
        errors.append(f"Expiration Date Checksum mismatch: Extracted '{extracted_exp_cd}', Computed '{computed_exp_cd}'.")

    # Optional / Personal Number: chars 28..42 (14 chars) + check digit at char 42
    optional_data = line2[28:42].replace("<", "")
    extracted_opt_cd = line2[42:43]
    opt_checksum_result: Optional[ChecksumFieldResult] = None
    if extracted_opt_cd != "<" and extracted_opt_cd.isdigit():
        computed_opt_cd = compute_icao_check_digit(line2[28:42])
        opt_valid = (extracted_opt_cd == computed_opt_cd)
        opt_checksum_result = ChecksumFieldResult(
            valid=opt_valid,
            extracted=extracted_opt_cd,
            computed=computed_opt_cd,
            field_name="optional_data",
        )
        if not opt_valid:
            errors.append(f"Optional Data Checksum mismatch: Extracted '{extracted_opt_cd}', Computed '{computed_opt_cd}'.")

    # Composite Checksum: covers chars 0..10, 13..20, 21..43 (39 chars total)
    composite_data = line2[0:10] + line2[13:20] + line2[21:43]
    extracted_comp_cd = correct_numeric_field(line2[43:44])
    computed_comp_cd = compute_icao_check_digit(composite_data)
    comp_valid = (extracted_comp_cd == computed_comp_cd)
    if not comp_valid:
        errors.append(f"Composite Master Checksum mismatch: Extracted '{extracted_comp_cd}', Computed '{computed_comp_cd}'.")

    overall_valid = doc_num_valid and dob_valid and exp_valid and comp_valid and (opt_checksum_result.valid if opt_checksum_result else True)

    fields = ExtractedMrzFields(
        document_type=doc_type or "P",
        issuing_country=issuing_country,
        surname=surname,
        given_names=given_names,
        document_number=raw_doc_num.replace("<", ""),
        nationality=nationality,
        date_of_birth=raw_dob,
        sex=sex,
        expiration_date=raw_exp,
        optional_data=optional_data if optional_data else None,
    )

    checksums = MrzChecksums(
        document_number=ChecksumFieldResult(
            valid=doc_num_valid,
            extracted=extracted_doc_cd,
            computed=computed_doc_cd,
            field_name="document_number",
        ),
        date_of_birth=ChecksumFieldResult(
            valid=dob_valid,
            extracted=extracted_dob_cd,
            computed=computed_dob_cd,
            field_name="date_of_birth",
        ),
        expiration_date=ChecksumFieldResult(
            valid=exp_valid,
            extracted=extracted_exp_cd,
            computed=computed_exp_cd,
            field_name="expiration_date",
        ),
        optional_data=opt_checksum_result,
        composite=ChecksumFieldResult(
            valid=comp_valid,
            extracted=extracted_comp_cd,
            computed=computed_comp_cd,
            field_name="composite",
        ),
        overall_valid=overall_valid,
    )

    return fields, checksums, errors


def parse_td1_id_card(lines: list[str]) -> tuple[ExtractedMrzFields, MrzChecksums, list[str]]:
    """
    Parses ICAO 9303 TD1 (Identity Cards: 3 lines of 30 characters).
    """
    l1 = sanitize_mrz_line(lines[0])[:30].ljust(30, "<")
    l2 = sanitize_mrz_line(lines[1])[:30].ljust(30, "<")
    l3 = sanitize_mrz_line(lines[2])[:30].ljust(30, "<")
    errors: list[str] = []

    # Line 1: Doc type (0..2), Issuing country (2..5), Doc num (5..14), Check digit (14), Optional (15..30)
    doc_type = l1[0:2].replace("<", "")
    issuing_country = l1[2:5].replace("<", "")
    raw_doc_num = l1[5:14]
    extracted_doc_cd = correct_numeric_field(l1[14:15])
    computed_doc_cd = compute_icao_check_digit(raw_doc_num)
    doc_num_valid = (extracted_doc_cd == computed_doc_cd)
    if not doc_num_valid:
        errors.append(f"Document Number Checksum mismatch: Extracted '{extracted_doc_cd}', Computed '{computed_doc_cd}'.")

    # Line 2: DOB (0..6), Check digit (6), Sex (7), Expiry (8..14), Check digit (14), Nationality (15..18), Optional (18..29), Composite (29)
    raw_dob = correct_numeric_field(l2[0:6])
    extracted_dob_cd = correct_numeric_field(l2[6:7])
    computed_dob_cd = compute_icao_check_digit(raw_dob)
    dob_valid = (extracted_dob_cd == computed_dob_cd)
    if not dob_valid:
        errors.append(f"Date of Birth Checksum mismatch: Extracted '{extracted_dob_cd}', Computed '{computed_dob_cd}'.")

    sex = l2[7:8]
    raw_exp = correct_numeric_field(l2[8:14])
    extracted_exp_cd = correct_numeric_field(l2[14:15])
    computed_exp_cd = compute_icao_check_digit(raw_exp)
    exp_valid = (extracted_exp_cd == computed_exp_cd)
    if not exp_valid:
        errors.append(f"Expiration Date Checksum mismatch: Extracted '{extracted_exp_cd}', Computed '{computed_exp_cd}'.")

    nationality = l2[15:18].replace("<", "")

    # Composite check digit (covers L1 chars 5..30, L2 chars 0..7, 8..15, 18..29)
    composite_data = l1[5:30] + l2[0:7] + l2[8:15] + l2[18:29]
    extracted_comp_cd = correct_numeric_field(l2[29:30])
    computed_comp_cd = compute_icao_check_digit(composite_data)
    comp_valid = (extracted_comp_cd == computed_comp_cd)
    if not comp_valid:
        errors.append(f"Composite Checksum mismatch: Extracted '{extracted_comp_cd}', Computed '{computed_comp_cd}'.")

    # Line 3: Name
    name_parts = l3.split("<<", 1)
    surname = name_parts[0].replace("<", " ").strip()
    given_names = name_parts[1].replace("<", " ").strip() if len(name_parts) > 1 else ""

    overall_valid = doc_num_valid and dob_valid and exp_valid and comp_valid

    fields = ExtractedMrzFields(
        document_type=doc_type or "I",
        issuing_country=issuing_country,
        surname=surname,
        given_names=given_names,
        document_number=raw_doc_num.replace("<", ""),
        nationality=nationality,
        date_of_birth=raw_dob,
        sex=sex,
        expiration_date=raw_exp,
        optional_data=l1[15:30].replace("<", "") or None,
    )

    checksums = MrzChecksums(
        document_number=ChecksumFieldResult(
            valid=doc_num_valid,
            extracted=extracted_doc_cd,
            computed=computed_doc_cd,
            field_name="document_number",
        ),
        date_of_birth=ChecksumFieldResult(
            valid=dob_valid,
            extracted=extracted_dob_cd,
            computed=computed_dob_cd,
            field_name="date_of_birth",
        ),
        expiration_date=ChecksumFieldResult(
            valid=exp_valid,
            extracted=extracted_exp_cd,
            computed=computed_exp_cd,
            field_name="expiration_date",
        ),
        composite=ChecksumFieldResult(
            valid=comp_valid,
            extracted=extracted_comp_cd,
            computed=computed_comp_cd,
            field_name="composite",
        ),
        overall_valid=overall_valid,
    )

    return fields, checksums, errors


def extract_candidate_mrz_lines(raw_text: str) -> list[str]:
    """
    Finds contiguous sequences of MRZ lines from raw text output.
    Tolerates OCR trimming of trailing '<' filler characters by right-padding to standard dimensions.
    """
    raw_split = [line.strip() for line in raw_text.splitlines() if line.strip()]
    lines = [sanitize_mrz_line(line) for line in raw_split]

    mrz_candidates = [
        line for line in lines
        if len(line) >= 16 and (
            "<" in line or
            line.startswith(("P", "I", "V", "A", "C")) or
            sum(c.isdigit() for c in line) >= 6
        )
    ]

    # Check for TD3 (2 lines: Line 1 with P/name, Line 2 with digits)
    if len(mrz_candidates) >= 2:
        for i in range(len(mrz_candidates) - 1):
            c1, c2 = mrz_candidates[i], mrz_candidates[i + 1]
            if (c1.startswith("P") or "<<" in c1 or "<" in c1) and any(c.isdigit() for c in c2):
                return [c1.ljust(44, "<")[:44], c2.ljust(44, "<")[:44]]

    # Check for TD1 (3 lines of ~30)
    if len(mrz_candidates) >= 3:
        for i in range(len(mrz_candidates) - 2):
            c1, c2, c3 = mrz_candidates[i], mrz_candidates[i + 1], mrz_candidates[i + 2]
            if (c1.startswith("I") or "<" in c1) and any(c.isdigit() for c in c2):
                return [c1.ljust(30, "<")[:30], c2.ljust(30, "<")[:30], c3.ljust(30, "<")[:30]]

    # Check for TD2 (2 lines of ~36)
    if len(mrz_candidates) >= 2:
        for i in range(len(mrz_candidates) - 1):
            c1, c2 = mrz_candidates[i], mrz_candidates[i + 1]
            if len(c1) <= 38 and len(c2) <= 38:
                return [c1.ljust(36, "<")[:36], c2.ljust(36, "<")[:36]]

    return [c.ljust(44, "<")[:44] for c in mrz_candidates[:2]]


def extract_mrz_from_image(image_bytes: bytes) -> tuple[list[str], str]:
    """
    Preprocesses specimen image and extracts candidate MRZ text lines using RapidOCR / pytesseract.
    """
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return [], "Could not decode image raster."

        extracted_text = ""

        # Attempt 1: Lower 45% crop with thresholding
        h, w = img.shape[:2]
        crop_y = int(h * 0.55)
        mrz_crop = img[crop_y:h, 0:w]

        if _rapid_ocr is not None:
            try:
                res, _ = _rapid_ocr(mrz_crop)
                if res:
                    extracted_text = "\n".join(str(item[1]) for item in res)
            except Exception:
                pass

        # Attempt 2: Full image if crop had insufficient lines
        candidate_lines = extract_candidate_mrz_lines(extracted_text)
        if len(candidate_lines) < 2 and _rapid_ocr is not None:
            try:
                res, _ = _rapid_ocr(img)
                if res:
                    full_text = "\n".join(str(item[1]) for item in res)
                    full_candidates = extract_candidate_mrz_lines(full_text)
                    if len(full_candidates) >= 2:
                        return full_candidates, full_text
            except Exception:
                pass

        # Attempt 3: pytesseract fallback
        if len(candidate_lines) < 2 and pytesseract is not None:
            try:
                gray = cv2.cvtColor(mrz_crop, cv2.COLOR_BGR2GRAY)
                tess_text = pytesseract.image_to_string(gray, config="--psm 6")
                candidate_lines = extract_candidate_mrz_lines(tess_text)
                if candidate_lines:
                    return candidate_lines, tess_text
            except Exception:
                pass

        return candidate_lines, extracted_text
    except Exception as exc:
        return [], f"OCR extraction exception: {exc}"


def process_and_validate_mrz(
    source: Union[str, bytes],
    document_type_hint: str = "passport"
) -> ExtractAndValidateResponse:
    """
    Orchestrates Phase 1:
    1. Extracts or receives candidate MRZ strings
    2. Identifies TD3/TD1/TD2 format
    3. Runs ICAO 9303 checksum verification on all fields
    4. Executes temporal date logic (DOB & Expiry)
    5. Assembles deterministic PASS / FAIL verdict
    """
    raw_lines: list[str] = []
    ocr_diagnostic = ""

    if isinstance(source, bytes):
        raw_lines, ocr_diagnostic = extract_mrz_from_image(source)
    else:
        raw_lines = extract_candidate_mrz_lines(source)

    if not raw_lines or len(raw_lines) < 2:
        return ExtractAndValidateResponse(
            status="FAIL",
            mrz_detected=False,
            format=None,
            raw_mrz_lines=raw_lines,
            confidence_score=0,
            summary="No valid Machine Readable Zone (MRZ) detected in specimen.",
            errors=["MRZ detection failed. Could not locate 2 or 3 standard ICAO 9303 text lines."],
            warnings=[ocr_diagnostic] if ocr_diagnostic else [],
        )

    # Format detection
    format_type = "UNKNOWN"
    fields: Optional[ExtractedMrzFields] = None
    checksums: Optional[MrzChecksums] = None
    parsing_errors: list[str] = []

    if len(raw_lines) == 3 or (len(raw_lines[0]) <= 32 and len(raw_lines) >= 3):
        format_type = "TD1"
        fields, checksums, parsing_errors = parse_td1_id_card(raw_lines)
    elif len(raw_lines) >= 2 and len(raw_lines[0]) >= 40:
        format_type = "TD3"
        fields, checksums, parsing_errors = parse_td3_passport(raw_lines)
    elif len(raw_lines) >= 2:
        format_type = "TD2"
        # Fallback to TD3 line parsing or TD1
        fields, checksums, parsing_errors = parse_td3_passport(raw_lines)
    else:
        format_type = "UNKNOWN"
        parsing_errors.append("Unrecognized MRZ line dimensions.")

    if not fields or not checksums:
        return ExtractAndValidateResponse(
            status="FAIL",
            mrz_detected=True,
            format=format_type,
            raw_mrz_lines=raw_lines,
            confidence_score=15,
            summary="MRZ lines detected but structured field segmentation failed.",
            errors=parsing_errors,
        )

    # Run Date Logic Validation
    date_result = validate_mrz_dates(fields.date_of_birth, fields.expiration_date)

    all_errors = list(parsing_errors)
    all_errors.extend(date_result.errors)
    all_warnings = list(date_result.warnings)

    checksum_passed = checksums.overall_valid
    date_passed = date_result.dob_valid and not date_result.is_expired

    if checksum_passed and date_passed and len(all_errors) == 0:
        status = "PASS"
        confidence = 98
        summary = f"ICAO 9303 Checksum parity and temporal date validity confirmed for {fields.surname}, {fields.given_names} ({fields.document_number})."
    elif not checksum_passed:
        status = "FAIL"
        confidence = 10
        summary = f"CRITICAL TAMPERING ALERT: ICAO 9303 Checksum verification failed for document {fields.document_number}."
    else:
        status = "FAIL"
        confidence = 25
        summary = f"DOCUMENT INVALID: Temporal date logic violation detected ({date_result.errors[0] if date_result.errors else 'Expired or invalid'})."

    return ExtractAndValidateResponse(
        status=status,
        mrz_detected=True,
        format=format_type,
        raw_mrz_lines=raw_lines,
        fields=fields,
        checksums=checksums,
        date_validation=date_result,
        confidence_score=confidence,
        summary=summary,
        errors=all_errors,
        warnings=all_warnings,
    )
