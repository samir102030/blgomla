import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "../components/Header";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";
import SEO from "../components/SEO";

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <section className="mb-8">
    <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-3">
      {title}
    </h2>
    <div className="text-[var(--text-muted)] leading-relaxed space-y-3 text-sm sm:text-base">
      {children}
    </div>
  </section>
);

const PrivacyPolicyPage: React.FC = () => {
  const { t } = useTranslation();
  const lastUpdated = "2026-05-13";

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SEO
        title={t("privacy.title", "Privacy Policy")}
        description={t(
          "privacy.metaDesc",
          "How Belgomla collects, uses, and protects your personal data.",
        )}
      />
      <Header />

      <PageHero
        eyebrow={t("Legal")}
        title={t("privacy.title", "Privacy Policy")}
        subtitle={`${t("privacy.lastUpdated", "Last updated")}: ${lastUpdated}`}
        breadcrumb={[
          { label: t("Home"), to: "/" },
          { label: t("privacy.title", "Privacy Policy") },
        ]}
      />

      <main className="py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-[var(--text-muted)] leading-relaxed mb-8 text-sm sm:text-base">
            {t(
              "privacy.intro",
              "This Privacy Policy explains what personal data Belgomla collects, why we collect it, and the choices you have regarding your information. By using Belgomla you consent to the practices described here.",
            )}
          </p>

          <Section title={t("privacy.s1Title", "1. Information We Collect")}>
            <p>
              {t(
                "privacy.s1Intro",
                "We collect information you provide directly, information generated automatically when you use the service, and information from third parties:",
              )}
            </p>
            <ul className="list-disc ps-5 space-y-1">
              <li>
                {t(
                  "privacy.s1L1",
                  "Account details (name, email, phone, password hash).",
                )}
              </li>
              <li>
                {t(
                  "privacy.s1L2",
                  "Shipping & billing addresses needed to fulfill orders.",
                )}
              </li>
              <li>
                {t(
                  "privacy.s1L3",
                  "Order history, wishlist, cart contents, product reviews.",
                )}
              </li>
              <li>
                {t(
                  "privacy.s1L4",
                  "Vendor application data (commercial registration, tax card, national ID) where applicable.",
                )}
              </li>
              <li>
                {t(
                  "privacy.s1L5",
                  "Device & usage data: IP address, browser, OS, pages viewed, referrer.",
                )}
              </li>
              <li>
                {t(
                  "privacy.s1L6",
                  "Payment metadata returned by our payment partners — never full card numbers or CVVs.",
                )}
              </li>
            </ul>
          </Section>

          <Section title={t("privacy.s2Title", "2. How We Use Your Data")}>
            <ul className="list-disc ps-5 space-y-1">
              <li>{t("privacy.s2L1", "Process and deliver your orders.")}</li>
              <li>
                {t(
                  "privacy.s2L2",
                  "Authenticate your account and prevent fraud.",
                )}
              </li>
              <li>
                {t(
                  "privacy.s2L3",
                  "Send transactional emails (order confirmations, shipping updates, password resets).",
                )}
              </li>
              <li>
                {t(
                  "privacy.s2L4",
                  "Send marketing communications when you've opted in — you can unsubscribe anytime.",
                )}
              </li>
              <li>
                {t(
                  "privacy.s2L5",
                  "Improve the site through anonymized analytics.",
                )}
              </li>
              <li>
                {t(
                  "privacy.s2L6",
                  "Comply with legal obligations and respond to lawful requests.",
                )}
              </li>
            </ul>
          </Section>

          <Section title={t("privacy.s3Title", "3. Sharing With Third Parties")}>
            <p>
              {t(
                "privacy.s3Body",
                "We don't sell your personal data. We share it only with: vendors fulfilling your order (name, address, phone), payment processors (Stripe, Paymob), shipping carriers, our hosting and email providers (Vercel, Cloudinary, MongoDB Atlas, etc.), and authorities when legally required. Each processor is bound by contractual confidentiality obligations.",
              )}
            </p>
          </Section>

          <Section title={t("privacy.s4Title", "4. Cookies & Tracking")}>
            <p>
              {t(
                "privacy.s4Body",
                "We use first-party cookies for authentication and language preference, and limited analytics cookies to understand traffic patterns. You can disable cookies in your browser, but parts of the site (login, cart) won't work without them.",
              )}
            </p>
          </Section>

          <Section title={t("privacy.s5Title", "5. Data Retention")}>
            <p>
              {t(
                "privacy.s5Body",
                "We retain your account data as long as your account is active. Order records are kept for the period required by Egyptian tax and consumer-protection law (currently 5 years). You can request deletion of your account at any time — see your rights below.",
              )}
            </p>
          </Section>

          <Section title={t("privacy.s6Title", "6. Data Security")}>
            <p>
              {t(
                "privacy.s6Body",
                "Connections are encrypted with TLS 1.2+ (SSL). Passwords are stored as one-way hashes (bcrypt). Sensitive vendor documents are stored on access-controlled object storage. While no system is perfectly secure, we work continuously to apply industry best practices.",
              )}
            </p>
          </Section>

          <Section title={t("privacy.s7Title", "7. Your Rights")}>
            <p>
              {t(
                "privacy.s7Intro",
                "You have the right to:",
              )}
            </p>
            <ul className="list-disc ps-5 space-y-1">
              <li>{t("privacy.s7L1", "Access the data we hold about you.")}</li>
              <li>{t("privacy.s7L2", "Request correction of inaccurate data.")}</li>
              <li>{t("privacy.s7L3", "Request deletion (subject to legal retention requirements).")}</li>
              <li>{t("privacy.s7L4", "Withdraw consent for marketing emails.")}</li>
              <li>{t("privacy.s7L5", "Export your data in a machine-readable format.")}</li>
            </ul>
            <p>
              {t(
                "privacy.s7Contact",
                "To exercise any of these rights, email",
              )}{" "}
              <a
                href="mailto:privacy@belgomla.com"
                className="text-[var(--brand-primary)] hover:underline"
              >
                privacy@belgomla.com
              </a>
              .
            </p>
          </Section>

          <Section title={t("privacy.s8Title", "8. Children's Privacy")}>
            <p>
              {t(
                "privacy.s8Body",
                "Belgomla is not intended for children under 18. We do not knowingly collect data from minors. If you believe a child has provided us data, contact us and we'll delete it.",
              )}
            </p>
          </Section>

          <Section title={t("privacy.s9Title", "9. Changes to This Policy")}>
            <p>
              {t(
                "privacy.s9Body",
                "We may update this policy as our services evolve or as required by law. Material changes will be announced via email or a notice on the site at least 14 days before they take effect.",
              )}
            </p>
          </Section>

          <Section title={t("privacy.s10Title", "10. Contact")}>
            <p>
              {t(
                "privacy.s10Body",
                "Questions, concerns, or requests? Reach us at",
              )}{" "}
              <a
                href="mailto:privacy@belgomla.com"
                className="text-[var(--brand-primary)] hover:underline"
              >
                privacy@belgomla.com
              </a>{" "}
              {t("terms.orVia", "or via the")}{" "}
              <Link
                to="/contact"
                className="text-[var(--brand-primary)] hover:underline"
              >
                {t("Contact", "Contact")}
              </Link>{" "}
              {t("terms.page", "page")}.
            </p>
          </Section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
