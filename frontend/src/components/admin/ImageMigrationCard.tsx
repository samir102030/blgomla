import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  ArrowPathIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  StopIcon,
} from "@heroicons/react/24/outline";
import { axiosInstance } from "../../lib/axios";

/**
 * Moving the catalogue's photographs onto the shop's own image account.
 *
 * Every picture on the storefront is a link to somebody else's server. They
 * load today, and they load until that server reorganises its folders, blocks
 * hotlinking, or closes — and on that day the shop has no pictures and no way
 * to get them back.
 *
 * The work is one image at a time and there are around 25,000 of them, so the
 * server does a few per request and this page keeps asking. That is what the
 * loop below is: not a progress animation over a single long call, but a real
 * count that goes down. Closing the tab stops it and loses nothing; the next
 * run picks up whatever is still pointing somewhere else.
 *
 * Two scopes, because the images are not evenly spread. A third of the products
 * carry four pictures each and account for more than half the total, while the
 * first picture of each product is the one the shop actually shows — listings,
 * search, cart, home rails. Moving only those is 46% of the work for nearly
 * everything a shopper sees, which is the right thing to run first while nobody
 * yet knows what the storage allowance will take.
 *
 * The stop button uses a ref rather than state on purpose. The loop is a plain
 * async function and would close over the state value it started with, so a
 * click during a request in flight would be read after the next one had already
 * been sent.
 */

type Scope = "primary" | "all";

interface ScopeCounts {
  remaining: number;
  migrated: number;
  total: number;
}

interface Status {
  configured: boolean;
  scopes: Record<Scope, ScopeCounts>;
  byHost: Record<string, number>;
}

interface Failure {
  url: string;
  message: string;
}

const BATCH = 30;

const ImageMigrationCard: React.FC = () => {
  const { i18n } = useTranslation();
  const ar = i18n.language === "ar";

  const [status, setStatus] = useState<Status | null>(null);
  const [scope, setScope] = useState<Scope>("primary");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [movedThisRun, setMovedThisRun] = useState(0);
  const [failures, setFailures] = useState<Failure[]>([]);
  const stop = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/upload/migration/status");
      setStatus(data);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          (ar ? "مش قادر أقرا حالة الصور" : "Could not read the image status")
      );
    } finally {
      setLoading(false);
    }
  }, [ar]);

  useEffect(() => {
    load();
  }, [load]);

  // Leaving the page must not leave a loop running against the server.
  useEffect(
    () => () => {
      stop.current = true;
    },
    []
  );

  const run = async () => {
    stop.current = false;
    setRunning(true);
    setMovedThisRun(0);
    setFailures([]);

    let moved = 0;
    try {
      // No fixed number of rounds: it ends when the server says nothing is
      // left in this scope, when a round moves nothing (so repeating it would
      // only loop on the same images), or when the operator stops it.
      for (;;) {
        if (stop.current) break;
        const { data } = await axiosInstance.post("/upload/migration/run", {
          limit: BATCH,
          scope,
        });

        moved += data.moved || 0;
        setMovedThisRun(moved);
        if (data.scopes) setStatus((s) => (s ? { ...s, scopes: data.scopes } : s));
        if (data.failures?.length) setFailures(data.failures);

        if (!data.scopes?.[scope]?.remaining) break;
        if (!data.moved) {
          toast.error(
            ar
              ? "الدفعة دي مرحّلتش أي صورة — واقفين هنا بدل ما نلف في نفس المكان"
              : "That batch moved nothing — stopping rather than looping on the same images"
          );
          break;
        }
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || (ar ? "الترحيل وقف" : "The migration stopped")
      );
    } finally {
      setRunning(false);
      stop.current = false;
      load();
    }
  };

  if (loading && !status) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }
  if (!status) return null;

  const counts = status.scopes[scope];
  const pct = counts.total ? Math.round((counts.migrated / counts.total) * 100) : 0;
  const done = counts.remaining === 0;

  const tab = (value: Scope, label: string, hint: string) => (
    <button
      type="button"
      onClick={() => setScope(value)}
      disabled={running}
      className={`flex-1 rounded-xl border px-3 py-2.5 text-start transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
        scope === value
          ? "border-[var(--brand-primary,#00A8E8)] bg-[var(--brand-primary,#00A8E8)]/5"
          : "border-gray-200 hover:bg-gray-50"
      }`}
    >
      <span className="block text-sm font-semibold text-gray-900">{label}</span>
      <span className="block text-xs text-gray-500 tabular-nums mt-0.5">{hint}</span>
    </button>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-start gap-3">
        <CloudArrowUpIcon
          className="w-6 h-6 text-[var(--brand-primary,#00A8E8)] shrink-0"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {ar ? "نقل صور المنتجات لحسابنا" : "Move product images to our own account"}
          </h2>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">
            {ar
              ? "دلوقتي كل صورة في المتجر هي لينك لسيرفر حد تاني. شغّالة النهارده، وهتفضل شغالة لحد ما السيرفر ده يغيّر مجلداته أو يقفل — ووقتها المتجر يفضل من غير صور. الزرار ده بينقلها لحسابنا، شوية شوية."
              : "Every picture on the shop is a link to somebody else's server. They work today, and they work until that server moves its folders or closes — and then the shop has no pictures. This moves them onto our own account, a few at a time."}
          </p>
        </div>
      </div>

      {!status.configured && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <ExclamationTriangleIcon
            className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-sm text-amber-900 leading-relaxed">
            {ar
              ? "السيرفر لسه مش متظبط لتخزين الصور. لازم CLOUDINARY_CLOUD_NAME و CLOUDINARY_API_KEY و CLOUDINARY_API_SECRET يتحطوا في إعدادات السيرفر، وبعدها Redeploy."
              : "This server is not set up for image storage yet. CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET have to be added to the server settings, then redeployed."}
          </p>
        </div>
      )}

      <div className="mt-5 flex gap-2">
        {tab(
          "primary",
          ar ? "الصورة الرئيسية بس" : "Main picture only",
          ar
            ? `${status.scopes.primary.total.toLocaleString()} صورة · اللي بتظهر في كل مكان`
            : `${status.scopes.primary.total.toLocaleString()} images · what the shop shows everywhere`
        )}
        {tab(
          "all",
          ar ? "كل الصور" : "Every picture",
          ar
            ? `${status.scopes.all.total.toLocaleString()} صورة · شامل صفحات المنتجات`
            : `${status.scopes.all.total.toLocaleString()} images · including product pages`
        )}
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between text-sm mb-2">
          <span className="text-gray-600">{ar ? "اتنقل" : "Moved"}</span>
          <span className="font-semibold text-gray-900 tabular-nums">
            {counts.migrated.toLocaleString()} / {counts.total.toLocaleString()}
            <span className="text-gray-400 font-normal"> · {pct}%</span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--brand-primary,#00A8E8)] transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-600 tabular-nums">
          {ar
            ? `فاضل ${counts.remaining.toLocaleString()} صورة`
            : `${counts.remaining.toLocaleString()} still on someone else's server`}
          {running && movedThisRun > 0 && (
            <span className="text-gray-400">
              {" · "}
              {ar
                ? `اتنقل دلوقتي ${movedThisRun.toLocaleString()}`
                : `${movedThisRun.toLocaleString()} this run`}
            </span>
          )}
        </p>
      </div>

      {Object.keys(status.byHost).length > 0 && (
        <ul className="mt-4 space-y-1">
          {Object.entries(status.byHost)
            .sort((a, b) => b[1] - a[1])
            .map(([host, n]) => (
              <li key={host} className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-mono text-xs truncate">{host}</span>
                <span className="text-gray-700 tabular-nums">{n.toLocaleString()}</span>
              </li>
            ))}
        </ul>
      )}

      {failures.length > 0 && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-900 mb-1">
            {ar ? "صور مرضيتش تتنقل" : "Images that would not move"}
          </p>
          <ul className="space-y-1">
            {failures.map((f) => (
              <li key={f.url} className="text-xs text-red-800 break-all">
                {f.message} — {f.url}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2">
        {running ? (
          <button
            type="button"
            onClick={() => {
              stop.current = true;
            }}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <StopIcon className="w-4 h-4" aria-hidden="true" />
            {ar ? "وقّف" : "Stop"}
          </button>
        ) : (
          <button
            type="button"
            onClick={run}
            disabled={!status.configured || done}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary,#00A8E8)] px-4 py-2.5 text-sm font-semibold text-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CloudArrowUpIcon className="w-4 h-4" aria-hidden="true" />
            {done ? (ar ? "كله اتنقل" : "All moved") : ar ? "ابدأ النقل" : "Start moving"}
          </button>
        )}
        <button
          type="button"
          onClick={load}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          {ar ? "تحديث" : "Refresh"}
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-400 leading-relaxed">
        {ar
          ? "سيبها شغالة والصفحة مفتوحة. تقدر تقفلها في أي وقت — اللي اتنقل بيفضل متنقل، والمرة الجاية بتكمّل من مكانها."
          : "Leave it running with this page open. You can stop any time — what moved stays moved, and the next run continues from there."}
      </p>
    </div>
  );
};

export default ImageMigrationCard;
