import { createClient } from "@supabase/supabase-js";
import { safeLocalStorageAdapter } from "@/lib/safeStorage";

// Supabase credentials for VeriScan Govt Forensic Architecture
export const SUPABASE_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  "https://dubwryhfjyeuilahaknw.supabase.co";

export const SUPABASE_ANON_KEY =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  "";

export const isSupabaseConfigured = Boolean(
  SUPABASE_ANON_KEY &&
  !SUPABASE_ANON_KEY.endsWith(".anon") &&
  !SUPABASE_ANON_KEY.includes("placeholder") &&
  SUPABASE_ANON_KEY.length > 40
);

// Always create client so supabase.auth methods are callable
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: safeLocalStorageAdapter,
    },
  }
);

/**
 * Returns the production redirect URL for Supabase Auth (email confirmation, magic links).
 * Strictly avoids localhost to prevent ERR_CONNECTION_REFUSED on mobile devices.
 */
export function getAuthRedirectUrl(path: string = "/dashboard"): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin;
    const isLocal =
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes("0.0.0.0");
    if (!isLocal) {
      return `${origin}${cleanPath}`;
    }
  }

  const envRedirect =
    (typeof process !== "undefined" &&
      (process.env?.VITE_AUTH_REDIRECT_URL || process.env?.NEXT_PUBLIC_AUTH_REDIRECT_URL)) ||
    (import.meta as any).env?.VITE_AUTH_REDIRECT_URL;

  if (envRedirect) {
    return `${envRedirect.replace(/\/+$/, "")}${cleanPath}`;
  }

  // Official production URL
  return `https://bharatdrishti.onrender.com${cleanPath}`;
}

/**
 * Register a new user with Email and Password using Supabase.
 * Embeds full name and ensures email confirmation / magic links redirect to production URL.
 */
export async function signUpWithEmailPassword(params: {
  email: string;
  password: string;
  name: string;
  redirectTo?: string;
}) {
  const cleanEmail = params.email.trim().toLowerCase();
  const redirectUrl = params.redirectTo || getAuthRedirectUrl("/dashboard");

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: params.password,
      options: {
        data: {
          name: params.name.trim(),
          full_name: params.name.trim(),
        },
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error("SUPABASE_SIGNUP_ERROR:", error);
      return { success: false, message: error.message, error, data: null };
    }

    return { success: true, message: null, error: null, data };
  } catch (err: any) {
    console.error("SUPABASE_SIGNUP_ERROR:", err);
    return { success: false, message: err?.message || "Registration failed", error: err, data: null };
  }
}

/**
 * Sign in an existing user with Email and Password using Supabase.
 */
export async function signInWithEmailPassword(params: {
  email: string;
  password: string;
}) {
  const cleanEmail = params.email.trim().toLowerCase();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: params.password,
    });

    if (error) {
      console.error("SUPABASE_LOGIN_ERROR:", error);
      return { success: false, message: error.message, error, data: null };
    }

    return { success: true, message: null, error: null, data };
  } catch (err: any) {
    console.error("SUPABASE_LOGIN_ERROR:", err);
    return { success: false, message: err?.message || "Login failed", error: err, data: null };
  }
}

/**
 * Send an Email OTP / Magic Link with production redirect URL.
 */
export async function sendEmailOtpOrMagicLink(params: {
  email: string;
  redirectTo?: string;
}) {
  const cleanEmail = params.email.trim().toLowerCase();
  const redirectUrl = params.redirectTo || getAuthRedirectUrl("/dashboard");

  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error("SUPABASE_EMAIL_OTP_ERROR:", error);
      return { success: false, message: error.message, error, data: null };
    }

    return { success: true, message: null, error: null, data };
  } catch (err: any) {
    console.error("SUPABASE_EMAIL_OTP_ERROR:", err);
    return { success: false, message: err?.message || "Failed to dispatch email code", error: err, data: null };
  }
}

/**
 * Verify a 6-digit Email OTP code using Supabase.
 */
export async function verifyEmailOtp(params: {
  email: string;
  token: string;
}) {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanToken = params.token.trim();

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: "email",
    });

    if (error) {
      console.error("SUPABASE_VERIFY_OTP_ERROR:", error);
      return { success: false, message: error.message, error, session: null, user: null };
    }

    return { success: true, message: null, error: null, session: data.session, user: data.user };
  } catch (err: any) {
    console.error("SUPABASE_VERIFY_OTP_ERROR:", err);
    return { success: false, message: err?.message || "Verification code invalid or expired", error: err, session: null, user: null };
  }
}

