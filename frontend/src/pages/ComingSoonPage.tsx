import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import Logo from "../components/Logo";
import CountdownTimer from "../components/CountdownTimer";
import { useSiteModeStore, type SiteModePublic } from "../stores/siteMode.store";

const SocialIcon: React.FC<{ href: string; label: string; d: string }> = ({
  href,
  label,
  d,
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition border border-white/15"
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-white"
    >
      <path d={d} />
    </svg>
  </a>
);

interface Props {
  mode?: SiteModePublic;
}

const ComingSoonPage: React.FC<Props> = ({ mode }) => {
  const { t, i18n } = useTranslation();
  const subscribe = useSiteModeStore((s) => s.subscribe);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Block search engines from indexing the splash so the real launch isn't
  // pre-empted by stale snippets. We set <meta name="robots"> dynamically.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    const prevTitle = document.title;
    document.title = (mode?.title as any)?.[i18n.language] || prevTitle;
    return () => {
      document.head.removeChild(meta);
      document.title = prevTitle;
    };
  }, [mode, i18n.language]);

  const lang = (i18n.language === "ar" ? "ar" : "en") as "en" | "ar";
  const title =
    mode?.title?.[lang] || t("comingSoon.title", "Something big is coming.");
  const message =
    mode?.message?.[lang] ||
    t(
      "comingSoon.message",
      "Our new store is almost ready. Leave your email and we'll let you know the moment we launch."
    );

  const launchDate = useMemo(
    () => (mode?.launchAt ? new Date(mode.launchAt) : null),
    [mode?.launchAt]
  );
  const showCountdown =
    launchDate && !Number.isNaN(launchDate.getTime()) && launchDate > new Date();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    const ok = await subscribe(email.trim(), lang);
    setSubmitting(false);
    if (ok) {
      setSubmitted(true);
      setEmail("");
      toast.success(t("comingSoon.thanks", "Thanks! We'll be in touch."));
    } else {
      toast.error(t("comingSoon.error", "Something went wrong. Try again."));
    }
  };

  const toggleLang = () => {
    i18n.changeLanguage(lang === "en" ? "ar" : "en");
  };

  const socials = mode?.socialLinks || {};

  return (
    <div
      className="min-h-screen w-full flex flex-col relative overflow-hidden"
      style={{
        background:
          "radial-gradient(1200px 600px at 20% 0%, rgba(255,106,26,0.35), transparent 60%), radial-gradient(900px 500px at 100% 100%, rgba(232,83,10,0.30), transparent 60%), linear-gradient(135deg, #0B0B10 0%, #1a0f08 100%)",
        color: "#fff",
      }}
    >
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3">
          <Logo size={44} color="#FF6A1A" />
          <span className="text-xl font-bold tracking-tight">Belgomla</span>
        </div>
        <button
          onClick={toggleLang}
          className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-sm font-medium border border-white/15 transition"
        >
          {lang === "en" ? "العربية" : "English"}
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl w-full text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-white/10 border border-white/15 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#FF6A1A] animate-pulse" />
            {t("comingSoon.badge", "Coming soon")}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-5">
            {title}
          </h1>

          <p className="text-base sm:text-lg text-white/75 mb-8 max-w-xl mx-auto">
            {message}
          </p>

          {showCountdown && (
            <div className="mb-8 flex justify-center">
              <CountdownTimer targetDate={launchDate!} />
            </div>
          )}

          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("comingSoon.emailPlaceholder", "you@example.com")}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 placeholder-white/40 text-white focus:outline-none focus:border-[#FF6A1A] focus:bg-white/15 transition"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6A1A] to-[#E8530A] hover:brightness-110 font-semibold text-white shadow-lg shadow-orange-900/30 transition disabled:opacity-60"
              >
                {submitting
                  ? t("comingSoon.subscribing", "Sending…")
                  : t("comingSoon.notifyMe", "Notify me")}
              </button>
            </form>
          ) : (
            <div className="max-w-md mx-auto px-5 py-4 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 font-medium">
              {t(
                "comingSoon.subscribed",
                "You're on the list — we'll let you know."
              )}
            </div>
          )}

          {(socials.facebook ||
            socials.instagram ||
            socials.twitter ||
            socials.youtube) && (
            <div className="mt-10 flex items-center justify-center gap-3">
              {socials.facebook && (
                <SocialIcon
                  href={socials.facebook}
                  label="Facebook"
                  d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.3-1.5 1.6-1.5h1.7V4.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4v2.4H7.7V14h2.7v8h3.1z"
                />
              )}
              {socials.instagram && (
                <SocialIcon
                  href={socials.instagram}
                  label="Instagram"
                  d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.5 1s.8.9 1 1.5c.2.4.3 1 .4 2.2.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-1 1.5s-.9.8-1.5 1c-.4.2-1 .3-2.2.4-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.5-1s-.8-.9-1-1.5c-.2-.4-.3-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 1-1.5s.9-.8 1.5-1c.4-.2 1-.3 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zM12 7a5 5 0 100 10 5 5 0 000-10zm0 8.2a3.2 3.2 0 110-6.4 3.2 3.2 0 010 6.4zM17.5 5.5a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z"
                />
              )}
              {socials.twitter && (
                <SocialIcon
                  href={socials.twitter}
                  label="Twitter"
                  d="M19 6.3c-.6.3-1.3.5-2 .6.7-.4 1.3-1.1 1.5-1.9-.7.4-1.4.7-2.2.8a3.5 3.5 0 00-6 3.2 9.9 9.9 0 01-7.2-3.6 3.5 3.5 0 001.1 4.7c-.6 0-1.1-.2-1.6-.4v.1a3.5 3.5 0 002.8 3.4c-.5.1-1 .2-1.6.1a3.5 3.5 0 003.3 2.4A7 7 0 013 17.5a9.9 9.9 0 005.4 1.6c6.5 0 10-5.3 10-10v-.5c.7-.5 1.3-1.1 1.6-1.8z"
                />
              )}
              {socials.youtube && (
                <SocialIcon
                  href={socials.youtube}
                  label="YouTube"
                  d="M21.6 7.2a2.5 2.5 0 00-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.4a2.5 2.5 0 00-1.8 1.8A26 26 0 002 12a26 26 0 00.4 4.8 2.5 2.5 0 001.8 1.8c1.5.4 7.8.4 7.8.4s6.3 0 7.8-.4a2.5 2.5 0 001.8-1.8 26 26 0 00.4-4.8 26 26 0 00-.4-4.8zM10 15V9l5.2 3-5.2 3z"
                />
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="px-6 py-5 text-center text-white/50 text-sm">
        © {new Date().getFullYear()} Belgomla.{" "}
        {t("comingSoon.rights", "All rights reserved.")}
      </footer>
    </div>
  );
};

export default ComingSoonPage;
