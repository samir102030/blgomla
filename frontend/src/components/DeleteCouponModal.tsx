import React from "react";
import {
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useCouponStore } from "../stores/coupon.store";

interface DeleteCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCouponDeleted: () => void;
  coupon: any;
}

const DeleteCouponModal: React.FC<DeleteCouponModalProps> = ({
  isOpen,
  onClose,
  onCouponDeleted,
  coupon,
}) => {
  const { deleteCoupon, loading } = useCouponStore();

  const handleDelete = async () => {
    if (coupon) {
      const result = await deleteCoupon(coupon._id);
      if (result) {
        onCouponDeleted();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Delete Coupon</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
            <span className="text-lg font-medium text-gray-900">
              Confirm Deletion
            </span>
          </div>

          <p className="text-gray-600 mb-6">
            Are you sure you want to delete the coupon{" "}
            <strong>{coupon?.code}</strong>? This action cannot be undone.
          </p>

          {coupon?.usageCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
                <div>
                  <p className="text-sm text-yellow-800">
                    This coupon has been used {coupon.usageCount} time(s).
                    Deleting it may affect existing orders.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Deleting..." : "Delete Coupon"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteCouponModal;
