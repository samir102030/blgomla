import React, { useEffect, useMemo, useState } from "react";
import { useCollectionStore } from "../../stores/collection.store";
import { useUserStore } from "../../stores/user.store";
import { axiosInstance } from "../../lib/axios";
import toast from "react-hot-toast";
import type { CollectionItemInput } from "../../types/collection.type";

interface VendorProduct {
  _id: string;
  name: string;
  price: number;
  saleActive: boolean;
  salePercentage: number;
  stock: number;
  images: Array<{ url: string }>;
}

const VendorCollectionsPage: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const {
    collections,
    loading,
    error,
    fetchMyCollections,
    createCollection,
    updateCollection,
    deleteCollection,
  } = useCollectionStore();

  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [expandedProductIds, setExpandedProductIds] = useState<string[]>([]);
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    bundlePrice: "",
  });
  const [items, setItems] = useState<Record<string, number>>({});
  const [editFormState, setEditFormState] = useState({
    name: "",
    description: "",
    bundlePrice: "",
  });
  const [editItems, setEditItems] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchMyCollections();
  }, [fetchMyCollections]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!user?.store?._id) return;
      try {
        const { data } = await axiosInstance.get("/products", {
          params: {
            storeId: user.store._id,
            isActive: true,
            deleted: false,
            limit: 200,
          },
        });
        setProducts(data.data || []);
      } catch (err: any) {
        console.error("Failed to load products:", err);
      }
    };
    loadProducts();
  }, [user?.store?._id]);

  const selectedItems = useMemo<CollectionItemInput[]>(
    () =>
      Object.entries(items)
        .filter(([, qty]) => qty > 0)
        .map(([productId, quantity]) => ({ product: productId, quantity })),
    [items]
  );

  const originalTotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => {
      const product = products.find((p) => p._id === item.product);
      if (!product) return sum;
      const unitPrice = product.saleActive
        ? product.price * (1 - product.salePercentage / 100)
        : product.price;
      return sum + unitPrice * item.quantity;
    }, 0);
  }, [selectedItems, products]);

  const handleToggleProduct = (productId: string) => {
    setItems((prev) => ({
      ...prev,
      [productId]: prev[productId] ? 0 : 1,
    }));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setItems((prev) => ({
      ...prev,
      [productId]: Math.max(quantity, 0),
    }));
  };

  const handleCreateCollection = async () => {
    if (!formState.name.trim()) {
      toast.error("Collection name is required");
      return;
    }

    if (selectedItems.length < 2) {
      toast.error("Select at least two products");
      return;
    }

    const bundlePrice = Number(formState.bundlePrice);
    if (!bundlePrice || bundlePrice <= 0) {
      toast.error("Enter a valid bundle price");
      return;
    }

    if (bundlePrice > originalTotal) {
      toast.error("Bundle price must be less than the original total");
      return;
    }

    const collection = await createCollection({
      name: formState.name.trim(),
      description: formState.description.trim(),
      bundlePrice,
      items: selectedItems,
    });

    if (collection) {
      toast.success("Collection created");
      setFormState({ name: "", description: "", bundlePrice: "" });
      setItems({});
      setShowCreateModal(false);
    }
  };

  const openViewModal = (collection: any) => {
    setSelectedCollection(collection);
    setExpandedProductIds([]);
    setShowViewModal(true);
  };

  const openEditModal = (collection: any) => {
    setSelectedCollection(collection);
    setEditFormState({
      name: collection.name || "",
      description: collection.description || "",
      bundlePrice: collection.bundlePrice?.toString() || "",
    });
    const nextItems: Record<string, number> = {};
    collection.items.forEach((item: any) => {
      nextItems[item.product._id] = item.quantity;
    });
    setEditItems(nextItems);
    setShowEditModal(true);
  };

  const toggleExpandedProduct = (productId: string) => {
    setExpandedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const openDeleteModal = (collection: any) => {
    setSelectedCollection(collection);
    setShowDeleteModal(true);
  };

  const handleEditCollection = async () => {
    if (!selectedCollection) return;
    if (!editFormState.name.trim()) {
      toast.error("Collection name is required");
      return;
    }

    const selectedItemsForUpdate: CollectionItemInput[] = Object.entries(
      editItems
    )
      .filter(([, qty]) => qty > 0)
      .map(([product, quantity]) => ({ product, quantity }));

    if (selectedItemsForUpdate.length < 2) {
      toast.error("Select at least two products");
      return;
    }

    const bundlePrice = Number(editFormState.bundlePrice);
    if (!bundlePrice || bundlePrice <= 0) {
      toast.error("Enter a valid bundle price");
      return;
    }

    const originalTotal = selectedItemsForUpdate.reduce((sum, item) => {
      const product = products.find((p) => p._id === item.product);
      if (!product) return sum;
      const unitPrice = product.saleActive
        ? product.price * (1 - product.salePercentage / 100)
        : product.price;
      return sum + unitPrice * item.quantity;
    }, 0);

    if (bundlePrice > originalTotal) {
      toast.error("Bundle price must be less than the original total");
      return;
    }

    const updated = await updateCollection(selectedCollection._id, {
      name: editFormState.name.trim(),
      description: editFormState.description.trim(),
      bundlePrice,
      items: selectedItemsForUpdate,
    });

    if (updated) {
      toast.success("Collection updated");
      setShowEditModal(false);
      setSelectedCollection(null);
    } else {
      toast.error("Failed to update collection");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const updated = await updateCollection(id, { isActive: !isActive });
    if (updated) {
      toast.success("Collection updated");
    } else {
      toast.error("Failed to update collection");
    }
  };

  const handleDelete = async () => {
    if (!selectedCollection) return;
    const success = await deleteCollection(selectedCollection._id);
    if (success) {
      toast.success("Collection deleted");
      setShowDeleteModal(false);
      setSelectedCollection(null);
    } else {
      toast.error("Failed to delete collection");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#333333]">
          Bulk Buy Collections
        </h1>
        <p className="text-[#9E9E9E]">
          Create bundle deals that customers can purchase together at a discount.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#002B5B] text-white px-6 py-2 rounded-lg hover:bg-[#001a3d]"
        >
          Create Collection
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Your Collections
        </h3>
        {loading && collections.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002B5B]"></div>
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : collections.length === 0 ? (
          <div className="text-sm text-gray-600">
            No collections created yet.
          </div>
        ) : (
          <div className="space-y-4">
            {collections.map((collection) => (
              <div
                key={collection._id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">
                      {collection.name}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {collection.items
                        .map(
                          (item) =>
                            `${item.product.name} x${item.quantity}`
                        )
                        .join(" + ")}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Bundle price: EGP {collection.bundlePrice.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openViewModal(collection)}
                      className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700"
                    >
                      View
                    </button>
                    <button
                      onClick={() => openEditModal(collection)}
                      className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        handleToggleActive(collection._id, collection.isActive)
                      }
                      className={`text-xs px-3 py-1 rounded-full ${
                        collection.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {collection.isActive ? "Active" : "Inactive"}
                    </button>
                    <button
                      onClick={() => openDeleteModal(collection)}
                      className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Create Collection
              </h2>
              <p className="text-sm text-gray-600">
                Select products from your store and set a discounted bundle
                price.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Collection Name
                  </label>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Example: Camera Starter Kit"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formState.description}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={4}
                    placeholder="Describe what's included in this bundle"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bundle Price (EGP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formState.bundlePrice}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        bundlePrice: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter discounted price"
                  />
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between text-sm">
                    <span>Original total</span>
                    <span className="font-medium">
                      EGP {originalTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600 mt-2">
                    <span>Savings</span>
                    <span className="font-medium">
                      EGP{" "}
                      {Math.max(
                        originalTotal - Number(formState.bundlePrice || 0),
                        0
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Select Products
                </h3>
                <div className="grid grid-cols-1 gap-4 max-h-[420px] overflow-y-auto pr-2">
                  {products.map((product) => {
                    const isSelected = items[product._id] > 0;
                    return (
                      <div
                        key={product._id}
                        className={`border rounded-lg p-4 flex items-center gap-4 ${
                          isSelected ? "border-[#FFD600]" : "border-gray-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleProduct(product._id)}
                          className="h-4 w-4 text-blue-600"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            EGP {product.price.toFixed(2)} · Stock{" "}
                            {product.stock}
                          </p>
                        </div>
                        <input
                          type="number"
                          min="1"
                          disabled={!isSelected}
                          value={isSelected ? items[product._id] : ""}
                          onChange={(e) =>
                            handleQuantityChange(
                              product._id,
                              Number(e.target.value)
                            )
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                          placeholder="Qty"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                className="bg-[#002B5B] text-white px-6 py-2 rounded-lg hover:bg-[#001a3d]"
              >
                Create Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowViewModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedCollection.name}
              </h2>
              <p className="text-sm text-gray-600">
                {selectedCollection.description || "No description"}
              </p>
            </div>
            <div className="space-y-3">
              {selectedCollection.items.map((item: any, index: number) => (
                <div
                  key={`${selectedCollection._id}-${index}`}
                  className="bg-gray-50 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white">
                        <img
                          src={
                            item.product?.images?.[0]?.url || "/placeholder.png"
                          }
                          alt={item.product?.name || "Product"}
                          className="w-full h-full object-cover"
                         loading="lazy" decoding="async"/>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.product?.name || "Product"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Qty {item.quantity}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        toggleExpandedProduct(item.product?._id)
                      }
                      className="text-xs text-[#002B5B] hover:text-[#001a3d] flex items-center gap-1"
                    >
                      {expandedProductIds.includes(item.product?._id)
                        ? "Hide details"
                        : "View details"}
                        <span className="text-base">
                          {expandedProductIds.includes(item.product?._id)
                            ? "-"
                            : "+"}
                        </span>
                    </button>
                  </div>
                  {expandedProductIds.includes(item.product?._id) && (
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-600">
                      <div>
                        <span className="font-medium text-gray-700">
                          Price:
                        </span>{" "}
                        EGP {item.product?.price?.toFixed(2)}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Stock:
                        </span>{" "}
                        {item.product?.stock ?? "-"}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Sale:
                        </span>{" "}
                        {item.product?.saleActive
                          ? `${item.product?.salePercentage || 0}%`
                          : "No"}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          SKU:
                        </span>{" "}
                        {item.product?.sku || "-"}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-xs text-gray-500">Bundle price</p>
                <p className="text-lg font-semibold text-[#002B5B]">
                  EGP {selectedCollection.bundlePrice.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Edit Collection
              </h2>
              <p className="text-sm text-gray-600">
                Update bundle details and products.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Collection Name
                  </label>
                  <input
                    type="text"
                    value={editFormState.name}
                    onChange={(e) =>
                      setEditFormState((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editFormState.description}
                    onChange={(e) =>
                      setEditFormState((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bundle Price (EGP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editFormState.bundlePrice}
                    onChange={(e) =>
                      setEditFormState((prev) => ({
                        ...prev,
                        bundlePrice: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Update Products
                </h3>
                <div className="grid grid-cols-1 gap-4 max-h-[420px] overflow-y-auto pr-2">
                  {products.map((product) => {
                    const isSelected = editItems[product._id] > 0;
                    return (
                      <div
                        key={product._id}
                        className={`border rounded-lg p-4 flex items-center gap-4 ${
                          isSelected ? "border-[#FFD600]" : "border-gray-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            setEditItems((prev) => ({
                              ...prev,
                              [product._id]: prev[product._id] ? 0 : 1,
                            }))
                          }
                          className="h-4 w-4 text-blue-600"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            EGP {product.price.toFixed(2)} · Stock{" "}
                            {product.stock}
                          </p>
                        </div>
                        <input
                          type="number"
                          min="1"
                          disabled={!isSelected}
                          value={isSelected ? editItems[product._id] : ""}
                          onChange={(e) =>
                            setEditItems((prev) => ({
                              ...prev,
                              [product._id]: Math.max(
                                Number(e.target.value),
                                0
                              ),
                            }))
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                          placeholder="Qty"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditCollection}
                className="bg-[#002B5B] text-white px-6 py-2 rounded-lg hover:bg-[#001a3d]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Delete Collection
              </h2>
              <p className="text-sm text-gray-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold">
                  {selectedCollection.name}
                </span>
                ?
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorCollectionsPage;
