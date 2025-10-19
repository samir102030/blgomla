import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useUserStore } from "../stores/user.store";
import { useOrderStore } from "../stores/order.store";
import { useAddressStore } from "../stores/address.store";
import { useCouponStore } from "../stores/coupon.store";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import type { Coupon } from "../types/coupon.type";

interface CartItemWithProduct {
  _id?: string;
  product: string;
  quantity: number;
  productDetails?: {
    _id: string;
    name: string;
    price: number;
    stock: number;
    salePercentage: number;
    saleActive: boolean;
    images: Array<{ url: string; alt?: string }>;
    store?: string; // Store ID
  };
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const user = useUserStore((state) => state.user);
  const fetchCart = useUserStore((state) => state.fetchCart);
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

  // Load cart data and addresses on component mount
  useEffect(() => {
    const loadData = async () => {
      if (user?.cart) {
        try {
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
              } catch (error: any) {
                console.error(`Error fetching product ${item.product}:`, error);
                // Return item with null productDetails to show as unavailable
                return {
                  ...item,
                  productDetails: null,
                };
              }
            })
          );
          setCartItems(itemsWithDetails);
        } catch (error: any) {
          console.error("Error loading cart items:", error);
          toast.error(
            "Cart Loading Error: Some items could not be loaded. Please refresh the page"
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
            "Address Loading Error: Could not load your saved addresses"
          );
        }
      }
    };

    loadData();
  }, [user?.cart, user?._id, fetchUserAddresses]);

  // Calculate prices
  const getItemPrice = (item: CartItemWithProduct) => {
    if (!item.productDetails) return 0;
    return item.productDetails.saleActive
      ? item.productDetails.price *
          (1 - item.productDetails.salePercentage / 100)
      : item.productDetails.price;
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + getItemPrice(item) * item.quantity,
    0
  );
  const shippingFee = 0.0;

  // Calculate coupon discount using store's applied coupon
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

  const discountAmount = calculateCouponDiscount();
  const grandTotal = subtotal + shippingFee - discountAmount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }

    try {
      const cartItemsData = cartItems.map((item) => ({
        product: item.product,
        quantity: item.quantity,
      }));

      const validation = await validateCoupon(
        couponCode.toUpperCase(),
        subtotal,
        cartItemsData
      );

      if (validation && validation.success && validation.coupon) {
        // Apply the coupon by storing it in the coupon store
        // The validation response includes the coupon data
        const couponData: Coupon = {
          _id: validation.coupon._id,
          code: validation.coupon.code,
          discountType: validation.coupon.discountType as
            | "percentage"
            | "fixed",
          discountValue: validation.coupon.discountValue,
          // Add other required fields with defaults
          description: "",
          minimumPurchase: 0,
          maximumDiscount: undefined,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          usageLimit: undefined,
          usageCount: 0,
          isActive: true,
          applicableProducts: [],
          applicableCategories: [],
          store: "",
          createdBy: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Set the applied coupon in the store
        useCouponStore.setState({ appliedCoupon: couponData });

        toast.success(
          `Coupon applied! You saved $${calculateCouponDiscount().toFixed(2)}`
        );
        setCouponCode("");
      } else {
        toast.error("Invalid coupon code");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to apply coupon");
    }
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    setCouponCode("");
    toast.success("Coupon removed");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enhanced validation with specific error messages
    if (!user) {
      toast.error("Authentication Error: Please log in to place an order");
      return;
    }

    if (cartItems.length === 0) {
      toast.error(
        "Cart Error: Your cart is empty. Please add items before checkout"
      );
      return;
    }

    // Check for invalid products
    const invalidItems = cartItems.filter((item) => !item.productDetails);
    if (invalidItems.length > 0) {
      toast.error(
        "Product Error: Some items in your cart are no longer available. Please remove them and try again"
      );
      return;
    }

    // Validate all products belong to the same store
    const stores = cartItems
      .map((item) => item.productDetails?.store)
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
    const outOfStockItems = cartItems.filter(
      (item) => item.productDetails && item.productDetails.stock < item.quantity
    );
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
      toast.error("Payment Error: Please select a payment method to proceed");
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
      toast.error("Email Error: Please enter a valid email address");
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
        const stockCheckPromises = cartItems.map(async (item) => {
          const { data } = await axiosInstance.get(`/products/${item.product}`);
          const currentStock = data.data?.[0]?.stock || 0;
          if (currentStock < item.quantity) {
            throw new Error(
              `Insufficient stock for ${
                data.data?.[0]?.name || "product"
              }. Available: ${currentStock}`
            );
          }
          return data.data?.[0];
        });

        await Promise.all(stockCheckPromises);
      } catch (stockError: any) {
        console.error("Stock validation error:", stockError);
        toast.error(
          `Stock Validation Error: ${stockError.message}. Please refresh the page and try again`
        );
        return;
      }

      // Prepare order data
      const orderData = {
        user: user._id,
        orderItems: cartItems.map((item) => ({
          product: item.product,
          quantity: item.quantity,
        })),
        shippingAddress: shippingAddressId,
        paymentMethod,
        store: storeId,
        itemsPrice: subtotal,
        shippingPrice: shippingFee,
        taxPrice: 0, // You can calculate tax if needed
        totalPrice: grandTotal,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      };

      // Create order
      const order = await createOrder(orderData);

      if (order) {
        toast.success(
          "Order placed successfully! Redirecting to order confirmation..."
        );
        // Clear cart after successful order
        await fetchCart();
        // Navigate to order confirmation or orders page
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
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Please Login to Continue
            </h2>
            <p className="text-gray-600 mb-6">
              You need to be logged in to checkout.
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

  if (cartItems.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Your Cart is Empty
            </h2>
            <p className="text-gray-600 mb-6">
              Add some products to your cart before checkout.
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
            src="https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=1200&h=400&fit=crop"
            alt="Camera"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Checkout</h1>
          <nav className="text-sm text-gray-600">
            <Link to="/" className="hover:text-gray-900">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span>Checkout</span>
          </nav>
        </div>
        {/* Camera Image positioned on the right */}
        <div className="absolute right-0 top-0 h-full w-1/2 hidden lg:block">
          <img
            src="https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=600&h=400&fit=crop"
            alt="Professional Camera"
            className="h-full w-full object-contain"
          />
        </div>
      </div>

      <main className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Billing Address */}
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Billing Address
                </h2>

                {/* Address Selection */}
                {addresses && addresses.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Select Shipping Address
                    </h3>
                    <div className="space-y-3">
                      {addresses
                        .filter((addr) => addr.type === "Shipping")
                        .map((address) => (
                          <label
                            key={address._id}
                            className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300"
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
                              <div className="font-medium text-gray-900">
                                {address.name}
                              </div>
                              <div className="text-sm text-gray-600">
                                {address.address}, {address.city},{" "}
                                {address.state} {address.zipCode}
                              </div>
                              <div className="text-sm text-gray-600">
                                {address.country}
                              </div>
                              {address.phone && (
                                <div className="text-sm text-gray-600">
                                  Phone: {address.phone}
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
                        <span className="ml-2 text-sm text-gray-700">
                          Use new address
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name*
                      </label>
                      <input
                        type="text"
                        placeholder="First Name"
                        value={billingData.firstName}
                        onChange={(e) =>
                          setBillingData({
                            ...billingData,
                            firstName: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name*
                      </label>
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={billingData.lastName}
                        onChange={(e) =>
                          setBillingData({
                            ...billingData,
                            lastName: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address*
                      </label>
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={billingData.email}
                        onChange={(e) =>
                          setBillingData({
                            ...billingData,
                            email: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone No*
                      </label>
                      <input
                        type="tel"
                        placeholder="Phone number"
                        value={billingData.phone}
                        onChange={(e) =>
                          setBillingData({
                            ...billingData,
                            phone: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={billingData.company}
                      onChange={(e) =>
                        setBillingData({
                          ...billingData,
                          company: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address*
                    </label>
                    <input
                      type="text"
                      placeholder="Address line 1"
                      value={billingData.address1}
                      onChange={(e) =>
                        setBillingData({
                          ...billingData,
                          address1: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Address line 2"
                      value={billingData.address2}
                      onChange={(e) =>
                        setBillingData({
                          ...billingData,
                          address2: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Bangladesh">Bangladesh</option>
                        <option value="India">India</option>
                        <option value="Pakistan">Pakistan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Town/City*
                      </label>
                      <input
                        type="text"
                        placeholder="Town/City"
                        value={billingData.city}
                        onChange={(e) =>
                          setBillingData({
                            ...billingData,
                            city: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State*
                      </label>
                      <input
                        type="text"
                        placeholder="State"
                        value={billingData.state}
                        onChange={(e) =>
                          setBillingData({
                            ...billingData,
                            state: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Zip Code*
                      </label>
                      <input
                        type="text"
                        placeholder="Zip Code"
                        value={billingData.zipCode}
                        onChange={(e) =>
                          setBillingData({
                            ...billingData,
                            zipCode: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
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
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
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
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Ship To Different Address
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Cart Total
                </h2>

                {/* Order Items */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between font-medium border-b pb-2">
                    <span>Product</span>
                    <span>Total</span>
                  </div>
                  {cartItems.map((item) => (
                    <div
                      key={item.product}
                      className="flex justify-between text-sm"
                    >
                      <span>
                        {item.productDetails?.name || "Product"} X{" "}
                        {item.quantity.toString().padStart(2, "0")}
                      </span>
                      <span>
                        ${(getItemPrice(item) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Sub Total</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping Fee</span>
                      <span>${shippingFee.toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Coupon Discount</span>
                        <span>-${discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Grand Total</span>
                      <span>${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Coupon Code */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Coupon Code
                  </h3>
                  {!appliedCoupon ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) =>
                          setCouponCode(e.target.value.toUpperCase())
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="flex items-center">
                        <span className="text-green-800 font-medium">
                          {appliedCoupon.code}
                        </span>
                        <span className="text-green-600 ml-2">
                          (-${discountAmount.toFixed(2)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Payment Method */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Payment Method
                  </h3>
                  <div className="space-y-3">
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
                      <span className="ml-2 text-sm text-gray-700">
                        Cash On Delivery
                      </span>
                    </label>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="mb-6">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      required
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      I've Read And Accept The{" "}
                      <Link
                        to="/terms"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Terms & Conditions
                      </Link>
                    </span>
                  </label>
                </div>

                {/* Place Order Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "PLACING ORDER..." : "PLACE ORDER"}
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
