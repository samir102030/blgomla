import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon,
  ShoppingBagIcon,
  TagIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  ChartBarIcon,
  CogIcon,
  BuildingStorefrontIcon,

} from '@heroicons/react/24/outline';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed }) => {
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Vendors', icon: BuildingStorefrontIcon, children: [
      { name: 'Vendor Requests', href: '/dashboard/vendors/requests' },
      { name: 'All Vendors', href: '/dashboard/vendors/all' },
      { name: 'Approved Vendors', href: '/dashboard/vendors/approved' },
      { name: 'Rejected Vendors', href: '/dashboard/vendors/rejected' },
      { name: 'Vendor Analytics', href: '/dashboard/vendors/analytics' },
    ]},
    { name: 'E-commerce', icon: ShoppingBagIcon, children: [
      { name: 'Category', href: '/dashboard/category' },
      { name: 'Products', href: '/dashboard/products' },
      { name: 'Attributes', href: '/dashboard/attributes' },
      { name: 'Order', href: '/dashboard/order' },
    ]},
    { name: 'User', href: '/dashboard/user', icon: UserIcon },
    { name: 'Sales', href: '/dashboard/sales', icon: ChartBarIcon },
    { name: 'Gallery', href: '/dashboard/gallery', icon: TagIcon },
    { name: 'Report', href: '/dashboard/report', icon: ClipboardDocumentListIcon },
    { name: 'Location', href: '/dashboard/location', icon: BuildingStorefrontIcon },
    { name: 'Pages', href: '/dashboard/pages', icon: TagIcon },
    { name: 'Components', href: '/dashboard/components', icon: CogIcon },
    { name: 'Help Center', href: '/dashboard/help', icon: UserGroupIcon },
    { name: 'FAQs', href: '/dashboard/faqs', icon: TagIcon },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className={`bg-[#002B5B] shadow-lg transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} flex flex-col`}>
      {/* Logo */}
      <div className="p-4 border-b border-[#FFD600]/20">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-[#FFD600] rounded-lg flex items-center justify-center">
            <span className="text-[#333333] font-bold text-sm">B</span>
          </div>
          {!collapsed && (
            <span className="ml-3 text-xl font-semibold text-[#FFD600]">ELGOMLA</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item, index) => (
          <div key={index}>
            {item.children ? (
              <div>
                <div className="flex items-center px-3 py-2 text-[#9E9E9E] hover:bg-[#FFD600]/10 hover:text-[#FFD600] rounded-lg cursor-pointer">
                  <item.icon className="w-5 h-5" />
                  {!collapsed && (
                    <>
                      <span className="ml-3 text-sm font-medium">{item.name}</span>
                      <svg className="ml-auto w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </div>
                {!collapsed && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.children.map((child, childIndex) => (
                      <Link
                        key={childIndex}
                        to={child.href}
                        className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                          isActive(child.href)
                            ? 'bg-[#FFD600]/20 text-[#FFD600] font-medium'
                            : 'text-[#9E9E9E] hover:bg-[#FFD600]/10 hover:text-[#FFD600]'
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
                className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-[#FFD600]/20 text-[#FFD600] font-medium'
                    : 'text-[#9E9E9E] hover:bg-[#FFD600]/10 hover:text-[#FFD600]'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {!collapsed && (
                  <span className="ml-3 text-sm font-medium">{item.name}</span>
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
