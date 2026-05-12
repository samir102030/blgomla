import React, { useState } from "react";
import { useUserStore } from "../stores/user.store";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

const AccountPassword: React.FC = () => {
  const { t } = useTranslation();
  const changePassword = useUserStore((state) => state.changePassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) { setError(t("account.passwordsMismatch", "New passwords do not match!")); return; }
    if (newPassword.length < 6) { setError(t("account.passwordTooShort", "New password must be at least 6 characters long!")); return; }
    setLoading(true);
    try {
      const success = await changePassword(currentPassword, newPassword);
      if (success) {
        toast.success(t("account.passwordChanged", "Password changed successfully!"));
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      } else { setError(t("account.passwordChangeFailed", "Failed to change password. Please try again.")); }
    } catch (error: any) { setError(error?.response?.data?.message || t("account.passwordChangeError", "An error occurred while changing password")); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all";

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--text)]">{t("account.changePassword", "Change Password")}</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">{t("account.passwordSubtitle", "Update your password to keep your account secure.")}</p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <span className="text-xl shrink-0">🔐</span>
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">{t("account.passwordTip", "Security Tip")}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400/70">{t("account.passwordTipDesc", "Use a strong password with at least 8 characters, including uppercase, lowercase, numbers, and symbols.")}</p>
        </div>
      </div>

      <form onSubmit={handlePasswordChange} className="space-y-5 max-w-md">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 text-red-700 dark:text-red-300 text-sm">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">{t("account.currentPassword", "Current Password")}</label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} required disabled={loading} placeholder="••••••••" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">{t("account.newPassword", "New Password")}</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} required disabled={loading} placeholder="••••••••" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">{t("account.confirmNewPassword", "Confirm New Password")}</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} required disabled={loading} placeholder="••••••••" />
        </div>
        <button type="submit" disabled={loading} className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] hover:shadow-lg hover:shadow-[var(--brand-primary)]/20 transition-all disabled:opacity-50">
          {loading ? t("account.changingPassword", "Changing Password...") : t("account.changePasswordBtn", "Change Password")}
        </button>
      </form>
    </div>
  );
};

export default AccountPassword;
