import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserStore } from "../stores/user.store";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "../lib/axios";
import {
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  ClockIcon,
  GlobeAltIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
  TagIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useCategoryStore } from "../stores/category.store";
import { useBrandStore } from "../stores/brand.store";
import i18n from "../lib/i18n";
import NotificationBell from "./NotificationBell";
import { cldImg } from "../lib/cldImage";
import { getCategoryIcon } from "../lib/categoryIcon";
import AnnouncementBar from "./AnnouncementBar";
import ThemeToggle from "./ThemeToggle";
import Logo, { BRAND } from "./Logo";

interface NavigationItem {
  label: string;
  path: string;
  condition?: boolean;
  className?: string;
}

interface SuggestProduct {
  _id: string;
  name: string;
  slug?: string;
  price: number;
  salePrice?: number;
  saleActive?: boolean;
  image?: string | null;
}

interface SuggestRef {
  _id: string;
  name: string;
  slug?: string;
  logo?: string;
}

interface Suggestions {
  products: SuggestProduct[];
  brands: SuggestRef[];
  categories: SuggestRef[];
}

const EMPTY_SUGGESTIONS: Suggestions = { products: [], brands: [], categories: [] };

// Recent searches live client-side only (no PII to a server). Capped small.
const RECENT_KEY = "belgomla:recentSearches";
const RECENT_MAX = 5;

const readRecent = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
};

const Header: React.FC = () => {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  const categories = useCategoryStore((state) => state.categories);
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);
  const brands = useBrandStore((state) => state.brands);
  const fetchBrands = useBrandStore((state) => state.fetchBrands);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions>(EMPTY_SUGGESTIONS);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readRecent());
  const [language, setLanguage] = useState(i18n.language);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const catMenuRef = useRef<HTMLLIElement>(null);
  const navigate = useNavigate();

  // Load categories/brands once for the Categories flyout (stores are
  // persisted, so this is usually a no-op after first visit).
  useEffect(() => {
    if (!categories.length) fetchCategories();
    if (!brands.length) fetchBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close the Categories flyout on outside click.
  useEffect(() => {
    if (!catMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (catMenuRef.current && !catMenuRef.current.contains(e.target as Node)) {
        setCatMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [catMenuOpen]);

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

  const closeSearch = () => {
    setShowDropdown(false);
    setActiveIndex(-1);
  };

  const pushRecent = (term: string) => {
    const q = term.trim();
    if (q.length < 2) return;
    setRecentSearches((prev) => {
      const next = [q, ...prev.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(
        0,
        RECENT_MAX
      );
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota / private-mode errors */
      }
      return next;
    });
  };

  const clearRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      /* ignore */
    }
  };

  const goToProduct = (productId: string) => {
    navigate(`/product/${productId}`);
    closeSearch();
    setSearchQuery("");
  };

  const goToBrand = (brandId: string) => {
    navigate(`/products?brand=${encodeURIComponent(brandId)}`);
    closeSearch();
    setSearchQuery("");
  };

  const goToCategory = (categoryId: string) => {
    navigate(`/products?category=${encodeURIComponent(categoryId)}`);
    closeSearch();
    setSearchQuery("");
  };

  const submitSearch = (term: string) => {
    const q = term.trim();
    if (q.length < 1) return;
    pushRecent(q);
    navigate(`/products?search=${encodeURIComponent(q)}`);
    closeSearch();
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

  // Debounced instant-search — hits the lightweight /search-suggestions
  // endpoint that returns matching products + brands + categories in one trip.
  useEffect(() => {
    const q = searchQuery.trim();
    setActiveIndex(-1);
    // Under 2 chars we still keep the dropdown open (on focus) to show recents.
    if (q.length < 2) {
      setSuggestions(EMPTY_SUGGESTIONS);
      setSearching(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      setShowDropdown(true);
      try {
        const { data } = await axiosInstance.get<{
          products?: SuggestProduct[];
          brands?: SuggestRef[];
          categories?: SuggestRef[];
        }>("/products/search-suggestions", { params: { q } });
        if (!cancelled) {
          setSuggestions({
            products: data.products || [],
            brands: data.brands || [],
            categories: data.categories || [],
          });
        }
      } catch {
        if (!cancelled) setSuggestions(EMPTY_SUGGESTIONS);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
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

  // Update language state when i18n changes and refetch locale-dependent data
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setLanguage(lng);
      // Force-refetch so category/brand names reflect the new language
      fetchCategories();
      fetchBrands();
    };

    i18n.on("languageChanged", handleLanguageChange);
    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, [fetchCategories, fetchBrands]);

  const hasQuery = searchQuery.trim().length >= 2;
  const hasResults =
    suggestions.products.length > 0 ||
    suggestions.brands.length > 0 ||
    suggestions.categories.length > 0;

  // Flat, ordered list of every selectable row in the dropdown so ArrowUp/Down
  // can move a single highlight across the Products → Brands → Categories →
  // "view all" sections (or across recent searches when the query is empty).
  const flatItems = useMemo(() => {
    const items: { run: () => void }[] = [];
    if (!hasQuery) {
      recentSearches.forEach((term) => items.push({ run: () => submitSearch(term) }));
      return items;
    }
    suggestions.products.forEach((p) => items.push({ run: () => goToProduct(p._id) }));
    suggestions.brands.forEach((b) => items.push({ run: () => goToBrand(b._id) }));
    suggestions.categories.forEach((c) => items.push({ run: () => goToCategory(c._id) }));
    if (hasResults) items.push({ run: () => submitSearch(searchQuery) });
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasQuery, hasResults, suggestions, recentSearches, searchQuery]);

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowDropdown(true);
      setActiveIndex((i) => (flatItems.length ? (i + 1) % flatItems.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) =>
        flatItems.length ? (i <= 0 ? flatItems.length - 1 : i - 1) : -1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && flatItems[activeIndex]) flatItems[activeIndex].run();
      else if (searchQuery.trim()) submitSearch(searchQuery);
    } else if (e.key === "Escape") {
      closeSearch();
    }
  };

  // Top-level categories only, keeps the flyout slim. Falls back to a flat
  // list when the taxonomy has no parent/child structure.
  const topCategories = useMemo(
    () =>
      (categories || [])
        .filter((c) => !c.parentCategory && c.isActive !== false && !c.deleted)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .slice(0, 12),
    [categories]
  );
  const topBrands = useMemo(
    () =>
      (brands || [])
        .filter((b) => b.isActive !== false && !b.deleted)
        .slice(0, 8),
    [brands]
  );

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
    { label: t("Deals"), path: "/deals", className: "!text-[var(--brand-accent)] font-semibold" },
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
  const rowClass = (idx: number) =>
    `w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors ${
      activeIndex === idx
        ? "bg-[var(--surface-2)]"
        : "hover:bg-[var(--surface-2)]"
    }`;

  const sectionLabel = (
    label: string,
    Icon: React.ComponentType<{ className?: string }>
  ) => (
    <div className="flex items-center gap-1.5 px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  );

  const renderDropdown = () => {
    if (!showDropdown) return null;
    const { products, brands, categories } = suggestions;
    const bOff = products.length;
    const cOff = bOff + brands.length;
    const viewAllIdx = cOff + categories.length;

    if (!searching && !hasQuery && recentSearches.length === 0) return null;

    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 max-h-[28rem] overflow-y-auto animate-fadeInDown">
        {searching ? (
          <div className="p-5 text-center text-[var(--text-subtle)]">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--brand-primary)] border-t-transparent mx-auto" />
            <p className="mt-2 text-sm">{t("Searching...")}</p>
          </div>
        ) : !hasQuery ? (
          <div className="py-2">
            <div className="flex items-center justify-between px-4 py-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
                {t("Recent searches")}
              </span>
              <button
                type="button"
                onClick={clearRecent}
                className="inline-flex items-center gap-1 text-xs text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
                {t("Clear")}
              </button>
            </div>
            {recentSearches.map((term, i) => (
              <button
                key={term}
                type="button"
                className={rowClass(i)}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => submitSearch(term)}
              >
                <ClockIcon className="w-4 h-4 text-[var(--text-subtle)] shrink-0" />
                <span className="text-sm text-[var(--text)] truncate">{term}</span>
              </button>
            ))}
          </div>
        ) : hasResults ? (
          <div className="py-1.5">
            {products.length > 0 && (
              <>
                {sectionLabel(t("Products"), MagnifyingGlassIcon)}
                {products.map((p, i) => {
                  const onSale = p.saleActive && p.salePrice != null;
                  return (
                    <button
                      key={p._id}
                      type="button"
                      className={rowClass(i)}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => goToProduct(p._id)}
                    >
                      <img
                        src={cldImg(p.image || undefined, { w: 120 })}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                        className="w-10 h-10 object-cover rounded-lg bg-[var(--surface-2)] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-[var(--text)] truncate">
                          {p.name}
                        </h4>
                        <div className="flex items-center mt-0.5 gap-2">
                          <span className="text-sm font-semibold text-[var(--brand-primary)]">
                            {(onSale ? p.salePrice! : p.price).toLocaleString()} EGP
                          </span>
                          {onSale && (
                            <span className="text-xs text-[var(--text-subtle)] line-through">
                              {p.price.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {brands.length > 0 && (
              <>
                {sectionLabel(t("Brands"), TagIcon)}
                {brands.map((b, i) => {
                  const idx = bOff + i;
                  return (
                    <button
                      key={b._id}
                      type="button"
                      className={rowClass(idx)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => goToBrand(b._id)}
                    >
                      <TagIcon className="w-4 h-4 text-[var(--text-subtle)] shrink-0" />
                      <span className="text-sm text-[var(--text)] truncate">{b.name}</span>
                    </button>
                  );
                })}
              </>
            )}

            {categories.length > 0 && (
              <>
                {sectionLabel(t("Categories"), Squares2X2Icon)}
                {categories.map((c, i) => {
                  const idx = cOff + i;
                  return (
                    <button
                      key={c._id}
                      type="button"
                      className={rowClass(idx)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => goToCategory(c._id)}
                    >
                      <Squares2X2Icon className="w-4 h-4 text-[var(--text-subtle)] shrink-0" />
                      <span className="text-sm text-[var(--text)] truncate">{i18n.language === 'ar' && c.nameAr ? c.nameAr : c.name}</span>
                    </button>
                  );
                })}
              </>
            )}

            <div className="px-4 py-2.5 border-t border-[var(--border)] mt-1">
              <button
                type="button"
                className={`text-sm font-medium transition-colors ${
                  activeIndex === viewAllIdx
                    ? "text-[var(--brand-primary-hover)]"
                    : "text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)]"
                }`}
                onMouseEnter={() => setActiveIndex(viewAllIdx)}
                onClick={() => submitSearch(searchQuery)}
              >
                {t("View all results for")} &ldquo;{searchQuery}&rdquo;
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 text-center text-[var(--text-subtle)]">
            <p className="text-sm">
              {t("No results for")} &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <AnnouncementBar />
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
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={showDropdown}
                  aria-autocomplete="list"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  onKeyDown={onSearchKeyDown}
                />
              </div>
              {renderDropdown()}
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Language */}
            <button
              type="button"
              onClick={() => {
                const next = language === "en" ? "ar" : "en";
                i18n.changeLanguage(next);
                setLanguage(next);
              }}
              aria-label={t("Language")}
              title={language === "en" ? "العربية" : "English"}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3,var(--surface-2))] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 transition-colors"
            >
              <GlobeAltIcon className="w-4 h-4" />
              <span>{language === "en" ? "EN" : "ع"}</span>
            </button>

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
                autoComplete="off"
                role="combobox"
                aria-expanded={showDropdown}
                aria-autocomplete="list"
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={onSearchKeyDown}
              />
            </div>
            {renderDropdown()}
          </div>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden lg:block border-t border-[var(--border)] bg-[var(--brand-nav)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="flex flex-row items-center gap-1">
            {/* Categories flyout — slim mega-menu (top categories + brands) */}
            <li
              className="relative"
              ref={catMenuRef}
              onMouseEnter={() => setCatMenuOpen(true)}
              onMouseLeave={() => setCatMenuOpen(false)}
            >
              <button
                type="button"
                aria-haspopup="true"
                aria-expanded={catMenuOpen}
                onClick={() => setCatMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 py-3 px-4 text-sm font-medium text-[var(--brand-nav-text)] opacity-70 hover:opacity-100 hover:bg-[var(--brand-primary)]/10 rounded-lg transition-all"
              >
                <Squares2X2Icon className="w-4 h-4" />
                {t("Categories")}
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 transition-transform ${catMenuOpen ? "rotate-180" : ""}`}
                />
              </button>
              {catMenuOpen && (
                <div className="absolute ltr:left-0 rtl:right-0 top-full mt-1 w-[min(92vw,40rem)] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 p-4 animate-fadeInDown">
                  {topCategories.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                        {topCategories.map((c) => (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => {
                              goToCategory(c._id);
                              setCatMenuOpen(false);
                            }}
                            className="flex items-center gap-2.5 text-left text-sm text-[var(--text)] hover:text-[var(--brand-primary)] hover:bg-[var(--surface-2)] rounded-lg px-3 py-2 transition-colors"
                          >
                            <span className="w-8 h-8 shrink-0 rounded-lg bg-[var(--surface-2)] flex items-center justify-center overflow-hidden">
                              {c.image ? (
                                <img
                                  src={cldImg(c.image, { w: 64 })}
                                  alt=""
                                  width={32}
                                  height={32}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-base" aria-hidden="true">
                                  {getCategoryIcon(c.name)}
                                </span>
                              )}
                            </span>
                            <span className="truncate">{i18n.language === 'ar' && c.nameAr ? c.nameAr : c.name}</span>
                          </button>
                        ))}
                      </div>
                      {topBrands.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[var(--border)]">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-subtle)] mb-1.5 px-1">
                            {t("Top brands")}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {topBrands.map((b) => (
                              <button
                                key={b._id}
                                type="button"
                                onClick={() => {
                                  goToBrand(b._id);
                                  setCatMenuOpen(false);
                                }}
                                className="text-xs px-2.5 py-1 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
                              >
                                {b.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-3 pt-1">
                        <Link
                          to="/products"
                          onClick={() => setCatMenuOpen(false)}
                          className="text-sm font-medium text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)] transition-colors"
                        >
                          {t("Browse all products")} →
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-[var(--text-subtle)] px-2 py-3">
                      {t("No categories yet")}
                    </div>
                  )}
                </div>
              )}
            </li>
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

            {topCategories.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <div className="flex items-center gap-1.5 px-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
                  <Squares2X2Icon className="w-3.5 h-3.5" />
                  {t("Shop by Category")}
                </div>
                <ul className="flex flex-col gap-0.5">
                  {topCategories.map((c) => (
                    <li key={c._id}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          goToCategory(c._id);
                        }}
                        className="w-full text-left block py-2.5 px-4 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] rounded-lg transition-colors truncate"
                      >
                        {i18n.language === 'ar' && c.nameAr ? c.nameAr : c.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </nav>
        </aside>
      </div>
    </header>
    </>
  );
};

export default Header;
