import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { axiosInstance } from "../lib/axios";
import { useCollectionStore } from "../stores/collection.store";
import { useUserStore } from "../stores/user.store";
import toast from "react-hot-toast";

const CollectionDetailPage: React.FC = () => {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const addCollectionToCart = useCollectionStore(
    (state) => state.addCollectionToCart
  );
  const fetchCart = useUserStore((state) => state.fetchCart);

  useEffect(() => {
    const loadCollection = async () => {
      if (!collectionId) return;
      try {
        setLoading(true);
        const { data } = await axiosInstance.get(`/collections/${collectionId}`);
        setCollection(data.collection);
        setError(null);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load collection");
      } finally {
        setLoading(false);
      }
    };

    loadCollection();
  }, [collectionId]);

  const getOriginalTotal = () => {
    if (!collection) return 0;
    return collection.items.reduce((sum: number, item: any) => {
      const product = item.product;
      const unitPrice = product.saleActive
        ? product.price * (1 - product.salePercentage / 100)
        : product.price;
      return sum + unitPrice * item.quantity;
    }, 0);
  };

  const handleAddToCart = async () => {
    if (!collectionId) return;
    const success = await addCollectionToCart(collectionId, 1);
    if (success) {
      await fetchCart();
      toast.success("Collection added to cart");
      navigate("/cart");
    } else {
      toast.error("Failed to add collection to cart");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002B5B]"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Collection Not Found
            </h2>
            <p className="text-gray-600 mb-6">
              {error || "The collection you're looking for doesn't exist."}
            </p>
            <Link
              to="/collections"
              className="bg-[#FFD600] text-[#333333] px-6 py-3 rounded-md hover:bg-[#e6c100] font-medium"
            >
              Browse Collections
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const originalTotal = getOriginalTotal();
  const savings = Math.max(originalTotal - collection.bundlePrice, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="relative bg-gray-100 py-12">
        <div className="absolute inset-0">
          <img
            src="net2.jpeg"
            alt="Collection"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {collection.name}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl">
            {collection.description || "Bundle deal"}
          </p>
        </div>
      </div>

      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {collection.items.map((item: any, index: number) => (
                <div
                  key={`${collection._id}-${index}`}
                  className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-50">
                      <img
                        src={
                          item.product?.images?.[0]?.url || "/placeholder.png"
                        }
                        alt={item.product?.name || "Product"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <Link
                        to={`/product/${item.product?._id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-[#002B5B]"
                      >
                        {item.product?.name || "Product"}
                      </Link>
                      <p className="text-xs text-gray-500">
                        Quantity: {item.quantity}
                      </p>
                      <p className="text-xs text-gray-500">
                        Price: EGP {item.product?.price?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/product/${item.product?._id}`}
                    className="text-xs font-medium text-[#002B5B] hover:text-[#001a3d]"
                  >
                    View Product
                  </Link>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4 h-fit">
              <div>
                <p className="text-xs uppercase text-gray-500">Bundle price</p>
                <p className="text-2xl font-bold text-[#002B5B]">
                  EGP {collection.bundlePrice.toFixed(2)}
                </p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Original total</span>
                <span className="font-medium">
                  EGP {originalTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Savings</span>
                <span className="font-medium">EGP {savings.toFixed(2)}</span>
              </div>
              <button
                onClick={handleAddToCart}
                className="w-full bg-[#FFD600] text-[#333333] px-4 py-2 rounded-lg font-medium hover:bg-[#e6c100]"
              >
                Add Bundle to Cart
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CollectionDetailPage;
