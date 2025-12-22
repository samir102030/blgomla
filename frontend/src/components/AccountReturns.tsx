import React from "react";
import { useReturnStore } from "../stores/return.store";

const AccountReturns: React.FC = () => {
  const returns = useReturnStore((state) => state.returns);
  const loading = useReturnStore((state) => state.loading);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "text-[#009688] bg-[#009688]/10";
      case "rejected":
        return "text-[#D32F2F] bg-[#D32F2F]/10";
      case "received":
        return "text-[#002B5B] bg-[#002B5B]/10";
      case "refunded":
        return "text-[#673AB7] bg-[#673AB7]/10";
      default:
        return "text-[#9E9E9E] bg-[#9E9E9E]/10";
    }
  };

  if (loading && returns.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FFD600]"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My Returns</h2>
      {returns.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          No return requests yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Return ID
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {returns.map((item) => {
                const orderId =
                  typeof item.order === "string"
                    ? item.order
                    : item.order?._id;
                return (
                  <tr key={item._id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {item._id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {orderId || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.createdAt?.slice(0, 10)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.reason || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AccountReturns;
