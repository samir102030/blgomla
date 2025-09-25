import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const DashboardSidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  const menuItems = [
    {
      title: 'Dashboard',
      icon: '📊',
      path: '/dashboard',
      children: []
    },
    {
      title: 'Vendors',
      icon: '🏪',
      path: '/dashboard/vendors',
      children: [
        { title: 'All Vendors', path: '/dashboard/vendors' },
        { title: 'Add Vendor', path: '/dashboard/vendors/add' },
        { title: 'Vendor Requests', path: '/dashboard/vendors/requests' },
        { title: 'Vendor Analytics', path: '/dashboard/vendors/analytics' }
      ]
    },
    {
      title: 'Products',
      icon: '📦',
      path: '/dashboard/products',
      children: [
        { title: 'All Products', path: '/dashboard/products' },
        { title: 'Add Product', path: '/dashboard/products/add' },
        { title: 'Categories', path: '/dashboard/products/categories' },
        { title: 'Inventory', path: '/dashboard/products/inventory' }
      ]
    },
    {
      title: 'Orders',
      icon: '🛒',
      path: '/dashboard/orders',
      children: [
        { title: 'All Orders', path: '/dashboard/orders' },
        { title: 'Pending Orders', path: '/dashboard/orders/pending' },
        { title: 'Processing', path: '/dashboard/orders/processing' },
        { title: 'Completed', path: '/dashboard/orders/completed' }
      ]
    },
    {
      title: 'CRM',
      icon: '👥',
      path: '/dashboard/crm',
      children: [
        { title: 'Customers', path: '/dashboard/crm/customers' },
        { title: 'Support Tickets', path: '/dashboard/crm/tickets' },
        { title: 'Communications', path: '/dashboard/crm/communications' },
        { title: 'Customer Analytics', path: '/dashboard/crm/analytics' }
      ]
    },
    {
      title: 'Analytics',
      icon: '📈',
      path: '/dashboard/analytics',
      children: [
        { title: 'Sales Reports', path: '/dashboard/analytics/sales' },
        { title: 'Performance', path: '/dashboard/analytics/performance' },
        { title: 'Revenue', path: '/dashboard/analytics/revenue' },
        { title: 'Traffic', path: '/dashboard/analytics/traffic' }
      ]
    },
    {
      title: 'Finance',
      icon: '💰',
      path: '/dashboard/finance',
      children: [
        { title: 'Payments', path: '/dashboard/finance/payments' },
        { title: 'Commissions', path: '/dashboard/finance/commissions' },
        { title: 'Payouts', path: '/dashboard/finance/payouts' },
        { title: 'Financial Reports', path: '/dashboard/finance/reports' }
      ]
    },
    {
      title: 'Messages',
      icon: '💬',
      path: '/dashboard/messages',
      children: [
        { title: 'Inbox', path: '/dashboard/messages/inbox' },
        { title: 'Sent', path: '/dashboard/messages/sent' },
        { title: 'Notifications', path: '/dashboard/messages/notifications' }
      ]
    },
    {
      title: 'Settings',
      icon: '⚙️',
      path: '/dashboard/settings',
      children: [
        { title: 'General', path: '/dashboard/settings/general' },
        { title: 'Users', path: '/dashboard/settings/users' },
        { title: 'System', path: '/dashboard/settings/system' },
        { title: 'Integrations', path: '/dashboard/settings/integrations' }
      ]
    }
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
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
              <span className="ml-2 text-xl font-bold text-gray-900">Admin</span>
            </div>
            
            {/* Navigation */}
            <nav className="mt-8 flex-1 px-2 space-y-1">
              {menuItems.map((item) => (
                <div key={item.path}>
                  <Link
                    to={item.path}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive(item.path)
                        ? 'bg-yellow-100 text-yellow-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.title}
                  </Link>
                  
                  {/* Submenu */}
                  {item.children.length > 0 && isActive(item.path) && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`group flex items-center px-2 py-1 text-sm rounded-md ${
                            location.pathname === child.path
                              ? 'bg-yellow-50 text-yellow-700 font-medium'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between flex-shrink-0 px-4 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <img className="h-8 w-auto" src="/logo.png" alt="Belgomla" />
              <span className="ml-2 text-xl font-bold text-gray-900">Admin</span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <div key={item.path}>
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive(item.path)
                      ? 'bg-yellow-100 text-yellow-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.title}
                </Link>
                
                {/* Mobile Submenu */}
                {item.children.length > 0 && isActive(item.path) && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        onClick={onClose}
                        className={`group flex items-center px-2 py-1 text-sm rounded-md ${
                          location.pathname === child.path
                            ? 'bg-yellow-50 text-yellow-700 font-medium'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {child.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

export default DashboardSidebar;
