import React, { useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Link, useNavigate } from "react-router-dom";
import { useUserStore } from "../../stores/user.store";

interface HeaderProps {
  onMenuClick: () => void;
}

const DashboardHeader: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifications = [
    { id: 1, title: "New order received", time: "2 min ago", type: "order" },
    { id: 2, title: "Vendor registration pending", time: "5 min ago", type: "vendor" },
    { id: 3, title: "Payment processed", time: "10 min ago", type: "payment" },
    { id: 4, title: "Support ticket created", time: "15 min ago", type: "support" },
  ];

  const iconFor = (t: string) =>
 t === "order" ? "" : t === "vendor" ? "" : t === "payment" ? "" : "";

  const handleLogout = async () => {
    await logout?.();
    navigate("/login");
  };

  const displayName = user?.name || user?.email?.split("@")[0] || "Admin";
  const initial = (displayName || "A").charAt(0).toUpperCase();

  return (
    <header className="bg-[var(--surface)] border-b border-[var(--border)]">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
        {/* Left */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
            aria-label="Open menu"
          >
 <span className="text-xl"></span>
          </button>

          <div className="hidden sm:block relative flex-1 max-w-lg">
            <span className="absolute inset-y-0 left-3 flex items-center text-[var(--text-subtle)] pointer-events-none">
              <MagnifyingGlassIcon className="w-6 h-6" aria-hidden="true" />
            </span>
            <input
              type="text"
              placeholder="Search vendors, products, orders..."
              className="block w-full pl-10 pr-3 py-2 text-sm rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/dashboard/products/add"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-white shadow-sm hover:opacity-95 transition"
            style={{ background: "var(--brand-gradient)" }}
          >
            + Add Product
          </Link>
          <Link
            to="/dashboard/vendors/add"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)] transition"
          >
            + Add Vendor
          </Link>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications((v) => !v);
                setShowProfile(false);
              }}
              className="relative p-2 rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              aria-label="Notifications"
            >
 <span className="text-lg"></span>
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 text-[10px] font-bold rounded-full bg-[var(--brand-primary)] text-white flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--border)]">
                  <h3 className="text-sm font-semibold text-[var(--text)]">
                    Notifications
                  </h3>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border)]">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--surface-2)] cursor-pointer"
                    >
                      <span className="text-base mt-0.5">{iconFor(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text)] truncate">
                          {n.title}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {n.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  to="/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="block px-4 py-2.5 text-center text-sm font-medium text-[var(--brand-primary)] border-t border-[var(--border)] hover:bg-[var(--surface-2)]"
                >
                  View all notifications
                </Link>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfile((v) => !v);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1 sm:pl-1 sm:pr-2 rounded-md hover:bg-[var(--surface-2)]"
            >
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm"
                style={{ background: "var(--brand-gradient)" }}
              >
                {initial}
              </div>
              <span className="hidden md:block text-sm font-medium text-[var(--text)] max-w-[120px] truncate">
                {displayName}
              </span>
              <span className="hidden md:block text-[var(--text-subtle)] text-xs">
                ▼
              </span>
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-2 w-52 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-3 border-b border-[var(--border)]">
                  <p className="text-sm font-semibold text-[var(--text)] truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {user?.email}
                  </p>
                </div>
                <div className="py-1">
                  <Link
                    to="/account"
                    onClick={() => setShowProfile(false)}
                    className="block px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                  >
 Your Profile
                  </Link>
                  <Link
                    to="/dashboard/settings/general"
                    onClick={() => setShowProfile(false)}
                    className="block px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                  >
 Settings
                  </Link>
                  <Link
                    to="/"
                    onClick={() => setShowProfile(false)}
                    className="block px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)]"
                  >
 Back to site
                  </Link>
                </div>
                <div className="border-t border-[var(--border)] py-1">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[var(--surface-2)]"
                  >
 Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status strip */}
      <div className="bg-[var(--surface-2)] border-t border-[var(--border)] px-4 sm:px-6 py-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[var(--text-muted)]">System Online</span>
            </div>
            <span className="hidden sm:inline text-[var(--text-subtle)]">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[var(--text-subtle)]">
            <span>Vendors: 156</span>
            <span>Pending Orders: 23</span>
            <span>Tickets: 8</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
