# VeriScan forensic modules

VeriScan treats document screening as an evidence-fusion workflow rather than a single classifier. Every module returns a shared observation shape containing a module name, result, confidence, explanation, provider, and availability. The final score is an **authenticity confidence score**, not a government-record confirmation and not a guarantee that a document is genuine.

| Module | Implementation | Availability policy |
|---|---|---|
| Metadata / EXIF / PDF inspection | Node-side EXIF and PDF token inspection | Active for uploaded bytes |
| Identifier validation | Aadhaar Verhoeff and PAN structural checks | Active only when a candidate identifier is available; not a complete identity check |
| QR / signature verification | QR decoding in Node, then local UIDAI certificate worker | Applicable to Aadhaar only; other document types are explicitly not applicable |
| ELA / compression | Decoded-pixel preflight plus optional authenticated pixel worker | Local preflight is active for supported images; worker signals are active only when the worker returns a validated result |
| Copy-move / clone | Block-level local preflight plus optional worker | Local preflight is conservative and should not be treated as a full localization model |
| Screenshot / capture type | Decoded-pixel noise-variance preflight plus optional worker | Signal is excluded when the input is not a supported image |
| Multi-Class Forensic CNN Layer | MobileNetV3-Lite (ONNX CPU Runtime, <100ms) | Active for uploaded images; outputs 5-class breakdown (Pristine, Photo Replacement, Text Tampering, Seal Anomaly, Screenshot) |
| OCR typography and field extraction | Self-hosted Tesseract through `pytesseract` | No API key; requires the local worker endpoint to be configured |
| Hugging Face AI-image detector | Server-side `Organika/sdxl-detector` inference | The only third-party API integration; requires `HF_API_TOKEN` |
| TruFor | Official repository hosted behind the self-hosted worker | No API key; requires the operator-installed checkpoint and worker endpoint |
| CAT-Net | Official repository hosted behind the self-hosted worker | No API key; requires the operator-installed checkpoint and worker endpoint |
| Score fusion | Tier A hard override + multi-signal evidence fusion engine | Active; hard checksum/signature failures cap the score <=15; unverified templates capped <=45 |

## Exact credential and configuration policy

`HF_API_TOKEN` is the only third-party API secret. It is stored through the project secret manager and used only on the server for `Organika/sdxl-detector`. The model result is an AI-generation likelihood signal, not proof of editing or document fraud.

OCR uses the self-hosted Python worker at `OCR_API_URL` and does not use `OCR_API_KEY`. TruFor and CAT-Net use internal worker URLs at `TRUFOR_API_URL` and `CATNET_API_URL` and do not use vendor API keys. The optional pixel worker uses `PIXEL_ANALYSIS_API_URL` without a vendor key. These URLs are deployment configuration for services controlled by the operator.

Aadhaar QR trust uses the local certificate-backed verifier at `UIDAI_QR_VERIFY_URL`. The worker loads the public certificate from `UIDAI_PUBLIC_CERT_PATH`, defaulting to `certs/uidai_public_cert.cer`, with Python `cryptography`. No JSON issuer-key map and no private signing key belong in the app. The official UIDAI certificate page returned 404 during this build, so the certificate is intentionally not fabricated or embedded; install the current UIDAI `.cer` file before enabling trust.

## Self-hosted model runtimes

The official TruFor repository is vendored under `services/forensic-worker/vendor/TruFor`. Its Docker instructions identify `https://www.grip.unina.it/download/prog/TruFor/TruFor_weights.zip` and MD5 `7bee48f3476c75616c3c5721ab256ff8` for the weights. The repository states that its software is for informational and nonprofit purposes, so review the license before production use.

The official CAT-Net repository is vendored under `services/forensic-worker/vendor/CAT-Net`. Its README identifies `CAT_full_v2` as the general-forgery model and lists the official Google Drive and Baidu weight locations. Review the repository and weight licenses before obtaining and deploying those checkpoints.

The web application intentionally remains a Node/TypeScript service. Heavy Python/PyTorch inference should run in the separately managed worker. The scaffold returns explicit 503/501 responses until the operator installs and wires the official model workflows, rather than pretending that a missing checkpoint is an active signal.

## Evaluation guidance

Accuracy must be evaluated with a representative, permissioned dataset containing genuine documents and manually edited variants across supported types, capture devices, compression settings, and document templates. Hold out documents and templates for evaluation, measure false-positive and false-negative rates by module, and keep a human review path for mixed evidence. Do not tune thresholds against a single sample or interpret any model-card benchmark as a guarantee on identity documents.

## References

[1]: https://github.com/grip-unina/TruFor "Official TruFor repository"
[2]: https://github.com/mjkwon2021/CAT-Net "Official CAT-Net repository"
[3]: https://huggingface.co/Organika/sdxl-detector "Organika SDXL detector model card"
[4]: https://uidai.gov.in/en/ "UIDAI official website"
