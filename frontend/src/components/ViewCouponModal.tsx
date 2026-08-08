import React from "react";
import { useTranslation } from "react-i18next";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useMoney } from "../lib/money";

interface ViewCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: any;
}

const ViewCouponModal: React.FC<ViewCouponModalProps> = ({
  isOpen,
  onClose,
  coupon,
}) => {
  const { t, i18n } = useTranslation();
  const money = useMoney();
  const locale = i18n.language === "ar" ? "ar-EG" : "en-EG";

  const pickName = (c: { name?: string; nameAr?: string } | null | undefined) => {
    if (!c) return "";
    return (i18n.language === "ar" && c.nameAr ? c.nameAr : c.name) || "";
  };

  if (!isOpen || !coupon) return null;

  const getStatusColor = (coupon: any) => {
    const now = new Date();
    const startDate = new Date(coupon.startDate);
    const endDate = new Date(coupon.endDate);

    if (!coupon.isActive) return "bg-gray-100 text-gray-800";
    if (now < startDate) return "bg-blue-100 text-blue-800";
    if (now > endDate) return "bg-red-100 text-red-800";
    return "bg-green-100 text-green-800";
  };

  const getStatusText = (coupon: any) => {
    const now = new Date();
    const startDate = new Date(coupon.startDate);
    const endDate = new Date(coupon.endDate);

    if (!coupon.isActive) return t("coupon.inactive");
    if (now < startDate) return t("coupon.scheduled");
    if (now > endDate) return t("coupon.expired");
    return t("coupon.active");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {t("coupon.detailsTitle")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            <span
              className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                coupon
              )}`}
            >
              {getStatusText(coupon)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("coupon.couponCode")}
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-mono">
                {coupon.code}
              </div>
            </div>

            {/* Discount Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("coupon.discountType")}
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                {coupon.discountType === "percentage"
                  ? t("coupon.typePercentage")
                  : t("coupon.typeFixed")}
              </div>
            </div>

            {/* Discount Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("coupon.discountValue")}
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                {coupon.discountType === "percentage"
                  ? `${coupon.discountValue}%`
                  : money(coupon.discountValue)}
              </div>
            </div>

            {/* Minimum Purchase */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("coupon.minimumPurchaseLabel")}
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                {coupon.minimumPurchase
                  ? money(coupon.minimumPurchase)
                  : t("coupon.none")}
              </div>
            </div>

            {/* Maximum Discount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("coupon.maximumDiscount")}
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                {coupon.maximumDiscount
                  ? money(coupon.maximumDiscount)
                  : t("coupon.none")}
              </div>
            </div>

            {/* Usage Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("coupon.usageLimit")}
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                {coupon.usageLimit || t("coupon.unlimited")}
              </div>
            </div>

            {/* Usage Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("coupon.timesUsed")}
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                {coupon.usageCount || 0}
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("coupon.startDate")}
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                {new Date(coupon.startDate).toLocaleString(locale)}
              </div>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("coupon.endDate")}
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                {new Date(coupon.endDate).toLocaleString(locale)}
              </div>
            </div>
          </div>

          {/* Description */}
          {coupon.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Description")}
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                {coupon.description}
              </div>
            </div>
          )}

          {/* Applicable Products */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("coupon.applicableProducts")}
            </label>
            <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
              {coupon.applicableProducts &&
              coupon.applicableProducts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {coupon.applicableProducts
                    .filter(
                      (product: any, index: number, self: any[]) =>
                        index ===
                        self.findIndex((p: any) => p._id === product._id)
                    )
                    .map((product: any) => (
                      <span
                        key={product._id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {pickName(product)}
                      </span>
                    ))}
                </div>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {t("coupon.noSpecificProducts")}
                </span>
              )}
            </div>
          </div>

          {/* Applicable Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("coupon.applicableCategories")}
            </label>
            <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
              {coupon.applicableCategories &&
              coupon.applicableCategories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {coupon.applicableCategories
                    .filter(
                      (category: any, index: number, self: any[]) =>
                        index ===
                        self.findIndex((c: any) => c._id === category._id)
                    )
                    .map((category: any) => (
                      <span
                        key={category._id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        {pickName(category)}
                      </span>
                    ))}
                </div>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {t("coupon.noSpecificCategories")}
                </span>
              )}
            </div>
          </div>

          {/* Store Info */}
          {coupon.store && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Store")}
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                {coupon.store.name}
              </div>
            </div>
          )}

          {/* Created By */}
          {/* {coupon.createdBy && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Created By
              </label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                {coupon.createdBy.name}
              </div>
            </div>
          )} */}

          <div className="flex justify-end pt-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              {t("Close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewCouponModal;
