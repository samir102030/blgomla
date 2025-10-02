import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useUserStore } from "../stores/user.store";
import { useProductStore } from "../stores/product.store";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

interface CartItemWithProduct {
  _id?: string;
  product: string; // Product ID
  quantity: number;
  productDetails?: {
    _id: string;
    name: string;
    price: number;
    salePrice?: number;
    saleActive: boolean;
    images: Array<{ url: string; alt?: string }>;
  };
}

const ShoppingCartPage: React.FC = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);

  const user = useUserStore((state) => state.user);
  const fetchCart = useUserStore((state) => state.fetchCart);
  const updateCartItem = useProductStore((state) => state.updateCartItem);
  const removeFromCart = useProductStore((state) => state.removeFromCart);

  const [shippingInfo, setShippingInfo] = useState({
    country: "Bangladesh",
    city: "Dhaka",
    postcode: "",
  });

  const [couponCode, setCouponCode] = useState("");

  // Fetch cart and product details
  useEffect(() => {
    const loadCart = async () => {
      try {
        setLoading(true);
        await fetchCart();

        // Fetch product details for each cart item
        if (user?.cart) {
          const itemsWithDetails = await Promise.all(
            user.cart.map(async (item) => {
              try {
                // Fetch product details using axiosInstance
                const { data } = await axiosInstance.get(
                  `/products/${item.product}`
                );
                return {
                  ...item,
                  productDetails: data.data?.[0] || null,
                };
              } catch (error) {
                console.error("Error fetching product details:", error);
                return item;
              }
            })
          );
          setCartItems(itemsWithDetails);
        }
      } catch (error) {
        console.error("Error loading cart:", error);
        toast.error("Failed to load cart");
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, [fetchCart]); // Removed user?.cart from dependencies

  // Handle cart updates when user cart changes (but only after initial load)
  useEffect(() => {
    if (!loading && user?.cart) {
      const updateCartItems = async () => {
        const itemsWithDetails = await Promise.all(
          user.cart.map(async (item) => {
            try {
              const { data } = await axiosInstance.get(
                `/products/${item.product}`
              );
              return {
                ...item,
                productDetails: data.data?.[0] || null,
              };
            } catch (error) {
              console.error("Error fetching product details:", error);
              return item;
            }
          })
        );
        setCartItems(itemsWithDetails);
      };

      updateCartItems();
    }
  }, [user?.cart, loading]);

  const updateQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      setUpdatingItem(productId);
      await updateCartItem(productId, newQuantity);
      toast.success("Cart updated successfully");

      // Refresh cart data and update local state
      await fetchCart();
      // Update local cart items after successful update
      setCartItems((prevItems) =>
        prevItems.map((item) =>
          item.product === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Failed to update quantity");
    } finally {
      setUpdatingItem(null);
    }
  };

  const removeItem = async (productId: string) => {
    try {
      await removeFromCart(productId);
      toast.success("Item removed from cart");

      // Update local state immediately
      setCartItems((prevItems) =>
        prevItems.filter((item) => item.product !== productId)
      );
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item");
    }
  };

  const getItemPrice = (item: CartItemWithProduct) => {
    if (!item.productDetails) return 0;
    return item.productDetails.saleActive && item.productDetails.salePrice
      ? item.productDetails.salePrice
      : item.productDetails.price;
  };

  const getItemTotal = (item: CartItemWithProduct) => {
    return getItemPrice(item) * item.quantity;
  };

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + getItemTotal(item), 0);
  const shippingCost = 0.0;
  const grandTotal = subtotal + shippingCost;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002B5B] mx-auto mb-4"></div>
            <p className="text-[#9E9E9E]">Loading cart...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Please Login
            </h2>
            <p className="text-gray-600 mb-6">
              You need to be logged in to view your cart.
            </p>
            <Link
              to="/login"
              className="bg-[#FFD600] text-[#333333] px-6 py-3 rounded-md hover:bg-[#e6c100] font-medium"
            >
              Login
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Your Cart is Empty
            </h2>
            <p className="text-gray-600 mb-6">
              Add some products to your cart to get started.
            </p>
            <Link
              to="/brands"
              className="bg-[#FFD600] text-[#333333] px-6 py-3 rounded-md hover:bg-[#e6c100] font-medium"
            >
              Browse Products
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <div className="relative bg-gray-100 py-16">
        <div className="absolute inset-0">
          <img
            src="net1.jpeg"
            alt="Camera"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Shopping Cart
          </h1>
          <nav className="text-sm text-gray-600">
            <Link to="/" className="hover:text-gray-900">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span>Shopping Cart</span>
          </nav>
        </div>
        {/* Camera Image positioned on the right */}
        <div className="absolute right-0 top-0 h-full w-1/2 hidden lg:block">
          <img
            src="net2.jpeg"
            alt="Professional Camera"
            className="h-full w-full object-contain"
          />
        </div>
      </div>

      <main className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Cart Items Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                      Image
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                      Price
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                      Quantity
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                      Total
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">
                      Remove
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cartItems.map((item) => (
                    <tr key={item.product}>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleProductClick(item.product)}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={
                              item.productDetails?.images?.[0]?.url ||
                              "/placeholder.png"
                            }
                            alt={item.productDetails?.name || "Product"}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {item.productDetails?.name ||
                            "Product Name Not Available"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          ${getItemPrice(item).toFixed(2)}
                          {item.productDetails?.saleActive && (
                            <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                              Sale
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <button
                            onClick={() =>
                              updateQuantity(item.product, item.quantity - 1)
                            }
                            disabled={updatingItem === item.product}
                            className="px-2 py-1 border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50"
                          >
                            -
                          </button>
                          <span className="px-4 py-1 border-t border-b border-gray-300 bg-white">
                            {updatingItem === item.product
                              ? "..."
                              : item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.product, item.quantity + 1)
                            }
                            disabled={updatingItem === item.product}
                            className="px-2 py-1 border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          ${getItemTotal(item).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => removeItem(item.product)}
                          disabled={updatingItem === item.product}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Shipping & Coupon */}
            <div className="space-y-6">
              {/* Calculate Shipping */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Calculate Shipping
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <select
                    value={shippingInfo.country}
                    onChange={(e) =>
                      setShippingInfo({
                        ...shippingInfo,
                        country: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Bangladesh">Bangladesh</option>
                    <option value="India">India</option>
                    <option value="Pakistan">Pakistan</option>
                  </select>
                  <select
                    value={shippingInfo.city}
                    onChange={(e) =>
                      setShippingInfo({ ...shippingInfo, city: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Dhaka">Dhaka</option>
                    <option value="Chittagong">Chittagong</option>
                    <option value="Sylhet">Sylhet</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Postcode / Zip"
                  value={shippingInfo.postcode}
                  onChange={(e) =>
                    setShippingInfo({
                      ...shippingInfo,
                      postcode: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                />
                <button className="w-full bg-[#002B5B] text-white py-2 px-4 rounded-lg hover:bg-[#001a3d] transition-colors">
                  ESTIMATE
                </button>
              </div>

              {/* Discount Coupon */}
              <div className="bg-[#FAFAFA] p-6 rounded-lg shadow-sm border border-[#9E9E9E]/20">
                <h3 className="text-lg font-semibold text-[#333333] mb-4">
                  Discount Coupon Code
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon Code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 px-3 py-2 border border-[#9E9E9E]/30 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                  />
                  <button className="bg-[#D32F2F] text-white px-6 py-2 rounded-lg hover:bg-[#b71c1c] transition-colors">
                    APPLY CODE
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Cart Summary */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Cart Summary
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sub Total</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping Cost</span>
                  <span className="font-medium">
                    ${shippingCost.toFixed(2)}
                  </span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Grand Total</span>
                    <span>${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  to="/checkout"
                  className="w-full bg-[#FFD600] text-[#333333] py-3 px-6 rounded-lg font-medium hover:bg-[#e6c100] transition-colors text-center block"
                >
                  CHECKOUT
                </Link>
                <button
                  onClick={() => fetchCart()}
                  className="w-full bg-[#9E9E9E]/20 text-[#333333] py-3 px-6 rounded-lg font-medium hover:bg-[#9E9E9E]/30 transition-colors"
                >
                  UPDATE CART
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ShoppingCartPage;
