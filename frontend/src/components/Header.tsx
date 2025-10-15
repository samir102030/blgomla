import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useUserStore } from "../stores/user.store";
import NotificationBell from "./NotificationBell";

const Header: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const role = user?.role;
  const showBecomeVendor = !role || role === "customer";
  const showAdminDashboard = role === "admin" || role === "store";

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FFD600] shadow-lg">
      <div className="flex items-center space-x-4">
        <span className="text-[#333333] text-sm">English</span>
        <div className="flex items-center space-x-2">
          <span className="text-[#333333] text-sm">Call us:</span>
          <span className="text-[#333333] font-medium">📞 (+20)1009353639</span>
        </div>
      </div>

      {/* Main header */}
      <div className="py-4 bg-[#FFD600]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link
                to="/"
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
              >
                <img
                  src="/logo.png"
                  alt="Belgomla Logo"
                  className="w-10 h-10 object-contain"
                />
                <span className="text-2xl font-bold text-[#333333]">
                  Belgomla
                </span>
              </Link>
            </div>

            {/* Search bar */}
            <div className="flex-1 max-w-2xl mx-8 hidden md:block">
              <div className="relative flex">
                <input
                  type="text"
                  placeholder="Search for electronics, computers, accessories..."
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-l-md focus:border-gray-500 focus:outline-none text-sm bg-white"
                />
                <button className="px-6 py-3 bg-gray-800 text-white rounded-r-md hover:bg-gray-700 transition-colors">
                  <span className="text-lg">🔍</span>
                </button>
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center space-x-6">
              {!user && (
                <Link
                  to="/login"
                  className="flex flex-col items-center text-gray-800 hover:text-gray-600 transition-colors"
                >
                  <span className="text-xl mb-1">🔑</span>
                  <span className="text-xs hidden sm:block">Login</span>
                </Link>
              )}
              <Link
                to="/account"
                className="flex flex-col items-center text-gray-800 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl mb-1">👤</span>
                <span className="text-xs hidden sm:block">Account</span>
              </Link>
              {user && <NotificationBell />}
              <Link
                to="/wishlist"
                className="flex flex-col items-center text-gray-800 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl mb-1">❤️</span>
                <span className="text-xs hidden sm:block">Wishlist</span>
              </Link>
              <Link
                to="/cart"
                className="flex flex-col items-center text-gray-800 hover:text-gray-600 transition-colors relative"
              >
                <span className="text-xl mb-1">🛒</span>
                <span className="text-xs hidden sm:block">Cart</span>
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {user?.cart?.length
                    ? user.cart.reduce(
                        (acc, item) => acc + (item.quantity || 0),
                        0
                      )
                    : 0}
                </span>
              </Link>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden flex flex-col space-y-1 p-2"
              onClick={toggleMenu}
            >
              <span className="w-6 h-0.5 bg-gray-800 transition-all"></span>
              <span className="w-6 h-0.5 bg-gray-800 transition-all"></span>
              <span className="w-6 h-0.5 bg-gray-800 transition-all"></span>
            </button>
          </div>

          {/* Mobile search bar */}
          <div className="mt-4 md:hidden">
            <div className="relative flex">
              <input
                type="text"
                placeholder="Search..."
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-l-md focus:border-gray-500 focus:outline-none text-sm bg-white"
              />
              <button className="px-4 py-2 bg-gray-800 text-white rounded-r-md hover:bg-gray-700 transition-colors">
                🔍
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className={`bg-[#002B5B] text-white ${
          isMenuOpen ? "block" : "hidden"
        } md:block`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="flex flex-col md:flex-row md:space-x-8">
            <li>
              <Link
                to="/"
                className="block py-3 px-4 hover:bg-[#FFD600]/20 hover:text-[#FFD600] transition-colors border-r border-[#9E9E9E]/30 md:border-r-0"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/brands"
                className="block py-3 px-4 hover:bg-[#FFD600]/20 hover:text-[#FFD600] transition-colors border-r border-[#9E9E9E]/30 md:border-r-0"
              >
                Electronics
              </Link>
            </li>
            <li>
              <Link
                to="/brands"
                className="block py-3 px-4 hover:bg-[#FFD600]/20 hover:text-[#FFD600] transition-colors border-r border-[#9E9E9E]/30 md:border-r-0"
              >
                Computers
              </Link>
            </li>

            <li>
              <Link
                to="/brands"
                className="block py-3 px-4 hover:bg-[#FFD600]/20 hover:text-[#FFD600] transition-colors border-r border-[#9E9E9E]/30 md:border-r-0"
              >
                Brands
              </Link>
            </li>
            <li>
              <Link
                to="/about"
                className="block py-3 px-4 hover:bg-[#FFD600]/20 hover:text-[#FFD600] transition-colors border-r border-[#9E9E9E]/30 md:border-r-0"
              >
                About Us
              </Link>
            </li>
            <li>
              <Link
                to="/contact"
                className="block py-3 px-4 hover:bg-[#FFD600]/20 hover:text-[#FFD600] transition-colors"
              >
                Contact
              </Link>
            </li>
            {showBecomeVendor && (
              <li>
                <Link
                  to="/vendor-registration"
                  className="block py-3 px-4 hover:bg-[#FFD600]/20 hover:text-[#FFD600] transition-colors"
                >
                  🏪 Become a Vendor
                </Link>
              </li>
            )}

            {showAdminDashboard && (
              <li>
                <Link
                  to="/dashboard"
                  className="block py-3 px-4 hover:bg-[#FFD600]/20 hover:text-[#FFD600] transition-colors bg-[#673AB7]"
                >
                  🏪 Admin Dashboard
                </Link>
              </li>
            )}
          </ul>
        </div>
      </nav>
    </header>
  );
};

export default Header;
