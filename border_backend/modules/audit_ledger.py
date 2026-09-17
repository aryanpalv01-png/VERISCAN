"""
Border Checkpoint Screening System - Tamper-Evident Hash-Chained Audit Ledger
Implements a cryptographic SHA-256 immutable block chain where every border
transaction query is cryptographically sealed and linked to the preceding block.
"""
from __future__ import annotations

import hashlib
import threading
from datetime import datetime, timezone
from typing import List, Optional
from border_backend.models import AuditChainEntry


class AuditLedger:
    """Thread-safe singleton audit trail ledger with Genesis root."""
    _instance: Optional[AuditLedger] = None
    _lock = threading.Lock()

    def __init__(self):
        self.chain: List[AuditChainEntry] = []
        self._initialize_genesis()

    def _initialize_genesis(self):
        """Creates immutable Genesis block."""
        genesis_ts = "2026-01-01T00:00:00Z"
        genesis_prev = "0000000000000000000000000000000000000000000000000000000000000000"
        genesis_doc_hash = hashlib.sha256(b"VERISCAN_ICAO_9303_DEFENSE_GENESIS_ROOT").hexdigest()
        
        raw_payload = f"{genesis_prev}:0:{genesis_ts}:{genesis_doc_hash}:SYSTEM_INITIALIZED:0:CP-HQ:SYSTEM"
        genesis_hash = hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()

        genesis_block = AuditChainEntry(
            block_height=0,
            timestamp=genesis_ts,
            document_sha256=genesis_doc_hash,
            decision="SYSTEM_INITIALIZED",
            risk_score=0,
            station_id="CP-HQ",
            officer_id="SYSTEM",
            previous_block_hash=genesis_prev,
            block_hash=genesis_hash,
        )
        self.chain.append(genesis_block)

    @classmethod
    def get_instance(cls) -> AuditLedger:
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def record_transaction(
        self,
        document_bytes: Optional[bytes],
        decision: str,
        risk_score: int,
        station_id: str = "CP-DEL-04",
        officer_id: str = "OFFICER-7749",
        fallback_mrz_text: Optional[str] = None,
    ) -> AuditChainEntry:
        """
        Appends an immutable, cryptographic transaction record to the audit chain.
        """
        with self._lock:
            latest_block = self.chain[-1]
            new_height = latest_block.block_height + 1
            now_iso = datetime.now(timezone.utc).isoformat()

            # Hash document payload
            if document_bytes and len(document_bytes) > 0:
                doc_sha256 = hashlib.sha256(document_bytes).hexdigest()
            elif fallback_mrz_text:
                doc_sha256 = hashlib.sha256(fallback_mrz_text.encode("utf-8")).hexdigest()
            else:
                doc_sha256 = hashlib.sha256(b"EMPTY_TRANSACTION_PAYLOAD").hexdigest()

            # Cryptographic block hashing: Hash(n) = SHA256(PrevHash + Height + Timestamp + DocHash + Decision + Risk + Station + Officer)
            pre_image = (
                f"{latest_block.block_hash}:{new_height}:{now_iso}:{doc_sha256}:"
                f"{decision}:{risk_score}:{station_id}:{officer_id}"
            )
            block_hash = hashlib.sha256(pre_image.encode("utf-8")).hexdigest()

            entry = AuditChainEntry(
                block_height=new_height,
                timestamp=now_iso,
                document_sha256=doc_sha256,
                decision=decision,
                risk_score=risk_score,
                station_id=station_id,
                officer_id=officer_id,
                previous_block_hash=latest_block.block_hash,
                block_hash=block_hash,
            )
            self.chain.append(entry)
            return entry

    def verify_integrity(self) -> bool:
        """
        Validates the entire chain from Genesis to current tip.
        Returns False if any tampering occurred.
        """
        with self._lock:
            for i in range(1, len(self.chain)):
                prev = self.chain[i - 1]
                curr = self.chain[i]

                # 1. Verify parent hash link
                if curr.previous_block_hash != prev.block_hash:
                    return False

                # 2. Re-compute and verify hash of current block
                pre_image = (
                    f"{curr.previous_block_hash}:{curr.block_height}:{curr.timestamp}:{curr.document_sha256}:"
                    f"{curr.decision}:{curr.risk_score}:{curr.station_id}:{curr.officer_id}"
                )
                computed = hashlib.sha256(pre_image.encode("utf-8")).hexdigest()
                if computed != curr.block_hash:
                    return False

            return True

    def get_latest_block(self) -> AuditChainEntry:
        with self._lock:
            return self.chain[-1]


def record_audit_entry(
    document_bytes: Optional[bytes],
    decision: str,
    risk_score: int,
    station_id: str = "CP-DEL-04",
    officer_id: str = "OFFICER-7749",
    fallback_mrz_text: Optional[str] = None,
) -> AuditChainEntry:
    """Convenience functional helper to record transaction audit."""
    return AuditLedger.get_instance().record_transaction(
        document_bytes=document_bytes,
        decision=decision,
        risk_score=risk_score,
        station_id=station_id,
        officer_id=officer_id,
        fallback_mrz_text=fallback_mrz_text,
    )
