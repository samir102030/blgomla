import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { axiosInstance } from "../../lib/axios";
import { useStudentStore, type StudentCategory, type StudentProduct } from "../../stores/student.store";

/** Add or edit one product of the student section. */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product?: StudentProduct | null;
  categories: StudentCategory[];
  onSaved?: () => void;
}

const empty = {
  name: "",
  nameAr: "",
  description: "",
  descriptionAr: "",
  sku: "",
  price: "",
  stock: "0",
  studentCategory: "",
  images: [] as Array<{ url: string; alt?: string }>,
  tags: "",
  featured: false,
  isActive: true,
};

const StudentProductModal: React.FC<Props> = ({ isOpen, onClose, product, categories, onSaved }) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const saving = useStudentStore((s) => s.saving);
  const saveProduct = useStudentStore((s) => s.saveProduct);

  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      product
        ? {
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
            tags: (product.tags || []).join(", "),
            featured: !!product.featured,
            isActive: product.isActive !== false,
          }
        : empty,
    );
  }, [isOpen, product]);

  const options = useMemo(() => {
    const byParent = new Map<string, StudentCategory[]>();
    for (const c of categories) {
      const key = c.parentCategory ? String(c.parentCategory) : "root";
      byParent.set(key, [...(byParent.get(key) || []), c]);
    }
    const out: Array<{ _id: string; label: string }> = [];
    const walk = (key: string, depth: number) => {
      for (const node of (byParent.get(key) || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
        out.push({ _id: node._id, label: `${"— ".repeat(depth)}${(isAr && node.nameAr) || node.name}` });
        walk(String(node._id), depth + 1);
      }
    };
    walk("root", 0);
    return out;
  }, [categories, isAr]);

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const added: Array<{ url: string; alt?: string }> = [];
    try {
      for (const file of Array.from(files)) {
        const data = new FormData();
        data.append("image", file);
        const res = await axiosInstance.post("/upload/upload", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data?.url) added.push({ url: res.data.url, alt: file.name });
      }
      setForm((f) => ({ ...f, images: [...f.images, ...added] }));
    } catch {
      toast.error(t("Could not upload the image."));
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !(Number(form.price) > 0)) return;

    const done = await saveProduct({
      ...(product ? { _id: product._id } : {}),
      name: form.name.trim(),
      nameAr: form.nameAr.trim(),
      description: form.description,
      descriptionAr: form.descriptionAr,
      sku: form.sku.trim() || undefined,
      price: Number(form.price),
      stock: Number(form.stock) || 0,
      studentCategory: form.studentCategory || null,
      images: form.images,
      tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      featured: form.featured,
      isActive: form.isActive,
    } as any);

    if (done) {
      toast.success(product ? t("Product updated.") : t("Product added."));
      onSaved?.();
      onClose();
    }
  };

  if (!isOpen) return null;

  const field =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-[#333333]">
            {product ? t("Edit product") : t("Add product")}
          </h2>
          <button onClick={onClose} aria-label={t("Close") as string} className="text-gray-400 hover:text-gray-700">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                {t("Name (English)")} *
              </span>
              <input
                className={field}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">{t("Name (Arabic)")}</span>
              <input
                className={field}
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">{t("Department")}</span>
              <select
                className={field}
                value={form.studentCategory}
                onChange={(e) => setForm({ ...form, studentCategory: e.target.value })}
              >
                <option value="">{t("Unfiled")}</option>
                {options.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                {t("Price")} (EGP) *
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                className={field}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">{t("Stock")}</span>
              <input
                type="number"
                min={0}
                className={field}
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">{t("SKU")}</span>
              <input
                className={field}
                dir="ltr"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                {t("Description (English)")}
              </span>
              <textarea
                className={field}
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                {t("Description (Arabic)")}
              </span>
              <textarea
                className={field}
                rows={3}
                value={form.descriptionAr}
                onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
              />
            </label>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">{t("Images")}</span>
            <div className="flex flex-wrap gap-3 mb-2">
              {form.images.map((img, index) => (
                <div key={`${img.url}-${index}`} className="relative">
                  <img src={img.url} alt="" className="h-20 w-20 rounded-lg object-cover border" />
                  <button
                    type="button"
                    aria-label={t("Remove") as string}
                    onClick={() =>
                      setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }))
                    }
                    className="absolute -top-2 -end-2 h-6 w-6 rounded-full bg-red-600 text-white text-xs"
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
              className="text-sm text-gray-600"
            />
            {uploading && <p className="text-xs text-gray-500 mt-1">{t("Uploading…")}</p>}
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">{t("Tags")}</span>
            <input
              className={field}
              placeholder="arduino, kit, projects"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </label>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 accent-[var(--brand-primary)]"
              />
              <span className="text-sm font-medium text-gray-700">{t("Shown on the section")}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                className="h-4 w-4 accent-[var(--brand-primary)]"
              />
              <span className="text-sm font-medium text-gray-700">{t("Featured first")}</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-[#333333] hover:bg-gray-50 font-medium"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={saving || uploading || !form.name.trim() || !(Number(form.price) > 0)}
              className="bg-[#FFD600] text-[#333333] px-4 py-2 rounded-lg hover:bg-[#e6c100] font-medium disabled:opacity-50"
            >
              {saving ? t("Saving…") : t("Save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentProductModal;
