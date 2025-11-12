import React, { useEffect, useState } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { useProductStore } from "../../stores/product.store";
import { useBrandStore } from "../../stores/brand.store";
import { useCategoryStore } from "../../stores/category.store";
import { useUserStore } from "../../stores/user.store";
import { useVendorStore } from "../../stores/vendor.store";
import AddProductModal from "../../components/AddProductModal";
import ProductDetailsModal from "../../components/ProductDetailsModal";
import EditProductModal from "../../components/EditProductModal";
import DeleteProductModal from "../../components/DeleteProductModal";
import FilterModal, { type ProductFilters } from "../../components/FilterModal";

const ProductsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<any>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<ProductFilters>({
    brand: "",
    category: "",
    priceMin: "",
    priceMax: "",
    stockStatus: "",
    productStatus: "",
  });

  const products = useProductStore((s) => s.products);
  const paginated = useProductStore((s) => s.paginated);
  const loading = useProductStore((s) => s.loading);
  const error = useProductStore((s) => s.error);
  const fetchProducts = useProductStore((s) => s.fetchProducts);

  const brands = useBrandStore((s) => s.brands);
  const fetchBrands = useBrandStore((s) => s.fetchBrands);

  const categories = useCategoryStore((s) => s.categories);
  const fetchCategories = useCategoryStore((s) => s.fetchCategories);

  const { user } = useUserStore();
  const { vendorStore, fetchVendorStore } = useVendorStore();

  useEffect(() => {
    fetchBrands();
    fetchCategories();
  }, [fetchBrands, fetchCategories]);

  // Fetch products based on user role
  useEffect(() => {
    if (user?.role === "admin") {
      // Admin sees all products
      fetchProducts();
    } else if (user?.role === "store") {
      // Store user sees only their products
      fetchVendorStore();
    }
  }, [user?.role, fetchProducts, fetchVendorStore]);

  // Fetch products when vendor store is loaded
  useEffect(() => {
    if (user?.role === "store" && vendorStore?._id) {
      fetchProducts({ storeId: vendorStore._id });
    }
  }, [user?.role, vendorStore?._id, fetchProducts]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-[#009688]/10 text-[#009688]";
      case "out_of_stock":
        return "bg-[#D32F2F]/10 text-[#D32F2F]";
      case "low_stock":
        return "bg-[#FFD600]/10 text-[#333333]";
      case "inactive":
        return "bg-[#9E9E9E]/10 text-[#9E9E9E]";
      default:
        return "bg-[#9E9E9E]/10 text-[#9E9E9E]";
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return "out_of_stock";
    if (stock < 30) return "low_stock";
    return "active";
  };

  const filteredProducts = products.filter((product) => {
    // Search filter (name or SKU)
    const matchesSearch =
      (product.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product._id || "").toLowerCase().includes(searchTerm.toLowerCase());

    // Category filter (legacy dropdown)
    const matchesCategory =
      categoryFilter === "all" ||
      getCategoryName(product) === categoryFilter ||
      product.Category === categoryFilter;

    // Advanced filters
    const matchesBrand =
      !advancedFilters.brand || product.brand === advancedFilters.brand;

    const matchesAdvancedCategory =
      !advancedFilters.category ||
      (typeof product.Category === "string"
        ? product.Category === advancedFilters.category
        : (product.Category as any)?._id === advancedFilters.category);

    const matchesPriceMin =
      !advancedFilters.priceMin ||
      product.price >= parseFloat(advancedFilters.priceMin);
    const matchesPriceMax =
      !advancedFilters.priceMax ||
      product.price <= parseFloat(advancedFilters.priceMax);

    const matchesStockStatus =
      !advancedFilters.stockStatus ||
      (advancedFilters.stockStatus === "in_stock" && product.stock > 30) ||
      (advancedFilters.stockStatus === "low_stock" &&
        product.stock > 0 &&
        product.stock <= 30) ||
      (advancedFilters.stockStatus === "out_of_stock" &&
        (!product.stock || product.stock === 0));

    const matchesProductStatus =
      !advancedFilters.productStatus ||
      (advancedFilters.productStatus === "active" && product.isActive) ||
      (advancedFilters.productStatus === "inactive" && !product.isActive);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesBrand &&
      matchesAdvancedCategory &&
      matchesPriceMin &&
      matchesPriceMax &&
      matchesStockStatus &&
      matchesProductStatus
    );
  });

  // Helper to display category name whether populated or id
  const getCategoryName = (product: any) => {
    if (!product) return "";
    const cat = product.Category;
    if (!cat) return "";
    return typeof cat === "string"
      ? safeCategories.find((c) => c._id === cat)?.name || ""
      : cat?.name || "";
  };

  // defensive defaults in case stores aren't hydrated yet
  const safeBrands = brands ?? [];
  const safeCategories = categories ?? [];

  const handleViewProduct = (product: any) => {
    setSelectedProduct(product);
    setIsViewingDetails(true);
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setIsEditing(true);
  };

  const handleDeleteProduct = (product: any) => {
    setDeletingProduct(product);
    setIsDeleting(true);
  };

  const handleOpenFilterModal = () => {
    setIsFilterModalOpen(true);
  };

  const handleApplyFilters = (filters: ProductFilters) => {
    setAdvancedFilters(filters);
  };

  // Helper function to refresh products based on user role
  const refreshProducts = () => {
    if (user?.role === "admin") {
      fetchProducts();
    } else if (user?.role === "store" && vendorStore?._id) {
      fetchProducts({ storeId: vendorStore._id });
    }
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-sm text-gray-500">Loading products...</div>
      )}
      {error && <div className="text-sm text-red-500">Error: {error}</div>}
      {/* Header */}
      {/* make this to be row instead of column */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">
            Products Management
          </h1>
          <p className="text-[#9E9E9E]">
            Manage your product inventory and catalog
          </p>
        </div>
        <div>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-[#FFD600] text-[#333333] px-4 py-2 rounded-lg hover:bg-[#e6c100] transition-colors flex items-center gap-2 font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            Add Product
          </button>
        </div>
      </div>

      {isCreating && (
        <AddProductModal
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          onProductCreated={refreshProducts}
          brands={safeBrands}
          categories={safeCategories}
        />
      )}

      {isViewingDetails && selectedProduct && (
        <ProductDetailsModal
          isOpen={isViewingDetails}
          onClose={() => setIsViewingDetails(false)}
          product={selectedProduct}
        />
      )}

      {isEditing && editingProduct && (
        <EditProductModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          onProductUpdated={refreshProducts}
          product={editingProduct}
          brands={safeBrands}
          categories={safeCategories}
        />
      )}

      {isDeleting && deletingProduct && (
        <DeleteProductModal
          isOpen={isDeleting}
          onClose={() => setIsDeleting(false)}
          onProductDeleted={refreshProducts}
          product={deletingProduct}
        />
      )}

      {isFilterModalOpen && (
        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          onApplyFilters={handleApplyFilters}
          currentFilters={advancedFilters}
          brands={safeBrands}
          categories={safeCategories}
        />
      )}

      {/* Stats Cards (basic) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {paginated?.total ?? products.length}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <span className="text-2xl">📦</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Products</p>
              <p className="text-2xl font-bold text-green-600">
                {products.filter((p) => p.isActive).length}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600">
                {
                  products.filter((p) => p.stock && p.stock < 30 && p.stock > 0)
                    .length
                }
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <span className="text-2xl">⚠️</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">
                {products.filter((p) => !p.stock || p.stock === 0).length}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <span className="text-2xl">❌</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {safeCategories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleOpenFilterModal}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FunnelIcon className="h-4 w-4" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        className="h-10 w-10 rounded-lg object-cover"
                        src={product.images?.[0]?.url || "/placeholder.png"}
                        alt={product.name}
                      />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {product.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product._id?.slice(-8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getCategoryName(product)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {typeof product.price === "number"
                      ? `$${product.price.toFixed(2)}`
                      : product.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <span
                        className={`mr-2 ${
                          product.stock < 30 ? "text-red-600" : "text-gray-900"
                        }`}
                      >
                        {product.stock}
                      </span>
                      {product.stock < 30 && product.stock > 0 && (
                        <span className="text-yellow-500">⚠️</span>
                      )}
                      {product.stock === 0 && (
                        <span className="text-red-500">❌</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.soldCount ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        getStockStatus(product.stock)
                      )}`}
                    >
                      {getStockStatus(product.stock)
                        .replace("_", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewProduct(product)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="text-green-600 hover:text-green-900"
                        title="Edit Product"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Product"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {/* <div className="bg-white px-6 py-3 rounded-lg shadow-sm border flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">1</span> to{" "}
          <span className="font-medium">5</span> of{" "}
          <span className="font-medium">2,847</span> results
        </div>
        <div className="flex space-x-2">
          <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
            Previous
          </button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
            1
          </button>
          <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
            2
          </button>
          <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
            3
          </button>
          <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
            Next
          </button>
        </div>
      </div> */}
    </div>
  );
};

export default ProductsPage;
