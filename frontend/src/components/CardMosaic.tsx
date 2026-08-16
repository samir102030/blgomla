import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMosaicStore, type MosaicCard, type MosaicTile } from "../stores/mosaic.store";
import { cldImg, cldSrcSet } from "../lib/cldImage";

// Internal links use the SPA router; absolute/external links use a plain anchor.
const SmartLink: React.FC<{
  to?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ to, className, children }) => {
  if (!to) return <div className={className}>{children}</div>;
  if (/^https?:\/\//i.test(to)) {
    return (
      <a href={to} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
};

const CardMosaic: React.FC = () => {
  const { t, i18n } = useTranslation();
  const activeCards = useMosaicStore((s) => s.activeCards);
  const fetchActiveMosaicCards = useMosaicStore((s) => s.fetchActiveMosaicCards);
  const isAr = i18n.language === "ar";
  const seeMore = isAr ? "اعرض المزيد" : t("See more");

  useEffect(() => {
    fetchActiveMosaicCards();
  }, [fetchActiveMosaicCards]);

  if (!activeCards || activeCards.length === 0) return null;

  const tileLabel = (tile: MosaicTile) =>
    (isAr ? tile.labelAr || tile.label : tile.label) || "";

  // The /mosaic-cards/active envelope isn't walked by the localize middleware,
  // so pick the localized title on the client from the titleAr in the payload.
  const cardTitle = (card: MosaicCard) =>
    (isAr ? card.titleAr || card.title : card.title) || "";

  const renderCard = (card: MosaicCard) => {
    const title = cardTitle(card);
    const cardShell =
      "group bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col h-full";

    if (card.type === "single") {
      return (
        <SmartLink key={card._id} to={card.link} className={cardShell}>
          <div className="p-4 pb-2">
            <h3 className="text-base font-bold text-[var(--text)] line-clamp-1">
              {title}
            </h3>
          </div>
          <div className="px-4 flex-1">
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[var(--surface-2)]">
              <img
                src={cldImg(card.image, { w: 600 })}
                srcSet={cldSrcSet(card.image, 300)}
                sizes="(min-width: 1024px) 320px, 100vw"
                alt={title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
          {card.link && (
            <div className="p-4 pt-3">
              <span className="text-sm font-semibold text-[var(--brand-nav)] dark:text-[var(--brand-accent)] inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                {seeMore}
                <span aria-hidden="true">{isAr ? "‹" : "›"}</span>
              </span>
            </div>
          )}
        </SmartLink>
      );
    }

    // Quadrant: up to 4 sub-category tiles + a "see more" link.
    const tiles = (card.tiles || []).slice(0, 4);
    return (
      <div key={card._id} className={cardShell}>
        <div className="p-4 pb-2">
          <h3 className="text-base font-bold text-[var(--text)] line-clamp-1">
            {title}
          </h3>
        </div>
        <div className="px-4 flex-1">
          <div className="grid grid-cols-2 gap-2">
            {tiles.map((tile, i) => (
              <SmartLink
                key={i}
                to={tile.link}
                className="group/tile block"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-[var(--surface-2)]">
                  <img
                    src={cldImg(tile.image, { w: 240 })}
                    srcSet={cldSrcSet(tile.image, 120)}
                    sizes="160px"
                    alt={tileLabel(tile)}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover/tile:scale-105 transition-transform duration-300"
                  />
                </div>
                {tileLabel(tile) && (
                  <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-1">
                    {tileLabel(tile)}
                  </p>
                )}
              </SmartLink>
            ))}
          </div>
        </div>
        {card.link && (
          <div className="p-4 pt-3">
            <SmartLink
              to={card.link}
              className="text-sm font-semibold text-[var(--brand-nav)] dark:text-[var(--brand-accent)] inline-flex items-center gap-1 hover:gap-2 transition-all"
            >
              {seeMore}
              <span aria-hidden="true">{isAr ? "‹" : "›"}</span>
            </SmartLink>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="shell py-8 sm:py-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 stagger-children">
        {activeCards.map(renderCard)}
      </div>
    </section>
  );
};

export default CardMosaic;
