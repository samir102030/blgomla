import React, { useState, useEffect, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";
import PleaseLogin from "../components/PleaseLogin";
import DeliveryEstimate from "../components/DeliveryEstimate";
import { useUserStore } from "../stores/user.store";
import { useOrderStore } from "../stores/order.store";
import { useAddressStore } from "../stores/address.store";
import { useCouponStore } from "../stores/coupon.store";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import type { Coupon } from "../types/coupon.type";
import { resolveShippingFee, type ShippingSettings } from "../lib/shipping";
import type { Collection } from "../types/collection.type";
import { useTranslation } from "react-i18next";
import { getBulkPricing } from "../lib/pricing";
import type { PickedAddress } from "../components/AddressMapPicker";

const AddressMapPicker = lazy(() => import("../components/AddressMapPicker"));

interface CartItemWithProduct {
  _id?: string;
  type?: "product" | "collection";
  product?: string;
  collection?: string;
  quantity: number;
  /** Collection lines only: the customer asked us to fit it. */
  installation?: boolean;
  productDetails?: {
    _id: string;
    name: string;
    price: number;
    stock: number;
    salePercentage: number;
    saleActive: boolean;
    images: Array<{ url: string; alt?: string }>;
    store?: string; // Store ID
    bulkPricing?: Array<{ minQty: number; unitPrice: number }>;
  };
  collectionDetails?: Collection;
}

const CheckoutPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const user = useUserStore((state) => state.user);
  const fetchCart = useUserStore((state) => state.fetchCart);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const { createOrder } = useOrderStore();
  const { addresses, fetchUserAddresses, createAddress } = useAddressStore();
  const { appliedCoupon, validateCoupon, removeCoupon } = useCouponStore();

  const [billingData, setBillingData] = useState({
    firstName: user?.name?.split(" ")[0] || "",
    lastName: user?.name?.split(" ")[1] || "",
    email: user?.email || "",
    phone: "",
    company: "",
    address1: "",
    address2: "",
    country: "Egypt",
    city: "",
    state: "",
    zipCode: "",
    createAccount: false,
    shipToDifferent: false,
  });

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [couponCode, setCouponCode] = useState("");
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings | null>(null);
  const [showMap, setShowMap] = useState(false);

  // Map picker fills the address fields and switches to the "new address" path.
  const handleMapSelect = (a: PickedAddress) => {
    setSelectedAddressId("");
    setBillingData((prev) => ({
      ...prev,
      address1: a.address || prev.address1,
      city: a.city || prev.city,
      state: a.state || prev.state,
    }));
  };

  // Load the store's shipping config once so the summary can show a real fee.
  useEffect(() => {
    axiosInstance
      .get<{ success: boolean; settings: ShippingSettings }>("/shipping")
      .then((res) => setShippingSettings(res.data.settings))
      .catch(() => {});
  }, []);

  // Load cart data and addresses on component mount
  useEffect(() => {
    const loadData = async () => {
      if (user?.cart) {
        try {
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
              } catch (error: any) {
                console.error("Error fetching cart item:", error);
                return {
                  ...item,
                  type: isCollection ? "collection" : "product",
                };
              }
            })
          );
          setCartItems(itemsWithDetails);
        } catch (error: any) {
          console.error("Error loading cart items:", error);
          toast.error(
            t("Cart Loading Error: Some items could not be loaded. Please refresh the page")
          );
        }
      }

      // Load user addresses
      if (user?._id) {
        try {
          await fetchUserAddresses();
        } catch (error: any) {
          console.error("Error loading addresses:", error);
          toast.error(
            t("Address Loading Error: Could not load your saved addresses")
          );
        }
      }
    };

    loadData();
  }, [user?.cart, user?._id, fetchUserAddresses]);

  // Calculate prices
  const getItemPrice = (item: CartItemWithProduct) => {
    if (item.type === "collection") {
      return item.collectionDetails?.bundlePrice || 0;
    }
    if (!item.productDetails) return 0;
    return getBulkPricing(item.productDetails, item.quantity).unitPrice;
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + getItemPrice(item) * item.quantity,
    0
  );
  // Shipping fee from the store config, based on the chosen delivery address.
  const selectedAddress = addresses?.find((a) => a._id === selectedAddressId);
  const shippingAddressForFee = selectedAddress
    ? { city: selectedAddress.city, state: selectedAddress.state }
    : { city: billingData.city, state: billingData.state };
  const shippingFee = resolveShippingFee(
    shippingSettings,
    shippingAddressForFee,
    subtotal
  );

  // Calculate coupon discount using store's applied coupon
  const calculateCouponDiscount = () => {
    if (!appliedCoupon || !appliedCoupon.discountValue) return 0;

    // Check if coupon has expired
    const currentDate = new Date();
    const endDate = new Date(appliedCoupon.endDate);
    if (currentDate > endDate) {
      // Remove expired coupon
      removeCoupon();
      toast.error(t("The applied coupon has expired and has been removed"));
      return 0;
    }

    if (appliedCoupon.discountType === "percentage") {
      const discount = subtotal * (appliedCoupon.discountValue / 100);
      return appliedCoupon.maximumDiscount
        ? Math.min(discount, appliedCoupon.maximumDiscount)
        : discount;
    } else {
      return appliedCoupon.discountValue;
    }
  };

  const discountAmount = calculateCouponDiscount();
  // Fitting the customer opted into, per bundle. Added after the coupon, the
  // same order the server uses — a coupon discounts goods, not labour. If this
  // were left out, the page would quote one figure and the order would charge
  // another, and for card payments the gateway takes the order's.
  const installationFee = cartItems.reduce((sum, item) => {
    if (item.type !== "collection" || !item.installation) return sum;
    const config = item.collectionDetails?.installation;
    if (!config?.offered) return sum;
    return sum + (Number(config.price) || 0) * item.quantity;
  }, 0);
  const totalBeforePoints = Math.max(
    0,
    subtotal + shippingFee + installationFee - discountAmount
  );
  // Loyalty: 1 point = 1 EGP, capped by balance and the remaining total.
  const pointsBalance = Math.max(0, user?.loyaltyPoints || 0);
  const maxRedeemable = Math.min(pointsBalance, Math.floor(totalBeforePoints));
  const pointsApplied = redeemPoints ? maxRedeemable : 0;
  const grandTotal = Math.max(0, totalBeforePoints - pointsApplied);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error(t("Please enter a coupon code"));
      return;
    }

    try {
      const cartItemsData = cartItems.flatMap((item) => {
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
        couponCode.toUpperCase(),
        subtotal,
        cartItemsData
      );

      if (validation && validation.success && validation.coupon) {
        // Apply the coupon by storing it in the coupon store
        // The validation response now includes the full coupon data
        const couponData: Coupon = {
          _id: validation.coupon._id,
          code: validation.coupon.code,
          discountType: validation.coupon.discountType as
            | "percentage"
            | "fixed",
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

        toast.success(
          `Coupon applied! You saved ${(calculateCouponDiscount()).toLocaleString("en-EG", { maximumFractionDigits: 2 })} EGP`
        );
        setCouponCode("");
      } else {
        console.log(validation);
        toast.error(validation?.message || "Invalid coupon code");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to apply coupon");
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponCode("");
    toast.success(t("Coupon removed"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enhanced validation with specific error messages
    if (!user) {
      toast.error(t("Authentication Error: Please log in to place an order"));
      return;
    }

    if (cartItems.length === 0) {
      toast.error(
        "Cart Error: Your cart is empty. Please add items before checkout"
      );
      return;
    }

    // Check for invalid products
    const invalidItems = cartItems.filter((item) =>
      item.type === "collection" ? !item.collectionDetails : !item.productDetails
    );
    if (invalidItems.length > 0) {
      toast.error(
        "Product Error: Some items in your cart are no longer available. Please remove them and try again"
      );
      return;
    }

    // Validate all products belong to the same store
    const stores = cartItems
      .map((item) => {
        if (item.type === "collection") {
          return typeof item.collectionDetails?.store === "string"
            ? item.collectionDetails?.store
            : item.collectionDetails?.store?._id;
        }
        return item.productDetails?.store;
      })
      .filter(Boolean);
    const uniqueStores = [...new Set(stores)];
    if (uniqueStores.length > 1) {
      toast.error(
        "Store Error: All items in your cart must belong to the same store. Please review your cart and try again"
      );
      return;
    }

    const storeId = uniqueStores[0];
    if (!storeId) {
      toast.error(
        "Store Error: Unable to determine the store for your order. Please contact support"
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
      return item.productDetails && item.productDetails.stock < item.quantity;
    });
    if (outOfStockItems.length > 0) {
      const itemNames = outOfStockItems
        .map((item) => item.productDetails?.name || "Unknown Product")
        .join(", ");
      toast.error(
        `Stock Error: Insufficient stock for ${itemNames}. Please adjust quantities or remove items`
      );
      return;
    }

    if (!paymentMethod) {
      toast.error(t("Payment Error: Please select a payment method to proceed"));
      return;
    }

    if (!acceptTerms) {
      toast.error(
        "Terms Error: Please accept the terms and conditions to continue"
      );
      return;
    }

    // Enhanced billing validation with specific field errors
    const requiredFields = [
      { field: "firstName", label: "First Name" },
      { field: "lastName", label: "Last Name" },
      { field: "email", label: "Email Address" },
      { field: "phone", label: "Phone Number" },
      { field: "address1", label: "Address" },
      { field: "city", label: "City" },
      { field: "country", label: "Country" },
    ];

    const missingFields = requiredFields.filter(
      ({ field }) =>
        !billingData[field as keyof typeof billingData]?.toString().trim()
    );
    if (missingFields.length > 0) {
      const fieldNames = missingFields.map(({ label }) => label).join(", ");
      toast.error(
        `Billing Information Error: Please fill in required fields: ${fieldNames}`
      );
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(billingData.email)) {
      toast.error(t("Email Error: Please enter a valid email address"));
      return;
    }

    // Phone validation (basic)
    // const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
    // if (!phoneRegex.test(billingData.phone.replace(/[\s\-()]/g, ''))) {
    //   toast.error("Phone Error: Please enter a valid phone number");
    //   return;
    // }

    setLoading(true);

    try {
      // Create or use existing address
      let shippingAddressId = selectedAddressId;

      if (!shippingAddressId) {
        try {
          // Create new address
          const addressData = {
            user: user._id,
            name: `${billingData.firstName.trim()} ${billingData.lastName.trim()}`,
            phone: billingData.phone.trim(),
            address: `${billingData.address1.trim()}${
              billingData.address2 ? ", " + billingData.address2.trim() : ""
            }`,
            city: billingData.city.trim(),
            state: billingData.state?.trim() || "",
            zipCode: billingData.zipCode?.trim() || "",
            country: billingData.country,
            isDefault: false,
            type: "Shipping" as const,
          };

          const newAddress = await createAddress(addressData);
          if (newAddress) {
            shippingAddressId = newAddress._id;
          } else {
            throw new Error("Address creation returned no data");
          }
        } catch (addressError: any) {
          console.error("Address creation error:", addressError);
          const errorMessage =
            addressError?.response?.data?.message || addressError.message;
          toast.error(
            `Address Error: Failed to save shipping address. ${errorMessage}`
          );
          return;
        }
      }

      // Double-check stock before creating order
      try {
        const requiredProducts = new Map<string, number>();
        cartItems.forEach((item) => {
          if (item.type === "collection" && item.collectionDetails) {
            item.collectionDetails.items.forEach((bundleItem) => {
              const productId = bundleItem.product._id;
              const requiredQty = bundleItem.quantity * item.quantity;
              requiredProducts.set(
                productId,
                (requiredProducts.get(productId) || 0) + requiredQty
              );
            });
          } else if (item.product) {
            requiredProducts.set(
              item.product,
              (requiredProducts.get(item.product) || 0) + item.quantity
            );
          }
        });

        const stockCheckPromises = Array.from(requiredProducts.entries()).map(
          async ([productId, quantity]) => {
            const { data } = await axiosInstance.get(`/products/${productId}`);
            const product = data?.data?._id
              ? data.data
              : data?.data?.[0] || data?.product;
            const currentStock = product?.stock || 0;
            if (currentStock < quantity) {
              throw new Error(
                `Insufficient stock for ${
                  product?.name || "product"
                }. Available: ${currentStock}`
              );
            }
            return product;
          }
        );

        await Promise.all(stockCheckPromises);
      } catch (stockError: any) {
        console.error("Stock validation error:", stockError);
        toast.error(
          `Stock Validation Error: ${stockError.message}. Please refresh the page and try again`
        );
        return;
      }

      // Prepare order data
      const orderItemsPayload = cartItems
        .filter((item) => item.type !== "collection")
        .map((item) => ({
          product: item.product,
          quantity: item.quantity,
        }));

      const collectionItemsPayload = cartItems
        .filter((item) => item.type === "collection")
        .map((item) => ({
          collection: item.collection,
          quantity: item.quantity,
          // Whether the customer asked us to fit it. The server re-prices this
          // from the collection, so this flag can only say yes or no — never
          // how much.
          installation: !!item.installation,
        }));

      const orderData: any = {
        user: user._id,
        shippingAddress: shippingAddressId,
        paymentMethod,
        store: storeId,
        itemsPrice: subtotal,
        shippingPrice: shippingFee,
        taxPrice: 0, // You can calculate tax if needed
        totalPrice: grandTotal,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        pointsToRedeem: pointsApplied,
      };

      if (orderItemsPayload.length > 0) {
        orderData.orderItems = orderItemsPayload;
      }

      if (collectionItemsPayload.length > 0) {
        orderData.collectionItems = collectionItemsPayload;
      }

      // Create order
      const order = await createOrder(orderData);

      if (order) {
        await fetchCart();

        // Online payment (Paymob card / installments / Tabby / Tamara): get a
        // payment session and hand off to the hosted page. Falls back to
        // confirmation if the gateway isn't configured, so the order is never lost.
        const onlineGateways = ["paymob", "paymob_installment", "tabby", "tamara"];
        if (onlineGateways.includes(paymentMethod)) {
          try {
            const { data } = await axiosInstance.post("/payments/create-intent", {
              orderId: order._id,
              paymentMethod,
            });
            // Paymob returns iframeUrl; Tabby/Tamara return paymentUrl.
            const redirectUrl =
              data?.payment?.iframeUrl || data?.payment?.paymentUrl;
            if (redirectUrl) {
              window.location.href = redirectUrl;
              return;
            }
          } catch (payErr) {
            console.error("Payment init failed:", payErr);
            toast.error(t("Couldn't start the payment — your order was saved as pending."));
          }
        }

        toast.success(t("Order placed successfully!"));
        navigate(`/order-confirmation/${order._id}`);
      } else {
        throw new Error("Order creation returned no data");
      }
    } catch (error: any) {
      console.error("Order placement error:", error);

      // Enhanced error handling with specific error types
      let errorMessage =
        "An unexpected error occurred while placing your order";

      if (error?.response) {
        const { status, data } = error.response;

        switch (status) {
          case 400:
            errorMessage = `Validation Error: ${
              data?.message || "Invalid order data provided"
            }`;
            break;
          case 401:
            errorMessage =
              "Authentication Error: Your session has expired. Please log in again";
            break;
          case 403:
            errorMessage =
              "Permission Error: You don't have permission to place this order";
            break;
          case 404:
            errorMessage =
              "Data Error: Some products or addresses could not be found";
            break;
          case 409:
            errorMessage =
              "Conflict Error: Some items may have been modified. Please refresh and try again";
            break;
          case 422:
            errorMessage = `Business Logic Error: ${
              data?.message || "Order cannot be processed"
            }`;
            break;
          case 500:
            errorMessage =
              "Server Error: Our servers are experiencing issues. Please try again later";
            break;
          case 503:
            errorMessage =
              "Service Unavailable: Payment service is temporarily down. Please try again later";
            break;
          default:
            errorMessage = `Server Error (${status}): ${
              data?.message || "Unknown server error"
            }`;
        }
      } else if (error?.request) {
        errorMessage =
          "Network Error: Unable to connect to our servers. Please check your internet connection and try again";
      } else if (error?.message) {
        errorMessage = `Application Error: ${error.message}`;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <PleaseLogin />;
  }

  if (cartItems.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[var(--text)] mb-4">
              {t("Your Cart is Empty")}
            </h2>
            <p className="text-[var(--text-muted)] mb-6">
              {t("Add some products to your cart before checkout.")}
            </p>
            <Link
              to="/brands"
              className="bg-[#FFD600] text-[#333333] px-6 py-3 rounded-md hover:bg-[#e6c100] font-medium"
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
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />

      {/* Two stock photographs of a camera used to sit behind this heading —
          fetched from Unsplash on every checkout, unrelated to what is being
          bought, and pinned to the right so they covered the form in Arabic. */}
      <PageHero
        eyebrow={t("Secure Checkout")}
        title={t("Checkout")}
        subtitle={t("Review your details and confirm your order.")}
        breadcrumb={[
          { label: t("Home"), to: "/" },
          { label: t("Shopping Cart"), to: "/cart" },
          { label: t("Checkout") },
        ]}
      />

      <main className="py-8 sm:py-10 lg:py-12">
        <div className="shell">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
              {/* Billing Address */}
              <div className="bg-[var(--surface)] p-4 sm:p-6 lg:p-8 rounded-lg shadow-sm">
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4 sm:mb-6">
                  {t("Billing Address")}
                </h2>

                {/* Address Selection */}
                {addresses && addresses.length > 0 && (
                  <div className="mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-semibold text-[var(--text)] mb-3 sm:mb-4">
                      {t("Select Shipping Address")}
                    </h3>
                    <div className="space-y-2 sm:space-y-3">
                      {addresses
                        .filter((addr) => addr.type === "Shipping")
                        .map((address) => (
                          <label
                            key={address._id}
                            className="flex items-start p-3 sm:p-4 border border-[var(--border)] rounded-lg cursor-pointer hover:border-blue-300"
                          >
                            <input
                              type="radio"
                              name="shippingAddress"
                              value={address._id}
                              checked={selectedAddressId === address._id}
                              onChange={(e) => {
                                setSelectedAddressId(e.target.value);
                                // Pre-fill billing form with selected address
                                const addr = addresses.find(
                                  (a) => a._id === e.target.value
                                );
                                if (addr) {
                                  const nameParts = addr.name.split(" ");
                                  setBillingData({
                                    ...billingData,
                                    firstName: nameParts[0] || "",
                                    lastName:
                                      nameParts.slice(1).join(" ") || "",
                                    phone: addr.phone || "",
                                    address1: addr.address,
                                    city: addr.city,
                                    state: addr.state || "",
                                    zipCode: addr.zipCode || "",
                                    country: addr.country || "Egypt",
                                  });
                                }
                              }}
                              className="mt-1 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="ml-3">
                              <div className="font-medium text-[var(--text)]">
                                {address.name}
                              </div>
                              <div className="text-sm text-[var(--text-muted)]">
                                {address.address}, {address.city},{" "}
                                {address.state} {address.zipCode}
                              </div>
                              <div className="text-sm text-[var(--text-muted)]">
                                {address.country}
                              </div>
                              {address.phone && (
                                <div className="text-sm text-[var(--text-muted)]">
                                  {t("Phone:")} {address.phone}
                                </div>
                              )}
                            </div>
                          </label>
                        ))}
                    </div>
                    <div className="mt-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="shippingAddress"
                          value=""
                          checked={selectedAddressId === ""}
                          onChange={() => setSelectedAddressId("")}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-[var(--text-muted)]">
                          {t("Use new address")}
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-[var(--text-muted)] mb-1 sm:mb-2">
                        {t("First Name*")}
                      </label>
                      <input
                        type="text"
                        placeholder={t("First Name")}
                        value={billingData.firstName}
                        onChange={(e) =>
                          setBillingData({
                            ...billingData,
                            firstName: e.target.value,
                          })
                        }
                        className="w-full px-2 sm:px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-[var(--text-muted)] mb-1 sm:mb-2">
                        {t("Last Name*")}
                      </label>
                      <input
                        type="text"
                        placeholder={t("Last Name")}
                        value={billingData.lastName}
                        onChange={(e) =>
                          setBillingData({
                            ...billingData,
                            lastName: e.target.value,
                          })
                        }
                        className="w-full px-2 sm:px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-[var(--text-muted)] mb-1 sm:mb-2">
                        {t("Email Address*")}
                      </label>
                      <input
                        type="email"
                        placeholder={t("Email Address")}
                        value={billingData.email}
                        onChange={(e) =>
                          setBillingData({
                            ...billingData,
                            email: e.target.value,
                          })
                        }
                        className="w-full px-2 sm:px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-[var(--text-muted)] mb-1 sm:mb-2">
                        {t("Phone No*")}
                      </label>
                      <input
                        type="tel"
                        placeholder={t("Phone number")}
                        value={billingData.phone}
                        onChange={(e) =>
                          setBillingData({
                            ...billingData,
                            phone: e.target.value,
                          })
                        }
                        className="w-full px-2 sm:px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-[var(--text-muted)] mb-1 sm:mb-2">
                      {t("Company Name")}
                    </label>
                    <input
                      type="text"
                      placeholder={t("Company Name")}
                      value={billingData.company}
                      onChange={(e) =>
                        setBillingData({
                          ...billingData,
                          company: e.target.value,
                        })
                      }
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Map / address picker — fills the fields below */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowMap((s) => !s)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      📍 {showMap ? t("Hide map") : t("Pick address on map")}
                    </button>
                    {showMap && (
                      <div className="mt-3">
                        <Suspense
                          fallback={
                            <div className="text-sm text-[var(--text-muted)]">
                              {t("Loading map…")}
                            </div>
                          }
                        >
                          <AddressMapPicker onSelect={handleMapSelect} />
                        </Suspense>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-[var(--text-muted)] mb-1 sm:mb-2">
                      {t("Address*")}
                    </label>
                    <input
                      type="text"
                      placeholder={t("Address line 1")}
                      value={billingData.address1}
                      onChange={(e) =>
                        setBillingData({
                          ...billingData,
                          address1: e.target.value,
                        })
                      }
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2 sm:mb-3"
                      required
                    />
                    <input
                      type="text"
                      placeholder={t("Address line 2")}
                      value={billingData.address2}
                      onChange={(e) =>
                        setBillingData({
                          ...billingData,
                          address2: e.target.value,
                        })
                      }
                      className="w-full px-2 sm:px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* <div>
                      <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                        Country*
                      </label>
                      <select
                        value={billingData.country}
                        onChange={(e) =>
                          setBillingData({
                            ...billingData,
                            country: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Egypt">Egypt</option>
                      </select>
                    </div> */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-[var(--text-muted)] mb-1 sm:mb-2">
                        {t("Town/City*")}
                      </label>
                      <input
                        type="text"
                        placeholder={t("Town/City")}
                        value={billingData.city}
                        onChange={(e) =>
                          setBillingData({
                            ...billingData,
                            city: e.target.value,
                          })
                        }
                        className="w-full px-2 sm:px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-[var(--text-muted)] mb-1 sm:mb-2">
                        {t("State*")}
                      </label>
                      <input
                        type="text"
                        placeholder={t("State")}
                        value={billingData.state}
                        onChange={(e) =>
                          setBillingData({
                            ...billingData,
                            state: e.target.value,
                          })
                        }
                        className="w-full px-2 sm:px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-[var(--text-muted)] mb-1 sm:mb-2">
                        {t("Zip Code*")}
                      </label>
                      <input
                        type="text"
                        placeholder={t("Zip Code")}
                        value={billingData.zipCode}
                        onChange={(e) =>
                          setBillingData({
                            ...billingData,
                            zipCode: e.target.value,
                          })
                        }
                        className="w-full px-2 sm:px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  {/* <div className="flex items-center space-x-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={billingData.createAccount}
                        onChange={(e) =>
                          setBillingData({
                            ...billingData,
                            createAccount: e.target.checked,
                          })
                        }
                        className="rounded border-[var(--border)] text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-[var(--text-muted)]">
                        Create An Account?
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={billingData.shipToDifferent}
                        onChange={(e) =>
                          setBillingData({
                            ...billingData,
                            shipToDifferent: e.target.checked,
                          })
                        }
                        className="rounded border-[var(--border)] text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-[var(--text-muted)]">
                        Ship To Different Address
                      </span>
                    </label>
                  </div> */}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-[var(--surface)] p-4 sm:p-6 lg:p-8 rounded-lg shadow-sm">
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] mb-4 sm:mb-6">
                  {t("Cart Total")}
                </h2>

                {/* Order Items */}
                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  <div className="flex justify-between font-medium border-b pb-2 text-xs sm:text-sm">
                    <span>{t("Product")}</span>
                    <span>{t("Total")}</span>
                  </div>
                  {cartItems.map((item) => (
                    <div
                      key={`${item.type}-${item.product || item.collection}`}
                      className="flex justify-between text-xs sm:text-sm"
                    >
                      <span>
                        {item.type === "collection"
                          ? item.collectionDetails?.name || t("Bundle")
                          : item.productDetails?.name || t("Product")}{" "}
                        X {item.quantity.toString().padStart(2, "0")}
                      </span>
                      <span>
                        {((getItemPrice(item) * item.quantity)).toLocaleString("en-EG", { maximumFractionDigits: 2 })} {t("EGP")}
                      </span>
                    </div>
                  ))}

                  <div className="border-t pt-3 sm:pt-4 space-y-1 sm:space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span>{t("Sub Total")}</span>
                      <span>{(subtotal).toLocaleString("en-EG", { maximumFractionDigits: 2 })} {t("EGP")}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span>{t("Shipping Fee")}</span>
                      <span>{(shippingFee).toLocaleString("en-EG", { maximumFractionDigits: 2 })} {t("EGP")}</span>
                    </div>
                    {installationFee > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span>🔧 {t("Installation")}</span>
                        <span>{(installationFee).toLocaleString("en-EG", { maximumFractionDigits: 2 })} {t("EGP")}</span>
                      </div>
                    )}
                    <div className="pt-1">
                      <DeliveryEstimate
                        compact
                        governorate={selectedAddress?.state || selectedAddress?.city}
                      />
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm text-green-600">
                        <span>{t("Coupon Discount")}</span>
                        <span>-{(discountAmount).toLocaleString("en-EG", { maximumFractionDigits: 2 })} {t("EGP")}</span>
                      </div>
                    )}
                    {pointsApplied > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm text-amber-600">
                        <span>{t("Loyalty Points")}</span>
                        <span>-{(pointsApplied).toLocaleString("en-EG", { maximumFractionDigits: 2 })} {t("EGP")}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base sm:text-lg font-bold border-t pt-2">
                      <span>{t("Grand Total")}</span>
                      <span>{(grandTotal).toLocaleString("en-EG", { maximumFractionDigits: 2 })} {t("EGP")}</span>
                    </div>
                  </div>

                  {/* Loyalty points redeem */}
                  {pointsBalance > 0 && (
                    <label className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={redeemPoints}
                        disabled={maxRedeemable <= 0}
                        onChange={(e) => setRedeemPoints(e.target.checked)}
                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-xs sm:text-sm text-amber-800">
                        {t("Use {{points}} loyalty points (−{{value}} EGP)", {
                          points: maxRedeemable,
                          value: maxRedeemable.toLocaleString("en-EG", { maximumFractionDigits: 2 }),
                        })}
                        {pointsBalance > maxRedeemable && (
                          <span className="text-amber-600">
                            {" "}
                            {t("(of {{balance}} available)", { balance: pointsBalance })}
                          </span>
                        )}
                      </span>
                    </label>
                  )}
                </div>

                {/* Coupon Code */}
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-[var(--text)] mb-2 sm:mb-4">
                    {t("Coupon Code")}
                  </h3>
                  {!appliedCoupon ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder={t("Enter coupon code")}
                        value={couponCode}
                        onChange={(e) =>
                          setCouponCode(e.target.value.toUpperCase())
                        }
                        className="flex-1 px-2 sm:px-3 py-2 text-sm border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="bg-blue-600 text-white px-4 sm:px-6 py-2 text-sm sm:text-base rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                      >
                        {t("Apply")}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-green-50 p-2 sm:p-3 rounded-lg border border-green-200 gap-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-green-800 font-medium text-sm sm:text-base">
                          {appliedCoupon.code}
                        </span>
                        <span className="text-green-600 text-xs sm:text-sm">
                          (-{(discountAmount).toLocaleString("en-EG", { maximumFractionDigits: 2 })} {t("EGP")})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-red-600 hover:text-red-800 text-xs sm:text-sm"
                      >
                        {t("Remove")}
                      </button>
                    </div>
                  )}
                </div>

                {/* Payment Method */}
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-[var(--text)] mb-2 sm:mb-4">
                    {t("Payment Method")}
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="payment"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                        required
                      />
                      <span className="ml-2 text-xs sm:text-sm text-[var(--text-muted)]">
                        {t("Cash On Delivery")}
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="payment"
                        value="paymob"
                        checked={paymentMethod === "paymob"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs sm:text-sm text-[var(--text-muted)]">
                        {t("Credit / Debit Card")}
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="payment"
                        value="paymob_installment"
                        checked={paymentMethod === "paymob_installment"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs sm:text-sm text-[var(--text-muted)]">
                        {t("Installments (ValU / Souhoola)")}
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="payment"
                        value="tabby"
                        checked={paymentMethod === "tabby"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs sm:text-sm text-[var(--text-muted)]">
                        {t("Tabby — Pay in 4, interest-free")}
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="payment"
                        value="tamara"
                        checked={paymentMethod === "tamara"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-xs sm:text-sm text-[var(--text-muted)]">
                        {t("Tamara — Pay in 3, no interest")}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="mb-4 sm:mb-6">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 h-4 w-4 flex-shrink-0"
                      required
                    />
                    <span className="text-xs sm:text-sm text-[var(--text-muted)]">
                      {t("I've Read And Accept The")}{" "}
                      <Link
                        to="/terms"
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {t("Terms & Conditions")}
                      </Link>
                    </span>
                  </label>
                </div>

                {/* Place Order Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-medium text-sm sm:text-base hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t("PLACING ORDER...") : t("PLACE ORDER")}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutPage;
