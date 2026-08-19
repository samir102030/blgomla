import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";
import DeliveryEstimate from "../components/DeliveryEstimate";
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
import { resolveShippingFee, type ShippingSettings } from "../lib/shipping";
import { cldImg } from "../lib/cldImage";
import FeaturedProducts from "../components/FeaturedProducts";
// import LoadingComp from "../components/LoadingComp";

interface CartItemWithProduct {
  _id?: string;
  type?: "product" | "collection";
  product?: string; // Product ID
  collection?: string; // Collection ID
  quantity: number;
  /** The customer asked us to fit this line. */
  installation?: boolean;
  productDetails?: {
    _id: string;
    name: string;
    price: number;
    stock: number;
    salePercentage: number;
    saleActive: boolean;
    bulkPricing?: Array<{ minQty: number; unitPrice: number }>;
    images: Array<{ url: string; alt?: string }>;
    installation?: { offered: boolean; price: number; note?: string };
  };
  collectionDetails?: Collection;
}

/** The fitting a line offers, whichever kind of line it is. */
const installConfigOf = (item: CartItemWithProduct) =>
  item.type === "collection"
    ? item.collectionDetails?.installation
    : item.productDetails?.installation;

/**
 * The yes/no fitting choice for one cart line. Renders nothing at all for a
 * line whose seller doesn't offer fitting, so the cart stays quiet for the
 * ordinary case.
 */
const InstallationToggle: React.FC<{
  item: CartItemWithProduct;
  onToggle: (item: CartItemWithProduct, want: boolean) => void;
}> = ({ item, onToggle }) => {
  const { t } = useTranslation();
  const config = installConfigOf(item);
  if (!config?.offered) return null;

  const price = Number(config.price) || 0;
  const on = !!item.installation;

  return (
    <label
      className={`flex items-start gap-2.5 rounded-lg border p-2.5 mt-2 cursor-pointer transition-all ${
        on
          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
          : "border-[var(--border)] hover:border-[var(--brand-primary)]/40"
      }`}
    >
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onToggle(item, e.target.checked)}
        className="mt-0.5 w-4 h-4 accent-[var(--brand-primary)] shrink-0"
      />
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-[var(--text)]">
          🔧 {t("Do you want us to install it for you?")}
        </span>
        <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">
          {price > 0
            ? `+${price.toLocaleString("en-EG")} ${t("EGP")}${
                item.quantity > 1 ? ` × ${item.quantity}` : ""
              }`
            : t("Included at no extra cost")}
        </span>
      </span>
    </label>
  );
};

const ShoppingCartPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const pickName = (p?: { name?: string; nameAr?: string }) =>
    !p ? "" : (i18n.language === "ar" && p.nameAr ? p.nameAr : p.name) || "";
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

  const [shippingSettings, setShippingSettings] =
    useState<ShippingSettings | null>(null);
  const [selectedGovernorate, setSelectedGovernorate] = useState("");

  const [couponCode, setCouponCode] = useState("");

  // Load the store's shipping config so the cart can show a real estimate.
  useEffect(() => {
    axiosInstance
      .get<{ success: boolean; settings: ShippingSettings }>("/shipping")
      .then((res) => setShippingSettings(res.data.settings))
      .catch(() => {});
  }, []);

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
                productDetails: (data?.data?._id ? data.data : data?.data?.[0] || data?.product) ?? undefined,
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
      toast.error(t("Product Error: Item details not available. Please refresh"));
      return;
    }

    if (itemType === "collection") {
      if (!item.collectionDetails) {
        toast.error(
          t("Collection Error: Details not available. Please refresh the page")
        );
        return;
      }

      const outOfStock = item.collectionDetails.items.find((bundleItem) => {
        const requiredQty = bundleItem.quantity * newQuantity;
        return bundleItem.product.stock < requiredQty;
      });
      if (outOfStock) {
        toast.error(
          t("Stock Error: {{name}} does not have enough stock for this bundle", { name: outOfStock.product.name })
        );
        return;
      }
    } else {
      if (!item.productDetails) {
        toast.error(
          t("Product Error: Item details not available. Please refresh the page")
        );
        return;
      }

      if (newQuantity > item.productDetails.stock) {
        toast.error(
          t("Stock Error: Only {{count}} {{unit}} available for {{name}}. Please adjust quantity", {
            count: item.productDetails.stock,
            unit: item.productDetails.stock === 1 ? t("item") : t("items"),
            name: item.productDetails.name,
          })
        );
        return;
      }

      if (item.productDetails.stock === 0) {
        await removeItem(itemId, "product");
        toast.error(
          t("Stock Error: {{name}} is out of stock and has been removed from your cart", { name: item.productDetails.name })
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

      toast.success(t("Cart updated successfully"));

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
        error?.response?.data?.message || t("Failed to update cart");
      toast.error(t("Cart Update Error: {{msg}}. Please try again", { msg: errorMessage }));
    } finally {
      setUpdatingItem(null);
    }
  };

  /**
   * Tick fitting on or off for one line. The server re-checks the flag against
   * whatever offers it, so this can only ever say yes or no — the price stays
   * server-side. Local state updates first so the checkbox doesn't lag.
   */
  const toggleInstallation = async (
    item: CartItemWithProduct,
    want: boolean
  ) => {
    const id = (item.type === "collection" ? item.collection : item.product) || "";
    if (!id) return;
    const key = item.type === "collection" ? "collection" : "product";

    setCartItems((prev) =>
      prev.map((it) => (it[key] === id ? { ...it, installation: want } : it))
    );

    try {
      if (item.type === "collection") {
        await updateCollectionCart(id, item.quantity, want);
      } else {
        await updateCartItem(id, item.quantity, want);
      }
      await fetchCart();
    } catch (error: any) {
      // Put the checkbox back where it was — pretending it saved would send
      // the customer to checkout expecting a fitter who was never booked.
      setCartItems((prev) =>
        prev.map((it) => (it[key] === id ? { ...it, installation: !want } : it))
      );
      toast.error(
        error?.response?.data?.message || t("Failed to update cart")
      );
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
        toast.success(t("Item removed from cart"));

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
          error?.response?.data?.message || t("Failed to remove item");
        toast.error(t("Remove Item Error: {{msg}}. Please try again", { msg: errorMessage }));
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
      toast.error(t("Please enter a coupon code"));
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
        toast.error(t("Failed to apply coupon"));
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

      toast.success(t("Coupon applied successfully!"));
      setCouponCode(""); // Clear the input
    } catch (error: any) {
      console.error("Error applying coupon:", error);
      toast.error(error?.response?.data?.message || "Failed to apply coupon");
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    toast.success(t("Coupon removed"));
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
  const shippingCost = resolveShippingFee(
    shippingSettings,
    { state: selectedGovernorate },
    subtotal
  );
  const freeShippingThreshold = Number(
    shippingSettings?.freeShippingThreshold || 0
  );
  const amountToFreeShipping =
    freeShippingThreshold > 0 ? freeShippingThreshold - subtotal : 0;

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
  // Fitting the customer ticked, per unit. Added after the coupon, matching
  // the server: a coupon discounts goods, not labour.
  const installationTotal = cartItems.reduce((sum, item) => {
    if (!item.installation) return sum;
    const config = installConfigOf(item);
    if (!config?.offered) return sum;
    return sum + (Number(config.price) || 0) * item.quantity;
  }, 0);
  const grandTotal = subtotal + shippingCost + installationTotal - couponDiscount;

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
      <div className="min-h-screen bg-[var(--surface-2)]">
        <Header />
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-8 text-center">
          <div
            className="mx-auto mb-6 flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full"
            style={{ background: "var(--brand-gradient)" }}
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-12 w-12 sm:h-14 sm:w-14"
            >
              <path d="M3 4h2l2.4 12.3a2 2 0 0 0 2 1.7h8.2a2 2 0 0 0 2-1.6L21 8H6" />
              <circle cx="9.5" cy="20" r="1.4" />
              <circle cx="17.5" cy="20" r="1.4" />
            </svg>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text)] mb-2">
            {t("Looks like your cart is empty")}
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-muted)] max-w-md mx-auto mb-6">
            {t(
              "Discover products our customers love — or jump straight into a category below."
            )}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
            <Link
              to="/products"
              className="inline-flex items-center justify-center px-6 py-3 rounded-md font-medium text-white shadow-sm hover:opacity-95 transition w-full sm:w-auto"
              style={{ background: "var(--brand-gradient)" }}
            >
              {t("Browse Products")}
            </Link>
            <Link
              to="/wishlist"
              className="inline-flex items-center justify-center px-6 py-3 rounded-md font-medium border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] transition w-full sm:w-auto"
            >
              {t("View Wishlist")}
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
            {[
              { label: t("Cameras"), to: "/products?category=Network+Camera" },
              { label: t("Networking"), to: "/products?category=Switch" },
              { label: t("Collections"), to: "/collections" },
              { label: t("Brands"), to: "/brands" },
            ].map((c) => (
              <Link
                key={c.to}
                to={c.to}
                className="text-[var(--brand-primary)] hover:underline"
              >
                {c.label}
              </Link>
            ))}
          </div>

          <p className="mt-6 text-xs text-[var(--text-muted)]">
            {t("Need help choosing?")}{" "}
            <Link to="/contact" className="underline hover:text-[var(--text)]">
              {t("Contact us")}
            </Link>
          </p>
        </section>

        <FeaturedProducts />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />

      {/* The old header was its own purple-to-navy gradient, which belonged to
          no other page on the site. On the brand canvas it now matches. */}
      <PageHero
        eyebrow={t("Your Cart")}
        title={t("Shopping Cart")}
        breadcrumb={[{ label: t("Home"), to: "/" }, { label: t("Shopping Cart") }]}
        aside={
          <div className="text-start lg:text-end">
            <div className="text-display-sm text-[var(--on-ink)]">
              {cartItems.length}
            </div>
            <div className="text-xs sm:text-sm text-[var(--on-ink-muted)]">
              {cartItems.length === 1 ? t("item") : t("items")}
            </div>
          </div>
        }
      />

      <main className="py-8 sm:py-10 lg:py-12">
        <div className="shell">
          {/* Cart Items Table - Responsive */}
          <div className="bg-[var(--surface)] rounded-lg shadow-sm overflow-hidden mb-6 sm:mb-8">
            {/* Desktop view - table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--bg)]">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-[var(--text)]">
                      {t("Image")}
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-[var(--text)]">
                      {t("Product")}
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-[var(--text)]">
                      {t("Price")}
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-[var(--text)]">
                      {t("Quantity")}
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-[var(--text)]">
                      {t("Total")}
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-[var(--text)]">
                      {t("Remove")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {cartItems.map((item) => (
                    <tr key={`${item.type}-${item.product || item.collection}`}>
                      <td className="px-4 sm:px-6 py-4">
                        {item.type === "collection" ? (
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[var(--surface-2)] rounded-lg flex items-center justify-center overflow-hidden">
                            <img
                              src={cldImg(
                                item.collectionDetails?.items?.[0]?.product
                                  ?.images?.[0]?.url,
                                { w: 160 }
                              )}
                              alt={item.collectionDetails?.name || t("Bundle")}
                              loading="lazy"
                              decoding="async"
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
                              src={cldImg(item.productDetails?.images?.[0]?.url, { w: 160 })}
                              alt={pickName(item.productDetails) || t("Product")}
                              loading="lazy"
                              decoding="async"
                              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg"
                            />
                          </button>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {item.type === "collection" ? (
                          <div className="space-y-1">
                            <div className="text-xs sm:text-sm font-medium text-[var(--text)]">
                              {item.collectionDetails?.name || t("Bundle")}
                              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] font-semibold">
                                {t("Bundle")}
                              </span>
                            </div>
                            <div className="text-[10px] sm:text-xs text-[var(--text-subtle)]">
                              {item.collectionDetails?.items
                                ?.map(
                                  (bundleItem) =>
                                    `${bundleItem.product.name} x${bundleItem.quantity}`
                                )
                                .join(" + ")}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs sm:text-sm font-medium text-[var(--text)]">
                            {pickName(item.productDetails) ||
                              t("Product Name Not Available")}
                          </div>
                        )}
                        <div className="max-w-xs">
                          <InstallationToggle item={item} onToggle={toggleInstallation} />
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-xs sm:text-sm text-[var(--text)]">
                          {item.type === "collection" ? (
                            <div className="flex flex-col">
                              <span className="line-through text-[var(--text-subtle)] text-xs">
                                {item.collectionDetails
                                  ? `${getCollectionOriginalTotal(
                                      item.collectionDetails
                                    ).toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP`
                                  : "0.00 EGP"}
                              </span>
                              <span className="font-medium text-[var(--brand-primary)]">
                                {(getItemPrice(item)).toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP
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
                                    <span className="line-through text-[var(--text-subtle)] text-xs">
                                      {(display.strikePrice).toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP
                                    </span>
                                  )}
                                  <span
                                    className={`font-medium ${
                                      display.showStrike
                                        ? "text-red-600"
                                        : "text-[var(--text)]"
                                    }`}
                                  >
                                    {(display.unitPrice).toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP
                                  </span>
                                </div>
                              );
                            })()
                          ) : (
                            <span>0 EGP</span>
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
                            className="px-2 py-1 border border-[var(--border)] rounded-l-md hover:bg-[var(--surface-2)] disabled:opacity-50 text-xs sm:text-sm"
                          >
                            -
                          </button>
                          <span className="px-3 sm:px-4 py-1 border-t border-b border-[var(--border)] bg-[var(--surface)] text-xs sm:text-sm">
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
                            className="px-2 py-1 border border-[var(--border)] rounded-r-md hover:bg-[var(--surface-2)] disabled:opacity-50 text-xs sm:text-sm"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-xs sm:text-sm font-medium text-[var(--text)]">
                          {(getItemTotal(item)).toLocaleString("en-EG", { maximumFractionDigits: 2 })} {t("EGP")}
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
                  className="border border-[var(--border)] rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    {item.type === "collection" ? (
                      <div className="w-16 h-16 bg-[var(--surface-2)] rounded-lg flex items-center justify-center overflow-hidden">
                        <img
                          src={cldImg(
                            item.collectionDetails?.items?.[0]?.product
                              ?.images?.[0]?.url,
                            { w: 160 }
                          )}
                          alt={item.collectionDetails?.name || "Bundle"}
                          loading="lazy"
                          decoding="async"
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
                          src={cldImg(item.productDetails?.images?.[0]?.url, { w: 160 })}
                          alt={item.productDetails?.name || "Product"}
                          loading="lazy"
                          decoding="async"
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      </button>
                    )}
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-[var(--text)]">
                        {item.type === "collection"
                          ? item.collectionDetails?.name || "Bundle"
                          : item.productDetails?.name ||
                            "Product Name Not Available"}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {item.type === "collection" ? (
                          <>
                            <span className="line-through text-[var(--text-subtle)]">
                              {item.collectionDetails
                                ? `${getCollectionOriginalTotal(
                                    item.collectionDetails
                                  ).toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP`
                                : "0.00 EGP"}
                            </span>
                            <span className="ml-2 font-medium text-[var(--brand-primary)]">
                              {(getItemPrice(item)).toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP
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
                                  <span className="line-through text-[var(--text-subtle)]">
                                    {(display.strikePrice).toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP
                                  </span>
                                )}
                                <span
                                  className={`ml-2 font-medium ${
                                    display.showStrike
                                      ? "text-red-600"
                                      : "text-[var(--text)]"
                                  }`}
                                >
                                  {(display.unitPrice).toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP
                                </span>
                              </>
                            );
                          })()
                        ) : (
                          <span>0 EGP</span>
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
                    <span className="text-xs text-[var(--text-muted)]">{t("Quantity:")}</span>
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
                        className="px-2 py-1 border border-[var(--border)] rounded-l-md hover:bg-[var(--surface-2)] disabled:opacity-50 text-xs"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 border-t border-b border-[var(--border)] bg-[var(--surface)] text-xs">
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
                        className="px-2 py-1 border border-[var(--border)] rounded-r-md hover:bg-[var(--surface-2)] disabled:opacity-50 text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <InstallationToggle item={item} onToggle={toggleInstallation} />
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                    <span className="text-xs font-medium text-[var(--text)]">
                      {t("Total:")}
                    </span>
                    <span className="text-sm font-bold text-[var(--text)]">
                      {(getItemTotal(item)).toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Left Column - Shipping & Coupon */}
            <div className="space-y-4 sm:space-y-6">
              {/* Estimate Shipping */}
              {shippingSettings?.enabled !== false && (
                <div className="bg-[var(--surface)] p-4 sm:p-6 rounded-lg shadow-sm">
                  <h3 className="text-base sm:text-lg font-semibold text-[var(--text)] mb-3 sm:mb-4">
                    {t("Estimate Shipping")}
                  </h3>
                  <select
                    value={selectedGovernorate}
                    onChange={(e) => setSelectedGovernorate(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent text-xs sm:text-sm"
                  >
                    <option value="">{t("Select your governorate")}</option>
                    {(shippingSettings?.zones || []).map((zone) => (
                      <option key={zone.governorate} value={zone.governorate}>
                        {zone.governorate}
                      </option>
                    ))}
                  </select>
                  <div className="mt-3 flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-[var(--text-muted)]">
                      {t("Estimated shipping")}
                    </span>
                    <span className="font-semibold text-[var(--text)]">
                      {shippingCost === 0
                        ? t("Free")
                        : `${shippingCost.toLocaleString("en-EG", { maximumFractionDigits: 2 })} ${t("EGP")}`}
                    </span>
                  </div>
                  {freeShippingThreshold > 0 && (
                    <div className="mt-3">
                      {amountToFreeShipping > 0 ? (
                        <p className="text-xs text-[var(--text)] mb-1.5">
                          {t("Add {{amount}} EGP more to get free shipping!", {
                            amount: amountToFreeShipping.toLocaleString("en-EG", { maximumFractionDigits: 2 }),
                          })}
                        </p>
                      ) : (
                        <p className="text-xs font-semibold text-green-500 mb-1.5 inline-flex items-center gap-1">
                          🎉 {t("You unlocked FREE shipping!")}
                        </p>
                      )}
                      <div className="h-2 w-full rounded-full bg-[var(--surface-3)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#00A8E8] to-[#0077B6] transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-[10px] sm:text-xs text-[var(--text-subtle)]">
                    {t("Final shipping is confirmed at checkout based on your address.")}
                  </p>
                </div>
              )}

              {/* Discount Coupon */}
              <div className="bg-[var(--surface)] p-4 sm:p-6 rounded-lg shadow-sm border border-[var(--border)]">
                <h3 className="text-base sm:text-lg font-semibold text-[var(--text)] mb-3 sm:mb-4">
                  {t("Discount Coupon Code")}
                </h3>

                {appliedCoupon ? (
                  <div className="mb-4 p-2 sm:p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-green-500">
                          {t("Coupon Applied:")} {appliedCoupon.code}
                        </p>
                        <p className="text-xs text-green-400">
                          {appliedCoupon.discountType === "percentage"
                            ? `${appliedCoupon.discountValue}% ${t("off")}`
                            : `${appliedCoupon.discountValue.toLocaleString("en-EG", { maximumFractionDigits: 2 })} ${t("EGP")} ${t("off")}`}
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-red-500 hover:text-red-400 text-xs underline flex-shrink-0"
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
                      className="flex-1 px-3 py-2 border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent text-xs sm:text-sm"
                      disabled={couponLoading}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] text-white px-4 sm:px-6 py-2.5 rounded-xl hover:shadow-lg hover:shadow-[var(--brand-primary)]/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none text-xs sm:text-sm font-semibold whitespace-nowrap"
                    >
                      {couponLoading ? t("APPLYING...") : t("APPLY CODE")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Cart Summary */}
            <div className="bg-[var(--surface)] p-4 sm:p-6 rounded-lg shadow-sm border border-[var(--border)]">
              <h3 className="text-base sm:text-lg font-semibold text-[var(--text)] mb-4 sm:mb-6">
                {t("Cart Summary")}
              </h3>

              <div className="space-y-3 sm:space-y-4 mb-6">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-[var(--text-muted)]">{t("Sub Total")}</span>
                  <span className="font-medium text-[var(--text)]">{(subtotal).toLocaleString("en-EG", { maximumFractionDigits: 2 })} {t("EGP")}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-[var(--text-muted)]">{t("Shipping Cost")}</span>
                  <span className="font-medium text-[var(--text)]">
                    {(shippingCost).toLocaleString("en-EG", { maximumFractionDigits: 2 })} {t("EGP")}
                  </span>
                </div>
                {installationTotal > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-[var(--text-muted)]">🔧 {t("Installation")}</span>
                    <span className="font-medium text-[var(--text)]">
                      {(installationTotal).toLocaleString("en-EG", { maximumFractionDigits: 2 })} {t("EGP")}
                    </span>
                  </div>
                )}
                <div className="pt-1">
                  <DeliveryEstimate compact />
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm text-green-500">
                    <span>{t("Coupon Discount")} ({appliedCoupon?.code})</span>
                    <span className="font-medium">
                      -{(couponDiscount).toLocaleString("en-EG", { maximumFractionDigits: 2 })} {t("EGP")}
                    </span>
                  </div>
                )}
                <div className="border-t border-[var(--border)] pt-3 sm:pt-4">
                  <div className="flex justify-between text-base sm:text-lg font-semibold text-[var(--text)]">
                    <span>{t("Grand Total")}</span>
                    <span>{(grandTotal).toLocaleString("en-EG", { maximumFractionDigits: 2 })} {t("EGP")}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleCheckout}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] text-white py-3 sm:py-3.5 px-6 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[var(--brand-primary)]/25 transition-all duration-300"
                >
                  {t("CHECKOUT")}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
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
