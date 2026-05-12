import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useBrandStore } from "../stores/brand.store";

const BrandLogos: React.FC = () => {
  const { t } = useTranslation();
  const fetchBrands = useBrandStore((state) => state.fetchBrands);
  const brands = useBrandStore((state) => state.brands);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // Fallback brand data with logos
  const brandLogos: Record<string, string> = {
    Apple: "https://cdn.simpleicons.org/apple/000000",
    Dell: "https://cdn.simpleicons.org/dell/007DB8",
    HP: "https://cdn.simpleicons.org/hp/0096D6",
    Lenovo: "https://cdn.simpleicons.org/lenovo/E2231A",
    ASUS: "https://cdn.simpleicons.org/asus/000000",
    Canon: "https://cdn.simpleicons.org/canon/BC0024",
    Sony: "https://cdn.simpleicons.org/sony/000000",
    Nikon: "https://cdn.simpleicons.org/nikon/FFE100",
    Samsung: "https://cdn.simpleicons.org/samsung/1428A0",
    MSI: "https://cdn.simpleicons.org/msi/FF0000",
    Logitech: "https://cdn.simpleicons.org/logitech/00B8FC",
    "TP-Link": "https://cdn.simpleicons.org/tplink/4ACBD6",
    NVIDIA: "https://cdn.simpleicons.org/nvidia/76B900",
    AMD: "https://cdn.simpleicons.org/amd/ED1C24",
    Corsair: "https://cdn.simpleicons.org/corsair/000000",
  };

  const brandItems = brands.length > 0
    ? brands.map((b) => ({ name: b.name, logo: b.logo || brandLogos[b.name] || "" }))
    : Object.entries(brandLogos).map(([name, logo]) => ({ name, logo }));

  return (
    <section className="py-10 sm:py-14 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-2">
            {t("Trusted Brands")}
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            {t("Partnered with leading technology brands worldwide")}
          </p>
        </div>
      </div>

      {/* Infinite marquee */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-24 sm:w-40 bg-gradient-to-r from-[var(--bg)] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 sm:w-40 bg-gradient-to-l from-[var(--bg)] to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee w-max gap-6 sm:gap-10">
          {[...brandItems, ...brandItems].map((brand, index) => (
            <div
              key={`${brand.name}-${index}`}
              className="flex-shrink-0 group cursor-pointer"
            >
              <div className="flex flex-col items-center justify-center gap-2 w-44 h-24 sm:w-52 sm:h-28 rounded-2xl bg-[var(--surface)] border border-[var(--border)] px-5 hover:border-[var(--brand-primary)]/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                {brand.logo ? (
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="h-8 sm:h-10 w-auto object-contain opacity-50 group-hover:opacity-100 transition-opacity duration-300 grayscale group-hover:grayscale-0"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const fallback = target.parentElement?.querySelector('.brand-fallback') as HTMLElement;
                      if (fallback) fallback.style.display = "block";
                    }}
                  />
                ) : null}
                <span
                  className={`text-xs font-semibold text-[var(--text-subtle)] group-hover:text-[var(--brand-primary)] transition-colors duration-300 tracking-wide uppercase ${brand.logo ? "" : "brand-fallback text-base"}`}
                >
                  {brand.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandLogos;
