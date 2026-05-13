import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Logo, { BRAND } from "./Logo";

const Footer: React.FC = () => {
  const { t, i18n } = useTranslation();

  const footerLinks = {
    shop: [
      { label: t("All Products"), path: "/products" },
      { label: t("Collections"), path: "/collections" },
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
    <footer className="bg-[#0B0B10] text-white relative overflow-hidden">
      {/* Top gradient line */}
      <div className="h-1 w-full bg-gradient-to-r from-[var(--brand-primary)] via-[var(--brand-accent)] to-[var(--brand-secondary)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2.5 mb-4" aria-label={t("brand.homeLabel", "Belgomla home")}>
              <Logo size={32} color={BRAND.orange} />
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
            <p className="text-sm text-white/70 leading-relaxed mb-5">
              {t("Your trusted partner for IT equipment, cameras, and networking solutions. Wholesale and retail.")}
            </p>
            <div className="flex gap-2.5">
              {["f", "𝕏", "in", "📧"].map((icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-[var(--brand-primary)] hover:border-transparent transition-all duration-300 text-xs font-medium"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-white/80">
              {t("Shop")}
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.shop.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-white/60 hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-white/80">
              {t("Support")}
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.support.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-white/60 hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 text-white/80">
              {t("Get In Touch")}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <span className="text-white/50 mt-0.5">📍</span>
                <span className="text-white/70">6 October, Cairo, Egypt</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-white/50">📞</span>
                <span className="text-white/70">(+20) 1009353639</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-white/50">✉️</span>
                <span className="text-white/70 break-all">info@belgomla.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Belgomla Tech. {t("All rights reserved.")}
          </p>
          <div className="flex gap-3">
            {["VISA", "MC"].map((method) => (
              <div
                key={method}
                className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-white/40 tracking-wider"
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
