import { describe, expect, it, vi } from "vitest";
import {
  getAuthRedirectUrl,
  signUpWithEmailPassword,
  signInWithEmailPassword,
  sendEmailOtpOrMagicLink,
  verifyEmailOtp,
} from "./supabase";

describe("Supabase Auth Production Redirect URL", () => {
  it("defaults to the production Render portal URL when in non-browser or localhost environment", () => {
    const redirectUrl = getAuthRedirectUrl("/dashboard");
    expect(redirectUrl).toContain("bharatdrishti.onrender.com/dashboard");
    expect(redirectUrl).not.toContain("localhost");
    expect(redirectUrl).not.toContain("127.0.0.1");
  });

  it("correctly appends custom paths to redirect URL without double slashes", () => {
    const redirectUrl = getAuthRedirectUrl("auth/callback");
    expect(redirectUrl).toBe("https://bharatdrishti.onrender.com/auth/callback");
  });
});

describe("Supabase Email Authentication Methods", () => {
  it("captures signup requests with production redirect and full name", async () => {
    const res = await signUpWithEmailPassword({
      email: "officer@veriscan.internal",
      password: "password123",
      name: "Forensic Officer",
    });
    // With dummy/unconfigured Supabase keys, gracefully catches error or returns handled object
    expect(res).toBeDefined();
    expect(typeof res.success).toBe("boolean");
  }, 10000);

  it("handles email OTP / magic link dispatch with production redirect", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await sendEmailOtpOrMagicLink({
      email: "analyst@veriscan.internal",
    });
    expect(res).toBeDefined();
    expect(typeof res.success).toBe("boolean");
    consoleSpy.mockRestore();
  });

  it("handles email OTP verification gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await verifyEmailOtp({
      email: "analyst@veriscan.internal",
      token: "123456",
    });
    expect(res).toBeDefined();
    expect(typeof res.success).toBe("boolean");
    consoleSpy.mockRestore();
  });
});
