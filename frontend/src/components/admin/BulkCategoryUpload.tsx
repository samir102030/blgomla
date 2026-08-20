import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";

interface RowResult {
  row: number;
  name: string;
  parent?: string;
  errors?: string[];
}

interface UploadResults {
  created: RowResult[];
  updated: RowResult[];
  /** Retired categories brought back — they keep the products they held. */
  restored?: RowResult[];
  linked: RowResult[];
  failed: RowResult[];
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
      const { data } = await axiosInstance.post(
        `/categories/bulk-upload?dryRun=${dryRun}`,
        form
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
    if (fileRef.current) fileRef.current.value = "";
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
          {downloading ? t("bulkCategory.preparing") : `${t("bulkCategory.downloadTemplate")}`}
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
 {busy ? t("bulkCategory.working") : ` ${t("bulkCategory.preview")}`}
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
        </div>
      )}
    </div>
  );
};

export default BulkCategoryUpload;
