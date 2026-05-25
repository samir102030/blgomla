import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import type { Brand } from "../types/brand.type";

interface ViewBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: Brand | null;
}

const ViewBrandModal: React.FC<ViewBrandModalProps> = ({
  isOpen,
  onClose,
  brand,
}) => {
  const { t } = useTranslation();
  if (!isOpen || !brand) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">{t("brands.viewBrandDetails")}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Brand Logo */}
          <div className="flex justify-center">
            {brand.logo ? (
              <img
                src={brand.logo}
                alt={brand.name}
                className="h-32 w-32 object-cover rounded-lg border"
               loading="lazy" decoding="async"/>
            ) : (
              <div className="h-32 w-32 bg-gray-100 rounded-lg flex items-center justify-center border">
                <span className="text-gray-400 text-sm">{t("brands.noLogo")}</span>
              </div>
            )}
          </div>

          {/* Brand Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("brands.brandName")}
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {brand.name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Status")}
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    brand.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {brand.isActive ? t("Active") : t("Inactive")}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("Description")}
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg min-h-[80px]">
              {brand.description || t("brands.noDescription")}
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Created At")}
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {brand.createdAt
                  ? new Date(brand.createdAt).toLocaleString()
                  : "N/A"}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Updated At")}
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {brand.updatedAt
                  ? new Date(brand.updatedAt).toLocaleString()
                  : "N/A"}
              </div>
            </div>
          </div>

          {/* Brand ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("brands.brandId")}
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm">
              {brand._id}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            {t("Close")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewBrandModal;
