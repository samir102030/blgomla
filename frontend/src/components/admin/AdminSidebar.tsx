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
  RocketLaunchIcon,
  TruckIcon,
  BanknotesIcon,
  // StarIcon,
} from "@heroicons/react/24/outline";
import Logo, { BRAND } from "../Logo";
import { useCan } from "../../lib/permissions";

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
  const can = useCan();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Prefer permission-based gating (item.perm); fall back to legacy role lists.
  const hasAccess = (item?: { perm?: string | string[]; roles?: string[] }) => {
    if (!item) return true;
    if (item.perm) return can(item.perm);
    if (!item.roles) return true;
    const currentRole = user?.role || "";
    return (
      item.roles.includes(currentRole) ||
      (currentRole === "super_admin" && item.roles.includes("admin"))
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
      children: [
        { name: t("admin.allVendors"), href: "/dashboard/vendors", perm: "vendors.view" },
        { name: t("admin.requests"), href: "/dashboard/requests", perm: "vendors.approve" },
        { name: t("admin.productApprovals"), href: "/dashboard/approvals", perm: "products.approve" },
        { name: t("admin.admins"), href: "/dashboard/admins", perm: "roles.manage" },
      ],
    },

    // ── Catalog / E-commerce ─────────────────────────────────
    {
      name: t("admin.ecommerce"),
      icon: ShoppingBagIcon,
      children: [
        { name: t("admin.products"), href: "/dashboard/products", perm: "products.view" },
        { name: t("admin.category"), href: "/dashboard/category", perm: "categories.manage" },
        { name: t("admin.brands"), href: "/dashboard/brands", perm: "brands.manage" },
        { name: t("admin.collections"), href: "/dashboard/collections", perm: "collections.view" },
        { name: t("admin.coupons"), href: "/dashboard/coupons", perm: "coupons.view" },
        { name: t("admin.advertisements"), href: "/dashboard/advertisements", perm: "advertisements.manage" },
        { name: t("admin.mosaic", "Card Mosaic"), href: "/dashboard/mosaic", perm: "mosaic.manage" },
        { name: t("admin.layout", "Page layout"), href: "/dashboard/layout", perm: "layout.manage" },
      ],
    },

    // ── Order operations ─────────────────────────────────────
    {
      name: t("admin.order"),
      icon: ClipboardDocumentListIcon,
      children: [
        { name: t("admin.allOrders"), href: "/dashboard/order", perm: "orders.view" },
        { name: t("admin.returns"), href: "/dashboard/returns", perm: "returns.view" },
        { name: t("admin.quotations"), href: "/dashboard/quotations", perm: "quotations.view" },
        { name: t("admin.installations", "Installation jobs"), href: "/dashboard/installations", perm: "installations.view" },
        { name: t("admin.inventoryAlerts"), href: "/dashboard/inventory", perm: "products.view" },
      ],
    },

    // ── Customers / CRM ──────────────────────────────────────
    {
      name: t("admin.customers"),
      icon: UserIcon,
      children: [
        { name: t("admin.user"), href: "/dashboard/user", perm: "users.view" },
        { name: t("admin.customerReviews"), href: "/dashboard/reviews", perm: "reviews.manage" },
        { name: t("admin.customerSupport"), href: "/dashboard/support", perm: "support.view" },
      ],
    },

    // ── Analytics & Finance ──────────────────────────────────
    {
      name: t("admin.sales"),
      icon: ChartBarIcon,
      children: [
        { name: t("admin.salesOverview"), href: "/dashboard/sales", perm: "analytics.view" },
        { name: t("admin.payments"), href: "/dashboard/payments", roles: ["admin"] },
        { name: t("admin.paymobChannels", "Paymob channels"), href: "/dashboard/paymob-channels", perm: "payments.channels" },
        { name: t("admin.customerAnalytics"), href: "/dashboard/customers", roles: ["admin"] },
        { name: t("admin.visitorAnalytics"), href: "/dashboard/visitors", roles: ["admin"] },
      ],
    },

    // ── Quick-access top-level entries (kept flat for visibility) ──
    {
      name: t("admin.approvals"),
      href: "/dashboard/approvals",
      icon: ClipboardDocumentCheckIcon,
      perm: "products.approve",
    },
    {
      name: t("admin.communications"),
      href: "/dashboard/support",
      icon: ChatBubbleLeftRightIcon,
      perm: "support.view",
    },
    {
      name: t("admin.promotions"),
      href: "/dashboard/advertisements",
      icon: MegaphoneIcon,
      perm: "advertisements.manage",
    },
    {
      name: t("Roles & Access"),
      href: "/dashboard/roles",
      icon: ShieldCheckIcon,
      perm: "roles.manage",
    },
    {
      name: t("Audit Log"),
      href: "/dashboard/audit-log",
      icon: ClipboardDocumentListIcon,
      perm: "audit.view",
    },
    {
      name: t("admin.siteMode", "Coming Soon"),
      href: "/dashboard/site-mode",
      icon: RocketLaunchIcon,
      perm: "siteMode.view",
    },
    {
      name: t("admin.shipping", "Shipping"),
      href: "/dashboard/shipping",
      icon: TruckIcon,
      perm: "shipping.manage",
    },
    {
      name: t("admin.accurate", "Accurate shipping"),
      href: "/dashboard/accurate",
      icon: TruckIcon,
      perm: "shipping.manage",
    },
    {
      name: t("admin.payouts", "Vendor payouts"),
      href: "/dashboard/payouts",
      icon: BanknotesIcon,
      perm: "payouts.manage",
    },
    {
      name: t("admin.collections"),
      href: "/dashboard/collections",
      icon: TagIcon,
      perm: "collections.view",
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
                {t('admin.adminBadge')}
              </span>
            </>
          )}
        </Link>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
            aria-label={t('admin.closeMenu')}
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
            if (!hasAccess(item)) {
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
                (child) => hasAccess(child),
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
                        .filter((child) => hasAccess(child))
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
