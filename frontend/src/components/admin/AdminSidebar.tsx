import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useUserStore } from "../../stores/user.store";
import { useTranslation } from "react-i18next";
import {
  HomeIcon,
  ShoppingBagIcon,
  TagIcon,
  // UserGroupIcon,
  // CogIcon,
  // ClipboardDocumentListIcon,
  UserIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  MegaphoneIcon,
  ClipboardDocumentCheckIcon,
  ShieldCheckIcon,
  // StarIcon,
} from "@heroicons/react/24/outline";
import Logo, { BRAND } from "../Logo";

interface AdminSidebarProps {
  collapsed: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  collapsed,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useUserStore((s) => s.user);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const hasAccess = (roles?: string[]) => {
    if (!roles) return true;
    const currentRole = user?.role || "";
    return (
      roles.includes(currentRole) ||
      (currentRole === "super_admin" && roles.includes("admin"))
    );
  };

  const toggleExpanded = (itemName: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  // Full admin navigation. Routes correspond to AdminRoutes.tsx.
  const menuItems = [
    { name: t("admin.dashboard"), href: "/dashboard", icon: HomeIcon },

    // ── Vendor management ─────────────────────────────────────
    {
      name: t("admin.vendors"),
      icon: BuildingStorefrontIcon,
      roles: ["admin"],
      children: [
        { name: "All Vendors", href: "/dashboard/vendors", roles: ["admin"] },
        { name: t("admin.requests"), href: "/dashboard/requests", roles: ["admin"] },
        { name: "Product Approvals", href: "/dashboard/approvals", roles: ["admin"] },
        { name: "Admins", href: "/dashboard/admins", roles: ["super_admin"] },
      ],
    },

    // ── Catalog / E-commerce ─────────────────────────────────
    {
      name: t("admin.ecommerce"),
      icon: ShoppingBagIcon,
      children: [
        { name: t("admin.products"), href: "/dashboard/products", roles: ["admin", "store"] },
        { name: t("admin.category"), href: "/dashboard/category", roles: ["admin"] },
        { name: t("admin.brands"), href: "/dashboard/brands", roles: ["admin"] },
        { name: t("admin.collections"), href: "/dashboard/collections", roles: ["admin", "store"] },
        { name: t("admin.coupons"), href: "/dashboard/coupons", roles: ["admin", "store"] },
        { name: t("admin.advertisements"), href: "/dashboard/advertisements", roles: ["admin"] },
      ],
    },

    // ── Order operations ─────────────────────────────────────
    {
      name: t("admin.order"),
      icon: ClipboardDocumentListIcon,
      children: [
        { name: "All Orders", href: "/dashboard/order", roles: ["admin", "store"] },
        { name: t("admin.returns"), href: "/dashboard/returns", roles: ["admin", "store"] },
        { name: t("Quotations"), href: "/dashboard/quotations", roles: ["admin"] },
        { name: "Inventory Alerts", href: "/dashboard/inventory", roles: ["admin", "store"] },
      ],
    },

    // ── Customers / CRM ──────────────────────────────────────
    {
      name: "Customers",
      icon: UserIcon,
      children: [
        { name: t("admin.user"), href: "/dashboard/user", roles: ["admin"] },
        { name: t("admin.customerReviews"), href: "/dashboard/reviews", roles: ["admin"] },
        { name: t("admin.customerSupport"), href: "/dashboard/support", roles: ["admin"] },
      ],
    },

    // ── Analytics & Finance ──────────────────────────────────
    {
      name: t("admin.sales"),
      icon: ChartBarIcon,
      children: [
        { name: "Sales Overview", href: "/dashboard/sales", roles: ["admin", "store"] },
        { name: "Payments", href: "/dashboard/payments", roles: ["admin"] },
        { name: "Customer Analytics", href: "/dashboard/customers", roles: ["admin"] },
        { name: "Visitor Analytics", href: "/dashboard/visitors", roles: ["admin"] },
      ],
    },

    // ── Quick-access top-level entries (kept flat for visibility) ──
    {
      name: "Approvals",
      href: "/dashboard/approvals",
      icon: ClipboardDocumentCheckIcon,
      roles: ["admin"],
    },
    {
      name: "Communications",
      href: "/dashboard/support",
      icon: ChatBubbleLeftRightIcon,
      roles: ["admin"],
    },
    {
      name: "Promotions",
      href: "/dashboard/advertisements",
      icon: MegaphoneIcon,
      roles: ["admin"],
    },
    {
      name: "Roles & Access",
      href: "/dashboard/admins",
      icon: ShieldCheckIcon,
      roles: ["admin", "super_admin"],
    },
    {
      name: t("admin.collections"),
      href: "/dashboard/collections",
      icon: TagIcon,
      roles: ["store"],
    },
  ];

  const isActive = (href: string) => location.pathname === href;

  // Find the currently active menu item or child
  const getActiveItem = () => {
    for (const item of menuItems) {
      if (item.children) {
        const activeChild = item.children.find((child) => isActive(child.href));
        if (activeChild) {
          return { ...activeChild, icon: item.icon };
        }
      } else if (isActive(item.href)) {
        return item;
      }
    }
    return null;
  };

  const activeItem = getActiveItem();

  // On mobile (<lg) the sidebar always renders fully expanded inside a drawer,
  // so we ignore `collapsed` there. On desktop (>=lg) we honor `collapsed`.
  const showLabels = !collapsed || mobileOpen;

  return (
    <aside
      className={`
        bg-[var(--surface)] border-r border-[var(--border)] flex flex-col
        transition-all duration-300 ease-in-out
        fixed inset-y-0 left-0 z-50 w-64
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:static lg:translate-x-0
        ${collapsed ? "lg:w-20" : "lg:w-72"}
      `}
    >
      {/* Brand */}
      <div className="px-3 sm:px-4 py-4 sm:py-5 border-b border-[var(--border)] flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5"
          onClick={onCloseMobile}
        >
          <Logo size={28} color={BRAND.orange} />
          {showLabels && (
            <>
              <span
                className="text-xl font-semibold lowercase text-[var(--text)]"
                style={{ letterSpacing: "-0.045em", lineHeight: 0.9 }}
              >
                belgomla
              </span>
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]">
                Admin
              </span>
            </>
          )}
        </Link>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Active page icon when collapsed (desktop only) */}
      {!showLabels && activeItem && (
        <div className="px-3 py-3 border-b border-[var(--border)] hidden lg:block">
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary)]/10 flex items-center justify-center">
              <activeItem.icon className="w-5 h-5 text-[var(--brand-primary)]" />
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 sm:p-3 md:p-4 space-y-1 sm:space-y-2 md:space-y-3 overflow-y-auto">
        {menuItems
          .filter((item) => {
            // Check if user has access to the item itself
            if (!hasAccess(item.roles)) {
              return false;
            }

            // Check user status
            if (!user?.active || user?.deleted) {
              console.log("User inactive or deleted");
              return false;
            }

            // Only store-role users go through the store-approval check.
            // Admins and super_admins are unaffected even if user.store is null.
            if (user?.role === "store") {
              if (
                !user.store ||
                user.store.status !== "approved" ||
                user.store.deleted
              ) {
                return false;
              }
            }

            // For items with children, check if user has access to any child
            if (item.children) {
              const accessibleChildren = item.children.filter(
                (child) => hasAccess(child.roles),
              );
              return accessibleChildren.length > 0;
            }

            return true;
          })
          .map((item, index) => (
            <div key={index}>
              {item.children ? (
                <div className="group">
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] rounded-lg cursor-pointer transition-colors"
                    onClick={() => toggleExpanded(item.name)}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {showLabels && (
                      <>
                        <span className="text-sm font-medium">
                          {item.name}
                        </span>
                        <svg
                          className={`ml-auto w-4 h-4 transition-transform duration-200 ${
                            expandedItems.has(item.name) ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </>
                    )}
                  </div>
                  {showLabels && expandedItems.has(item.name) && (
                    <div className="ml-7 mt-1 mb-1 space-y-0.5 border-l border-[var(--border)] pl-3">
                      {item.children
                        .filter((child) => hasAccess(child.roles))
                        .map((child, childIndex) => (
                          <Link
                            key={childIndex}
                            to={child.href}
                            onClick={onCloseMobile}
                            className={`block px-2 py-1.5 text-[13px] rounded-md transition-colors ${
                              isActive(child.href)
                                ? "text-[var(--brand-primary)] font-medium"
                                : "text-[var(--text-muted)] hover:text-[var(--text)]"
                            }`}
                          >
                            {child.name}
                          </Link>
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={item.href}
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-medium"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {showLabels && (
                    <span className="text-sm">{item.name}</span>
                  )}
                  {showLabels && isActive(item.href) && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
                  )}
                </Link>
              )}
            </div>
          ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
