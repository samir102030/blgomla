import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserStore } from "../stores/user.store";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "../lib/axios";
import type { Product } from "../types/product.type";
import {
  ArrowRightOnRectangleIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import i18n from "../lib/i18n";
import NotificationBell from "./NotificationBell";
import { cldImg } from "../lib/cldImage";
import ThemeToggle from "./ThemeToggle";
import Logo, { BRAND } from "./Logo";

interface NavigationItem {
  label: string;
  path: string;
  condition?: boolean;
  className?: string;
}

const Header: React.FC = () => {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [language, setLanguage] = useState(i18n.language);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [userMenuOpen]);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate("/");
  };

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

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (isMenuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isMenuOpen]);

  // Close drawer with Escape key
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMenuOpen]);

  // Debounced search — uses a local results buffer so it doesn't trample the
  // global product store (which the All Products page reads from).
  useEffect(() => {
    if (!searchQuery.trim()) {
      setShowDropdown(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      setShowDropdown(true);
      try {
        const { data } = await axiosInstance.get<{ data: Product[] }>(
          "/products",
          {
            params: {
              search: searchQuery,
              limit: 5,
              isActive: true,
              deleted: false,
              approvalStatus: "approved",
            },
          }
        );
        if (!cancelled) setSearchResults(data.data || []);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

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
        {searching ? (
          <div className="p-5 text-center text-[var(--text-subtle)]">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--brand-primary)] border-t-transparent mx-auto" />
            <p className="mt-2 text-sm">{t("Searching...")}</p>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="py-2">
            {searchResults.map((product) => (
              <button
                key={product._id}
                type="button"
                className="w-full text-left flex items-center px-4 py-3 hover:bg-[var(--surface-2)] transition-colors border-b border-[var(--border)]/50 last:border-b-0 gap-3"
                onClick={() => goToProduct(product._id)}
              >
                <img
                  src={cldImg(product.images[0]?.url, { w: 120 })}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
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
          {/* Logo — Belgomla MarkBag (geometric B with bag handle) + wordmark */}
          <Link
            to="/"
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity flex-shrink-0"
            aria-label={t("brand.homeLabel", "Belgomla home")}
          >
            <Logo size={32} color={BRAND.orange} />
            <span
              className={`text-xl sm:text-2xl font-semibold text-[var(--text)] hidden sm:inline ${
                i18n.language === "ar" ? "" : "lowercase"
              }`}
              style={
                i18n.language === "ar"
                  ? { lineHeight: 1 }
                  : { letterSpacing: "-0.045em", lineHeight: 0.9 }
              }
            >
              {t("brand.wordmark", "belgomla")}
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
            {user ? (
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  className="flex items-center gap-1.5 p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-all"
                >
                  <UserCircleIcon className="w-5 h-5" />
                </button>
                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute ltr:right-0 rtl:left-0 mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg ring-1 ring-black/5 dark:ring-white/5 overflow-hidden z-50"
                  >
                    <div className="px-3 py-2.5 border-b border-[var(--border)]">
                      <p className="text-xs text-[var(--text-subtle)]">{t("Signed in as")}</p>
                      <p className="text-sm font-medium text-[var(--text)] truncate">{user.name || user.email}</p>
                    </div>
                    <Link
                      to="/account"
                      onClick={() => setUserMenuOpen(false)}
                      role="menuitem"
                      className="block px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                    >
                      {t("My Account")}
                    </Link>
                    <Link
                      to="/account/notifications"
                      onClick={() => setUserMenuOpen(false)}
                      role="menuitem"
                      className="block px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                    >
                      {t("Notifications")}
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      role="menuitem"
                      className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors border-t border-[var(--border)]"
                    >
                      {t("Logout")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/account"
                className="flex items-center gap-1.5 p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-all"
              >
                <UserCircleIcon className="w-5 h-5" />
              </Link>
            )}
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

      {/* Desktop Navigation */}
      <nav className="hidden lg:block border-t border-[var(--border)] bg-[var(--brand-nav)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="flex flex-row items-center gap-1">
            {navigationItems
              .filter((item) => item.condition === undefined || item.condition)
              .map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`block py-3 px-4 text-sm font-medium text-[var(--brand-nav-text)] opacity-70 hover:opacity-100 hover:bg-[var(--brand-primary)]/10 rounded-lg transition-all ${item.className || ""}`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      </nav>

      {/* Mobile drawer — slides in from the right */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] transition-opacity duration-300 ${
          isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isMenuOpen}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setIsMenuOpen(false)}
        />
        {/* Panel */}
        <aside
          className={`absolute top-0 right-0 h-full w-72 max-w-[85vw] bg-[var(--surface)] shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
            <span className="text-base font-semibold text-[var(--text)]">
              {t("Menu", "Menu")}
            </span>
            <button
              onClick={() => setIsMenuOpen(false)}
              aria-label="Close menu"
              className="w-9 h-9 rounded-lg hover:bg-[var(--surface-2)] flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 py-3">
            <ul className="flex flex-col gap-1">
              {navigationItems
                .filter((item) => item.condition === undefined || item.condition)
                .map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`block py-3 px-4 text-base font-medium text-[var(--text)] hover:bg-[var(--surface-2)] rounded-lg transition-colors ${item.className || ""}`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        </aside>
      </div>
    </header>
  );
};

export default Header;
