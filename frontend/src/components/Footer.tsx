import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Logo, { BRAND } from "./Logo";

/* Inline brand marks — 20px, currentColor, so they inherit the link's hover
   state. Beats the "f" / "in" text placeholders that were standing in for
   icons before. */
const SOCIALS = [
  {
    label: "Facebook",
    href: "#",
    path: "M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94z",
  },
  {
    label: "X",
    href: "#",
    path: "M17.53 3h3.07l-6.7 7.66L21.75 21h-5.98l-4.7-6.14L5.7 21H2.63l7.17-8.19L2.25 3h6.13l4.25 5.62L17.53 3zm-1.08 16.2h1.7L7.62 4.72H5.8l10.65 14.48z",
  },
  {
    label: "LinkedIn",
    href: "#",
    path: "M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3V9zm7 0h3.8v1.71h.05c.53-.95 1.83-1.96 3.77-1.96 4.03 0 4.78 2.5 4.78 5.76V21h-4v-5.6c0-1.34-.03-3.07-1.94-3.07-1.94 0-2.24 1.46-2.24 2.97V21h-4V9z",
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/201125210210",
    path: "M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 4.99L2 22l5.19-1.36a9.9 9.9 0 004.85 1.24h.01c5.5 0 9.96-4.46 9.96-9.96 0-2.66-1.04-5.16-2.92-7.04A9.9 9.9 0 0012.04 2zm0 18.13c-1.5 0-2.97-.4-4.25-1.16l-.3-.18-3.08.81.82-3-.2-.31a8.24 8.24 0 01-1.26-4.38c0-4.57 3.72-8.28 8.28-8.28 2.21 0 4.29.86 5.85 2.43a8.22 8.22 0 012.42 5.86c0 4.57-3.72 8.28-8.28 8.28zm4.54-6.2c-.25-.13-1.47-.72-1.7-.8-.23-.09-.39-.13-.56.12s-.64.8-.79.97c-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.44.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.22.25-.86.85-.86 2.07s.89 2.4 1.01 2.560c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29z",
  },
];

const Footer: React.FC = () => {
  const { t, i18n } = useTranslation();

  const footerLinks = {
    shop: [
      { label: t("All Products"), path: "/products" },
      { label: t("Collections"), path: "/collections" },
      { label: t("Installations"), path: "/installations" },
      { label: t("Become a Vendor"), path: "/vendor-registration" },
    ],
    support: [
      { label: t("Contact"), path: "/contact" },
      { label: t("Terms & Conditions"), path: "/terms" },
      { label: t("Privacy Policy"), path: "/privacy" },
    ],
    account: [
      { label: t("My Account"), path: "/account" },
      { label: t("Cart"), path: "/cart" },
      { label: t("Wishlist"), path: "/wishlist" },
      { label: t("Checkout"), path: "/checkout" },
    ],
  };

  return (
    <footer className="relative bg-[#0B0B10] text-white overflow-hidden">
      {/* Brand rule along the top edge */}
      <div className="h-1 w-full bg-gradient-to-r from-[var(--brand-secondary)] via-[var(--brand-primary)] to-[var(--brand-accent)]" />

      {/* Ambient brand light, same treatment as the hero so the page opens and
          closes on the same note. */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 ltr:left-[8%] rtl:right-[8%] w-96 h-96 rounded-full bg-[#00A8E8] opacity-[0.09] blur-[120px]" />
        <div className="absolute -bottom-40 ltr:right-[6%] rtl:left-[6%] w-80 h-80 rounded-full bg-[#0077B6] opacity-[0.07] blur-[110px]" />
      </div>

      <div className="relative shell py-12 sm:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-8 sm:gap-10">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-3">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-4" aria-label={t("brand.homeLabel", "Belgomla home")}>
              <Logo size={34} color={BRAND.accent} />
              <span
                className={`text-2xl font-semibold text-white ${
                  i18n.language === "ar" ? "" : "lowercase"
                }`}
                style={
                  i18n.language === "ar"
                    ? { lineHeight: 1 }
                    : { letterSpacing: "-0.045em", lineHeight: 0.9 }
                }
              >
                {t("brand.wordmark", "belgomla")}
              </span>
            </Link>
            <p className="text-sm text-white/60 leading-relaxed max-w-sm">
              {t("Your trusted partner for IT equipment, cameras, and networking solutions. Wholesale and retail.")}
            </p>
            {/*
              Only the accounts that exist.

              Facebook, X and LinkedIn were sitting here on href="#", so three
              of the four icons were buttons that took a visitor nowhere — the
              most convincing kind of broken, because the row looks complete.
              Filtering on the href keeps the slots in the list above ready for
              a real URL and shows nothing until there is one.
            */}
            <div className="flex gap-2.5 mt-6">
              {SOCIALS.filter((social) => social.href.startsWith("http")).map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  target={social.href.startsWith("http") ? "_blank" : undefined}
                  rel={social.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-[var(--brand-primary)] hover:border-transparent hover:-translate-y-0.5 transition-all duration-300"
                >
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] mb-4 text-white/50">
              {t("Shop")}
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.shop.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-white/70 hover:text-[var(--brand-secondary)] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] mb-4 text-white/50">
              {t("Support")}
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.support.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-white/70 hover:text-[var(--brand-secondary)] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] mb-4 text-white/50">
              {t("Account")}
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.account.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-white/70 hover:text-[var(--brand-secondary)] transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact — phone and mail are actionable links, not plain text. */}
          <div className="col-span-2 lg:col-span-3">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] mb-4 text-white/50">
              {t("Get In Touch")}
            </h3>
            <ul className="space-y-3.5 text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 w-8 h-8 shrink-0 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--brand-primary)]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <span className="text-white/70 pt-1.5">6 October, Cairo, Egypt</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 w-8 h-8 shrink-0 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--brand-primary)]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </span>
                <a href="tel:+201125210210" dir="ltr" className="text-white/70 hover:text-white transition-colors pt-1.5">
                  (+20) 112 521 0210
                </a>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 w-8 h-8 shrink-0 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--brand-primary)]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <a href="mailto:info@belgomla.com" className="text-white/70 hover:text-white transition-colors break-all pt-1.5">
                  info@belgomla.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Belgomla Tech. {t("All rights reserved.")}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-white/30 me-1">
              {t("We accept")}
            </span>
            {["VISA", "MASTERCARD", "COD", "INSTALLMENTS"].map((method) => (
              <div
                key={method}
                className="px-2.5 py-1.5 rounded-md bg-white/[0.06] border border-white/10 text-[10px] font-bold text-white/50 tracking-wider"
              >
                {method}
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
