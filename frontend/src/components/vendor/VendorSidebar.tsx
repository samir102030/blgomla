import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface VendorSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const VendorSidebar: React.FC<VendorSidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const menuItems = [
    {
      title: 'Dashboard',
      icon: '📊',
      path: '/vendor',
      children: []
    },
    {
      title: 'Store',
      icon: '🏪',
      path: '/vendor/store',
      children: []
    },
    {
      title: 'Products',
      icon: '📦',
      path: '/vendor/products',
      children: [
        { title: 'All Products', path: '/vendor/products' },
        { title: 'Add Product', path: '/vendor/products/add' },
        { title: 'Inventory', path: '/vendor/products/inventory' }
      ]
    },
    {
      title: 'Orders',
      icon: '🛒',
      path: '/vendor/orders',
      children: [
        { title: 'All Orders', path: '/vendor/orders' },
        { title: 'Pending', path: '/vendor/orders/pending' },
        { title: 'Processing', path: '/vendor/orders/processing' },
        { title: 'Completed', path: '/vendor/orders/completed' }
      ]
    },
    {
      title: 'Analytics',
      icon: '📈',
      path: '/vendor/analytics',
      children: [
        { title: 'Overview', path: '/vendor/analytics' },
        { title: 'Sales Analytics', path: '/vendor/analytics/sales' },
        { title: 'Product Analytics', path: '/vendor/analytics/products' }
      ]
    },
    {
      title: 'Customers',
      icon: '👥',
      path: '/vendor/customers',
      children: [
        { title: 'All Customers', path: '/vendor/customers' },
        { title: 'Reviews', path: '/vendor/reviews' }
      ]
    },
    {
      title: 'Marketing',
      icon: '📢',
      path: '/vendor/marketing',
      children: [
        { title: 'Overview', path: '/vendor/marketing' },
        { title: 'Promotions', path: '/vendor/marketing/promotions' },
        { title: 'Coupons', path: '/vendor/marketing/coupons' }
      ]
    },
    {
      title: 'Settings',
      icon: '⚙️',
      path: '/vendor/settings',
      children: [
        { title: 'Profile', path: '/vendor/settings/profile' },
        { title: 'Notifications', path: '/vendor/settings/notifications' },
        { title: 'Billing', path: '/vendor/settings/billing' }
      ]
    },
    {
      title: 'Support',
      icon: '🎧',
      path: '/vendor/support',
      children: [
        { title: 'Help Center', path: '/vendor/support' },
        { title: 'Support Tickets', path: '/vendor/support/tickets' },
        { title: 'Documentation', path: '/vendor/support/documentation' }
      ]
    }
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const toggleMenu = (title: string) => {
    setExpandedMenus(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0 px-4">
              <img className="h-8 w-auto" src="/logo.png" alt="Belgomla" />
              <span className="ml-2 text-xl font-bold text-gray-900">Vendor</span>
            </div>

            {/* Navigation */}
            <nav className="mt-8 flex-1 px-2 space-y-1">
              {menuItems.map((item) => (
                <div key={item.title}>
                  {item.children.length > 0 ? (
                    <div>
                      <button
                        onClick={() => toggleMenu(item.title)}
                        className={`w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                          isActive(item.path)
                            ? 'bg-yellow-100 text-yellow-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span className="mr-3 text-lg">{item.icon}</span>
                        <span className="flex-1 text-left">{item.title}</span>
                        <span className={`ml-3 transform transition-transform ${
                          expandedMenus.includes(item.title) ? 'rotate-90' : ''
                        }`}>
                          ▶
                        </span>
                      </button>
                      {expandedMenus.includes(item.title) && (
                        <div className="mt-1 space-y-1">
                          {item.children.map((child) => (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={onClose}
                              className={`group flex items-center pl-11 pr-2 py-2 text-sm font-medium rounded-md transition-colors ${
                                isActive(child.path)
                                  ? 'bg-yellow-100 text-yellow-900'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                            >
                              {child.title}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={item.path}
                      onClick={onClose}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive(item.path)
                          ? 'bg-yellow-100 text-yellow-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="mr-3 text-lg">{item.icon}</span>
                      {item.title}
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* Footer */}
            <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                <p>Belgomla Vendor Portal</p>
                <p>Version 1.0.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <img className="h-8 w-auto" src="/logo.png" alt="Belgomla" />
              <span className="ml-2 text-xl font-bold text-gray-900">Vendor</span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <div key={item.title}>
                {item.children.length > 0 ? (
                  <div>
                    <button
                      onClick={() => toggleMenu(item.title)}
                      className={`w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive(item.path)
                          ? 'bg-yellow-100 text-yellow-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="mr-3 text-lg">{item.icon}</span>
                      <span className="flex-1 text-left">{item.title}</span>
                      <span className={`ml-3 transform transition-transform ${
                        expandedMenus.includes(item.title) ? 'rotate-90' : ''
                      }`}>
                        ▶
                      </span>
                    </button>
                    {expandedMenus.includes(item.title) && (
                      <div className="mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            onClick={onClose}
                            className={`group flex items-center pl-11 pr-2 py-2 text-sm font-medium rounded-md transition-colors ${
                              isActive(child.path)
                                ? 'bg-yellow-100 text-yellow-900'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive(item.path)
                        ? 'bg-yellow-100 text-yellow-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.title}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* Mobile Footer */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <p>Belgomla Vendor Portal</p>
              <p>Version 1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VendorSidebar;
