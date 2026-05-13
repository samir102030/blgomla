import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "../lib/axios";
import { getBaseUnitPrice } from "../lib/pricing";
import { cldImg } from "../lib/cldImage";

interface SearchResult {
  _id: string;
  name: string;
  price: number;
  saleActive: boolean;
  salePrice?: number;
  salePercentage?: number;
  images?: { url: string; alt?: string }[];
  rating: number;
}

interface SearchBarProps {
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ className = "" }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await axiosInstance.get("/products", {
        params: {
          search: q,
          limit: 6,
          isActive: true,
          deleted: false,
          approvalStatus: "approved",
        },
      });
      setResults(data.data || []);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" && query.trim()) {
        navigate(`/products?search=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          navigate(`/product/${results[selectedIndex]._id}`);
          setIsOpen(false);
          setQuery("");
        } else if (query.trim()) {
          navigate(`/products?search=${encodeURIComponent(query.trim())}`);
          setIsOpen(false);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  // Close dropdown on outside click
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

  const goToProduct = (id: string) => {
    navigate(`/product/${id}`);
    setIsOpen(false);
    setQuery("");
  };

  const goToSearch = () => {
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
    }
  };

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
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={t("Search products...")}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--brand-nav)] focus:ring-2 focus:ring-[var(--brand-nav)]/20 transition-all text-sm"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-subtle)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
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
              setResults([]);
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

      {/* Dropdown Results */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn"
        >
          {results.length > 0 ? (
            <>
              <ul className="max-h-80 overflow-y-auto">
                {results.map((product, index) => (
                  <li key={product._id}>
                    <button
                      onClick={() => goToProduct(product._id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        index === selectedIndex
                          ? "bg-[var(--brand-nav)]/10"
                          : "hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-white flex-shrink-0 overflow-hidden">
                        {product.images?.[0]?.url ? (
                          <img
                            src={cldImg(product.images[0].url, { w: 120 })}
                            alt={product.name}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23f3f4f6'/><text x='32' y='38' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%239ca3af'>No image</text></svg>"; }}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-sm font-medium text-[var(--text)] truncate">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm font-bold text-[var(--text)]">
                            {getBaseUnitPrice(product).toLocaleString()}{" "}
                            <span className="text-xs font-normal text-[var(--text-muted)]">EGP</span>
                          </span>
                          {product.saleActive && (
                            <span className="text-xs text-[var(--text-subtle)] line-through">
                              {product.price.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={goToSearch}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-[var(--brand-nav)] hover:bg-[var(--surface-2)] border-t border-[var(--border)] transition-colors"
              >
                {t("View all results for")} "{query}"
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          ) : (
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
