import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { axiosInstance } from "../lib/axios";
import { cldImg } from "../lib/cldImage";

interface Purchase {
  firstName: string;
  city: string;
  product: string;
  productAr?: string;
  image: string;
  createdAt: string;
}

const SKIP_PATHS = ["/dashboard", "/vendor", "/checkout"];
const SHOW_MS = 6000;
const GAP_MS = 12000;

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const SocialProofToast: React.FC = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("socialProofDismissed") === "true"
  );
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (dismissed) return;
    if (SKIP_PATHS.some((p) => window.location.pathname.startsWith(p))) return;
    axiosInstance
      .get("/social-proof/recent-purchases")
      .then(({ data }) => setPurchases(data.purchases || []))
      .catch(() => {});
  }, [dismissed]);

  useEffect(() => {
    if (dismissed || purchases.length === 0) return;
    const clearAll = () => {
      timers.current.forEach((id) => clearTimeout(id));
      timers.current = [];
    };
    const show = window.setTimeout(() => setVisible(true), 4000);
    timers.current.push(show);
    return clearAll;
  }, [purchases, dismissed]);

  useEffect(() => {
    if (!visible) return;
    const hide = window.setTimeout(() => setVisible(false), SHOW_MS);
    const next = window.setTimeout(() => {
      setIndex((i) => (i + 1) % purchases.length);
      setVisible(true);
    }, SHOW_MS + GAP_MS);
    timers.current.push(hide, next);
    return () => {
      clearTimeout(hide);
      clearTimeout(next);
    };
  }, [visible, index, purchases.length]);

  if (dismissed || purchases.length === 0) return null;

  const p = purchases[index % purchases.length];
  const name = p.productAr && isRtl ? p.productAr : p.product;

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("socialProofDismissed", "true");
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={`fixed bottom-4 ltr:left-4 rtl:right-4 z-40 max-w-[19rem] transition-all duration-500 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xl p-2.5 pr-8 rtl:pr-2.5 rtl:pl-8 relative">
        {p.image && (
          <img
            src={cldImg(p.image, { w: 96 })}
            alt=""
            width={48}
            height={48}
            loading="lazy"
            decoding="async"
            className="w-12 h-12 rounded-lg object-cover shrink-0 bg-[var(--surface-2)]"
          />
        )}
        <div className="min-w-0">
          <p className="text-xs text-[var(--text)] leading-snug">
            <span className="font-semibold">{p.firstName}</span>
            {p.city ? (
              <span className="text-[var(--text-muted)]"> · {p.city}</span>
            ) : null}
          </p>
          <p className="text-xs text-[var(--text-muted)] truncate">
            bought <span className="text-[var(--text)]">{name}</span>
          </p>
          <p className="text-[10px] text-[var(--text-subtle)] mt-0.5">
 {timeAgo(p.createdAt)} · verified
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label={t("Dismiss")}
          className="absolute top-1.5 ltr:right-1.5 rtl:left-1.5 p-1 rounded-full hover:bg-[var(--surface-2)]"
        >
          <XMarkIcon className="h-3.5 w-3.5 text-[var(--text-muted)]" />
        </button>
      </div>
    </div>
  );
};

export default SocialProofToast;
