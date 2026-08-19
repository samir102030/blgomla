import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";

/**
 * Bulk loading for the student section, for either half of its catalogue.
 *
 * One component rather than two, because the two flows differ only in the
 * endpoint and which result buckets exist: download a template, fill it, get a
 * preview that writes nothing, then commit. Splitting them would mean fixing
 * the preview-before-commit behaviour twice.
 */

interface RowResult {
  row: number;
  name: string;
  parent?: string;
  errors?: string[];
}

interface UploadResults {
  created: RowResult[];
  updated: RowResult[];
  linked?: RowResult[];
  needsPrice?: RowResult[];
  createdDepartments?: string[];
  failed: RowResult[];
  totalRows: number;
}

interface Props {
  kind: "categories" | "products";
  onDone?: () => void;
}

const BulkStudentUpload: React.FC<Props> = ({ kind, onDone }) => {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [results, setResults] = useState<UploadResults | null>(null);
  /** A preview has been generated but nothing written yet. */
  const [isPreview, setIsPreview] = useState(false);

  const base = `/students/admin/catalog/${kind}`;
  const isProducts = kind === "products";

  const grab = async (path: string, filename: string) => {
    setDownloading(true);
    try {
      const { data } = await axiosInstance.get(path, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("Could not download the file."));
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
      const { data } = await axiosInstance.post(`${base}/bulk-upload?dryRun=${dryRun}`, form);
      setResults(data.results);
      setIsPreview(dryRun);
      if (!dryRun) {
        toast.success(data.message);
        onDone?.();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("The upload failed."));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResults(null);
    setIsPreview(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const Section: React.FC<{
    title: string;
    rows: RowResult[];
    tone: string;
    showParent?: boolean;
  }> = ({ title, rows, tone, showParent }) =>
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
                {showParent && r.parent ? <span className="text-gray-500"> → {r.parent}</span> : null}
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
          <h3 className="text-lg font-semibold text-[#333333]">
            {isProducts ? t("Bulk upload products") : t("Bulk upload departments")}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {isProducts
              ? t(
                  "Fill the template and load a whole shelf at once. A row can name a department that does not exist yet — it will be created.",
                )
              : t(
                  "Fill the template and load the whole tree at once. A row can name a parent defined anywhere in the sheet, above or below it.",
                )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() =>
              grab(
                `${base}/bulk-template`,
                isProducts ? "student-products-template.xlsx" : "student-departments-template.xlsx",
              )
            }
            disabled={downloading}
            className="px-4 py-2 rounded-lg border border-gray-300 text-[#333333] hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            {downloading ? t("Downloading…") : t("Download template")}
          </button>
          {isProducts && (
            <button
              onClick={() => grab(`${base}/export`, "student-products.xlsx")}
              disabled={downloading}
              className="px-4 py-2 rounded-lg border border-gray-300 text-[#333333] hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              {t("Export current")}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResults(null);
            setIsPreview(false);
          }}
          className="text-sm text-gray-600 flex-1"
        />
        {/* Preview first, always. Loading a hundred rows into a live shop
            without seeing what they will do is how a catalogue ends up with a
            hundred duplicates in it. */}
        <button
          onClick={() => send(true)}
          disabled={!file || busy}
          className="px-4 py-2 rounded-lg border border-gray-300 text-[#333333] hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
        >
          {busy && isPreview ? t("Checking…") : t("Preview")}
        </button>
        <button
          onClick={() => send(false)}
          disabled={!file || busy}
          className="bg-[#FFD600] text-[#333333] px-4 py-2 rounded-lg hover:bg-[#e6c100] transition-colors font-medium disabled:opacity-50"
        >
          {busy && !isPreview ? t("Uploading…") : t("Upload")}
        </button>
        {(file || results) && (
          <button onClick={reset} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800">
            {t("Clear")}
          </button>
        )}
      </div>

      {results && (
        <div className="mt-5 pt-5 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-3">
            {isPreview ? t("Nothing has been saved yet.") : t("Saved.")}{" "}
            <span className="text-gray-400">
              {results.totalRows} {t("rows read")}
            </span>
          </p>

          {!!results.createdDepartments?.length && (
            <p className="text-sm text-gray-600 mb-3">
              {t("New departments")}:{" "}
              <span className="text-gray-900">{results.createdDepartments.join("، ")}</span>
            </p>
          )}

          <Section title={t("New")} rows={results.created} tone="text-green-700" />
          <Section title={t("Updated")} rows={results.updated} tone="text-blue-700" />
          {!!results.linked?.length && (
            <Section title={t("Nested")} rows={results.linked} tone="text-indigo-700" showParent />
          )}
          {!!results.needsPrice?.length && (
            <Section
              title={t("Still need a price — hidden until you set one")}
              rows={results.needsPrice}
              tone="text-amber-700"
            />
          )}
          <Section title={t("Problems")} rows={results.failed} tone="text-red-700" />
        </div>
      )}
    </div>
  );
};

export default BulkStudentUpload;
