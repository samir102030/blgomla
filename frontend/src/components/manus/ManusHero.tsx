import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCategoryStore } from "../../stores/category.store";
import { categoryHref } from "../../lib/categoryLink";
import {
  Arrow,
  AudioLines,
  Camera,
  Chevron,
  Fingerprint,
  Flame,
  Headphones,
  Network,
  Phone,
  ShieldCheck,
  Wrench,
} from "./icons";

/**
 * The Manus hero, ported from v3 of the design package as the six-slide
 * solution carousel it became there, rather than the single static panel of
 * the earlier round.
 *
 * Each slide is one service the shop actually sells, and its second action
 * opens that service's own catalogue page: the visitor who stops on the
 * intercom slide and clicks through gets intercom products, not the whole
 * storefront. Categories are named here and resolved to live ids at render —
 * see `lib/categoryLink` for why the id, and not the slug, is what the
 * products page needs in the URL.
 *
 * Brands come from the package's brand-to-service mapping, which was built by
 * matching the uploaded product data by category rather than by marketing
 * copy. Fire safety has no brand line for that reason: the catalogue has no
 * fire products whose brands we could show without inventing them.
 */

type Slide = {
  id: string;
  image: string;
  icon: React.FC<{ size?: number }>;
  eyebrow: string;
  title: string;
  accent: string;
  text: string;
  action: string;
  /** Slug, English name and Arabic name of the catalogue category to open. */
  category: readonly string[];
  brands: readonly string[];
};

const SLIDES: readonly Slide[] = [
  {
    id: "surveillance",
    image: "/manus/banner-surveillance.webp",
    icon: Camera,
    eyebrow: "Integrated smart solutions",
    title: "We secure your facility.",
    accent: "And we connect your business.",
    text: "Surveillance cameras, professional networks, data and smart control solutions designed for your needs — from planning through to operation.",
    action: "Explore solutions",
    category: ["surveillance-security", "surveillance", "Surveillance & Security", "أنظمة المراقبة والأمن"],
    brands: ["Hikvision", "UNV", "Tiandy", "HiLook", "EZVIZ"],
  },
  {
    id: "fire",
    image: "/manus/banner-fire.webp",
    icon: Flame,
    eyebrow: "Fire alarm & suppression",
    title: "A faster response.",
    accent: "And higher safety.",
    text: "Early warning, detection points and safety equipment planned around the nature of the site and its evacuation routes.",
    action: "Explore fire safety",
    category: ["alarm-systems", "Alarm Systems", "أنظمة الإنذار"],
    brands: [],
  },
  {
    id: "audio",
    image: "/manus/banner-audio.webp",
    icon: AudioLines,
    eyebrow: "Audio & sound systems",
    title: "Clear sound.",
    accent: "In every space.",
    text: "Speakers, amplifiers and orderly paging for clear audio across offices, halls and retail floors.",
    action: "Explore audio solutions",
    category: ["tvs-audio", "tv-audio", "TVs & Audio", "التلفزيونات والصوتيات"],
    brands: ["Logitech", "RØDE", "Anker", "Hikvision", "Yealink", "Avaya"],
  },
  {
    id: "network",
    image: "/manus/banner-network.webp",
    icon: Network,
    eyebrow: "Networks & infrastructure",
    title: "A network that holds steady.",
    accent: "Behind everything you run.",
    text: "Design, cabling and management for an orderly business network — stable, and ready to scale with your site.",
    action: "Explore networking",
    category: ["networking", "Networking", "الشبكات"],
    brands: ["TP-Link", "D-Link", "Cisco", "Ruijie Reyee", "NETGEAR", "Aruba"],
  },
  {
    id: "attendance",
    image: "/manus/banner-attendance.webp",
    icon: Fingerprint,
    eyebrow: "Attendance & access control",
    title: "Orderly entry.",
    accent: "And clearer records.",
    text: "Fingerprint terminals and access control that let you follow attendance and manage entry from a single point of operation.",
    action: "Explore attendance systems",
    category: ["time-attendance-fingerprint", "time-attendance", "Time Attendance & Fingerprint", "أجهزة الحضور والبصمة"],
    brands: ["ZKTeco", "Hikvision", "Advision", "Convoy"],
  },
  {
    id: "intercom",
    image: "/manus/banner-intercom.webp",
    icon: Phone,
    eyebrow: "Intercom & PBX",
    title: "Secure communication.",
    accent: "From the entrance to the back office.",
    text: "Video intercom, IP phones and practical PBX systems that link reception, offices and entry points.",
    action: "Explore communication solutions",
    category: ["video-intercom", "Video Intercom", "إنتركم فيديو"],
    brands: ["Panasonic", "Hikvision", "Grandstream", "Yealink", "Intelbras", "Yeastar"],
  },
];

/** The fade the package settles on: content out, swap, content back in. */
const FADE_MS = 150;
const SLIDE_MS = 6000;

const ManusHero: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const categories = useCategoryStore((state) => state.categories);

  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [paused, setPaused] = useState(false);
  // Once the visitor drives the carousel themselves, it stops driving itself.
  // Rotating a slide out from under someone who just chose it is the whole
  // complaint people have with carousels, and it doubles as the mechanism to
  // stop the movement that auto-updating content owes the reader.
  const [handedOver, setHandedOver] = useState(false);
  const fadeTimer = useRef<number | undefined>(undefined);

  // Motion is a preference, not a decoration: with reduced motion asked for,
  // slides still change on demand but nothing advances on its own.
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );

  const slide = SLIDES[index];
  const SlideIcon = slide.icon;
  const href = useMemo(() => categoryHref(categories, slide.category), [categories, slide.category]);

  const activate = (next: number) => {
    if (next === index) return;
    if (reducedMotion) {
      setIndex(next);
      return;
    }
    setFading(true);
    window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => {
      setIndex(next);
      setFading(false);
    }, FADE_MS);
  };

  /** Any deliberate move: change the slide, and stop rotating from here on. */
  const takeOver = (next: number) => {
    setHandedOver(true);
    activate(next);
  };

  const showPrevious = () => takeOver((index - 1 + SLIDES.length) % SLIDES.length);
  const showNext = () => takeOver((index + 1) % SLIDES.length);

  useEffect(() => () => window.clearTimeout(fadeTimer.current), []);

  // A timeout re-armed on every slide rather than a free-running interval: the
  // wait restarts from whichever slide is showing, and the automatic move goes
  // through `activate`, so it carries the same fade the manual ones do.
  useEffect(() => {
    if (paused || handedOver || reducedMotion || SLIDES.length < 2) return;
    const timer = window.setTimeout(() => activate((index + 1) % SLIDES.length), SLIDE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, handedOver, reducedMotion]);

  return (
    <section
      className="mn-hero mn-site-width mn-commerce-hero mn-solution-carousel"
      aria-roledescription="carousel"
      aria-label={t("Solution slides")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      // Keyboard users get the same courtesy as the mouse: tabbing into the
      // hero stops it moving out from under them.
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {SLIDES.map((item, position) => (
        <div
          key={item.id}
          className={`mn-hero-image mn-carousel-image ${position === index ? "mn-active" : ""}`}
          style={{ backgroundImage: `url(${item.image})` }}
        />
      ))}
      <div className="mn-hero-signal" />

      {/* The engineering grid the whole panel is set on, the crop marks that
          frame it, and the slide coordinate. Decoration in the strict sense —
          the dots below already announce position to a screen reader — but the
          reason the page reads as an instrument rather than a shop window. */}
      <div className="mn-hero-grid" aria-hidden="true" />
      <div className="mn-hero-marks" aria-hidden="true" />
      <div className="mn-hero-index" aria-hidden="true">
        <b>{String(index + 1).padStart(2, "0")}</b>
        <i>/ {String(SLIDES.length).padStart(2, "0")}</i>
      </div>

      <div className="mn-carousel-arrows">
        <button
          type="button"
          className="mn-carousel-arrow"
          aria-label={t("Previous slide")}
          onClick={showPrevious}
        >
          <Chevron size={20} direction={isRtl ? "right" : "left"} />
        </button>
        <button
          type="button"
          className="mn-carousel-arrow"
          aria-label={t("Next slide")}
          onClick={showNext}
        >
          <Chevron size={20} direction={isRtl ? "left" : "right"} />
        </button>
      </div>

      {/* No live region here: the panel changes on its own every few seconds
          and holds the carousel's own links and picker, so announcing it would
          interrupt the reader mid-sentence with a block they did not ask for. */}
      <div className={`mn-hero-content ${fading ? "mn-hero-fade" : ""}`}>
        <div className="mn-eyebrow">
          <SlideIcon size={15} /> {t(slide.eyebrow)}
        </div>

        <h1>
          {t(slide.title)}
          <br />
          <span className="mn-accent">{t(slide.accent)}</span>
        </h1>

        <p>{t(slide.text)}</p>

        <div className="mn-action-row">
          <Link to="/contact" className="mn-btn mn-btn-primary">
            {t("Request a free consultation")} <Arrow rtl={isRtl} />
          </Link>
          <Link to={href} className="mn-btn mn-btn-ghost">
            {t(slide.action)}
          </Link>
        </div>

        <div className="mn-trust-pills mn-hero-trust-pills">
          <span className="mn-trust-pill">
            <ShieldCheck /> {t("Genuine warranty")}
          </span>
          <span className="mn-trust-pill">
            <Wrench /> {t("Professional installation")}
          </span>
          <span className="mn-trust-pill">
            <Headphones /> {t("Specialist support")}
          </span>
        </div>

        <div className="mn-hero-brand-strip">
          {slide.brands.length ? (
            <>
              <span>{t("Available brands")}</span>
              {slide.brands.map((brand) => (
                <b key={`${slide.id}-${brand}`}>{brand}</b>
              ))}
            </>
          ) : (
            // No fire products have been uploaded with documented brands, so
            // the strip says so rather than borrowing names from elsewhere.
            <span>{t("Brands selected to suit the project requirements")}</span>
          )}
        </div>

        {/* Keys pair the slide id with the element: the package's own note is
            that a key repeated across a map is what broke its navigation. */}
        <div className="mn-carousel-controls">
          {SLIDES.map((item, position) => (
            <button
              type="button"
              key={`${item.id}-dot`}
              // The number is the only text on the button, so it has to lead
              // the accessible name too — otherwise saying "click 02" matches
              // nothing for someone driving the page by voice.
              aria-label={`${String(position + 1).padStart(2, "0")} — ${t(item.eyebrow)}`}
              aria-current={position === index}
              className={position === index ? "mn-active" : ""}
              onClick={() => takeOver(position)}
            >
              <span>{String(position + 1).padStart(2, "0")}</span>
              <i />
            </button>
          ))}
        </div>
      </div>

      <div className="mn-hero-service-note">
        <SlideIcon size={17} />
        <span>
          <strong>{t(slide.eyebrow)}</strong>{" "}
          {t("Pause on hover, or pick any solution from the dots.")}
        </span>
      </div>
    </section>
  );
};

export default ManusHero;
