import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useUserStore } from "../stores/user.store";
import { useProductStore } from "../stores/product.store";
import { useCouponStore } from "../stores/coupon.store";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import PleaseLogin from "../components/PleaseLogin";
import type { Coupon } from "../types/coupon.type";
// import LoadingComp from "../components/LoadingComp";

interface CartItemWithProduct {
  _id?: string;
  product: string; // Product ID
  quantity: number;
  productDetails?: {
    _id: string;
    name: string;
    price: number;
    stock: number;
    salePercentage: number;
    saleActive: boolean;
    images: Array<{ url: string; alt?: string }>;
  };
}

const ShoppingCartPage: React.FC = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);

  const user = useUserStore((state) => state.user);
  const fetchCart = useUserStore((state) => state.fetchCart);
  const updateCartItem = useProductStore((state) => state.updateCartItem);
  const removeFromCart = useProductStore((state) => state.removeFromCart);

  const {
    validateCoupon,
    removeCoupon,
    appliedCoupon,
    loading: couponLoading,
  } = useCouponStore();

  const [shippingInfo, setShippingInfo] = useState({
    country: "Egypt",
    city: "Cairo",
    postcode: "",
  });

  const [couponCode, setCouponCode] = useState("");

  // Handle cart updates when user cart changes (but only after initial load)
  useEffect(() => {
    if (user?.cart) {
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
  }, [user?.cart]);

  const updateQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    // Find the item to check stock
    const item = cartItems.find((item) => item.product === productId);
    if (!item || !item.productDetails) {
      toast.error(
        "Product Error: Item details not available. Please refresh the page"
      );
      return;
    }

    // Check if trying to add more than available stock
    if (newQuantity > item.productDetails.stock) {
      toast.error(
        `Stock Error: Only ${item.productDetails.stock} ${
          item.productDetails.stock === 1 ? "item" : "items"
        } available for ${item.productDetails.name}. Please adjust quantity`
      );
      return;
    }

    // If stock is 0, remove the item
    if (item.productDetails.stock === 0) {
      await removeItem(item._id || productId);
      toast.error(
        `Stock Error: ${item.productDetails.name} is out of stock and has been removed from your cart`
      );
      return;
    }

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
    } catch (error: any) {
      console.error("Error updating quantity:", error);
      const errorMessage =
        error?.response?.data?.message || "Failed to update cart";
      toast.error(`Cart Update Error: ${errorMessage}. Please try again`);
    } finally {
      setUpdatingItem(null);
    }
  };

  const removeItem = useCallback(
    async (cartItemId: string) => {
      try {
        await removeFromCart(cartItemId);
        toast.success("Item removed from cart");

        // Refresh cart data from user store
        await fetchCart();

        // Update local state immediately
        setCartItems((prevItems) =>
          prevItems.filter((item) => item.product !== cartItemId)
        );
      } catch (error: any) {
        console.error("Error removing item:", error);
        const errorMessage =
          error?.response?.data?.message || "Failed to remove item";
        toast.error(`Remove Item Error: ${errorMessage}. Please try again`);
      }
    },
    [removeFromCart, fetchCart]
  );

  // Check for out-of-stock items and remove them automatically
  useEffect(() => {
    const checkOutOfStockItems = async () => {
      const outOfStockItems = cartItems.filter(
        (item) => item.productDetails && item.productDetails.stock === 0
      );

      for (const item of outOfStockItems) {
        try {
          await removeItem(item.product);
          toast.error(
            `Stock Error: ${item.productDetails?.name} is out of stock and has been removed from your cart`
          );
        } catch (error) {
          console.error("Error removing out-of-stock item:", error);
          toast.error(
            `Stock Error: Failed to remove out-of-stock item ${item.productDetails?.name}. Please remove it manually`
          );
        }
      }
    };

    if (cartItems.length > 0) {
      checkOutOfStockItems();
    }
  }, [cartItems, removeItem]);

  const getItemPrice = (item: CartItemWithProduct) => {
    if (!item.productDetails) return 0;
    return item.productDetails.saleActive
      ? item.productDetails.price *
          (1 - item.productDetails.salePercentage / 100)
      : item.productDetails.price;
  };

  const getItemTotal = (item: CartItemWithProduct) => {
    return getItemPrice(item) * item.quantity;
  };

  const handleCheckout = () => {
    // Validate cart is not empty
    if (cartItems.length === 0) {
      toast.error(
        "Cart Error: Your cart is empty. Please add items before proceeding to checkout"
      );
      return;
    }

    // Check if all items have valid product details
    const invalidItems = cartItems.filter((item) => !item.productDetails);
    if (invalidItems.length > 0) {
      const invalidCount = invalidItems.length;
      toast.error(
        `Product Error: ${invalidCount} item${
          invalidCount > 1 ? "s" : ""
        } in your cart ${
          invalidCount > 1 ? "are" : "is"
        } no longer available. Please remove ${
          invalidCount > 1 ? "them" : "it"
        } and try again`
      );
      return;
    }

    // Check stock availability
    const outOfStockItems = cartItems.filter(
      (item) => item.productDetails && item.productDetails.stock < item.quantity
    );
    if (outOfStockItems.length > 0) {
      const itemNames = outOfStockItems
        .map((item) => item.productDetails?.name || "Unknown Product")
        .join(", ");
      const totalOutOfStock = outOfStockItems.length;
      toast.error(
        `Stock Error: ${totalOutOfStock} item${
          totalOutOfStock > 1 ? "s" : ""
        } (${itemNames}) ${
          totalOutOfStock > 1 ? "have" : "has"
        } insufficient stock. Please adjust quantities or remove items`
      );
      return;
    }

    // Navigate to checkout
    navigate("/checkout");
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    try {
      // Validate coupon with current cart
      const validation = await validateCoupon(
        couponCode.trim(),
        subtotal,
        cartItems
      );

      if (!validation?.success) {
        toast.error(validation?.message || "Invalid coupon code");
        return;
      }

      // Apply the coupon by storing it in the coupon store
      // The validation response now includes the full coupon data
      if (!validation.coupon) {
        toast.error("Failed to apply coupon");
        return;
      }

      const couponData: Coupon = {
        _id: validation.coupon._id,
        code: validation.coupon.code,
        discountType: validation.coupon.discountType as "percentage" | "fixed",
        discountValue: validation.coupon.discountValue,
        // Use actual data from validation response
        description: validation.coupon.description || "",
        minimumPurchase: validation.coupon.minimumPurchase || 0,
        maximumDiscount: validation.coupon.maximumDiscount,
        startDate: validation.coupon.startDate,
        endDate: validation.coupon.endDate,
        usageLimit: validation.coupon.usageLimit,
        usageCount: validation.coupon.usageCount || 0,
        isActive: validation.coupon.isActive,
        applicableProducts: validation.coupon.applicableProducts || [],
        applicableCategories: validation.coupon.applicableCategories || [],
        store: validation.coupon.store,
        createdBy: validation.coupon.createdBy,
        createdAt: validation.coupon.createdAt,
        updatedAt: validation.coupon.updatedAt,
      };

      // Set the applied coupon in the store
      useCouponStore.setState({ appliedCoupon: couponData });

      toast.success("Coupon applied successfully!");
      setCouponCode(""); // Clear the input
    } catch (error: any) {
      console.error("Error applying coupon:", error);
      toast.error(error?.response?.data?.message || "Failed to apply coupon");
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    toast.success("Coupon removed");
  };

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + getItemTotal(item), 0);
  const shippingCost = 0.0;

  // Calculate coupon discount
  const calculateCouponDiscount = () => {
    if (!appliedCoupon || !appliedCoupon.discountValue) return 0;

    if (appliedCoupon.discountType === "percentage") {
      const discount = subtotal * (appliedCoupon.discountValue / 100);
      return appliedCoupon.maximumDiscount
        ? Math.min(discount, appliedCoupon.maximumDiscount)
        : discount;
    } else {
      return appliedCoupon.discountValue;
    }
  };

  const couponDiscount = calculateCouponDiscount();
  const grandTotal = subtotal + shippingCost - couponDiscount;

  // if (loading)
  //   return (
  //     <div className="min-h-screen bg-[#FAFAFA]">
  //       <Header />
  //       <LoadingComp />
  //       <Footer />
  //     </div>
  //   );

  if (!user) return <PleaseLogin />;

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
                          {item.productDetails?.saleActive ? (
                            <div className="flex flex-col">
                              <span className="line-through text-gray-500">
                                ${item.productDetails.price.toFixed(2)}
                              </span>
                              <span className="font-medium text-red-600">
                                ${getItemPrice(item).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span>${getItemPrice(item).toFixed(2)}</span>
                          )}
                          {item.productDetails?.saleActive && (
                            <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                              Sale {item.productDetails.salePercentage}%
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
                    <option value="Egypt">Egypt</option>
                  </select>
                  <select
                    value={shippingInfo.city}
                    onChange={(e) =>
                      setShippingInfo({ ...shippingInfo, city: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Cairo">Cairo</option>
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

                {appliedCoupon ? (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Coupon Applied: {appliedCoupon.code}
                        </p>
                        <p className="text-xs text-green-600">
                          {appliedCoupon.discountType === "percentage"
                            ? `${appliedCoupon.discountValue}% off`
                            : `$${appliedCoupon.discountValue} off`}
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-red-600 hover:text-red-800 text-sm underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Coupon Code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 px-3 py-2 border border-[#9E9E9E]/30 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent"
                      disabled={couponLoading}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="bg-[#D32F2F] text-white px-6 py-2 rounded-lg hover:bg-[#b71c1c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {couponLoading ? "APPLYING..." : "APPLY CODE"}
                    </button>
                  </div>
                )}
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
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon Discount ({appliedCoupon?.code})</span>
                    <span className="font-medium">
                      -${couponDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Grand Total</span>
                    <span>${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleCheckout}
                  className="w-full bg-[#FFD600] text-[#333333] py-3 px-6 rounded-lg font-medium hover:bg-[#e6c100] transition-colors text-center"
                >
                  CHECKOUT
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
