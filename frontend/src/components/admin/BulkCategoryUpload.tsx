import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import { useCategoryStore } from "../../stores/category.store";
import type { Category } from "../../types/category.type";
import SearchableTreeSelect, { type TreeOption } from "../SearchableTreeSelect";

interface RowResult {
  row: number;
  name: string;
  parent?: string;
  errors?: string[];
}

/** A row the upload refused to file, carrying the values the sheet gave it. */
interface HeldRow {
  row: number;
  name: string;
  parentName?: string;
  reason: string;
  fields: {
    nameAr?: string;
    description?: string;
    descriptionAr?: string;
    image?: string;
    sortOrder?: number;
    isActive?: boolean;
    showInMenu?: boolean;
  };
}

interface UploadResults {
  created: RowResult[];
  updated: RowResult[];
  /** Retired categories brought back — they keep the products they held. */
  restored?: RowResult[];
  linked: RowResult[];
  failed: RowResult[];
  /** Nothing was written for these; each needs a parent chosen by hand. */
  needsParent?: HeldRow[];
  totalRows: number;
}

interface Props {
  onDone?: () => void;
}

const BulkCategoryUpload: React.FC<Props> = ({ onDone }) => {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [results, setResults] = useState<UploadResults | null>(null);
  // A preview has been generated but nothing written yet.
  const [isPreview, setIsPreview] = useState(false);
  // Parent chosen for each held row, keyed by its row number in the sheet.
  const [parentPick, setParentPick] = useState<Record<number, string>>({});
  // Held rows ticked for a single bulk assignment, and the parent to give them.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkParent, setBulkParent] = useState("");

  const { categories, fetchCategories } = useCategoryStore();

  // The held rows are picked against the live catalogue, so it has to be loaded
  // before the first upload finishes rather than after the section appears.
  useEffect(() => {
    if (categories.length === 0) fetchCategories();
  }, [categories.length, fetchCategories]);

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const { data } = await axiosInstance.get("/categories/bulk-template", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "category-upload-template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("bulkCategory.templateFailed"));
    } finally {
      setDownloading(false);
    }
  };

  const send = async (dryRun: boolean) => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      // The shared axios instance defaults to Content-Type: application/json.
      // axios 1.x reacts to that by running the FormData through
      // formDataToJSON() and posting a JSON body, so the file never leaves the
      // browser and multer answers 400 "No file uploaded". Overriding the
      // header per request lets the browser build a real multipart body with a
      // boundary — the same thing every other upload in this app does.
      const { data } = await axiosInstance.post(
        `/categories/bulk-upload?dryRun=${dryRun}`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setResults(data.results);
      setIsPreview(dryRun);
      if (!dryRun) {
        toast.success(data.message);
        onDone?.();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("bulkCategory.uploadFailed"));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResults(null);
    setIsPreview(false);
    setParentPick({});
    setSelected(new Set());
    setBulkParent("");
    if (fileRef.current) fileRef.current.value = "";
  };

  /**
   * Ticking rows and giving them one parent in a single go.
   *
   * A sheet usually loses a whole branch at once — one missing department takes
   * every category under it — so the held rows are mostly headed for the same
   * place. Setting them one dropdown at a time is the same choice repeated.
   * The per-row picker stays for the ones that differ.
   */
  const heldRows = results?.needsParent ?? [];
  const allTicked = heldRows.length > 0 && heldRows.every((h) => selected.has(h.row));

  const toggleRow = (row: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });

  const toggleAll = () =>
    setSelected(allTicked ? new Set() : new Set(heldRows.map((h) => h.row)));

  const applyBulkParent = () => {
    setParentPick((prev) => {
      const next = { ...prev };
      for (const row of selected) next[row] = bulkParent;
      return next;
    });
    setSelected(new Set());
  };

  /**
   * Parent choices for the held rows, in tree order.
   *
   * `depth` drives the indentation while the list is being browsed and `trail`
   * names the ancestors, which is what makes a filtered result legible — the
   * catalogue carries more than one "Speaker", and the name alone does not say
   * which branch it sits in.
   */
  const parentOptions = useMemo<TreeOption[]>(() => {
    const parentIdOf = (c: Category) =>
      typeof c.parentCategory === "object"
        ? c.parentCategory?._id || null
        : c.parentCategory || null;

    const childrenOf = new Map<string | null, Category[]>();
    for (const c of categories) {
      if (c.deleted) continue;
      const key = parentIdOf(c);
      childrenOf.set(key, [...(childrenOf.get(key) || []), c]);
    }
    for (const list of childrenOf.values()) {
      list.sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)
      );
    }

    const options: TreeOption[] = [];
    const walk = (parentId: string | null, depth: number, trail: string[]) => {
      for (const c of childrenOf.get(parentId) || []) {
        options.push({ id: c._id, name: c.name, depth, trail });
        walk(c._id, depth + 1, [...trail, c.name]);
      }
    };
    walk(null, 0, []);
    return options;
  }, [categories]);

  /**
   * Writes the held rows with the parents just chosen.
   *
   * Only offered after a real run: during a preview the sheet's own categories
   * have not been created yet, so a parent named in the file is not there to
   * pick and the choices would be made against a catalogue that is about to
   * change.
   */
  const createHeld = async () => {
    const held = results?.needsParent ?? [];
    if (!held.length) return;

    setBusy(true);
    try {
      const { data } = await axiosInstance.post("/categories/bulk-held", {
        items: held.map((h) => ({
          name: h.name,
          ...h.fields,
          parentCategory: parentPick[h.row] || "",
        })),
      });

      const failed: RowResult[] = (data.results?.failed ?? []).map((f: any) => ({
        row: 0,
        name: f.name,
        errors: f.errors,
      }));
      const createdNames = new Set(
        (data.results?.created ?? []).map((c: any) => c.name)
      );

      // Keep only what did not get written, so a second attempt shows just the
      // rows still outstanding rather than the whole list again.
      setResults((prev) =>
        prev
          ? {
              ...prev,
              needsParent: held.filter((h) => !createdNames.has(h.name)),
              failed: [...prev.failed, ...failed],
            }
          : prev
      );

      setSelected(new Set());
      toast.success(data.message);
      await fetchCategories();
      onDone?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("bulkCategory.uploadFailed"));
    } finally {
      setBusy(false);
    }
  };

  const Section: React.FC<{ title: string; rows: RowResult[]; tone: string; showParent?: boolean }> = ({
    title,
    rows,
    tone,
    showParent,
  }) =>
    rows.length === 0 ? null : (
      <div className="mb-3">
        <h4 className={`text-sm font-semibold mb-1 ${tone}`}>
          {title} ({rows.length})
        </h4>
        <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
          {rows.map((r, i) => (
            <div key={`${r.row}-${i}`} className="px-3 py-1.5 text-sm flex gap-2">
              <span className="text-gray-400 shrink-0">#{r.row}</span>
              <span className="text-gray-900 flex-1 min-w-0 truncate">
                {r.name || "—"}
                {showParent && r.parent ? (
                  <span className="text-gray-500"> → {r.parent}</span>
                ) : null}
              </span>
              {r.errors?.length ? (
                <span className="text-red-600 shrink-0">{r.errors.join(" · ")}</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div className="bg-white rounded-lg shadow-sm border p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{t("bulkCategory.title")}</h3>
          <p className="text-sm text-gray-600">{t("bulkCategory.subtitle")}</p>
        </div>
        <button
          onClick={downloadTemplate}
          disabled={downloading}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
        >
          {downloading ? t("bulkCategory.preparing") : `⬇ ${t("bulkCategory.downloadTemplate")}`}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setResults(null);
          }}
          className="flex-1 text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
        <button
          onClick={() => send(true)}
          disabled={!file || busy}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap"
        >
          {busy ? t("bulkCategory.working") : `🔍 ${t("bulkCategory.preview")}`}
        </button>
        {isPreview && results && (
          <button
            onClick={() => send(false)}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-[#FFD600] text-[#333333] text-sm font-semibold hover:bg-[#e6c100] disabled:opacity-50 whitespace-nowrap"
          >
            {t("bulkCategory.confirm")}
          </button>
        )}
      </div>

      {results && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-900">
              {isPreview ? t("bulkCategory.previewHeading") : t("bulkCategory.doneHeading")}
              <span className="text-gray-500 font-normal">
                {" "}
                — {results.totalRows} {t("bulkCategory.rows")}
              </span>
            </p>
            <button onClick={reset} className="text-xs text-gray-500 hover:underline">
              {t("bulkCategory.clear")}
            </button>
          </div>

          <Section title={t("bulkCategory.created")} rows={results.created} tone="text-green-700" />
          <Section title={t("bulkCategory.updated")} rows={results.updated} tone="text-blue-700" />
          <Section
            title={t("bulkCategory.restored")}
            rows={results.restored ?? []}
            tone="text-purple-700"
          />
          <Section
            title={t("bulkCategory.nested")}
            rows={results.linked}
            tone="text-amber-700"
            showParent
          />
          <Section title={t("bulkCategory.failed")} rows={results.failed} tone="text-red-700" />

          {(results.needsParent?.length ?? 0) > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
              <h4 className="text-sm font-semibold text-amber-800">
                {t("bulkCategory.needsParent")} ({results.needsParent!.length})
              </h4>
              <p className="text-xs text-amber-700 mt-0.5 mb-3">
                {t("bulkCategory.needsParentHint")}
              </p>

              {/* The parent picker only appears once something is ticked —
                  before that there is nothing for it to apply to. "Select all"
                  sits at the right edge so it heads the column of tick boxes. */}
              <div className="flex flex-wrap items-center gap-2 mb-2 pb-2 border-b border-amber-200">
                {selected.size > 0 ? (
                  <>
                    <span className="text-xs font-medium text-amber-900">
                      {t("bulkCategory.selectedCount", { count: selected.size })}
                    </span>
                    <div className="w-full sm:w-64">
                      <SearchableTreeSelect
                        options={parentOptions}
                        value={bulkParent}
                        onChange={setBulkParent}
                        emptyLabel={t("categories.noParent")}
                        searchLabel={t("categories.searchParent")}
                        noResultsLabel={t("categories.noMatchingCategory")}
                      />
                    </div>
                    <button
                      onClick={applyBulkParent}
                      className="px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-amber-800 hover:bg-amber-50"
                    >
                      {t("bulkCategory.applyToSelected")}
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-amber-700">
                    {t("bulkCategory.tickToAssign")}
                  </span>
                )}

                <label className="ms-auto flex items-center gap-2 text-xs font-medium text-amber-900 cursor-pointer">
                  {t("bulkCategory.selectAll")}
                  <input
                    type="checkbox"
                    checked={allTicked}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                </label>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {results.needsParent!.map((h) => (
                  <div
                    key={h.row}
                    className={`rounded-lg border p-2.5 flex flex-col sm:flex-row sm:items-center gap-2 ${
                      selected.has(h.row)
                        ? "bg-amber-50 border-amber-400"
                        : "bg-white border-amber-200"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        <span className="text-gray-400 font-normal">#{h.row}</span> {h.name}
                      </p>
                      <p className="text-xs text-amber-700 truncate">{h.reason}</p>
                    </div>
                    <div className="sm:w-72 shrink-0">
                      <SearchableTreeSelect
                        options={parentOptions}
                        value={parentPick[h.row] ?? ""}
                        onChange={(id) =>
                          setParentPick((prev) => ({ ...prev, [h.row]: id }))
                        }
                        emptyLabel={t("categories.noParent")}
                        searchLabel={t("categories.searchParent")}
                        noResultsLabel={t("categories.noMatchingCategory")}
                      />
                    </div>
                    {/* Last in the row, so every tick box lines up in one column
                        down the right-hand edge. */}
                    <input
                      type="checkbox"
                      checked={selected.has(h.row)}
                      onChange={() => toggleRow(h.row)}
                      aria-label={h.name}
                      className="w-4 h-4 shrink-0 self-end sm:self-center rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              {isPreview ? (
                <p className="text-xs text-amber-700 mt-3">
                  {t("bulkCategory.needsParentAfterConfirm")}
                </p>
              ) : (
                <button
                  onClick={createHeld}
                  disabled={busy}
                  className="mt-3 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
                >
                  {busy ? t("bulkCategory.working") : t("bulkCategory.createHeld")}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkCategoryUpload;
