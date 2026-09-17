import React, { createContext, useContext, useState } from "react";

export type Language = "en" | "hi" | "mr";

export interface Translations {
  // Top Masthead & Navigation
  portal_title: string;
  govt_of_india: string;
  meity: string;
  satyam_eva_jayate: string;
  digital_india: string;
  sign_in: string;
  register: string;
  open_workspace: string;
  new_screening: string;

  // Ingestion & Dropzone
  intake_engine: string;
  intake_title: string;
  dropzone_title: string;
  dropzone_subtitle: string;
  select_file: string;
  optical_camera: string;
  upload_limits: string;
  client_enclave: string;
  zero_disk: string;
  load_specimen: string;
  staged_payload: string;
  execute_screening: string;
  discard: string;

  // Pipeline & Telemetry
  pipeline_status: string;
  engine_matrix: string;
  all_systems_nominal: string;
  active: string;
  latency: string;
  audit_ledger: string;
  recent_records: string;
  view_full_ledger: string;

  // Table Headers
  col_ref: string;
  col_file: string;
  col_type: string;
  col_status: string;
  col_score: string;
  col_observation: string;
  col_action: string;

  // Verdicts & Statuses
  verified: string;
  needs_review: string;
  likely_forged: string;
  pass: string;
  flag: string;
  na: string;

  // Report & Loupe
  confidence_score: string;
  dossier_ref: string;
  tamper_zones: string;
  show_zones: string;
  hide_zones: string;
  coordinate_hud: string;
  req_human_review: string;
  copy_hash: string;
  export_pdf: string;

  // Restricted Access
  restricted_access: string;
  restricted_notice: string;
  sign_in_to_access: string;

  // Hero Section
  hero_badge: string;
  hero_title: string;
  hero_subtitle: string;
  btn_open_workspace: string;
  btn_ingest_file: string;
  btn_analyzing: string;
  officer_portal: string;
  signed_in_as: string;
  officer: string;
  login: string;
  sign_out: string;

  // Hero Footer / Trust Ribbon
  hero_footer_zero_disk: string;
  hero_footer_sha: string;
  hero_footer_standards: string;
  hero_footer_iso: string;

  // Forensic Methodology Section
  methodology_title: string;
  methodology_subtitle: string;
  methodology_badge: string;
  methodology_real_title: string;
  methodology_fake_title: string;

  pillar_1_name: string;
  pillar_1_real: string;
  pillar_1_fake: string;

  pillar_2_name: string;
  pillar_2_real: string;
  pillar_2_fake: string;

  pillar_3_name: string;
  pillar_3_real: string;
  pillar_3_fake: string;

  pillar_4_name: string;
  pillar_4_real: string;
  pillar_4_fake: string;

  pillar_5_name: string;
  pillar_5_real: string;
  pillar_5_fake: string;

  pillar_6_name: string;
  pillar_6_real: string;
  pillar_6_fake: string;

  // Interactive Specimen Demonstrator
  specimen_title: string;
  specimen_subtitle: string;
  tab_genuine: string;
  tab_forged: string;
  diagnostic_summary: string;
  specimen_status_genuine: string;
  specimen_status_forged: string;

  // Global Footer & Nav
  footer_brand: string;
  footer_node: string;
  footer_desc: string;
  footer_privacy: string;
  nav_dashboard: string;
  nav_border: string;
  nav_verify: string;
  nav_history: string;
  nav_settings: string;
}

const DICTIONARY: Record<Language, Translations> = {
  en: {
    portal_title: "VeriScan Forensic Command Center",
    govt_of_india: "GOVERNMENT OF INDIA",
    meity: "Ministry of Electronics & Information Technology (MeitY)",
    satyam_eva_jayate: "सत्यमेव जयते",
    digital_india: "Digital India",
    sign_in: "Sign In",
    register: "Register",
    open_workspace: "Open Workspace",
    new_screening: "New Screening",

    intake_engine: "Document Ingestion Gateway",
    intake_title: "Document Ingestion & Screening",
    dropzone_title: "Ingest Document for Forensic Screening",
    dropzone_subtitle: "Drag file here or select from local storage / optical camera",
    select_file: "Select File",
    optical_camera: "Optical Camera",
    upload_limits: "PDF · JPG · PNG · WEBP · MAX 10 MB",
    client_enclave: "Client Enclave",
    zero_disk: "Zero Disk Retention",
    load_specimen: "Load Compliance Benchmark Specimen",
    staged_payload: "Payload Ready for Ingestion",
    execute_screening: "Run Forensic Screening",
    discard: "Discard",

    pipeline_status: "Pipeline Telemetry",
    engine_matrix: "Forensic Engine Health Matrix",
    all_systems_nominal: "All Systems Nominal",
    active: "Active",
    latency: "Latency",
    audit_ledger: "Institutional Audit Ledger",
    recent_records: "Recent Verification Records",
    view_full_ledger: "View Full Ledger",

    col_ref: "Reference",
    col_file: "Document",
    col_type: "Type",
    col_status: "Status",
    col_score: "Confidence",
    col_observation: "Observation",
    col_action: "Action",

    verified: "Verified",
    needs_review: "Needs Review",
    likely_forged: "Likely Forged",
    pass: "Pass",
    flag: "Flag",
    na: "N/A",

    confidence_score: "Confidence Score",
    dossier_ref: "Dossier Reference",
    tamper_zones: "Tampered Zones",
    show_zones: "Show Tamper Zones",
    hide_zones: "Hide Tamper Zones",
    coordinate_hud: "Coordinate HUD",
    req_human_review: "Request Human Review",
    copy_hash: "Copy SHA-256 Digest",
    export_pdf: "Export Certificate (PDF)",

    restricted_access: "Restricted Access · Verification Ledger",
    restricted_notice: "Institutional audit trails and document screening records are restricted to authenticated compliance officers and authorized personnel.",
    sign_in_to_access: "Sign In to Access Records",

    hero_badge: "INSTITUTIONAL FORENSIC SCREENING ENGINE",
    hero_title: "Automated Document Forensic & Tampering Localization",
    hero_subtitle: "Multi-layered forensic verification evaluating compression anomalies, typography consistency, mathematical checksums, and cryptographic signatures.",
    btn_open_workspace: "Open Forensic Command Center",
    btn_ingest_file: "Ingest Specimen File",
    btn_analyzing: "Analyzing Telemetry...",
    officer_portal: "Officer Portal:",
    signed_in_as: "Signed in as",
    officer: "Officer",
    login: "Login",
    sign_out: "Sign Out",

    hero_footer_zero_disk: "Zero-Disk Retention In-Memory Protocol",
    hero_footer_sha: "SHA-256 Cryptographic Digest Verification",
    hero_footer_standards: "ICAO Doc 9303 & UIDAI Statutory Standards",
    hero_footer_iso: "ISO 3166-1 Sovereign Issuing Authority Whitelist",

    methodology_title: "Scientific Methodology: Real vs. Fake Verification",
    methodology_subtitle: "How VeriScan analyzes pixel physics, cryptographic signatures, and micro-typography to rigorously differentiate genuine government credentials from synthetic forgeries.",
    methodology_badge: "MULTI-LAYER EVIDENTIARY AUDIT FRAMEWORK",
    methodology_real_title: "Genuine Document Characteristics",
    methodology_fake_title: "Tampered / Forged Indicators",

    pillar_1_name: "Pixel Compression & Error Level Analysis (ELA)",
    pillar_1_real: "Homogeneous 8×8 DCT quantization. Authentic scans show uniform error level distribution across all pixel blocks.",
    pillar_1_fake: "Localized compression discrepancies. Spliced text, modified dates, or inserted photos exhibit distinct error spikes.",

    pillar_2_name: "Micro-Typography & Font Alignment",
    pillar_2_real: "Strict statutory font baselines, glyph kerning, uniform stroke thickness, and analog ink bleed matching official dies.",
    pillar_2_fake: "Synthetic font injection, irregular baseline jitter, kerning anomalies, and sharp vector edge mismatch on raster paper.",

    pillar_3_name: "Mathematical Checksum & Algorithmic Parity",
    pillar_3_real: "Verhoeff dihedral permutation (D5) on Aadhaar, ISO 7064 Mod 11,10 on PAN, and 7-3-1 weight matrix on Passports.",
    pillar_3_fake: "Altered or invented ID digits fail mathematical parity algorithms, immediately triggering an instant Tier A hard veto.",

    pillar_4_name: "Cryptographic PKI & Secure QR Signatures",
    pillar_4_real: "2048-bit RSA asymmetric digital signatures verified against official issuer public key certificates in secure QR payloads.",
    pillar_4_fake: "Missing or unsigned QR codes, generic text URLs, or cryptographic digest mismatches between QR payload and visual demographics.",

    pillar_5_name: "PRNU Sensor Noise & Anti-Spoofing",
    pillar_5_real: "Natural optical sensor noise (Poisson-Gaussian distribution) and paper texture from physical camera capture or flatbed scanner.",
    pillar_5_fake: "Flat digital backgrounds (zero sensor noise from Canva/Photoshop), screen moiré frequency grids, or AI diffusion synthesis artifacts.",

    pillar_6_name: "Template Matching & Security Guilloche",
    pillar_6_real: "Statutory geometry, official national emblems, micro-text lines, and authentic security watermark placement.",
    pillar_6_fake: "Distorted emblem proportions, missing micro-text, misaligned borders, and geometry mismatches from unauthorized templates.",

    specimen_title: "Interactive Forensic Telemetry Comparator",
    specimen_subtitle: "Select a diagnostic profile to inspect how forensic signals contrast between genuine state documents and forged specimens.",
    tab_genuine: "Genuine Specimen Profile",
    tab_forged: "Tampered Specimen Profile",
    diagnostic_summary: "Forensic Diagnostic Summary",
    specimen_status_genuine: "PASS · ALL FORENSIC INVARIANTS SATISFIED",
    specimen_status_forged: "CRITICAL VETO · MULTIPLE FORGERY SIGNATURES FLAGGED",

    footer_brand: "VeriScan // SIH-2026",
    footer_node: "National Evidentiary Document Screening Infrastructure",
    footer_desc: "Developed for Ministry of Electronics and Information Technology (MeitY) · Government of India",
    footer_privacy: "Zero-Retention Protocol · Ephemeral In-Memory Execution · Client-Side Encryption",
    nav_dashboard: "Command Center",
    nav_border: "Border Terminal",
    nav_verify: "Verify Document",
    nav_history: "Audit Ledger",
    nav_settings: "Settings",
  },
  hi: {
    portal_title: "वेरीस्कैन फोरेंसिक कमांड सेंटर",
    govt_of_india: "भारत सरकार",
    meity: "इलेक्ट्रॉनिकी और सूचना प्रौद्योगिकी मंत्रालय (MeitY)",
    satyam_eva_jayate: "सत्यमेव जयते",
    digital_india: "डिजिटल इंडिया",
    sign_in: "साइन इन करें",
    register: "पंजीकरण",
    open_workspace: "वर्कस्पेस खोलें",
    new_screening: "नया परीक्षण",

    intake_engine: "दस्तावेज़ अंतर्ग्रहण इंजन",
    intake_title: "दस्तावेज़ अंतर्ग्रहण और फोरेंसिक जांच",
    dropzone_title: "फोरेंसिक जांच हेतु दस्तावेज़ अपलोड करें",
    dropzone_subtitle: "फ़ाइल यहाँ खींचें या स्थानीय स्टोरेज / कैमरे से चुनें",
    select_file: "फ़ाइल चुनें",
    optical_camera: "ऑप्टिकल कैमरा",
    upload_limits: "PDF · JPG · PNG · WEBP · अधिकतम 10 MB",
    client_enclave: "सुरक्षित एन्क्लेव",
    zero_disk: "शून्य डिस्क संचय",
    load_specimen: "मानक नमूना दस्तावेज़ लोड करें",
    staged_payload: "जांच हेतु फ़ाइल तैयार",
    execute_screening: "फोरेंसिक जांच शुरू करें",
    discard: "रद्द करें",

    pipeline_status: "पाइपलाइन स्थिति",
    engine_matrix: "फोरेंसिक इंजन स्वास्थ्य स्थिति",
    all_systems_nominal: "सभी प्रणालियां सामान्य",
    active: "सक्रिय",
    latency: "विलंबता",
    audit_ledger: "ऑडिट बहीखाता",
    recent_records: "हाल के सत्यापन रिकॉर्ड",
    view_full_ledger: "पूरा बहीखाता देखें",

    col_ref: "संदर्भ कोड",
    col_file: "दस्तावेज़",
    col_type: "प्रकार",
    col_status: "स्थिति",
    col_score: "सत्यता गुणांक",
    col_observation: "निष्कर्ष",
    col_action: "कार्रवाई",

    verified: "सत्यापित",
    needs_review: "समीक्षा आवश्यक",
    likely_forged: "संभावित जाली",
    pass: "उत्तीर्ण",
    flag: "चिह्नित",
    na: "लागू नहीं",

    confidence_score: "सत्यता गुणांक",
    dossier_ref: "डोज़ियर संदर्भ",
    tamper_zones: "छेड़छाड़ किए गए क्षेत्र",
    show_zones: "छेड़छाड़ क्षेत्र दिखाएं",
    hide_zones: "क्षेत्र छुपाएं",
    coordinate_hud: "निर्देशांक HUD",
    req_human_review: "मानवीय समीक्षा अनुरोध",
    copy_hash: "हैश कॉपी करें",
    export_pdf: "प्रमाण पत्र डाउनलोड (PDF)",

    restricted_access: "प्रतिबंधित पहुंच · सत्यापन बहीखाता",
    restricted_notice: "संस्थागत ऑडिट रिकॉर्ड और सत्यापन इतिहास केवल अधिकृत कर्मियों के लिए उपलब्ध हैं।",
    sign_in_to_access: "रिकॉर्ड देखने के लिए साइन इन करें",

    hero_badge: "संस्थागत फोरेंसिक जांच प्रणाली",
    hero_title: "स्वचालित दस्तावेज़ फोरेंसिक एवं छेड़छाड़ पहचान",
    hero_subtitle: "संपीड़न विसंगतियों, टाइपोग्राफी निरंतरता, गणितीय चेकसम और क्रिप्टोग्राफिक हस्ताक्षरों का बहुस्तरीय परीक्षण।",
    btn_open_workspace: "फोरेंसिक कमांड सेंटर खोलें",
    btn_ingest_file: "दस्तावेज़ नमूना अपलोड करें",
    btn_analyzing: "विश्लेषण जारी है...",
    officer_portal: "अधिकारी पोर्टल:",
    signed_in_as: "लॉगिन उपयोगकर्ता",
    officer: "अधिकारी",
    login: "लॉगिन",
    sign_out: "साइन आउट",

    hero_footer_zero_disk: "शून्य-डिस्क संचय इन-मेमोरी प्रोटोकॉल",
    hero_footer_sha: "SHA-256 क्रिप्टोग्राफिक हैश सत्यापन",
    hero_footer_standards: "ICAO Doc 9303 एवं UIDAI वैधानिक मानक",
    hero_footer_iso: "ISO 3166-1 अधिकृत संप्रभु जारीकर्ता सूची",

    methodology_title: "वैज्ञानिक पद्धति: असली बनाम नकली दस्तावेज़ पहचान",
    methodology_subtitle: "वेरीस्कैन किस प्रकार पिक्सेल भौतिकी, क्रिप्टोग्राफिक श्रृंखला और सूक्ष्म-टाइपोग्राफी का विश्लेषण कर असली पहचान पत्रों और नकली प्रतियों में अंतर करता है।",
    methodology_badge: "बहुस्तरीय साक्ष्य सत्यापन ढांचा",
    methodology_real_title: "असली दस्तावेज़ की विशेषताएं",
    methodology_fake_title: "जाली / छेड़छाड़ के संकेत",

    pillar_1_name: "पिक्सेल संपीड़न और त्रुटि स्तर विश्लेषण (ELA)",
    pillar_1_real: "एकसमान 8×8 DCT संपीड़न। वास्तविक स्कैन में सभी पिक्सेल ब्लॉकों में एकसमान त्रुटि स्तर पाया जाता है।",
    pillar_1_fake: "स्थानीय संपीड़न विसंगतियां। बदले गए नाम, तिथियां या जोड़ी गई फोटो पृष्ठभूमि से अलग त्रुटि स्पाइक्स दिखाती हैं।",

    pillar_2_name: "सूक्ष्म-टाइपोग्राफी और फॉन्ट संरेखण",
    pillar_2_real: "सख्त वैधानिक फॉन्ट बेसलाइन, अक्षर अंतर (कर्निग), एकसमान मोटाई और वास्तविक प्रिंट स्याही फैलाव।",
    pillar_2_fake: "सिंथेटिक डिजिटल फॉन्ट, असंगत बेसलाइन, अक्षरों के बीच असमान दूरी और डिजिटल बनावट।",

    pillar_3_name: "गणितीय चेकसम और कलन-विधि समता",
    pillar_3_real: "आधार पर वर्होफ डायहेड्रल क्रमपरिवर्तन (D5), पैन पर ISO 7064 Mod 11,10 और पासपोर्ट पर 7-3-1 भार मैट्रिक्स।",
    pillar_3_fake: "बदले गए या मनगढ़ंत अंक चेकसम एल्गोरिदम में विफल हो जाते हैं, जिससे तत्काल टियर-ए वीटो सक्रिय होता है।",

    pillar_4_name: "क्रिप्टोग्राफिक PKI और सुरक्षित QR हस्ताक्षर",
    pillar_4_real: "सुरक्षित QR कोड में आधिकारिक जारीकर्ता के सार्वजनिक प्रमाणपत्र के विरुद्ध सत्यापित 2048-बिट RSA डिजिटल हस्ताक्षर।",
    pillar_4_fake: "हस्ताक्षरविहीन QR, सामान्य वेब लिंक, या QR डेटा और दृश्य जनसांख्यिकी के बीच हैश बेमेल।",

    pillar_5_name: "PRNU सेंसर नॉइज़ और स्क्रीन एंटी-स्पूफिंग",
    pillar_5_real: "कैमरे या स्कैनर से प्राप्त प्राकृतिक ऑप्टिकल सेंसर नॉइज़ और भौतिक कागज़ की बनावट।",
    pillar_5_fake: "सपाट डिजिटल पृष्ठभूमि (शून्य नॉइज़), स्क्रीन मोइरे पैटर्न या AI जनरेटिव कलाकृतियां।",

    pillar_6_name: "टेम्पलेट मिलान और सुरक्षा गिलौश पैटर्न",
    pillar_6_real: "वैधानिक लेआउट, आधिकारिक राष्ट्रीय प्रतीक, माइक्रो-टेक्स्ट रेखाएं और प्रामाणिक वॉटरमार्क।",
    pillar_6_fake: "प्रतीक का विकृत अनुपात, गायब माइक्रो-टेक्स्ट, गलत वॉटरमार्क और अनधिकृत खाके।",

    specimen_title: "संवादात्मक फोरेंसिक तुलना दर्शक",
    specimen_subtitle: "असली और जाली दस्तावेज़ों के फोरेंसिक संकेतों में अंतर देखने के लिए एक प्रोफाइल चुनें।",
    tab_genuine: "असली दस्तावेज़ प्रोफाइल",
    tab_forged: "जाली दस्तावेज़ प्रोफाइल",
    diagnostic_summary: "फोरेंसिक नैदानिक सारांश",
    specimen_status_genuine: "उत्तीर्ण · सभी फोरेंसिक मानक प्रामाणिक हैं",
    specimen_status_forged: "गंभीर वीटो · कई जाली हस्ताक्षर और विसंगतियां चिह्नित",

    footer_brand: "वेरीस्कैन // SIH-2026",
    footer_node: "राष्ट्रीय दस्तावेज़ फोरेंसिक जांच प्रणाली",
    footer_desc: "इलेक्ट्रॉनिक्स और सूचना प्रौद्योगिकी मंत्रालय (MeitY) हेतु विकसित · भारत सरकार",
    footer_privacy: "शून्य-डेटा संचय · मेमोरी में तत्काल निष्पादन · क्लाइंट-साइड एन्क्रिप्शन",
    nav_dashboard: "कमांड सेंटर",
    nav_border: "सीमा टर्मिनल",
    nav_verify: "दस्तावेज़ जांच",
    nav_history: "ऑडिट बहीखाता",
    nav_settings: "सेटिंग्स",
  },
  mr: {
    portal_title: "व्हेरिस्कॅन फॉरेन्सिक कमांड सेंटर",
    govt_of_india: "भारत सरकार",
    meity: "इलेक्ट्रॉनिक्स आणि माहिती तंत्रज्ञान मंत्रालय (MeitY)",
    satyam_eva_jayate: "सत्यमेव जयते",
    digital_india: "डिजिटल इंडिया",
    sign_in: "साइन इन करा",
    register: "नोंदणी करा",
    open_workspace: "कार्यक्षेत्र उघडा",
    new_screening: "नवीन तपासणी",

    intake_engine: "दस्तऐवज दाखल यंत्रणा",
    intake_title: "दस्तऐवज दाखल आणि फॉरेन्सिक पडताळणी",
    dropzone_title: "फॉरेन्सिक तपासणीसाठी दस्तऐवज दाखल करा",
    dropzone_subtitle: "येथे फाइल ड्रॅग करा किंवा स्टोरेज / कॅमेरा निवडा",
    select_file: "फाइल निवडा",
    optical_camera: "कॅमेरा स्कॅन",
    upload_limits: "PDF · JPG · PNG · WEBP · कमाल 10 MB",
    client_enclave: "सुरक्षित एन्क्लेव",
    zero_disk: "शून्य डिस्क संचय",
    load_specimen: "तपासणी नमुना दाखल करा",
    staged_payload: "तपासणीसाठी फाइल सज्ज",
    execute_screening: "फॉरेन्सिक तपासणी सुरू करा",
    discard: "रद्द करा",

    pipeline_status: "प्रणाली स्थिती",
    engine_matrix: "फॉरेन्सिक इंजिन स्थिती मॅट्रिक्स",
    all_systems_nominal: "सर्व यंत्रणा सुरळीत",
    active: "सक्रिय",
    latency: "विलंब",
    audit_ledger: "ऑडिट नोंदवही",
    recent_records: "नुकत्याच झालेल्या पडताळणी नोंदी",
    view_full_ledger: "संपूर्ण नोंदवही पहा",

    col_ref: "संदर्भ कोड",
    col_file: "दस्तऐवज",
    col_type: "प्रकार",
    col_status: "स्थिती",
    col_score: "विश्वासार्हता गुणांक",
    col_observation: "निष्कर्ष",
    col_action: "कृती",

    verified: "सत्यापित",
    needs_review: "पुनरावलोकन आवश्यक",
    likely_forged: "संभाव्य बनावट",
    pass: "उत्तीर्ण",
    flag: "चिन्हांकित",
    na: "लागू नाही",

    confidence_score: "विश्वासार्हता गुणांक",
    dossier_ref: "डोसियर संदर्भ",
    tamper_zones: "बनावट संशयित क्षेत्रे",
    show_zones: "संशयित क्षेत्रे दाखवा",
    hide_zones: "क्षेत्रे लपवा",
    coordinate_hud: "निर्देशांक HUD",
    req_human_review: "मानवी पुनरावलोकन विनंती",
    copy_hash: "हॅश कॉपी करा",
    export_pdf: "प्रमाणपत्र डाउनलोड (PDF)",

    restricted_access: "मर्यादित प्रवेश · पडताळणी नोंदवही",
    restricted_notice: "संस्थात्मक ऑडिट नोंदी आणि पडताळणी इतिहास केवळ अधिकृत कर्मचाऱ्यांसाठी मर्यादित आहे.",
    sign_in_to_access: "नोंदी पाहण्यासाठी साइन इन करा",

    hero_badge: "संस्थात्मक फॉरेन्सिक तपासणी प्रणाली",
    hero_title: "स्वयंचलित दस्तऐवज फॉरेन्सिक आणि छेडछाड शोध",
    hero_subtitle: "कंप्रेशन त्रुटी, टायपोग्राफी सातत्य, गणितीय चेकसम आणि क्रिप्टोग्राफिक स्वाक्षऱ्यांची बहुस्तरीय पडताळणी.",
    btn_open_workspace: "फॉरेन्सिक कमांड सेंटर उघडा",
    btn_ingest_file: "दस्तऐवज नमुना दाखल करा",
    btn_analyzing: "विश्लेषण सुरू आहे...",
    officer_portal: "अधिकारी पोर्टल:",
    signed_in_as: "दाखल अधिकारी",
    officer: "अधिकारी",
    login: "लॉगिन",
    sign_out: "साइन आउट",

    hero_footer_zero_disk: "शून्य-डिस्क संचय इन-मेमरी प्रोटोकॉल",
    hero_footer_sha: "SHA-256 क्रिप्टोग्राफिक हॅश पडताळणी",
    hero_footer_standards: "ICAO Doc 9303 आणि UIDAI वैधानिक मानके",
    hero_footer_iso: "ISO 3166-1 अधिकृत सार्वभौम जारीकर्ता यादी",

    methodology_title: "वैज्ञानिक कार्यपद्धती: खरे विरुद्ध बनावट दस्तऐवज पडताळणी",
    methodology_subtitle: "व्हेरिस्कॅन पिक्सेल भौतिकशास्त्र, क्रिप्टोग्राफिक साखळी आणि सूक्ष्म-टायपोग्राफीचे विश्लेषण करून खऱ्या कागदपत्रांची आणि बनावट प्रतींची खात्री कशी करते.",
    methodology_badge: "बहुस्तरीय पुरावा पडताळणी आराखडा",
    methodology_real_title: "खऱ्या दस्तऐवजाची वैशिष्ट्ये",
    methodology_fake_title: "बनावट / छेडछाडीचे निर्देशक",

    pillar_1_name: "पिक्सेल कंप्रेशन आणि एरर लेव्हल ॲनालिसिस (ELA)",
    pillar_1_real: "एकसारखे 8×8 DCT कंप्रेशन. मूळ स्कॅनमध्ये सर्व पिक्सेल ब्लॉक्सवर समान एरर पातळी आढळते.",
    pillar_1_fake: "स्थानिक कंप्रेशन तफावत. छेडछाड केलेले मजकूर, जन्मतारखा किंवा जोडलेले फोटो पार्श्वभूमीपेक्षा वेगळे एरर स्पाइक्स दाखवतात.",

    pillar_2_name: "सूक्ष्म-टायपोग्राफी आणि फॉन्ट संरेखन",
    pillar_2_real: "अचूक वैधानिक फॉन्ट बेसलाइन, अक्षरांमधील अंतर (कर्निग), एकसमान जाडी आणि मूळ प्रिंट शाईचे प्रमाण.",
    pillar_2_fake: "कृत्रिम डिजिटल फॉन्ट, असमान बेसलाइन, चुकीचे अक्षर अंतर आणि डिजिटल रचनेतील विसंगती.",

    pillar_3_name: "गणितीय चेकसम आणि अल्गोरिदम समानता",
    pillar_3_real: "आधारवरील व्हेर्हॉफ डायहेड्रल परम्युटेशन (D5), पॅनवरील ISO 7064 Mod 11,10 आणि पासपोर्टवरील 7-3-1 वेट मॅट्रिक्स.",
    pillar_3_fake: "बदललेले किंवा बनावट क्रमांक चेकसम अल्गोरिदममध्ये अयशस्वी ठरतात, ज्यामुळे त्वरित टियर-ए नकारादेश लागू होतो.",

    pillar_4_name: "क्रिप्टोग्राफिक PKI आणि सुरक्षित QR स्वाक्षरी",
    pillar_4_real: "सुरक्षित QR कोडमध्ये अधिकृत जारीकर्त्याच्या सार्वजनिक प्रमाणपत्राद्वारे सत्यापित 2048-बिट RSA डिजिटल स्वाक्षरी.",
    pillar_4_fake: "स्वाक्षरी नसलेला QR कोड, सामान्य वेब लिंक, किंवा QR डेटा आणि दृश्य मजकुरातील विसंगती.",

    pillar_5_name: "PRNU सेन्सर नॉइझ आणि स्क्रीन अँटी-स्पूफिंग",
    pillar_5_real: "कॅमेरा किंवा स्कॅनरमधील नैसर्गिक ऑप्टिकल सेन्सर नॉइझ आणि प्रत्यक्ष कागदाची रचना.",
    pillar_5_fake: "सपाट डिजिटल पार्श्वभूमी (कॅनव्हा/फोटोशॉपमधून शून्य नॉइझ), स्क्रीनवरील मोइरे पॅटर्न किंवा AI जनरेटेड कलाकृती.",

    pillar_6_name: "टेम्पलेट जुळणी आणि सुरक्षा गिलौश पॅटर्न",
    pillar_6_real: "वैधानिक रचना, अधिकृत राष्ट्रीय चिन्ह, सूक्ष्म-मजकूर रेषा आणि मूळ वॉटरमार्क मांडणी.",
    pillar_6_fake: "चिन्हाचे विसंगत प्रमाण, गहाळ सूक्ष्म-मजकूर, चुकीची वॉटरमार्क जागा आणि अनधिकृत नमुने.",

    specimen_title: "संवादी फॉरेन्सिक तुलना दर्शक",
    specimen_subtitle: "खऱ्या आणि बनावट दस्तऐवजांमधील फॉरेन्सिक निर्देशकांचा फरक पाहण्यासाठी प्रोफाइल निवडा.",
    tab_genuine: "खरे दस्तऐवज प्रोफाइल",
    tab_forged: "बनावट दस्तऐवज प्रोफाइल",
    diagnostic_summary: "फॉरेन्सिक तपासणी निष्कर्ष",
    specimen_status_genuine: "उत्तीर्ण · सर्व फॉरेन्सिक निकष प्रमाणित आहेत",
    specimen_status_forged: "गंभीर नकारादेश · अनेक बनावट स्वाक्षऱ्या व त्रुटी आढळल्या",

    footer_brand: "व्हेरिस्कॅन // SIH-2026",
    footer_node: "राष्ट्रीय दस्तऐवज फॉरेन्सिक तपासणी यंत्रणा",
    footer_desc: "इलेक्ट्रॉनिक्स आणि माहिती तंत्रज्ञान मंत्रालय (MeitY) साठी विकसित · भारत सरकार",
    footer_privacy: "शून्य-डेटा संचय · तात्काळ इन-मेमरी प्रक्रिया · क्लायंट-साइड एन्क्रिप्शन",
    nav_dashboard: "कमांड सेंटर",
    nav_border: "सीमा टर्मिनल",
    nav_verify: "दस्तऐवज तपासणी",
    nav_history: "ऑडिट नोंदवही",
    nav_settings: "सेटिंग्ज",
  },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => DICTIONARY.en[key] || String(key),
});

const STORAGE_KEY = "veriscan_language";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    const saved = localStorage.getItem(STORAGE_KEY) as Language;
    if (saved && (saved === "en" || saved === "hi" || saved === "mr")) {
      return saved;
    }
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  };

  const t = (key: keyof Translations): string => {
    const table = DICTIONARY[language] || DICTIONARY.en;
    return table[key] || DICTIONARY.en[key] || String(key);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
