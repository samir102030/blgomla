import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useUserStore } from "../stores/user.store";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const resetPassword = useUserStore((s) => s.resetPassword);
  const loading = useUserStore((s) => s.loading);

  useEffect(() => {
    if (!token) {
      setError(t("Invalid reset token"));
    }
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError(t("Password is required"));
      return;
    }

    if (password.length < 6) {
      setError(t("Password must be at least 6 characters long"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("Passwords do not match"));
      return;
    }

    if (!token) {
      setError(t("Invalid reset token"));
      return;
    }

    try {
      const success = await resetPassword(token, password);
      if (success) {
        setIsSuccess(true);
        toast.success(t("Password reset successfully!"));
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError(t("Failed to reset password. Please try again."));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || t("An error occurred"));
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Header />
        <main className="py-16">
          <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-[var(--surface)] p-8 rounded-lg shadow-sm text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[var(--text)] mb-4">
                {t("Invalid Reset Link")}
              </h2>
              <p className="text-[var(--text-muted)] mb-6">
                {t("The password reset link is invalid or has expired.")}
              </p>
              <Link
                to="/forgot-password"
                className="inline-block bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                {t("Request New Reset Link")}
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />

      {/* Hero Section */}
      <div className="relative bg-[var(--surface-2)] py-16">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=400&fit=crop"
            alt={t("Reset Password")}
            className="w-full h-full object-cover opacity-20"
           loading="lazy" decoding="async"/>
        </div>
        <div className="relative shell">
          <h1 className="text-4xl font-bold text-[var(--text)] mb-4">
            {t("Reset Password")}
          </h1>
          <nav className="text-sm text-[var(--text-muted)]">
            <Link to="/" className="hover:text-gray-900">
              {t("Home")}
            </Link>
            <span className="mx-2">/</span>
            <span>{t("Reset Password")}</span>
          </nav>
        </div>
      </div>

      <main className="py-16">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[var(--surface)] p-8 rounded-lg shadow-sm">
            {!isSuccess ? (
              <>
                <h2 className="text-2xl font-bold text-[var(--text)] mb-4">
                  {t("Set New Password")}
                </h2>
                <p className="text-[var(--text-muted)] mb-6">
                  {t("Enter your new password below.")}
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-[var(--text-muted)] mb-2"
                    >
                      {t("New Password")}
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t("Enter new password")}
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-[var(--text-muted)] mb-2"
                    >
                      {t("Confirm New Password")}
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t("Confirm new password")}
                      required
                      minLength={6}
                    />
                  </div>

                  {error && <div className="text-red-600 text-sm">{error}</div>}

                  <button
                    type="submit"
                    className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
                    disabled={loading}
                  >
                    {loading ? t("Resetting...") : t("Reset Password")}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    to="/login"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {t("Back to Login")}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <svg
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-[var(--text)] mb-4">
                    {t("Password Reset Successful!")}
                  </h2>
                  <p className="text-[var(--text-muted)] mb-6">
                    {t(
                      "Your password has been successfully reset. You will be redirected to the login page shortly."
                    )}
                  </p>

                  <Link
                    to="/login"
                    className="inline-block bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                  >
                    {t("Go to Login")}
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ResetPasswordPage;
