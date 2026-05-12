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
import ThemeToggle from "./ThemeToggle";

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
  const [scrolled, setScrolled] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const goToProduct = (productId: string) => {
    navigate(`/product/${productId}`);
    setShowDropdown(false);
    setSearchQuery("");
  };

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        fetchProducts({
          search: searchQuery,
          limit: 5,
          isActive: true,
          deleted: false,
          approvalStatus: "approved",
        });
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
  const showAdminDashboard =
    role === "admin" || role === "store" || role === "super_admin";

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Navigation configuration
  const navigationItems: NavigationItem[] = [
    { label: t("Home"), path: "/" },
    { label: t("All Products"), path: "/products" },
    { label: t("Collections"), path: "/collections" },
    { label: t("Contact"), path: "/contact" },
    {
      label: t("Become a Vendor"),
      path: "/vendor-registration",
      condition: showBecomeVendor,
    },
    {
      label: t("Admin Dashboard"),
      path: "/dashboard",
      condition: showAdminDashboard,
      className: "!text-[var(--brand-accent)]",
    },
  ];

  /* ── Search Dropdown ── */
  const SearchDropdown = () =>
    showDropdown ? (
      <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto animate-fadeInDown">
        {loading ? (
          <div className="p-5 text-center text-[var(--text-subtle)]">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--brand-primary)] border-t-transparent mx-auto" />
            <p className="mt-2 text-sm">{t("Searching...")}</p>
          </div>
        ) : products.length > 0 ? (
          <div className="py-2">
            {products.map((product) => (
              <button
                key={product._id}
                type="button"
                className="w-full text-left flex items-center px-4 py-3 hover:bg-[var(--surface-2)] transition-colors border-b border-[var(--border)]/50 last:border-b-0 gap-3"
                onClick={() => goToProduct(product._id)}
              >
                <img
                  src={product.images[0]?.url || "/placeholder.png"}
                  alt={product.name}
                  className="w-12 h-12 object-cover rounded-lg bg-[var(--surface-2)]"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-[var(--text)] truncate">
                    {product.name}
                  </h4>
                  <div className="flex items-center mt-0.5 gap-2">
                    <span className="text-sm font-semibold text-[var(--brand-primary)]">
                      {product.price.toLocaleString()} EGP
                    </span>
                    {product.saleActive && (
                      <span className="text-xs text-[var(--danger)] line-through">
                        {product.salePrice?.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
            <div className="px-4 py-2.5 border-t border-[var(--border)]">
              <button
                type="button"
                className="text-sm text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)] font-medium transition-colors"
                onClick={() => {
                  navigate(
                    `/products?search=${encodeURIComponent(searchQuery)}`
                  );
                  setShowDropdown(false);
                  setSearchQuery("");
                }}
              >
                {t("View all results for")} &ldquo;{searchQuery}&rdquo;
              </button>
            </div>
          </div>
        ) : searchQuery.trim() ? (
          <div className="p-5 text-center text-[var(--text-subtle)]">
            <p className="text-sm">
              {t("No products found for")} &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[var(--surface)]/95 backdrop-blur-xl shadow-lg border-b border-[var(--border)]/50"
          : "bg-[var(--surface)] border-b border-[var(--border)]"
      }`}
    >
      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] flex items-center justify-center text-white font-bold text-lg shadow-md">
              B
            </div>
            <span className="text-lg sm:text-xl font-bold text-[var(--text)] hidden sm:inline tracking-tight">
              Belgomla
            </span>
          </Link>

          {/* Search bar - desktop */}
          <div
            className="flex-1 max-w-xl mx-4 hidden md:block"
            ref={desktopSearchRef}
          >
            <div className="relative">
              <div className="relative flex items-center">
                <MagnifyingGlassIcon className="absolute left-3.5 w-4 h-4 text-[var(--text-subtle)] pointer-events-none" />
                <input
                  type="text"
                  placeholder={t("Search products, brands, categories...")}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim() && setShowDropdown(true)}
                />
              </div>
              <SearchDropdown />
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Language */}
            <select
              aria-label={t("Language")}
              value={language}
              onChange={(e) => {
                i18n.changeLanguage(e.target.value);
                setLanguage(e.target.value);
              }}
              className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-colors cursor-pointer"
            >
              <option value="en">EN</option>
              <option value="ar">AR</option>
            </select>

            <ThemeToggle showLabel={false} className="ml-0.5" />

            <div className="w-px h-6 bg-[var(--border)] mx-1 hidden sm:block" />

            {!user && (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-all text-sm"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="hidden lg:block font-medium">{t("Login")}</span>
              </Link>
            )}
            <Link
              to="/account"
              className="flex items-center gap-1.5 p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-all"
            >
              <UserCircleIcon className="w-5 h-5" />
            </Link>
            {user && <NotificationBell />}
            <Link
              to="/wishlist"
              className="flex items-center gap-1.5 p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-all"
            >
              <HeartIcon className="w-5 h-5" />
            </Link>
            <Link
              to="/cart"
              className="flex items-center gap-1.5 p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-all relative"
            >
              <ShoppingCartIcon className="w-5 h-5" />
              <span className="absolute ltr:-top-0.5 ltr:-right-0.5 rtl:-top-0.5 rtl:-left-0.5 bg-[var(--brand-primary)] text-white rounded-full flex items-center justify-center font-bold" style={{ width: '18px', height: '18px', fontSize: '10px' }}>
                {user?.cart?.length
                  ? user.cart.reduce(
                      (acc, item) => acc + (item.quantity || 0),
                      0
                    )
                  : 0}
              </span>
            </Link>

            {/* Mobile menu toggle */}
            <button
              className="lg:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg hover:bg-[var(--surface-2)] transition-colors ml-1"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              <span
                className={`w-5 h-0.5 bg-[var(--text)] transition-all duration-300 ${
                  isMenuOpen ? "rotate-45 translate-y-1" : ""
                }`}
              />
              <span
                className={`w-5 h-0.5 bg-[var(--text)] transition-all duration-300 mt-1 ${
                  isMenuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`w-5 h-0.5 bg-[var(--text)] transition-all duration-300 mt-1 ${
                  isMenuOpen ? "-rotate-45 -translate-y-1.5" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="pb-3 md:hidden" ref={mobileSearchRef}>
          <div className="relative">
            <div className="relative flex items-center">
              <MagnifyingGlassIcon className="absolute left-3.5 w-4 h-4 text-[var(--text-subtle)] pointer-events-none" />
              <input
                type="text"
                placeholder={t("Search...")}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim() && setShowDropdown(true)}
              />
            </div>
            <SearchDropdown />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className={`border-t border-[var(--border)] bg-[var(--brand-nav)] transition-all duration-300 ${
          isMenuOpen ? "block" : "hidden"
        } lg:block`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="flex flex-col lg:flex-row lg:items-center lg:gap-1">
            {navigationItems
              .filter((item) => item.condition === undefined || item.condition)
              .map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`block py-3 px-4 text-sm font-medium text-[var(--brand-nav-text)] opacity-70 hover:opacity-100 hover:bg-[var(--brand-primary)]/10 rounded-lg transition-all ${item.className || ""}`}
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
