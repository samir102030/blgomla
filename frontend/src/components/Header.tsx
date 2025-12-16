import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserStore } from "../stores/user.store";
import { useProductStore } from "../stores/product.store";
import { useTranslation } from "react-i18next";
import {
  ArrowRightOnRectangleIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import i18n from "../lib/i18n";
import NotificationBell from "./NotificationBell";

interface NavigationItem {
  label: string;
  path: string;
  condition?: boolean;
  className?: string;
}

const Header: React.FC = () => {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const { fetchProducts, products, loading } = useProductStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [language, setLanguage] = useState(i18n.language);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const goToProduct = (productId: string) => {
    navigate(`/product/${productId}`);
    setShowDropdown(false);
    setSearchQuery("");
  };

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        fetchProducts({ search: searchQuery, limit: 5 });
        setShowDropdown(true);
      } else {
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, fetchProducts]);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        !desktopSearchRef.current?.contains(event.target as Node) &&
        !mobileSearchRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update language state when i18n changes
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setLanguage(lng);
    };

    i18n.on("languageChanged", handleLanguageChange);
    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, []);

  const role = user?.role;
  const showBecomeVendor = !role || role === "customer";
  const showAdminDashboard = role === "admin" || role === "store";

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Navigation configuration
  const navigationItems: NavigationItem[] = [
    {
      label: t("Home"),
      path: "/",
      className: "border-r border-[#9E9E9E]/30 md:border-r-0",
    },
    {
      label: t("All Products"),
      path: "/products",
      className: "border-r border-[#9E9E9E]/30 md:border-r-0",
    },
    {
      label: t("About Us"),
      path: "/about",
      className: "border-r border-[#9E9E9E]/30 md:border-r-0",
    },
    {
      label: t("Contact"),
      path: "/contact",
      className: "",
    },
    {
      label: t("Become a Vendor"),
      path: "/vendor-registration",
      condition: showBecomeVendor,
      className: "",
    },
    {
      label: t("Admin Dashboard"),
      path: "/dashboard",
      condition: showAdminDashboard,
      className: "bg-[#673AB7]",
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#FFD600] shadow-lg">
      {/* Top bar - responsive */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2 gap-2 sm:gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-[#333333] text-sm font-semibold">{t("Language")}</span>
          <select
            aria-label={t("Language")}
            value={language}
            onChange={(e) => {
              i18n.changeLanguage(e.target.value);
              setLanguage(e.target.value);
            }}
            className="bg-white border border-gray-300 rounded-md px-2 sm:px-3 py-1 text-xs sm:text-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            <option value="en">{t("English")}</option>
            <option value="ar">{t("Arabic")}</option>
          </select>
        </div>
        <div className="hidden sm:flex items-center space-x-2">
          <span className="text-[#333333] text-xs sm:text-sm">{t("Call us:")}</span>
          <span className="text-[#333333] font-medium text-xs sm:text-sm">
            {t("(+20)1009353639")}
          </span>
        </div>
      </div>

      {/* Main header */}
      <div className="py-2 sm:py-3 lg:py-4 bg-[#FFD600]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link
                to="/"
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
              >
                <img
                  src="/logo.png"
                  alt="Belgomla Logo"
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                />
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-[#333333] hidden sm:inline">
                  Belgomla
                </span>
              </Link>
            </div>

            {/* Search bar - hide on mobile, show on md and up */}
            <div
              className="flex-1 max-w-2xl mx-2 sm:mx-4 hidden md:block"
              ref={desktopSearchRef}
            >
              <div className="relative">
                <div className="relative flex">
                  <input
                    type="text"
                    placeholder={t("Search...")}
                    className="flex-1 px-3 sm:px-4 py-2 border-2 border-gray-300 rounded-l-md focus:border-gray-500 focus:outline-none text-xs sm:text-sm bg-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.trim() && setShowDropdown(true)}
                  />
                  <button
                    className="px-3 sm:px-6 py-2 bg-gray-800 text-white rounded-r-md hover:bg-gray-700 transition-colors"
                    aria-label={t("Search...")}
                  >
                    <MagnifyingGlassIcon
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      aria-hidden="true"
                    />
                  </button>
                </div>

                {/* Search Dropdown */}
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                    {loading ? (
                      <div className="p-4 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800 mx-auto"></div>
                        <p className="mt-2 text-sm">{t("Searching...")}</p>
                      </div>
                    ) : products.length > 0 ? (
                      <div className="py-2">
                        {products.map((product) => (
                          <button
                            key={product._id}
                            type="button"
                            className="w-full text-left flex items-center px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                            onClick={() => goToProduct(product._id)}
                          >
                            <img
                              src={product.images[0]?.url || "/placeholder.png"}
                              alt={product.name}
                              className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-md mr-2 sm:mr-3"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                {product.name}
                              </h4>
                              <p className="text-xs text-gray-500 truncate hidden sm:block">
                                {product.description}
                              </p>
                              <div className="flex items-center mt-0 sm:mt-1">
                                <span className="text-xs sm:text-sm font-semibold text-green-600">
                                  ${product.price}
                                </span>
                                {product.saleActive && (
                                  <span className="ml-1 sm:ml-2 text-xs text-red-500 line-through">
                                    ${product.salePrice}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                        <div className="px-3 sm:px-4 py-2 border-t border-gray-100">
                          <button
                            type="button"
                            className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium"
                            onClick={() => {
                              navigate(
                                `/products?search=${encodeURIComponent(
                                  searchQuery
                                )}`
                              );
                              setShowDropdown(false);
                              setSearchQuery("");
                            }}
                          >
                            {t("View all results for")} "{searchQuery}"
                          </button>
                        </div>
                      </div>
                    ) : searchQuery.trim() ? (
                      <div className="p-4 text-center text-gray-500">
                        <p className="text-sm">
                          {t("No products found for")} "{searchQuery}"
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6">
                {!user && (
                  <Link
                    to="/login"
                    className="flex flex-col items-center gap-1 text-gray-800 hover:text-gray-600 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon
                      className="w-5 h-5 sm:w-6 sm:h-6"
                      aria-hidden="true"
                    />
                    <span className="text-xs hidden md:block">{t("Login")}</span>
                  </Link>
                )}
              <Link
                to="/account"
                className="flex flex-col items-center gap-1 text-gray-800 hover:text-gray-600 transition-colors"
              >
                <UserCircleIcon
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  aria-hidden="true"
                />
                <span className="text-xs hidden md:block">{t("Account")}</span>
              </Link>
              {user && <NotificationBell />}
              <Link
                to="/wishlist"
                className="flex flex-col items-center gap-1 text-gray-800 hover:text-gray-600 transition-colors"
              >
                <HeartIcon
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  aria-hidden="true"
                />
                <span className="text-xs hidden md:block">{t("Wishlist")}</span>
              </Link>
              <Link
                to="/cart"
                className="flex flex-col items-center gap-0.5 text-gray-800 hover:text-gray-600 transition-colors relative"
              >
                <ShoppingCartIcon
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  aria-hidden="true"
                />
                <span className="text-xs hidden md:block">{t("Cart")}</span>
                <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-xs">
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
              className="lg:hidden flex flex-col space-y-1 p-1 ml-2"
              onClick={toggleMenu}
            >
              <span
                className={`w-5 h-0.5 bg-gray-800 transition-all duration-300 ${
                  isMenuOpen ? "rotate-45 translate-y-1.5" : ""
                }`}
              ></span>
              <span
                className={`w-5 h-0.5 bg-gray-800 transition-all duration-300 ${
                  isMenuOpen ? "opacity-0" : ""
                }`}
              ></span>
              <span
                className={`w-5 h-0.5 bg-gray-800 transition-all duration-300 ${
                  isMenuOpen ? "-rotate-45 -translate-y-1.5" : ""
                }`}
              ></span>
            </button>
          </div>

          {/* Mobile search bar */}
          <div className="mt-2 md:hidden" ref={mobileSearchRef}>
            <div className="relative">
              <div className="relative flex">
                <input
                  type="text"
                  placeholder={t("Search...")}
                  className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-l-md focus:border-gray-500 focus:outline-none text-xs sm:text-sm bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim() && setShowDropdown(true)}
                />
                <button
                  className="px-3 sm:px-4 py-2 bg-gray-800 text-white rounded-r-md hover:bg-gray-700 transition-colors"
                  aria-label={t("Search...")}
                >
                  <MagnifyingGlassIcon
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    aria-hidden="true"
                  />
                </button>
              </div>

              {/* Mobile Search Dropdown */}
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                  {loading ? (
                    <div className="p-3 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-800 mx-auto"></div>
                      <p className="mt-1 text-xs">{t("Searching...")}</p>
                    </div>
                  ) : products.length > 0 ? (
                    <div className="py-1">
                      {products.map((product) => (
                        <button
                          key={product._id}
                          type="button"
                          className="w-full text-left flex items-center px-2 sm:px-3 py-2 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                          onClick={() => goToProduct(product._id)}
                        >
                          <img
                            src={product.images[0]?.url || "/placeholder.png"}
                            alt={product.name}
                            className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded-md mr-2"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-medium text-gray-900 truncate">
                              {product.name}
                            </h4>
                            <div className="flex items-center mt-0.5">
                              <span className="text-xs font-semibold text-green-600">
                                ${product.price}
                              </span>
                              {product.saleActive && (
                                <span className="ml-1 text-xs text-red-500 line-through">
                                  ${product.salePrice}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                      <div className="px-2 sm:px-3 py-2 border-t border-gray-100">
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          onClick={() => {
                            navigate(
                              `/products?search=${encodeURIComponent(
                                searchQuery
                              )}`
                            );
                            setShowDropdown(false);
                            setSearchQuery("");
                          }}
                        >
                          {t("View all results")}
                        </button>
                      </div>
                    </div>
                  ) : searchQuery.trim() ? (
                    <div className="p-3 text-center text-gray-500">
                      <p className="text-xs">{t("No products found")}</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className={`bg-[#002B5B] text-white transition-all duration-300 ${
          isMenuOpen ? "block" : "hidden"
        } lg:block`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <ul className="flex flex-col lg:flex-row lg:space-x-4 xl:space-x-8">
            {navigationItems
              .filter((item) => item.condition === undefined || item.condition)
              .map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`block py-3 sm:py-4 lg:py-3 px-3 sm:px-4 hover:bg-[#FFD600]/20 hover:text-[#FFD600] transition-colors text-sm sm:text-base ${item.className}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      </nav>
    </header>
  );
};

export default Header;
