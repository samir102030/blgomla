import React from 'react';
import { Link } from 'react-router-dom';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useTranslation } from "react-i18next";

const VendorRegistrationSuccess: React.FC = () => {
  const { t } = useTranslation();
  const refNumber = `VR-${Date.now().toString().slice(-6)}`;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6">
          {/* Success Icon */}
          <div className="text-center">
            <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 animate-[bounce_1s_ease-in-out]">
              <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-[var(--text)]">
              {t("vendorRegistration.success.title", "Application Submitted!")}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {t("vendorRegistration.success.subtitle", "Thank you for your interest in becoming a vendor on Belgomla")}
            </p>
          </div>
          
          {/* Timeline Card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] shadow-sm rounded-2xl p-6">
            <div className="space-y-5">
              {[
                {
                  num: 1,
                  title: t("vendorRegistration.success.step1Title", "Application Review"),
                  desc: t("vendorRegistration.success.step1Desc", "Our team will review your application and documents within 2-3 business days."),
                },
                {
                  num: 2,
                  title: t("vendorRegistration.success.step2Title", "Verification Process"),
                  desc: t("vendorRegistration.success.step2Desc", "We may contact you for additional information or document verification."),
                },
                {
                  num: 3,
                  title: t("vendorRegistration.success.step3Title", "Account Activation"),
                  desc: t("vendorRegistration.success.step3Desc", "Once approved, you'll receive an email with your vendor account details."),
                },
              ].map((step) => (
                <div key={step.num} className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{step.num}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text)]">{step.title}</h3>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Important Info */}
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 rounded-xl p-4">
            <div className="flex gap-3">
              <div className="shrink-0 text-amber-500">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  {t("vendorRegistration.success.importantTitle", "Important Information")}
                </h3>
                <ul className="mt-1.5 text-xs text-amber-700 dark:text-amber-300/90 space-y-1 list-disc list-inside">
                  <li>{t("vendorRegistration.success.tip1", "Keep your contact information updated")}</li>
                  <li>{t("vendorRegistration.success.tip2", "Check your email regularly for updates")}</li>
                  <li>{t("vendorRegistration.success.tip3", "Ensure all uploaded documents are clear and valid")}</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="text-center space-y-4">
            <p className="text-sm text-[var(--text-muted)]">
              {t("vendorRegistration.success.questionsPrompt", "Have questions about your application?")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/contact"
                className="inline-flex justify-center items-center px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-all"
              >
                {t("vendorRegistration.success.contactSupport", "Contact Support")}
              </Link>
              <Link
                to="/"
                className="inline-flex justify-center items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] hover:shadow-lg hover:shadow-[var(--brand-primary)]/20 transition-all"
              >
                {t("vendorRegistration.success.backToHome", "Back to Home")}
              </Link>
            </div>
          </div>
          
          {/* Reference */}
          <div className="text-center py-2 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
            <p className="text-xs text-[var(--text-subtle)]">
              {t("vendorRegistration.success.referenceLabel", "Application Reference")}
            </p>
            <p className="text-sm font-mono font-bold text-[var(--text)]">{refNumber}</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default VendorRegistrationSuccess;
