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
  onToggle: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed }) => {
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

  const menuItems = [
    { name: t("admin.dashboard"), href: "/dashboard", icon: HomeIcon },
    {
      name: t("admin.vendors"),
      href: "/dashboard/vendors",
      icon: BuildingStorefrontIcon,
      roles: ["admin"],
    },
    {
      name: t("admin.requests"),
      href: "/dashboard/requests",
      icon: ClipboardDocumentListIcon,
      roles: ["admin"],
    },
    {
      name: "Approvals",
      href: "/dashboard/approvals",
      icon: ClipboardDocumentCheckIcon,
      roles: ["admin"],
    },
    {
      name: "Admins",
      href: "/dashboard/admins",
      icon: ShieldCheckIcon,
      roles: ["super_admin"],
    },
    {
      name: t("admin.ecommerce"),
      icon: ShoppingBagIcon,
      children: [
        {
          name: t("admin.category"),
          href: "/dashboard/category",
          roles: ["admin"],
        },
        {
          name: t("admin.brands"),
          href: "/dashboard/brands",
          roles: ["admin"],
        },
        {
          name: t("admin.products"),
          href: "/dashboard/products",
          roles: ["admin", "store"],
        },
        {
          name: t("admin.coupons"),
          href: "/dashboard/coupons",
          roles: ["admin", "store"],
        },
        // { name: "Attributes", href: "/dashboard/attributes" },
        {
          name: t("admin.order"),
          href: "/dashboard/order",
          roles: ["admin", "store"],
        },
        {
          name: t("admin.collections"),
          href: "/dashboard/vendor-collections",
          roles: ["store"],
        },
      ],
    },
    {
      name: t("admin.returns"),
      href: "/dashboard/returns",
      icon: ClipboardDocumentListIcon,
      roles: ["admin", "store"],
    },
    {
      name: t("admin.collections"),
      href: "/dashboard/collections",
      icon: TagIcon,
      roles: ["admin", "store"],
    },
    {
      name: t("Quotations"),
      href: "/dashboard/quotations",
      icon: ClipboardDocumentListIcon,
      roles: ["admin"],
    },
    {
      name: t("admin.user"),
      href: "/dashboard/user",
      icon: UserIcon,
      roles: ["admin"],
    },
    {
      name: t("admin.customerReviews"),
      href: "/dashboard/reviews",
      icon: ChatBubbleLeftRightIcon,
      roles: ["admin"],
    },
    {
      name: t("admin.customerSupport"),
      href: "/dashboard/support",
      icon: ChatBubbleLeftRightIcon,
      roles: ["admin"],
    },
    {
      name: t("admin.sales"),
      icon: ChartBarIcon,
      children: [
        {
          name: "Sales Overview",
          href: "/dashboard/sales",
          roles: ["admin", "store"],
        },
        {
          name: "Payments",
          href: "/dashboard/payments",
          roles: ["admin"],
        },
        {
          name: "Inventory Alerts",
          href: "/dashboard/inventory",
          roles: ["admin", "store"],
        },
        {
          name: "Customers",
          href: "/dashboard/customers",
          roles: ["admin"],
        },
        {
          name: "Visitors",
          href: "/dashboard/visitors",
          roles: ["admin"],
        },
      ],
    },
    {
      name: t("admin.advertisements"),
      href: "/dashboard/advertisements",
      icon: MegaphoneIcon,
      roles: ["admin"],
    },
    // { name: "Gallery", href: "/dashboard/gallery", icon: TagIcon },
    // {
    //   name: "Report",
    //   href: "/dashboard/report",
    //   icon: ClipboardDocumentListIcon,
    //   roles: ["admin", "store"],
    // },
    // {
    //   name: "Location",
    //   href: "/dashboard/location",
    //   icon: BuildingStorefrontIcon,
    // },
    // { name: "Pages", href: "/dashboard/pages", icon: TagIcon },
    // { name: "Components", href: "/dashboard/components", icon: CogIcon },
    // { name: "Help Center", href: "/dashboard/help", icon: UserGroupIcon },
    // { name: "FAQs", href: "/dashboard/faqs", icon: TagIcon },
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

  return (
    <div
      className={`bg-[var(--surface)] transition-all duration-300 ease-in-out ${
        collapsed ? "w-16 sm:w-20" : "w-48 sm:w-56 md:w-72"
      } flex flex-col border-r border-[var(--border)]`}
    >
      {/* Brand */}
      <div className="px-3 sm:px-4 py-4 sm:py-5 border-b border-[var(--border)]">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size={28} color={BRAND.orange} />
          {!collapsed && (
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
      </div>

      {/* Active page icon when collapsed */}
      {collapsed && activeItem && (
        <div className="px-3 py-3 border-b border-[var(--border)]">
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

            // If user is store, check store approval
            if (user?.role === "store") {
              // console.log("store", user.store);
              if (
                // !user.store ||
                user.store.status !== "approved" ||
                user.store.deleted
              ) {
                console.log("Store not approved or deleted");
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
                    {!collapsed && (
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
                  {!collapsed && expandedItems.has(item.name) && (
                    <div className="ml-7 mt-1 mb-1 space-y-0.5 border-l border-[var(--border)] pl-3">
                      {item.children
                        .filter((child) => hasAccess(child.roles))
                        .map((child, childIndex) => (
                          <Link
                            key={childIndex}
                            to={child.href}
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-medium"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm">{item.name}</span>
                  )}
                  {!collapsed && isActive(item.href) && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
                  )}
                </Link>
              )}
            </div>
          ))}
      </nav>
    </div>
  );
};

export default AdminSidebar;
