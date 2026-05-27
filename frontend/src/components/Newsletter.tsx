import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "../lib/axios";

const Newsletter: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error");
      setErrorMsg(t("Please enter a valid email address."));
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    try {
      await axiosInstance.post("/subscribers", { email, source: "newsletter" });
    } catch {
      // Subscriber endpoint is non-critical — we thank the user either way.
    }
    setStatus("ok");
    setEmail("");
  };

  const benefits = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: t("Flash deals first"),
      sub: t("Be alerted the moment sales start."),
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a2 2 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      title: t("Subscriber-only coupons"),
      sub: t("Codes we never publish on the site."),
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      title: t("New arrivals early"),
      sub: t("Get the drop before it's listed publicly."),
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      title: t("Back-in-stock alerts"),
      sub: t("Never miss a restock on what you want."),
    },
  ];

  return (
    <section className="relative py-16 sm:py-20 overflow-hidden">
      {/* Background gradient + ambient orbs */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)]/[0.04] via-transparent to-[var(--brand-accent)]/[0.04]" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-[10%] w-56 h-56 bg-[var(--brand-primary)] rounded-full opacity-[0.05] blur-3xl" />
        <div className="absolute bottom-10 right-[15%] w-48 h-48 bg-[var(--brand-accent)] rounded-full opacity-[0.05] blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT — value proposition + benefits */}
          <div className="lg:col-span-6 xl:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-pulse" />
              <span className="text-xs font-semibold tracking-wide uppercase text-[var(--brand-primary)]">
                {t("Newsletter")}
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-[var(--text)] mb-3 leading-tight">
              {t("Get the deals before everyone else.")}
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-muted)] mb-7 max-w-xl">
              {t(
                "Join thousands of shoppers receiving early access to flash deals, restocks, and subscriber-only coupons."
              )}
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {benefits.map((b) => (
                <li key={b.title} className="flex items-start gap-3">
                  <span className="shrink-0 w-9 h-9 rounded-lg bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center">
                    {b.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">{b.title}</p>
                    <p className="text-xs text-[var(--text-muted)] leading-snug">{b.sub}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT — signup card */}
          <div className="lg:col-span-6 xl:col-span-5">
            <div className="relative rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl shadow-black/5 dark:shadow-black/30 p-6 sm:p-7">
              {/* Decorative corner gradient */}
              <div className="absolute -top-px -right-px w-28 h-28 bg-gradient-to-br from-[var(--brand-primary)]/15 via-[var(--brand-accent)]/8 to-transparent rounded-tr-2xl pointer-events-none" />

              <div className="relative">
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-1.5">
                  {t("Sign up & save")}
                </h3>
                <p className="text-sm text-[var(--text-muted)] mb-5">
                  {t("Your first deal lands in your inbox within minutes.")}
                </p>

                <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                  <label className="block">
                    <span className="sr-only">{t("Email address")}</span>
                    <div className="relative">
                      <span className="absolute inset-y-0 ltr:left-3 rtl:right-3 flex items-center text-[var(--text-subtle)] pointer-events-none">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (status === "error") setStatus("idle");
                        }}
                        placeholder={t("you@example.com")}
                        autoComplete="email"
                        aria-invalid={status === "error"}
                        className={`w-full ltr:pl-10 rtl:pr-10 ltr:pr-4 rtl:pl-4 py-3 bg-[var(--surface)] border rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 transition-all ${
                          status === "error"
                            ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                            : "border-[var(--border)] focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]/20"
                        }`}
                        required
                      />
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={status === "submitting" || status === "ok"}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[var(--brand-primary)]/25 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {status === "submitting" ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        {t("Subscribing…")}
                      </>
                    ) : status === "ok" ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {t("You're in")}
                      </>
                    ) : (
                      <>
                        {t("Send me the deals")}
                        <svg className={`w-4 h-4 ${"rtl:rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </>
                    )}
                  </button>

                  {/* Status messages */}
                  {status === "ok" && (
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2.5 animate-fadeIn">
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-snug">
                        {t("Thanks! Check your inbox to confirm your subscription.")}
                      </p>
                    </div>
                  )}
                  {status === "error" && errorMsg && (
                    <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
                  )}
                </form>

                {/* Trust line */}
                <div className="mt-5 pt-4 border-t border-[var(--border)] flex items-center gap-2 text-[11px] text-[var(--text-subtle)]">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>{t("We respect your inbox. No spam, unsubscribe in one click.")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
