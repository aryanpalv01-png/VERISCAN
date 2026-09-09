import { demoDocuments, VerificationDocument } from "@/lib/veriscan";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getCurrentUserIdentifier(): string {
  if (!canUseStorage()) return "guest";
  try {
    const token = window.localStorage.getItem("veriscan_auth_token");
    if (token) {
      const parts = token.split(".");
      if (parts[1]) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload?.openId) return payload.openId;
      }
    }
    const localUser = window.localStorage.getItem("veriscan_local_user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      if (parsed?.email) return parsed.email;
      if (parsed?.openId) return parsed.openId;
    }
  } catch {
    // Ignore decode error
  }
  return "guest";
}

export function getUserStorageKey(userIdentifier?: string): string {
  const id = userIdentifier || getCurrentUserIdentifier();
  return `veriscan-scans-${id}`;
}

export function readUserScans(userIdentifier?: string): VerificationDocument[] {
  if (!canUseStorage()) return [];
  try {
    const key = getUserStorageKey(userIdentifier);
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VerificationDocument[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeUserScan(document: VerificationDocument, userIdentifier?: string) {
  if (!canUseStorage()) return;
  const key = getUserStorageKey(userIdentifier);
  const current = readUserScans(userIdentifier);
  const next = [document, ...current.filter((item) => item.id !== document.id)].slice(0, 50);
  window.localStorage.setItem(key, JSON.stringify(next));

  // Direct document key and global latest scan pointer
  try {
    window.localStorage.setItem(`veriscan-doc-${document.id}`, JSON.stringify(document));
    window.localStorage.setItem("veriscan-latest-scan", JSON.stringify(document));
  } catch {}
}

// Aliases for backward compatibility
export function readLocalScans(userIdentifier?: string): VerificationDocument[] {
  return readUserScans(userIdentifier);
}

export function writeLocalScan(document: VerificationDocument, userIdentifier?: string) {
  writeUserScan(document, userIdentifier);
}

export function getPreviewDocuments(userIdentifier?: string): VerificationDocument[] {
  // Account-scoped: return ONLY the current user's scanned documents
  const userScans = readUserScans(userIdentifier);
  return userScans;
}

export function getDemoSpecimens(): VerificationDocument[] {
  return demoDocuments;
}

export function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      resolve(value.includes(",") ? value.split(",")[1] ?? "" : value);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function getPreviewDocument(id?: string, userIdentifier?: string): VerificationDocument | undefined {
  if (!id) return undefined;

  // 1. Direct document key lookup
  if (canUseStorage()) {
    try {
      const direct = window.localStorage.getItem(`veriscan-doc-${id}`);
      if (direct) {
        const parsed = JSON.parse(direct) as VerificationDocument;
        if (parsed?.id === id) return parsed;
      }
    } catch {}
  }

  // 2. Search current user's scans
  const userScans = readUserScans(userIdentifier);
  const found = userScans.find((doc) => doc.id === id);
  if (found) return found;

  // 3. Search across all user scan stores in localStorage
  if (canUseStorage()) {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key.startsWith("veriscan-scans-") || key === "veriscan-latest-scan")) {
        try {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const match = parsed.find((d: any) => String(d?.id) === String(id));
              if (match) return match as VerificationDocument;
            } else if (parsed && typeof parsed === "object") {
              if (String(parsed.id) === String(id) || id === "latest") {
                return parsed as VerificationDocument;
              }
            }
          }
        } catch {}
      }
    }

    // 4. If ID is "latest", return the latest scan directly
    if (id === "latest") {
      try {
        const latest = window.localStorage.getItem("veriscan-latest-scan");
        if (latest) return JSON.parse(latest) as VerificationDocument;
      } catch {}
    }
  }

  // 5. Fallback to demo specimen records ONLY for explicit demo IDs
  if (id.startsWith("doc-")) {
    return demoDocuments.find((document) => document.id === id);
  }

  return undefined;
}
