import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "./Header";
import Footer from "./Footer";
import SEO from "./SEO";

const PleaseLogin: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const redirectTo = `/login?redirect=${encodeURIComponent(location.pathname)}`;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col">
      {/*
        This wall replaces the whole page when a visitor is signed out, so the
        title it carries has to be its own. Tagging the cart and the wishlist
        left them right only once somebody was signed in — signed out they
        returned this instead, which had no title and fell back to the site
        default. It stands in for four pages, so the title describes the wall
        rather than any one of them.
      */}
      <SEO title={t("Sign in required")} description={t("Sign in to your Belgomla account to open this page.")} noindex />
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm p-8 sm:p-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="h-8 w-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 12.75v6.75A2.25 2.25 0 0 0 6.75 21.75Z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {t("Please Login", "Please Login")}
          </h2>
          <p className="text-[var(--text-muted)] mb-6">
            {t(
              "You need to be logged in to access this page.",
              "You need to be logged in to access this page."
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={redirectTo}
              className="inline-flex items-center justify-center bg-[var(--brand-primary)] hover:opacity-90 text-white font-medium px-6 py-3 rounded-lg transition-opacity"
            >
              {t("Login", "Login")}
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--bg)] text-[var(--text)] font-medium px-6 py-3 rounded-lg transition-colors"
            >
              {t("Create Account", "Create Account")}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PleaseLogin;
