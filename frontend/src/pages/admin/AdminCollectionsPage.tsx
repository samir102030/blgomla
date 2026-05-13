import React, { useEffect, useMemo, useState } from "react";
import { useCollectionStore } from "../../stores/collection.store";
import { axiosInstance } from "../../lib/axios";
import toast from "react-hot-toast";
import { useUserStore } from "../../stores/user.store";

interface Product {
  _id: string;
  name: string;
  price: number;
  saleActive: boolean;
  salePercentage: number;
  stock: number;
  images: Array<{ url: string }>;
  store: { _id: string; name: string };
}

const AdminCollectionsPage: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const {
    collections,
    loading,
    error,
    fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,
  } = useCollectionStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    bundlePrice: "",
  });
  const [items, setItems] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Check if user has admin access
  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You are not authorized to access this page.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { data } = await axiosInstance.get("/products", {
          params: {
            isActive: true,
            deleted: false,
            limit: 500,
          },
        });
        setProducts(data.products || []);
      } catch (error) {
        console.error("Failed to load products:", error);
      }
    };
    loadProducts();
  }, []);

  const selectedProducts = useMemo(() => {
    return products.filter((product) => items[product._id] > 0);
  }, [products, items]);

  const totalOriginalPrice = useMemo(() => {
    return selectedProducts.reduce((sum, product) => {
      const unitPrice = product.saleActive
        ? product.price * (1 - product.salePercentage / 100)
        : product.price;
      return sum + unitPrice * items[product._id];
    }, 0);
  }, [selectedProducts, items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const collectionItems = Object.entries(items)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({ product: productId, quantity }));

    if (collectionItems.length === 0) {
      toast.error("Please add at least one product to the collection");
      return;
    }

    const bundlePrice = parseFloat(formState.bundlePrice);
    if (isNaN(bundlePrice) || bundlePrice <= 0) {
      toast.error("Please enter a valid bundle price");
      return;
    }

    const data = {
      name: formState.name.trim(),
      description: formState.description.trim(),
      bundlePrice,
      items: collectionItems,
    };

    let success = false;
    if (editingId) {
      success = !!(await updateCollection(editingId, data as any));
    } else {
      success = !!(await createCollection(data));
    }

    if (success) {
      setFormState({ name: "", description: "", bundlePrice: "" });
      setItems({});
      setEditingId(null);
      setShowForm(false);
      toast.success(
        editingId
          ? "Collection updated successfully"
          : "Collection created successfully",
      );
    } else {
      toast.error(
        editingId
          ? "Failed to update collection"
          : "Failed to create collection",
      );
    }
  };

  const handleEdit = (collection: any) => {
    setFormState({
      name: collection.name,
      description: collection.description || "",
      bundlePrice: collection.bundlePrice.toString(),
    });
    const newItems: Record<string, number> = {};
    collection.items.forEach((item: any) => {
      newItems[item.product._id] = item.quantity;
    });
    setItems(newItems);
    setEditingId(collection._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this collection?")) {
      const success = await deleteCollection(id);
      if (success) {
        toast.success("Collection deleted successfully");
      } else {
        toast.error("Failed to delete collection");
      }
    }
  };

  const handleCancel = () => {
    setFormState({ name: "", description: "", bundlePrice: "" });
    setItems({});
    setEditingId(null);
    setShowForm(false);
  };

  if (loading && collections.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002B5B] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading collections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">
            Collections Management
          </h1>
          <p className="text-[#9E9E9E]">
            Create and manage product collections
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#002B5B] text-white px-4 py-2 rounded-lg hover:bg-[#001a3d] transition-colors"
        >
          Create Collection
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Collection" : "Create New Collection"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Collection Name
              </label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) =>
                  setFormState({ ...formState, name: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formState.description}
                onChange={(e) =>
                  setFormState({ ...formState, description: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bundle Price
              </label>
              <input
                type="number"
                step="0.01"
                value={formState.bundlePrice}
                onChange={(e) =>
                  setFormState({ ...formState, bundlePrice: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#002B5B]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Products
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                {products.map((product) => (
                  <div
                    key={product._id}
                    className="border border-gray-200 rounded-lg p-3 flex items-center space-x-3"
                  >
                    <img
                      src={product.images[0]?.url || "/placeholder.png"}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-gray-500">
                        {product.store.name}
                      </p>
                      <p className="text-xs text-gray-600">${product.price}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={items[product._id] || 0}
                      onChange={(e) =>
                        setItems({
                          ...items,
                          [product._id]: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {selectedProducts.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Selected Products</h3>
                <div className="space-y-2">
                  {selectedProducts.map((product) => (
                    <div
                      key={product._id}
                      className="flex justify-between text-sm"
                    >
                      <span>
                        {product.name} x{items[product._id]}
                      </span>
                      <span>
                        $
                        {(
                          (product.saleActive
                            ? product.price * (1 - product.salePercentage / 100)
                            : product.price) * items[product._id]
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>
                      Total Original: ${totalOriginalPrice.toFixed(2)}
                    </span>
                    <span>
                      Bundle: $
                      {parseFloat(formState.bundlePrice || "0").toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-[#002B5B] text-white px-4 py-2 rounded-lg hover:bg-[#001a3d] transition-colors"
              >
                {editingId ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bundle Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Store
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {collections.map((collection) => (
                <tr key={collection._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {collection.name}
                      </div>
                      {collection.description && (
                        <div className="text-sm text-gray-500">
                          {collection.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {collection.items.length} products
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${collection.bundlePrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {typeof collection.store === "string"
                      ? "N/A"
                      : collection.store?.name || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(collection)}
                      className="text-[var(--brand-primary)] hover:text-[var(--brand-accent)]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(collection._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCollectionsPage;
