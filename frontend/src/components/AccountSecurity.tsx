import React, { useState } from "react";
import { useUserStore } from "../stores/user.store";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

const AccountSecurity: React.FC = () => {
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const setup2FA = useUserStore((s) => s.setup2FA);
  const enable2FA = useUserStore((s) => s.enable2FA);
  const disable2FA = useUserStore((s) => s.disable2FA);

  const [setupQR, setSetupQR] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [enableCode, setEnableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const enabled = user?.twoFactorEnabled === true;

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all";

  const beginSetup = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await setup2FA();
      if (res?.qrCodeDataUrl) {
        setSetupQR(res.qrCodeDataUrl);
        setSetupSecret(res.secret);
      } else {
        setError(useUserStore.getState().error || t("security.setupFailed", "Failed to start 2FA setup."));
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(enableCode)) {
      setError(t("security.codeFormat", "Enter the 6-digit code from your authenticator app."));
      return;
    }
    setLoading(true);
    try {
      const ok = await enable2FA(enableCode);
      if (ok) {
        toast.success(t("security.enabled", "Two-factor authentication enabled."));
        setSetupQR(null);
        setSetupSecret(null);
        setEnableCode("");
      } else {
        setError(useUserStore.getState().error || t("security.enableFailed", "Could not enable 2FA. Check the code and try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!disablePassword || !/^\d{6}$/.test(disableCode)) {
      setError(t("security.disableInputs", "Enter your current password and the 6-digit code."));
      return;
    }
    setLoading(true);
    try {
      const ok = await disable2FA(disablePassword, disableCode);
      if (ok) {
        toast.success(t("security.disabled", "Two-factor authentication disabled."));
        setDisablePassword("");
        setDisableCode("");
      } else {
        setError(useUserStore.getState().error || t("security.disableFailed", "Could not disable 2FA."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text)]">{t("security.title", "Two-Factor Authentication")}</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {t("security.subtitle", "Add a second login step using a free authenticator app on your phone.")}
        </p>
      </div>

      {/* Status banner */}
      <div className={`rounded-2xl p-4 mb-6 flex items-start gap-3 border ${enabled
        ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/25"
        : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25"}`}>
        <span className="text-xl shrink-0">{enabled ? "🛡️" : "⚠️"}</span>
        <div className="text-sm">
          <div className={`font-semibold ${enabled ? "text-green-800 dark:text-green-200" : "text-amber-800 dark:text-amber-200"}`}>
            {enabled ? t("security.statusOn", "Two-factor authentication is ON.") : t("security.statusOff", "Two-factor authentication is OFF.")}
          </div>
          <div className={enabled ? "text-green-700/80 dark:text-green-200/80" : "text-amber-700/80 dark:text-amber-200/80"}>
            {enabled
              ? t("security.statusOnDesc", "You'll be asked for a code from your authenticator app on every login.")
              : t("security.statusOffDesc", "Turn it on to require a 6-digit code from an authenticator app at login.")}
          </div>
        </div>
      </div>

      {/* OFF state — show enable flow */}
      {!enabled && !setupQR && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <h3 className="font-semibold text-[var(--text)] mb-2">{t("security.howItWorks", "How it works")}</h3>
          <ol className="text-sm text-[var(--text-muted)] space-y-2 mb-5 list-decimal list-inside">
            <li>{t("security.step1", "Install a free authenticator app: Google Authenticator, Microsoft Authenticator, Authy, or 1Password.")}</li>
            <li>{t("security.step2", "Click \"Set up 2FA\" — we'll show you a QR code to scan.")}</li>
            <li>{t("security.step3", "Enter the 6-digit code your app generates to finish the setup.")}</li>
          </ol>
          <button
            onClick={beginSetup}
            disabled={loading}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] text-white font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-60"
          >
            {loading ? t("security.starting", "Starting…") : t("security.setup", "Set up 2FA")}
          </button>
        </div>
      )}

      {/* Mid-setup — QR + first code */}
      {!enabled && setupQR && setupSecret && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-[var(--text)] mb-2">{t("security.scanQR", "Scan this QR code")}</h3>
            <p className="text-sm text-[var(--text-muted)]">
              {t("security.scanDesc", "Open your authenticator app and scan the QR. If you can't scan, enter the secret manually.")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <img src={setupQR} alt="2FA QR Code" className="w-48 h-48 rounded-xl border border-[var(--border)] bg-white p-2" />
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">
                {t("security.manualEntry", "Or enter this secret manually:")}
              </label>
              <code className="block w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] text-[var(--text)] text-xs font-mono break-all border border-[var(--border)]">
                {setupSecret}
              </code>
              <p className="text-[11px] text-[var(--text-subtle)] mt-2">
                {t("security.manualHint", "The secret is shown only once. Most users should scan the QR instead.")}
              </p>
            </div>
          </div>

          <form onSubmit={confirmEnable} className="space-y-3 pt-3 border-t border-[var(--border)]">
            <label className="block text-sm font-medium text-[var(--text-muted)]">
              {t("security.enterFirstCode", "Enter the 6-digit code from your app to finish:")}
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={enableCode}
              onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, ""))}
              className={inputClass + " tracking-widest text-center text-lg"}
              placeholder="••••••"
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={loading || enableCode.length !== 6}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] text-white font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-60">
                {loading ? t("security.enabling", "Enabling…") : t("security.confirm", "Confirm & Enable")}
              </button>
              <button type="button" onClick={() => { setSetupQR(null); setSetupSecret(null); setEnableCode(""); setError(""); }}
                className="px-5 py-3 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)] text-sm font-medium">
                {t("security.cancel", "Cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ON state — show disable flow */}
      {enabled && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <h3 className="font-semibold text-[var(--text)] mb-2">{t("security.turnOff", "Turn off 2FA")}</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            {t("security.turnOffDesc", "We require your current password and a fresh authenticator code to turn 2FA off.")}
          </p>
          <form onSubmit={confirmDisable} className="space-y-3 max-w-md">
            <input
              type="password"
              autoComplete="current-password"
              placeholder={t("security.currentPassword", "Current password")}
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              className={inputClass}
            />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder={t("security.sixDigitCode", "6-digit authenticator code")}
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
              className={inputClass + " tracking-widest"}
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button type="submit" disabled={loading || disableCode.length !== 6 || !disablePassword}
              className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all disabled:opacity-60">
              {loading ? t("security.disabling", "Disabling…") : t("security.disable", "Disable 2FA")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AccountSecurity;
