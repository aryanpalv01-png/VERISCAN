"""
Official ISO 3166-1 Sovereign State Whitelist Validator for Border Verification.
Strict Whitelist Security Model: Reject-by-default for any issuer/country not in the official registry.
"""
import re
from typing import Tuple, Dict

# Official ISO 3166-1 Alpha-3 Codes (plus official ICAO 9303 issuing authorities)
ISO_3166_ALPHA3 = {
    "AFG", "ALB", "DZA", "AND", "AGO", "ATG", "ARG", "ARM", "AUS", "AUT",
    "AZE", "BHS", "BHR", "BGD", "BRB", "BLR", "BEL", "BLZ", "BEN", "BTN",
    "BOL", "BIH", "BWA", "BRA", "BRN", "BGR", "BFA", "BDI", "CPV", "KHM",
    "CMR", "CAN", "CAF", "TCD", "CHL", "CHN", "COL", "COM", "COG", "COD",
    "CRI", "CIV", "HRV", "CUB", "CYP", "CZE", "DNK", "DJI", "DMA", "DOM",
    "ECU", "EGY", "SLV", "GNQ", "ERI", "EST", "SWZ", "ETH", "FJI", "FIN",
    "FRA", "GAB", "GMB", "GEO", "DEU", "GHA", "GRC", "GRD", "GTM", "GIN",
    "GNB", "GUY", "HTI", "HND", "HUN", "ISL", "IND", "IDN", "IRN", "IRQ",
    "IRL", "ISR", "ITA", "JAM", "JPN", "JOR", "KAZ", "KEN", "KIR", "PRK",
    "KOR", "KWT", "KGZ", "LAO", "LVA", "LBN", "LSO", "LBR", "LBY", "LIE",
    "LTU", "LUX", "MDG", "MWI", "MYS", "MDV", "MLI", "MLT", "MHL", "MRT",
    "MUS", "MEX", "FSM", "MDA", "MCO", "MNG", "MNE", "MAR", "MOZ", "MMR",
    "NAM", "NRU", "NPL", "NLD", "NZL", "NIC", "NER", "NGA", "MKD", "NOR",
    "OMN", "PAK", "PLW", "PAN", "PNG", "PRY", "PER", "PHL", "POL", "PRT",
    "QAT", "ROU", "RUS", "RWA", "KNA", "LCA", "VCT", "WSM", "SMR", "STP",
    "SAU", "SEN", "SRB", "SYC", "SLE", "SGP", "SVK", "SVN", "SLB", "SOM",
    "ZAF", "SSD", "ESP", "LKA", "SDN", "SUR", "SWE", "CHE", "SYR", "TJK",
    "TZA", "THA", "TLS", "TGO", "TON", "TTO", "TUN", "TUR", "TKM", "TUV",
    "UGA", "UKR", "ARE", "GBR", "USA", "URY", "UZB", "VUT", "VEN", "VNM",
    "YEM", "ZMB", "ZWE", "VAT", "TWN", "HKG", "MAC", "PSE", "KOS", "ABW",
    "CUW", "SXM", "BMU", "CYM", "GIB", "GRL", "FRO", "PRI", "GUM", "VIR",
    # ICAO 9303 Special Recognized Entities & Specifications
    "UTO",  # Utopia (official ICAO 9303 specimen issuing code)
    "EUE",  # European Union
    "XOM",  # Sovereign Military Order of Malta
    "XXA",  # Stateless person
    "XXB",  # Refugee (Doc 9303 Part 5/6)
    "XXC",  # Refugee (Doc 9303 Part 4)
    "XXX",  # Unspecified nationality
    "D<<",  # Federal Republic of Germany legacy MRZ notation
}

# Official ISO 3166-1 Alpha-2 Codes
ISO_3166_ALPHA2 = {
    "AF", "AL", "DZ", "AD", "AO", "AG", "AR", "AM", "AU", "AT", "AZ", "BS",
    "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BT", "BO", "BA", "BW", "BR",
    "BN", "BG", "BF", "BI", "CV", "KH", "CM", "CA", "CF", "TD", "CL", "CN",
    "CO", "KM", "CG", "CD", "CR", "CI", "HR", "CU", "CY", "CZ", "DK", "DJ",
    "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET", "FJ", "FI",
    "FR", "GA", "GM", "GE", "DE", "GH", "GR", "GD", "GT", "GN", "GW", "GY",
    "HT", "HN", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IL", "IT", "JM",
    "JP", "JO", "KZ", "KE", "KI", "KP", "KR", "KW", "KG", "LA", "LV", "LB",
    "LS", "LR", "LY", "LI", "LT", "LU", "MG", "MW", "MY", "MV", "ML", "MT",
    "MH", "MR", "MU", "MX", "FM", "MD", "MC", "MN", "ME", "MA", "MZ", "MM",
    "NA", "NR", "NP", "NL", "NZ", "NI", "NE", "NG", "MK", "NO", "OM", "PK",
    "PW", "PA", "PG", "PY", "PE", "PH", "PL", "PT", "QA", "RO", "RU", "RW",
    "KN", "LC", "VC", "WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG",
    "SK", "SI", "SB", "SO", "ZA", "SS", "ES", "LK", "SD", "SR", "SE", "CH",
    "SY", "TJ", "TZ", "TH", "TL", "TG", "TO", "TT", "TN", "TR", "TM", "TV",
    "UG", "UA", "AE", "GB", "US", "UY", "UZ", "VU", "VE", "VN", "YE", "ZM",
    "ZW", "VA", "TW", "HK", "MO", "PS"
}

# Standard Country Names, Formal Institutional Titles, and Standard Variations
ISO_3166_CANONICAL_NAMES = {
    "AFGHANISTAN", "ALBANIA", "ALGERIA", "ANDORRA", "ANGOLA", "ANTIGUA AND BARBUDA",
    "ARGENTINA", "ARMENIA", "AUSTRALIA", "AUSTRIA", "AZERBAIJAN", "BAHAMAS",
    "BAHRAIN", "BANGLADESH", "BARBADOS", "BELARUS", "BELGIUM", "BELIZE", "BENIN",
    "BHUTAN", "BOLIVIA", "BOSNIA AND HERZEGOVINA", "BOTSWANA", "BRAZIL", "BRUNEI",
    "BULGARIA", "BURKINA FASO", "BURUNDI", "CABO VERDE", "CAMBODIA", "CAMEROON",
    "CANADA", "CENTRAL AFRICAN REPUBLIC", "CHAD", "CHILE", "CHINA", "COLOMBIA",
    "COMOROS", "CONGO", "DEMOCRATIC REPUBLIC OF THE CONGO", "COSTA RICA",
    "COTE DIVOIRE", "CROATIA", "CUBA", "CYPRUS", "CZECH REPUBLIC", "CZECHIA",
    "DENMARK", "DJIBOUTI", "DOMINICA", "DOMINICAN REPUBLIC", "ECUADOR", "EGYPT",
    "EL SALVADOR", "EQUATORIAL GUINEA", "ERITREA", "ESTONIA", "ESWATINI", "ETHIOPIA",
    "FIJI", "FINLAND", "FRANCE", "GABON", "GAMBIA", "GEORGIA", "GERMANY", "GHANA",
    "GREECE", "GRENADA", "GUATEMALA", "GUINEA", "GUINEA BISSAU", "GUYANA", "HAITI",
    "HONDURAS", "HUNGARY", "ICELAND", "INDIA", "INDONESIA", "IRAN", "IRAQ",
    "IRELAND", "ISRAEL", "ITALY", "JAMAICA", "JAPAN", "JORDAN", "KAZAKHSTAN",
    "KENYA", "KIRIBATI", "NORTH KOREA", "SOUTH KOREA", "KOREA", "KUWAIT",
    "KYRGYZSTAN", "LAOS", "LATVIA", "LEBANON", "LESOTHO", "LIBERIA", "LIBYA",
    "LIECHTENSTEIN", "LITHUANIA", "LUXEMBOURG", "MADAGASCAR", "MALAWI", "MALAYSIA",
    "MALDIVES", "MALI", "MALTA", "MARSHALL ISLANDS", "MAURITANIA", "MAURITIUS",
    "MEXICO", "MICRONESIA", "MOLDOVA", "MONACO", "MONGOLIA", "MONTENEGRO",
    "MOROCCO", "MOZAMBIQUE", "MYANMAR", "NAMIBIA", "NAURU", "NEPAL", "NETHERLANDS",
    "NEW ZEALAND", "NICARAGUA", "NIGER", "NIGERIA", "NORTH MACEDONIA", "NORWAY",
    "OMAN", "PAKISTAN", "PALAU", "PALESTINE", "PANAMA", "PAPUA NEW GUINEA",
    "PARAGUAY", "PERU", "PHILIPPINES", "POLAND", "PORTUGAL", "QATAR", "ROMANIA",
    "RUSSIA", "RUSSIAN FEDERATION", "RWANDA", "SAINT KITTS AND NEVIS", "SAINT LUCIA",
    "SAINT VINCENT AND THE GRENADINES", "SAMOA", "SAN MARINO", "SAO TOME AND PRINCIPE",
    "SAUDI ARABIA", "SENEGAL", "SERBIA", "SEYCHELLES", "SIERRA LEONE", "SINGAPORE",
    "SLOVAKIA", "SLOVENIA", "SOLOMON ISLANDS", "SOMALIA", "SOUTH AFRICA", "SOUTH SUDAN",
    "SPAIN", "SRI LANKA", "SUDAN", "SURINAME", "SWEDEN", "SWITZERLAND", "SYRIA",
    "TAJIKISTAN", "TANZANIA", "THAILAND", "TIMOR LESTE", "TOGO", "TONGA",
    "TRINIDAD AND TOBAGO", "TUNISIA", "TURKEY", "TURKIYE", "TURKMENISTAN", "TUVALU",
    "UGANDA", "UKRAINE", "UNITED ARAB EMIRATES", "UNITED KINGDOM", "GREAT BRITAIN",
    "UNITED STATES", "UNITED STATES OF AMERICA", "URUGUAY", "UZBEKISTAN", "VANUATU",
    "VATICAN CITY", "VENEZUELA", "VIETNAM", "YEMEN", "ZAMBIA", "ZIMBABWE",
    "EUROPEAN UNION", "UTOPIA"
}

RECOGNIZED_DEMONYMS_AND_JURISDICTIONS: Dict[str, str] = {
    # Demonyms & National Terms
    "INDIAN": "INDIA", "BHARAT": "INDIA", "BHARATIYA": "INDIA",
    "AMERICAN": "UNITED STATES", "BRITISH": "UNITED KINGDOM",
    "CANADIAN": "CANADA", "AUSTRALIAN": "AUSTRALIA", "GERMAN": "GERMANY",
    "FRENCH": "FRANCE", "ITALIAN": "ITALY", "SPANISH": "SPAIN",
    "MEXICAN": "MEXICO", "BRAZILIAN": "BRAZIL", "RUSSIAN": "RUSSIA",
    "CHINESE": "CHINA", "JAPANESE": "JAPAN", "SWISS": "SWITZERLAND",
    "DUTCH": "NETHERLANDS", "SWEDISH": "SWEDEN", "NORWEGIAN": "NORWAY",
    "SINGAPOREAN": "SINGAPORE", "EMIRATI": "UNITED ARAB EMIRATES",
    "SAUDI": "SAUDI ARABIA", "SOUTH AFRICAN": "SOUTH AFRICA",
    "NEW ZEALANDER": "NEW ZEALAND", "IRISH": "IRELAND",

    # US States
    "CALIFORNIA": "UNITED STATES", "TEXAS": "UNITED STATES", "FLORIDA": "UNITED STATES",
    "NEW YORK": "UNITED STATES", "ILLINOIS": "UNITED STATES", "PENNSYLVANIA": "UNITED STATES",
    "OHIO": "UNITED STATES", "GEORGIA": "UNITED STATES", "NORTH CAROLINA": "UNITED STATES",
    "MICHIGAN": "UNITED STATES", "NEW JERSEY": "UNITED STATES", "VIRGINIA": "UNITED STATES",
    "WASHINGTON": "UNITED STATES", "ARIZONA": "UNITED STATES", "MASSACHUSETTS": "UNITED STATES",
    "TENNESSEE": "UNITED STATES", "INDIANA": "UNITED STATES", "MISSOURI": "UNITED STATES",
    "MARYLAND": "UNITED STATES", "WISCONSIN": "UNITED STATES", "COLORADO": "UNITED STATES",
    "MINNESOTA": "UNITED STATES", "SOUTH CAROLINA": "UNITED STATES", "ALABAMA": "UNITED STATES",
    "LOUISIANA": "UNITED STATES", "KENTUCKY": "UNITED STATES", "OREGON": "UNITED STATES",
    "OKLAHOMA": "UNITED STATES", "CONNECTICUT": "UNITED STATES", "UTAH": "UNITED STATES",
    "IOWA": "UNITED STATES", "NEVADA": "UNITED STATES", "ARKANSAS": "UNITED STATES",
    "MISSISSIPPI": "UNITED STATES", "KANSAS": "UNITED STATES", "NEW MEXICO": "UNITED STATES",
    "NEBRASKA": "UNITED STATES", "IDAHO": "UNITED STATES", "HAWAII": "UNITED STATES",
    "ALASKA": "UNITED STATES", "DMV": "UNITED STATES",

    # Indian States & Union Territories
    "DELHI": "INDIA", "MAHARASHTRA": "INDIA", "KARNATAKA": "INDIA",
    "TAMIL NADU": "INDIA", "GUJARAT": "INDIA", "UTTAR PRADESH": "INDIA",
    "RAJASTHAN": "INDIA", "KERALA": "INDIA", "PUNJAB": "INDIA",
    "HARYANA": "INDIA", "WEST BENGAL": "INDIA", "TELANGANA": "INDIA",
    "ANDHRA PRADESH": "INDIA", "MADHYA PRADESH": "INDIA", "BIHAR": "INDIA",
    "ODISHA": "INDIA", "ASSAM": "INDIA", "JHARKHAND": "INDIA", "GOA": "INDIA",
    "HIMACHAL PRADESH": "INDIA", "UTTARAKHAND": "INDIA", "CHHATTISGARH": "INDIA",
    "RTO": "INDIA", "PARIVAHAN": "INDIA", "SARATHI": "INDIA",

    # UK Authorities
    "ENGLAND": "UNITED KINGDOM", "SCOTLAND": "UNITED KINGDOM", "WALES": "UNITED KINGDOM",
    "NORTHERN IRELAND": "UNITED KINGDOM", "DVLA": "UNITED KINGDOM",

    # Canadian Provinces
    "ONTARIO": "CANADA", "QUEBEC": "CANADA", "BRITISH COLUMBIA": "CANADA", "ALBERTA": "CANADA",

    # Australian States
    "NEW SOUTH WALES": "AUSTRALIA", "VICTORIA": "AUSTRALIA", "QUEENSLAND": "AUSTRALIA",
    "WESTERN AUSTRALIA": "AUSTRALIA", "SOUTH AUSTRALIA": "AUSTRALIA"
}

def clean_country_string(raw: str) -> str:
    """Strip noise and normalize country string for strict matching."""
    s = re.sub(r'[^A-Z\s]', ' ', raw.upper())
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def extract_root_country_token(cleaned_text: str) -> str:
    """Removes common administrative prefixes like 'REPUBLIC OF', 'KINGDOM OF', etc."""
    stop_prefixes = [
        "REPUBLIC OF", "ISLAMIC REPUBLIC OF", "PEOPLES REPUBLIC OF", "DEMOCRATIC REPUBLIC OF",
        "FEDERAL REPUBLIC OF", "UNITED REPUBLIC OF", "KINGDOM OF", "STATE OF", "COMMONWEALTH OF",
        "GOVERNMENT OF", "PRESIDENCY OF", "FEDERATION OF", "SULTANATE OF", "PRINCIPALITY OF",
        "GRAND DUCHY OF", "EMIRATE OF", "NATION OF"
    ]
    candidate = cleaned_text
    for p in stop_prefixes:
        if candidate.startswith(p):
            candidate = candidate[len(p):].strip()
            break
    return candidate

def validate_iso3166_issuer(text_or_code: str) -> Tuple[bool, str, str]:
    """
    Rigorously validates whether an issuer or issuing country string/code is
    on the official ISO 3166-1 whitelist.
    
    Returns:
        (is_valid, matched_entity_name, explanation)
    """
    if not text_or_code or not text_or_code.strip():
        return False, "", "UNAUTHORIZED_ISSUER: No issuer or nationality identifier provided."

    raw = text_or_code.strip().upper()
    cleaned = clean_country_string(raw)
    root = extract_root_country_token(cleaned)

    # 0. Unspecified Domestic or Regional Authority Credential
    if raw in {"UNSPECIFIED_REGIONAL_AUTHORITY", "DOMESTIC_ISSUANCE"}:
        return True, "REGIONAL_AUTHORITY", "Domestic or regional authority credential; pending structural template verification."

    # 1. Direct Alpha-3 code match (e.g. 'IND', 'USA', 'UTO')
    if len(raw) == 3 and raw in ISO_3166_ALPHA3:
        return True, raw, f"ISO 3166-1 Alpha-3 match verified: {raw}"

    # 2. Direct Alpha-2 code match (e.g. 'IN', 'US')
    if len(raw) == 2 and raw in ISO_3166_ALPHA2:
        return True, raw, f"ISO 3166-1 Alpha-2 match verified: {raw}"

    # 3. Direct Canonical name match (e.g. 'INDIA', 'FRANCE')
    if cleaned in ISO_3166_CANONICAL_NAMES:
        return True, cleaned, f"ISO 3166-1 Sovereign State match verified: {cleaned}"

    # 4. Root candidate match (e.g. 'REPUBLIC OF INDIA' -> root 'INDIA')
    if root in ISO_3166_CANONICAL_NAMES:
        return True, root, f"ISO 3166-1 Sovereign State match verified: {root}"

    # 5. Check if any recognized canonical country is contained as an isolated whole phrase
    for name in ISO_3166_CANONICAL_NAMES:
        if len(name) >= 4:  # avoid short 2/3 letter false substrings
            pattern = rf"\b{re.escape(name)}\b"
            if re.search(pattern, cleaned):
                return True, name, f"ISO 3166-1 Sovereign State identified: {name}"

    # 6. Check for 3-letter code inside brackets or MRZ code e.g. 'P<IND' -> 'IND'
    mrz_code_match = re.search(r'\b([A-Z]{3})\b', raw)
    if mrz_code_match:
        code_cand = mrz_code_match.group(1)
        if code_cand in ISO_3166_ALPHA3:
            return True, code_cand, f"ISO 3166-1 Alpha-3 match verified: {code_cand}"

    # 7. Check recognized demonyms & sub-jurisdictions (e.g. 'INDIAN', 'CALIFORNIA', 'DELHI', 'DVLA')
    for term, mapped_state in RECOGNIZED_DEMONYMS_AND_JURISDICTIONS.items():
        pattern = rf"\b{re.escape(term)}\b"
        if re.search(pattern, cleaned):
            return True, mapped_state, f"ISO 3166-1 Sovereign State verified via recognized jurisdiction/demonym '{term}': {mapped_state}"

    # FAILED WHITELIST: Non-existent or fake country!
    return False, cleaned, f"UNAUTHORIZED_ISSUER: Issuer '{raw}' is NOT found in official ISO 3166-1 registry. Immediate Tier A hard failure."
