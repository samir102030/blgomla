import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "../components/Header";
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

const TermsPage: React.FC = () => {
  const { t } = useTranslation();
  const lastUpdated = "2026-05-13";

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SEO
        title={t("terms.title", "Terms & Conditions")}
        description={t(
          "terms.metaDesc",
          "The terms governing your use of Belgomla — Egypt's IT & networking marketplace.",
        )}
      />
      <Header />

      <div className="relative bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">
            {t("terms.title", "Terms & Conditions")}
          </h1>
          <p className="text-white/80 text-sm">
            {t("terms.lastUpdated", "Last updated")}: {lastUpdated}
          </p>
        </div>
      </div>

      <main className="py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-[var(--text-muted)] leading-relaxed mb-8 text-sm sm:text-base">
            {t(
              "terms.intro",
              "These Terms & Conditions govern your access to and use of the Belgomla marketplace and services. By creating an account, browsing the site, or placing an order, you agree to be bound by these terms.",
            )}
          </p>

          <Section title={t("terms.s1Title", "1. Eligibility")}>
            <p>
              {t(
                "terms.s1Body",
                "You must be at least 18 years old and capable of forming a legally binding contract to use Belgomla. Vendors registering a business account warrant that they hold the legal authority to act on behalf of the business.",
              )}
            </p>
          </Section>

          <Section title={t("terms.s2Title", "2. Accounts & Security")}>
            <p>
              {t(
                "terms.s2Body",
                "You are responsible for keeping your login credentials confidential and for all activity that occurs under your account. Notify us immediately at info@belgomla.com if you suspect unauthorized use.",
              )}
            </p>
          </Section>

          <Section title={t("terms.s3Title", "3. Orders & Pricing")}>
            <p>
              {t(
                "terms.s3Body",
                "All prices are listed in Egyptian Pounds (EGP) and are inclusive of applicable taxes unless stated otherwise. We reserve the right to correct pricing errors, decline or cancel orders for any product whose price was incorrectly displayed, including after an order has been confirmed.",
              )}
            </p>
          </Section>

          <Section title={t("terms.s4Title", "4. Payment")}>
            <p>
              {t(
                "terms.s4Body",
                "We accept Cash on Delivery, Stripe, and Paymob. Card payments are processed by our payment partners under PCI-DSS standards; we do not store full card details on our servers.",
              )}
            </p>
          </Section>

          <Section title={t("terms.s5Title", "5. Shipping & Delivery")}>
            <p>
              {t(
                "terms.s5Body",
                "Standard delivery across Egypt takes 2–5 business days. Free shipping applies to orders over 5,000 EGP. Risk of loss transfers to you on delivery to the address you provided.",
              )}
            </p>
          </Section>

          <Section title={t("terms.s6Title", "6. Returns & Refunds")}>
            <p>
              {t(
                "terms.s6Body",
                "You may return eligible items within 3 days of delivery in original packaging and unused condition. Refunds are issued to the original payment method within 7–14 business days after we receive and inspect the returned item.",
              )}
            </p>
          </Section>

          <Section title={t("terms.s7Title", "7. Vendor Responsibilities")}>
            <p>
              {t(
                "terms.s7Body",
                "Vendors are solely responsible for the accuracy of product listings, regulatory compliance for their products, fulfillment, and customer support relating to their own orders. Belgomla acts as a marketplace and is not a party to vendor-customer transactions beyond facilitating them.",
              )}
            </p>
          </Section>

          <Section title={t("terms.s8Title", "8. Intellectual Property")}>
            <p>
              {t(
                "terms.s8Body",
                "All content on Belgomla — logos, text, graphics, photos — is the property of Belgomla Tech or its licensors and is protected by applicable copyright and trademark laws. You may not reproduce, modify, or distribute any content without prior written consent.",
              )}
            </p>
          </Section>

          <Section title={t("terms.s9Title", "9. Limitation of Liability")}>
            <p>
              {t(
                "terms.s9Body",
                "To the maximum extent permitted by Egyptian law, Belgomla is not liable for indirect, incidental, or consequential damages arising from your use of the service. Our total liability for any claim relating to an order is limited to the amount you paid for that order.",
              )}
            </p>
          </Section>

          <Section title={t("terms.s10Title", "10. Governing Law")}>
            <p>
              {t(
                "terms.s10Body",
                "These terms are governed by and interpreted in accordance with the laws of the Arab Republic of Egypt. Disputes are subject to the exclusive jurisdiction of the competent courts of Cairo.",
              )}
            </p>
          </Section>

          <Section title={t("terms.s11Title", "11. Changes to These Terms")}>
            <p>
              {t(
                "terms.s11Body",
                "We may update these terms from time to time. Significant changes will be communicated by email or a banner notice on the site. Continued use of Belgomla after changes take effect constitutes acceptance of the revised terms.",
              )}
            </p>
          </Section>

          <Section title={t("terms.s12Title", "12. Contact")}>
            <p>
              {t(
                "terms.s12Body",
                "Questions about these terms? Reach us at",
              )}{" "}
              <a
                href="mailto:info@belgomla.com"
                className="text-[var(--brand-primary)] hover:underline"
              >
                info@belgomla.com
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

export default TermsPage;
