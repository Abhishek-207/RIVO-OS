"""
Phone number validation and normalization utilities.

Per-country digit-length validation for phone numbers stored as
"{country_code}{local_digits}" (e.g., "+971501234567").
"""

import re

# Country code → expected local digit count (after country code, without leading 0).
# Tuple means (min, max) for countries with variable-length numbers.
COUNTRY_DIGIT_RULES: dict[str, int | tuple[int, int]] = {
    '+971': 9,           # UAE
    '+91':  10,          # India
    '+44':  10,          # UK
    '+1':   10,          # USA / Canada
    '+92':  10,          # Pakistan
    '+63':  10,          # Philippines
    '+20':  10,          # Egypt
    '+966': 9,           # Saudi Arabia
    '+965': 8,           # Kuwait
    '+974': 8,           # Qatar
    '+973': 8,           # Bahrain
    '+968': 8,           # Oman
    '+962': 9,           # Jordan
    '+961': (7, 8),      # Lebanon
    '+86':  11,          # China
    '+49':  (10, 11),    # Germany
    '+33':  9,           # France
    '+61':  9,           # Australia
    '+27':  9,           # South Africa
}

# Sorted longest-first so "+971" matches before "+97"
_SORTED_CODES = sorted(COUNTRY_DIGIT_RULES.keys(), key=len, reverse=True)


def normalize_phone(phone: str) -> str:
    """
    Normalize a phone number: strip spaces/dashes, ensure '+' prefix,
    strip leading zero from local portion.
    """
    cleaned = re.sub(r'[\s\-\(\)]', '', phone)
    if not cleaned.startswith('+'):
        cleaned = '+' + cleaned

    # Find the country code and strip leading zero from local digits
    for code in _SORTED_CODES:
        if cleaned.startswith(code):
            local = cleaned[len(code):]
            if local.startswith('0'):
                local = local[1:]
            return code + local

    return cleaned


def split_phone(phone: str) -> tuple[str, str]:
    """
    Split a full phone number into (country_code, local_digits).
    Returns ('+0', phone_digits) if no known country code matches.
    """
    normalized = normalize_phone(phone)
    for code in _SORTED_CODES:
        if normalized.startswith(code):
            return code, normalized[len(code):]
    return '+0', re.sub(r'\D', '', normalized)


def validate_phone(phone: str) -> str | None:
    """
    Validate a phone number against country-specific digit rules.

    Returns None if valid, or an error message string if invalid.
    """
    if not phone or not phone.strip():
        return 'Phone number is required.'

    normalized = normalize_phone(phone)
    country_code, local_digits = split_phone(normalized)

    if not re.fullmatch(r'\d+', local_digits):
        return 'Phone number must contain only digits after the country code.'

    rules = COUNTRY_DIGIT_RULES.get(country_code)
    if rules is None:
        # Unknown country code — accept 7-12 digits as fallback
        if not (7 <= len(local_digits) <= 12):
            return f'Phone number must be 7-12 digits (got {len(local_digits)}).'
        return None

    if isinstance(rules, tuple):
        min_digits, max_digits = rules
        if not (min_digits <= len(local_digits) <= max_digits):
            return (
                f'Phone number for {country_code} must be '
                f'{min_digits}-{max_digits} digits (got {len(local_digits)}).'
            )
    else:
        if len(local_digits) != rules:
            return (
                f'Phone number for {country_code} must be '
                f'{rules} digits (got {len(local_digits)}).'
            )

    return None
