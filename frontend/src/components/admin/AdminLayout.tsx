import React, { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import StoreInvalidPage from "./StoreInvalidPage";
import { useUserStore } from "../../stores/user.store";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Link, Navigate } from "react-router-dom";
import { permsAllow } from "../../lib/permissions";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  // Desktop: collapsed (narrow icon-only) vs expanded
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Mobile: open (drawer visible) vs closed
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useUserStore((s) => s.user);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const isUserValid = user?.active && !user?.deleted;
  const adminExpired =
    user?.role === "admin" &&
    user.adminExpiresAt &&
    new Date(user.adminExpiresAt).getTime() < Date.now();

  const isStoreValid =
    isAdmin ||
    user?.role !== "store" ||
    (user?.store && user.store.status === "approved" && !user.store.deleted);

  const isValid = isUserValid && isStoreValid && !adminExpired;

  // Anyone with dashboard access: built-in staff roles, or any (custom) role
  // granted dashboard.view. Logged-in users without it are sent home.
  const canDashboard =
    isAdmin ||
    user?.role === "store" ||
    permsAllow(user?.permissions, "dashboard.view");

  if (user && isUserValid && !canDashboard) {
    return <Navigate to="/" replace />;
  }

  if (!isValid) {
    if (adminExpired) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--surface-2)] px-4">
          <div className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] shadow-lg rounded-xl p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
            </div>
            <h1 className="text-xl font-semibold text-[var(--text)]">
              Admin duration ended
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Your admin access has expired. Please contact a super admin to
              extend your access.
            </p>
            <Link
              to="/"
              className="inline-block px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition"
              style={{ background: "var(--brand-gradient)" }}
            >
              Go to Home
            </Link>
          </div>
        </div>
      );
    }
    return <StoreInvalidPage />;
  }

  const handleMenuClick = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setSidebarCollapsed((c) => !c);
    } else {
      setMobileOpen((o) => !o);
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--text)]">
      <AdminSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader onMenuClick={handleMenuClick} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[var(--surface-2)] p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;
