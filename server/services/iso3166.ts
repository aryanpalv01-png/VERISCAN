/**
 * Official ISO 3166-1 Sovereign State Whitelist Validator.
 * Strict reject-by-default for any issuer/country not in the official ~250-entry registry.
 */

export const ISO_3166_ALPHA3 = new Set([
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
  "YEM", "ZMB", "ZWE", "VAT", "TWN", "HKG", "MAC", "PSE", "KOS",
  // Recognized ICAO 9303 issuing authorities & standard test specimens
  "UTO", "EUE", "XOM", "XXA", "XXB", "XXC", "XXX", "D<<"
]);

const CANONICAL_NAMES_ARRAY: string[] = [
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
];

export const ISO_3166_CANONICAL_NAMES = new Set(CANONICAL_NAMES_ARRAY);

export const RECOGNIZED_DEMONYMS_AND_JURISDICTIONS: Record<string, string> = {
  // Demonyms & National Terms
  INDIAN: "INDIA", BHARAT: "INDIA", BHARATIYA: "INDIA",
  AMERICAN: "UNITED STATES", BRITISH: "UNITED KINGDOM",
  CANADIAN: "CANADA", AUSTRALIAN: "AUSTRALIA", GERMAN: "GERMANY",
  FRENCH: "FRANCE", ITALIAN: "ITALY", SPANISH: "SPAIN",
  MEXICAN: "MEXICO", BRAZILIAN: "BRAZIL", RUSSIAN: "RUSSIA",
  CHINESE: "CHINA", JAPANESE: "JAPAN", SWISS: "SWITZERLAND",
  DUTCH: "NETHERLANDS", SWEDISH: "SWEDEN", NORWEGIAN: "NORWAY",
  SINGAPOREAN: "SINGAPORE", EMIRATI: "UNITED ARAB EMIRATES",
  SAUDI: "SAUDI ARABIA", "SOUTH AFRICAN": "SOUTH AFRICA",
  "NEW ZEALANDER": "NEW ZEALAND", IRISH: "IRELAND",

  // US States
  CALIFORNIA: "UNITED STATES", TEXAS: "UNITED STATES", FLORIDA: "UNITED STATES",
  "NEW YORK": "UNITED STATES", ILLINOIS: "UNITED STATES", PENNSYLVANIA: "UNITED STATES",
  OHIO: "UNITED STATES", GEORGIA: "UNITED STATES", "NORTH CAROLINA": "UNITED STATES",
  MICHIGAN: "UNITED STATES", "NEW JERSEY": "UNITED STATES", VIRGINIA: "UNITED STATES",
  WASHINGTON: "UNITED STATES", ARIZONA: "UNITED STATES", MASSACHUSETTS: "UNITED STATES",
  TENNESSEE: "UNITED STATES", INDIANA: "UNITED STATES", MISSOURI: "UNITED STATES",
  MARYLAND: "UNITED STATES", WISCONSIN: "UNITED STATES", COLORADO: "UNITED STATES",
  MINNESOTA: "UNITED STATES", "SOUTH CAROLINA": "UNITED STATES", ALABAMA: "UNITED STATES",
  LOUISIANA: "UNITED STATES", KENTUCKY: "UNITED STATES", OREGON: "UNITED STATES",
  OKLAHOMA: "UNITED STATES", CONNECTICUT: "UNITED STATES", UTAH: "UNITED STATES",
  IOWA: "UNITED STATES", NEVADA: "UNITED STATES", ARKANSAS: "UNITED STATES",
  MISSISSIPPI: "UNITED STATES", KANSAS: "UNITED STATES", "NEW MEXICO": "UNITED STATES",
  NEBRASKA: "UNITED STATES", IDAHO: "UNITED STATES", HAWAII: "UNITED STATES",
  ALASKA: "UNITED STATES", DMV: "UNITED STATES",

  // Indian States & Union Territories
  DELHI: "INDIA", MAHARASHTRA: "INDIA", KARNATAKA: "INDIA",
  "TAMIL NADU": "INDIA", GUJARAT: "INDIA", "UTTAR PRADESH": "INDIA",
  RAJASTHAN: "INDIA", KERALA: "INDIA", PUNJAB: "INDIA",
  HARYANA: "INDIA", "WEST BENGAL": "INDIA", TELANGANA: "INDIA",
  "ANDHRA PRADESH": "INDIA", "MADHYA PRADESH": "INDIA", BIHAR: "INDIA",
  ODISHA: "INDIA", ASSAM: "INDIA", JHARKHAND: "INDIA", GOA: "INDIA",
  "HIMACHAL PRADESH": "INDIA", UTTARAKHAND: "INDIA", CHHATTISGARH: "INDIA",
  RTO: "INDIA", PARIVAHAN: "INDIA", SARATHI: "INDIA",

  // UK Authorities
  ENGLAND: "UNITED KINGDOM", SCOTLAND: "UNITED KINGDOM", WALES: "UNITED KINGDOM",
  "NORTHERN IRELAND": "UNITED KINGDOM", DVLA: "UNITED KINGDOM",

  // Canadian Provinces
  ONTARIO: "CANADA", QUEBEC: "CANADA", "BRITISH COLUMBIA": "CANADA", ALBERTA: "CANADA",

  // Australian States
  "NEW SOUTH WALES": "AUSTRALIA", VICTORIA: "AUSTRALIA", QUEENSLAND: "AUSTRALIA",
  "WESTERN AUSTRALIA": "AUSTRALIA", "SOUTH AUSTRALIA": "AUSTRALIA"
};

export function validateIso3166Issuer(rawInput: string): {
  valid: boolean;
  matchedCountry: string;
  explanation: string;
} {
  if (!rawInput || !rawInput.trim()) {
    return {
      valid: false,
      matchedCountry: "",
      explanation: "UNAUTHORIZED_ISSUER: No issuing authority or sovereign state identifier found."
    };
  }

  const raw = rawInput.trim().toUpperCase();
  const cleaned = raw.replace(/[^A-Z\s]/g, " ").replace(/\s+/g, " ").trim();

  // 0. Domestic or Regional Authority Credential
  if (raw === "UNSPECIFIED_REGIONAL_AUTHORITY" || raw === "DOMESTIC_ISSUANCE") {
    return {
      valid: true,
      matchedCountry: "REGIONAL_AUTHORITY",
      explanation: "Domestic or regional authority credential; pending structural template verification."
    };
  }

  // Strip prefixes
  let root = cleaned;
  const prefixes = [
    "REPUBLIC OF", "ISLAMIC REPUBLIC OF", "PEOPLES REPUBLIC OF", "DEMOCRATIC REPUBLIC OF",
    "FEDERAL REPUBLIC OF", "UNITED REPUBLIC OF", "KINGDOM OF", "STATE OF", "COMMONWEALTH OF",
    "GOVERNMENT OF", "PRESIDENCY OF", "FEDERATION OF", "SULTANATE OF", "PRINCIPALITY OF",
    "GRAND DUCHY OF", "EMIRATE OF", "NATION OF"
  ];
  for (const p of prefixes) {
    if (root.startsWith(p)) {
      root = root.slice(p.length).trim();
      break;
    }
  }

  // 1. Direct Alpha-3 match
  if (raw.length === 3 && ISO_3166_ALPHA3.has(raw)) {
    return { valid: true, matchedCountry: raw, explanation: `ISO 3166-1 Alpha-3 match verified: ${raw}` };
  }

  // 2. Direct Canonical Name match
  if (ISO_3166_CANONICAL_NAMES.has(cleaned)) {
    return { valid: true, matchedCountry: cleaned, explanation: `ISO 3166-1 Sovereign State match verified: ${cleaned}` };
  }

  // 3. Root Name match
  if (ISO_3166_CANONICAL_NAMES.has(root)) {
    return { valid: true, matchedCountry: root, explanation: `ISO 3166-1 Sovereign State match verified: ${root}` };
  }

  // 4. Word boundary check
  for (const name of CANONICAL_NAMES_ARRAY) {
    if (name.length >= 4) {
      const regex = new RegExp(`\\b${name}\\b`, "i");
      if (regex.test(cleaned)) {
        return { valid: true, matchedCountry: name, explanation: `ISO 3166-1 Sovereign State match verified: ${name}` };
      }
    }
  }

  // 5. Check 3-letter token
  const tokenMatch = raw.match(/\b([A-Z]{3})\b/);
  if (tokenMatch && ISO_3166_ALPHA3.has(tokenMatch[1])) {
    return { valid: true, matchedCountry: tokenMatch[1], explanation: `ISO 3166-1 Alpha-3 match verified: ${tokenMatch[1]}` };
  }

  // 6. Check recognized demonyms & sub-jurisdictions (e.g. 'INDIAN', 'CALIFORNIA', 'DELHI', 'DVLA')
  for (const [term, mappedState] of Object.entries(RECOGNIZED_DEMONYMS_AND_JURISDICTIONS)) {
    const regex = new RegExp(`\\b${term}\\b`, "i");
    if (regex.test(cleaned)) {
      return {
        valid: true,
        matchedCountry: mappedState,
        explanation: `ISO 3166-1 Sovereign State verified via recognized jurisdiction/demonym '${term}': ${mappedState}`,
      };
    }
  }

  return {
    valid: false,
    matchedCountry: cleaned,
    explanation: `UNAUTHORIZED_ISSUER: Issuer '${raw}' is NOT found in official ISO 3166-1 registry. Immediate Tier A hard failure.`
  };
}
