import React, { useState } from "react";
import { XMarkIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

interface FilterOptions {
  status: string[];
  paymentMethod: string[];
  dateRange: {
    start: string;
    end: string;
  };
  minAmount: string;
  maxAmount: string;
  storeId?: string;
}

interface OrderFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

const OrderFiltersModal: React.FC<OrderFiltersModalProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  currentFilters,
}) => {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);
  const { t } = useTranslation();

  React.useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  if (!isOpen) return null;

  const statusOptions = [
    { value: "pending", label: t("modal.editOrder.status.pending") },
    { value: "processing", label: t("modal.editOrder.status.processing") },
    { value: "shipped", label: t("modal.editOrder.status.shipped") },
    { value: "delivered", label: t("modal.editOrder.status.delivered") },
    { value: "cancelled", label: t("modal.editOrder.status.cancelled") },
  ];

  const paymentOptions = [
    { value: "cod", label: t("Cash On Delivery") },
    { value: "card", label: t("modal.orderFilters.creditCard") },
    { value: "paypal", label: t("modal.orderFilters.paypal") },
    { value: "bank", label: t("modal.orderFilters.bankTransfer") },
  ];

  const handleStatusChange = (status: string, checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      status: checked
        ? [...prev.status, status]
        : prev.status.filter((s) => s !== status),
    }));
  };

  const handlePaymentChange = (payment: string, checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      paymentMethod: checked
        ? [...prev.paymentMethod, payment]
        : prev.paymentMethod.filter((p) => p !== payment),
    }));
  };

  const handleApplyFilters = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleClearFilters = () => {
    const emptyFilters: FilterOptions = {
      status: [],
      paymentMethod: [],
      dateRange: { start: "", end: "" },
      minAmount: "",
      maxAmount: "",
    };
    setFilters(emptyFilters);
    onApplyFilters(emptyFilters);
    onClose();
  };

  const activeFiltersCount =
    filters.status.length +
    filters.paymentMethod.length +
    (filters.dateRange.start ? 1 : 0) +
    (filters.dateRange.end ? 1 : 0) +
    (filters.minAmount ? 1 : 0) +
    (filters.maxAmount ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <FunnelIcon className="h-6 w-6 text-gray-600 mr-3" />
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {t("modal.orderFilters.title")}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {activeFiltersCount > 0
                      ? t(
                          activeFiltersCount > 1
                            ? "modal.orderFilters.filtersActivePlural"
                            : "modal.orderFilters.filtersActiveSingular",
                          { count: activeFiltersCount }
                        )
                      : t("modal.orderFilters.noFilters")}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status Filters */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  {t("modal.orderFilters.orderStatus")}
                </h4>
                <div className="space-y-2">
                  {statusOptions.map((status) => (
                    <label
                      key={status.value}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status.value)}
                        onChange={(e) =>
                          handleStatusChange(status.value, e.target.checked)
                        }
                        className="text-blue-600 focus:ring-blue-500 rounded"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {status.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment Method Filters */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  {t("order.paymentMethod")}
                </h4>
                <div className="space-y-2">
                  {paymentOptions.map((payment) => (
                    <label
                      key={payment.value}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={filters.paymentMethod.includes(payment.value)}
                        onChange={(e) =>
                          handlePaymentChange(payment.value, e.target.checked)
                        }
                        className="text-blue-600 focus:ring-blue-500 rounded"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {payment.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="md:col-span-2">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  {t("admin.customRange")}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("admin.from")} {t("account.date").toLowerCase()}
                    </label>
                    <input
                      type="date"
                      value={filters.dateRange.start}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateRange: {
                            ...prev.dateRange,
                            start: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("admin.to")} {t("account.date").toLowerCase()}
                    </label>
                    <input
                      type="date"
                      value={filters.dateRange.end}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, end: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Amount Range */}
              <div className="md:col-span-2">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  {t("modal.orderFilters.amountRange")}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("modal.orderFilters.minAmount")}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={filters.minAmount}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          minAmount: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t("modal.orderFilters.minPlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("modal.orderFilters.maxAmount")}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={filters.maxAmount}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          maxAmount: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t("modal.orderFilters.noLimit")}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Active Filters Summary */}
            {activeFiltersCount > 0 && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  {t("modal.orderFilters.activeFilters")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {filters.status.map((status) => (
                    <span
                      key={status}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {t("order.status")}: {status}
                    </span>
                  ))}
                  {filters.paymentMethod.map((payment) => (
                    <span
                      key={payment}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >
                      {t("order.paymentMethod")}: {payment}
                    </span>
                  ))}
                  {filters.dateRange.start && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {t("admin.from")}: {filters.dateRange.start}
                    </span>
                  )}
                  {filters.dateRange.end && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {t("admin.to")}: {filters.dateRange.end}
                    </span>
                  )}
                  {filters.minAmount && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {t("modal.orderFilters.minAbbrev")}: ${filters.minAmount}
                    </span>
                  )}
                  {filters.maxAmount && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {t("modal.orderFilters.maxAbbrev")}: ${filters.maxAmount}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleApplyFilters}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {t("admin.applyFilters")}
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {t("admin.clearFilters")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {t("vendor.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderFiltersModal;
