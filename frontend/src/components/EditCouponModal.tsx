import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useCouponStore } from "../stores/coupon.store";
import { useUserStore } from "../stores/user.store";
import { useVendorStore } from "../stores/vendor.store";
import { useProductStore } from "../stores/product.store";
// import { useCategoryStore } from "../stores/category.store";

interface EditCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCouponUpdated: () => void;
  coupon: any;
}

const EditCouponModal: React.FC<EditCouponModalProps> = ({
  isOpen,
  onClose,
  onCouponUpdated,
  coupon,
}) => {
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
    applicableProducts: [] as (string | any)[],
    // applicableCategories: [] as string[],
  });

  const { updateCoupon, loading, fetchCouponById } = useCouponStore();
  const { user } = useUserStore();
  const { vendorStore } = useVendorStore();
  const { products, fetchProducts } = useProductStore();
  // const { categories, fetchCategories } = useCategoryStore();

  useEffect(() => {
    if (isOpen && coupon) {
      // Fetch complete coupon details to ensure we have applicableProducts
      fetchCouponById(coupon._id)
        .then(() => {
          const fullCoupon = useCouponStore.getState().coupon;
          if (fullCoupon) {
            setFormData({
              code: fullCoupon.code || "",
              description: fullCoupon.description || "",
              discountType: fullCoupon.discountType || "percentage",
              discountValue: fullCoupon.discountValue?.toString() || "",
              minimumPurchase: fullCoupon.minimumPurchase?.toString() || "",
              maximumDiscount: fullCoupon.maximumDiscount?.toString() || "",
              startDate: fullCoupon.startDate
                ? new Date(fullCoupon.startDate).toISOString().slice(0, 16)
                : "",
              endDate: fullCoupon.endDate
                ? new Date(fullCoupon.endDate).toISOString().slice(0, 16)
                : "",
              usageLimit: fullCoupon.usageLimit?.toString() || "",
              applicableProducts: fullCoupon.applicableProducts || [],
              // applicableCategories: fullCoupon.applicableCategories || [],
            });
          }
        })
        .catch((error) => {
          console.error("Failed to fetch coupon details:", error);
          // Fallback to the coupon prop data
          setFormData({
            code: coupon.code || "",
            description: coupon.description || "",
            discountType: coupon.discountType || "percentage",
            discountValue: coupon.discountValue?.toString() || "",
            minimumPurchase: coupon.minimumPurchase?.toString() || "",
            maximumDiscount: coupon.maximumDiscount?.toString() || "",
            startDate: coupon.startDate
              ? new Date(coupon.startDate).toISOString().slice(0, 16)
              : "",
            endDate: coupon.endDate
              ? new Date(coupon.endDate).toISOString().slice(0, 16)
              : "",
            usageLimit: coupon.usageLimit?.toString() || "",
            applicableProducts: coupon.applicableProducts || [],
            // applicableCategories: coupon.applicableCategories || [],
          });
        });

      // Fetch products for the store
      if (user?.role === "store" && vendorStore?._id) {
        fetchProducts({ storeId: vendorStore._id });
      }
    }
  }, [
    isOpen,
    coupon,
    fetchCouponById,
    fetchProducts,
    user?.role,
    vendorStore?._id,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      applicableProducts: formData.applicableProducts.map((item) =>
        typeof item === "string" ? item : item._id
      ),
      // applicableCategories: formData.applicableCategories,
    };

    const result = await updateCoupon(coupon._id, couponData);
    if (result) {
      onCouponUpdated();
      onClose();
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

  const handleMultiSelectChange = (name: string, value: (string | any)[]) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Edit Coupon</h2>
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
                {formData.discountType === "percentage" ? "% off" : "$ off"}
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
            <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
              {products.length > 0 ? (
                products.map((product) => (
                  <label
                    key={product._id}
                    className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={formData.applicableProducts.some((item) =>
                        typeof item === "string"
                          ? item === product._id
                          : item._id === product._id
                      )}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        const currentProducts = formData.applicableProducts;
                        let newProducts;

                        if (isChecked) {
                          // Check if product is already in the array (handle both string IDs and objects)
                          const alreadyExists = currentProducts.some((item) =>
                            typeof item === "string"
                              ? item === product._id
                              : item._id === product._id
                          );

                          if (!alreadyExists) {
                            newProducts = [...currentProducts, product._id];
                          } else {
                            newProducts = currentProducts;
                          }
                        } else {
                          // Remove product (handle both string IDs and objects)
                          newProducts = currentProducts.filter((item) =>
                            typeof item === "string"
                              ? item !== product._id
                              : item._id !== product._id
                          );
                        }

                        handleMultiSelectChange(
                          "applicableProducts",
                          newProducts
                        );
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">
                        {product.name}
                      </span>
                      {product.description && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {product.description}
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">
                      ${product.price.toFixed(2)}
                    </span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No products available
                </p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Leave unchecked to apply to all products. Check specific products
              to restrict the coupon.
            </p>
          </div>

          {/* Applicable Categories */}
          {/* <div>
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
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to apply to all categories
            </p>
          </div> */}

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
              {loading ? "Updating..." : "Update Coupon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCouponModal;
