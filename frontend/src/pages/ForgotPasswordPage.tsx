import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useUserStore } from "../stores/user.store";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState("");

  const forgotPassword = useUserStore((s) => s.forgotPassword);
  const loading = useUserStore((s) => s.loading);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError(t("Email is required"));
      return;
    }

    try {
      const success = await forgotPassword(email);
      if (success) {
        setIsSubmitted(true);
        toast.success(t("Password reset link sent to your email!"));
      } else {
        setError(t("Failed to send reset email. Please try again."));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "An error occurred");
    }
  };

  const handleResetPassword = () => {
    if (!token.trim()) {
      toast.error(t("Please enter the reset token"));
      return;
    }
    navigate(`/reset-password/${token}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <div className="relative bg-gray-100 py-16">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=400&fit=crop"
            alt="Password Reset"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t("Forgot Password")}
          </h1>
          <nav className="text-sm text-gray-600">
            <Link to="/" className="hover:text-gray-900">
              {t("Home")}
            </Link>
            <span className="mx-2">/</span>
            <span>{t("Forgot Password")}</span>
          </nav>
        </div>
      </div>

      <main className="py-16">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white p-8 rounded-lg shadow-sm">
            {!isSubmitted ? (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {t("Reset Your Password")}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t(
                    "Enter your email address and we'll send you a link to reset your password."
                  )}
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      {t("Email Address")}
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t("Enter your email")}
                      required
                    />
                  </div>

                  {error && <div className="text-red-600 text-sm">{error}</div>}

                  <button
                    type="submit"
                    className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
                    disabled={loading}
                  >
                    {loading ? t("Sending...") : t("Send Reset Link")}
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {t("Check Your Email")}
                  </h2>
                  <p className="text-gray-600 mb-6">
                    {t("We've sent a password reset link to")}{" "}
                    <span className="font-medium">{email}</span>
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    {t(
                      "If you don't see the email in your inbox, please check your spam folder."
                    )}
                  </p>

                  <div className="space-y-3">
                    <Link
                      to="/login"
                      className="block w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors text-center"
                    >
                      {t("Back to Login")}
                    </Link>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="block w-full text-gray-600 hover:text-gray-800 text-sm"
                    >
                      {t("Didn't receive the email? Try again")}
                    </button>
                    <div className="mt-6">
                      <label
                        htmlFor="token"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        {t("Reset Token")}
                      </label>
                      <input
                        type="text"
                        id="token"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                        placeholder={t("Enter the reset token")}
                      />
                      <button
                        onClick={handleResetPassword}
                        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        {t("Go to Reset Password")}
                      </button>
                    </div>
                  </div>
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

export default ForgotPasswordPage;
