import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { axiosInstance } from "../../../lib/axios";
import { useStudentStore, type StudentProduct } from "../../../stores/student.store";
import {
  Card,
  Field,
  PageHead,
  btnGhost,
  btnPrimary,
  firstImage,
  inputCls,
  useLocalName,
} from "./shared";

/**
 * The section's products — created here, sold only here.
 *
 * They are stored in the shop's product collection with the section's mark on
 * them, which is why they can be added to a cart, charged, counted against
 * stock and put on a shipping label without any of that machinery learning a
 * second kind of product. Nothing on the storefront lists them: every product
 * query defaults to the public catalogue, so appearing there has to be asked
 * for and this section never asks.
 */

interface Draft {
  _id?: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  sku: string;
  price: string;
  stock: string;
  studentCategory: string;
  images: Array<{ url: string; alt?: string }>;
  featured: boolean;
  isActive: boolean;
}

const EMPTY: Draft = {
  name: "",
  nameAr: "",
  description: "",
  descriptionAr: "",
  sku: "",
  price: "",
  stock: "0",
  studentCategory: "",
  images: [],
  featured: false,
  isActive: true,
};

const StudentsProductsPage: React.FC = () => {
  const { t } = useTranslation();
  const localName = useLocalName();
  const {
    catalogProducts,
    catalogTotal,
    catalogPages,
    catalogCategories,
    loading,
    saving,
    fetchCatalogProducts,
    fetchCatalogCategories,
    saveProduct,
    deleteProduct,
  } = useStudentStore();

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState({ search: "", category: "", page: 1 });

  useEffect(() => {
    fetchCatalogCategories();
  }, [fetchCatalogCategories]);

  useEffect(() => {
    fetchCatalogProducts({
      page: filter.page,
      ...(filter.search ? { search: filter.search } : {}),
      ...(filter.category ? { category: filter.category } : {}),
    });
  }, [fetchCatalogProducts, filter]);

  const reload = () =>
    fetchCatalogProducts({
      page: filter.page,
      ...(filter.search ? { search: filter.search } : {}),
      ...(filter.category ? { category: filter.category } : {}),
    });

  /** Depth-first, so the dropdown reads as the tree it is. */
  const options = useMemo(() => {
    const byParent = new Map<string, typeof catalogCategories>();
    for (const c of catalogCategories) {
      const key = c.parentCategory ? String(c.parentCategory) : "root";
      byParent.set(key, [...(byParent.get(key) || []), c]);
    }
    const out: Array<{ _id: string; label: string }> = [];
    const walk = (key: string, depth: number) => {
      for (const node of (byParent.get(key) || []).sort((a, b) => a.order - b.order)) {
        out.push({ _id: node._id, label: `${"— ".repeat(depth)}${localName(node)}` });
        walk(String(node._id), depth + 1);
      }
    };
    walk("root", 0);
    return out;
  }, [catalogCategories, localName]);

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const added: Array<{ url: string; alt?: string }> = [];
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("image", file);
        const { data } = await axiosInstance.post("/upload/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (data?.url) added.push({ url: data.url, alt: file.name });
      }
      setDraft((d) => ({ ...d, images: [...d.images, ...added] }));
    } catch {
      toast.error(t("Could not upload the image."));
    } finally {
      setUploading(false);
    }
  };

  const open = (product?: StudentProduct) => {
    if (!product) {
      setDraft(EMPTY);
    } else {
      setDraft({
        _id: product._id,
        name: product.name || "",
        nameAr: product.nameAr || "",
        description: product.description || "",
        descriptionAr: product.descriptionAr || "",
        sku: product.sku || "",
        price: String(product.price ?? ""),
        stock: String(product.stock ?? 0),
        studentCategory:
          typeof product.studentCategory === "string"
            ? product.studentCategory
            : product.studentCategory?._id || "",
        images: (product.images || []).map((i) => ({ url: i.url || "", alt: i.alt })),
        featured: !!product.featured,
        isActive: product.isActive !== false,
      });
    }
    setEditing(true);
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !(Number(draft.price) > 0)) return;

    const done = await saveProduct({
      ...(draft._id ? { _id: draft._id } : {}),
      name: draft.name.trim(),
      nameAr: draft.nameAr.trim(),
      description: draft.description,
      descriptionAr: draft.descriptionAr,
      sku: draft.sku.trim() || undefined,
      price: Number(draft.price),
      stock: Number(draft.stock) || 0,
      studentCategory: draft.studentCategory || null,
      images: draft.images,
      featured: draft.featured,
      isActive: draft.isActive,
    } as any);

    if (done) {
      toast.success(draft._id ? t("Product updated.") : t("Product added."));
      setEditing(false);
      setDraft(EMPTY);
      reload();
    }
  };

  const onRemove = async (product: StudentProduct) => {
    if (!window.confirm(t("Remove this product?") as string)) return;
    if (await deleteProduct(product._id)) {
      toast.success(t("Product removed."));
      reload();
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <PageHead
        title={t("Products")}
        description={t(
          "The section's own products. They exist here and nowhere else on the shop, and they are bought, paid for and shipped through the same checkout as everything else.",
        )}
      >
        <button onClick={() => open()} className={btnPrimary}>
          {t("New product")}
        </button>
      </PageHead>

      {editing && (
        <Card title={draft._id ? t("Edit product") : t("New product")}>
          <form onSubmit={onSubmit}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4">
              <Field label={t("Name (English)")}>
                <input
                  className={inputCls}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <Field label={t("Name (Arabic)")}>
                <input
                  className={inputCls}
                  value={draft.nameAr}
                  onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })}
                />
              </Field>
              <Field label={t("Department")}>
                <select
                  className={inputCls}
                  value={draft.studentCategory}
                  onChange={(e) => setDraft({ ...draft, studentCategory: e.target.value })}
                >
                  <option value="">{t("Unfiled")}</option>
                  {options.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`${t("Price")} (EGP)`}>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputCls}
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                />
              </Field>
              <Field label={t("Stock")}>
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={draft.stock}
                  onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
                />
              </Field>
              <Field label={t("SKU")} hint={t("Optional. Must be unique if set.")}>
                <input
                  className={inputCls}
                  dir="ltr"
                  value={draft.sku}
                  onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                />
              </Field>
            </div>

            <Field label={t("Description (English)")}>
              <textarea
                className={inputCls}
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </Field>
            <Field label={t("Description (Arabic)")}>
              <textarea
                className={inputCls}
                rows={3}
                value={draft.descriptionAr}
                onChange={(e) => setDraft({ ...draft, descriptionAr: e.target.value })}
              />
            </Field>

            <Field label={t("Images")}>
              <div className="flex flex-wrap gap-3 mb-3">
                {draft.images.map((img, index) => (
                  <div key={`${img.url}-${index}`} className="relative">
                    <img
                      src={img.url}
                      alt=""
                      className="w-20 h-20 rounded-lg object-cover border border-[var(--border)]"
                    />
                    <button
                      type="button"
                      aria-label={t("Remove") as string}
                      onClick={() =>
                        setDraft((d) => ({ ...d, images: d.images.filter((_, i) => i !== index) }))
                      }
                      className="absolute -top-2 -end-2 w-6 h-6 rounded-full bg-[var(--danger)] text-white text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={(e) => onUpload(e.target.files)}
                className="text-sm text-[var(--text-muted)]"
              />
              {uploading && (
                <span className="block text-xs text-[var(--text-muted)] mt-1">{t("Uploading…")}</span>
              )}
            </Field>

            <div className="flex flex-wrap gap-6 mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                  className="w-5 h-5 accent-[var(--brand-primary)]"
                />
                <span className="text-sm font-semibold text-[var(--text)]">{t("Shown on the section")}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.featured}
                  onChange={(e) => setDraft({ ...draft, featured: e.target.checked })}
                  className="w-5 h-5 accent-[var(--brand-primary)]"
                />
                <span className="text-sm font-semibold text-[var(--text)]">{t("Featured first")}</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving || uploading || !draft.name.trim() || !(Number(draft.price) > 0)}
                className={btnPrimary}
              >
                {saving ? t("Saving…") : t("Save product")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setDraft(EMPTY);
                }}
                className={btnGhost}
              >
                {t("Cancel")}
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card title={`${t("Products")} · ${catalogTotal}`}>
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            className={`${inputCls} max-w-[280px]`}
            placeholder={t("Search products") as string}
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value, page: 1 })}
          />
          <select
            className={`${inputCls} max-w-[240px]`}
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value, page: 1 })}
          >
            <option value="">{t("All departments")}</option>
            {options.map((o) => (
              <option key={o._id} value={o._id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {!catalogProducts.length && !loading && (
          <p className="text-sm text-[var(--text-muted)]">
            {catalogCategories.length
              ? t("No products yet.")
              : t("Add a department first — a product needs somewhere to sit.")}
          </p>
        )}

        <div className="divide-y divide-[var(--border)]">
          {catalogProducts.map((p) => (
            <div key={p._id} className="flex items-center gap-3 py-3">
              <img
                src={firstImage(p.images) || "/placeholder.png"}
                alt=""
                className="w-12 h-12 rounded-lg object-cover bg-[var(--surface-2)] flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[var(--text)] truncate">{localName(p)}</div>
                <div className="text-xs text-[var(--text-muted)] font-mono">
                  {p.price} EGP · {t("Stock")} {p.stock ?? 0}
                  {typeof p.studentCategory === "object" && p.studentCategory
                    ? ` · ${localName(p.studentCategory)}`
                    : ""}
                </div>
              </div>
              {p.isActive === false && (
                <span className="text-xs px-2 py-1 rounded bg-[var(--surface-2)] text-[var(--text-muted)]">
                  {t("Hidden")}
                </span>
              )}
              <button onClick={() => open(p)} className="text-sm text-[var(--brand-primary)] hover:underline">
                {t("Edit")}
              </button>
              <button onClick={() => onRemove(p)} className="text-sm text-[var(--danger)] hover:underline">
                {t("Remove")}
              </button>
            </div>
          ))}
        </div>

        {catalogPages > 1 && (
          <div className="flex items-center gap-2 mt-4">
            <button
              disabled={filter.page <= 1}
              onClick={() => setFilter({ ...filter, page: filter.page - 1 })}
              className="px-3 py-1.5 rounded border border-[var(--border)] text-sm disabled:opacity-40"
            >
              {t("Previous")}
            </button>
            <span className="text-sm text-[var(--text-muted)]">
              {filter.page} / {catalogPages}
            </span>
            <button
              disabled={filter.page >= catalogPages}
              onClick={() => setFilter({ ...filter, page: filter.page + 1 })}
              className="px-3 py-1.5 rounded border border-[var(--border)] text-sm disabled:opacity-40"
            >
              {t("Next")}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StudentsProductsPage;
