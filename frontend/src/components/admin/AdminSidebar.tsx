import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useUserStore } from "../../stores/user.store";
import {
  HomeIcon,
  ShoppingBagIcon,
  // TagIcon,
  // UserGroupIcon,
  // CogIcon,
  // ClipboardDocumentListIcon,
  UserIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  // StarIcon,
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
      href: "/dashboard/vendors",
      icon: BuildingStorefrontIcon,
      roles: ["admin"],
    },
    {
      name: "Requests",
      href: "/dashboard/requests",
      icon: ClipboardDocumentListIcon,
      roles: ["admin"],
    },
    {
      name: "E-commerce",
      icon: ShoppingBagIcon,
      children: [
        { name: "Category", href: "/dashboard/category", roles: ["admin"] },
        { name: "Brands", href: "/dashboard/brands", roles: ["admin"] },
        {
          name: "Products",
          href: "/dashboard/products",
          roles: ["admin", "store"],
        },
        {
          name: "Coupons",
          href: "/dashboard/coupons",
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
      roles: ["admin"],
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
        collapsed ? "w-16 sm:w-20" : "w-48 sm:w-56 md:w-72"
      } flex flex-col border-r border-[#FFD600]/20 backdrop-blur-sm`}
    >
      {/* Logo */}
      <div className="p-3 sm:p-4 md:p-6 border-b border-[#FFD600]/30 bg-gradient-to-r from-[#FFD600]/10 to-transparent">
        <div className="flex items-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#FFD600] to-[#FFA500] rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
            <span className="text-[#333333] font-bold text-xs sm:text-sm lg:text-lg">
              B
            </span>
          </div>
          {!collapsed && (
            <span className="ml-2 sm:ml-3 md:ml-4 text-lg sm:text-xl md:text-2xl font-bold text-[#FFD600] tracking-wide">
              <Link to="/">ELGOMLA</Link>
            </span>
          )}
        </div>
      </div>

      {/* Active Page Icon (when collapsed) */}
      {collapsed && activeItem && (
        <div className="p-2 sm:p-3 md:p-4 border-b border-[#FFD600]/20">
          <div className="flex justify-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#FFD600]/30 to-[#FFD600]/10 rounded-xl flex items-center justify-center shadow-lg border border-[#FFD600]/50">
              <activeItem.icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFD600]" />
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 sm:p-3 md:p-4 space-y-1 sm:space-y-2 md:space-y-3 overflow-y-auto">
        {menuItems
          .filter((item) => {
            // Check if user has access to the item itself
            if (item.roles && !item.roles.includes(user?.role || "")) {
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
                    className="flex items-center px-3 sm:px-4 py-2 sm:py-3 text-[#E0E0E0] hover:bg-gradient-to-r hover:from-[#FFD600]/20 hover:to-[#FFD600]/10 hover:text-[#FFD600] rounded-xl cursor-pointer transition-all duration-300 ease-in-out transform hover:translate-x-1 hover:shadow-md border border-transparent hover:border-[#FFD600]/30"
                    onClick={() => toggleExpanded(item.name)}
                  >
                    <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    {!collapsed && (
                      <>
                        <span className="ml-2 sm:ml-3 md:ml-4 text-xs sm:text-sm font-semibold">
                          {item.name}
                        </span>
                        <svg
                          className={`ml-auto w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${
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
                    <div className="ml-6 sm:ml-8 md:ml-10 mt-1 sm:mt-2 space-y-1 sm:space-y-2">
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
                            className={`block px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm rounded-lg transition-all duration-300 ease-in-out transform hover:translate-x-1 ${
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
                  className={`flex items-center px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-300 ease-in-out transform hover:translate-x-1 hover:shadow-md border border-transparent hover:border-[#FFD600]/30 ${
                    isActive(item.href)
                      ? "bg-gradient-to-r from-[#FFD600]/30 to-[#FFD600]/20 text-[#FFD600] font-semibold shadow-lg border-[#FFD600]/50"
                      : "text-[#E0E0E0] hover:bg-gradient-to-r hover:from-[#FFD600]/20 hover:to-[#FFD600]/10 hover:text-[#FFD600]"
                  }`}
                >
                  <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  {!collapsed && (
                    <span className="ml-2 sm:ml-3 md:ml-4 text-xs sm:text-sm font-semibold">
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
