import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cldImg, cldSrcSet } from "../lib/cldImage";

interface ProductGalleryProps {
  images: string[];
  alt: string;
}

const ProductGallery: React.FC<ProductGalleryProps> = ({ images, alt }) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const frameRef = useRef<HTMLDivElement>(null);

  const count = images.length;
  const hasMultiple = count > 1;

  // Keep the selected index valid if the image list changes (product switch).
  useEffect(() => {
    setSelected((i) => (i < count ? i : 0));
  }, [count]);

  const go = useCallback(
    (dir: 1 | -1) => setSelected((i) => (i + dir + count) % count),
    [count]
  );

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  };

  // Lightbox: keyboard nav + body scroll lock.
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen, go]);

  const current = images[selected];

  const arrowBtn =
    "absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-black/45 text-white hover:bg-black/70 transition-colors backdrop-blur-sm";

  return (
    <div>
      {/* Main image — hover to zoom, click to open lightbox */}
      <div className="relative group">
        <div
          ref={frameRef}
          onMouseEnter={() => setZoom(true)}
          onMouseLeave={() => setZoom(false)}
          onMouseMove={handleMove}
          onClick={() => setLightboxOpen(true)}
          className="aspect-square bg-[var(--surface-2)] rounded-lg overflow-hidden mb-4 cursor-zoom-in"
        >
          <img
            src={cldImg(current, { w: 800 })}
            srcSet={cldSrcSet(current, 400)}
            sizes="(min-width: 1024px) 600px, 100vw"
            alt={alt}
            fetchPriority="high"
            decoding="async"
            style={{
              transformOrigin: origin,
              transform: zoom ? "scale(2)" : "scale(1)",
              transition: "transform 200ms ease-out",
            }}
            className="w-full h-full object-contain"
          />
        </div>

        {hasMultiple && (
          <>
            <button
              type="button"
              aria-label={t("Previous image")}
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className={`${arrowBtn} left-2 opacity-0 group-hover:opacity-100 focus:opacity-100`}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label={t("Next image")}
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className={`${arrowBtn} right-2 opacity-0 group-hover:opacity-100 focus:opacity-100`}
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {hasMultiple && (
        <div className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={t("View image {{n}}", { n: index + 1 })}
              aria-current={selected === index}
              className={`w-20 h-20 bg-[var(--surface-2)] rounded-lg overflow-hidden border-2 transition-colors ${
                selected === index
                  ? "border-blue-500"
                  : "border-transparent hover:border-[var(--border)]"
              }`}
            >
              <img
                src={cldImg(image, { w: 160 })}
                alt={`${alt} ${index + 1}`}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("Image viewer")}
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white/90">
            <span className="text-sm tabular-nums">
              {selected + 1} / {count}
            </span>
            <button
              type="button"
              aria-label={t("Close")}
              onClick={() => setLightboxOpen(false)}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 text-2xl"
            >
              ×
            </button>
          </div>

          <div
            className="relative flex-1 flex items-center justify-center px-4 min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            {hasMultiple && (
              <button
                type="button"
                aria-label={t("Previous image")}
                onClick={() => go(-1)}
                className={`${arrowBtn} left-4`}
              >
                ‹
              </button>
            )}
            <img
              src={cldImg(current, { w: 1600 })}
              alt={alt}
              decoding="async"
              className="max-h-full max-w-full object-contain"
            />
            {hasMultiple && (
              <button
                type="button"
                aria-label={t("Next image")}
                onClick={() => go(1)}
                className={`${arrowBtn} right-4`}
              >
                ›
              </button>
            )}
          </div>

          {hasMultiple && (
            <div
              className="flex gap-2 overflow-x-auto justify-center px-4 py-4"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((image, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelected(index)}
                  aria-current={selected === index}
                  className={`shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                    selected === index
                      ? "border-blue-400"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={cldImg(image, { w: 128 })}
                    alt={`${alt} ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain bg-black/20"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
