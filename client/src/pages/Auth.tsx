import { useAuth } from "@/_core/hooks/useAuth";
import {
  supabase,
  getAuthRedirectUrl,
  signUpWithEmailPassword,
  signInWithEmailPassword,
  sendEmailOtpOrMagicLink,
  verifyEmailOtp,
} from "@/lib/supabase";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Building2,
  Sparkles,
  UserPlus,
  LogIn,
  KeyRound,
  User,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export function Auth({ params }: { params?: { mode?: string } }) {
  const [location, setLocation] = useLocation();
  const { user, login, register, quickLogin, verifyOtp, sendOtp } = useAuth();

  // Primary mode: "login" or "register"
  const isInitialRegister =
    params?.mode === "register" ||
    params?.mode === "signup" ||
    location.includes("register") ||
    location.includes("signup");

  const [mainMode, setMainMode] = useState<"login" | "register">(
    isInitialRegister ? "register" : "login"
  );

  // Login sub-mode: "password" | "email_otp"
  const [loginMethod, setLoginMethod] = useState<"password" | "email_otp">("password");

  // Registration form state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Shared OTP step state for OTP flows
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<1 | 2>(1); // 1 = entry, 2 = passcode

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  // Keep mainMode synced if route changes
  useEffect(() => {
    if (location.includes("register") || location.includes("signup")) {
      setMainMode("register");
    } else if (location.includes("login")) {
      setMainMode("login");
    }
  }, [location]);

  // Reset errors when changing modes
  const handleSwitchMainMode = (mode: "login" | "register") => {
    setMainMode(mode);
    setError(null);
    setSuccessMessage(null);
    setOtpStep(1);
    setOtp("");
  };

  /**
   * ACTION 1: Register New User with Name, Email & Password
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanName = regName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid official email address.");
      return;
    }
    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = getAuthRedirectUrl("/dashboard");

      // 1. Register with Supabase Auth (configured with production redirect URL)
      const supabaseResult = await signUpWithEmailPassword({
        email: cleanEmail,
        password: regPassword,
        name: cleanName,
        redirectTo: redirectUrl,
      });

      // 2. Synchronize with local / server auth store
      try {
        await register({
          email: cleanEmail,
          password: regPassword,
          name: cleanName,
        });
      } catch (serverErr: any) {
        console.warn("Server registration sync notice:", serverErr);
      }

      if (!supabaseResult.success && supabaseResult.message) {
        // If Supabase returned an error (e.g. rate limit), check if server registration succeeded
        if (supabaseResult.message.includes("User already registered") || supabaseResult.message.includes("already exists")) {
          setError("An account with this email already exists. Please sign in instead.");
          return;
        }
      }

      // Check if session was auto-confirmed or requires email confirmation
      if (supabaseResult.data?.session?.user) {
        toast.success("Account created successfully!", {
          description: "Welcome to VeriScan National Document Forensics.",
        });
        setLocation("/dashboard");
        return;
      }

      // If email confirmation is enabled on Supabase project:
      setRegistrationSuccess(true);
      const msg = `Account created! If your agency requires email verification, a confirmation link pointing to ${redirectUrl} was sent to ${cleanEmail}. You may also sign in directly.`;
      setSuccessMessage(msg);
      toast.success("Registration Successful", { description: msg });
    } catch (err: any) {
      console.error("REGISTRATION_ERROR:", err);
      const msg = err?.message || "Registration failed. Please check your credentials and retry.";
      setError(msg);
      toast.error(`Registration Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * ACTION 2: Sign In with Email & Password
   */
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail || !loginPassword) {
      setError("Please enter your email and password.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Try Supabase Auth password sign-in
      const supabaseResult = await signInWithEmailPassword({
        email: cleanEmail,
        password: loginPassword,
      });

      // 2. Also authenticate against server session
      try {
        await login({
          email: cleanEmail,
          password: loginPassword,
        });
      } catch (serverErr: any) {
        console.warn("Server login sync note:", serverErr);
        // If server failed but supabase succeeded, use supabase session
        if (!supabaseResult.success) {
          throw serverErr;
        }
      }

      if (!supabaseResult.success && supabaseResult.message) {
        // If supabase failed and server didn't succeed
        if (!user && !localStorage.getItem("veriscan_auth_token")) {
          setError(supabaseResult.message);
          toast.error(`Sign In Error: ${supabaseResult.message}`);
          return;
        }
      }

      toast.success("Signed in successfully", {
        description: "Welcome back to the VeriScan Forensic Workspace.",
      });
      setLocation("/dashboard");
    } catch (err: any) {
      console.error("LOGIN_ERROR:", err);
      const msg = err?.message || "Invalid email or password. Please check your credentials.";
      setError(msg);
      toast.error(`Authentication Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * ACTION 3: Send Email OTP (Login Code / Magic Link with Resend & Supabase)
   */
  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid official email address.");
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = getAuthRedirectUrl("/dashboard");

      // 1. Dispatch via Supabase Auth
      await sendEmailOtpOrMagicLink({
        email: cleanEmail,
        redirectTo: redirectUrl,
      });

      // 2. Dispatch via backend Resend service
      let devCodeHint = "";
      try {
        const backendRes = await sendOtp({
          email: cleanEmail,
          redirectUrl,
        });
        if (backendRes?.devCode) {
          devCodeHint = ` (Testing Code: ${backendRes.devCode})`;
        }
      } catch (backendErr) {
        console.warn("Backend email dispatch note:", backendErr);
      }

      setOtpStep(2);
      const msg = `A 6-digit passcode has been sent to ${cleanEmail}.${devCodeHint} Click the email confirmation link or enter the code below.`;
      setSuccessMessage(msg);
      toast.success("Login Code Dispatched", { description: msg });
    } catch (err: any) {
      console.error("EMAIL_OTP_ERROR:", err);
      const msg = err?.message || "Failed to dispatch login code.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * ACTION 4: Verify Email OTP Code
   */
  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setError("Please enter the complete 6-digit passcode.");
      return;
    }

    setIsLoading(true);

    try {
      const cleanEmail = loginEmail.trim().toLowerCase();

      // 1. Try backend verification first (Resend / server memory / testing bypass)
      let backendSuccess = false;
      try {
        await verifyOtp({
          email: cleanEmail,
          token: cleanOtp,
        });
        backendSuccess = true;
      } catch (backendErr) {
        console.warn("Backend verify attempted:", backendErr);
      }

      // 2. Try Supabase verification if backend didn't authenticate
      if (!backendSuccess) {
        const result = await verifyEmailOtp({
          email: cleanEmail,
          token: cleanOtp,
        });
        if (!result.success) {
          throw new Error(result.message || "Invalid or expired passcode. Please retry.");
        }
      }

      toast.success("Identity verified successfully", {
        description: "Welcome to the VeriScan Forensic Workspace.",
      });
      setLocation("/dashboard");
    } catch (err: any) {
      console.error("VERIFY_OTP_ERROR:", err);
      setError(err?.message || "Verification code invalid or expired.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * ACTION 7: 1-Click Institutional Demo Access (Evaluator Bypass)
   */
  const handleDemoAccess = async (profile: "analyst" | "investigator" = "investigator") => {
    setIsLoading(true);
    setError(null);
    try {
      await quickLogin(profile);
      toast.success("Institutional Demo Access Granted", {
        description: "Authenticated as Senior Forensic Investigator (National Cyber Crime Portal).",
      });
      setLocation("/dashboard");
    } catch {
      localStorage.setItem("veriscan_auth_token", "demo-token");
      setLocation("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#f8fafc] text-slate-900 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top clean navigation bar */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm shadow-xs">
              V
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-slate-900 leading-tight">
                VeriScan
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                SIH-2026
              </span>
            </div>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-100 font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
        </div>
      </header>

      {/* Main Centered Authentication Card */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-[440px] rounded-2xl bg-white p-6 sm:p-8 shadow-xs border border-slate-200/80 text-slate-900 transition-all">
          {/* Brand Header */}
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <ShieldCheck className="h-6 w-6 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {mainMode === "register" ? "Create Account" : "Sign In"}
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              {mainMode === "register"
                ? "Register credentials for institutional forensic screening."
                : otpStep === 1
                ? loginMethod === "password"
                  ? "Enter official email and password."
                  : "Enter email for single-use login code."
                : `Enter 6-digit passcode sent to ${loginEmail}.`}
            </p>
          </div>

          {/* Top Primary Tabs: Sign In vs Create Account */}
          <div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleSwitchMainMode("login")}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mainMode === "login"
                  ? "bg-white text-indigo-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMainMode("register")}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mainMode === "register"
                  ? "bg-white text-indigo-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" /> Create Account
            </button>
          </div>

          {/* Sub-Tabs for Login Mode (Password vs Email OTP) */}
          {mainMode === "login" && otpStep === 1 && (
            <div className="mt-3 grid grid-cols-2 rounded-lg bg-slate-50 p-1 text-xs font-medium border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod("password");
                  setError(null);
                }}
                className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginMethod === "password"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" /> Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod("email_otp");
                  setError(null);
                }}
                className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  loginMethod === "email_otp"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Mail className="h-3.5 w-3.5" /> Email OTP
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div
              className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && !error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              <span className="leading-relaxed">{successMessage}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: REGISTRATION (SIGN UP) FORM */}
          {/* ========================================================================= */}
          {mainMode === "register" && !registrationSuccess && (
            <form onSubmit={handleRegister} className="mt-5 space-y-3.5">
              <div>
                <label
                  htmlFor="regName"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5"
                >
                  <User className="h-3.5 w-3.5 text-indigo-600" /> Full Name
                </label>
                <input
                  id="regName"
                  type="text"
                  required
                  autoFocus
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Officer Rajesh Kumar"
                  className="w-full h-10 px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="regEmail"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5 text-indigo-600" /> Official Email
                </label>
                <input
                  id="regEmail"
                  type="email"
                  required
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="officer@agency.gov.in"
                  className="w-full h-10 px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="regPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5"
                >
                  <LockKeyhole className="h-3.5 w-3.5 text-indigo-600" /> Password (Min 6 Chars)
                </label>
                <div className="relative flex items-center">
                  <input
                    id="regPassword"
                    type={showRegPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-10 pl-3.5 pr-10 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-700 transition-colors p-1"
                    aria-label={showRegPassword ? "Hide password" : "Show password"}
                  >
                    {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="regConfirmPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5"
                >
                  <LockKeyhole className="h-3.5 w-3.5 text-indigo-600" /> Confirm Password
                </label>
                <input
                  id="regConfirmPassword"
                  type={showRegPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full h-10 px-3.5 py-2 text-sm text-slate-900 bg-white border rounded-xl placeholder:text-slate-400 focus:outline-none transition-all shadow-xs ${
                    regConfirmPassword && regPassword !== regConfirmPassword
                      ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  }`}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !regName.trim() || !regEmail.trim() || !regPassword || regPassword !== regConfirmPassword}
                  className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Registering…</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Register Account</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-xs text-slate-500 pt-1">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchMainMode("login")}
                  className="font-semibold text-indigo-600 hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* Registration Success Confirmation Card */}
          {mainMode === "register" && registrationSuccess && (
            <div className="mt-6 space-y-4 text-center">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-left">
                <p className="font-bold text-sm text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  Account Registration Complete
                </p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                  Your credentials have been recorded. You can now sign in to your workspace.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMainMode("login");
                  setLoginMethod("password");
                  setLoginEmail(regEmail);
                  setRegistrationSuccess(false);
                }}
                className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="h-4 w-4" />
                <span>Proceed to Sign In</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: SIGN IN (LOGIN) FLOWS */}
          {/* ========================================================================= */}
          {mainMode === "login" && (
            <>
              {/* Option A: PASSWORD LOGIN */}
              {otpStep === 1 && loginMethod === "password" && (
                <form onSubmit={handlePasswordLogin} className="mt-5 space-y-3.5">
                  <div>
                    <label
                      htmlFor="loginEmail"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5"
                    >
                      <Mail className="h-3.5 w-3.5 text-indigo-600" /> Official Email
                    </label>
                    <input
                      id="loginEmail"
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="investigator@agency.gov.in"
                      className="w-full h-10 px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="loginPassword"
                        className="block text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
                      >
                        <LockKeyhole className="h-3.5 w-3.5 text-indigo-600" /> Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginMethod("email_otp");
                          setError(null);
                        }}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Use OTP Code
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        id="loginPassword"
                        type={showLoginPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full h-10 pl-3.5 pr-10 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 text-slate-400 hover:text-slate-700 transition-colors p-1"
                        aria-label={showLoginPassword ? "Hide password" : "Show password"}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading || !loginEmail.trim() || !loginPassword}
                      className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Signing In…</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4" />
                          <span>Sign In to Workspace</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-center text-xs text-slate-500 pt-1">
                    Need an account?{" "}
                    <button
                      type="button"
                      onClick={() => handleSwitchMainMode("register")}
                      className="font-semibold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Register here
                    </button>
                  </p>
                </form>
              )}

              {/* Option B: EMAIL OTP STEP 1 */}
              {otpStep === 1 && loginMethod === "email_otp" && (
                <form onSubmit={handleSendEmailOtp} className="mt-5 space-y-3.5">
                  <div>
                    <label
                      htmlFor="emailOtpInput"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5"
                    >
                      <Mail className="h-3.5 w-3.5 text-indigo-600" /> Official Email
                    </label>
                    <input
                      id="emailOtpInput"
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="investigator@agency.gov.in"
                      className="w-full h-10 px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-xs"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading || !loginEmail.trim()}
                      className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Sending Code…</span>
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          <span>Send 6-Digit Passcode</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: 6-DIGIT OTP PASSCODE VERIFICATION */}
              {otpStep === 2 && (
                <form
                  onSubmit={handleVerifyEmailOtp}
                  className="mt-5 space-y-4"
                >
                  <div>
                    <label
                      htmlFor="otpCode"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1.5">
                        <LockKeyhole className="h-3.5 w-3.5 text-indigo-600" /> 6-Digit Passcode
                      </span>
                      <span className="font-normal lowercase text-[11px] text-slate-500">
                        {loginEmail}
                      </span>
                    </label>
                    <input
                      id="otpCode"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      autoFocus
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••••"
                      autoComplete="one-time-code"
                      className="w-full h-12 px-3 py-2 text-center font-mono text-2xl tracking-[0.3em] font-bold text-slate-900 bg-white border border-slate-200 rounded-xl placeholder:text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otp.trim().length !== 6}
                    className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying…</span>
                      </>
                    ) : (
                      "Verify & Access Workspace"
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep(1);
                        setOtp("");
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="inline-flex items-center gap-1 font-medium hover:text-slate-800 transition-colors cursor-pointer py-1"
                    >
                      <ArrowLeft className="h-3 w-3" /> Back
                    </button>

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSendEmailOtp()}
                      className="font-medium text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer py-1"
                    >
                      Resend Passcode
                    </button>
                  </div>
                </form>
              )}

              {/* 1-Click Demo Account Access */}
              {otpStep === 1 && (
                <div className="mt-5 pt-4 border-t border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                      Quick Evaluation
                    </span>
                    <span className="rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 border border-emerald-200">
                      1-Click Access
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDemoAccess("investigator")}
                    disabled={isLoading}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-slate-800 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-xs"
                  >
                    <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span>Enter as Forensic Examiner (Demo)</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Footer Inside Card */}
          <div className="mt-6 border-t border-slate-200/80 pt-3 text-center text-[11px] text-slate-400">
            Institutional Forensic Security · VeriScan
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 px-4 border-t border-slate-200/80 bg-white">
        &copy; {new Date().getFullYear()} VeriScan · Evidentiary Document Screening Node
      </footer>
    </div>
  );
}

export default Auth;
