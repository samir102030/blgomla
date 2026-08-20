import React, { useState } from "react";
import { MapPinIcon, PhoneIcon, EnvelopeIcon, ChatBubbleLeftRightIcon, CheckCircleIcon, ClockIcon } from "@heroicons/react/24/outline";
import PageHero from "./PageHero";
import { useTranslation } from "react-i18next";

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const Contact: React.FC = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<ContactForm>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      console.log("Contact form submitted:", formData);
      setIsSubmitting(false);
      setIsSubmitted(true);

      setTimeout(() => {
        setIsSubmitted(false);
        setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
      }, 4000);
    }, 1200);
  };

  const contactCards = [
    {
      icon: MapPinIcon,
      title: t("Visit Our Store"),
      lines: [t("6 October City, Giza"), t("Cairo, Egypt")],
      accent: "from-blue-500 to-indigo-600",
    },
    {
      icon: PhoneIcon,
      title: t("Call Us"),
      lines: ["+20 100 935 3639", t("Sun - Thu: 9AM - 6PM")],
      accent: "from-emerald-500 to-teal-600",
      href: "tel:+201009353639",
    },
    {
      icon: EnvelopeIcon,
      title: t("Email Us"),
      lines: ["info@belgomla.com", t("We reply within 24 hours")],
      accent: "from-purple-500 to-violet-600",
      href: "mailto:info@belgomla.com",
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: t("WhatsApp"),
      lines: ["+20 100 935 3639", t("Quick response guaranteed")],
      accent: "from-green-500 to-emerald-600",
      href: "https://wa.me/201009353639",
    },
  ];

  const faqs = [
    {
      q: t("What are your business hours?"),
      a: t("We operate Sunday through Thursday, 9:00 AM to 6:00 PM (Cairo time). We're closed on Fridays and Saturdays."),
    },
    {
      q: t("Do you offer wholesale pricing?"),
      a: t("Yes! We offer special bulk pricing for businesses and resellers. Contact our sales team for custom quotes on large orders."),
    },
    {
      q: t("What is your return policy?"),
      a: t("We offer a hassle-free 3-day return policy on all items. Products must be in original packaging and unused condition."),
    },
    {
      q: t("Do you ship across Egypt?"),
      a: t("Yes, we provide free shipping on all orders over 5,000 EGP. Standard delivery takes 2-5 business days depending on location."),
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* ═══ Hero Section ═══ */}
      {/* Purple-and-cyan gradient before this; the cards below overlap it, so
          the hero keeps a little extra bottom padding to sit under them. */}
      <PageHero
        eyebrow={t("We're here to help")}
        title={t("Get In Touch")}
        subtitle={t("Have questions about our products, wholesale pricing, or need technical support? Our team is ready to assist you.")}
        breadcrumb={[{ label: t("Home"), to: "/" }, { label: t("Contact") }]}
        className="pb-10"
      />

      {/* ═══ Contact Cards ═══ */}
      <section className="shell -mt-12 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {contactCards.map((card, i) => (
            <a
              key={i}
              href={card.href || "#"}
              target={card.href?.startsWith("http") ? "_blank" : undefined}
              rel={card.href?.startsWith("http") ? "noopener noreferrer" : undefined}
              className="group relative bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 sm:p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              {/* Top accent line */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

              <card.icon className="w-7 h-7 mb-3 text-[var(--brand-primary)]" aria-hidden="true" />
              <h3 className="text-sm font-bold text-[var(--text)] mb-2 uppercase tracking-wide">
                {card.title}
              </h3>
              {card.lines.map((line, j) => (
                <p
                  key={j}
                  // A phone number or an address written in Latin script inside
                  // an RTL paragraph gets reordered by the bidi algorithm:
                  // "+20 100 935 3639" was reading "3639 935 100 20+". Marking
                  // the run as LTR keeps it in dialling order.
                  dir={/^[+\d(]|@/.test(line.trim()) ? "ltr" : undefined}
                  className={`text-sm ${j === 0 ? "text-[var(--text)] font-medium" : "text-[var(--text-muted)]"} ${
                    /^[+\d(]|@/.test(line.trim()) ? "text-start" : ""
                  }`}
                >
                  {line}
                </p>
              ))}
            </a>
          ))}
        </div>
      </section>

      {/* ═══ Form + Map Section ═══ */}
      <section className="shell py-14 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-2">
                {t("Send Us a Message")}
              </h2>
              <p className="text-sm text-[var(--text-muted)] mb-8">
                {t("Fill out the form below and we'll get back to you as soon as possible.")}
              </p>

              {isSubmitted && (
                <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl flex items-center gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-500" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      {t("Message sent successfully!")}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500">
                      {t("We'll get back to you within 24 hours.")}
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      {t("Full Name")} *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder={t("John Doe")}
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all duration-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      {t("Email Address")} *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      {t("Phone Number")}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+20 1XX XXX XXXX"
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      {t("Subject")} *
                    </label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all duration-200"
                      required
                    >
                      <option value="">{t("Select a topic...")}</option>
                      <option value="general">{t("General Inquiry")}</option>
                      <option value="wholesale">{t("Wholesale / Bulk Pricing")}</option>
                      <option value="support">{t("Technical Support")}</option>
                      <option value="order">{t("Order Issue")}</option>
                      <option value="returns">{t("Returns & Refunds")}</option>
                      <option value="partnership">{t("Business Partnership")}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                    {t("Message")} *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder={t("Tell us how we can help you...")}
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all duration-200 resize-vertical"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[var(--brand-primary)]/25 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {t("Sending...")}
                    </>
                  ) : (
                    <>
                      {t("Send Message")} <span>→</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar: Map + Hours */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map Card */}
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-[var(--border)]">
                <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wide flex items-center gap-2">
                  {t("Our Location")}
                </h3>
              </div>
              <div className="aspect-[4/3] bg-[var(--bg)]">
                <iframe
                  title="Belgomla Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d55251.37679498104!2d30.89!3d29.97!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14585720cee0f005%3A0x5c3ef1afb2c02ac4!2s6th%20of%20October%20City%2C%20Giza%20Governorate!5e0!3m2!1sen!2seg!4v1700000000000!5m2!1sen!2seg"
                  className="w-full h-full border-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            {/* Business Hours */}
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 sm:p-6">
              <h3 className="text-sm font-bold text-[var(--text)] uppercase tracking-wide flex items-center gap-2 mb-4">
                <ClockIcon className="w-5 h-5 inline-block me-2 align-text-bottom" aria-hidden="true" />{t("Business Hours")}
              </h3>
              <div className="space-y-2.5">
                {[
                  { day: t("Sunday - Thursday"), time: "9:00 AM - 6:00 PM", active: true },
                  { day: t("Friday"), time: t("Closed"), active: false },
                  { day: t("Saturday"), time: t("Closed"), active: false },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className={`font-medium ${row.active ? "text-[var(--text)]" : "text-[var(--text-muted)]"}`}>
                      {row.day}
                    </span>
                    <span className={`${row.active ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-red-400 dark:text-red-500"}`}>
                      {row.time}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)]">
                  ⏱️ {t("Average response time: 2-4 hours during business hours")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ Section ═══ */}
      <section className="bg-[var(--surface)] border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="text-center mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-2">
              {t("Frequently Asked Questions")}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              {t("Quick answers to common questions about our services")}
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group bg-[var(--bg)] rounded-xl border border-[var(--border)] overflow-hidden"
              >
                <summary className="flex items-center justify-between cursor-pointer px-5 sm:px-6 py-4 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface)] transition-colors duration-200 list-none">
                  <span className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs font-bold">
                      {i + 1}
                    </span>
                    {faq.q}
                  </span>
                  <svg className="w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 group-open:rotate-180 shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 sm:px-6 pb-4 text-sm text-[var(--text-muted)] leading-relaxed border-t border-[var(--border)] pt-3 ml-10">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA Strip ═══ */}
      <section className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] py-10 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
            {t("Need Immediate Help?")}
          </h3>
          <p className="text-sm text-white/70 mb-5">
            {t("Chat with us directly on WhatsApp for the fastest response")}
          </p>
          <a
            href="https://wa.me/201009353639"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-white text-[var(--brand-primary)] px-6 py-3 rounded-xl font-semibold text-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            {t("Chat on WhatsApp")}
          </a>
        </div>
      </section>
    </div>
  );
};

export default Contact;
