import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useUserStore } from "../stores/user.store";
import { useProductStore } from "../stores/product.store";
import { useCouponStore } from "../stores/coupon.store";
import { useCollectionStore } from "../stores/collection.store";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import PleaseLogin from "../components/PleaseLogin";
import type { Coupon } from "../types/coupon.type";
import type { Collection } from "../types/collection.type";
import { useTranslation } from "react-i18next";
import { getBaseUnitPrice, getBulkPricing } from "../lib/pricing";
// import LoadingComp from "../components/LoadingComp";

interface CartItemWithProduct {
  _id?: string;
  type?: "product" | "collection";
  product?: string; // Product ID
  collection?: string; // Collection ID
  quantity: number;
  productDetails?: {
    _id: string;
    name: string;
    price: number;
    stock: number;
    salePercentage: number;
    saleActive: boolean;
    bulkPricing?: Array<{ minQty: number; unitPrice: number }>;
    images: Array<{ url: string; alt?: string }>;
  };
  collectionDetails?: Collection;
}

const ShoppingCartPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);

  const user = useUserStore((state) => state.user);
  const fetchCart = useUserStore((state) => state.fetchCart);
  const updateCartItem = useProductStore((state) => state.updateCartItem);
  const removeFromCart = useProductStore((state) => state.removeFromCart);
  const updateCollectionCart = useCollectionStore(
    (state) => state.updateCollectionCart
  );
  const removeCollectionFromCart = useCollectionStore(
    (state) => state.removeCollectionFromCart
  );

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
        const itemsWithDetails = await Promise.all<CartItemWithProduct>(
          user.cart.map(async (item): Promise<CartItemWithProduct> => {
            const isCollection =
              item.type === "collection" || Boolean(item.collection);
            try {
              if (isCollection) {
                const { data } = await axiosInstance.get(
                  `/collections/${item.collection}`
                );
                return {
                  ...item,
                  type: "collection",
                  collectionDetails: data.collection ?? undefined,
                };
              }

              const { data } = await axiosInstance.get(
                `/products/${item.product}`
              );
              return {
                ...item,
                type: "product",
                productDetails: data.data?.[0] ?? undefined,
              };
            } catch (error) {
              console.error("Error fetching cart item details:", error);
              return {
                ...item,
                type: isCollection ? "collection" : "product",
              };
            }
          })
        );
        setCartItems(itemsWithDetails);
      };

      updateCartItems();
    }
  }, [user?.cart]);

  const updateQuantity = async (
    itemId: string,
    newQuantity: number,
    itemType: "product" | "collection"
  ) => {
    if (newQuantity < 1) return;

    const item = cartItems.find((item) =>
      itemType === "collection"
        ? item.collection === itemId
        : item.product === itemId
    );
    if (!item) {
      toast.error("Product Error: Item details not available. Please refresh");
      return;
    }

    if (itemType === "collection") {
      if (!item.collectionDetails) {
        toast.error(
          "Collection Error: Details not available. Please refresh the page"
        );
        return;
      }

      const outOfStock = item.collectionDetails.items.find((bundleItem) => {
        const requiredQty = bundleItem.quantity * newQuantity;
        return bundleItem.product.stock < requiredQty;
      });
      if (outOfStock) {
        toast.error(
          `Stock Error: ${outOfStock.product.name} does not have enough stock for this bundle`
        );
        return;
      }
    } else {
      if (!item.productDetails) {
        toast.error(
          "Product Error: Item details not available. Please refresh the page"
        );
        return;
      }

      if (newQuantity > item.productDetails.stock) {
        toast.error(
          `Stock Error: Only ${item.productDetails.stock} ${
            item.productDetails.stock === 1 ? "item" : "items"
          } available for ${item.productDetails.name}. Please adjust quantity`
        );
        return;
      }

      if (item.productDetails.stock === 0) {
        await removeItem(itemId, "product");
        toast.error(
          `Stock Error: ${item.productDetails.name} is out of stock and has been removed from your cart`
        );
        return;
      }
    }

    try {
      setUpdatingItem(itemId);
      if (itemType === "collection") {
        await updateCollectionCart(itemId, newQuantity);
      } else {
        await updateCartItem(itemId, newQuantity);
      }
      toast.success("Cart updated successfully");

      // Refresh cart data and update local state
      await fetchCart();
      // Update local cart items after successful update
      setCartItems((prevItems) =>
        prevItems.map((item) => {
          if (itemType === "collection") {
            return item.collection === itemId
              ? { ...item, quantity: newQuantity }
              : item;
          }
          return item.product === itemId
            ? { ...item, quantity: newQuantity }
            : item;
        })
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
    async (cartItemId: string, itemType: "product" | "collection") => {
      try {
        if (itemType === "collection") {
          await removeCollectionFromCart(cartItemId);
        } else {
          await removeFromCart(cartItemId);
        }
        toast.success("Item removed from cart");

        // Refresh cart data from user store
        await fetchCart();

        // Update local state immediately
        setCartItems((prevItems) =>
          prevItems.filter((item) =>
            itemType === "collection"
              ? item.collection !== cartItemId
              : item.product !== cartItemId
          )
        );
      } catch (error: any) {
        console.error("Error removing item:", error);
        const errorMessage =
          error?.response?.data?.message || "Failed to remove item";
        toast.error(`Remove Item Error: ${errorMessage}. Please try again`);
      }
    },
    [removeFromCart, removeCollectionFromCart, fetchCart]
  );

  // Check for out-of-stock items and remove them automatically
  useEffect(() => {
    const checkOutOfStockItems = async () => {
    const outOfStockItems = cartItems.filter((item) => {
      if (item.type === "collection" && item.collectionDetails) {
        return item.collectionDetails.items.some(
          (bundleItem) => bundleItem.product.stock === 0
        );
      }
      return item.productDetails && item.productDetails.stock === 0;
    });

    for (const item of outOfStockItems) {
      try {
        if (item.type === "collection") {
          await removeItem(item.collection || "", "collection");
          toast.error(
            `${t("Stock Error:")} ${item.collectionDetails?.name || "Bundle"} ${t("is out of stock and has been removed from your cart")}`
          );
        } else {
          await removeItem(item.product || "", "product");
          toast.error(
            `${t("Stock Error:")} ${item.productDetails?.name} ${t("is out of stock and has been removed from your cart")}`
          );
        }
      } catch (error) {
        console.error("Error removing out-of-stock item:", error);
        toast.error(
          `${t("Stock Error:")} ${t("Failed to remove out-of-stock item")} ${
            item.productDetails?.name || item.collectionDetails?.name
          }. ${t("Please remove it manually")}`
        );
      }
    }
    };

    if (cartItems.length > 0) {
      checkOutOfStockItems();
    }
  }, [cartItems, removeItem]);

  const getItemPrice = (item: CartItemWithProduct) => {
    if (item.type === "collection") {
      return item.collectionDetails?.bundlePrice || 0;
    }
    if (!item.productDetails) return 0;
    return getBulkPricing(item.productDetails, item.quantity).unitPrice;
  };

  const getProductPriceDisplay = (
    product: NonNullable<CartItemWithProduct["productDetails"]>,
    quantity: number
  ) => {
    const { unitPrice, baseUnitPrice, applicableRule } = getBulkPricing(
      product,
      quantity
    );
    const showStrike =
      product.saleActive || (applicableRule && unitPrice < baseUnitPrice);
    const strikePrice = product.saleActive ? product.price : baseUnitPrice;
    return { unitPrice, showStrike, strikePrice };
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
    const invalidItems = cartItems.filter((item) =>
      item.type === "collection" ? !item.collectionDetails : !item.productDetails
    );
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
    const outOfStockItems = cartItems.filter((item) => {
      if (item.type === "collection" && item.collectionDetails) {
        return item.collectionDetails.items.some((bundleItem) => {
          const requiredQty = bundleItem.quantity * item.quantity;
          return bundleItem.product.stock < requiredQty;
        });
      }
      return (
        item.productDetails && item.productDetails.stock < item.quantity
      );
    });
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
      const couponItems = cartItems.flatMap((item) => {
        if (item.type === "collection" && item.collectionDetails) {
          return item.collectionDetails.items.map((bundleItem) => ({
            product: bundleItem.product._id,
            quantity: bundleItem.quantity * item.quantity,
          }));
        }
        if (item.product) {
          return [{ product: item.product, quantity: item.quantity }];
        }
        return [];
      });

      const validation = await validateCoupon(
        couponCode.trim(),
        subtotal,
        couponItems
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

  const getCollectionOriginalTotal = (collection: Collection) => {
    return collection.items.reduce((sum, item) => {
      const product = item.product;
      const unitPrice = getBaseUnitPrice(product);
      return sum + unitPrice * item.quantity;
    }, 0);
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
        <div className="flex items-center justify-center py-16 sm:py-20 px-4">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
              {t("Your Cart is Empty")}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              {t("Add some products to your cart to get started.")}
            </p>
            <Link
              to="/brands"
              className="bg-[#FFD600] text-[#333333] px-4 sm:px-6 py-2 sm:py-3 rounded-md hover:bg-[#e6c100] font-medium inline-block text-sm sm:text-base"
            >
              {t("Browse Products")}
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
      <div className="relative bg-gray-100 py-8 sm:py-12 lg:py-16">
        <div className="absolute inset-0">
          <img
            src="net1.jpeg"
            alt="Camera"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">
            Shopping Cart
          </h1>
          <nav className="text-xs sm:text-sm text-gray-600">
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

      <main className="py-8 sm:py-10 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Cart Items Table - Responsive */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6 sm:mb-8">
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
                      Quantity
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-900">
                      Total
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-900">
                      Remove
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cartItems.map((item) => (
                    <tr key={`${item.type}-${item.product || item.collection}`}>
                      <td className="px-4 sm:px-6 py-4">
                        {item.type === "collection" ? (
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                            <img
                              src={
                                item.collectionDetails?.items?.[0]?.product
                                  ?.images?.[0]?.url || "/placeholder.png"
                              }
                              alt={item.collectionDetails?.name || "Bundle"}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              item.product && handleProductClick(item.product)
                            }
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <img
                              src={
                                item.productDetails?.images?.[0]?.url ||
                                "/placeholder.png"
                              }
                              alt={item.productDetails?.name || "Product"}
                              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg"
                            />
                          </button>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {item.type === "collection" ? (
                          <div className="space-y-1">
                            <div className="text-xs sm:text-sm font-medium text-gray-900">
                              {item.collectionDetails?.name || "Bundle"}
                              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[#FFD600]/20 text-[#333333]">
                                Bundle
                              </span>
                            </div>
                            <div className="text-[10px] sm:text-xs text-gray-500">
                              {item.collectionDetails?.items
                                ?.map(
                                  (bundleItem) =>
                                    `${bundleItem.product.name} x${bundleItem.quantity}`
                                )
                                .join(" + ")}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs sm:text-sm font-medium text-gray-900">
                            {item.productDetails?.name ||
                              "Product Name Not Available"}
                          </div>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-xs sm:text-sm text-gray-900">
                          {item.type === "collection" ? (
                            <div className="flex flex-col">
                              <span className="line-through text-gray-500 text-xs">
                                $
                                {item.collectionDetails
                                  ? getCollectionOriginalTotal(
                                      item.collectionDetails
                                    ).toFixed(2)
                                  : "0.00"}
                              </span>
                              <span className="font-medium text-[#002B5B]">
                                ${getItemPrice(item).toFixed(2)}
                              </span>
                            </div>
                          ) : item.productDetails ? (
                            (() => {
                              const display = getProductPriceDisplay(
                                item.productDetails,
                                item.quantity
                              );
                              return (
                                <div className="flex flex-col">
                                  {display.showStrike && (
                                    <span className="line-through text-gray-500 text-xs">
                                      ${display.strikePrice.toFixed(2)}
                                    </span>
                                  )}
                                  <span
                                    className={`font-medium ${
                                      display.showStrike
                                        ? "text-red-600"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    ${display.unitPrice.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })()
                          ) : (
                            <span>$0.00</span>
                          )}
                          {item.type !== "collection" &&
                            item.productDetails?.saleActive && (
                              <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                                Sale {item.productDetails.salePercentage}%
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.type === "collection"
                                  ? item.collection || ""
                                  : item.product || "",
                                item.quantity - 1,
                                item.type === "collection"
                                  ? "collection"
                                  : "product"
                              )
                            }
                            disabled={
                              updatingItem ===
                              (item.type === "collection"
                                ? item.collection
                                : item.product)
                            }
                            className="px-2 py-1 border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 text-xs sm:text-sm"
                          >
                            -
                          </button>
                          <span className="px-3 sm:px-4 py-1 border-t border-b border-gray-300 bg-white text-xs sm:text-sm">
                            {updatingItem ===
                            (item.type === "collection"
                              ? item.collection
                              : item.product)
                              ? "..."
                              : item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.type === "collection"
                                  ? item.collection || ""
                                  : item.product || "",
                                item.quantity + 1,
                                item.type === "collection"
                                  ? "collection"
                                  : "product"
                              )
                            }
                            disabled={
                              updatingItem ===
                              (item.type === "collection"
                                ? item.collection
                                : item.product)
                            }
                            className="px-2 py-1 border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 text-xs sm:text-sm"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">
                          ${getItemTotal(item).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <button
                          onClick={() =>
                            removeItem(
                              item.type === "collection"
                                ? item.collection || ""
                                : item.product || "",
                              item.type === "collection" ? "collection" : "product"
                            )
                          }
                          disabled={
                            updatingItem ===
                            (item.type === "collection"
                              ? item.collection
                              : item.product)
                          }
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5"
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

            {/* Mobile view - card layout */}
            <div className="md:hidden space-y-4 p-4">
              {cartItems.map((item) => (
                <div
                  key={`${item.type}-${item.product || item.collection}`}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    {item.type === "collection" ? (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        <img
                          src={
                            item.collectionDetails?.items?.[0]?.product
                              ?.images?.[0]?.url || "/placeholder.png"
                          }
                          alt={item.collectionDetails?.name || "Bundle"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          item.product && handleProductClick(item.product)
                        }
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
                    )}
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        {item.type === "collection"
                          ? item.collectionDetails?.name || "Bundle"
                          : item.productDetails?.name ||
                            "Product Name Not Available"}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {item.type === "collection" ? (
                          <>
                            <span className="line-through text-gray-500">
                              $
                              {item.collectionDetails
                                ? getCollectionOriginalTotal(
                                    item.collectionDetails
                                  ).toFixed(2)
                                : "0.00"}
                            </span>
                            <span className="ml-2 font-medium text-[#002B5B]">
                              ${getItemPrice(item).toFixed(2)}
                            </span>
                          </>
                        ) : item.productDetails ? (
                          (() => {
                            const display = getProductPriceDisplay(
                              item.productDetails,
                              item.quantity
                            );
                            return (
                              <>
                                {display.showStrike && (
                                  <span className="line-through text-gray-500">
                                    ${display.strikePrice.toFixed(2)}
                                  </span>
                                )}
                                <span
                                  className={`ml-2 font-medium ${
                                    display.showStrike
                                      ? "text-red-600"
                                      : "text-gray-900"
                                  }`}
                                >
                                  ${display.unitPrice.toFixed(2)}
                                </span>
                              </>
                            );
                          })()
                        ) : (
                          <span>$0.00</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        removeItem(
                          item.type === "collection"
                            ? item.collection || ""
                            : item.product || "",
                          item.type === "collection" ? "collection" : "product"
                        )
                      }
                      disabled={
                        updatingItem ===
                        (item.type === "collection"
                          ? item.collection
                          : item.product)
                      }
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
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Quantity:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.type === "collection"
                              ? item.collection || ""
                              : item.product || "",
                            item.quantity - 1,
                            item.type === "collection" ? "collection" : "product"
                          )
                        }
                        disabled={
                          updatingItem ===
                          (item.type === "collection"
                            ? item.collection
                            : item.product)
                        }
                        className="px-2 py-1 border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 text-xs"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 border-t border-b border-gray-300 bg-white text-xs">
                        {updatingItem ===
                        (item.type === "collection"
                          ? item.collection
                          : item.product)
                          ? "..."
                          : item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.type === "collection"
                              ? item.collection || ""
                              : item.product || "",
                            item.quantity + 1,
                            item.type === "collection" ? "collection" : "product"
                          )
                        }
                        disabled={
                          updatingItem ===
                          (item.type === "collection"
                            ? item.collection
                            : item.product)
                        }
                        className="px-2 py-1 border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs font-medium text-gray-900">
                      Total:
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      ${getItemTotal(item).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Left Column - Shipping & Coupon */}
            <div className="space-y-4 sm:space-y-6">
              {/* Calculate Shipping */}
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                  Calculate Shipping
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4">
                  <select
                    value={shippingInfo.country}
                    onChange={(e) =>
                      setShippingInfo({
                        ...shippingInfo,
                        country: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                  >
                    <option value="Egypt">Egypt</option>
                  </select>
                  <select
                    value={shippingInfo.city}
                    onChange={(e) =>
                      setShippingInfo({ ...shippingInfo, city: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4 text-xs sm:text-sm"
                />
                <button className="w-full bg-[#002B5B] text-white py-2 px-4 rounded-lg hover:bg-[#001a3d] transition-colors text-xs sm:text-sm font-medium">
                  ESTIMATE
                </button>
              </div>

              {/* Discount Coupon */}
              <div className="bg-[#FAFAFA] p-4 sm:p-6 rounded-lg shadow-sm border border-[#9E9E9E]/20">
                <h3 className="text-base sm:text-lg font-semibold text-[#333333] mb-3 sm:mb-4">
                  Discount Coupon Code
                </h3>

                {appliedCoupon ? (
                  <div className="mb-4 p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-green-800">
                          {t("Coupon Applied:")} {appliedCoupon.code}
                        </p>
                        <p className="text-xs text-green-600">
                          {appliedCoupon.discountType === "percentage"
                            ? `${appliedCoupon.discountValue}% ${t("off")}`
                            : `$${appliedCoupon.discountValue} ${t("off")}`}
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-red-600 hover:text-red-800 text-xs underline flex-shrink-0"
                      >
                        {t("Remove")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder={t("Coupon Code")}
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 px-3 py-2 border border-[#9E9E9E]/30 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent text-xs sm:text-sm"
                      disabled={couponLoading}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="bg-[#D32F2F] text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-[#b71c1c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium whitespace-nowrap"
                    >
                      {couponLoading ? "APPLYING..." : "APPLY CODE"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Cart Summary */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
                Cart Summary
              </h3>

              <div className="space-y-3 sm:space-y-4 mb-6">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Sub Total</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Shipping Cost</span>
                  <span className="font-medium">
                    ${shippingCost.toFixed(2)}
                  </span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm text-green-600">
                    <span>Coupon Discount ({appliedCoupon?.code})</span>
                    <span className="font-medium">
                      -${couponDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="border-t pt-3 sm:pt-4">
                  <div className="flex justify-between text-base sm:text-lg font-semibold">
                    <span>Grand Total</span>
                    <span>${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleCheckout}
                  className="w-full bg-[#FFD600] text-[#333333] py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-medium hover:bg-[#e6c100] transition-colors text-center text-xs sm:text-sm"
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
