export type StorageArea = "localStorage" | "sessionStorage";

const CACHE_PREFIXES = ["veriscan-scans-", "veriscan-doc-"];
const CACHE_KEYS = new Set(["veriscan-latest-scan"]);

function getStorage(area: StorageArea): Storage | null {
  try {
    return typeof window === "undefined" ? null : window[area];
  } catch (error) {
    console.warn(`[Storage] ${area} is unavailable.`, error);
    return null;
  }
}

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as Error & { code?: number }).code;
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    code === 22 ||
    code === 1014
  );
}

function clearCachedData(storage: Storage): void {
  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => key !== null);

    for (const key of keys) {
      if (CACHE_KEYS.has(key) || CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        storage.removeItem(key);
      }
    }
  } catch (error) {
    console.warn("[Storage] Could not clear cached document data.", error);
  }
}

export function safeStorageGetItem(area: StorageArea, key: string): string | null {
  const storage = getStorage(area);
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch (error) {
    console.warn(`[Storage] Could not read ${key}; continuing without the saved value.`, error);
    return null;
  }
}

export function safeStorageSetItem(area: StorageArea, key: string, value: string): boolean {
  const storage = getStorage(area);
  if (!storage) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[Storage] Could not save ${key}.`, error);
    if (!isQuotaError(error)) return false;
  }

  clearCachedData(storage);
  try {
    storage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[Storage] Could not save ${key} after clearing cached data.`, error);
    return false;
  }
}

export function safeStorageRemoveItem(area: StorageArea, key: string): void {
  const storage = getStorage(area);
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch (error) {
    console.warn(`[Storage] Could not remove ${key}.`, error);
  }
}

export const safeLocalStorageAdapter = {
  getItem: (key: string) => safeStorageGetItem("localStorage", key),
  setItem: (key: string, value: string) => {
    safeStorageSetItem("localStorage", key, value);
  },
  removeItem: (key: string) => safeStorageRemoveItem("localStorage", key),
};
