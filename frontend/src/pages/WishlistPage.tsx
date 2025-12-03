import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useUserStore } from "../stores/user.store";
import type { Product } from "../types/product.type";
import PleaseLogin from "../components/PleaseLogin";

const WishlistPage: React.FC = () => {
  const {
    getLovedProducts,
    toggleLoveProduct,
    loading: userLoading,
  } = useUserStore();
  const user = useUserStore((state) => state.user);
  const [lovedProducts, setLovedProducts] = useState<Product[]>([]);

  useEffect(() => {
    getLovedProducts();
  }, [getLovedProducts]);

  useEffect(() => {
    if (user) {
      setLovedProducts(user.love);
    }
  }, [user]);

  // const handleClearWishlist = async () => {
  //   try {
  //     for (const product of lovedProducts) {
  //       if (product._id) {
  //         await toggleLoveProduct(product._id);
  //       }
  //     }
  //     setLovedProducts([]);
  //   } catch (error) {
  //     console.error("Error clearing wishlist:", error);
  //   }
  // };

  const handleToggleLove = async (productId: string) => {
    try {
      await toggleLoveProduct(productId);
      setLovedProducts((prev) => prev.filter((item) => item._id !== productId));
    } catch (error) {
      console.error("Error toggling love:", error);
    }
  };

  const isLoading = userLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <div className="relative bg-gray-100 py-8 sm:py-12 lg:py-16">
        <div className="absolute inset-0">
          <img
            src="net3.jpeg"
            alt="Camera"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">Wishlist</h1>
          <nav className="text-xs sm:text-sm text-gray-600">
            <Link to="/" className="hover:text-gray-900">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span>Wishlist</span>
          </nav>
        </div>
        {/* Camera Image positioned on the right */}
        <div className="absolute right-0 top-0 h-full w-1/2 hidden lg:block">
          <img
            src="net3.jpeg"
            alt="Professional Camera"
            className="h-full w-full object-contain"
          />
        </div>
      </div>

      <main className="py-8 sm:py-10 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!user ? (
            <PleaseLogin />
          ) : isLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your wishlist...</p>
            </div>
          ) : lovedProducts.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <div className="text-gray-400 text-5xl sm:text-6xl mb-4">💝</div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                Your Wishlist is Empty
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                Add some products to your wishlist to see them here.
              </p>
              <Link
                to="/brands"
                className="bg-black text-white px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-lg hover:bg-gray-800 transition-colors inline-block"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Desktop view - table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-900">
                        Image
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-900">
                        Product
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-900">
                        Price
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-900">
                        Remove
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {lovedProducts.map((item) => (
                      <tr key={item._id}>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <Link to={`/product/${item._id}`}>
                            <img
                              src={item.images?.[0]?.url || "net3.jpeg"}
                              alt={item.name}
                              className="w-12 sm:w-16 h-12 sm:h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          </Link>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <Link to={`/product/${item._id}`}>
                            <div className="text-xs sm:text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
                              {item.name}
                            </div>
                          </Link>
                          <div className="text-xs text-gray-500 hidden sm:block">
                            {item.description}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {item.saleActive && item.salePrice ? (
                              <div>
                                <span className="line-through text-gray-400">
                                  ${item.price}
                                </span>
                                <span className="ml-2 font-bold text-red-600">
                                  ${item.salePrice}
                                </span>
                              </div>
                            ) : (
                              `$${item.price}`
                            )}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                          <button
                            onClick={() => handleToggleLove(item._id!)}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                            disabled={isLoading}
                          >
                            <svg
                              className="w-4 sm:w-5 h-4 sm:h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile view - cards */}
              <div className="md:hidden space-y-3">
                {lovedProducts.map((item) => (
                  <div key={item._id} className="border border-gray-200 rounded-lg p-3 space-y-3">
                    <div className="flex gap-3">
                      <Link to={`/product/${item._id}`}>
                        <img
                          src={item.images?.[0]?.url || "net3.jpeg"}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/product/${item._id}`}>
                          <div className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors cursor-pointer line-clamp-2">
                            {item.name}
                          </div>
                        </Link>
                        <div className="text-xs text-gray-500 line-clamp-1 mt-1">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-900 font-medium">
                        {item.saleActive && item.salePrice ? (
                          <div>
                            <span className="line-through text-gray-400 text-xs">
                              ${item.price}
                            </span>
                            <span className="ml-2 font-bold text-red-600">
                              ${item.salePrice}
                            </span>
                          </div>
                        ) : (
                          `$${item.price}`
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleLove(item._id!)}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50 p-2"
                        disabled={isLoading}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              {/* <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
                <Link
                  to="/brands"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  ← Continue Shopping
                </Link>
                <div className="space-x-4">
                  <button
                    onClick={handleClearWishlist}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                    disabled={isLoading}
                  >
                    Clear Wishlist
                  </button>
                </div>
              </div> */}
            </div>
          )}

          {/* Related Products or Recommendations */}
          {/* {user && lovedProducts.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">
                You Might Also Like
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg shadow-sm overflow-hidden group hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square bg-gray-100">
                      <img
                        src={`/p1.jpeg?random=${i}`}
                        alt={`Recommended Product ${i}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 mb-2">
                        Camera Model {i}
                      </h3>
                      <p className="text-lg font-bold text-gray-900">
                        ${(199 + i * 50).toFixed(2)}
                      </p>
                      <button className="w-full mt-3 bg-black text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                        Add to Wishlist
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )} */}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WishlistPage;
