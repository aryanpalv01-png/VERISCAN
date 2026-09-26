import { afterEach, describe, expect, it, vi } from "vitest";
import { safeStorageSetItem } from "./safeStorage";

function makeStorage(failWrites: number) {
  const values = new Map<string, string>();
  let remainingFailures = failWrites;
  return {
    get length() {
      return values.size;
    },
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => {
      if (remainingFailures > 0) {
        remainingFailures -= 1;
        const error = new Error("Storage quota exceeded");
        error.name = "QuotaExceededError";
        throw error;
      }
      values.set(key, value);
    },
    values,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("safeStorageSetItem", () => {
  it("evicts cached document data and retries after a quota error", () => {
    const storage = makeStorage(1);
    storage.values.set("veriscan-scans-old-user", "cached scans");
    storage.values.set("veriscan_auth_token", "keep-session");
    vi.stubGlobal("window", { localStorage: storage });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(safeStorageSetItem("localStorage", "theme", "light")).toBe(true);
    expect(storage.getItem("theme")).toBe("light");
    expect(storage.getItem("veriscan-scans-old-user")).toBeNull();
    expect(storage.getItem("veriscan_auth_token")).toBe("keep-session");
  });

  it("returns false rather than throwing when storage stays full", () => {
    const storage = makeStorage(2);
    vi.stubGlobal("window", { localStorage: storage });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    let saved = true;
    expect(() => {
      saved = safeStorageSetItem("localStorage", "theme", "light");
    }).not.toThrow();
    expect(saved).toBe(false);
  });
});
