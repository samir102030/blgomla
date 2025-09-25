import React, { useState } from 'react';

interface FilterSidebarProps {
  onFilterChange?: (filters: any) => void;
}

const ProductFilterSidebar: React.FC<FilterSidebarProps> = ({ onFilterChange }) => {
  const [expandedSections, setExpandedSections] = useState({
    shipping: true,
    category: true,
    brand: false,
    price: false,
    offers: false,
    minPrice: false,
    rating: false,
    newArrivals: false
  });

  const [filters, setFilters] = useState({
    shipping: '',
    category: '',
    brand: '',
    minPrice: '',
    maxPrice: '',
    offers: [],
    rating: '',
    newArrivals: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  const categories = [
    { id: 'electronics', name: 'Electronics & Computers', count: 245 },
    { id: 'all-electronics', name: 'All Electronics & Computers', count: 245 },
    { id: 'computers-accessories', name: 'Computers & Accessories', count: 156 },
    { id: 'all-computers', name: 'All Computers & Accessories', count: 156 },
    { id: 'computers', name: 'Computers', count: 89 },
    { id: 'all-computers-only', name: 'All Computers', count: 89 },
    { id: 'smart-phones', name: 'Smart Phones', count: 67, checked: true }
  ];

  const brands = [
    { id: 'apple', name: 'Apple', count: 45 },
    { id: 'samsung', name: 'Samsung', count: 38 },
    { id: 'hp', name: 'HP', count: 32 },
    { id: 'dell', name: 'Dell', count: 28 },
    { id: 'lenovo', name: 'Lenovo', count: 25 },
    { id: 'canon', name: 'Canon', count: 22 },
    { id: 'huawei', name: 'Huawei', count: 18 }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Shipping Options */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection('shipping')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <h3 className="font-semibold text-gray-900">Shipping Options</h3>
          <span className="text-gray-500">
            {expandedSections.shipping ? '−' : '+'}
          </span>
        </button>
        {expandedSections.shipping && (
          <div className="px-4 pb-4">
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="shipping"
                  value="express"
                  className="mr-3"
                  onChange={(e) => handleFilterChange('shipping', e.target.value)}
                />
                <span className="bg-yellow-400 text-black px-2 py-1 rounded text-sm font-medium mr-2">
                  express
                </span>
                <span className="text-blue-600">✓</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Category */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection('category')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <h3 className="font-semibold text-gray-900">Category</h3>
          <span className="text-gray-500">
            {expandedSections.category ? '−' : '+'}
          </span>
        </button>
        {expandedSections.category && (
          <div className="px-4 pb-4">
            <div className="space-y-2">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked={category.checked}
                      className="mr-3"
                      onChange={() => handleFilterChange('category', category.id)}
                    />
                    <span className="text-sm text-gray-700">{category.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">({category.count})</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Brand */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection('brand')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <h3 className="font-semibold text-gray-900">Brand</h3>
          <span className="text-gray-500">
            {expandedSections.brand ? '−' : '+'}
          </span>
        </button>
        {expandedSections.brand && (
          <div className="px-4 pb-4">
            <div className="space-y-2">
              {brands.map((brand) => (
                <label key={brand.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-3"
                      onChange={() => handleFilterChange('brand', brand.id)}
                    />
                    <span className="text-sm text-gray-700">{brand.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">({brand.count})</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Price Range */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <h3 className="font-semibold text-gray-900">Price</h3>
          <span className="text-gray-500">
            {expandedSections.price ? '−' : '+'}
          </span>
        </button>
        {expandedSections.price && (
          <div className="px-4 pb-4">
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="430"
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              />
              <span className="text-gray-500">TO</span>
              <input
                type="number"
                placeholder="4000"
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              />
              <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                GO
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Offers */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection('offers')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <h3 className="font-semibold text-gray-900">Offers</h3>
          <span className="text-gray-500">
            {expandedSections.offers ? '−' : '+'}
          </span>
        </button>
      </div>

      {/* Minimum Price */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection('minPrice')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <h3 className="font-semibold text-gray-900">Minimum Price</h3>
          <span className="text-gray-500">
            {expandedSections.minPrice ? '−' : '+'}
          </span>
        </button>
      </div>

      {/* Product Rating */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => toggleSection('rating')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <h3 className="font-semibold text-gray-900">Product Rating</h3>
          <span className="text-gray-500">
            {expandedSections.rating ? '−' : '+'}
          </span>
        </button>
      </div>

      {/* New Arrivals */}
      <div>
        <button
          onClick={() => toggleSection('newArrivals')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
        >
          <h3 className="font-semibold text-gray-900">New Arrivals</h3>
          <span className="text-gray-500">
            {expandedSections.newArrivals ? '−' : '+'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default ProductFilterSidebar;
