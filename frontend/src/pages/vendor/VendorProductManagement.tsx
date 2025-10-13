import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useProductStore } from "../../stores/product.store";
import { useBrandStore } from "../../stores/brand.store";
import { useVendorStore } from "../../stores/vendor.store";
import type { Product, ProductImage } from "../../types/product.type";

const VendorProductManagement: React.FC = () => {
  const {
    products,
    loading,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  } = useProductStore();

  const { brands, fetchBrands } = useBrandStore();
  const { vendorStore, fetchVendorStore } = useVendorStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: 0,
    salePrice: 0,
    stock: 0,
    Category: "",
    brand: "",
    images: [] as ProductImage[],
    features: [] as string[],
    attributes: [] as Array<{ name: string; value: string }>,
    tags: [] as string[],
  });

  useEffect(() => {
    fetchVendorStore();
    fetchBrands();
  }, [fetchVendorStore, fetchBrands]);

  useEffect(() => {
    if (vendorStore?._id) {
      fetchProducts({ storeId: vendorStore._id });
    }
  }, [fetchProducts, vendorStore?._id]);

  const resetForm = () => {
    setProductForm({
      name: "",
      description: "",
      price: 0,
      salePrice: 0,
      stock: 0,
      Category: "",
      brand: "",
      images: [],
      features: [],
      attributes: [],
      tags: [],
    });
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingProduct) {
        await updateProduct(editingProduct._id, productForm);
        toast.success("Product updated successfully!");
      } else {
        await createProduct(productForm);
        toast.success("Product created successfully!");
      }

      setShowCreateModal(false);
      resetForm();
      if (vendorStore?._id) {
        fetchProducts({ storeId: vendorStore._id });
      }
    } catch {
      toast.error("Failed to save product");
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || "",
      price: product.price,
      salePrice: product.salePrice || 0,
      stock: product.stock,
      Category: product.Category || "",
      brand: product.brand || "",
      images: product.images,
      features: product.features || [],
      attributes: product.attributes || [],
      tags: product.tags || [],
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct(productId);
        toast.success("Product deleted successfully!");
        if (vendorStore?._id) {
          fetchProducts({ storeId: vendorStore._id });
        }
      } catch {
        toast.error("Failed to delete product");
      }
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description &&
        product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory =
      !categoryFilter || product.Category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    "Electronics",
    "Fashion",
    "Home & Garden",
    "Sports",
    "Books",
    "Toys",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Product Management
          </h1>
          <p className="text-gray-600">Manage your store products</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600"
        >
          Add New Product
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product._id}
            className="bg-white rounded-lg shadow-sm overflow-hidden"
          >
            <div className="aspect-w-16 aspect-h-9">
              <img
                src={product.images[0]?.url || "/placeholder-product.jpg"}
                alt={product.name}
                className="w-full h-48 object-cover"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                {product.name}
              </h3>
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {product.description}
              </p>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-gray-900">
                    ${product.price}
                  </span>
                  {product.salePrice && product.salePrice < product.price && (
                    <span className="text-sm text-gray-500 line-through">
                      ${product.salePrice}
                    </span>
                  )}
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    product.stock > 0
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {product.stock > 0
                    ? `${product.stock} in stock`
                    : "Out of stock"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <span className="text-yellow-400">⭐</span>
                  <span className="text-sm text-gray-600">
                    {product.rating?.toFixed(1) || "0.0"}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-blue-600 hover:text-blue-500 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product._id)}
                    className="text-red-600 hover:text-red-500 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No products found</div>
          <p className="text-gray-400 mt-2">
            {searchTerm || categoryFilter
              ? "Try adjusting your search or filter criteria."
              : "Start by adding your first product."}
          </p>
        </div>
      )}

      {/* Create/Edit Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) =>
                        setProductForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={productForm.Category}
                      onChange={(e) =>
                        setProductForm((prev) => ({
                          ...prev,
                          Category: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand
                    </label>
                    <select
                      value={productForm.brand}
                      onChange={(e) =>
                        setProductForm((prev) => ({
                          ...prev,
                          brand: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="">Select Brand</option>
                      {brands.map((brand) => (
                        <option key={brand._id} value={brand._id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Quantity *
                    </label>
                    <input
                      type="number"
                      value={productForm.stock}
                      onChange={(e) =>
                        setProductForm((prev) => ({
                          ...prev,
                          stock: parseInt(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      required
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={productForm.price}
                      onChange={(e) =>
                        setProductForm((prev) => ({
                          ...prev,
                          price: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      required
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sale Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={productForm.salePrice}
                      onChange={(e) =>
                        setProductForm((prev) => ({
                          ...prev,
                          salePrice: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) =>
                      setProductForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50"
                  >
                    {loading
                      ? "Saving..."
                      : editingProduct
                      ? "Update Product"
                      : "Create Product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorProductManagement;
