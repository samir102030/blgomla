import React, { useState } from "react";
import { useTranslation } from "react-i18next";

const Newsletter: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      console.log("Newsletter subscription:", email);
      setIsSubmitted(true);
      setEmail("");
      setTimeout(() => setIsSubmitted(false), 3000);
    }
  };

  return (
    <section className="relative py-14 sm:py-20 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)]/6 via-transparent to-[var(--brand-accent)]/4" />

      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-[10%] w-48 h-48 bg-[var(--brand-primary)] rounded-full opacity-[0.04] blur-3xl" />
        <div className="absolute bottom-10 right-[15%] w-40 h-40 bg-[var(--brand-accent)] rounded-full opacity-[0.04] blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[var(--brand-primary)]/10 flex items-center justify-center">
            <span className="text-2xl">📬</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text)] mb-3">
            {t("Stay in the Loop")}
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-muted)] mb-8 max-w-md mx-auto">
            {t("Get the latest tech deals, new arrivals, and exclusive offers delivered to your inbox.")}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("Enter your email")}
                className="flex-1 px-5 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[var(--brand-primary)]/20 active:scale-[0.98] transition-all"
              >
                {t("Subscribe")}
              </button>
            </div>

            {isSubmitted && (
              <div className="mt-4 p-3 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-xl animate-fadeIn">
                <p className="text-[var(--success)] text-sm font-medium">
                  ✅ {t("Thank you for subscribing to our newsletter!")}
                </p>
              </div>
            )}
          </form>

          <p className="text-xs text-[var(--text-subtle)] mt-4">
            {t("No spam. Unsubscribe anytime.")}
          </p>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
