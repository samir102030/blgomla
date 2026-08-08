import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useCouponStore } from "../stores/coupon.store";
import { useUserStore } from "../stores/user.store";
import { useVendorStore } from "../stores/vendor.store";
import { useProductStore } from "../stores/product.store";
import { useCategoryStore } from "../stores/category.store";
import { useTranslation } from "react-i18next";

interface AddCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCouponCreated: () => void;
}

const AddCouponModal: React.FC<AddCouponModalProps> = ({
  isOpen,
  onClose,
  onCouponCreated,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: "",
    minimumPurchase: "",
    maximumDiscount: "",
    startDate: "",
    endDate: "",
    usageLimit: "",
    applicableProducts: [] as string[],
    applicableCategories: [] as string[],
    isPublic: false,
  });

  const { createCoupon, loading } = useCouponStore();
  const { user } = useUserStore();
  const { vendorStore } = useVendorStore();
  const { products, fetchProducts } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();

  useEffect(() => {
    if (isOpen) {
      console.log("Modal opened, fetching data...");
      fetchCategories().catch((error) =>
        console.error("Error fetching categories:", error)
      );
      if (user?.role === "store" && vendorStore?._id) {
        console.log("Fetching products for store:", vendorStore._id);
        fetchProducts({ storeId: vendorStore._id }).catch((error) =>
          console.error("Error fetching products:", error)
        );
      } else {
        console.log("Fetching all products for admin");
        fetchProducts().catch((error) =>
          console.error("Error fetching products:", error)
        );
      }
    }
  }, [isOpen, fetchCategories, fetchProducts, user?.role, vendorStore?._id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting coupon form with data:", formData);

    const couponData = {
      ...formData,
      discountValue: parseFloat(formData.discountValue),
      minimumPurchase: formData.minimumPurchase
        ? parseFloat(formData.minimumPurchase)
        : undefined,
      maximumDiscount: formData.maximumDiscount
        ? parseFloat(formData.maximumDiscount)
        : undefined,
      usageLimit: formData.usageLimit
        ? parseInt(formData.usageLimit)
        : undefined,
      storeId:
        user?.role === "admin" || user?.role === "super_admin"
          ? undefined
          : vendorStore?._id,
    };

    console.log("Processed coupon data:", couponData);

    const result = await createCoupon(couponData);
    console.log("Create coupon result:", result);
    if (result) {
      onCouponCreated();
      onClose();
      // Reset form
      setFormData({
        code: "",
        description: "",
        discountType: "percentage",
        discountValue: "",
        minimumPurchase: "",
        maximumDiscount: "",
        startDate: "",
        endDate: "",
        usageLimit: "",
        applicableProducts: [],
        applicableCategories: [],
      });
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (name: string, value: string[]) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (!isOpen) {
    console.log("AddCouponModal not open, returning null");
    return null;
  }

  console.log("AddCouponModal rendering content");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Create New Coupon
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coupon Code *
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="SUMMER2024"
                required
              />
            </div>

            {/* Discount Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Type *
              </label>
              <select
                name="discountType"
                value={formData.discountType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>

            {/* Discount Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Value *
              </label>
              <input
                type="number"
                name="discountValue"
                value={formData.discountValue}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={
                  formData.discountType === "percentage" ? "20" : "50"
                }
                min="0"
                step={formData.discountType === "percentage" ? "0.01" : "0.01"}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.discountType === "percentage"
                  ? t("coupon.percentOff")
                  : t("coupon.amountOff")}
              </p>
            </div>

            {/* Minimum Purchase */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Purchase
              </label>
              <input
                type="number"
                name="minimumPurchase"
                value={formData.minimumPurchase}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="100"
                min="0"
                step="0.01"
              />
            </div>

            {/* Maximum Discount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Discount
              </label>
              <input
                type="number"
                name="maximumDiscount"
                value={formData.maximumDiscount}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="50"
                min="0"
                step="0.01"
              />
            </div>

            {/* Usage Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usage Limit
              </label>
              <input
                type="number"
                name="usageLimit"
                value={formData.usageLimit}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="100"
                min="1"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="datetime-local"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="datetime-local"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional description for the coupon"
            />
          </div>

          {/* Applicable Products */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Applicable Products
            </label>
            <select
              multiple
              value={formData.applicableProducts}
              onChange={(e) => {
                const values = Array.from(
                  e.target.selectedOptions,
                  (option) => option.value
                );
                handleMultiSelectChange("applicableProducts", values);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.isArray(products) &&
                products.map((product) => (
                  <option
                    key={product?._id || Math.random()}
                    value={product?._id || ""}
                  >
                    {product?.name || "Unnamed Product"}
                  </option>
                ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to apply to all products
            </p>
          </div>

          {/* Applicable Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Applicable Categories
            </label>
            <select
              multiple
              value={formData.applicableCategories}
              onChange={(e) => {
                const values = Array.from(
                  e.target.selectedOptions,
                  (option) => option.value
                );
                handleMultiSelectChange("applicableCategories", values);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.isArray(categories) &&
                categories.map((category) => (
                  <option
                    key={category?._id || Math.random()}
                    value={category?._id || ""}
                  >
                    {category?.name || "Unnamed Category"}
                  </option>
                ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to apply to all categories
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isPublic: e.target.checked }))
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Show on storefront (collectible coupon strip)
            </span>
          </label>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Coupon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCouponModal;
