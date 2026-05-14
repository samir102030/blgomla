import React, { useEffect, useState } from "react";
import { axiosInstance } from "../lib/axios";
import { useUserStore } from "../stores/user.store";
import { useVendorStore } from "../stores/vendor.store";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: () => void;
  brands: any[];
  categories: any[];
}

const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
  brands,
  categories,
}) => {
  const [creating, setCreating] = useState(false);
  const { user } = useUserStore();
  const { vendorStore } = useVendorStore();
  const [form, setForm] = useState({
    name: "",
    nameAr: "",
    description: "",
    descriptionAr: "",
    price: "",
    stock: "0",
    brand: "",
    category: "",
    newBrandName: "",
    newBrandNameAr: "",
    newBrandDescription: "",
    newCategoryName: "",
    newCategoryNameAr: "",
    newCategoryDescription: "",
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

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        name: "",
        nameAr: "",
        description: "",
        descriptionAr: "",
        price: "",
        stock: "0",
        brand: "",
        category: "",
        newBrandName: "",
        newBrandNameAr: "",
        newBrandDescription: "",
        newCategoryName: "",
        newCategoryNameAr: "",
        newCategoryDescription: "",
        salePercentage: "",
        saleActive: false,
        isActive: true,
        featured: false,
        tags: [],
        features: [],
        attributes: [],
        bulkPricing: [],
      });
      setFiles([]);
      setPreviews([]);
    }
  }, [isOpen]);

  // Handle image previews
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (dropped.length) setFiles((prev) => [...prev, ...dropped]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      // Upload files sequentially
      const images: { url: string; alt?: string }[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("image", file);
        const res = await axiosInstance.post("/upload/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data && res.data.url) {
          images.push({ url: res.data.url, alt: file.name });
        }
      }

      const payload: any = {
        name: form.name,
        nameAr: form.nameAr,
        description: form.description,
        descriptionAr: form.descriptionAr,
        price: Number(form.price),
        stock: Number(form.stock),
        images,
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

      // Add store ID if user is a store owner
      if (user?.role === "store" && vendorStore?._id) {
        payload.store = vendorStore._id;
      }

      // Handle brand selection or new brand request
      if (form.brand === "CREATE_NEW") {
        payload.newBrand = {
          name: form.newBrandName,
          nameAr: form.newBrandNameAr,
          description: form.newBrandDescription,
        };
      } else if (form.brand) {
        payload.brand = form.brand;
      }

      // Handle category selection or new category request
      if (form.category === "CREATE_NEW") {
        payload.newCategory = {
          name: form.newCategoryName,
          nameAr: form.newCategoryNameAr,
          description: form.newCategoryDescription,
        };
      } else if (form.category) {
        payload.category = form.category;
      }

      // Import createProduct from store here to avoid circular imports
      const { useProductStore } = await import("../stores/product.store");
      const createProduct = useProductStore.getState().createProduct;

      const created = await createProduct(payload);
      if (created) {
        onClose();
        onProductCreated();
      }
    } catch (err) {
      console.error("Create product error:", err);
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden">
        <div className="flex items-start justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Create Product
            </h2>
            <p className="text-sm text-gray-500">
              Add product details and upload images
            </p>
          </div>
          <div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="text-gray-500 hover:text-gray-700 rounded-md p-1"
            >
              ✕
            </button>
          </div>
        </div>

        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 py-6"
        >
          {/* Left: image uploader + previews */}
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Images
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() =>
                document.getElementById("product-images-input")?.click()
              }
              className="border-2 border-dashed border-gray-200 rounded-lg p-3 h-44 flex flex-col items-center justify-center text-center cursor-pointer bg-gray-50 hover:bg-gray-100"
            >
              <p className="text-sm text-gray-500">
                Drag & drop images here or click to select
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Supports multiple images (jpg, png). Max 5 images.
              </p>
              <input
                id="product-images-input"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {previews.length > 0 && (
              <div className="mt-2 sm:mt-3 grid grid-cols-3 sm:grid-cols-4 gap-1 sm:gap-2">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={src}
                      alt={`preview-${idx}`}
                      className="h-16 sm:h-20 w-full object-cover rounded"
                     loading="lazy" decoding="async"/>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute top-0 right-0 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: form fields */}
          <div className="md:col-span-2 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Name (English)
                </label>
                <input
                  required
                  placeholder="Product name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 block w-full text-sm border border-gray-300 rounded-md px-2 sm:px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  الاسم (عربي)
                </label>
                <input
                  dir="rtl"
                  placeholder="اسم المنتج"
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                  className="mt-1 block w-full text-sm border border-gray-300 rounded-md px-2 sm:px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Price
              </label>
              <input
                required
                placeholder="0.00"
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="mt-1 block w-full text-sm border border-gray-300 rounded-md px-2 sm:px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <select
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="mt-1 block w-full text-sm border border-gray-300 rounded-md px-2 sm:px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                >
                  <option value="">Select brand</option>
                  {brands?.map((b: any) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                  <option value="CREATE_NEW">+ Create New Brand</option>
                </select>
                {form.brand === "CREATE_NEW" && (
                  <div className="mt-2 space-y-2">
                    <input
                      required
                      placeholder="New brand name"
                      value={form.newBrandName}
                      onChange={(e) =>
                        setForm({ ...form, newBrandName: e.target.value })
                      }
                      className="block w-full text-sm border border-gray-300 rounded-md px-2 sm:px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    />
                    <textarea
                      placeholder="Brand description (optional)"
                      value={form.newBrandDescription}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          newBrandDescription: e.target.value,
                        })
                      }
                      className="block w-full text-sm border border-gray-300 rounded-md px-2 sm:px-3 py-2 h-20 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    />
                    <p className="text-xs text-amber-600">
                      ⚠️ This brand will need admin approval before your product
                      is published
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                >
                  <option value="">Select category</option>
                  {categories.map((c: any) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                  <option value="CREATE_NEW">+ Create New Category</option>
                </select>
                {form.category === "CREATE_NEW" && (
                  <div className="mt-2 space-y-2">
                    <input
                      required
                      placeholder="New category name"
                      value={form.newCategoryName}
                      onChange={(e) =>
                        setForm({ ...form, newCategoryName: e.target.value })
                      }
                      className="block w-full text-sm border border-gray-300 rounded-md px-2 sm:px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    />
                    <textarea
                      placeholder="Category description (optional)"
                      value={form.newCategoryDescription}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          newCategoryDescription: e.target.value,
                        })
                      }
                      className="block w-full text-sm border border-gray-300 rounded-md px-2 sm:px-3 py-2 h-20 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    />
                    <p className="text-xs text-amber-600">
                      ⚠️ This category will need admin approval before your
                      product is published
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Sale Percentage (%)
                </label>
                <input
                  placeholder="0"
                  type="number"
                  min="0"
                  max="100"
                  value={form.salePercentage}
                  onChange={(e) =>
                    setForm({ ...form, salePercentage: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Stock
                </label>
                <input
                  placeholder="0"
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.saleActive}
                  onChange={(e) =>
                    setForm({ ...form, saleActive: e.target.checked })
                  }
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Sale Active
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Is Active
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) =>
                    setForm({ ...form, featured: e.target.checked })
                  }
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Featured
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description (English)
                </label>
                <textarea
                  placeholder="Short description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-yellow-300"
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
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-yellow-300"
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
                      className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center"
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
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
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
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
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
                        className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
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
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  id="tag-input"
                  placeholder="Add a tag"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById(
                      "tag-input"
                    ) as HTMLInputElement;
                    if (input.value.trim()) {
                      setForm({
                        ...form,
                        tags: [...form.tags, input.value.trim()],
                      });
                      input.value = "";
                    }
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1"
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
                      className="text-blue-600 hover:text-blue-800"
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
                Features
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  id="feature-input"
                  placeholder="Add a feature"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById(
                      "feature-input"
                    ) as HTMLInputElement;
                    if (input.value.trim()) {
                      setForm({
                        ...form,
                        features: [...form.features, input.value.trim()],
                      });
                      input.value = "";
                    }
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.features.map((feature, idx) => (
                  <span
                    key={idx}
                    className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm flex items-center gap-1"
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
                      className="text-green-600 hover:text-green-800"
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
                Attributes
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <input
                  id="attr-name-input"
                  placeholder="Attribute name"
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
                <input
                  id="attr-value-input"
                  placeholder="Attribute value"
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nameInput = document.getElementById(
                      "attr-name-input"
                    ) as HTMLInputElement;
                    const valueInput = document.getElementById(
                      "attr-value-input"
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
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {form.attributes.map((attr, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-purple-50 p-2 rounded"
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

          {/* actions */}
          <div className="md:col-span-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-[#FFD600] rounded-md text-sm font-medium disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;
