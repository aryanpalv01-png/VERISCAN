from __future__ import annotations

import base64
import gc
import hashlib
import hmac
from io import BytesIO
import os
import re
from typing import Any

import cv2
import exifread
import numpy as np
from PIL import Image
import requests
from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile, status
from pydantic import BaseModel

# QR Decoders
try:
    from pyzbar.pyzbar import decode as decode_qr
except Exception:
    decode_qr = None

# OCR Engines
try:
    import pytesseract
except ImportError:
    pytesseract = None

try:
    from rapidocr_onnxruntime import RapidOCR
    _rapid_ocr = RapidOCR()
except Exception:
    _rapid_ocr = None


app = FastAPI(
    title="VeriScan Lightweight Microservice",
    description="Physical/Digital routing via OpenCV noise variance, adaptive OCR, fault-tolerant checksums, demographic sanity checks, and PII redaction.",
    version="2.1.0",
)


class AnalyzeRequest(BaseModel):
    file_url: str
    document_type: str | None = None


class RedactPiiRequest(BaseModel):
    image_url: str | None = None
    file_url: str | None = None
    content_base64: str | None = None


# =====================================================================
# RULE 1: Physical vs. Digital Routing (OpenCV Noise Variance)
# =====================================================================

def calculate_noise_variance(img_bgr: np.ndarray, variance_threshold: float = 2.5) -> tuple[float, bool]:
    """
    Examines optical sensor noise variance across the image using OpenCV.
    Genuine soft-copies (digital PDFs, clean screenshots) lack camera/scanner sensor noise.
    Flat patches with mean Sobel gradient < 12.0 are analyzed via a high-pass Laplacian filter.
    Returns:
        (noise_variance, is_digital_copy)
    """
    if img_bgr is None or img_bgr.size == 0:
        return 0.0, True

    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    if h < 32 or w < 32:
        return 0.0, True

    # 1. Gradient magnitude via Sobel to segment uniform/flat background from text/edges
    sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag = np.sqrt(sobel_x**2 + sobel_y**2)

    # 2. Laplacian high-pass filter to isolate high-frequency sensor noise / grain
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)

    patch_size = 16
    patch_variances: list[float] = []

    for y in range(0, h - patch_size, patch_size):
        for x in range(0, w - patch_size, patch_size):
            grad_patch = grad_mag[y : y + patch_size, x : x + patch_size]
            # Select uniform flat patches (margins, blank backgrounds)
            if float(np.mean(grad_patch)) < 12.0:
                noise_patch = laplacian[y : y + patch_size, x : x + patch_size]
                patch_variances.append(float(np.var(noise_patch)))

    if patch_variances:
        median_variance = float(np.median(patch_variances))
    else:
        # Fallback: estimate high-frequency residual across the image
        median_variance = float(np.var(laplacian))

    # Real camera/scanner captures exhibit sensor shot/read noise (variance >= threshold)
    # Digital PDFs and screenshots have near-zero sensor noise
    is_digital_copy = median_variance < variance_threshold
    return round(median_variance, 3), is_digital_copy


# =====================================================================
# RULE 2: Checksum OCR Resilience (Pre-processing & Fault-Tolerant Checksums)
# =====================================================================

# Verhoeff algorithm tables (Dihedral group D5)
VERHOEFF_MULT = (
    (0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
    (1, 2, 3, 4, 0, 6, 7, 8, 9, 5),
    (2, 3, 4, 0, 1, 7, 8, 9, 5, 6),
    (3, 4, 0, 1, 2, 8, 9, 5, 6, 7),
    (4, 0, 1, 2, 3, 9, 5, 6, 7, 8),
    (5, 9, 8, 7, 6, 0, 4, 3, 2, 1),
    (6, 5, 9, 8, 7, 1, 0, 4, 3, 2),
    (7, 6, 5, 9, 8, 2, 1, 0, 4, 3),
    (8, 7, 6, 5, 9, 3, 2, 1, 0, 4),
    (9, 8, 7, 6, 5, 4, 3, 2, 1, 0),
)

VERHOEFF_PERM = (
    (0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
    (1, 5, 7, 6, 2, 8, 3, 0, 9, 4),
    (5, 8, 0, 3, 7, 9, 6, 1, 4, 2),
    (8, 9, 1, 6, 0, 4, 3, 5, 2, 7),
    (9, 4, 5, 3, 1, 2, 6, 8, 7, 0),
    (4, 2, 8, 6, 5, 7, 3, 9, 0, 1),
    (2, 7, 9, 3, 8, 0, 6, 4, 1, 5),
    (7, 0, 4, 6, 9, 1, 3, 2, 5, 8),
)

# Standard PAN regex: 5 letters (4th is entity code [ABCFGHLJPT]), 4 digits, 1 letter
PAN_STRICT_REGEX = re.compile(r"^[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z]$")
PAN_RELAXED_REGEX = re.compile(r"^[A-Z]{5}\d{4}[A-Z]$")

# Character substitution maps for OCR error resilience
OCR_DIGIT_MAP = {
    "O": "0", "o": "0", "D": "0", "Q": "0",
    "I": "1", "l": "1", "i": "1", "|": "1", "!": "1",
    "Z": "2", "z": "2",
    "E": "3", "e": "3",
    "A": "4", "a": "4",
    "S": "5", "s": "5",
    "G": "6", "b": "6",
    "T": "7",
    "B": "8",
}

OCR_LETTER_MAP = {
    "0": "O",
    "1": "I",
    "2": "Z",
    "5": "S",
    "8": "B",
    "6": "G",
}


def validate_verhoeff(number_str: str) -> bool:
    digits = [int(d) for d in re.sub(r"\D", "", number_str)]
    if len(digits) != 12:
        return False
    checksum = 0
    for i, digit in enumerate(reversed(digits)):
        checksum = VERHOEFF_MULT[checksum][VERHOEFF_PERM[i % 8][digit]]
    return checksum == 0


def preprocess_image_for_ocr(img_bgr: np.ndarray) -> np.ndarray:
    """
    OpenCV image pre-processing (Grayscale + Adaptive Thresholding)
    to enhance text contrast before OCR.
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    thresh = cv2.adaptiveThreshold(
        blurred,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        15,
        8,
    )
    return thresh


def extract_ocr_text(img_bgr: np.ndarray) -> str:
    """
    Applies OpenCV adaptive thresholding and extracts text via pytesseract,
    with fallback to RapidOCR / original image if pytesseract is unavailable.
    """
    if img_bgr is None or img_bgr.size == 0:
        return ""

    thresh = preprocess_image_for_ocr(img_bgr)
    text = ""

    # Primary OCR: pytesseract with pre-processed adaptive threshold image
    if pytesseract is not None:
        try:
            text = pytesseract.image_to_string(thresh, config="--oem 3 --psm 6")
        except Exception:
            try:
                text = pytesseract.image_to_string(thresh)
            except Exception:
                text = ""

    # Secondary / fallback OCR: RapidOCR
    if not text.strip() and _rapid_ocr is not None:
        try:
            ocr_res, _ = _rapid_ocr(thresh)
            if not ocr_res:
                ocr_res, _ = _rapid_ocr(img_bgr)
            if ocr_res:
                text = "\n".join(str(item[1]) for item in ocr_res)
        except Exception:
            pass

    return text.strip()


def validate_checksum_fault_tolerant(doc_type: str, text: str) -> tuple[bool | None, str | None]:
    """
    Resilient structural/mathematical checksum validation.
    Normalizes common OCR character confusions (e.g. '0' <-> 'O', '1' <-> 'I').
    If OCR text is too garbled to find a 10-character PAN or 12-digit Aadhaar,
    returns (None, None), so genuine blurry documents are NOT penalized.
    """
    doc_type_clean = doc_type.lower().strip()

    # --- AADHAAR CHECKSUM ---
    if doc_type_clean == "aadhaar":
        # Search for 4-4-4 grouped pattern
        grouped_pattern = re.compile(
            r"\b([0-9OolIi|SszZbBEeAa]{4})\s*([0-9OolIi|SszZbBEeAa]{4})\s*([0-9OolIi|SszZbBEeAa]{4})\b",
            re.I
        )
        candidates: list[str] = []
        for m in grouped_pattern.finditer(text):
            cand = "".join(m.groups())
            if sum(c.isdigit() for c in cand) >= 3 or not cand.isalpha():
                candidates.append(cand)

        # Check contiguous 12-char pattern
        if not candidates:
            for m in re.finditer(r"\b[0-9OolIi|SszZbBEeAa]{12}\b", text):
                cand = m.group(0)
                if sum(c.isdigit() for c in cand) >= 4:
                    candidates.append(cand)

        # Check text without spaces
        if not candidates:
            compact = re.sub(r"\s+", "", text)
            for m in re.finditer(r"\b\d{12}\b", compact):
                candidates.append(m.group(0))

        if not candidates:
            # Blurry or garbled: no Aadhaar candidate found
            return None, None

        has_failed_candidate = False
        for cand in candidates:
            # 1. Direct digits
            clean_digits = re.sub(r"\D", "", cand)
            if len(clean_digits) == 12 and validate_verhoeff(clean_digits):
                return True, clean_digits

            # 2. Normalized digits
            normalized = "".join(OCR_DIGIT_MAP.get(c, c) for c in cand)
            norm_digits = re.sub(r"\D", "", normalized)
            if len(norm_digits) == 12:
                if validate_verhoeff(norm_digits):
                    return True, norm_digits
                else:
                    has_failed_candidate = True

        if has_failed_candidate:
            return False, candidates[0]

        return None, None

    # --- PAN STRUCTURAL VALIDATION ---
    if doc_type_clean == "pan":
        text_upper = text.upper()
        # Candidate pattern: 5 letters, 4 digits, 1 letter (allowing spaces and OCR confusions)
        pan_pattern = re.compile(
            r"\b([A-Z0-9]{5})\s*([0-9OolIZSBEA]{4})\s*([A-Z0-9])\b"
        )
        candidates: list[str] = []
        for m in pan_pattern.finditer(text_upper):
            cand = "".join(m.groups())
            # Require at least 2 letters in first 5 and at least 2 digits or confusable digits in middle 4
            if sum(c.isalpha() for c in cand[:5]) >= 2 and sum(c.isdigit() or c in "OOLIZSB" for c in cand[5:9]) >= 2:
                candidates.append(cand)

        if not candidates:
            for m in re.finditer(r"\b[A-Z0-9]{10}\b", text_upper):
                cand = m.group(0)
                if sum(c.isalpha() for c in cand[:5]) >= 3 and sum(c.isdigit() for c in cand[5:9]) >= 2:
                    candidates.append(cand)

        if not candidates:
            # Blurry or garbled: no PAN candidate found
            return None, None

        has_failed_candidate = False
        for cand in candidates:
            # 1. Direct match with official PAN structure (4th char in [ABCFGHLJPT])
            if PAN_STRICT_REGEX.fullmatch(cand):
                return True, cand

            # 2. Normalize OCR substitutions
            norm_chars = []
            for idx, ch in enumerate(cand):
                if idx in (0, 1, 2, 3, 4, 9):
                    norm_chars.append(OCR_LETTER_MAP.get(ch, ch))
                else:
                    norm_chars.append(OCR_DIGIT_MAP.get(ch, ch))
            normalized = "".join(norm_chars)

            if PAN_STRICT_REGEX.fullmatch(normalized):
                return True, normalized
            else:
                has_failed_candidate = True

        if has_failed_candidate:
            return False, candidates[0]

        return None, None

    # --- PASSPORT ---
    if doc_type_clean == "passport":
        text_upper = text.upper()
        # Indian passports: 1 letter followed by 7 digits
        passport_match = re.search(r"\b[A-Z][0-9]{7}\b", text_upper)
        if passport_match:
            return True, passport_match.group(0)

        # Normalize OCR confusions for 8-char pattern
        candidates = re.findall(r"\b[A-Z0-9]{8}\b", text_upper)
        for cand in candidates:
            first = OCR_LETTER_MAP.get(cand[0], cand[0])
            rest = "".join(OCR_DIGIT_MAP.get(c, c) for c in cand[1:])
            if first.isalpha() and rest.isdigit() and len(rest) == 7:
                return True, f"{first}{rest}"

        return None, None

    # Other or unknown document type
    return None, None


# =====================================================================
# RULE 3: Semantic Consistency (Demographic Sanity Check)
# =====================================================================

COMMON_DOC_TERMS = {
    "GOVERNMENT", "INDIA", "BHARAT", "SARKAR", "UIDAI", "AADHAAR", "UNIQUE",
    "IDENTIFICATION", "AUTHORITY", "INCOME", "TAX", "DEPARTMENT", "PERMANENT",
    "ACCOUNT", "NUMBER", "CARD", "FATHER", "FATHERS", "NAME", "DOB", "DATE",
    "BIRTH", "YEAR", "MALE", "FEMALE", "TRANSGENDER", "ADDRESS", "ENROLMENT",
    "HELP", "WWW", "GOV", "IN", "SIGNATURE", "REPUBLIC", "PASSPORT", "UNION",
    "STATE", "NATIONAL", "IDENTITY", "PHOTO", "VALID", "ONLY", "DOWNLOAD", "DETAILS"
}

# Explicit high-profile foreign entity names commonly used on meme/fake IDs
KNOWN_FOREIGN_PROFILES = {
    "donald trump", "donald john trump", "donald j trump",
    "joe biden", "barack obama", "george bush", "bill clinton",
    "vladimir putin", "boris johnson", "emmanuel macron", "angela merkel",
    "justin trudeau", "elon musk", "jeff bezos", "bill gates",
    "mark zuckerberg", "warren buffett", "steve jobs",
    "john doe", "jane doe", "bob smith", "alice smith",
    "peter parker", "bruce wayne", "clark kent", "tony stark",
    "james bond", "harry potter", "michael jackson", "adolf hitler",
}

# Common Western first names and surnames for demographic heuristics
WESTERN_FIRST_NAMES = {
    "donald", "ronald", "john", "james", "william", "charles", "george",
    "edward", "thomas", "henry", "arthur", "david", "richard", "joseph",
    "christopher", "daniel", "matthew", "anthony", "mark", "paul",
    "steven", "andrew", "kenneth", "joshua", "kevin", "brian", "timothy",
    "jason", "jeffrey", "ryan", "jacob", "gary", "nicholas", "eric",
    "stephen", "larry", "justin", "scott", "brandon", "frank", "benjamin",
    "gregory", "samuel", "raymond", "patrick", "alexander", "jack", "dennis",
    "jerry", "tyler", "aaron", "peter", "adam", "nathan", "zachary",
    "walter", "harold", "kyle", "carl", "gerald", "keith", "roger",
    "terry", "sean", "christian", "austin", "dylan", "jordan", "jesse",
    "bryan", "billy", "joe", "bruce", "gabriel", "logan", "albert",
    "alan", "wayne", "roy", "ralph", "randy", "eugene", "vincent",
    "russell", "louis", "philip", "bobby", "bradley", "emma", "olivia",
    "isabella", "sophia", "mia", "charlotte", "amelia", "harper", "evelyn",
    "emily", "elizabeth", "victoria", "grace", "chloe", "lily", "hannah"
}

WESTERN_SURNAMES = {
    "trump", "biden", "obama", "bush", "clinton", "smith", "johnson",
    "williams", "brown", "jones", "miller", "davis", "wilson", "anderson",
    "taylor", "jackson", "white", "harris", "clark", "robinson", "walker",
    "young", "allen", "king", "wright", "scott", "hill", "green", "adams",
    "baker", "hall", "campbell", "mitchell", "carter", "roberts", "evans",
    "turner", "parker", "edwards", "collins", "stewart", "morris", "murphy",
    "cook", "rogers", "morgan", "cooper", "peterson", "bailey", "reed",
    "kelly", "howard", "cox", "ward", "richardson", "watson", "brooks",
    "wood", "bennett", "gray", "hughes", "price", "sanders", "myers",
    "long", "ross", "foster", "powell", "jenkins", "perry", "russell",
    "sullivan", "bell", "coleman", "butler", "henderson", "barnes", "fisher"
}

INDIAN_SURNAMES_WHITELIST = {
    "kumar", "singh", "sharma", "verma", "gupta", "patel", "reddy", "rao",
    "nair", "iyer", "iyengar", "das", "chatterjee", "banerjee", "mukherjee",
    "joshi", "kulkarni", "deshmukh", "patil", "shah", "mehta", "jain",
    "agarwal", "mittal", "bansal", "yadav", "lal", "prasad", "chand",
    "mishra", "pandey", "tiwari", "dubey", "shukla", "bhat", "bhatt",
    "chowdhury", "sen", "ghosh", "bose", "dutta", "dey", "mondal",
    "saha", "pal", "paul", "biswas", "sarkar", "roy", "ali", "khan",
    "ahmed", "hussain", "rahman", "begum", "shaikh", "ansari", "siddiqui",
    "syed", "fernandes", "dsouza", "d'souza", "pereira", "lobo", "pinto",
    "menon", "pillai", "kurian", "varughese", "varghese", "mathew", "chacko"
}


def extract_name_entity(text: str, doc_type: str = "other") -> str | None:
    """
    Extracts the 'Name' entity from document OCR text using layout heuristics.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    # 1. Look for explicit 'Name:' label patterns
    for i, line in enumerate(lines):
        m = re.search(r"\b(?:Name|Given Name|Full Name)\s*[:\-]?\s*([A-Za-z\s\.\'\-]+)", line, re.I)
        if m:
            cand = m.group(1).strip()
            words = [w for w in cand.split() if w.upper() not in COMMON_DOC_TERMS and len(w) > 1 and w.isalpha()]
            if words:
                return " ".join(words)

        # In PAN cards, 'Name' is frequently on one line and the name string on the next line
        if re.fullmatch(r"(?:Name|NAME)", line, re.I) and i + 1 < len(lines):
            cand = lines[i + 1].strip()
            words = [w for w in cand.split() if w.upper() not in COMMON_DOC_TERMS and len(w) > 1 and w.isalpha()]
            if words:
                return " ".join(words)

    # 2. Position before DOB/Birth field
    for i, line in enumerate(lines):
        if re.search(r"\b(?:DOB|Date of Birth|Birth|YOB)\b", line, re.I):
            for prev_idx in range(i - 1, max(-1, i - 4), -1):
                cand = lines[prev_idx].strip()
                words = [w for w in cand.split() if w.upper() not in COMMON_DOC_TERMS and len(w) > 1 and w.isalpha()]
                if len(words) >= 2 and not re.search(r"\d", cand):
                    return " ".join(words)

    # 3. Position after header on Aadhaar cards (Government of India / Bharat Sarkar)
    for i, line in enumerate(lines):
        if re.search(r"Government of India|Bharat Sarkar|UIDAI|Income Tax", line, re.I):
            for next_idx in range(i + 1, min(len(lines), i + 4)):
                cand = lines[next_idx].strip()
                words = [w for w in cand.split() if w.upper() not in COMMON_DOC_TERMS and len(w) > 1 and w.isalpha()]
                if len(words) >= 2 and not re.search(r"[\d:@\/\\]", cand):
                    return " ".join(words)

    # 4. Fallback scan for capitalized alphabetic name line
    for line in lines:
        words = [w for w in line.split() if w.upper() not in COMMON_DOC_TERMS and len(w) > 1 and w.isalpha()]
        if 2 <= len(words) <= 4:
            return " ".join(words)

    return None


def check_demographic_sanity(
    name: str | None,
    doc_type: str,
    ocr_text: str = ""
) -> tuple[bool, str]:
    """
    Checks if an Indian document (PAN/Aadhaar) contains a foreign name pattern
    (e.g., Donald Trump, John Doe). Returns (semantic_mismatch, explanation).
    """
    is_indian_doc = doc_type in ["aadhaar", "pan", "voter_id", "driving_license"] or any(
        kw in ocr_text.upper() for kw in ["AADHAAR", "UIDAI", "INCOME TAX", "BHARAT SARKAR", "GOVERNMENT OF INDIA"]
    )

    if not is_indian_doc or not name:
        return False, "Document demographic context is consistent or non-Indian."

    name_clean = name.strip().lower()
    name_tokens = [re.sub(r"[^\w]", "", tok) for tok in name_clean.split()]

    # Check 1: Explicit match against known foreign fakes/memes
    for fake in KNOWN_FOREIGN_PROFILES:
        if fake in name_clean or all(tok in name_tokens for tok in fake.split()):
            return True, f"High-confidence demographic anomaly: Foreign name '{name}' detected on official Indian {doc_type.upper()} document."

    # Check 2: Western first name + Western surname not in Indian whitelist
    if len(name_tokens) >= 2:
        first, last = name_tokens[0], name_tokens[-1]
        if first in WESTERN_FIRST_NAMES and last in WESTERN_SURNAMES:
            if last not in INDIAN_SURNAMES_WHITELIST:
                return True, f"Demographic mismatch: Name '{name}' conforms to foreign Anglo/Western naming patterns incompatible with Indian statutory documents."

    return False, "Demographic check passed."


# =====================================================================
# Document Type Identification
# =====================================================================

def identify_document_type(text: str, filename: str = "", default: str = "other") -> str:
    """
    Identifies whether the document is an Aadhaar card, PAN card, Passport,
    Driving License, Voter ID, or other.
    """
    combined = f"{text} {filename}".upper()

    # Passport markers
    if any(k in combined for k in [
        "PASSPORT", "REPUBLIC OF INDIA", "PASSPORT NO",
        "P<IND", "GIVEN NAMES", "NATIONALITY"
    ]):
        return "passport"

    # Aadhaar markers
    if any(k in combined for k in [
        "AADHAAR", "UIDAI", "UNIQUE IDENTIFICATION",
        "MERA AADHAAR", "GOVERNMENT OF INDIA", "ENROLMENT NO", "VID :"
    ]):
        return "aadhaar"

    # PAN markers
    if any(k in combined for k in [
        "INCOME TAX DEPARTMENT", "PERMANENT ACCOUNT NUMBER",
        "INCOMETAX", "GOVT. OF INDIA"
    ]):
        return "pan"

    # Driving License markers
    if any(k in combined for k in [
        "DRIVING LICENCE", "DRIVING LICENSE", "UNION OF INDIA",
        "TRANSPORT DEPARTMENT", "FORM 7", "DL NO"
    ]):
        return "driving_license"

    # Voter ID markers
    if any(k in combined for k in [
        "ELECTION COMMISSION", "ELECTORAL", "EPIC", "VOTER"
    ]):
        return "voter_id"

    # Structural clues
    if re.search(r"\b[A-Z]{5}\d{4}[A-Z]\b", combined):
        return "pan"
    if re.search(r"\b\d{4}\s?\d{4}\s?\d{4}\b", combined):
        return "aadhaar"
    if re.search(r"\b[A-Z][0-9]{7}\b", combined):
        return "passport"

    return default if default in ["aadhaar", "pan", "passport", "driving_license", "voter_id"] else "other"


# =====================================================================
# EXIF & QR Code Helpers
# =====================================================================

def check_exif(file_bytes: bytes) -> tuple[bool, str | None]:
    try:
        tags = exifread.process_file(BytesIO(file_bytes), details=False)
        metadata = " ".join(str(value) for value in tags.values())
        software_match = re.search(r"Photoshop|GIMP|Canva|Illustrator", metadata, re.IGNORECASE)
        software = software_match.group(0) if software_match else None
        return software is None, software
    except Exception:
        return True, None


def check_qr(img_bgr: np.ndarray, file_bytes: bytes) -> bool:
    """
    Checks for the presence of a valid QR code using PyZbar and OpenCV QRCodeDetector.
    """
    # 1. Try PyZbar
    if decode_qr is not None:
        try:
            image = Image.open(BytesIO(file_bytes))
            for code in decode_qr(image):
                if code.data and len(code.data) > 0:
                    return True
        except Exception:
            pass

    # 2. Try OpenCV QRCodeDetector
    if img_bgr is not None and img_bgr.size > 0:
        try:
            detector = cv2.QRCodeDetector()
            val, points, _ = detector.detectAndDecode(img_bgr)
            if val and len(val.strip()) > 0:
                return True
        except Exception:
            pass

    return False


# =====================================================================
# Pipeline, Security & Endpoints
# =====================================================================

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
YUNET_PATH = os.path.join(CURRENT_DIR, "face_detection_yunet.onnx")
HAAR_PATH = os.path.join(CURRENT_DIR, "haarcascade_frontalface_default.xml")


def detect_faces_opencv(img_bgr: np.ndarray) -> list[tuple[int, int, int, int]]:
    """
    Detects human faces using lightweight OpenCV FaceDetectorYN (YuNet ONNX).
    Falls back to Haar Cascade Classifier if available.
    Returns list of (x, y, w, h) bounding boxes.
    """
    h, w = img_bgr.shape[:2]
    face_boxes: list[tuple[int, int, int, int]] = []

    # 1. Primary: YuNet DNN (Lightweight 228KB face detector)
    try:
        if os.path.exists(YUNET_PATH):
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

    # 2. Fallback: Haar Cascade if cv2 has CascadeClassifier and XML exists
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

    # Invert and threshold to isolate text foreground
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Horizontal dilation kernel to fuse adjacent letters/words into block regions
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


def load_image_bytes_in_memory(url_or_data: str) -> bytes:
    """
    Strict zero-disk in-memory loader.
    Never writes any bytes to local storage or temporary files.
    Reads HTTP/S3/Supabase streams directly into io.BytesIO() in RAM.
    """
    url = url_or_data.strip()
    if url.startswith("data:"):
        _, _, data = url.partition(",")
        return base64.b64decode(data)

    if url.startswith("http://") or url.startswith("https://"):
        buffer = BytesIO()
        with requests.get(url, stream=True, timeout=20) as resp:
            resp.raise_for_status()
            for chunk in resp.iter_content(chunk_size=65536):
                if chunk:
                    buffer.write(chunk)
        return buffer.getvalue()

    if url.startswith("file://") or os.path.exists(url):
        path = url.replace("file://", "")
        with open(path, "rb") as f:
            return f.read()

    raise ValueError(f"Invalid or unsupported image source: {url[:30]}...")


async def verify_hmac_signature(
    request: Request,
    x_veriscan_signature: str | None = Header(None, alias="X-VeriScan-Signature"),
) -> None:
    """
    Enforces HMAC-SHA256 network isolation on protected microservice endpoints.
    Rejects unauthorized public traffic.
    When VERISCAN_SECRET_KEY is configured in the environment, verifies the request
    body against the X-VeriScan-Signature header.
    """
    secret_key = os.getenv("VERISCAN_SECRET_KEY", "").strip()
    if not secret_key:
        # Development mode without secret key configured: bypass check
        return

    if not x_veriscan_signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required X-VeriScan-Signature header for network isolation",
        )

    # Read body in memory (FastAPI request.body() caches the byte content in RAM)
    body = await request.body()

    provided_sig = x_veriscan_signature.lower().strip()
    if provided_sig.startswith("sha256="):
        provided_sig = provided_sig[7:]

    expected_sig = hmac.new(
        key=secret_key.encode("utf-8"),
        msg=body,
        digestmod=hashlib.sha256,
    ).hexdigest().lower()

    if not hmac.compare_digest(provided_sig, expected_sig):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid HMAC signature. Network isolation rejected the request.",
        )


def error_response(message: str = "Analysis failed") -> dict[str, Any]:
    return {
        "doc_type": "unknown",
        "is_digital_copy": False,
        "noise_variance": 0.0,
        "metadata_safe": False,
        "metadata_software": None,
        "qr_valid": False,
        "checksum_valid": None,
        "semantic_mismatch": False,
        "extracted_name": None,
        "message": message,
    }


def run_lightweight_pipeline(file_bytes: bytes, explicit_doc_type: str | None = None) -> dict[str, Any]:
    try:
        # 1. EXIF Metadata Inspection
        meta_safe, software = check_exif(file_bytes)

        # 2. Decode Image for OpenCV directly from memory buffer (with Pillow fallback for WebP/uncommon formats)
        nparr = np.frombuffer(file_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img_bgr is None:
            try:
                pil_img = Image.open(BytesIO(file_bytes)).convert("RGB")
                img_bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            except Exception:
                img_bgr = None

        if img_bgr is None:
            return error_response("Invalid or corrupted image format")

        # Rule 1: OpenCV Noise Variance & Digital Copy Routing
        noise_var, is_digital = calculate_noise_variance(img_bgr)

        # QR Code Detection
        qr_valid = check_qr(img_bgr, file_bytes)

        # Rule 2: Adaptive Thresholding Pre-processing & OCR
        ocr_text = extract_ocr_text(img_bgr)

        # Document Type Identification
        doc_type = identify_document_type(ocr_text, default=explicit_doc_type or "other")

        # Rule 2: Fault-Tolerant Checksum Validation
        checksum_valid, candidate_id = validate_checksum_fault_tolerant(doc_type, ocr_text)

        # Rule 3: Demographic Sanity Check
        extracted_name = extract_name_entity(ocr_text, doc_type)
        semantic_mismatch, semantic_explanation = check_demographic_sanity(extracted_name, doc_type, ocr_text)

        return {
            "doc_type": doc_type,
            "is_digital_copy": is_digital,
            "noise_variance": noise_var,
            "checksum_valid": checksum_valid,
            "semantic_mismatch": semantic_mismatch,
            "extracted_name": extracted_name,
            "qr_valid": qr_valid,
            "metadata_safe": meta_safe,
            "metadata_software": software,
            "candidate_id": candidate_id,
            "semantic_explanation": semantic_explanation,
            "message": "Lightweight checks completed",
        }
    finally:
        # Explicit zero-disk memory sweep
        gc.collect()


@app.get("/")
async def root():
    return {"status": "online", "service": "VeriScan Fast Check API", "message": "System is operational."}


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "healthy",
        "service": "veriscan-lightweight-microservice",
        "opencv": cv2.__version__,
        "tesseract_available": pytesseract is not None,
        "rapidocr_available": _rapid_ocr is not None,
        "pyzbar_available": decode_qr is not None,
        "hmac_network_isolation": bool(os.getenv("VERISCAN_SECRET_KEY", "").strip()),
    }


@app.post("/analyze", dependencies=[Depends(verify_hmac_signature)])
def analyze(
    payload: AnalyzeRequest,
    background_tasks: BackgroundTasks,
) -> dict[str, Any]:
    file_bytes: bytes | None = None
    try:
        file_bytes = load_image_bytes_in_memory(payload.file_url)
        if not file_bytes:
            return error_response("Empty document payload")
        result = run_lightweight_pipeline(file_bytes, payload.document_type)
        background_tasks.add_task(gc.collect)
        return result
    except Exception as exc:
        return error_response(f"Failed to fetch or analyze image: {exc}")
    finally:
        del file_bytes
        gc.collect()


@app.post("/analyze-upload", dependencies=[Depends(verify_hmac_signature)])
async def analyze_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    documentType: str = Form("other"),
) -> dict[str, Any]:
    raw_bytes: bytes | None = None
    try:
        raw_bytes = await file.read()
        result = run_lightweight_pipeline(raw_bytes, documentType)
        background_tasks.add_task(gc.collect)
        return result
    finally:
        del raw_bytes
        gc.collect()


@app.post("/redact-pii", dependencies=[Depends(verify_hmac_signature)])
async def redact_pii(
    payload: RedactPiiRequest,
    background_tasks: BackgroundTasks,
) -> dict[str, Any]:
    """
    PII Pre-Flight Redaction Endpoint (OpenCV).
    Strips Personally Identifiable Information (faces and dense text blocks)
    by drawing solid black boxes while keeping the background intact.
    Zero-disk in-memory processing. Returns base64 encoded masked image.
    """
    raw_bytes: bytes | None = None
    try:
        if payload.content_base64:
            raw_bytes = base64.b64decode(payload.content_base64)
        elif payload.image_url:
            raw_bytes = load_image_bytes_in_memory(payload.image_url)
        elif payload.file_url:
            raw_bytes = load_image_bytes_in_memory(payload.file_url)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must supply 'image_url', 'file_url', or 'content_base64'",
            )

        nparr = np.frombuffer(raw_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None or img_bgr.size == 0:
            try:
                pil_img = Image.open(BytesIO(raw_bytes)).convert("RGB")
                img_bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
            except Exception:
                img_bgr = None

        if img_bgr is None or img_bgr.size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or unreadable image data",
            )

        # 1. Detect faces using OpenCV
        face_boxes = detect_faces_opencv(img_bgr)

        # 2. Detect dense text blocks using OpenCV morphological horizontal dilation
        text_boxes = detect_dense_text_blocks_opencv(img_bgr)

        # 3. Draw solid black boxes (0, 0, 0) over detected PII
        redacted = img_bgr.copy()
        for (x, y, w, h) in face_boxes:
            cv2.rectangle(redacted, (x, y), (x + w, y + h), (0, 0, 0), -1)

        for (x, y, w, h) in text_boxes:
            cv2.rectangle(redacted, (x, y), (x + w, y + h), (0, 0, 0), -1)

        # 4. In-memory PNG encoding
        success, encoded = cv2.imencode(".png", redacted)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to encode redacted image in memory",
            )

        b64_output = base64.b64encode(encoded.tobytes()).decode("utf-8")
        background_tasks.add_task(gc.collect)

        return {
            "status": "success",
            "redacted_image_base64": f"data:image/png;base64,{b64_output}",
            "faces_detected": len(face_boxes),
            "text_blocks_detected": len(text_boxes),
            "total_redactions": len(face_boxes) + len(text_boxes),
            "message": "PII masked successfully with solid black boxes. Background preserved.",
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PII Redaction failed: {exc}",
        )
    finally:
        del raw_bytes
        gc.collect()