import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { axiosInstance } from "../../lib/axios";
import { useStudentStore, type StudentCategory } from "../../stores/student.store";

/**
 * Add or edit one department of the student section.
 *
 * The parent dropdown drops the department being edited and everything beneath
 * it. Offering them would let somebody file a branch inside itself, which
 * detaches it from the tree: nothing reaches it, and every walk over it has to
 * be defended against running forever. The server refuses this too — this is
 * the half that stops it being offered in the first place.
 */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  category?: StudentCategory | null;
  categories: StudentCategory[];
  defaultParentId?: string;
}

const empty = {
  name: "",
  nameAr: "",
  description: "",
  descriptionAr: "",
  image: "",
  parentCategory: "",
  order: 0,
  active: true,
};

const StudentCategoryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  category,
  categories,
  defaultParentId = "",
}) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const saving = useStudentStore((s) => s.saving);
  const saveCategory = useStudentStore((s) => s.saveCategory);

  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      category
        ? {
            name: category.name || "",
            nameAr: category.nameAr || "",
            description: category.description || "",
            descriptionAr: category.descriptionAr || "",
            image: category.image || "",
            parentCategory: category.parentCategory ? String(category.parentCategory) : "",
            order: category.order ?? 0,
            active: category.active !== false,
          }
        : { ...empty, parentCategory: defaultParentId },
    );
  }, [isOpen, category, defaultParentId]);

  /** The tree, minus the branch being edited, flattened for a <select>. */
  const options = useMemo(() => {
    const byParent = new Map<string, StudentCategory[]>();
    for (const c of categories) {
      const key = c.parentCategory ? String(c.parentCategory) : "root";
      byParent.set(key, [...(byParent.get(key) || []), c]);
    }
    const blocked = new Set<string>();
    if (category) {
      const mark = (id: string) => {
        blocked.add(id);
        for (const child of byParent.get(id) || []) mark(String(child._id));
      };
      mark(String(category._id));
    }

    const out: Array<{ _id: string; label: string }> = [];
    const walk = (key: string, depth: number) => {
      for (const node of (byParent.get(key) || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
        if (blocked.has(String(node._id))) continue;
        out.push({
          _id: node._id,
          label: `${"— ".repeat(depth)}${(isAr && node.nameAr) || node.name}`,
        });
        walk(String(node._id), depth + 1);
      }
    };
    walk("root", 0);
    return out;
  }, [categories, category, isAr]);

  const onUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append("image", file);
      const res = await axiosInstance.post("/upload/upload", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.url) setForm((f) => ({ ...f, image: res.data.url }));
    } catch {
      toast.error(t("Could not upload the image."));
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    const done = await saveCategory({
      ...(category ? { _id: category._id } : {}),
      name: form.name.trim(),
      nameAr: form.nameAr.trim(),
      description: form.description,
      descriptionAr: form.descriptionAr,
      image: form.image,
      parentCategory: form.parentCategory || null,
      order: Number(form.order) || 0,
      active: form.active,
    });
    if (done) {
      toast.success(category ? t("Department updated.") : t("Department added."));
      onClose();
    }
  };

  if (!isOpen) return null;

  const field =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-[#333333]">
            {category ? t("Edit department") : t("Add department")}
          </h2>
          <button onClick={onClose} aria-label={t("Close") as string} className="text-gray-400 hover:text-gray-700">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                {t("Name (English)")} *
              </span>
              <input
                className={field}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Lab equipment"
                required
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">{t("Name (Arabic)")}</span>
              <input
                className={field}
                value={form.nameAr}
                onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                placeholder="أدوات معمل"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">{t("Sits under")}</span>
              <select
                className={field}
                value={form.parentCategory}
                onChange={(e) => setForm({ ...form, parentCategory: e.target.value })}
              >
                <option value="">{t("Top level")}</option>
                {options.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">{t("Order")}</span>
              <input
                type="number"
                className={field}
                value={form.order}
                onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">
              {t("Description (English)")}
            </span>
            <textarea
              className={field}
              rows={2}
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
              rows={2}
              value={form.descriptionAr}
              onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
            />
          </label>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">{t("Image")}</span>
            <div className="flex items-center gap-3">
              {form.image && (
                <img src={form.image} alt="" className="h-16 w-16 rounded-lg object-cover border" />
              )}
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
                className="text-sm text-gray-600"
              />
              {form.image && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, image: "" })}
                  className="text-sm text-red-600 hover:underline"
                >
                  {t("Remove")}
                </button>
              )}
            </div>
            {uploading && <p className="text-xs text-gray-500 mt-1">{t("Uploading…")}</p>}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 accent-[var(--brand-primary)]"
            />
            <span className="text-sm font-medium text-gray-700">{t("Shown on the section")}</span>
          </label>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-[#333333] hover:bg-gray-50 font-medium"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={saving || uploading || !form.name.trim()}
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

export default StudentCategoryModal;
