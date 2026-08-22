import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCategoryStore } from "../../stores/category.store";
import { useHeroSlideStore } from "../../stores/heroSlide.store";
import { categoryHref } from "../../lib/categoryLink";
import { Arrow, Chevron, slideIcon } from "./icons";

/**
 * The Manus hero, ported from v3 of the design package as the six-slide
 * solution carousel it became there, rather than the single static panel of
 * the earlier round.
 *
 * Each slide is one service the shop actually sells, and its second action
 * opens that service's own catalogue page: the visitor who stops on the
 * intercom slide and clicks through gets intercom products, not the whole
 * storefront.
 *
 * The slides come from the database now — Dashboard → Banner writes them — and
 * the six below are what renders when it has none to give: a first deploy, an
 * emptied list, an API that is down. The banner is the most visible thing on
 * the site and a blank one is worse than a slightly stale one, so the fallback
 * stays in the bundle rather than being deleted once the table is filled.
 *
 * Fallback slides name their category and resolve it to a live id at render —
 * see `lib/categoryLink` for why the id, and not the slug, is what the products
 * page needs in the URL. Slides written in the dashboard arrive with the link
 * already built, because the link picker there resolves it at the moment it is
 * chosen.
 *
 * The panel is deliberately shallow. A banner that fills the fold tells a
 * visitor the page ends there, so this one carries only what earns its height:
 * the service, the claim, the ways in, and the picker.
 */

type FallbackSlide = {
  id: string;
  image: string;
  icon: string;
  eyebrow: string;
  title: string;
  accent: string;
  action: string;
  /** Slug, English name and Arabic name of the catalogue category to open. */
  category: readonly string[];
};

const FALLBACK_SLIDES: readonly FallbackSlide[] = [
  {
    id: "surveillance",
    image: "/manus/banner-surveillance.webp",
    icon: "camera",
    eyebrow: "Integrated smart solutions",
    title: "We secure your facility.",
    accent: "And we connect your business.",
    action: "Explore solutions",
    category: ["surveillance-security", "surveillance", "Surveillance & Security", "أنظمة المراقبة والأمن"],
  },
  {
    id: "fire",
    image: "/manus/banner-fire.webp",
    icon: "flame",
    eyebrow: "Fire alarm & suppression",
    title: "A faster response.",
    accent: "And higher safety.",
    action: "Explore fire safety",
    category: ["alarm-systems", "Alarm Systems", "أنظمة الإنذار"],
  },
  {
    id: "audio",
    image: "/manus/banner-audio.webp",
    icon: "audio",
    eyebrow: "Audio & sound systems",
    title: "Clear sound.",
    accent: "In every space.",
    action: "Explore audio solutions",
    category: ["tvs-audio", "tv-audio", "TVs & Audio", "التلفزيونات والصوتيات"],
  },
  {
    id: "network",
    image: "/manus/banner-network.webp",
    icon: "network",
    eyebrow: "Networks & infrastructure",
    title: "A network that holds steady.",
    accent: "Behind everything you run.",
    action: "Explore networking",
    category: ["networking", "Networking", "الشبكات"],
  },
  {
    id: "attendance",
    image: "/manus/banner-attendance.webp",
    icon: "fingerprint",
    eyebrow: "Attendance & access control",
    title: "Orderly entry.",
    accent: "And clearer records.",
    action: "Explore attendance systems",
    category: ["time-attendance-fingerprint", "time-attendance", "Time Attendance & Fingerprint", "أجهزة الحضور والبصمة"],
  },
  {
    id: "intercom",
    image: "/manus/banner-intercom.webp",
    icon: "phone",
    eyebrow: "Intercom & PBX",
    title: "Secure communication.",
    accent: "From the entrance to the back office.",
    action: "Explore communication solutions",
    category: ["video-intercom", "Video Intercom", "إنتركم فيديو"],
  },
];

/** What the carousel actually renders, whichever source it came from. */
type ViewSlide = {
  key: string;
  image: string;
  icon: string;
  eyebrow: string;
  title: string;
  accent: string;
  buttons: { label: string; href: string; style: "primary" | "ghost" }[];
};

/** The fade the package settles on: content out, swap, content back in. */
const FADE_MS = 150;
const SLIDE_MS = 6000;

const ManusHero: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const isArabic = (i18n.language || "en").toLowerCase().startsWith("ar");
  const categories = useCategoryStore((state) => state.categories);
  const cmsSlides = useHeroSlideStore((state) => state.slides);
  const slidesLoaded = useHeroSlideStore((state) => state.loaded);
  const fetchActiveSlides = useHeroSlideStore((state) => state.fetchActiveSlides);

  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [paused, setPaused] = useState(false);
  // Once the visitor drives the carousel themselves, it stops driving itself.
  // Rotating a slide out from under someone who just chose it is the whole
  // complaint people have with carousels, and it doubles as the mechanism to
  // stop the movement that auto-updating content owes the reader.
  const [handedOver, setHandedOver] = useState(false);
  const fadeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!slidesLoaded) fetchActiveSlides();
  }, [slidesLoaded, fetchActiveSlides]);

  // Motion is a preference, not a decoration: with reduced motion asked for,
  // slides still change on demand but nothing advances on its own.
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );

  const slides: ViewSlide[] = useMemo(() => {
    // An empty list from a loaded API is a deliberate "no slides", but it is
    // still not a reason to render a blank band where the banner should be.
    if (cmsSlides.length) {
      // `|| english` on every Arabic field rather than a blank: a slide half
      // translated should show the half that exists, not a gap.
      const pick = (ar: string | undefined, en: string | undefined) =>
        (isArabic && ar?.trim() ? ar : en) || "";

      return cmsSlides.map((slide) => ({
        key: slide._id,
        image: slide.image,
        icon: slide.icon || "sparkles",
        eyebrow: pick(slide.eyebrowAr, slide.eyebrow),
        title: pick(slide.titleAr, slide.title),
        accent: pick(slide.accentAr, slide.accent),
        buttons: (slide.buttons || [])
          .filter((button) => button.href && (button.label || button.labelAr))
          .map((button) => ({
            label: pick(button.labelAr, button.label),
            href: button.href,
            style: button.style === "primary" ? ("primary" as const) : ("ghost" as const),
          })),
      }));
    }

    return FALLBACK_SLIDES.map((slide) => ({
      key: slide.id,
      image: slide.image,
      icon: slide.icon,
      eyebrow: t(slide.eyebrow),
      title: t(slide.title),
      accent: t(slide.accent),
      buttons: [
        {
          label: t("Request a free consultation"),
          href: "/contact",
          style: "primary" as const,
        },
        {
          label: t(slide.action),
          href: categoryHref(categories, slide.category),
          style: "ghost" as const,
        },
      ],
    }));
  }, [cmsSlides, categories, isArabic, t]);

  // The list can shrink under the visitor — the API answering after the
  // fallback has already rendered, or an admin switching a slide off in
  // another tab — and an index left pointing past the end reads as a blank
  // hero rather than as a shorter carousel.
  const safeIndex = index < slides.length ? index : 0;
  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [index, slides.length]);

  const slide = slides[safeIndex];
  const SlideIcon = slideIcon(slide?.icon);

  const activate = (next: number) => {
    if (next === safeIndex) return;
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

  const showPrevious = () => takeOver((safeIndex - 1 + slides.length) % slides.length);
  const showNext = () => takeOver((safeIndex + 1) % slides.length);

  useEffect(() => () => window.clearTimeout(fadeTimer.current), []);

  // A timeout re-armed on every slide rather than a free-running interval: the
  // wait restarts from whichever slide is showing, and the automatic move goes
  // through `activate`, so it carries the same fade the manual ones do.
  useEffect(() => {
    if (paused || handedOver || reducedMotion || slides.length < 2) return;
    const timer = window.setTimeout(() => activate((safeIndex + 1) % slides.length), SLIDE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex, paused, handedOver, reducedMotion, slides.length]);

  if (!slide) return null;

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
      {slides.map((item, position) => (
        <div
          key={item.key}
          className={`mn-hero-image mn-carousel-image ${position === safeIndex ? "mn-active" : ""}`}
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
        <b>{String(safeIndex + 1).padStart(2, "0")}</b>
        <i>/ {String(slides.length).padStart(2, "0")}</i>
      </div>

      {slides.length > 1 && (
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
      )}

      {/* No live region here: the panel changes on its own every few seconds
          and holds the carousel's own links and picker, so announcing it would
          interrupt the reader mid-sentence with a block they did not ask for. */}
      <div className={`mn-hero-content ${fading ? "mn-hero-fade" : ""}`}>
        {slide.eyebrow && (
          <div className="mn-eyebrow">
            <SlideIcon size={15} /> {slide.eyebrow}
          </div>
        )}

        <h1>
          {slide.title}
          {slide.accent && (
            <>
              <br />
              <span className="mn-accent">{slide.accent}</span>
            </>
          )}
        </h1>

        <div className="mn-action-row">
          {slide.buttons.map((button, position) => (
            <Link
              // Buttons carry no id of their own, and two on one slide can
              // legitimately share a label; the position is what distinguishes
              // them, so it is what keys them.
              key={`${slide.key}-btn-${position}`}
              to={button.href}
              className={`mn-btn ${button.style === "primary" ? "mn-btn-primary" : "mn-btn-ghost"}`}
            >
              {button.label}
              {button.style === "primary" && <Arrow rtl={isRtl} />}
            </Link>
          ))}
        </div>

        {slides.length > 1 && (
          /* Keys pair the slide id with the element: the package's own note is
             that a key repeated across a map is what broke its navigation. */
          <div className="mn-carousel-controls">
            {slides.map((item, position) => (
              <button
                type="button"
                key={`${item.key}-dot`}
                // The number is the only text on the button, so it has to lead
                // the accessible name too — otherwise saying "click 02" matches
                // nothing for someone driving the page by voice.
                aria-label={`${String(position + 1).padStart(2, "0")} — ${item.eyebrow || item.title}`}
                aria-current={position === safeIndex}
                className={position === safeIndex ? "mn-active" : ""}
                onClick={() => takeOver(position)}
              >
                <span>{String(position + 1).padStart(2, "0")}</span>
                <i />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ManusHero;
