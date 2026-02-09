import React, { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import StoreInvalidPage from "./StoreInvalidPage";
import { useUserStore } from "../../stores/user.store";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const user = useUserStore((s) => s.user);

  // Check if user is valid
  const isUserValid = user?.active && !user?.deleted;
  const adminExpired =
    user?.role === "admin" &&
    user.adminExpiresAt &&
    new Date(user.adminExpiresAt).getTime() < Date.now();

  // Check if store is valid (for store users)
  const isStoreValid =
    user?.role !== "store" ||
    (user?.store && user.store.status === "approved" && !user.store.deleted);

  const isValid = isUserValid && isStoreValid && !adminExpired;

  if (!isValid) {
    if (adminExpired) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white border shadow-sm rounded-xl p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              Admin duration ended
            </h1>
            <p className="text-sm text-gray-600">
              Your admin access has expired. Please contact a super admin to
              extend your access.
            </p>
            <Link
              to="/"
              className="inline-block px-4 py-2 rounded-lg bg-[#002B5B] text-white text-sm font-semibold hover:bg-[#001a3d]"
            >
              Go to Home
            </Link>
          </div>
        </div>
      );
    }
    return <StoreInvalidPage />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <AdminHeader
          onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
