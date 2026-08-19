import React, { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBrands } from "../lib/queries";

const BrandLogos: React.FC = () => {
  const { t } = useTranslation();
  const { data: brands = [] } = useBrands();

  // Fallback brand data with logos.
  //
  // Simple Icons drops a brand mark when the rights holder asks it to, and it
  // has dropped Canon and Logitech. Pointing at a slug it no longer serves
  // costs every visitor a 404 on every page load and still ends up showing the
  // name-only card below — so those two are simply listed without a logo. A
  // real logo uploaded from the brands page wins over this map anyway.
  const brandLogos: Record<string, string> = {
    Apple: "https://cdn.simpleicons.org/apple/000000",
    Dell: "https://cdn.simpleicons.org/dell/007DB8",
    HP: "https://cdn.simpleicons.org/hp/0096D6",
    Lenovo: "https://cdn.simpleicons.org/lenovo/E2231A",
    ASUS: "https://cdn.simpleicons.org/asus/000000",
    Sony: "https://cdn.simpleicons.org/sony/000000",
    Nikon: "https://cdn.simpleicons.org/nikon/FFE100",
    Samsung: "https://cdn.simpleicons.org/samsung/1428A0",
    MSI: "https://cdn.simpleicons.org/msi/FF0000",
    "TP-Link": "https://cdn.simpleicons.org/tplink/4ACBD6",
    NVIDIA: "https://cdn.simpleicons.org/nvidia/76B900",
    AMD: "https://cdn.simpleicons.org/amd/ED1C24",
    Corsair: "https://cdn.simpleicons.org/corsair/000000",
  };

  // Honour the arrangement set under Storefront visibility. Without the
  // filter, a brand switched off in the dashboard kept scrolling past on the
  // front page — which is the one place a visitor is most likely to see it.
  //
  // Guarded rather than trusting the hook's type: a malformed response used to
  // degrade to the fallback logos below, and turning that into a thrown
  // TypeError would take the whole home page down with it.
  const visibleBrands = (Array.isArray(brands) ? brands : [])
    .filter(
      (b) =>
        (b as { isActive?: boolean }).isActive !== false &&
        (b as { showInMenu?: boolean }).showInMenu !== false
    )
    .sort(
      (a, b) =>
        ((a as { sortOrder?: number }).sortOrder ?? 0) -
        ((b as { sortOrder?: number }).sortOrder ?? 0)
    );

  const brandItems =
    visibleBrands.length > 0
      ? visibleBrands.map((b) => ({
          name: b.name,
          logo: b.logo || brandLogos[b.name] || "",
        }))
      : Object.entries(brandLogos).map(([name, logo]) => ({ name, logo }));

  // Approach: render every card with an explicit margin-right (no flex gap,
  // no logical padding). Then the cycle distance is just N * (card_width
  // + margin_right). We render enough copies to overflow the viewport,
  // and animate by exactly one cycle's pixel width — measured from the
  // first card's offsetLeft to the (N+1)-th card's offsetLeft after mount.
  const cardRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [copies, setCopies] = useState(3);
  const [cycleDistance, setCycleDistance] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (brandItems.length === 0) return;
    const measure = () => {
      const card = cardRef.current;
      const container = containerRef.current;
      if (!card || !container) return;
      // One cycle's full width: card width + right margin, times N items.
      const rect = card.getBoundingClientRect();
      const styles = window.getComputedStyle(card);
      const marginRight = parseFloat(styles.marginRight) || 0;
      const cycle = (rect.width + marginRight) * brandItems.length;
      setCycleDistance(cycle);
      const vw = container.getBoundingClientRect().width;
      // 1 cycle behind the viewport + 1 cycle visible + 1 cycle ahead = 3 minimum.
      // Add one more if the viewport is wider than one cycle.
      const needed = Math.max(3, Math.ceil(vw / cycle) + 2);
      setCopies(needed);
    };
    // Measure now, then again after image loads stabilize.
    measure();
    const raf = requestAnimationFrame(measure);
    const t1 = setTimeout(measure, 300);
    const t2 = setTimeout(measure, 1500);
    const ro = new ResizeObserver(measure);
    if (cardRef.current) ro.observe(cardRef.current);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [brandItems.length]);

  /**
   * How fast a logo crosses the screen, in pixels a second.
   *
   * The strip used to run for a fixed 30 seconds however far it had to travel,
   * which meant its speed was set by the size of the brand list: 46,800px of
   * track over 30s is 1,560px a second, roughly thirty times readable, and it
   * got worse with every brand added. Fixing the speed instead of the duration
   * makes the strip read the same whether the shop carries twelve brands or
   * six hundred.
   */
  const MARQUEE_SPEED = 50;

  const animationStyle: React.CSSProperties | undefined = cycleDistance
    ? {
        animation: `brand-marquee ${Math.round(cycleDistance / MARQUEE_SPEED)}s linear infinite`,
        ["--track-distance" as any]: `${cycleDistance}px`,
      }
    : undefined;

  // Flatten N copies of the brand list into a single list. Each card has
  // its own right margin (set inline so the JS measurement is exact).
  const cardMargin = 32; // matches gap-8 visually, no rtl/ltr surprises
  const repeated: { brand: typeof brandItems[number]; key: string }[] = [];
  for (let i = 0; i < copies; i++) {
    for (let j = 0; j < brandItems.length; j++) {
      repeated.push({
        brand: brandItems[j],
        key: `${i}-${brandItems[j].name}-${j}`,
      });
    }
  }

  return (
    <section className="py-10 sm:py-14 overflow-hidden">
      <div className="shell mb-8">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-2">
            {t("Trusted Brands")}
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            {t("Partnered with leading technology brands worldwide")}
          </p>
        </div>
      </div>

      <div className="relative" ref={containerRef}>
        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-24 sm:w-40 bg-gradient-to-r from-[var(--bg)] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 sm:w-40 bg-gradient-to-l from-[var(--bg)] to-transparent z-10 pointer-events-none" />

        <div className="flex w-max brand-marquee-track" style={animationStyle}>
          {repeated.map(({ brand, key }, index) => (
            <div
              key={key}
              ref={index === 0 ? cardRef : undefined}
              aria-hidden={index >= brandItems.length}
              className="flex-shrink-0 group cursor-pointer"
              style={{ marginRight: `${cardMargin}px` }}
            >
              <div className="flex flex-col items-center justify-center gap-2 w-44 h-24 sm:w-52 sm:h-28 rounded-2xl bg-[var(--surface)] border border-[var(--border)] px-5 hover:border-[var(--brand-primary)]/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                {brand.logo ? (
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    loading="lazy"
                    decoding="async"
                    width={120}
                    height={40}
                    className="h-8 sm:h-10 w-auto object-contain opacity-50 group-hover:opacity-100 transition-opacity duration-300 grayscale group-hover:grayscale-0"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const fallback = target.parentElement?.querySelector(
                        ".brand-fallback",
                      ) as HTMLElement;
                      if (fallback) fallback.style.display = "block";
                    }}
                  />
                ) : null}
                <span
                  className={`text-xs font-semibold text-[var(--text-subtle)] group-hover:text-[var(--brand-primary)] transition-colors duration-300 tracking-wide uppercase ${
                    brand.logo ? "" : "brand-fallback text-base"
                  }`}
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
