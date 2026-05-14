import React, { useEffect, useState } from "react";
import { axiosInstance } from "../lib/axios";
import { useTranslation } from "react-i18next";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated: () => void;
  product: any;
  brands: any[];
  categories: any[];
}

const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  onProductUpdated,
  product,
  brands,
  categories,
}) => {
  const [updating, setUpdating] = useState(false);
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: "",
    nameAr: "",
    description: "",
    descriptionAr: "",
    price: "",
    stock: "0",
    brand: "",
    category: "",
    salePercentage: "",
    saleActive: false,
    isActive: true,
    featured: false,
    tags: [] as string[],
    features: [] as string[],
    attributes: [] as { name: string; value: string }[],
    bulkPricing: [] as { minQty: string; unitPrice: string }[],
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);

  // Reset form when modal opens with product data
  useEffect(() => {
    if (isOpen && product) {
      setForm({
        name: product.name || "",
        nameAr: product.nameAr || "",
        description: product.description || "",
        descriptionAr: product.descriptionAr || "",
        price: product.price?.toString() || "",
        stock: product.stock?.toString() || "0",
        brand: product.brand || "",
        category: product.category || "",
        salePercentage: product.salePercentage?.toString() || "",
        saleActive: product.saleActive || false,
        isActive: product.isActive ?? true,
        featured: product.featured || false,
        tags: product.tags || [],
        features: product.features || [],
        attributes: product.attributes || [],
        bulkPricing: Array.isArray(product.bulkPricing)
          ? product.bulkPricing.map((rule: any) => ({
              minQty: rule.minQty?.toString() || "",
              unitPrice: rule.unitPrice?.toString() || "",
            }))
          : [],
      });
      setFiles([]);
      setPreviews([]);
      setExistingImages(product.images || []);
    }
  }, [isOpen, product]);

  // Handle image previews for new files
  useEffect(() => {
    if (files.length === 0) {
      setPreviews([]);
      return;
    }
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviews(newPreviews);
    return () => {
      newPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (dropped.length) setFiles((prev) => [...prev, ...dropped]);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      // Upload new files sequentially
      const newImages: { url: string; alt?: string }[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("image", file);
        const res = await axiosInstance.post("/upload/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data && res.data.url) {
          newImages.push({ url: res.data.url, alt: file.name });
        }
      }

      // Combine existing and new images
      const allImages = [...existingImages, ...newImages];

      const payload: any = {
        name: form.name,
        nameAr: form.nameAr,
        description: form.description,
        descriptionAr: form.descriptionAr,
        price: Number(form.price),
        stock: Number(form.stock),
        images: allImages,
        salePercentage: Number(form.salePercentage) || 0,
        saleActive: form.saleActive,
        isActive: form.isActive,
        featured: form.featured,
        tags: form.tags,
        features: form.features,
        attributes: form.attributes,
        bulkPricing: form.bulkPricing
          .map((rule) => ({
            minQty: Number(rule.minQty),
            unitPrice: Number(rule.unitPrice),
          }))
          .filter(
            (rule) =>
              Number.isFinite(rule.minQty) &&
              Number.isFinite(rule.unitPrice) &&
              rule.minQty >= 1 &&
              rule.unitPrice > 0
          ),
      };
      if (form.brand) payload.brand = form.brand;
      if (form.category) payload.category = form.category;

      // Import updateProduct from store here to avoid circular imports
      const { useProductStore } = await import("../stores/product.store");
      const updateProduct = useProductStore.getState().updateProduct;

      const updated = await updateProduct(product._id, payload);
      if (updated) {
        onClose();
        onProductUpdated();
      }
    } catch (err) {
      console.error("Update product error:", err);
    } finally {
      setUpdating(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-gray-100 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-900">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-1">
              {t("modal.editProduct.title")}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              {t("modal.editProduct.subtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 rounded-full transition-colors duration-200"
            aria-label={t("modal.common.close")}
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleUpdate}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 px-8 py-6 overflow-y-auto max-h-[calc(90vh-140px)] bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
        >
          {/* Left: image management */}
          <div className="md:col-span-1 space-y-4">
            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("modal.editProduct.currentImages")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {existingImages.map((img, idx) => (
                    <div key={`existing-${idx}`} className="relative group">
                      <img
                        src={img.url}
                        alt={`existing-${idx}`}
                        className="h-20 w-full object-cover rounded-lg border"
                       loading="lazy" decoding="async"/>
                      <button
                        type="button"
                        onClick={() => removeExistingImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Image Uploader */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("modal.editProduct.addNewImages")}
              </label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() =>
                  document.getElementById("edit-product-images-input")?.click()
                }
                className="border-2 border-dashed border-gray-200 rounded-lg p-3 h-32 flex flex-col items-center justify-center text-center cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <p className="text-sm text-gray-500">
                  {t("modal.editProduct.dragDrop")}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {t("modal.editProduct.supportsMultiple")}
                </p>
                <input
                  id="edit-product-images-input"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* New Image Previews */}
            {previews.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("modal.editProduct.newImagesPreview")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {previews.map((src, idx) => (
                    <div key={`new-${idx}`} className="relative group">
                      <img
                        src={src}
                        alt={`new-preview-${idx}`}
                        className="h-20 w-full object-cover rounded-lg border"
                       loading="lazy" decoding="async"/>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: form fields */}
          <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("modal.editProduct.nameLabel")} (English)
                </label>
                <input
                  required
                  placeholder={t("modal.editProduct.namePlaceholder")}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  الاسم (عربي)
                </label>
                <input
                  dir="rtl"
                  placeholder="اسم المنتج"
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("modal.editProduct.priceLabel")}
                </label>
                <input
                  required
                  placeholder={t("modal.editProduct.pricePlaceholder")}
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("modal.editProduct.brandLabel")}
                </label>
                <select
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                >
                  <option value="">{t("modal.editProduct.brandSelect")}</option>
                  {brands?.map((b: any) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("modal.editProduct.categoryLabel")}
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                >
                  <option value="">
                    {t("modal.editProduct.categorySelect")}
                  </option>
                  {categories.map((c: any) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("modal.editProduct.salePercentageLabel")}
                </label>
                <input
                  placeholder={t("modal.editProduct.salePercentagePlaceholder")}
                  type="number"
                  min="0"
                  max="100"
                  value={form.salePercentage}
                  onChange={(e) =>
                    setForm({ ...form, salePercentage: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("modal.editProduct.stockLabel")}
                </label>
                <input
                  placeholder={t("modal.editProduct.stockPlaceholder")}
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.saleActive}
                  onChange={(e) =>
                    setForm({ ...form, saleActive: e.target.checked })
                  }
                  className="mr-2 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  {t("modal.editProduct.saleActive")}
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="mr-2 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  {t("modal.editProduct.isActive")}
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) =>
                    setForm({ ...form, featured: e.target.checked })
                  }
                  className="mr-2 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  {t("modal.editProduct.featured")}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("modal.editProduct.descriptionLabel")} (English)
                </label>
                <textarea
                  placeholder={t("modal.editProduct.descriptionPlaceholder")}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  الوصف (عربي)
                </label>
                <textarea
                  dir="rtl"
                  placeholder="وصف موجز"
                  value={form.descriptionAr}
                  onChange={(e) =>
                    setForm({ ...form, descriptionAr: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                />
              </div>
            </div>

            {/* Bulk Pricing */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Bulk Pricing Rules
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      bulkPricing: [
                        ...form.bulkPricing,
                        { minQty: "", unitPrice: "" },
                      ],
                    })
                  }
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Add Rule
                </button>
              </div>
              {form.bulkPricing.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Add rules like min quantity 6 {"=>"} unit price 95.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.bulkPricing.map((rule, idx) => (
                    <div
                      key={`bulk-${idx}`}
                      className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center"
                    >
                      <input
                        type="number"
                        min="1"
                        placeholder="Min Qty"
                        value={rule.minQty}
                        onChange={(e) => {
                          const next = [...form.bulkPricing];
                          next[idx] = {
                            ...next[idx],
                            minQty: e.target.value,
                          };
                          setForm({ ...form, bulkPricing: next });
                        }}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Unit Price"
                        value={rule.unitPrice}
                        onChange={(e) => {
                          const next = [...form.bulkPricing];
                          next[idx] = {
                            ...next[idx],
                            unitPrice: e.target.value,
                          };
                          setForm({ ...form, bulkPricing: next });
                        }}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            bulkPricing: form.bulkPricing.filter(
                              (_, i) => i !== idx
                            ),
                          })
                        }
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("modal.editProduct.tagsLabel")}
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  id="edit-tag-input"
                  placeholder={t("modal.editProduct.tagsAddPlaceholder")}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById(
                      "edit-tag-input"
                    ) as HTMLInputElement;
                    if (input.value.trim()) {
                      setForm({
                        ...form,
                        tags: [...form.tags, input.value.trim()],
                      });
                      input.value = "";
                    }
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t("modal.editProduct.addButton")}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          tags: form.tags.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-blue-600 hover:text-blue-800 ml-1"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("modal.editProduct.featuresLabel")}
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  id="edit-feature-input"
                  placeholder={t("modal.editProduct.featuresAddPlaceholder")}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById(
                      "edit-feature-input"
                    ) as HTMLInputElement;
                    if (input.value.trim()) {
                      setForm({
                        ...form,
                        features: [...form.features, input.value.trim()],
                      });
                      input.value = "";
                    }
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t("modal.editProduct.addButton")}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.features.map((feature, idx) => (
                  <span
                    key={idx}
                    className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                  >
                    {feature}
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          features: form.features.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-green-600 hover:text-green-800 ml-1"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Attributes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("modal.editProduct.attributesLabel")}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <input
                  id="edit-attr-name-input"
                  placeholder={t("modal.editProduct.attrNamePlaceholder")}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                />
                <input
                  id="edit-attr-value-input"
                  placeholder={t("modal.editProduct.attrValuePlaceholder")}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nameInput = document.getElementById(
                      "edit-attr-name-input"
                    ) as HTMLInputElement;
                    const valueInput = document.getElementById(
                      "edit-attr-value-input"
                    ) as HTMLInputElement;
                    if (nameInput.value.trim() && valueInput.value.trim()) {
                      setForm({
                        ...form,
                        attributes: [
                          ...form.attributes,
                          {
                            name: nameInput.value.trim(),
                            value: valueInput.value.trim(),
                          },
                        ],
                      });
                      nameInput.value = "";
                      valueInput.value = "";
                    }
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t("modal.editProduct.addButton")}
                </button>
              </div>
              <div className="space-y-2">
                {form.attributes.map((attr, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-purple-50 p-3 rounded-lg"
                  >
                    <span className="font-medium text-purple-800">
                      {attr.name}:
                    </span>
                    <span className="text-purple-600">{attr.value}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          attributes: form.attributes.filter(
                            (_, i) => i !== idx
                          ),
                        })
                      }
                      className="ml-auto text-purple-600 hover:text-purple-800"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="md:col-span-3 flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              {t("vendor.cancel")}
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {updating
                ? t("modal.editProduct.updating")
                : t("modal.editProduct.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
