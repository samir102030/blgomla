import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useUserStore } from "../stores/user.store";
import { useNavigate } from "react-router-dom";

const AccountPrivacy: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useUserStore((s) => s.logout);

  const [downloading, setDownloading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await axiosInstance.get("/users/me/data-export", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-belgomla-data.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("Data exported successfully"));
    } catch {
      toast.error(t("Failed to export data"));
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePassword) {
      toast.error(t("Please enter your password"));
      return;
    }
    setDeleting(true);
    try {
      await axiosInstance.delete("/users/me/account", {
        data: { password: deletePassword },
      });
      toast.success(t("Account deleted"));
      logout();
      navigate("/");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || t("Failed to delete account"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--text)]">{t("Privacy & Data")}</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {t("Manage your personal data and account.")}
        </p>
      </div>

      {/* Data export */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="font-semibold text-[var(--text)] mb-1">{t("Download my data")}</h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          {t("Get a copy of all personal data we hold about you — profile, orders, addresses, and notifications — as a JSON file.")}
        </p>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-medium hover:bg-[var(--brand-primary-hover)] disabled:opacity-60 transition"
        >
          {downloading ? t("Preparing…") : t("Download my data")}
        </button>
      </div>

      {/* Account deletion */}
      <div className="bg-[var(--surface)] border border-red-200 rounded-xl p-6">
        <h3 className="font-semibold text-red-600 mb-1">{t("Delete my account")}</h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          {t("Permanently delete your account. Your profile will be anonymised and you will be logged out. This cannot be undone.")}
        </p>

        {!showDeleteDialog ? (
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition"
          >
            {t("Delete my account")}
          </button>
        ) : (
          <div className="space-y-3 max-w-sm">
            <p className="text-sm font-medium text-[var(--text)]">
              {t("Enter your password to confirm:")}
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder={t("Your password")}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting || !deletePassword}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition"
              >
                {deleting ? t("Deleting…") : t("Confirm delete")}
              </button>
              <button
                onClick={() => { setShowDeleteDialog(false); setDeletePassword(""); }}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] text-sm hover:bg-[var(--surface-2)] transition"
              >
                {t("Cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountPrivacy;
