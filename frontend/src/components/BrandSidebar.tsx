import React, { useState, useEffect } from "react";

interface Brand {
  _id: string;
  name: string;
  productCount?: number;
}

interface BrandSidebarProps {
  brands: Brand[];
  selectedBrand?: string;
  onBrandSelect?: (brandId: string) => void;
}

const BrandSidebar: React.FC<BrandSidebarProps> = ({
  brands,
  selectedBrand,
  onBrandSelect,
}) => {
  const [activeBrand, setActiveBrand] = useState<string>(selectedBrand || "");

  useEffect(() => {
    setActiveBrand(selectedBrand || "");
  }, [selectedBrand]);

  const handleBrandClick = (brandId: string) => {
    setActiveBrand(brandId);
    if (onBrandSelect) {
      onBrandSelect(brandId);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Brand</h3>
        <div className="w-12 h-0.5 bg-gray-900"></div>
      </div>
      <ul className="space-y-3">
        {brands.map((brand) => (
          <li key={brand._id}>
            <button
              onClick={() => handleBrandClick(brand._id)}
              className={`w-full text-left py-2 px-3 rounded-md transition-colors duration-200 flex justify-between items-center group ${
                activeBrand === brand._id
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="text-base">{brand.name}</span>
              {brand.productCount !== undefined && (
                <span
                  className={`text-sm ${
                    activeBrand === brand._id
                      ? "text-blue-500"
                      : "text-gray-400 group-hover:text-gray-600"
                  }`}
                >
                  ({brand.productCount})
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {/* Clear Selection Button */}
      {activeBrand && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => handleBrandClick("")}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default BrandSidebar;
