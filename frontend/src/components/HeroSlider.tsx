import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { cldImg, cldSrcSet } from "../lib/cldImage";

interface Slide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  accentColor: string;
  icon: string;
  // Optional square hero image (Cloudinary URL). Falls back to the emoji icon.
  image?: string;
}

const HeroSlider: React.FC = () => {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: Slide[] = [
    {
      id: 1,
      title: t("Premium Tech"),
      subtitle: t("For Every Professional"),
      description: t("Discover laptops, cameras, and IT gear from the world's leading brands at wholesale prices."),
      buttonText: t("Shop Now"),
      buttonLink: "/products",
      accentColor: "from-[#FF6A1A] to-[#E8530A]",
      icon: "💻",
      image: "https://res.cloudinary.com/dcj3j5xn1/image/upload/v1779668994/halafawy/hero/premium-tech.png",
    },
    {
      id: 2,
      title: t("Camera Gear"),
      subtitle: t("Capture Every Moment"),
      description: t("Professional DSLR, mirrorless cameras, and lenses from Canon, Sony, and Nikon."),
      buttonText: t("Explore Cameras"),
      buttonLink: "/products?category=cameras",
      accentColor: "from-[#FFB382] to-[#FF6A1A]",
      icon: "📸",
      image: "", // paste the Magnific/Cloudinary square (1:1) image URL here
    },
    {
      id: 3,
      title: t("Networking"),
      subtitle: t("Enterprise Solutions"),
      description: t("Routers, switches, and access points for home and enterprise. Bulk pricing available."),
      buttonText: t("View Products"),
      buttonLink: "/products?category=networking",
      accentColor: "from-[#E8530A] to-[#0B0B10]",
      icon: "🌐",
      image: "https://res.cloudinary.com/dcj3j5xn1/image/upload/v1779669319/halafawy/hero/networking.png",
    },
    {
      id: 4,
      title: t("Smartphones"),
      subtitle: t("Flagship Power in Your Hand"),
      description: t("The latest flagship smartphones from Samsung, Apple, and Xiaomi at wholesale prices."),
      buttonText: t("Shop Phones"),
      buttonLink: "/products",
      accentColor: "from-[#E8530A] to-[#FF6A1A]",
      icon: "📱",
      image: "https://res.cloudinary.com/dcj3j5xn1/image/upload/v1779669088/halafawy/hero/smartphones.png",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => setCurrentSlide(index);
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="relative h-[360px] sm:h-[420px] md:h-[480px] lg:h-[520px] overflow-hidden bg-[var(--surface)]">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--brand-primary)] opacity-[0.04] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[var(--brand-accent)] opacity-[0.04] rounded-full blur-3xl" />
      </div>

      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-all duration-700 ease-out ${
            index === currentSlide
              ? "opacity-100 translate-x-0"
              : index < currentSlide
              ? "opacity-0 -translate-x-8"
              : "opacity-0 translate-x-8"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center w-full">
              {/* Content */}
              <div className="space-y-5 sm:space-y-6">
                <div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[var(--text)] leading-tight tracking-tight">
                    {slide.title}
                  </h1>
                  <h2 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight bg-gradient-to-r ${slide.accentColor} bg-clip-text text-transparent`}>
                    {slide.subtitle}
                  </h2>
                </div>
                <p className="text-sm sm:text-base text-[var(--text-muted)] max-w-md leading-relaxed">
                  {slide.description}
                </p>
                <div className="flex items-center gap-3">
                  <Link
                    to={slide.buttonLink}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r ${slide.accentColor} text-white font-semibold text-sm sm:text-base hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}
                  >
                    {slide.buttonText}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Visual */}
              <div className="hidden lg:flex justify-center items-center">
                <div className="relative">
                  <div className={`w-72 h-72 xl:w-80 xl:h-80 rounded-3xl bg-gradient-to-br ${slide.accentColor} opacity-10 blur-2xl absolute inset-0`} />
                  <div className="relative w-72 h-72 xl:w-80 xl:h-80 rounded-3xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center overflow-hidden">
                    {slide.image ? (
                      <img
                        src={cldImg(slide.image, { w: 800 })}
                        srcSet={cldSrcSet(slide.image, 400)}
                        sizes="320px"
                        alt={`${slide.title} ${slide.subtitle}`}
                        className="w-full h-full object-cover"
                        loading={index === 0 ? "eager" : "lazy"}
                        decoding="async"
                      />
                    ) : (
                      <span className="text-8xl xl:text-9xl">{slide.icon}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[var(--surface)]/90 backdrop-blur-sm border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)] transition-all z-10 shadow-sm"
      >
        <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[var(--surface)]/90 backdrop-blur-sm border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)] transition-all z-10 shadow-sm"
      >
        <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 rounded-full ${
              index === currentSlide
                ? "w-8 h-2.5 bg-[var(--brand-primary)]"
                : "w-2.5 h-2.5 bg-[var(--text-subtle)]/40 hover:bg-[var(--text-subtle)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;
