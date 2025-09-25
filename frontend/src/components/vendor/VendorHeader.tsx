import React, { useState } from 'react';
import { useUserStore } from '../../stores/user.store';
import { useVendorStore } from '../../stores/vendor.store';

interface VendorHeaderProps {
  onMenuClick: () => void;
}

const VendorHeader: React.FC<VendorHeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useUserStore();
  const { vendorStore } = useVendorStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifications = [
    { id: 1, title: 'New order received', time: '2 min ago', type: 'order' },
    { id: 2, title: 'Product review added', time: '5 min ago', type: 'review' },
    { id: 3, title: 'Low stock alert', time: '10 min ago', type: 'inventory' },
    { id: 4, title: 'Payment processed', time: '15 min ago', type: 'payment' }
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order': return '🛒';
      case 'review': return '⭐';
      case 'inventory': return '📦';
      case 'payment': return '💰';
      default: return '🔔';
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Search */}
          <div className="ml-4 flex-1 max-w-lg">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
              <input
                type="text"
                placeholder="Search products, orders, customers..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Store Status */}
          {vendorStore && (
            <div className="hidden md:flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${
                vendorStore.isActive ? 'bg-green-500' : 'bg-red-500'
              }`}></span>
              <span className="text-sm text-gray-600">
                Store: {vendorStore.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          )}

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-400 hover:text-gray-500 relative"
            >
              <span className="text-xl">🔔</span>
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-50">
                        <div className="flex items-start">
                          <span className="text-lg mr-3">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">{notification.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-gray-100">
                    <button className="text-sm text-yellow-600 hover:text-yellow-700 font-medium">
                      View all notifications
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <button className="p-2 text-gray-400 hover:text-gray-500" title="Quick Add Product">
            <span className="text-xl">➕</span>
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100"
            >
              <div className="h-8 w-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user?.name?.charAt(0).toUpperCase() || 'V'}
                </span>
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">
                {user?.name || 'Vendor'}
              </span>
              <span className="text-gray-400">▼</span>
            </button>

            {/* Profile Dropdown Menu */}
            {showProfile && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <a href="/vendor/settings/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    👤 Your Profile
                  </a>
                  <a href="/vendor/store" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    🏪 Store Settings
                  </a>
                  <a href="/vendor/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    ⚙️ Settings
                  </a>
                  <a href="/vendor/support" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    🎧 Support
                  </a>
                  <div className="border-t border-gray-100"></div>
                  <button 
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    🚪 Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className={`${vendorStore?.isActive ? 'text-green-600' : 'text-red-600'}`}>●</span>
              <span className="text-gray-600">
                Store Status: {vendorStore?.isActive ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="text-gray-600">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <span className="text-gray-500">Pending Orders: 5</span>
            <span className="text-gray-500">Low Stock Items: 3</span>
            <span className="text-gray-500">New Reviews: 2</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default VendorHeader;
