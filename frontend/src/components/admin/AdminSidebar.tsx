import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useUserStore } from "../../stores/user.store";
import {
  HomeIcon,
  ShoppingBagIcon,
  // TagIcon,
  // UserGroupIcon,
  // CogIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  ChatBubbleLeftRightIcon,
  StarIcon,
} from "@heroicons/react/24/outline";

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed }) => {
  const location = useLocation();
  const user = useUserStore((s) => s.user);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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
    { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
    {
      name: "Vendors",
      icon: BuildingStorefrontIcon,
      children: [
        {
          name: "Vendor Requests",
          href: "/dashboard/vendors/requests",
          roles: ["admin"],
        },
        {
          name: "All Vendors",
          href: "/dashboard/vendors/all",
          roles: ["admin"],
        },
        {
          name: "Approved Vendors",
          href: "/dashboard/vendors/approved",
          roles: ["admin"],
        },
        {
          name: "Rejected Vendors",
          href: "/dashboard/vendors/rejected",
          roles: ["admin"],
        },
        {
          name: "Vendor Analytics",
          href: "/dashboard/vendors/analytics",
          roles: ["admin"],
        },
      ],
    },
    {
      name: "E-commerce",
      icon: ShoppingBagIcon,
      children: [
        { name: "Category", href: "/dashboard/category", roles: ["admin"] },
        {
          name: "Products",
          href: "/dashboard/products",
          roles: ["admin", "store"],
        },
        // { name: "Attributes", href: "/dashboard/attributes" },
        { name: "Order", href: "/dashboard/order", roles: ["admin", "store"] },
      ],
    },
    { name: "User", href: "/dashboard/user", icon: UserIcon, roles: ["admin"] },
    {
      name: "Customer Reviews",
      href: "/dashboard/reviews",
      icon: ChatBubbleLeftRightIcon,
      roles: ["admin", "store"],
    },
    {
      name: "Customer Support",
      href: "/dashboard/support",
      icon: ChatBubbleLeftRightIcon,
      roles: ["admin", "store"],
    },
    {
      name: "Sales",
      href: "/dashboard/sales",
      icon: ChartBarIcon,
      roles: ["admin", "store"],
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
      className={`bg-gradient-to-b from-[#001F3F] to-[#002B5B] shadow-2xl transition-all duration-500 ease-in-out ${
        collapsed ? "w-16" : "w-72"
      } flex flex-col border-r border-[#FFD600]/20 backdrop-blur-sm`}
    >
      {/* Logo */}
      <div className="p-6 border-b border-[#FFD600]/30 bg-gradient-to-r from-[#FFD600]/10 to-transparent">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-[#FFD600] to-[#FFA500] rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
            <span className="text-[#333333] font-bold text-lg">B</span>
          </div>
          {!collapsed && (
            <span className="ml-4 text-2xl font-bold text-[#FFD600] tracking-wide">
              ELGOMLA
            </span>
          )}
        </div>
      </div>

      {/* Active Page Icon (when collapsed) */}
      {collapsed && activeItem && (
        <div className="p-4 border-b border-[#FFD600]/20">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-[#FFD600]/30 to-[#FFD600]/10 rounded-xl flex items-center justify-center shadow-lg border border-[#FFD600]/50">
              <activeItem.icon className="w-6 h-6 text-[#FFD600]" />
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
        {menuItems
          .filter((item) => {
            // Check if user has access to the item itself
            if (item.roles && !item.roles.includes(user?.role || "")) {
              return false;
            }

            // For items with children, check if user has access to any child
            if (item.children) {
              const accessibleChildren = item.children.filter(
                (child) =>
                  !child.roles || child.roles.includes(user?.role || "")
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
                    className="flex items-center px-4 py-3 text-[#E0E0E0] hover:bg-gradient-to-r hover:from-[#FFD600]/20 hover:to-[#FFD600]/10 hover:text-[#FFD600] rounded-xl cursor-pointer transition-all duration-300 ease-in-out transform hover:translate-x-1 hover:shadow-md border border-transparent hover:border-[#FFD600]/30"
                    onClick={() => toggleExpanded(item.name)}
                  >
                    <item.icon className="w-6 h-6" />
                    {!collapsed && (
                      <>
                        <span className="ml-4 text-sm font-semibold">
                          {item.name}
                        </span>
                        <svg
                          className={`ml-auto w-5 h-5 transition-transform duration-300 ${
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
                    <div className="ml-10 mt-2 space-y-2">
                      {item.children
                        .filter(
                          (child) =>
                            !child.roles ||
                            child.roles.includes(user?.role || "")
                        )
                        .map((child, childIndex) => (
                          <Link
                            key={childIndex}
                            to={child.href}
                            className={`block px-4 py-2 text-sm rounded-lg transition-all duration-300 ease-in-out transform hover:translate-x-1 ${
                              isActive(child.href)
                                ? "bg-gradient-to-r from-[#FFD600]/30 to-[#FFD600]/20 text-[#FFD600] font-semibold shadow-lg border border-[#FFD600]/50"
                                : "text-[#B0B0B0] hover:bg-gradient-to-r hover:from-[#FFD600]/15 hover:to-[#FFD600]/5 hover:text-[#FFD600] border border-transparent hover:border-[#FFD600]/20"
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
                  className={`flex items-center px-4 py-3 rounded-xl transition-all duration-300 ease-in-out transform hover:translate-x-1 hover:shadow-md border border-transparent hover:border-[#FFD600]/30 ${
                    isActive(item.href)
                      ? "bg-gradient-to-r from-[#FFD600]/30 to-[#FFD600]/20 text-[#FFD600] font-semibold shadow-lg border-[#FFD600]/50"
                      : "text-[#E0E0E0] hover:bg-gradient-to-r hover:from-[#FFD600]/20 hover:to-[#FFD600]/10 hover:text-[#FFD600]"
                  }`}
                >
                  <item.icon className="w-6 h-6" />
                  {!collapsed && (
                    <span className="ml-4 text-sm font-semibold">
                      {item.name}
                    </span>
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
