import React from "react";
import type { ComponentType, SVGProps } from "react";
import { ArrowTrendingUpIcon, BanknotesIcon, BuildingStorefrontIcon, ChartBarIcon, ChatBubbleLeftRightIcon, Cog6ToothIcon, CubeIcon, ShoppingCartIcon, UsersIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Link, useLocation } from "react-router-dom";
import Logo, { BRAND } from "../Logo";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  title: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  path: string;
  children: { title: string; path: string }[];
}

const menuItems: MenuItem[] = [
  { title: "Dashboard", icon: ChartBarIcon, path: "/dashboard", children: [] },
  {
    title: "Vendors",
    icon: BuildingStorefrontIcon,
    path: "/dashboard/vendors",
    children: [
      { title: "All Vendors", path: "/dashboard/vendors" },
      { title: "Add Vendor", path: "/dashboard/vendors/add" },
      { title: "Vendor Requests", path: "/dashboard/vendors/requests" },
      { title: "Vendor Analytics", path: "/dashboard/vendors/analytics" },
    ],
  },
  {
    title: "Products",
    icon: CubeIcon,
    path: "/dashboard/products",
    children: [
      { title: "All Products", path: "/dashboard/products" },
      { title: "Add Product", path: "/dashboard/products/add" },
      { title: "Categories", path: "/dashboard/products/categories" },
      { title: "Inventory", path: "/dashboard/products/inventory" },
    ],
  },
  {
    title: "Orders",
    icon: ShoppingCartIcon,
    path: "/dashboard/orders",
    children: [
      { title: "All Orders", path: "/dashboard/orders" },
      { title: "Pending Orders", path: "/dashboard/orders/pending" },
      { title: "Processing", path: "/dashboard/orders/processing" },
      { title: "Completed", path: "/dashboard/orders/completed" },
    ],
  },
  {
    title: "CRM",
    icon: UsersIcon,
    path: "/dashboard/crm",
    children: [
      { title: "Customers", path: "/dashboard/crm/customers" },
      { title: "Support Tickets", path: "/dashboard/crm/tickets" },
      { title: "Communications", path: "/dashboard/crm/communications" },
      { title: "Customer Analytics", path: "/dashboard/crm/analytics" },
    ],
  },
  {
    title: "Analytics",
    icon: ArrowTrendingUpIcon,
    path: "/dashboard/analytics",
    children: [
      { title: "Sales Reports", path: "/dashboard/analytics/sales" },
      { title: "Performance", path: "/dashboard/analytics/performance" },
      { title: "Revenue", path: "/dashboard/analytics/revenue" },
      { title: "Traffic", path: "/dashboard/analytics/traffic" },
    ],
  },
  {
    title: "Finance",
    icon: BanknotesIcon,
    path: "/dashboard/finance",
    children: [
      { title: "Payments", path: "/dashboard/finance/payments" },
      { title: "Commissions", path: "/dashboard/finance/commissions" },
      { title: "Payouts", path: "/dashboard/finance/payouts" },
      { title: "Financial Reports", path: "/dashboard/finance/reports" },
    ],
  },
  {
    title: "Messages",
    icon: ChatBubbleLeftRightIcon,
    path: "/dashboard/messages",
    children: [
      { title: "Inbox", path: "/dashboard/messages/inbox" },
      { title: "Sent", path: "/dashboard/messages/sent" },
      { title: "Notifications", path: "/dashboard/messages/notifications" },
    ],
  },
  {
    title: "Settings",
    icon: Cog6ToothIcon,
    path: "/dashboard/settings",
    children: [
      { title: "General", path: "/dashboard/settings/general" },
      { title: "Users", path: "/dashboard/settings/users" },
      { title: "System", path: "/dashboard/settings/system" },
      { title: "Integrations", path: "/dashboard/settings/integrations" },
    ],
  },
];

const DashboardSidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const renderNav = (onItemClick?: () => void) => (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {menuItems.map((item) => {
        const active = isActive(item.path);
        return (
          <div key={item.path}>
            <Link
              to={item.path}
              onClick={onItemClick}
              className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                active
                  ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{item.title}</span>
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
              )}
            </Link>

            {item.children.length > 0 && active && (
              <div className="ml-7 mt-1 mb-1 space-y-0.5 border-l border-[var(--border)] pl-3">
                {item.children.map((child) => {
                  const childActive = location.pathname === child.path;
                  return (
                    <Link
                      key={child.path}
                      to={child.path}
                      onClick={onItemClick}
                      className={`block px-2 py-1.5 text-[13px] rounded-md transition-colors ${
                        childActive
                          ? "text-[var(--brand-primary)] font-medium"
                          : "text-[var(--text-muted)] hover:text-[var(--text)]"
                      }`}
                    >
                      {child.title}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  const Brand = (
    <div className="flex items-center gap-2.5 px-4 py-5">
      <Logo size={28} color={BRAND.accent} />
      <span
        className="text-xl font-semibold lowercase text-[var(--text)]"
        style={{ letterSpacing: "-0.045em", lineHeight: 0.9 }}
      >
        belgomla
      </span>
      <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]">
        Admin
      </span>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64 bg-[var(--surface)] border-r border-[var(--border)]">
          {Brand}
          {renderNav()}
        </div>
      </aside>

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[var(--surface)] border-r border-[var(--border)] transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between border-b border-[var(--border)] pr-2">
            {Brand}
            <button
              onClick={onClose}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text)]"
              aria-label="Close menu"
            >
              <XMarkIcon className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>
          {renderNav(onClose)}
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;
