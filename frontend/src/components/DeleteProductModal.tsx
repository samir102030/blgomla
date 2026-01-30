import React, { useState } from "react";
import {
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useBrandStore } from "../stores/brand.store";
import { useTranslation } from "react-i18next";

interface DeleteProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductDeleted: () => void;
  product: any;
}

const DeleteProductModal: React.FC<DeleteProductModalProps> = ({
  isOpen,
  onClose,
  onProductDeleted,
  product,
}) => {
  const [deleting, setDeleting] = useState(false);
  const brands = useBrandStore((state: any) => state.brands);
  const { t, i18n } = useTranslation();

  const getLocalizedText = (value: any) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
    if (typeof value === "object") {
      const lang = i18n.language;
      if (value[lang]) return getLocalizedText(value[lang]);
      if (value.en) return getLocalizedText(value.en);
      if (value.ar) return getLocalizedText(value.ar);
      if (value.name) return getLocalizedText(value.name);
      if (value.title) return getLocalizedText(value.title);
    }
    return "";
  };

  const getBrandName = (brandValue: any) => {
    const brandId =
      typeof brandValue === "string" ? brandValue : brandValue?._id;
    const brand = brands?.find((b: any) => b._id === brandId);
    return getLocalizedText(brand?.name || brandValue || "N/A");
  };

  const handleDelete = async () => {
    if (!product?._id) return;

    setDeleting(true);
    try {
      // Import deleteProduct from store here to avoid circular imports
      const { useProductStore } = await import("../stores/product.store");
      const deleteProduct = useProductStore.getState().deleteProduct;

      const success = await deleteProduct(product._id);
      if (success) {
        onClose();
        onProductDeleted();
      }
    } catch (err) {
      console.error("Delete product error:", err);
    } finally {
      setDeleting(false);
    }
  };

  const formatSku = (id: any) =>
    typeof id === "string" ? id.slice(-8).toUpperCase() : "N/A";

  if (!isOpen || !product) return null;

  const productName = getLocalizedText(product?.name) || "N/A";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-red-50 to-rose-50 dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-300" />
            </div>
            <div className="ml-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                {t("modal.deleteProduct.title")}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("modal.common.irreversible")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 rounded-full transition-colors duration-200"
            aria-label={t("modal.common.close")}
          >
            <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-300" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">
          <div className="flex items-start space-x-4">
            {/* Product Image */}
            <div className="flex-shrink-0">
              {product.images?.[0]?.url ? (
                <img
                  src={product.images?.[0]?.url}
                  alt={productName}
                  className="h-16 w-16 rounded-lg object-cover border border-gray-200 dark:border-slate-700"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-8 w-8"
                  >
                    <path d="M6.75 4.5a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 6.75 19.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 17.25 4.5H6.75Zm0-1.5h10.5A3.75 3.75 0 0 1 21 6.75v10.5A3.75 3.75 0 0 1 17.25 21H6.75A3.75 3.75 0 0 1 3 17.25V6.75A3.75 3.75 0 0 1 6.75 3Z" />
                    <path d="M8.25 9a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0ZM6.75 16.5l2.75-3.667a1.125 1.125 0 0 1 1.8-.038l1.443 1.805l1.358-1.812a1.125 1.125 0 0 1 1.836.037L17.25 16.5H6.75Z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-1">
                {productName}
              </h3>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <p>
                  <span className="font-medium">{t("modal.common.sku")}</span>{" "}
                  {formatSku(product?._id)}
                </p>
                <p>
                  <span className="font-medium">{t("modal.common.price")}</span>{" "}
                  {(() => {
                    const raw = product?.price;
                    const num =
                      typeof raw === "number" ? raw : Number(raw ?? 0);
                    return `$${num.toFixed(2)}`;
                  })()}
                </p>
                <p>
                  <span className="font-medium">{t("modal.common.brand")}</span>{" "}
                  {product.brand ? getBrandName(product.brand) : "N/A"}
                </p>
                <p>
                  <span className="font-medium">{t("modal.common.stock")}</span>{" "}
                  {product.stock || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 dark:text-red-200 flex-shrink-0" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                  {t("modal.deleteProduct.confirmTitle")}
                </h4>
                <div className="mt-2 text-sm text-red-700 dark:text-red-200">
                  <p>
                    {t("modal.deleteProduct.confirmBody", {
                      name: productName,
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          {product.soldCount > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-amber-500/10 border border-yellow-200 dark:border-amber-500/30 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-yellow-400 dark:text-amber-200">⚠️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800 dark:text-amber-200">
                    <strong>{t("modal.common.warning")}</strong>{" "}
                    {t("modal.deleteProduct.soldWarning", {
                      count: product.soldCount,
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("vendor.cancel")}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {deleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t("modal.deleteProduct.deleting")}
              </>
            ) : (
              <>
                <span>🗑️</span>
                {t("modal.deleteProduct.deleteButton")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteProductModal;
