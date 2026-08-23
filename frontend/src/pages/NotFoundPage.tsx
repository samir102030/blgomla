import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon, HomeIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SEO from "../components/SEO";

/**
 * What an address that matches nothing gets.
 *
 * Until now it got nothing at all: the router had no catch-all, so `<Routes>`
 * matched no branch and rendered null. A wrong URL produced a white page with
 * no header, no footer, no words and no way back — the sign-in wall's own
 * "Create Account" button led straight to one, because it pointed at /register
 * and no such route exists.
 *
 * A dead end is unavoidable; being stranded at one is not. Header and footer
 * stay, so every route out of the site is still on the page, and the three
 * links below cover what somebody at a broken address usually wanted.
 *
 * `noindex` because a soft 404 that Google can index is worse than a hard one:
 * a static host answers 200 for every path, so without it every mistyped link
 * anyone ever publishes becomes an indexable page of this shop.
 */
const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col">
      <SEO
        title={t("notFound.title", "Page not found")}
        description={t(
          "notFound.description",
          "That address does not exist on Belgomla. Browse the catalogue or search for what you need."
        )}
        noindex
      />
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-lg text-center">
          <p
            className="font-mono text-[clamp(64px,16vw,120px)] leading-none font-bold text-[var(--brand-primary)]/15 select-none"
            aria-hidden="true"
          >
            404
          </p>

          <h1 className="-mt-4 text-2xl sm:text-3xl font-bold text-[var(--text)]">
            {t("notFound.heading", "This page does not exist")}
          </h1>

          <p className="mt-3 text-[var(--text-muted)] leading-relaxed">
            {t(
              "notFound.body",
              "The address may have been mistyped, or the page may have moved. Everything else is still where it was."
            )}
          </p>

          {/* The address itself, because a person reporting this needs to be
              able to say which one it was. */}
          <p className="mt-3 text-xs font-mono text-[var(--text-subtle)] break-all" dir="ltr">
            {location.pathname}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:opacity-90 text-white font-medium px-6 py-3 rounded-xl transition-opacity"
            >
              <HomeIcon className="w-5 h-5" aria-hidden="true" />
              {t("notFound.home", "Go to the home page")}
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--bg)] text-[var(--text)] font-medium px-6 py-3 rounded-xl transition-colors"
            >
              <MagnifyingGlassIcon className="w-5 h-5" aria-hidden="true" />
              {t("notFound.browse", "Browse all products")}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => window.history.back()}
            className="mt-5 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            {t("notFound.back", "Back to the previous page")}
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFoundPage;
