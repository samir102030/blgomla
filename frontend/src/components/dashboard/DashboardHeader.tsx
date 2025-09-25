import React, { useState } from 'react';

interface HeaderProps {
  onMenuClick: () => void;
}

const DashboardHeader: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifications = [
    { id: 1, title: 'New order received', time: '2 min ago', type: 'order' },
    { id: 2, title: 'Vendor registration pending', time: '5 min ago', type: 'vendor' },
    { id: 3, title: 'Payment processed', time: '10 min ago', type: 'payment' },
    { id: 4, title: 'Support ticket created', time: '15 min ago', type: 'support' }
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side */}
        <div className="flex items-center">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <span className="text-xl">☰</span>
          </button>
          
          {/* Search */}
          <div className="ml-4 flex-1 max-w-lg">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
              <input
                type="text"
                placeholder="Search vendors, products, orders..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Quick Actions */}
          <div className="hidden md:flex items-center space-x-2">
            <button className="px-3 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 transition-colors">
              + Add Product
            </button>
            <button className="px-3 py-2 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors">
              + Add Vendor
            </button>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-400 hover:text-gray-500 relative"
            >
              <span className="text-xl">🔔</span>
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notifications.length}
              </span>
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Notifications</h3>
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-md">
                        <div className="flex-shrink-0">
                          <span className="text-sm">
                            {notification.type === 'order' && '🛒'}
                            {notification.type === 'vendor' && '🏪'}
                            {notification.type === 'payment' && '💰'}
                            {notification.type === 'support' && '🎧'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                          <p className="text-xs text-gray-500">{notification.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button className="text-sm text-yellow-600 hover:text-yellow-500">
                      View all notifications
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <button className="p-2 text-gray-400 hover:text-gray-500 relative">
            <span className="text-xl">💬</span>
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100"
            >
              <div className="h-8 w-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">A</span>
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">Halafawy</span>
              <span className="text-gray-400">▼</span>
            </button>

            {/* Profile Dropdown Menu */}
            {showProfile && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    👤 Your Profile
                  </a>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    ⚙️ Settings
                  </a>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    🎨 Appearance
                  </a>
                  <div className="border-t border-gray-100"></div>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    🚪 Sign out
                  </a>
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
              <span className="text-green-600">●</span>
              <span className="text-gray-600">System Status: Online</span>
            </div>
            <div className="text-gray-600">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <span className="text-gray-500">Active Vendors: 156</span>
            <span className="text-gray-500">Pending Orders: 23</span>
            <span className="text-gray-500">Support Tickets: 8</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
