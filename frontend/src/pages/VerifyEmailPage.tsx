import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useUserStore } from "../stores/user.store";

const RESEND_COOLDOWN_S = 30;

const VerifyEmailPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = (searchParams.get("email") || "").trim();

  const verifyEmail = useUserStore((s) => s.verifyEmail);
  const resendVerificationCode = useUserStore((s) => s.resendVerificationCode);

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<number | null>(null);

  // Tick the resend cooldown.
  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldownTimer.current) window.clearInterval(cooldownTimer.current);
      cooldownTimer.current = null;
      return;
    }
    cooldownTimer.current = window.setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => {
      if (cooldownTimer.current) window.clearInterval(cooldownTimer.current);
    };
  }, [cooldown]);

  const startCooldown = () => setCooldown(RESEND_COOLDOWN_S);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError(t("verify.emailRequired", "Email is required."));
      return;
    }
    if (!/^[A-Z0-9]{6}$/i.test(code.trim())) {
      setError(t("verify.codeFormat", "Enter the 6-character code from your email."));
      return;
    }
    setLoading(true);
    try {
      const user = await verifyEmail(email.trim().toLowerCase(), code.trim().toUpperCase());
      if (user) {
        toast.success(t("verify.success", "Email verified! Welcome."));
        navigate("/", { replace: true });
      } else {
        setError(useUserStore.getState().error || t("verify.failed", "Verification failed. Check the code and try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    if (!email.trim()) {
      setError(t("verify.emailRequired", "Email is required to resend the code."));
      return;
    }
    setResending(true);
    setError(null);
    const ok = await resendVerificationCode(email.trim().toLowerCase());
    setResending(false);
    if (ok) {
      toast.success(t("verify.resent", "If the email is registered, a new code is on its way."));
      startCooldown();
    } else {
      setError(useUserStore.getState().error || t("verify.resendFailed", "Could not resend the code. Try again in a moment."));
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all";

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />

      <main className="py-10 lg:py-16">
        <div className="max-w-md mx-auto px-4 sm:px-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="mb-6 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[var(--brand-primary)]/10 flex items-center justify-center text-2xl">📧</div>
              <h1 className="text-2xl font-bold text-[var(--text)]">
                {t("verify.title", "Verify your email")}
              </h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {t("verify.subtitle", "Enter the 6-character code we emailed you to activate your account.")}
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">
                  {t("verify.email", "Email")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">
                  {t("verify.code", "Verification code")}
                </label>
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^A-Z0-9]/gi, "").toUpperCase())}
                  className={inputClass + " tracking-[0.5em] text-center text-xl font-mono"}
                  placeholder="••••••"
                  required
                  autoFocus
                />
                <p className="text-[11px] text-[var(--text-subtle)] mt-1">
                  {t("verify.codeHint", "6 characters, e.g. A3F1B2. Codes expire after 24 hours.")}
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 text-red-700 dark:text-red-300 text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] hover:shadow-lg hover:shadow-[var(--brand-primary)]/20 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <><span className="animate-spin">⟳</span> {t("verify.verifying", "Verifying…")}</> : t("verify.verifyBtn", "Verify & Sign In")}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-[var(--border)] pt-5">
              <p className="text-sm text-[var(--text-muted)] mb-2">
                {t("verify.noCode", "Didn't get the code?")}
              </p>
              <button
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="text-sm font-semibold text-[var(--brand-primary)] hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {cooldown > 0
                  ? t("verify.resendIn", "Resend in {{n}}s", { n: cooldown })
                  : resending
                    ? t("verify.resending", "Sending…")
                    : t("verify.resend", "Resend code")}
              </button>
            </div>

            <div className="mt-4 text-center">
              <Link to="/login" className="text-xs text-[var(--text-subtle)] hover:underline">
                {t("verify.backToLogin", "Back to login")}
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VerifyEmailPage;
