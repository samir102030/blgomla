import React from "react";
import { useUserStore } from "../stores/user.store";
import { useOrderStore } from "../stores/order.store";

const AccountDashboard: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const orders = useOrderStore((state) => state.orders);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "text-[#009688] bg-[#009688]/10";
      case "processing":
        return "text-[#333333] bg-[#FFD600]/10";
      case "shipped":
        return "text-[#002B5B] bg-[#002B5B]/10";
      default:
        return "text-[#9E9E9E] bg-[#9E9E9E]/10";
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Total Orders
          </h3>
          <p className="text-3xl font-bold text-blue-600">{orders?.length}</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            Total Spent
          </h3>
          <p className="text-3xl font-bold text-green-600">
            $
            {orders &&
              orders
                .reduce((sum, order) => sum + (order?.totalPrice || 0), 0)
                .toFixed(2)}
          </p>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">
            Wishlist Items
          </h3>
          <p className="text-3xl font-bold text-purple-600">
            {user?.love?.length || 0}
          </p>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Recent Orders
      </h3>
      <div className="space-y-4">
        {orders &&
          orders.slice(0, 3).map((order) => (
            <div
              key={order._id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">Order {order._id}</p>
                  <p className="text-sm text-gray-600">
                    {order.createdAt?.slice(0, 10)} •{" "}
                    {order.orderItems?.length || 0} items
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    ${order.totalPrice}
                  </p>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default AccountDashboard;
