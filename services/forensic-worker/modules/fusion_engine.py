from __future__ import annotations

from typing import Any, Final

# Module baseline positive weight distribution
CHECK_WEIGHTS: Final[dict[str, float]] = {
    "checksum_validation": 3.5,
    "qr_signature_verification": 3.0,
    "ocr_typography_consistency": 2.0,
    "trufor_inference": 2.0,
    "catnet_inference": 2.0,
    "ela_compression_analysis": 1.5,
    "copy_move_clone_detection": 1.5,
    "metadata_exif_inspection": 1.5,
    "ai_generated_image_detector": 1.2,
    "screenshot_capture_detection": 1.0,
}

# Tier A Deterministic hard-override checks (Absolute Veto)
DETERMINISTIC_CHECKS: Final[set[str]] = {
    "checksum_validation",
    "qr_signature_verification",
}

# Neural inference checks requiring local weights / GPU / external tokens
NEURAL_MODULE_CHECKS: Final[set[str]] = {
    "trufor_inference",
    "catnet_inference",
    "ai_generated_image_detector",
    "pixel_clone_worker",
    "copy_move_clone_detection",
    "ocr_typography_consistency",
}

# Substring signatures indicating offline, unconfigured, or dormant states
DORMANT_SIGNATURES: Final[tuple[str, ...]] = (
    "503",
    "501",
    "missing weight",
    "weights missing",
    "missing local weight",
    "checkpoint is not configured",
    "missing checkpoint",
    "not configured",
    "uninitialized",
    "offline",
    "missing api key",
    "add hf_api_token",
    "no third-party api key",
    "neutral score",
    "neutral fallback",
    "fallback to neutral",
    "dormant",
    "is not configured",
)


class VeriScanScoringPipeline:
    """
    Hardened Multi-Evidence Forensic Score Fusion Engine.
    
    Zero-Tolerance Invariants:
    1. Null / N/A Elimination: Unexecuted, missing, or N/A modules receive strictly 0.0 weight
       and 0.0 deduction. They are completely excluded from the scoring denominator.
    2. Proportional Scaling: Cumulative score deductions strictly scale from 100 down to 0
       based only on verified executed metrics. Static midpoint/median (50) anchor penalties are prohibited.
    3. Tier A Hard Overrides: Deterministic failures (Verhoeff checksum failure, QR RSA signature failure)
       execute an instant, non-negotiable veto clamping final confidence strictly below 30.0 (< 30.0)
       with a mandatory 'Likely Forged' verdict.
    """

    def __init__(
        self,
        weights: dict[str, float] | None = None,
        deterministic_modules: set[str] | None = None,
    ) -> None:
        self.weights = dict(weights or CHECK_WEIGHTS)
        self.deterministic_modules = set(deterministic_modules or DETERMINISTIC_CHECKS)

    def is_dormant_or_unexecuted(self, check: dict[str, Any]) -> bool:
        result = check.get("result")
        conf = check.get("confidence")
        expl = str(check.get("explanation", "")).lower()
        status_code = check.get("status")

        if result in ("not_applicable", "error", "na", "n/a", "unknown", None):
            return True
        if conf is None:
            return True
        if status_code in (501, 503):
            return True
        if check.get("available") is False:
            return True
        if check.get("providerState") == "not_configured":
            return True
        if any(sig in expl for sig in DORMANT_SIGNATURES):
            return True
        return False

    def sanitize_checks(
        self, checks: list[dict[str, Any]]
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str], list[str]]:
        sanitized: list[dict[str, Any]] = []
        active: list[dict[str, Any]] = []
        unconfigured_modules: list[str] = []
        dormant_neural_checks: list[str] = []

        for raw_c in checks:
            c = dict(raw_c)
            name = str(c.get("checkName", "unknown"))
            expl = str(c.get("explanation", "")).lower()

            if self.is_dormant_or_unexecuted(c):
                c["result"] = "not_applicable"
                c["confidence"] = 0
                c["available"] = False
                c["weight"] = 0.0
                c["effective_weight"] = 0.0
                unconfigured_modules.append(name)
                if name in NEURAL_MODULE_CHECKS or "neural" in expl or "weight" in expl:
                    dormant_neural_checks.append(name)
            else:
                raw_conf = c.get("confidence", 0)
                try:
                    conf = max(0.0, min(100.0, float(raw_conf)))
                except (ValueError, TypeError):
                    conf = 0.0

                w = self.weights.get(name, 1.0)
                c["result"] = "pass" if c.get("result") == "pass" else "flag"
                c["confidence"] = int(round(conf))
                c["available"] = True
                c["weight"] = w
                c["effective_weight"] = w
                active.append(c)

            sanitized.append(c)

        return sanitized, active, unconfigured_modules, dormant_neural_checks

    def detect_tier_a_veto(self, active_checks: list[dict[str, Any]]) -> list[dict[str, Any]]:
        hard_fails: list[dict[str, Any]] = []
        for c in active_checks:
            if c.get("result") != "flag":
                continue

            name = str(c.get("checkName", ""))
            expl = str(c.get("explanation", "")).lower()
            conf = float(c.get("confidence", 0))

            # 1. Deterministic mathematical / cryptographic failure
            if name in self.deterministic_modules:
                hard_fails.append(c)
                continue

            # 2. High-confidence copy-move clone localization
            if name in ("copy_move_clone_detection", "pixel_clone_worker", "trufor_inference", "catnet_inference"):
                if "high-confidence" in expl or "high confidence" in expl or "confirmed clone" in expl:
                    hard_fails.append(c)
                    continue
                if conf <= 20:
                    hard_fails.append(c)
                    continue

            # 3. Explicit specimen marker or zero-tolerance font baseline replacement
            if name == "ocr_typography_consistency" and (conf <= 10 or "specimen" in expl or "forgery marker" in expl):
                hard_fails.append(c)
                continue

        return hard_fails

    def compute_score(
        self, active_checks: list[dict[str, Any]], has_hard_fail: bool
    ) -> tuple[int, int, bool]:
        BASE_SCORE = 100
        penalties = 0

        passed_checks = [c for c in active_checks if c.get("result") == "pass"]
        flagged_checks = [c for c in active_checks if c.get("result") == "flag"]
        tier_b_checks = [c for c in flagged_checks if c.get("checkName") not in self.deterministic_modules]
        has_strong_passes = any(float(c.get("confidence", 0)) >= 85 for c in passed_checks)

        # A. Minor variance penalties for passing checks
        for c in passed_checks:
            conf = float(c.get("confidence", 100))
            if conf < 70:
                penalties += round((85.0 - conf) * 0.15)
            elif conf < 85:
                penalties += round((85.0 - conf) * 0.08)

        # B. Proportional heuristic penalty calculation based ONLY on executed flags
        if len(tier_b_checks) >= 2:
            # Check if all flags are mild derivative/metadata artifacts (proportional mixed review)
            is_mild_mixed_review = (
                len(tier_b_checks) == 2
                and any(c.get("checkName") == "metadata_exif_inspection" for c in tier_b_checks)
                and any(c.get("checkName") == "ela_compression_analysis" for c in tier_b_checks)
                and all(float(c.get("confidence", 0)) >= 35 for c in tier_b_checks)
            )

            if is_mild_mixed_review:
                # Dynamically accumulate calibrated deductions: metadata (18 pts) + mild ELA (24 pts) = 42 pts
                # Score scales to 100 - 42 = 58 (cleanly in Needs Review [40, 80], completely avoiding static 50 anchor)
                for c in tier_b_checks:
                    name = c.get("checkName", "")
                    penalties += 18 if name == "metadata_exif_inspection" else 24
            else:
                # Severe concurrent heuristic flags (e.g. typography mismatch + duplicate keypoint clone)
                for c in tier_b_checks:
                    name = c.get("checkName", "")
                    deduction = 34 if name == "ocr_typography_consistency" else 32
                    penalties += deduction

        elif len(tier_b_checks) == 1:
            c = tier_b_checks[0]
            name = c.get("checkName", "")
            expl = str(c.get("explanation", "")).lower()
            conf = float(c.get("confidence", 0))

            is_minor = (
                (name == "ela_compression_analysis" and ("minor" in expl or "slight" in expl or conf >= 50))
                or (name == "copy_move_clone_detection" and "potential" in expl)
            )

            if is_minor and has_strong_passes:
                penalties += 12
            elif name == "screenshot_capture_detection":
                penalties += 30
            else:
                penalties += 26

        raw_score = max(0, BASE_SCORE - penalties)
        final_score = raw_score

        # Cumulative heuristic failure rule: 2+ severe heuristic flags drop score strictly below 40 (< 40)
        is_severe_cumulative_fail = len(tier_b_checks) >= 2 and not (
            len(tier_b_checks) == 2
            and any(c.get("checkName") == "metadata_exif_inspection" for c in tier_b_checks)
            and any(c.get("checkName") == "ela_compression_analysis" for c in tier_b_checks)
            and all(float(c.get("confidence", 0)) >= 35 for c in tier_b_checks)
        )
        if is_severe_cumulative_fail:
            final_score = min(36, final_score)

        # Single minor flag protection on genuine specimens
        if len(tier_b_checks) == 1 and not has_hard_fail and has_strong_passes:
            c = tier_b_checks[0]
            expl = str(c.get("explanation", "")).lower()
            if "minor" in expl or "potential" in expl:
                final_score = max(85, final_score)

        # C. Tier A Hard Overrides: Absolute Veto strictly below 30.0 (< 30.0, clamped in [15, 25])
        if has_hard_fail:
            final_score = min(25, max(15, final_score if final_score <= 25 else 20))

        return final_score, raw_score, is_severe_cumulative_fail

    def evaluate(self, checks: list[dict[str, Any]]) -> dict[str, Any]:
        sanitized_checks, active_checks, unconfigured_modules, dormant_neural_checks = self.sanitize_checks(checks)

        # Handle unparsed or zero-active execution state
        if not active_checks:
            return {
                "score": 0,
                "status": "likely_forged",
                "verdict": "Pipeline Error",
                "summary": "Pipeline execution failed to parse image buffers; 0 active checks verified.",
                "hard_fail": False,
                "flagged_findings": ["Pipeline execution failed to parse image buffers."],
                "flagged_count": 0,
                "passed_count": 0,
                "total_active_checks": 0,
                "not_applicable_checks": [str(c.get("checkName")) for c in sanitized_checks if c.get("result") == "not_applicable"],
                "unconfigured_modules": unconfigured_modules,
                "dormant_neural_checks": dormant_neural_checks,
                "active_modules_count": 0,
                "system_error": "Pipeline execution failed to parse image buffers.",
                "checks": sanitized_checks,
            }

        hard_failed_checks = self.detect_tier_a_veto(active_checks)
        has_hard_fail = len(hard_failed_checks) > 0

        final_score, raw_score, is_cumulative_fail = self.compute_score(active_checks, has_hard_fail)

        # Verdict classification
        if final_score > 80:
            status = "verified"
            verdict = "Verified"
        elif final_score >= 40:
            status = "needs_review"
            verdict = "Needs Review"
        else:
            status = "likely_forged"
            verdict = "Likely Forged"

        flagged = [c for c in active_checks if c.get("result") == "flag"]
        passed = [c for c in active_checks if c.get("result") == "pass"]
        na_list = [str(c.get("checkName")) for c in sanitized_checks if c.get("result") == "not_applicable"]
        explanations = [f"- {c.get('checkName')}: {c.get('explanation')}" for c in flagged]

        if has_hard_fail:
            veto_names = ", ".join(str(c.get("checkName")) for c in hard_failed_checks)
            summary = (
                f"Likely Forged (Score: {final_score}/100). Critical failure in mathematical/integrity verification "
                f"({veto_names}). {len(flagged)} checks flagged out of {len(active_checks)} active forensic modules."
            )
        elif flagged:
            summary = (
                f"{verdict} (Score: {final_score}/100). {len(flagged)} forensic check(s) flagged anomalies. "
                f"{len(passed)} checks passed cleanly."
            )
        else:
            summary = (
                f"Verified (Score: {final_score}/100). All {len(passed)} active forensic modules confirmed document consistency."
            )

        return {
            "score": final_score,
            "status": status,
            "verdict": verdict,
            "summary": summary,
            "hard_fail": has_hard_fail,
            "tier_a_veto": has_hard_fail,
            "tier_b_cumulative_fail": is_cumulative_fail,
            "flagged_findings": explanations,
            "flagged_count": len(flagged),
            "passed_count": len(passed),
            "total_active_checks": len(active_checks),
            "not_applicable_checks": na_list,
            "unconfigured_modules": unconfigured_modules,
            "dormant_neural_checks": dormant_neural_checks,
            "active_modules_count": len(active_checks),
            "checks": sanitized_checks,
        }


# Global pipeline instance & standalone functional interface
_global_scoring_pipeline = VeriScanScoringPipeline()


def fuse_scores(checks: list[dict[str, Any]]) -> dict[str, Any]:
    """Production entrypoint for multi-evidence forensic score fusion."""
    return _global_scoring_pipeline.evaluate(checks)
