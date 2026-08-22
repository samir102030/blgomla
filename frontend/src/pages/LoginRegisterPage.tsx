import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { BoltIcon, HeartIcon, TruckIcon, TagIcon, LockClosedIcon, ShieldCheckIcon, PhoneIcon } from "@heroicons/react/24/outline";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import SEO from "../components/SEO";
import Footer from "../components/Footer";
import { useUserStore } from "../stores/user.store";
import { useTranslation } from "react-i18next";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { GoogleLogin } from "@react-oauth/google";
import "../styles/auth-blade.css";
import type { PickedAddress } from "../components/AddressMapPicker";

// Leaflet only loads if somebody opens the map.
const AddressMapPicker = lazy(() => import("../components/AddressMapPicker"));

type AuthMode = "login" | "register";

/**
 * Google sign-in needs a client id from the Google Cloud console, and a
 * deployment without one is a perfectly good deployment — everything else
 * about signing in works. What is not good is the button: with an empty id it
 * still draws, and pressing it fails silently. So the whole block, divider and
 * all, appears only where it can actually do something.
 */
const GOOGLE_ENABLED = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

/** The blade's whole pass. */
const SWEEP_MS = 1100;
/**
 * Mid-way through the stretch of the pass — 46% to 58%, see auth-blade.css —
 * where the blade covers the card end to end. It is the only moment the two
 * panes can trade sides without being seen doing it.
 */
const COVER_MS = Math.round(SWEEP_MS * 0.52);

const LoginRegisterPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<AuthMode>("login");
  /**
   * Where the card is headed, as opposed to what it is showing. The tabs read
   * this one, so a click lights the tab it landed on straight away instead of
   * half a second later when the panes actually change.
   */
  const [target, setTarget] = useState<AuthMode>("login");
  const [sweeping, setSweeping] = useState(false);
  const timers = useRef<number[]>([]);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Leaving the page mid-sweep would otherwise set state on a gone component.
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  /**
   * Change panes under the blade.
   *
   * The swap is scheduled for the moment the blade is over the card, not for
   * when it has finished: waiting for the end would show the old form through
   * the second half of the pass, and swapping at the start would show the new
   * one through the first.
   */
  const switchTo = (next: AuthMode) => {
    if (next === target || sweeping) return;
    setTarget(next);
    if (prefersReducedMotion) {
      setMode(next);
      return;
    }
    setSweeping(true);
    timers.current.push(
      window.setTimeout(() => setMode(next), COVER_MS),
      window.setTimeout(() => setSweeping(false), SWEEP_MS),
    );
  };

  /**
   * The brand panel sits on the far side for sign-in and the near side for
   * register, and the two panes trade places when the mode changes. The blade
   * runs the way they are being pushed — which mirrors in Arabic, along with
   * the sides themselves.
   */
  const rtl = i18n.dir() === "rtl";
  const flow = (target === "login") !== rtl ? "fwd" : "back";
  const brandCol =
    mode === "login" ? "lg:col-start-4 lg:col-span-2 lg:row-start-1" : "lg:col-start-1 lg:col-span-2 lg:row-start-1";
  const formCol =
    mode === "login" ? "lg:col-start-1 lg:col-span-3 lg:row-start-1" : "lg:col-start-3 lg:col-span-3 lg:row-start-1";

  const copy =
    mode === "login"
      ? {
          lead: t("login.headlineSignInLead", "Welcome"),
          em: t("login.headlineSignInEm", "back."),
          blurb: t(
            "login.headlineSignInBlurb",
            "Your cart, your orders and your saved list are exactly where you left them.",
          ),
        }
      : {
          lead: t("login.headlineRegisterLead", "Start the"),
          em: t("login.headlineRegisterEm", "first page."),
          blurb: t(
            "login.headlineRegisterBlurb",
            "One account for every order, every quote and every device you own.",
          ),
        };
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ name: "", email: "", phoneNumber: "", password: "", confirmPassword: "" });
  /**
   * Where to deliver, offered at registration and entirely optional.
   *
   * Saved by the signup endpoint rather than from here: signup issues no
   * session, so there is no way to write an address from the browser until
   * the emailed code has been verified, and whatever was picked would be
   * lost in between.
   */
  const [pickedLocation, setPickedLocation] = useState<PickedAddress | null>(null);
  const [showSignupMap, setShowSignupMap] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  // 2FA: when backend returns TOTP_REQUIRED we surface a second input
  // and resubmit with the totpCode. The email+password from the first
  // attempt are still in state.
  const [totpRequired, setTotpRequired] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref") || undefined;
  const login = useUserStore((s) => s.login);
  const signup = useUserStore((s) => s.signup);
  const googleSignIn = useUserStore((s) => s.googleSignIn);
  const loading = useUserStore((s) => s.loading);

  const handleGoogleSuccess = async (credential?: string) => {
    setLoginError(null);
    setRegisterError(null);
    if (!credential) {
      setLoginError(t("login.googleFailed", "Google sign-in failed."));
      return;
    }
    const result = await googleSignIn(credential);
    if (result.user) {
      navigate("/");
    } else if (result.totpRequired) {
      setLoginError(t("login.googleTotpUnsupported", "This account has 2FA enabled. Please sign in with email and password."));
    } else {
      const latest = useUserStore.getState().error;
      setLoginError(latest || t("login.googleFailed", "Google sign-in failed."));
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const emailLower = loginData.email.trim().toLowerCase();
      const result = await login({
        email: emailLower,
        password: loginData.password,
        totpCode: totpRequired ? totpCode : undefined,
      });
      if (result.user) {
        setTotpRequired(false);
        setTotpCode("");
        navigate("/");
      } else if (result.totpRequired) {
        setTotpRequired(true);
        setLoginError(null);
      } else if (result.emailNotVerified) {
        // Pre-emptively trigger a fresh code so the user lands on /verify-email
        // with something current in their inbox; fire-and-forget.
        useUserStore.getState().resendVerificationCode(emailLower);
        navigate(`/verify-email?email=${encodeURIComponent(emailLower)}`);
      } else {
        const latest = useUserStore.getState().error;
        setLoginError(latest || t("login.failed", "Login failed."));
      }
    } catch {
      const latest = useUserStore.getState().error;
      setLoginError(latest || t("login.failed", "Login failed."));
    } finally { setLoginLoading(false); }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);
    if (!registerData.name.trim()) {
      setRegisterError(t("login.nameRequired", "Please enter your full name."));
      return;
    }
    // Egyptian mobile in E.164: +201 followed by 9 digits. Accept the
    // common local forms ("01012345678", "1012345678") in the UI and
    // normalize to E.164 before sending — backend rejects anything else.
    const phoneDigits = registerData.phoneNumber.replace(/[^\d+]/g, "");
    let normalizedPhone = phoneDigits;
    if (/^01\d{9}$/.test(phoneDigits)) normalizedPhone = "+2" + phoneDigits;
    else if (/^1\d{9}$/.test(phoneDigits)) normalizedPhone = "+20" + phoneDigits;
    if (!/^\+201\d{9}$/.test(normalizedPhone)) {
      setRegisterError(t("login.phoneInvalid", "Enter a valid Egyptian mobile number (e.g. 01012345678)."));
      return;
    }
    if (registerData.password.length < 6) {
      setRegisterError(t("login.passwordTooShort", "Password must be at least 6 characters."));
      return;
    }
    if (registerData.password !== registerData.confirmPassword) {
      setRegisterError(t("login.passwordsMismatch", "Passwords do not match."));
      return;
    }
    try {
      const emailLower = registerData.email.trim().toLowerCase();
      const user = await signup({
        name: registerData.name.trim(),
        email: emailLower,
        phoneNumber: normalizedPhone,
        password: registerData.password,
        ...(referralCode ? { referralCode } : {}),
        ...(pickedLocation
          ? {
              deliveryAddress: {
                address: pickedLocation.address,
                city: pickedLocation.city,
                state: pickedLocation.state,
              },
            }
          : {}),
      } as any);
      if (user) {
        // Backend no longer issues a session cookie at signup — user must
        // verify the emailed code. Send them straight to the verify page
        // with the email pre-filled.
        navigate(`/verify-email?email=${encodeURIComponent(emailLower)}`);
      } else {
        const latest = useUserStore.getState().error;
        setRegisterError(latest || t("login.registerFailed", "Registration failed."));
      }
    } catch {
      const latest = useUserStore.getState().error;
      setRegisterError(latest || t("login.registerFailed", "Registration failed."));
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all";

  const benefits = [
    { icon: BoltIcon, title: t("login.benefit1Title", "Fast Checkout"), desc: t("login.benefit1Desc", "Save your details for one-click ordering") },
    { icon: HeartIcon, title: t("login.benefit2Title", "Wishlist & Favorites"), desc: t("login.benefit2Desc", "Keep track of products you love") },
    { icon: TruckIcon, title: t("login.benefit3Title", "Order Tracking"), desc: t("login.benefit3Desc", "Monitor your orders in real-time") },
    { icon: TagIcon, title: t("login.benefit4Title", "Exclusive Deals"), desc: t("login.benefit4Desc", "Access member-only prices & promotions") },
  ];

  /**
   * The brand panel's opening block — wordmark, headline, blurb.
   *
   * Rendered twice: once in the panel and once inside the blade, where the
   * blade's `overflow: hidden` cuts it along the rake. Both copies are built
   * from this one value so the copy inside the blade sits exactly over the one
   * underneath, and any change to the spacing moves the two together.
   */
  const intro = (
    <>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-bold text-white text-lg">B</div>
        <span className="text-white font-bold text-xl tracking-tight">{t("brand.wordmark", "Belgomla")}</span>
      </div>
      {/* 700 is the ceiling for the display face — at 800 the browser
          synthesises the bold and the kufic loses its edges. */}
      <h2 className="text-4xl font-bold text-white leading-[1.1] mb-4">
        <span className="ab-lead block">{copy.lead}</span>
        <span className="ab-em block">{copy.em}</span>
      </h2>
      <p className="text-white/80 text-sm leading-relaxed">{copy.blurb}</p>
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SEO title={t("Sign in")} description={t("Sign in to your Belgomla account, or create one.")} noindex />
      <Header />

      <main className="py-8 lg:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* The stage is the whole card — both panes — because both of them
              move: switching mode sends the brand panel to the other side and
              the form back the other way, and the blade has to cover the pair
              of them while they cross. */}
          <div
            className={`ab-stage grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-stretch${sweeping ? " is-sweeping" : ""}`}
            data-flow={flow}
            style={{ "--ab-sweep": `${SWEEP_MS}ms` } as React.CSSProperties}
          >

            {/* ===== BRANDING PANEL ===== */}
            <div className={`hidden lg:flex ${brandCol} flex-col`}>
              <div className="relative flex-1 rounded-3xl overflow-hidden bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-accent)] to-[#0B0B10] p-8 flex flex-col justify-between" style={{ minHeight: '520px' }}>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-60"></div>
                <div className="relative z-10">{intro}</div>
                <div className="relative z-10 space-y-3 mt-auto">
                  {benefits.map((b, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                      <b.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <div>
                        <h4 className="text-white text-sm font-semibold">{b.title}</h4>
                        <p className="text-white/70 text-xs">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ===== AUTH FORMS ===== */}
            <div className={formCol}>
              {/* Tab Switcher — on `target`, not `mode`, so the press lands the
                  moment it is made rather than when the panes catch up. */}
              <div className="flex bg-[var(--surface-2)] rounded-2xl p-1 mb-8 border border-[var(--border)]">
                {(["login", "register"] as AuthMode[]).map((m) => (
                  <button key={m} onClick={() => switchTo(m)} aria-pressed={target === m} className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${target === m ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}>
                    {m === "login" ? t("login.signIn", "Sign In") : t("login.createAccount", "Create Account")}
                  </button>
                ))}
              </div>

              {/* ===== LOGIN FORM ===== */}
              {mode === "login" && (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-sm">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-[var(--text)]">{t("login.welcomeBack", "Welcome Back")}</h2>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{t("login.signInDesc", "Sign in to access your account, orders, and wishlist.")}</p>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">{t("login.email", "Email Address")}</label>
                      <input type="email" placeholder={t("login.emailPlaceholder", "you@example.com")} value={loginData.email} onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} className={inputClass} required />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium text-[var(--text-muted)]">{t("login.password", "Password")}</label>
                        <Link to="/forgot-password" className="text-xs font-medium text-[var(--brand-primary)] hover:underline">{t("login.forgotPassword", "Forgot password?")}</Link>
                      </div>
                      <div className="relative">
                        <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} className={inputClass + " pr-11"} required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors">
                          {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {totpRequired && (
                      <div className="p-4 rounded-xl bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/30">
                        <label className="block text-sm font-semibold text-[var(--text)] mb-1.5">
                          {t("login.totpLabel", "Authenticator code")}
                        </label>
                        <p className="text-xs text-[var(--text-muted)] mb-2.5">
                          {t("login.totpDesc", "Enter the 6-digit code from your authenticator app to finish signing in.")}
                        </p>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          autoFocus
                          value={totpCode}
                          onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                          className={inputClass + " tracking-widest text-center text-lg"}
                          placeholder="••••••"
                        />
                      </div>
                    )}

                    {loginError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 text-red-700 dark:text-red-300 text-sm">
                        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                        {loginError}
                      </div>
                    )}

                    <button type="submit" disabled={loginLoading || (totpRequired && totpCode.length !== 6)} className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] hover:shadow-lg hover:shadow-[var(--brand-primary)]/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                      {loginLoading
                        ? <><span className="animate-spin">⟳</span> {t("login.signingIn", "Signing in...")}</>
                        : totpRequired
                          ? t("login.verifyCode", "Verify Code")
                          : t("login.signInBtn", "Sign In")}
                    </button>
                  </form>

                  {GOOGLE_ENABLED && (
                    <>
                      <div className="my-6 flex items-center gap-3">
                        <div className="flex-1 h-px bg-[var(--border)]" />
                        <span className="text-xs text-[var(--text-subtle)] uppercase tracking-wider">
                          {t("login.or", "or")}
                        </span>
                        <div className="flex-1 h-px bg-[var(--border)]" />
                      </div>

                      <div className="flex justify-center">
                        <GoogleLogin
                          onSuccess={(cred) => handleGoogleSuccess(cred.credential)}
                          onError={() => setLoginError(t("login.googleFailed", "Google sign-in failed."))}
                          useOneTap={false}
                          theme="outline"
                          size="large"
                          width="320"
                        />
                      </div>
                    </>
                  )}

                  <div className="mt-6 text-center">
                    <p className="text-sm text-[var(--text-muted)]">
                      {t("login.noAccount", "Don't have an account?")}{" "}
                      <button onClick={() => switchTo("register")} className="font-semibold text-[var(--brand-primary)] hover:underline">{t("login.createOne", "Create one")}</button>
                    </p>
                  </div>
                </div>
              )}

              {/* ===== REGISTER FORM ===== */}
              {mode === "register" && (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-sm">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-[var(--text)]">{t("login.createYourAccount", "Create Your Account")}</h2>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{t("login.registerDesc", "Join Belgomla and start shopping the best tech deals in Egypt.")}</p>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">{t("login.fullName", "Full Name")}</label>
                      <input type="text" placeholder={t("login.fullNamePlaceholder", "Ahmed Mohamed")} value={registerData.name} onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })} className={inputClass} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">{t("login.email", "Email Address")}</label>
                      <input type="email" placeholder={t("login.emailPlaceholder", "you@example.com")} value={registerData.email} onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })} className={inputClass} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">{t("login.phone", "Phone Number (Egypt)")}</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[var(--text-subtle)] text-sm pointer-events-none select-none">+20</span>
                        <input
                          type="tel"
                          inputMode="numeric"
                          placeholder="1012345678"
                          value={registerData.phoneNumber}
                          onChange={(e) => setRegisterData({ ...registerData, phoneNumber: e.target.value })}
                          className={inputClass + " pl-14"}
                          required
                          autoComplete="tel-national"
                        />
                      </div>
                      <p className="text-[11px] text-[var(--text-subtle)] mt-1">{t("login.phoneHint", "Enter your Egyptian mobile number, e.g. 01012345678")}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">{t("login.password", "Password")}</label>
                        <div className="relative">
                          <input type={showRegPassword ? "text" : "password"} placeholder="••••••••" minLength={6} value={registerData.password} onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })} className={inputClass + " pr-11"} required />
                          <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors">
                            {showRegPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-[var(--text-subtle)] mt-1">{t("login.passwordHint", "At least 6 characters")}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">{t("login.confirmPassword", "Confirm Password")}</label>
                        <input type="password" placeholder="••••••••" value={registerData.confirmPassword} onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })} className={inputClass} required />
                      </div>
                    </div>

                    {registerError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 text-red-700 dark:text-red-300 text-sm">
                        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                        {registerError}
                      </div>
                    )}
                    {registerSuccess && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/25 text-green-700 dark:text-green-300 text-sm">
                        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        {registerSuccess}
                      </div>
                    )}

                    {/*
                      Optional, and said so: a delivery address is genuinely
                      useful to have before the first order, but a signup form
                      that appears to demand somebody's home is a signup form
                      people leave.
                    */}
                    <div className="rounded-xl border border-[var(--border)] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--text)]">
                            {t("login.shareLocation", "Share your delivery location")}
                            <span className="ms-1.5 text-[10px] font-medium text-[var(--text-subtle)]">
                              {t("login.optional", "optional")}
                            </span>
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            {pickedLocation
                              ? `${pickedLocation.city}${pickedLocation.state ? ", " + pickedLocation.state : ""}`
                              : t("login.shareLocationDesc", "Saves it to your account so checkout is one step.")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSignupMap((v) => !v)}
                          className="shrink-0 text-xs font-semibold text-[var(--brand-primary)] hover:underline"
                        >
                          {showSignupMap ? t("account.hideMap", "Hide map") : t("login.openMap", "Open map")}
                        </button>
                      </div>
                      {showSignupMap && (
                        <div className="mt-3">
                          <Suspense fallback={<div className="text-sm text-[var(--text-muted)]">{t("Loading map…")}</div>}>
                            <AddressMapPicker onSelect={setPickedLocation} />
                          </Suspense>
                        </div>
                      )}
                    </div>

                    <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] hover:shadow-lg hover:shadow-[var(--brand-primary)]/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                      {loading ? <><span className="animate-spin">⟳</span> {t("login.registering", "Creating account...")}</> : t("login.registerBtn", "Create Account")}
                    </button>
                  </form>

                  {GOOGLE_ENABLED && (
                    <>
                      <div className="my-6 flex items-center gap-3">
                        <div className="flex-1 h-px bg-[var(--border)]" />
                        <span className="text-xs text-[var(--text-subtle)] uppercase tracking-wider">
                          {t("login.or", "or")}
                        </span>
                        <div className="flex-1 h-px bg-[var(--border)]" />
                      </div>

                      <div className="flex justify-center">
                        <GoogleLogin
                          onSuccess={(cred) => handleGoogleSuccess(cred.credential)}
                          onError={() => setRegisterError(t("login.googleFailed", "Google sign-in failed."))}
                          useOneTap={false}
                          theme="outline"
                          size="large"
                          text="signup_with"
                          width="320"
                        />
                      </div>
                    </>
                  )}

                  <div className="mt-5 text-center text-xs text-[var(--text-subtle)] leading-relaxed">
                    {t("login.termsNotice", "By creating an account, you agree to our")}{" "}
                    <Link to="/terms" className="text-[var(--brand-primary)] hover:underline">{t("login.terms", "Terms & Conditions")}</Link>{" "}
                    {t("login.and", "and")}{" "}
                    <Link to="/privacy" className="text-[var(--brand-primary)] hover:underline">{t("login.privacy", "Privacy Policy")}</Link>
                  </div>

                  <div className="mt-6 text-center">
                    <p className="text-sm text-[var(--text-muted)]">
                      {t("login.hasAccount", "Already have an account?")}{" "}
                      <button onClick={() => switchTo("login")} className="font-semibold text-[var(--brand-primary)] hover:underline">{t("login.signInLink", "Sign in")}</button>
                    </p>
                  </div>
                </div>
              )}

              {/* ===== TRUST BADGES (below form) ===== */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { icon: LockClosedIcon, label: t("login.trustSSL", "SSL Encrypted") },
                  { icon: ShieldCheckIcon, label: t("login.trustSecure", "Secure Payments") },
                  { icon: PhoneIcon, label: t("login.trustSupport", "24/7 Support") },
                ].map((badge, i) => (
                  <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl py-3 px-2 text-center">
                    <badge.icon className="w-5 h-5 mx-auto mb-1" aria-hidden="true" />
                    <div className="text-[10px] font-medium text-[var(--text-muted)]">{badge.label}</div>
                  </div>
                ))}
              </div>

              {/* Mobile benefits (hidden on desktop) */}
              <div className="lg:hidden mt-8 grid grid-cols-2 gap-3">
                {benefits.map((b, i) => (
                  <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3">
                    <b.icon className="w-5 h-5" aria-hidden="true" />
                    <h4 className="text-xs font-semibold text-[var(--text)] mt-1.5">{b.title}</h4>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* One blade, two lit seams. Decorative throughout: the headline it
                slices is already on the page underneath it, and the swap it
                covers is announced by the pressed state on the tabs — which
                has moved before the blade even arrives.

                The mirror repeats the stage's grid at the stage's own width,
                so the copy of the panel inside the blade lands on the same
                columns as the real one without a single measured offset. */}
            <span className="ab-clip" key="ab-clip" aria-hidden="true">
              <span className="ab-blade">
                <span className="ab-edge ab-edge--left" />
                <span className="ab-edge ab-edge--right" />
                <span className="ab-blade-inner">
                  <div className="ab-mirror grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
                    <div className={`hidden lg:block ${brandCol}`}>
                      <div className="p-8">{intro}</div>
                    </div>
                  </div>
                </span>
              </span>
            </span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LoginRegisterPage;
