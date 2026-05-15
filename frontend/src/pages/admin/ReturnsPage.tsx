import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUserStore } from "../../stores/user.store";
import { useReturnStore } from "../../stores/return.store";

const ReturnsPage: React.FC = () => {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const { returns, loading, error, fetchReturns, updateReturnStatus } =
    useReturnStore();

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-[#009688]/10 text-[#009688]";
      case "rejected":
        return "bg-[#D32F2F]/10 text-[#D32F2F]";
      case "received":
        return "bg-[#002B5B]/10 text-[#002B5B]";
      case "refunded":
        return "bg-[#673AB7]/10 text-[#673AB7]";
      default:
        return "bg-[#9E9E9E]/10 text-[#9E9E9E]";
    }
  };

  if (loading && returns.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002B5B] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t("returns.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">{t("returns.errorLoading")}</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchReturns}
            className="mt-4 bg-[#002B5B] text-white px-4 py-2 rounded-lg hover:bg-[#001a3d] transition-colors"
          >
            {t("returns.tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#333333]">
          {t("returns.title")}
        </h1>
        <p className="text-[#9E9E9E]">
          {t("returns.subtitle")}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("returns.colReturnId")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("returns.colOrderId")}
                </th>
                {user?.role === "admin" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("returns.colCustomer")}
                  </th>
                )}
                {user?.role === "admin" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("returns.colStore")}
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("returns.colStatus")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("returns.colReason")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("returns.colActions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {returns.map((item) => {
                const orderId =
                  typeof item.order === "string"
                    ? item.order
                    : item.order?._id;
                const customer =
                  typeof item.user === "string" ? undefined : item.user;
                const store =
                  typeof item.store === "string" ? undefined : item.store;

                return (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--brand-primary)]">
                      #{item._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {orderId || "N/A"}
                    </td>
                    {user?.role === "admin" && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer?.name || "N/A"}
                      </td>
                    )}
                    {user?.role === "admin" && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {store?.name || "N/A"}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.reason || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <select
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                        value={item.status}
                        onChange={(e) =>
                          updateReturnStatus(
                            item._id,
                            e.target.value as any
                          )
                        }
                      >
                        <option value="pending">{t("returns.pending")}</option>
                        <option value="approved">{t("returns.approved")}</option>
                        <option value="rejected">{t("returns.rejected")}</option>
                        <option value="received">{t("returns.received")}</option>
                        <option value="refunded">{t("returns.refunded")}</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReturnsPage;
