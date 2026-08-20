import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useProductStore } from "../../stores/product.store";
import { useBrandStore } from "../../stores/brand.store";
import { useCategoryStore } from "../../stores/category.store";
import { useUserStore } from "../../stores/user.store";
import { useVendorStore } from "../../stores/vendor.store";
import { axiosInstance } from "../../lib/axios";
import AddProductModal from "../../components/AddProductModal";
import ProductDetailsModal from "../../components/ProductDetailsModal";
import EditProductModal from "../../components/EditProductModal";
import DeleteProductModal from "../../components/DeleteProductModal";
import FilterModal, { type ProductFilters } from "../../components/FilterModal";
import BulkProductUpload from "../../components/vendor/BulkProductUpload";

const ProductsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const pickName = (c: { name?: string; nameAr?: string } | null | undefined) => {
    if (!c) return "";
    return (i18n.language === "ar" && c.nameAr ? c.nameAr : c.name) || "";
  };
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
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<ProductFilters>({
    brand: "",
    category: "",
    priceMin: "",
    priceMax: "",
    stockStatus: "",
    productStatus: "",
    vendor: "",
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
  const isAdminLike =
    user?.role === "admin" || user?.role === "super_admin";

  useEffect(() => {
    fetchBrands();
    fetchCategories();

    // Fetch vendors/stores for the filter
    const fetchVendorsData = async () => {
      try {
        const response = await axiosInstance.get("/stores");
        setVendors(response.data.data || response.data || []);
      } catch (error) {
        console.error("Error fetching vendors:", error);
        setVendors([]);
      }
    };

    fetchVendorsData();
  }, [fetchBrands, fetchCategories]);

  // Fetch products based on user role with pagination
  useEffect(() => {
    if (isAdminLike) {
      fetchProducts({ audience: "public", page: currentPage, limit: pageSize });
    } else if (user?.role === "store") {
      fetchVendorStore();
    }
  }, [user?.role, fetchProducts, fetchVendorStore, currentPage, pageSize]);

  // Fetch products when vendor store is loaded
  useEffect(() => {
    if (user?.role === "store" && vendorStore?._id) {
      fetchProducts({ audience: "public", storeId: vendorStore._id, page: currentPage, limit: pageSize });
    }
  }, [user?.role, vendorStore?._id, fetchProducts, currentPage, pageSize]);

  // Clear selection when page changes
  useEffect(() => {
    setSelectedIds(new Set());
    setShowBulkActions(false);
  }, [currentPage]);

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
  // Map an internal status enum to a localized label.
  const stockStatusLabel = (status: string) => {
    switch (status) {
      case "out_of_stock":
        return t("Out of Stock");
      case "low_stock":
        return t("Low Stock");
      case "active":
        return t("In Stock");
      default:
        return status.replace(/_/g, " ");
    }
  };
  // Same idea for approvalStatus.
  const approvalLabel = (status: string | undefined) => {
    switch (status) {
      case "approved":
        return t("Approved");
      case "rejected":
        return t("Rejected");
      case "pending":
        return t("Pending");
      default:
        return t("Unknown");
    }
  };

  // defensive defaults in case stores aren't hydrated yet
  const safeBrands = brands ?? [];
  const safeCategories = categories ?? [];

  // Helper to display category name whether populated or id (RTL-aware).
  const getCategoryName = (product: any) => {
    if (!product) return "";
    const cat = product.category;
    if (!cat) return "";
    if (typeof cat === "string") {
      const found = safeCategories.find((c) => c._id === cat);
      return pickName(found);
    }
    return pickName(cat);
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
      product.category === categoryFilter;

    // Advanced filters
    const matchesBrand =
      !advancedFilters.brand || product.brand === advancedFilters.brand;

    const matchesAdvancedCategory =
      !advancedFilters.category ||
      (typeof product.category === "string"
        ? product.category === advancedFilters.category
        : (product.category as any)?._id === advancedFilters.category);

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

    const matchesVendor =
      !advancedFilters.vendor ||
      (typeof product.store === "string"
        ? product.store === advancedFilters.vendor
        : (product.store as any)?._id === advancedFilters.vendor);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesBrand &&
      matchesAdvancedCategory &&
      matchesPriceMin &&
      matchesPriceMax &&
      matchesStockStatus &&
      matchesProductStatus &&
      matchesVendor
    );
  });

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
    if (isAdminLike) {
      fetchProducts({ audience: "public", page: currentPage, limit: pageSize });
    } else if (user?.role === "store" && vendorStore?._id) {
      fetchProducts({ audience: "public", storeId: vendorStore._id, page: currentPage, limit: pageSize });
    }
  };

  // Pagination helpers
  const totalPages = paginated?.pages ?? 1;
  const totalProducts = paginated?.total ?? products.length;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalProducts);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Selection helpers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p._id)));
      setShowBulkActions(true);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
    setShowBulkActions(next.size > 0);
  };

  // Bulk update handler
  const handleBulkUpdate = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      const ids = Array.from(selectedIds);
      let updateData: Record<string, any> = {};

      switch (bulkAction) {
        case "activate":
          updateData = { isActive: true };
          break;
        case "deactivate":
          updateData = { isActive: false };
          break;
        case "set_price":
          if (!bulkValue || isNaN(Number(bulkValue))) {
            toast.error("Please enter a valid price");
            setBulkUpdating(false);
            return;
          }
          updateData = { price: Number(bulkValue) };
          break;
        case "set_stock":
          if (!bulkValue || isNaN(Number(bulkValue))) {
            toast.error("Please enter a valid stock number");
            setBulkUpdating(false);
            return;
          }
          updateData = { stock: Number(bulkValue) };
          break;
        case "set_sale":
          if (!bulkValue || isNaN(Number(bulkValue))) {
            toast.error("Please enter a valid sale percentage");
            setBulkUpdating(false);
            return;
          }
          updateData = { salePercentage: Number(bulkValue), saleActive: true };
          break;
        case "remove_sale":
          updateData = { salePercentage: 0, saleActive: false };
          break;
        case "feature":
          updateData = { featured: true };
          break;
        case "unfeature":
          updateData = { featured: false };
          break;
        default:
          setBulkUpdating(false);
          return;
      }

      // Apply updates to each selected product
      let successCount = 0;
      for (const id of ids) {
        try {
          await axiosInstance.put(`/products/${id}`, updateData);
          successCount++;
        } catch {
          // continue with others
        }
      }

      toast.success(`Updated ${successCount}/${ids.length} products`);
      setSelectedIds(new Set());
      setShowBulkActions(false);
      setBulkAction("");
      setBulkValue("");
      refreshProducts();
    } catch (err) {
      toast.error("Bulk update failed");
    } finally {
      setBulkUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-sm text-gray-500">
          {t("product.loadingProducts")}
        </div>
      )}
      {error && (
        <div className="text-sm text-red-500">
          {t("product.loadingError")}
          {error}
        </div>
      )}
      {/* Header */}
      {/* make this to be row instead of column */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#333333]">
            {t("product.productsManagement")}
          </h1>
          <p className="text-[#9E9E9E]">{t("product.manageInventory")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {/* Bulk Upload for admin and vendors */}
          {(user?.role === "store" || isAdminLike) && (
            <button
              onClick={() => setShowBulkUpload(!showBulkUpload)}
              className="bg-[var(--brand-primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--brand-accent)] transition-colors flex items-center gap-2 font-medium"
            >
 {t("product.bulkUpload")}
            </button>
          )}
          <button
            onClick={() => setIsCreating(true)}
            className="bg-[#FFD600] text-[#333333] px-4 py-2 rounded-lg hover:bg-[#e6c100] transition-colors flex items-center gap-2 font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            {t("product.addProduct")}
          </button>
        </div>
      </div>

      {/* Bulk Upload Section */}
      {(user?.role === "store" || isAdminLike) && showBulkUpload && (
        <BulkProductUpload onUploadComplete={refreshProducts} />
      )}

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
          vendors={vendors}
        />
      )}

      {/* Stats Cards (basic) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("product.totalProducts")}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {paginated?.total ?? products.length}
              </p>
            </div>
            <div className="bg-[var(--brand-primary)]/10 p-3 rounded-full">
 <span className="text-2xl"></span>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("product.activeProducts")}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {products.filter((p) => p.isActive).length}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
 <span className="text-2xl"></span>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("product.lowStock")}</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                {
                  products.filter((p) => p.stock && p.stock < 30 && p.stock > 0)
                    .length
                }
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
 <span className="text-2xl"></span>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("product.outOfStock")}</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">
                {products.filter((p) => !p.stock || p.stock === 0).length}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
 <span className="text-2xl"></span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t("product.searchPlaceholder")}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <select
              className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">{t("product.allCategories")}</option>
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
              {t("product.moreFilters")}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)] p-4 rounded-lg flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-[var(--brand-accent)]">
            {selectedIds.size} product{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <select
            value={bulkAction}
            onChange={(e) => { setBulkAction(e.target.value); setBulkValue(""); }}
            className="px-3 py-1.5 border border-[var(--brand-primary)] rounded-lg text-sm bg-white focus:ring-2 focus:ring-[var(--brand-primary)]"
          >
            <option value="">Select action...</option>
 <option value="activate"> Activate</option>
 <option value="deactivate"> Deactivate</option>
 <option value="set_price"> Set Price</option>
 <option value="set_stock"> Set Stock</option>
 <option value="set_sale"> Set Sale %</option>
 <option value="remove_sale"> Remove Sale</option>
            <option value="feature">Mark Featured</option>
 <option value="unfeature"> Unmark Featured</option>
          </select>
          {["set_price", "set_stock", "set_sale"].includes(bulkAction) && (
            <input
              type="number"
              placeholder={bulkAction === "set_price" ? "Price" : bulkAction === "set_stock" ? "Stock qty" : "Sale %"}
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              className="px-3 py-1.5 border border-[var(--brand-primary)] rounded-lg text-sm w-32 focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          )}
          <button
            onClick={handleBulkUpdate}
            disabled={!bulkAction || bulkUpdating}
            className="px-4 py-1.5 bg-[var(--brand-accent)] text-white rounded-lg text-sm font-medium hover:bg-[var(--brand-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {bulkUpdating ? "Updating..." : "Apply"}
          </button>
          <button
            onClick={() => { setSelectedIds(new Set()); setShowBulkActions(false); }}
            className="px-3 py-1.5 text-sm text-[var(--brand-primary)] hover:text-[var(--brand-accent)]"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Products Table (desktop) / Card list (mobile) */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Mobile cards */}
        <ul className="md:hidden divide-y divide-gray-200">
          {filteredProducts.map((product) => {
            const status = getStockStatus(product.stock);
            return (
              <li key={product._id} className={`p-3 ${selectedIds.has(product._id) ? "bg-[var(--brand-primary)]/10" : ""}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product._id)}
                    onChange={() => toggleSelect(product._id)}
                    className="mt-1 rounded border-gray-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  />
                  {product.images?.[0]?.url ? (
                    <img
                      className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
                      src={product.images?.[0]?.url}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center border border-gray-200 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                        <path d="M6.75 4.5a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 6.75 19.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 17.25 4.5H6.75Zm0-1.5h10.5A3.75 3.75 0 0 1 21 6.75v10.5A3.75 3.75 0 0 1 17.25 21H6.75A3.75 3.75 0 0 1 3 17.25V6.75A3.75 3.75 0 0 1 6.75 3Z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 break-words">{product.name}</p>
                      <span className="text-xs text-gray-500 flex-shrink-0">#{product._id?.slice(-6)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{getCategoryName(product)}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="font-medium text-gray-900">
                        {typeof product.price === "number"
                          ? `${product.price.toLocaleString("en-EG", { maximumFractionDigits: 2 })} ${t("EGP")}`
                          : product.price}
                      </span>
                      <span className={product.stock < 30 ? "text-red-600" : "text-gray-700"}>
                        {t("Stock")}: {product.stock}
 {product.stock === 0 ? " " : product.stock < 30 ? " " : ""}
                      </span>
                      <span className="text-gray-700">{t("Sold")}: {product.soldCount ?? 0}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${getStatusColor(status)}`}>
                        {stockStatusLabel(status)}
                      </span>
                      <span
                        className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                          product.approvalStatus === "approved"
                            ? "bg-green-100 text-green-800"
                            : product.approvalStatus === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {approvalLabel(product.approvalStatus)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <button onClick={() => handleViewProduct(product)} className="text-[var(--brand-primary)] hover:text-[var(--brand-accent)] flex items-center gap-1 text-xs">
                        <EyeIcon className="h-4 w-4" /> View
                      </button>
                      <button onClick={() => handleEditProduct(product)} className="text-green-600 hover:text-green-900 flex items-center gap-1 text-xs">
                        <PencilIcon className="h-4 w-4" /> Edit
                      </button>
                      <button onClick={() => handleDeleteProduct(product)} className="text-red-600 hover:text-red-900 flex items-center gap-1 text-xs">
                        <TrashIcon className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("product.product")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("product.sku")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("product.category")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("product.price")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("product.stock")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("product.sales")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("product.status")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approval
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("product.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product._id} className={`hover:bg-gray-50 ${selectedIds.has(product._id) ? "bg-[var(--brand-primary)]/10" : ""}`}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product._id)}
                      onChange={() => toggleSelect(product._id)}
                      className="rounded border-gray-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      {product.images?.[0]?.url ? (
                        <img
                          className="h-10 w-10 rounded-lg object-cover shrink-0"
                          src={product.images?.[0]?.url}
                          alt={product.name}
                         loading="lazy" decoding="async"/>
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center border border-gray-200">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-6 w-6"
                          >
                            <path d="M6.75 4.5a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 6.75 19.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 17.25 4.5H6.75Zm0-1.5h10.5A3.75 3.75 0 0 1 21 6.75v10.5A3.75 3.75 0 0 1 17.25 21H6.75A3.75 3.75 0 0 1 3 17.25V6.75A3.75 3.75 0 0 1 6.75 3Z" />
                            <path d="M8.25 9a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0ZM6.75 16.5l2.75-3.667a1.125 1.125 0 0 1 1.8-.038l1.443 1.805l1.358-1.812a1.125 1.125 0 0 1 1.836.037L17.25 16.5H6.75Z" />
                          </svg>
                        </div>
                      )}
                      <div>
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
                      ? `${product.price.toLocaleString("en-EG", { maximumFractionDigits: 2 })} ${t("EGP")}`
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
 <span className="text-yellow-500"></span>
                      )}
                      {product.stock === 0 && (
 <span className="text-red-500"></span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.soldCount ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        getStockStatus(product.stock),
                      )}`}
                    >
                      {stockStatusLabel(getStockStatus(product.stock))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        product.approvalStatus === "approved"
                          ? "bg-green-100 text-green-800"
                          : product.approvalStatus === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                      title={
                        product.approvalStatus === "pending"
                          ? t("Waiting for admin approval")
                          : product.approvalStatus === "rejected"
                          ? t("Rejected by admin")
                          : t("Approved")
                      }
                    >
                      {approvalLabel(product.approvalStatus)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewProduct(product)}
                        className="text-[var(--brand-primary)] hover:text-[var(--brand-accent)]"
                        title={t("product.view")}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="text-green-600 hover:text-green-900"
                        title={t("product.edit")}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product)}
                        className="text-red-600 hover:text-red-900"
                        title={t("product.delete")}
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
      {totalPages > 1 && (
        <div className="bg-white px-4 sm:px-6 py-3 rounded-lg shadow-sm border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-700">
            {t("Showing {{from}} to {{to}} of {{total}} results", {
              from: startItem,
              to: endItem,
              total: totalProducts.toLocaleString(),
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    page === currentPage
                      ? "bg-[var(--brand-accent)] text-white"
                      : "border border-gray-300 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
