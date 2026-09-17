"""
ICAO 9303 Date Logic & Temporal Consistency Validator
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from border_backend.models import DateValidationResult


def parse_yymmdd(date_str: str, is_dob: bool = False, ref_date: Optional[date] = None) -> tuple[Optional[date], list[str]]:
    """
    Parses a 6-character YYMMDD date string according to ICAO 9303 rules.
    Returns (parsed_date, errors).
    """
    errors: list[str] = []
    if len(date_str) != 6 or not date_str.isdigit():
        return None, [f"Invalid date format: '{date_str}', expected 6 numeric digits (YYMMDD)."]

    yy = int(date_str[0:2])
    mm = int(date_str[2:4])
    dd = int(date_str[4:6])

    today = ref_date or date.today()
    current_yy = today.year % 100

    # Determine century
    if is_dob:
        # Date of birth: must be in the past
        if yy > current_yy:
            year = 1900 + yy
        else:
            year = 2000 + yy
    else:
        # Expiration date: usually future or recent past
        # Passports are typically valid for max 10-15 years
        if yy <= (current_yy + 40):
            year = 2000 + yy
        else:
            year = 1900 + yy

    # Validate month and day
    try:
        parsed = date(year, mm, dd)
        return parsed, []
    except ValueError as exc:
        return None, [f"Calendar date invalid ({date_str}): {exc}"]


def validate_mrz_dates(
    dob_raw: str,
    expiry_raw: str,
    reference_date: Optional[date] = None
) -> DateValidationResult:
    """
    Performs deterministic date validation for identity documents:
    - DOB sanity (in past, calculated age between 0 and 120)
    - Expiration verification (valid vs expired)
    - Six-month validity threshold border check
    - Temporal sequence integrity (expiry must follow DOB)
    """
    today = reference_date or date.today()
    warnings: list[str] = []
    errors: list[str] = []

    dob_date, dob_errs = parse_yymmdd(dob_raw, is_dob=True, ref_date=today)
    expiry_date, exp_errs = parse_yymmdd(expiry_raw, is_dob=False, ref_date=today)

    errors.extend(dob_errs)
    errors.extend(exp_errs)

    dob_valid = False
    age: Optional[int] = None
    dob_formatted: Optional[str] = None

    if dob_date:
        dob_formatted = dob_date.isoformat()
        if dob_date > today:
            errors.append(f"Date of birth ({dob_formatted}) is in the future. Physically impossible.")
        else:
            # Calculate exact age
            age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
            if age > 120:
                warnings.append(f"Calculated age ({age} years) exceeds typical human longevity threshold (120 yrs).")
            elif age < 18:
                warnings.append(f"Minor passenger detected: Age is {age} years.")
            dob_valid = True

    is_expired = True
    days_until_expiry: Optional[int] = None
    expiry_formatted: Optional[str] = None
    expires_soon = False

    if expiry_date:
        expiry_formatted = expiry_date.isoformat()
        delta = (expiry_date - today).days
        days_until_expiry = delta

        if delta < 0:
            is_expired = True
            errors.append(f"Document expired on {expiry_formatted} ({abs(delta)} days ago). Invalid for entry.")
        else:
            is_expired = False
            if delta <= 180:
                expires_soon = True
                warnings.append(f"Border Control Warning: Document expires in {delta} days (within 6-month validity threshold).")

    # Temporal logic cross-check: expiry must be after DOB
    if dob_date and expiry_date:
        if expiry_date <= dob_date:
            errors.append(f"Temporal paradox: Expiration date ({expiry_formatted}) precedes or equals Date of Birth ({dob_formatted}).")

    return DateValidationResult(
        dob_valid=dob_valid and len(dob_errs) == 0,
        dob_formatted=dob_formatted,
        age=age,
        is_expired=is_expired,
        expiry_formatted=expiry_formatted,
        days_until_expiry=days_until_expiry,
        expires_soon_warning=expires_soon,
        warnings=warnings,
        errors=errors,
    )
