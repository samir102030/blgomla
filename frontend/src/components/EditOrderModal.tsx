import React, { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

interface Order {
  _id: string;
  user: {
    name: string;
    email: string;
  };
  store?: {
    name: string;
  };
  orderItems: Array<{
    product: any;
    quantity: number;
  }>;
  totalPrice: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  isPaid: boolean;
  isDelivered: boolean;
}

interface EditOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (orderId: string, status: string) => void;
}

const EditOrderModal: React.FC<EditOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [status, setStatus] = useState(order?.status || "");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  React.useEffect(() => {
    if (order) {
      setStatus(order.status);
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const statusOptions = [
    {
      value: "pending",
      label: t("modal.editOrder.status.pending"),
      color: "bg-yellow-100 text-yellow-800",
    },
    {
      value: "processing",
      label: t("modal.editOrder.status.processing"),
      color: "bg-blue-100 text-blue-800",
    },
    {
      value: "shipped",
      label: t("modal.editOrder.status.shipped"),
      color: "bg-purple-100 text-purple-800",
    },
    {
      value: "delivered",
      label: t("modal.editOrder.status.delivered"),
      color: "bg-green-100 text-green-800",
    },
    {
      value: "cancelled",
      label: t("modal.editOrder.status.cancelled"),
      color: "bg-red-100 text-red-800",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status) return;

    setLoading(true);
    try {
      await onUpdate(order._id, status);
      toast.success(t("modal.editOrder.success"));
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("modal.editOrder.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {t("modal.editOrder.title")}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {t("modal.deleteOrder.orderId", {
                      id: order._id.slice(-8).toUpperCase(),
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-500" />
                </button>
              </div>

              {/* Order Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">
                      {t("order.customer")}:
                    </span>
                    <p className="font-medium text-gray-900">
                      {order.user.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">{t("common.total")}:</span>
                    <p className="font-medium text-gray-900">
                      ${(order.totalPrice ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">
                      {t("modal.editOrder.currentStatus")}:
                    </span>
                    <p className="font-medium text-gray-900 capitalize">
                      {order.status}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">
                      {t("order.paymentMethod")}:
                    </span>
                    <p className="font-medium text-gray-900">
                      {order.paymentMethod}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t("modal.editOrder.updateStatus")}
                </label>
                <div className="space-y-3">
                  {statusOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors"
                    >
                      <input
                        type="radio"
                        name="status"
                        value={option.value}
                        checked={status === option.value}
                        onChange={(e) => setStatus(e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <span className="text-sm font-medium text-gray-900">
                          {option.label}
                        </span>
                        <div className="mt-1">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${option.color}`}
                          >
                            {option.label}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Change Notes */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  {t("modal.editOrder.effectsTitle")}
                </h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>
                    • <strong>{t("modal.editOrder.status.processing")}:</strong>{" "}
                    {t("modal.editOrder.processingDesc")}
                  </li>
                  <li>
                    • <strong>{t("modal.editOrder.status.shipped")}:</strong>{" "}
                    {t("modal.editOrder.shippedDesc")}
                  </li>
                  <li>
                    • <strong>{t("modal.editOrder.status.delivered")}:</strong>{" "}
                    {t("modal.editOrder.deliveredDesc")}
                  </li>
                  <li>
                    • <strong>{t("modal.editOrder.status.cancelled")}:</strong>{" "}
                    {t("modal.editOrder.cancelledDesc")}
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={loading || !status}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm"
              >
                {loading
                  ? t("modal.editOrder.updating")
                  : t("modal.editOrder.submit")}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                {t("vendor.cancel")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditOrderModal;
