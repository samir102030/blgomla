import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { ComputerDesktopIcon, CameraIcon, GlobeAltIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { cldImg, cldSrcSet } from "../lib/cldImage";
import {
  CheckBadgeIcon,
  TruckIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";

interface Slide {
  id: number;
  /** Small label above the headline — names the product family. */
  kicker: string;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  accentColor: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  // Optional square hero image (Cloudinary URL). Falls back to the line icon.
  image?: string;
}

const AUTOPLAY_MS = 6500;

const HeroSlider: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);

  // Users who ask for reduced motion get a static hero: no autoplay, no
  // progress animation. They can still page through it manually.
  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const slides: Slide[] = [
    {
      id: 1,
      kicker: t("Laptops & IT gear"),
      title: t("Premium Tech"),
      subtitle: t("For Every Professional"),
      description: t("Discover laptops, cameras, and IT gear from the world's leading brands at wholesale prices."),
      buttonText: t("Shop Now"),
      buttonLink: "/products",
      accentColor: "from-[#00A8E8] to-[#0077B6]",
      icon: ComputerDesktopIcon,
      image: "https://res.cloudinary.com/dcj3j5xn1/image/upload/v1779668994/halafawy/hero/premium-tech.png",
    },
    {
      id: 2,
      kicker: t("Cameras & lenses"),
      title: t("Camera Gear"),
      subtitle: t("Capture Every Moment"),
      description: t("Professional DSLR, mirrorless cameras, and lenses from Canon, Sony, and Nikon."),
      buttonText: t("Explore Cameras"),
      buttonLink: "/products?category=cameras",
      accentColor: "from-[#7FD8FF] to-[#00A8E8]",
      icon: CameraIcon,
      image: "https://res.cloudinary.com/dcj3j5xn1/image/upload/v1779669608/halafawy/hero/cameras.png",
    },
    {
      id: 3,
      kicker: t("Routers, switches & access points"),
      title: t("Networking"),
      subtitle: t("Enterprise Solutions"),
      description: t("Routers, switches, and access points for home and enterprise. Bulk pricing available."),
      buttonText: t("View Products"),
      buttonLink: "/products?category=networking",
      accentColor: "from-[#0077B6] to-[#7FD8FF]",
      icon: GlobeAltIcon,
      image: "https://res.cloudinary.com/dcj3j5xn1/image/upload/v1779669319/halafawy/hero/networking.png",
    },
    {
      id: 4,
      kicker: t("Flagship smartphones"),
      title: t("Smartphones"),
      subtitle: t("Flagship Power in Your Hand"),
      description: t("The latest flagship smartphones from Samsung, Apple, and Xiaomi at wholesale prices."),
      buttonText: t("Shop Phones"),
      buttonLink: "/products",
      accentColor: "from-[#0077B6] to-[#00A8E8]",
      icon: DevicePhoneMobileIcon,
      image: "https://res.cloudinary.com/dcj3j5xn1/image/upload/v1779669088/halafawy/hero/smartphones.png",
    },
  ];

  const slideCount = slides.length;
  const goToSlide = useCallback((index: number) => setCurrentSlide(index), []);
  const nextSlide = useCallback(
    () => setCurrentSlide((prev) => (prev + 1) % slideCount),
    [slideCount]
  );
  const prevSlide = useCallback(
    () => setCurrentSlide((prev) => (prev - 1 + slideCount) % slideCount),
    [slideCount]
  );

  // Autoplay pauses on hover, on keyboard focus inside the hero, and while the
  // tab is hidden — a carousel that advanced unseen would drop slides 2 and 3
  // for anyone coming back to the tab.
  useEffect(() => {
    if (reducedMotion || paused) return;
    const timer = setInterval(nextSlide, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [reducedMotion, paused, nextSlide]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Arrow keys page the hero when focus is inside it. Mapped to the reading
  // direction: in Arabic, ArrowLeft moves forward.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (isRtl) prevSlide();
      else nextSlide();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (isRtl) nextSlide();
      else prevSlide();
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 48) return;
    const forward = isRtl ? delta > 0 : delta < 0;
    if (forward) nextSlide();
    else prevSlide();
  };

  const trustPoints = [
    { Icon: CheckBadgeIcon, label: t("Genuine Products") },
    { Icon: TruckIcon, label: t("Free Delivery") },
    { Icon: ArrowUturnLeftIcon, label: t("Easy Returns") },
  ];

  return (
    <section
      ref={containerRef}
      dir={isRtl ? "rtl" : "ltr"}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
      aria-label={t("Featured collections")}
      className="relative isolate overflow-hidden bg-[var(--ink-canvas)]"
    >
      {/* ── Ambient canvas ──
          Engineering grid + two drifting brand pools + a vignette. All
          decorative and pointer-transparent so they never eat a click. */}
      <div className="absolute inset-0 grid-lines opacity-[0.55] pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 ltr:-left-24 rtl:-right-24 w-[38rem] h-[38rem] rounded-full bg-[#00A8E8] opacity-[0.16] blur-[120px] animate-drift" />
        <div
          className="absolute -bottom-52 ltr:-right-16 rtl:-left-16 w-[34rem] h-[34rem] rounded-full bg-[#0077B6] opacity-[0.13] blur-[130px] animate-drift"
          style={{ animationDelay: "-7s" }}
        />
      </div>
      <div
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(120%_90%_at_50%_0%,transparent_35%,rgba(0,0,0,0.55)_100%)]"
        aria-hidden="true"
      />
      {/* Blend the hero into the page background instead of ending on a hard edge. */}
      <div
        className="absolute inset-x-0 bottom-0 h-24 pointer-events-none bg-gradient-to-b from-transparent to-[var(--bg)]"
        aria-hidden="true"
      />

      <div className="relative shell pt-10 pb-14 sm:pt-14 sm:pb-16 lg:pt-20 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* ── Copy column ── */}
          <div className="lg:col-span-7 xl:col-span-6">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} / ${slideCount}`}
                aria-hidden={index !== currentSlide}
                className={
                  index === currentSlide
                    ? "block animate-fadeInUp"
                    : "hidden"
                }
              >
                <span className="chip chip-on-ink mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00A8E8]" aria-hidden="true" />
                  {slide.kicker}
                </span>

                <h1 className="text-display text-[var(--on-ink)]">
                  {slide.title}
                  <span className="block bg-gradient-to-r from-[#7FD8FF] via-[#00A8E8] to-[#0077B6] bg-clip-text text-transparent">
                    {slide.subtitle}
                  </span>
                </h1>

                <p className="mt-5 max-w-xl text-sm sm:text-base lg:text-lg text-[var(--on-ink-muted)] leading-relaxed">
                  {slide.description}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link to={slide.buttonLink} className="btn btn-primary btn-lg">
                    {slide.buttonText}
                    <svg className="w-4 h-4 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                  <Link to="/categories" className="btn btn-on-ink btn-lg">
                    {t("Browse Categories")}
                  </Link>
                </div>
              </div>
            ))}

            {/* Trust strip — the same guarantees the storefront makes further
                down the page, surfaced before the first scroll. */}
            <ul className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-6">
              {trustPoints.map(({ Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[var(--on-ink-muted)]">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#00A8E8]" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* ── Visual column ── */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-6">
            <div className="relative mx-auto w-full max-w-md aspect-square">
              {/* Glow behind the frame */}
              <div className="absolute inset-6 rounded-[2rem] bg-gradient-to-br from-[#00A8E8] to-[#0077B6] opacity-25 blur-3xl" aria-hidden="true" />

              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  aria-hidden="true"
                  className={`absolute inset-0 transition-all duration-700 ease-out ${
                    index === currentSlide
                      ? "opacity-100 scale-100 blur-0"
                      : "opacity-0 scale-95 blur-sm pointer-events-none"
                  }`}
                >
                  <div className="relative w-full h-full rounded-[1.75rem] overflow-hidden border border-white/10 bg-white/[0.04] backdrop-blur-sm shadow-2xl">
                    {slide.image ? (
                      <img
                        src={cldImg(slide.image, { w: 900 })}
                        srcSet={cldSrcSet(slide.image, 450)}
                        sizes="(min-width: 1280px) 448px, 384px"
                        alt={`${slide.title} — ${slide.subtitle}`}
                        className="w-full h-full object-cover"
                        loading={index === 0 ? "eager" : "lazy"}
                        fetchPriority={index === 0 ? "high" : "auto"}
                        decoding="async"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-8xl">
                        <slide.icon className="w-6 h-6" aria-hidden="true" />
                      </span>
                    )}
                    {/* Top sheen — sells the frame as glass rather than a flat box. */}
                    <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Controls ──
            Progress bars double as pagination: the active one fills over the
            autoplay interval, so the next advance is never a surprise. */}
        <div className="mt-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3" role="tablist" aria-label={t("Featured collections")}>
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={index === currentSlide}
                aria-label={slide.title}
                onClick={() => goToSlide(index)}
                className={`group relative h-1 rounded-full overflow-hidden transition-all duration-300 ${
                  index === currentSlide
                    ? "w-16 sm:w-24 bg-white/20"
                    : "w-8 sm:w-10 bg-white/15 hover:bg-white/30"
                }`}
              >
                {index === currentSlide && (
                  <span
                    className="absolute inset-0 origin-left rtl:origin-right bg-gradient-to-r from-[#7FD8FF] to-[#00A8E8]"
                    style={
                      reducedMotion
                        ? { transform: "scaleX(1)" }
                        : {
                            animation: `hero-progress ${AUTOPLAY_MS}ms linear forwards`,
                            // Hovering pauses autoplay; the bar freezes with it
                            // rather than running on and lying about the timing.
                            animationPlayState: paused ? "paused" : "running",
                          }
                    }
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs font-semibold tabular-nums text-[var(--on-ink-muted)] me-2">
              {String(currentSlide + 1).padStart(2, "0")}
              <span className="opacity-50"> / {String(slideCount).padStart(2, "0")}</span>
            </span>
            <button
              type="button"
              onClick={prevSlide}
              aria-label={t("Previous slide")}
              className="w-10 h-10 rounded-full border border-white/15 bg-white/5 text-[var(--on-ink)] flex items-center justify-center hover:bg-white/15 hover:border-white/30 transition-all"
            >
              <svg className="w-5 h-5 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={nextSlide}
              aria-label={t("Next slide")}
              className="w-10 h-10 rounded-full border border-white/15 bg-white/5 text-[var(--on-ink)] flex items-center justify-center hover:bg-white/15 hover:border-white/30 transition-all"
            >
              <svg className="w-5 h-5 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSlider;
