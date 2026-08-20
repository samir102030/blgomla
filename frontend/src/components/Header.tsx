import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUserStore } from "../stores/user.store";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "../lib/axios";
import {
  ArrowRightOnRectangleIcon,
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
import { AllCategoriesMenu, CategoryAccordion } from "./CategoryNav";
import AnnouncementBar from "./AnnouncementBar";
import ThemeToggle from "./ThemeToggle";

interface NavigationItem {
  label: string;
  path: string;
  condition?: boolean;
  className?: string;
  /**
   * Kept out of the desktop row but still in the mobile drawer. The drawer is
   * the only navigation a phone has, so a link that moved into the header's
   * action strip — where there is no room for it below `lg` — has to stay
   * reachable here or it disappears on the smaller half of the traffic.
   */
  mobileOnly?: boolean;
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
  // Suggestions come back raw, so the Arabic name arrives alongside the
  // English one and the dropdown picks between them by locale.
  nameAr?: string;
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
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load categories/brands once for the category menu and search (stores are
  // persisted, so this is usually a no-op after first visit).
  useEffect(() => {
    if (!categories.length) fetchCategories();
    if (!brands.length) fetchBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // Out of the desktop bar and kept in the drawer. The brands page is
    // reachable from the strip of brand cards on the home page and from the
    // footer, so the row does not have to spend one of its few slots saying so
    // — but the drawer has no such strip, and dropping it there would leave
    // the page with no way in on a phone at all.
    { label: t("Brands"), path: "/brands", mobileOnly: true },
    { label: t("Contact"), path: "/contact" },
    // Lives beside Login in the action strip on desktop; this entry is what
    // keeps it in the mobile drawer, where that strip has no room for it.
    {
      label: t("Become a Vendor"),
      path: "/vendor-registration",
      condition: showBecomeVendor,
      mobileOnly: true,
    },
    // Electronics used to sit here as its own page. It is a branch of the
    // catalogue now, reached from the category menu like every other branch,
    // so a second way in would only say the same thing twice. The /electronics
    // route stays for the student sign-up and its verification links.
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
      {/* The bar wears the Manus chrome (`site-header` / `nav-row`), which
          paints its own charcoal ground. Dropdowns below keep the theme's
          surface — they are panels over the page, not part of the bar. */}
      <header
      className={`mn-scope mn-site-header z-50 ${
        scrolled ? "shadow-[0_18px_40px_rgba(0,0,0,0.45)]" : ""
      }`}
    >
      {/* Main header */}
      <div className="mn-site-width">
        <div className="mn-nav-row justify-between gap-4">
          {/* Logo — Belgomla MarkBag (geometric B with bag handle) + wordmark */}
          {/* The design package ships a brand symbol; it replaces the drawn
              logo here, with the discipline named under the wordmark exactly
              as the preview had it. */}
          <Link to="/" className="mn-brand" aria-label={t("brand.homeLabel", "Belgomla home")}>
            <img
              className="mn-brand-mark"
              src="/manus/brand-symbol.webp"
              alt=""
              width={48}
              height={48}
            />
            <span className={`mn-brand-text hidden sm:block ${i18n.language === "ar" ? "" : "lowercase"}`}>
              {t("brand.wordmark", "belgomla")}
              <small>Smart Solutions</small>
            </span>
          </Link>

          {/* Search bar - desktop */}
          <div
            className="mn-search mx-4 hidden md:block"
            ref={desktopSearchRef}
          >
            <div className="relative">
              <div className="relative flex items-center">
                <MagnifyingGlassIcon className="pointer-events-none" />
                <input
                  type="text"
                  placeholder={t("Search for a solution, product, or project...")}
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
              className="mn-header-link inline-flex gap-1.5 font-extrabold"
            >
              <GlobeAltIcon className="w-4 h-4 shrink-0" />
              <span>{language === "en" ? "EN" : "ع"}</span>
            </button>

            <ThemeToggle showLabel={false} className="ml-0.5" />

            <div className="w-px h-6 bg-[var(--line)] mx-1 hidden sm:block" />

            {/* The one orange action in the bar, as the design package has it.
                Quoting is the path this storefront is built around. */}
            <Link to="/contact" className="mn-header-action hidden md:inline-flex">
              {t("Request a quote")}
            </Link>

            {/* Selling on the shop is a different job from shopping on it, so
                it sits with the account controls rather than in the row of
                places to browse. */}
            {showBecomeVendor && (
              <Link to="/vendor-registration" className="mn-header-link hidden xl:inline-flex">
                {t("Become a Vendor")}
              </Link>
            )}

            {!user && (
              <Link to="/login" className="mn-header-link inline-flex">
                <ArrowRightOnRectangleIcon className="w-5 h-5 shrink-0" />
                <span className="hidden lg:block">{t("Login")}</span>
              </Link>
            )}

            {/* Words on one side, the shop's own controls on the other. The
                three squares that follow are the same size and the same box,
                which is what makes them read as one set rather than three more
                things to choose between. */}
            <div className="w-px h-6 bg-[var(--line)] mx-1 hidden sm:block" />
            {user ? (
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  className="mn-icon-btn"
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
                className="mn-icon-btn"
              >
                <UserCircleIcon className="w-5 h-5" />
              </Link>
            )}
            {user && <NotificationBell />}
            <Link
              to="/wishlist"
              className="mn-icon-btn"
            >
              <HeartIcon className="w-5 h-5" />
            </Link>
            <Link
              to="/cart"
              className="mn-icon-btn"
            >
              <ShoppingCartIcon className="w-5 h-5" />
              {/* `.mn-icon-btn em` is the design package's own count badge. */}
              <em>
                {user?.cart?.length
                  ? user.cart.reduce(
                      (acc, item) => acc + (item.quantity || 0),
                      0
                    )
                  : 0}
              </em>
            </Link>

            {/* Mobile menu toggle */}
            <button
              className="lg:hidden flex flex-col justify-center items-center w-9 h-9 rounded-[11px] border border-[var(--line)] hover:border-[var(--orange)] transition-colors ml-1"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              <span
                className={`w-5 h-0.5 bg-white transition-all duration-300 ${
                  isMenuOpen ? "rotate-45 translate-y-1" : ""
                }`}
              />
              <span
                className={`w-5 h-0.5 bg-white transition-all duration-300 mt-1 ${
                  isMenuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`w-5 h-0.5 bg-white transition-all duration-300 mt-1 ${
                  isMenuOpen ? "-rotate-45 -translate-y-1.5" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="mn-search pb-3 md:hidden" style={{ width: "auto" }} ref={mobileSearchRef}>
          <div className="relative">
            <div className="relative flex items-center">
              <MagnifyingGlassIcon className="pointer-events-none" />
              <input
                type="text"
                placeholder={t("Search...")}
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
      <nav className="hidden lg:block border-t border-[var(--line)] bg-[rgba(9,13,20,0.55)]">
        <div className="mn-site-width">
          <ul className="mn-nav-links flex-wrap">
            {/* The catalogue opens from one control at the head of the row.
                Given a row of its own the departments wrapped onto a second
                and third line as the catalogue grew; behind this button the
                bar stays one line however many departments there are. */}
            <AllCategoriesMenu />

            {navigationItems
              .filter((item) => (item.condition === undefined || item.condition) && !item.mobileOnly)
              .map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`block py-3 px-4 text-[13px] font-bold rounded-lg ${item.className || ""}`}
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

            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <div className="flex items-center gap-1.5 px-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
                <Squares2X2Icon className="w-3.5 h-3.5" />
                {t("Shop by Category")}
              </div>
              {/* Same tree as the desktop bar, expanded in place — the drawer
                  is where the deeper levels were previously unreachable. */}
              <CategoryAccordion onNavigate={() => setIsMenuOpen(false)} />
            </div>
          </nav>
        </aside>
      </div>
    </header>
    </>
  );
};

export default Header;
