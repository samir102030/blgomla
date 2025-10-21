import React, { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import StoreInvalidPage from "./StoreInvalidPage";
import { useUserStore } from "../../stores/user.store";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const user = useUserStore((s) => s.user);

  // Check if user is valid
  const isUserValid = user?.active && !user?.deleted;

  // Check if store is valid (for store users)
  const isStoreValid =
    user?.role !== "store" ||
    (user?.store && user.store.status === "approved" && !user.store.deleted);

  const isValid = isUserValid && isStoreValid;

  if (!isValid) {
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
