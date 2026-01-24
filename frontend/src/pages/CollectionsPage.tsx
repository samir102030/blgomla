import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCollectionStore } from "../stores/collection.store";
import { useUserStore } from "../stores/user.store";
import toast from "react-hot-toast";

const CollectionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { collections, loading, error, fetchCollections, addCollectionToCart } =
    useCollectionStore();
  const fetchCart = useUserStore((state) => state.fetchCart);

  useEffect(() => {
    fetchCollections({ activeOnly: true });
  }, [fetchCollections]);

  const getCollectionOriginalTotal = (collection: any) => {
    return collection.items.reduce((sum: number, item: any) => {
      const product = item.product;
      const unitPrice = product.saleActive
        ? product.price * (1 - product.salePercentage / 100)
        : product.price;
      return sum + unitPrice * item.quantity;
    }, 0);
  };

  const handleAddToCart = async (collectionId: string) => {
    const success = await addCollectionToCart(collectionId, 1);
    if (success) {
      await fetchCart();
      toast.success(t("collections.addedToCart"));
    } else {
      toast.error(t("collections.failedToAdd"));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="relative bg-gradient-to-r from-[#002B5B] to-[#004080] py-16">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1920&q=80"
            alt="Collections"
            className="w-full h-full object-cover opacity-30"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t("collections.title")}
          </h1>
          <p className="text-sm sm:text-base text-gray-100 max-w-2xl">
            {t("collections.subtitle")}
          </p>
        </div>
      </div>

      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading && collections.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002B5B]"></div>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => fetchCollections({ activeOnly: true })}
                className="bg-[#002B5B] text-white px-4 py-2 rounded-lg hover:bg-[#001a3d]"
              >
                Try Again
              </button>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-16">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                {t("collections.noCollections")}
              </h2>
              <p className="text-gray-600 mb-6">{t("collections.checkBack")}</p>
              <Link
                to="/products"
                className="bg-[#FFD600] text-[#333333] px-6 py-3 rounded-md hover:bg-[#e6c100] font-medium"
              >
                {t("collections.browseProducts")}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {collections.map((collection) => {
                const originalTotal = getCollectionOriginalTotal(collection);
                const savings = Math.max(
                  originalTotal - collection.bundlePrice,
                  0,
                );
                return (
                  <div
                    key={collection._id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            {collection.name}
                          </h3>
                          {collection.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {collection.description}
                            </p>
                          )}
                        </div>
                        <div className="ltr:text-right rtl:text-left">
                          <p className="text-xs uppercase text-gray-500">
                            {t("collections.bundlePrice")}
                          </p>
                          <p className="text-2xl font-bold text-[#002B5B]">
                            EGP {collection.bundlePrice.toFixed(2)}
                          </p>
                          <p className="text-xs text-green-600">
                            {t("collections.save")} EGP {savings.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {collection.items.map((item: any, index: number) => (
                          <div
                            key={`${collection._id}-${index}`}
                            className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white">
                                <img
                                  src={
                                    item.product?.images?.[0]?.url ||
                                    "/placeholder.png"
                                  }
                                  alt={item.product?.name || "Product"}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {item.product?.name || "Product"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {t("collections.qty")} {item.quantity}
                                </p>
                              </div>
                            </div>
                            <div className="text-xs text-gray-600">
                              EGP {item.product?.price?.toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div>
                          <p className="text-xs text-gray-500">
                            {t("collections.originalTotal")}
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            EGP {originalTotal.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/collections/${collection._id}`}
                            className="text-sm font-medium text-[#002B5B] hover:text-[#001a3d]"
                          >
                            {t("collections.viewDetails")}
                          </Link>
                          <button
                            onClick={() => handleAddToCart(collection._id)}
                            className="bg-[#FFD600] text-[#333333] px-4 py-2 rounded-lg font-medium hover:bg-[#e6c100]"
                          >
                            {t("collections.addBundleToCart")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CollectionsPage;
