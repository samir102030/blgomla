import React, { useState } from "react";
import type { Category } from "../types/category.type";
import type { Brand } from "../types/brand.type";

interface FilterState {
  categories: string[];
  subcategories: string[];
  brands: string[];
  minPrice: string;
  maxPrice: string;
  rating: string;
  search: string;
  featured: boolean;
  onSale: boolean;
}

interface FilterSidebarProps {
  filters: FilterState;
  categories: Category[];
  brands: Brand[];
  onFilterChange?: (filters: Partial<FilterState>) => void;
  onSearchChange?: (search: string) => void;
}

const ProductFilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  categories,
  brands,
  onFilterChange,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    brand: false,
    price: false,
    rating: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev],
    }));
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const newCategories = checked
      ? [...filters.categories, categoryId]
      : filters.categories.filter((id) => id !== categoryId);
    onFilterChange?.({ categories: newCategories });
  };

  const handleBrandChange = (brandId: string, checked: boolean) => {
    const newBrands = checked
      ? [...filters.brands, brandId]
      : filters.brands.filter((id) => id !== brandId);
    onFilterChange?.({ brands: newBrands });
  };

  const handlePriceChange = (field: "minPrice" | "maxPrice", value: string) => {
    onFilterChange?.({ [field]: value });
  };

  const handleRatingChange = (rating: string) => {
    onFilterChange?.({ rating });
  };

  const handleFeaturedChange = (featured: boolean) => {
    onFilterChange?.({ featured });
  };

  const handleOnSaleChange = (onSale: boolean) => {
    onFilterChange?.({ onSale });
  };

  const clearFilters = () => {
    onFilterChange?.({
      categories: [],
      subcategories: [],
      brands: [],
      minPrice: "",
      maxPrice: "",
      rating: "",
      search: "",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Clear Filters */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={clearFilters}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-md text-sm font-medium transition-colors"
        >
          Clear All Filters
        </button>
      </div>

      {/* Category */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection("category")}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <h3 className="font-semibold text-gray-900">Category</h3>
          <span className="text-gray-500">
            {expandedSections.category ? "−" : "+"}
          </span>
        </button>
        {expandedSections.category && (
          <div className="px-4 pb-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.map((category) => (
                <label
                  key={category._id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category._id!)}
                      onChange={(e) =>
                        handleCategoryChange(category._id!, e.target.checked)
                      }
                      className="mr-3"
                    />
                    <span className="text-sm text-gray-700">
                      {category.name}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    ({category.productCount || 0})
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Brand */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection("brand")}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <h3 className="font-semibold text-gray-900">Brand</h3>
          <span className="text-gray-500">
            {expandedSections.brand ? "−" : "+"}
          </span>
        </button>
        {expandedSections.brand && (
          <div className="px-4 pb-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {brands?.map((brand) => (
                <label
                  key={brand._id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.brands.includes(brand._id!)}
                      onChange={(e) =>
                        handleBrandChange(brand._id!, e.target.checked)
                      }
                      className="mr-3"
                    />
                    <span className="text-sm text-gray-700">{brand.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    ({brand.productCount || 0})
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Price Range */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection("price")}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <h3 className="font-semibold text-gray-900">Price Range</h3>
          <span className="text-gray-500">
            {expandedSections.price ? "−" : "+"}
          </span>
        </button>
        {expandedSections.price && (
          <div className="px-4 pb-4">
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice}
                onChange={(e) => handlePriceChange("minPrice", e.target.value)}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice}
                onChange={(e) => handlePriceChange("maxPrice", e.target.value)}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Rating */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection("rating")}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <h3 className="font-semibold text-gray-900">Minimum Rating</h3>
          <span className="text-gray-500">
            {expandedSections.rating ? "−" : "+"}
          </span>
        </button>
        {expandedSections.rating && (
          <div className="px-4 pb-4">
            <div className="space-y-2">
              {[4, 3, 2, 1].map((rating) => (
                <label key={rating} className="flex items-center">
                  <input
                    type="radio"
                    name="rating"
                    value={rating}
                    checked={filters.rating === rating.toString()}
                    onChange={(e) => handleRatingChange(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-sm text-gray-700">{rating}+ Stars</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Featured */}
      <div className="border-b border-gray-200">
        <div className="p-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.featured}
              onChange={(e) => handleFeaturedChange(e.target.checked)}
              className="mr-3"
            />
            <span className="text-sm text-gray-700">Featured Products</span>
          </label>
        </div>
      </div>

      {/* On Sale */}
      <div>
        <div className="p-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.onSale}
              onChange={(e) => handleOnSaleChange(e.target.checked)}
              className="mr-3"
            />
            <span className="text-sm text-gray-700">On Sale</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default ProductFilterSidebar;
