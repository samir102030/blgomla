import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import ShareButtons from "../components/ShareButtons";
import CountdownTimer from "../components/CountdownTimer";
import ProductQuestions from "../components/ProductQuestions";
import ProductRail from "../components/ProductRail";
import AdvertisementBanner from "../components/AdvertisementBanner";
import RecentlyViewed from "../components/RecentlyViewed";
import StockAlert from "../components/StockAlert";
import { addRecentlyViewed } from "../lib/recentlyViewed";
import { trackBehavior } from "../lib/analytics";
import { useProductStore } from "../stores/product.store";
import { useUserStore } from "../stores/user.store";
import { useBrandStore } from "../stores/brand.store";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ProductReview } from "../types/product.type";
import { getBulkPricing } from "../lib/pricing";
import ProductGallery from "../components/ProductGallery";
import { cldImg } from "../lib/cldImage";

const ProductDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState("description");
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const [quantity, setQuantity] = useState(1);

  // Sticky add-to-cart bar — shown once the main buy box scrolls out of view.
  const actionButtonsRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Review eligibility
  const [canReview, setCanReview] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  // Review states
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [editingReview, setEditingReview] = useState<string | null>(null);

  const fetchProductById = useProductStore((state) => state.fetchProductById);
  const product = useProductStore((state) => state.product);
  const loading = useProductStore((state) => state.loading);
  const error = useProductStore((state) => state.error);
  const addToCart = useProductStore((state) => state.addToCart);
  const addReview = useProductStore((state) => state.addReview);
  const updateReview = useProductStore((state) => state.updateReview);
  const deleteReview = useProductStore((state) => state.deleteReview);
  const checkReviewEligibility = useProductStore(
    (state) => state.checkReviewEligibility
  );
  const fetchCart = useUserStore((state) => state.fetchCart);
  const toggleLoveProduct = useUserStore((state) => state.toggleLoveProduct);
  const getLovedProducts = useUserStore((state) => state.getLovedProducts);
  const user = useUserStore((state) => state.user);
  const brands = useBrandStore((state) => state.brands);
  const fetchBrands = useBrandStore((state) => state.fetchBrands);
  console.log("Product details:", product);

  useEffect(() => {
    fetchCart();
    getLovedProducts();
    fetchBrands();
  }, [fetchCart, getLovedProducts, fetchBrands]);

  useEffect(() => {
    if (productId) fetchProductById(productId);
  }, [productId, fetchProductById]);

  // Track this product for the "recently viewed" rail + behavioral analytics.
  useEffect(() => {
    if (product?._id) {
      addRecentlyViewed(product._id);
      trackBehavior("view", { product: product._id });
    }
  }, [product?._id]);

  // Toggle the sticky bar based on whether the main buy box is on screen.
  useEffect(() => {
    const el = actionButtonsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { rootMargin: "0px 0px -80px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product?._id]);

  // Check if the current user purchased this product
  useEffect(() => {
    if (!user || !productId) {
      setCanReview(false);
      setCheckingEligibility(false);
      return;
    }

    let isActive = true;
    const verify = async () => {
      setCheckingEligibility(true);
      try {
        const eligible = await checkReviewEligibility(productId);
        if (isActive) setCanReview(eligible);
      } catch (err) {
        if (isActive) setCanReview(false);
      } finally {
        if (isActive) setCheckingEligibility(false);
      }
    };

    verify();
    return () => {
      isActive = false;
    };
  }, [user?._id, productId, checkReviewEligibility]);

  // Check if product is already in cart
  const isProductInCart = () => {
    if (!user?.cart || !productId) return false;
    return user.cart.some(
      (item) =>
        item.type !== "collection" &&
        item.product &&
        item.product.toString() === productId
    );
  };

  // Get current quantity in cart
  const getCartQuantity = () => {
    if (!user?.cart || !productId) return 0;
    const cartItem = user.cart.find(
      (item) =>
        item.type !== "collection" &&
        item.product &&
        item.product.toString() === productId
    );
    return cartItem ? cartItem.quantity : 0;
  };

  // Check if product is in loved products
  const isProductLoved = () => {
    if (!user?.love || !productId) return false;
    return user.love.some((item) => item.toString() === productId);
  };

  // Check if user has already reviewed this product
  const getUserReview = () => {
    if (!user || !product?.reviews) return null;
    return product.reviews.find((review) => review.user._id === user._id);
  };

  const userReview = getUserReview();

  // Filter reviews based on visibility and ownership
  const getFilteredReviews = () => {
    if (!product?.reviews) return [];
    return product.reviews.filter((review) => {
      // Show visible reviews
      if (review.isVisible !== false) return true;
      // Show hidden reviews only to the review owner
      return user && review.user._id === user._id;
    });
  };

  // Get visible review count for display
  const getVisibleReviewCount = () => {
    if (!product?.reviews) return 0;
    return product.reviews.filter((review) => review.isVisible !== false)
      .length;
  };

  // Handle review submission
  const handleSubmitReview = async () => {
    if (!editingReview && !canReview) {
      toast.error(
        t("Only customers who purchased this product can leave a review.")
      );
      return;
    }
    if (!productId || !reviewComment.trim()) {
      toast.error(t("Please provide a comment for your review"));
      return;
    }

    try {
      if (editingReview) {
        await updateReview(productId, editingReview, {
          rating: reviewRating,
          comment: reviewComment,
        });
        toast.success(t("Review updated successfully!"));
      } else {
        await addReview(productId, {
          rating: reviewRating,
          comment: reviewComment,
        });
        toast.success(t("Review added successfully!"));
      }

      // Refetch the product to ensure we have the latest data
      await fetchProductById(productId);

      setShowReviewForm(false);
      setReviewComment("");
      setReviewRating(5);
      setEditingReview(null);
    } catch (error) {
      console.error("Failed to submit review:", error);
      toast.error(t("Failed to submit review"));
    }
  };

  // Handle review edit
  const handleEditReview = (review: ProductReview) => {
    setEditingReview(review._id);
    setReviewRating(review.rating);
    setReviewComment(review.comment || "");
    setShowReviewForm(true);
  };

  // Handle review delete
  const handleDeleteReview = async (reviewId: string) => {
    if (!productId) return;

    try {
      await deleteReview(productId, reviewId);
      toast.success(t("Review deleted successfully!"));

      // Refetch the product to ensure we have the latest data
      await fetchProductById(productId);
    } catch (error) {
      console.error("Failed to delete review:", error);
      toast.error(t("Failed to delete review"));
    }
  };

  // Handle review form cancel
  const handleCancelReview = () => {
    setShowReviewForm(false);
    setReviewComment("");
    setReviewRating(5);
    setEditingReview(null);
  };

  useEffect(() => {
    if (!canReview && !userReview) {
      setShowReviewForm(false);
    }
  }, [canReview, userReview]);

  const handleLoveProduct = async () => {
    if (!productId) return;

    try {
      await toggleLoveProduct(productId);
      await getLovedProducts();
      toast.success(
        isProductLoved() ? t("Removed from wishlist") : t("Added to wishlist")
      );
    } catch (error) {
      console.error("Failed to update wishlist:", error);
      toast.error(t("Failed to update wishlist"));
    }
  };

  const handleAddToCart = async () => {
    if (!productId) return;
    if (isOutOfStock) {
      toast.error(t("Product is currently out of stock."));
      return;
    }

    try {
      await addToCart(productId, quantity);
      await fetchCart(); // Update user store cart
      toast.success(t("Product added to cart successfully!"));
    } catch (error) {
      console.error("Failed to add product to cart:", error);
      toast.error(t("Failed to add product to cart"));
    }
  };

  const handleGoToCart = () => {
    navigate("/cart");
  };

  if (loading && !product) {
    return (
      <div className="min-h-screen bg-[var(--surface)] flex items-center justify-center">
        <span className="text-lg text-[var(--text-muted)]">{t("Loading...")}</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[var(--surface)]">
        <Header />
        <main className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-2xl font-bold text-[var(--text)] mb-4">
              {t("Product Not Found")}
            </h1>
            <p className="text-[var(--text-muted)] mb-8">
              {t("The product you're looking for doesn't exist.")}
            </p>
            <Link
              to="/brands"
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
            >
              {t("Browse Products")}
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const productName = i18n.language === "ar" && product.nameAr ? product.nameAr : product.name;

  // Use images array from product, fallback to empty array
  const productImages =
    product.images && product.images.length > 0
      ? product.images.map((img) => img.url)
      : ["/placeholder.png"];

  const { unitPrice, baseUnitPrice, applicableRule, rules } = getBulkPricing(
    product,
    quantity
  );
  const stockValue = product.stock ?? 0;
  const hasStockAvailability = stockValue > 0;
  const isOutOfStock = stockValue === 0;
  const stockBadgeText = hasStockAvailability
    ? stockValue <= 5
      ? t("Only {{count}} left in stock", { count: stockValue })
      : t("In Stock")
    : t("Out of Stock");
  const stockBadgeClasses = hasStockAvailability
    ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
    : "text-red-700 bg-red-50 border border-red-100";

  // Generate specifications based on product data
  const getBrandName = (b: any) => {
    if (!b) return "";
    if (typeof b === "object") return b.name || "";
    const brand = brands?.find((br) => br._id === b);
    return brand ? brand.name : b;
  };

  const getCategoryName = (c: any) => {
    if (!c) return "";
    if (typeof c === "object") return c.name || "";
    return c;
  };

  const specifications = [
    product.brand ? t("Brand: {{name}}", { name: getBrandName(product.brand) }) : undefined,
    product.category ? t("Category: {{name}}", { name: getCategoryName(product.category) }) : undefined,
    t("Price: {{price}} EGP", { price: (baseUnitPrice ?? 0).toLocaleString("en-EG", { maximumFractionDigits: 2 }) }),
    ...(product.features || []).map((f) => t("Feature: {{feature}}", { feature: f })),
    ...(product.attributes || []).map((a) => `${a.name}: ${a.value}`),
  ].filter(Boolean);

  // Structured data (schema.org) for Google rich results / Shopping.
  const pageUrl =
    typeof window !== "undefined" ? window.location.href : undefined;
  const brandName = getBrandName(product.brand);
  const reviewCount = Array.isArray(product.reviews)
    ? product.reviews.filter((r) => r.isVisible !== false).length
    : 0;
  const ratingValue = Number(product.rating) || 0;
  const productJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: productImages,
    description: product.description || product.name,
    sku: product._id,
    ...(brandName ? { brand: { "@type": "Brand", name: brandName } } : {}),
    offers: {
      "@type": "Offer",
      url: pageUrl,
      priceCurrency: "EGP",
      price: (baseUnitPrice ?? product.price ?? 0).toFixed(2),
      availability: hasStockAvailability
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "Belgomla" },
    },
    ...(reviewCount > 0 && ratingValue > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: ratingValue.toFixed(1),
            reviewCount,
          },
        }
      : {}),
  };
  const breadcrumbJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("Home"), item: "https://halafawystore-frontend.vercel.app/" },
      { "@type": "ListItem", position: 2, name: t("Products"), item: "https://halafawystore-frontend.vercel.app/products" },
      { "@type": "ListItem", position: 3, name: product.name, item: pageUrl },
    ],
  };

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1) {
      const currentCartQuantity = getCartQuantity();
      const totalQuantity = currentCartQuantity + newQuantity;
      // Only check stock if it's defined and greater than 0
      if (
        product?.stock &&
        product.stock > 0 &&
        totalQuantity > product.stock
      ) {
        toast.error(
          t("Only {{stock}} items available in stock. You already have {{cart}} in cart.", {
            stock: product.stock,
            cart: currentCartQuantity,
          })
        );
        return;
      }
      setQuantity(newQuantity);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-lg ${i < rating ? "text-yellow-400" : "text-gray-300"
          }`}
      >
        ★
      </span>
    ));
  };

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <SEO
        title={productName}
        description={
          (i18n.language === "ar" && product.descriptionAr ? product.descriptionAr : product.description)?.slice(0, 160) ||
          `${productName} — available on Belgomla, Egypt's IT & networking marketplace.`
        }
        image={product.images?.[0]?.url}
        type="product"
        jsonLd={[productJsonLd, breadcrumbJsonLd]}
      />
      <Header />

      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex mb-8" aria-label={t("Breadcrumb")}>
            <ol className="flex items-center space-x-4">
              <li>
                <Link to="/" className="text-[var(--text-subtle)] hover:text-[var(--text)]">
                  {t("Home")}
                </Link>
              </li>
              <li>
                <span className="text-[var(--text-subtle)]">/</span>
              </li>
              <li>
                <Link
                  to="/brands"
                  className="text-[var(--text-subtle)] hover:text-[var(--text)]"
                >
                  {t("Products")}
                </Link>
              </li>
              <li>
                <span className="text-[var(--text-subtle)]">/</span>
              </li>
              <li className="text-[var(--text)] font-medium">{product.name}</li>
            </ol>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Images */}
            <ProductGallery images={productImages} alt={productName} />

            {/* Product Info */}
            <div>
              <h1 className="text-3xl font-bold text-[var(--text)] mb-4">
                {productName}
              </h1>

              {/* Rating */}
              <div className="flex items-center mb-4">
                <div className="flex items-center">
                  {renderStars(Math.floor(product.rating))}
                </div>
                <span className="ml-2 text-[var(--text-muted)]">
                  {t("({{count}} reviews)", { count: getVisibleReviewCount() })}
                </span>
                {(product.soldCount ?? 0) >= 10 && (
                  <span className="ml-3 text-sm font-medium text-amber-600">
                    {(product.soldCount ?? 0) >= 50
                      ? `🔥 ${t("Bestseller")}`
                      : t("{{count}} sold", { count: product.soldCount })}
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-center space-x-3 flex-wrap">
                  <span className="text-3xl font-bold text-[var(--text)]">
                    {(unitPrice ?? 0).toLocaleString("en-EG", { maximumFractionDigits: 2 })}
                    <span className="text-base font-medium text-[var(--text-subtle)] ml-1">{t("EGP")}</span>
                  </span>
                  {product.saleActive &&
                    product.salePercentage &&
                    product.salePercentage > 0 && (
                    <>
                      <span className="text-xl text-[var(--text-subtle)] line-through">
                        {(product.price ?? 0).toLocaleString("en-EG", { maximumFractionDigits: 2 })} {t("EGP")}
                      </span>
                      <span className="bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded">
                        {t("Sale ({{percent}}% off)", { percent: product.salePercentage })}
                      </span>
                    </>
                  )}
                  {!product.saleActive &&
                    applicableRule &&
                    unitPrice < baseUnitPrice && (
                      <span className="text-xl text-[var(--text-subtle)] line-through">
                        {(baseUnitPrice ?? 0).toLocaleString("en-EG", { maximumFractionDigits: 2 })} {t("EGP")}
                      </span>
                    )}
                </div>
                {product.saleActive &&
                  product.saleEndsAt &&
                  new Date(product.saleEndsAt).getTime() > Date.now() && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                      <span className="text-sm font-semibold text-red-600">
                        {t("Sale ends in")}
                      </span>
                      <CountdownTimer targetDate={new Date(product.saleEndsAt)} />
                    </div>
                  )}
                {applicableRule && (
                  <p className="mt-2 text-sm text-green-700">
                    {t("Bulk price applied: {{min}}+ units at {{price}} EGP each.", {
                      min: applicableRule.minQty,
                      price: (applicableRule.unitPrice ?? 0).toLocaleString("en-EG", { maximumFractionDigits: 2 }),
                    })}
                  </p>
                )}
              </div>
              <div className="mb-4">
                <span
                  className={`inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-full ${stockBadgeClasses}`}
                >
                  {stockBadgeText}
                </span>
              </div>

              {/* Specifications */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">{t("Specifications")}</h3>
                <ul className="space-y-2">
                  {specifications.map((spec, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                      <span className="text-[var(--text-muted)]">{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">{t("Tags")}</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-[var(--surface-2)] text-[var(--text)] px-3 py-1 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bulk Pricing */}
              {rules.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">{t("Bulk Pricing")}</h3>
                  <div className="overflow-hidden border border-[var(--border)] rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-[var(--bg)] text-[var(--text-muted)]">
                        <tr>
                          <th className="px-4 py-2 text-left">
                            {t("Buy At Least")}
                          </th>
                          <th className="px-4 py-2 text-left">{t("Unit Price")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {rules.map((rule) => (
                          <tr
                            key={`bulk-${rule.minQty}`}
                            className={
                              applicableRule?.minQty === rule.minQty
                                ? "bg-green-50"
                                : undefined
                            }
                          >
                            <td className="px-4 py-2">{rule.minQty}</td>
                            <td className="px-4 py-2">
                              {(rule.unitPrice ?? 0).toLocaleString("en-EG", { maximumFractionDigits: 2 })} {t("EGP")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  {t("Quantity:")}
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={isProductInCart()}
                    className={`w-10 h-10 border border-[var(--border)] rounded-md flex items-center justify-center hover:bg-[var(--surface-2)] ${isProductInCart() ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                  >
                    -
                  </button>
                  <span className="text-lg font-medium w-12 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={isProductInCart()}
                    className={`w-10 h-10 border border-[var(--border)] rounded-md flex items-center justify-center hover:bg-[var(--surface-2)] ${isProductInCart() ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                  >
                    +
                  </button>
                  {isProductInCart() && (
                    <span className="text-sm text-[var(--text-subtle)] ml-2">
                      {t("Go to cart to change quantity")}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div ref={actionButtonsRef} className="flex space-x-4 mb-8">
                <button
                  onClick={isProductInCart() ? handleGoToCart : handleAddToCart}
                  disabled={loading || (!isProductInCart() && isOutOfStock)}
                  className={`flex-1 py-3 px-6 rounded-md transition-colors ${
                    isProductInCart()
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : isOutOfStock
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {loading
                    ? t("Adding...")
                    : isProductInCart()
                    ? t("In Cart")
                    : isOutOfStock
                    ? t("Out of Stock")
                    : t("Add to Cart")}
                </button>
                <button
                  onClick={handleLoveProduct}
                  disabled={loading}
                  className={`flex-1 py-3 px-6 rounded-md transition-colors ${isProductLoved()
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                    } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isProductLoved()
                    ? t("❤️ Remove from Wishlist")
                    : t("❤️ Add to Wishlist")}
                </button>
              </div>

              {/* Cart Status */}
              {isProductInCart() && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-800 text-sm">
                    {t("This item is already in your cart ({{count}} quantity)", { count: getCartQuantity() })}
                  </p>
                </div>
              )}

              {/* Back-in-stock / price-drop alert */}
              <StockAlert productId={product._id} inStock={stockValue > 0} />

              {/* Share */}
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <ShareButtons title={productName} />
              </div>
            </div>
          </div>

          {/* Product Description & Reviews Tabs */}
          <div className="mt-16">
            <div className="border-b border-[var(--border)] flex space-x-8">
              <button
                className={`pb-4 text-2xl font-bold text-[var(--text)] border-b-2 transition-colors ${tab === "description"
                    ? "border-blue-600"
                    : "border-transparent text-[var(--text-subtle)]"
                  }`}
                onClick={() => setTab("description")}
              >
                {t("Description")}
              </button>
              <button
                className={`pb-4 text-2xl font-bold text-[var(--text)] border-b-2 transition-colors ${tab === "reviews"
                    ? "border-blue-600"
                    : "border-transparent text-[var(--text-subtle)]"
                  }`}
                onClick={() => setTab("reviews")}
              >
                {t("Reviews")}
              </button>
              <button
                className={`pb-4 text-2xl font-bold text-[var(--text)] border-b-2 transition-colors ${tab === "questions"
                    ? "border-blue-600"
                    : "border-transparent text-[var(--text-subtle)]"
                  }`}
                onClick={() => setTab("questions")}
              >
                {t("Q&A")}
              </button>
            </div>
            <div className="py-8">
              {tab === "description" && (
                <p className="text-[var(--text-muted)] leading-relaxed">
                  {product.description}
                </p>
              )}
              {tab === "reviews" && (
                <div>
                  {/* Review Form */}
                  {user ? (
                    <div className="mb-8">
                      {!userReview ? (
                        <div className="mb-4 flex items-center gap-3 flex-wrap">
                          <button
                            onClick={() => setShowReviewForm(true)}
                            disabled={!canReview || checkingEligibility}
                            className={`bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 mb-2 ${!canReview || checkingEligibility
                                ? "opacity-60 cursor-not-allowed"
                                : ""
                              }`}
                          >
                            {checkingEligibility
                              ? t("Checking eligibility...")
                              : t("Write a Review")}
                          </button>
                          {!canReview && !checkingEligibility && (
                            <span className="text-sm text-[var(--text-muted)] bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
                              {t("Only customers who purchased this product can leave a review.")}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="mb-6 p-4 bg-[var(--bg)] rounded-md">
                          <p className="text-[var(--text-muted)] mb-2">
                            {t("You have already reviewed this product.")}
                          </p>
                          <button
                            onClick={() => handleEditReview(userReview!)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mr-2"
                          >
                            {t("Edit Review")}
                          </button>
                          <button
                            onClick={() => handleDeleteReview(userReview!._id)}
                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                          >
                            {t("Delete Review")}
                          </button>
                        </div>
                      )}

                      {showReviewForm && (
                        <div className="bg-[var(--bg)] p-6 rounded-md mb-6">
                          <h3 className="text-lg font-semibold mb-4">
                            {editingReview ? t("Edit Review") : t("Write a Review")}
                          </h3>

                          {/* Rating */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                              {t("Rating:")}
                            </label>
                            <div className="flex space-x-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={() => setReviewRating(star)}
                                  className={`text-2xl ${star <= reviewRating
                                      ? "text-yellow-400"
                                      : "text-gray-300"
                                    }`}
                                >
                                  ★
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Comment */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                              {t("Comment:")}
                            </label>
                            <textarea
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              className="w-full p-3 border border-[var(--border)] rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              rows={4}
                              placeholder={t("Share your experience with this product...")}
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex space-x-3">
                            <button
                              onClick={handleSubmitReview}
                              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                            >
                              {editingReview
                                ? t("Update Review")
                                : t("Submit Review")}
                            </button>
                            <button
                              onClick={handleCancelReview}
                              className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
                            >
                              {t("Cancel")}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-blue-800 mb-3">
                        {t("Please log in to write a review for this product.")}
                      </p>
                      <Link
                        to="/login"
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                      >
                        {t("Login to Review")}
                      </Link>
                    </div>
                  )}

                  {/* Reviews List */}
                  {getFilteredReviews().length > 0 ? (
                    <ul className="space-y-6">
                      {getFilteredReviews().map((review, idx) => (
                        <li key={idx} className="border-b pb-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <img
                                src={
                                  review.user.profilePicture ||
                                  "https://cdn-icons-png.flaticon.com/512/12808/12808894.png"
                                }
                                alt={review.user.name || t("User Avatar")}
                                className="w-10 h-10 rounded-full mr-3"
                               loading="lazy" decoding="async"/>
                              <span className="font-semibold text-[var(--text)] mr-2">
                                {review.user.name || t("Anonymous")}
                              </span>
                              <span className="text-yellow-400">
                                {"★".repeat(review.rating)}
                                {"☆".repeat(5 - review.rating)}
                              </span>
                              {/* Hidden badge for user's own hidden reviews */}
                              {user &&
                                review.user._id === user._id &&
                                review.isVisible === false && (
                                  <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                                    {t("Hidden")}
                                  </span>
                                )}
                            </div>

                            {/* Edit/Delete buttons for user's own review */}
                            {user && review.user._id === user._id && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditReview(review)}
                                  className="text-blue-600 hover:text-blue-700 text-sm"
                                >
                                  {t("Edit")}
                                </button>
                                <button
                                  onClick={() => handleDeleteReview(review._id)}
                                  className="text-red-600 hover:text-red-700 text-sm"
                                >
                                  {t("Delete")}
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-[var(--text-muted)]">{review.comment}</p>
                          {review.createdAt && (
                            <div className="text-xs text-[var(--text-subtle)] mt-1">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-[var(--text-subtle)]">{t("No reviews yet.")}</div>
                  )}
                </div>
              )}
              {tab === "questions" && productId && (
                <ProductQuestions productId={productId} />
              )}
            </div>
          </div>
        </div>
      </main>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdvertisementBanner position="pdp" />
      </div>

      {productId && (
        <ProductRail
          icon="🧩"
          title="Frequently bought together"
          fetchUrl={`/products/${productId}/frequently-bought-together`}
          excludeId={productId}
        />
      )}

      {productId && (
        <ProductRail
          icon="🛍️"
          title="You may also like"
          fetchUrl={`/products/${productId}/related`}
          excludeId={productId}
        />
      )}

      <RecentlyViewed excludeId={productId} />

      {/* Sticky add-to-cart bar — appears once the main buy box scrolls away */}
      <div
        className={`fixed bottom-0 inset-x-0 z-40 bg-[var(--surface)] border-t border-[var(--border)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-transform duration-300 ${
          showStickyBar ? "translate-y-0" : "translate-y-full"
        }`}
        aria-hidden={!showStickyBar}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <img
            src={cldImg(productImages[0], { w: 96 })}
            alt={productName}
            className="w-12 h-12 rounded-lg object-contain bg-[var(--surface-2)] shrink-0 hidden sm:block"
            loading="lazy"
            decoding="async"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text)] truncate">
              {productName}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[var(--text)]">
                {(unitPrice ?? 0).toLocaleString("en-EG", { maximumFractionDigits: 2 })}{" "}
                {t("EGP")}
              </span>
              {product.saleActive &&
                product.salePercentage &&
                product.salePercentage > 0 && (
                  <span className="text-xs text-[var(--text-subtle)] line-through">
                    {(product.price ?? 0).toLocaleString("en-EG", { maximumFractionDigits: 2 })}
                  </span>
                )}
            </div>
          </div>
          <button
            onClick={isProductInCart() ? handleGoToCart : handleAddToCart}
            disabled={loading || (!isProductInCart() && isOutOfStock)}
            className={`shrink-0 py-2.5 px-6 rounded-md font-medium transition-colors ${
              isProductInCart()
                ? "bg-green-600 text-white hover:bg-green-700"
                : isOutOfStock
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading
              ? t("Adding...")
              : isProductInCart()
              ? t("In Cart")
              : isOutOfStock
              ? t("Out of Stock")
              : t("Add to Cart")}
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
