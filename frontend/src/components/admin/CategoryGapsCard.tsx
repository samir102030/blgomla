import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  EyeSlashIcon,
  PhotoIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { axiosInstance } from "../../lib/axios";

/**
 * Departments with no picture, and departments with nothing in them.
 *
 * After the image migration, 311 of 330 categories still rendered the grey
 * placeholder: 139 pointed at addresses on free-electronic.com that have been
 * deleted at the source — twelve sampled, twelve gone — and 172 never had an
 * image at all. Nothing outside can fix those, but nothing outside is needed:
 * every product photograph is on our own Cloudinary now, and a department full
 * of products already owns pictures of what it sells.
 *
 * Both buttons are deliberately reversible, because the counting underneath
 * them is the kind that goes wrong quietly. `productCount` counts products
 * filed *directly* under a category, so a parent whose stock all sits in its
 * children reads zero — the Electronics root reads zero with 5,656 products
 * beneath it. Anything that treated "zero" as "empty" would take out half the
 * catalogue tree. The server counts whole branches instead, and refuses to
 * hide a category holding anything anywhere below it even if asked by id.
 */

interface Gap {
  _id: string;
  name: string;
  nameAr: string;
  products: number;
  reason: string;
}

interface Empty {
  _id: string;
  name: string;
  nameAr: string;
  isActive: boolean;
  children: number;
}

interface Audit {
  categories: number;
  needsImage: number;
  empty: number;
  needsImageList: Gap[];
  emptyList: Empty[];
}

const CategoryGapsCard: React.FC = () => {
  const { i18n } = useTranslation();
  const ar = i18n.language === "ar";

  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"" | "images" | "hide" | "export">("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/categories/audit/gaps");
      setAudit(data.audit);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          (ar ? "مش قادر أقرا الأقسام" : "Could not read the categories")
      );
    } finally {
      setLoading(false);
    }
  }, [ar]);

  useEffect(() => {
    load();
  }, [load]);

  /*
    Take the whole tree away, in whichever shape it is wanted.

    Fetched through axios rather than linked with an <a href>, because the API
    authenticates by cookie and lives on its own origin — a plain link would
    arrive without one and download a 401. The bytes come back here and are
    saved from the page, which also means a failure surfaces as a message
    rather than as a file full of error JSON.
  */
  const download = async (format: "txt" | "csv" | "json") => {
    setBusy("export");
    try {
      const { data } = await axiosInstance.get(`/categories/export/tree?format=${format}`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `categories-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Freed on the next tick — revoking immediately can cancel the save in
      // some browsers before it has read the blob.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || (ar ? "مش قادر أنزّل الشجرة" : "Could not download the tree")
      );
    } finally {
      setBusy("");
    }
  };

  const fillImages = async () => {
    setBusy("images");
    try {
      const { data } = await axiosInstance.post("/categories/audit/fill-images");
      toast.success(
        ar
          ? `${data.filled} قسم خد صورة من منتجاته`
          : `${data.filled} categories took a picture from their own products`
      );
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || (ar ? "مانفعش" : "That did not work"));
    } finally {
      setBusy("");
    }
  };

  const hideEmpty = async () => {
    setBusy("hide");
    try {
      const { data } = await axiosInstance.post("/categories/audit/hide-empty");
      toast.success(
        ar
          ? `${data.hidden} قسم فاضي اتشال من المتجر`
          : `${data.hidden} empty categories taken off the storefront`
      );
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || (ar ? "مانفعش" : "That did not work"));
    } finally {
      setBusy("");
    }
  };

  /*
    Downloading the tree has nothing to do with anything being wrong with it,
    so it sits in both states — including the one where this card has collapsed
    to a single line because there is nothing left to fix. Putting it only in
    the problem view would mean the export quietly disappeared on the day the
    problems were solved.
  */
  const downloads = (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500 inline-flex items-center gap-1.5">
        <ArrowDownTrayIcon className="w-4 h-4" aria-hidden="true" />
        {ar ? "نزّل الشجرة كاملة:" : "Download the whole tree:"}
      </span>
      {([
        ["txt", ar ? "شجرة للقراءة" : "tree to read"],
        ["csv", "Excel"],
        ["json", "JSON"],
      ] as const).map(([format, label]) => (
        <button
          key={format}
          type="button"
          onClick={() => download(format)}
          disabled={busy !== ""}
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {busy === "export" ? (ar ? "بينزّل…" : "Downloading…") : label}
        </button>
      ))}
    </div>
  );

  if (loading && !audit) {
    return <div className="h-32 rounded-2xl bg-gray-100 animate-pulse" />;
  }
  if (!audit) return null;

  if (!audit.needsImage && !audit.empty) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-3">
          <Squares2X2Icon className="w-5 h-5 text-emerald-600" aria-hidden="true" />
          <p className="text-sm text-gray-600">
            {ar
              ? `كل قسم فيه بضاعة وليه صورة — ${audit.categories} قسم. مفيش حاجة ناقصة.`
              : `Every one of the ${audit.categories} categories holds stock and has a picture. Nothing missing.`}
          </p>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">{downloads}</div>
      </div>
    );
  }

  const preview = audit.needsImageList.slice(0, 8);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {ar ? "الأقسام الناقصة" : "Gaps in the categories"}
          </h2>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed max-w-2xl">
            {ar
              ? "الصور اللي كانت على مواقع تانية اتمسحت من مصدرها، فمفيش حاجة تجيبها. بس صور منتجاتك كلها بقت عندنا — والقسم يقدر ياخد صورة من اللي جواه."
              : "The pictures these pointed at were deleted at the source, so nothing can fetch them back. But every product photograph is ours now, and a category can take one from what is inside it."}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="shrink-0 p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          aria-label={ar ? "تحديث" : "Refresh"}
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: ar ? "قسم" : "categories", value: audit.categories },
          { label: ar ? "من غير صورة" : "without a picture", value: audit.needsImage },
          { label: ar ? "فاضي تمامًا" : "empty throughout", value: audit.empty },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-gray-50 border border-gray-200 p-3">
            <div className="text-xl font-bold text-gray-900 tabular-nums">{stat.value}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {audit.needsImage > 0 && (
        <div className="rounded-xl border border-gray-200 p-4 mb-3">
          <div className="flex items-start gap-3">
            <PhotoIcon className="w-5 h-5 text-[var(--brand-primary)] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {ar
                  ? `${audit.needsImage} قسم يقدر ياخد صورة من منتجاته`
                  : `${audit.needsImage} categories can take a picture from their own products`}
              </p>
              <ul className="mt-2 space-y-1">
                {preview.map((gap) => (
                  <li key={gap._id} className="text-xs text-gray-600 flex justify-between gap-3">
                    <span className="truncate">{ar && gap.nameAr ? gap.nameAr : gap.name}</span>
                    <span className="shrink-0 tabular-nums text-gray-400">
                      {gap.products} {ar ? "منتج" : "products"}
                    </span>
                  </li>
                ))}
                {audit.needsImage > preview.length && (
                  <li className="text-xs text-gray-400">
                    {ar
                      ? `و${audit.needsImage - preview.length} غيرهم`
                      : `and ${audit.needsImage - preview.length} more`}
                  </li>
                )}
              </ul>
              <button
                type="button"
                onClick={fillImages}
                disabled={busy !== ""}
                className="mt-3 px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {busy === "images"
                  ? ar
                    ? "بيحط الصور…"
                    : "Setting pictures…"
                  : ar
                    ? "خد صورة لكل قسم من منتجاته"
                    : "Give each one a picture from its products"}
              </button>
            </div>
          </div>
        </div>
      )}

      {audit.empty > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-4">
          <div className="flex items-start gap-3">
            <EyeSlashIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {ar
                  ? `${audit.empty} قسم مفيش فيه ولا منتج، ولا في أي قسم تحته`
                  : `${audit.empty} categories hold nothing, and nothing beneath them does either`}
              </p>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {ar
                  ? "بيتشالوا من المتجر ومن القوايم، وبيفضلوا موجودين. أول ما تدخل بضاعة تحت أي واحد فيهم، دوسة واحدة يرجع."
                  : "They leave the storefront and the menus and stay in the database. The day stock is filed under one, a single switch brings it back."}
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {audit.emptyList.map((cat) => (
                  <li
                    key={cat._id}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-amber-200 text-gray-700"
                  >
                    {ar && cat.nameAr ? cat.nameAr : cat.name}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={hideEmpty}
                disabled={busy !== ""}
                className="mt-3 px-4 py-2 rounded-lg border border-amber-400 text-amber-800 text-sm font-medium hover:bg-amber-100 disabled:opacity-50"
              >
                {busy === "hide"
                  ? ar
                    ? "بيشيلهم…"
                    : "Hiding…"
                  : ar
                    ? "شيلهم من المتجر"
                    : "Take them off the storefront"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-gray-100">{downloads}</div>
    </div>
  );
};

export default CategoryGapsCard;
