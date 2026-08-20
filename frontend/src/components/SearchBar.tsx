import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "../lib/axios";
import { cldImg } from "../lib/cldImage";
import { getCategoryIcon } from "../lib/categoryIcon";

interface ProductHit {
  _id: string;
  name: string;
  nameAr?: string;
  slug?: string;
  price: number;
  salePrice?: number;
  saleActive: boolean;
  image?: string | null;
}

interface BrandHit {
  _id: string;
  name: string;
  nameAr?: string;
  slug?: string;
  logo?: string;
}

interface CategoryHit {
  _id: string;
  name: string;
  nameAr?: string;
  slug?: string;
}

interface SearchBarProps {
  className?: string;
}

const RECENT_KEY = "recent-searches";
const RECENT_MAX = 6;

const loadRecent = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
};

const saveRecent = (term: string) => {
  if (!term.trim()) return;
  const t = term.trim();
  const prev = loadRecent().filter((s) => s.toLowerCase() !== t.toLowerCase());
  const next = [t, ...prev].slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* quota — ignore */
  }
};

const SearchBar: React.FC<SearchBarProps> = ({ className = "" }) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const pickName = useCallback(
    (p: { name: string; nameAr?: string }) => (isAr && p.nameAr ? p.nameAr : p.name),
    [isAr]
  );

  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductHit[]>([]);
  const [brands, setBrands] = useState<BrandHit[]>([]);
  const [categories, setCategories] = useState<CategoryHit[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>(() => loadRecent());

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  // Flatten product/brand/category hits into a single keyboard-navigable list.
  // Order matches the visual sections so arrow keys feel natural.
  const flatHits = useMemo(() => {
    type Hit =
      | { kind: "product"; item: ProductHit }
      | { kind: "brand"; item: BrandHit }
      | { kind: "category"; item: CategoryHit };
    const out: Hit[] = [];
    products.forEach((p) => out.push({ kind: "product", item: p }));
    brands.forEach((b) => out.push({ kind: "brand", item: b }));
    categories.forEach((c) => out.push({ kind: "category", item: c }));
    return out;
  }, [products, brands, categories]);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setProducts([]);
      setBrands([]);
      setCategories([]);
      // Keep the dropdown open if there are recent searches to show.
      return;
    }

    const myReq = ++reqIdRef.current;
    setIsLoading(true);
    try {
      const { data } = await axiosInstance.get("/products/search-suggestions", {
        params: { q },
      });
      // Drop the result if a later request has already fired.
      if (myReq !== reqIdRef.current) return;
      setProducts(data.products || []);
      setBrands(data.brands || []);
      setCategories(data.categories || []);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch {
      if (myReq === reqIdRef.current) {
        setProducts([]);
        setBrands([]);
        setCategories([]);
      }
    } finally {
      if (myReq === reqIdRef.current) setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 250);
    setIsOpen(true);
  };

  const goToProduct = (p: ProductHit) => {
    saveRecent(query || pickName(p));
    setRecent(loadRecent());
    navigate(`/product/${p._id}`);
    setIsOpen(false);
    setQuery("");
  };

  const goToBrand = (b: BrandHit) => {
    saveRecent(query || pickName(b));
    setRecent(loadRecent());
    navigate(`/products?brand=${b._id}`);
    setIsOpen(false);
    setQuery("");
  };

  const goToCategory = (c: CategoryHit) => {
    saveRecent(query || pickName(c));
    setRecent(loadRecent());
    navigate(`/products?category=${c._id}`);
    setIsOpen(false);
    setQuery("");
  };

  const goToSearch = (term?: string) => {
    const q = (term ?? query).trim();
    if (!q) return;
    saveRecent(q);
    setRecent(loadRecent());
    navigate(`/products?search=${encodeURIComponent(q)}`);
    setIsOpen(false);
  };

  const clearRecent = () => {
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      /* ignore */
    }
    setRecent([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" && query.trim()) {
        goToSearch();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatHits.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && flatHits[selectedIndex]) {
          const hit = flatHits[selectedIndex];
          if (hit.kind === "product") goToProduct(hit.item);
          else if (hit.kind === "brand") goToBrand(hit.item);
          else goToCategory(hit.item);
        } else if (query.trim()) {
          goToSearch();
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showResults = flatHits.length > 0;
  const showRecent = !showResults && recent.length > 0 && query.trim().length < 2;
  const showEmpty = !showResults && !showRecent && query.trim().length >= 2 && !isLoading;

  // Running index across sections to keep keyboard-nav in sync.
  let cursor = -1;

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={t("Search products...")}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--brand-nav)] focus:ring-2 focus:ring-[var(--brand-nav)]/20 transition-all text-sm"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-subtle)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[var(--brand-nav)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!isLoading && query && (
          <button
            onClick={() => {
              setQuery("");
              setProducts([]);
              setBrands([]);
              setCategories([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (showResults || showRecent || showEmpty) && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn"
        >
          {showResults && (
            <div className="max-h-[28rem] overflow-y-auto">
              {/* Products */}
              {products.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
                    {t("Products")}
                  </div>
                  <ul>
                    {products.map((p) => {
                      cursor++;
                      const idx = cursor;
                      const unitPrice = p.saleActive && typeof p.salePrice === "number" ? p.salePrice : p.price;
                      return (
                        <li key={p._id}>
                          <button
                            onClick={() => goToProduct(p)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              idx === selectedIndex ? "bg-[var(--brand-nav)]/10" : "hover:bg-[var(--surface-2)]"
                            }`}
                          >
                            <div className="w-10 h-10 rounded-lg bg-white flex-shrink-0 overflow-hidden">
                              {p.image ? (
                                <img
                                  src={cldImg(p.image, { w: 120 })}
                                  alt={pickName(p)}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-contain"
                                />
                              ) : (
 <div className="w-full h-full flex items-center justify-center text-lg"></div>
                              )}
                            </div>
                            <div className="flex-grow min-w-0">
                              <p className="text-sm font-medium text-[var(--text)] truncate">{pickName(p)}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-sm font-bold text-[var(--text)]">
                                  {unitPrice.toLocaleString()}{" "}
                                  <span className="text-xs font-normal text-[var(--text-muted)]">EGP</span>
                                </span>
                                {p.saleActive && (
                                  <span className="text-xs text-[var(--text-subtle)] line-through">
                                    {p.price.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Brands */}
              {brands.length > 0 && (
                <div className="border-t border-[var(--border)]">
                  <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
                    {t("Brands")}
                  </div>
                  <ul>
                    {brands.map((b) => {
                      cursor++;
                      const idx = cursor;
                      return (
                        <li key={b._id}>
                          <button
                            onClick={() => goToBrand(b)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                              idx === selectedIndex ? "bg-[var(--brand-nav)]/10" : "hover:bg-[var(--surface-2)]"
                            }`}
                          >
                            <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {b.logo ? (
                                <img src={b.logo} alt={pickName(b)} className="w-full h-full object-contain p-1" loading="lazy" />
                              ) : (
                                <span className="text-xs font-semibold text-[var(--text-subtle)]">{pickName(b).charAt(0)}</span>
                              )}
                            </div>
                            <span className="text-sm text-[var(--text)] truncate">{pickName(b)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Categories */}
              {categories.length > 0 && (
                <div className="border-t border-[var(--border)]">
                  <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
                    {t("Categories")}
                  </div>
                  <ul>
                    {categories.map((c) => {
                      cursor++;
                      const idx = cursor;
                      return (
                        <li key={c._id}>
                          <button
                            onClick={() => goToCategory(c)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                              idx === selectedIndex ? "bg-[var(--brand-nav)]/10" : "hover:bg-[var(--surface-2)]"
                            }`}
                          >
                            {(() => {
                              const Icon = getCategoryIcon(c.name);
                              return <Icon className="w-4 h-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />;
                            })()}
                            <span className="text-sm text-[var(--text)] truncate">{pickName(c)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {showResults && (
            <button
              onClick={() => goToSearch()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-[var(--brand-nav)] hover:bg-[var(--surface-2)] border-t border-[var(--border)] transition-colors"
            >
              {t("View all results for")} "{query}"
              <svg className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {showRecent && (
            <div className="py-2">
              <div className="flex items-center justify-between px-4 pt-1 pb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
                  {t("Recent searches")}
                </span>
                <button
                  onClick={clearRecent}
                  className="text-[11px] text-[var(--text-subtle)] hover:text-[var(--text)] transition-colors"
                >
                  {t("Clear")}
                </button>
              </div>
              <ul>
                {recent.map((term) => (
                  <li key={term}>
                    <button
                      onClick={() => {
                        setQuery(term);
                        search(term);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-[var(--surface-2)] transition-colors"
                    >
                      <svg className="w-4 h-4 text-[var(--text-subtle)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-[var(--text)] truncate">{term}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showEmpty && (
            <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">
              {t("No products found")}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
