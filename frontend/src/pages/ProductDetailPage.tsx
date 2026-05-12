import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useProductStore } from "../stores/product.store";
import { useUserStore } from "../stores/user.store";
import { useBrandStore } from "../stores/brand.store";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import type { ProductReview } from "../types/product.type";
import { getBulkPricing } from "../lib/pricing";

const ProductDetailPage: React.FC = () => {
  const [tab, setTab] = useState("description");
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

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
        "Only customers who purchased this product can leave a review"
      );
      return;
    }
    if (!productId || !reviewComment.trim()) {
      toast.error("Please provide a comment for your review");
      return;
    }

    try {
      if (editingReview) {
        await updateReview(productId, editingReview, {
          rating: reviewRating,
          comment: reviewComment,
        });
        toast.success("Review updated successfully!");
      } else {
        await addReview(productId, {
          rating: reviewRating,
          comment: reviewComment,
        });
        toast.success("Review added successfully!");
      }

      // Refetch the product to ensure we have the latest data
      await fetchProductById(productId);

      setShowReviewForm(false);
      setReviewComment("");
      setReviewRating(5);
      setEditingReview(null);
    } catch (error) {
      console.error("Failed to submit review:", error);
      toast.error("Failed to submit review");
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
      toast.success("Review deleted successfully!");

      // Refetch the product to ensure we have the latest data
      await fetchProductById(productId);
    } catch (error) {
      console.error("Failed to delete review:", error);
      toast.error("Failed to delete review");
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
        isProductLoved() ? "Removed from wishlist" : "Added to wishlist"
      );
    } catch (error) {
      console.error("Failed to update wishlist:", error);
      toast.error("Failed to update wishlist");
    }
  };

  const handleAddToCart = async () => {
    if (!productId) return;
    if (isOutOfStock) {
      toast.error("Product is currently out of stock.");
      return;
    }

    try {
      await addToCart(productId, quantity);
      await fetchCart(); // Update user store cart
      toast.success("Product added to cart successfully!");
    } catch (error) {
      console.error("Failed to add product to cart:", error);
      toast.error("Failed to add product to cart");
    }
  };

  const handleGoToCart = () => {
    navigate("/cart");
  };

  if (loading && !product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="text-lg text-gray-600">Loading...</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Product Not Found
            </h1>
            <p className="text-gray-600 mb-8">
              The product you're looking for doesn't exist.
            </p>
            <Link
              to="/brands"
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
            >
              Browse Products
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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
      ? `Only ${stockValue} left in stock`
      : "In Stock"
    : "Out of Stock";
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
    product.brand ? `Brand: ${getBrandName(product.brand)}` : undefined,
    product.category ? `Category: ${getCategoryName(product.category)}` : undefined,
    `Price: $${(baseUnitPrice ?? 0).toFixed(2)}`,
    ...(product.features || []).map((f) => `Feature: ${f}`),
    ...(product.attributes || []).map((a) => `${a.name}: ${a.value}`),
  ].filter(Boolean);

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
          `Only ${product.stock} items available in stock. You already have ${currentCartQuantity} in cart.`
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
    <div className="min-h-screen bg-white">
      <Header />

      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex mb-8" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <Link to="/" className="text-gray-500 hover:text-gray-700">
                  Home
                </Link>
              </li>
              <li>
                <span className="text-gray-500">/</span>
              </li>
              <li>
                <Link
                  to="/brands"
                  className="text-gray-500 hover:text-gray-700"
                >
                  Products
                </Link>
              </li>
              <li>
                <span className="text-gray-500">/</span>
              </li>
              <li className="text-gray-900 font-medium">{product.name}</li>
            </ol>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Images */}
            <div>
              {/* Main Image */}
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                <img
                  src={productImages[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Thumbnail Images */}
              <div className="flex space-x-2">
                {productImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border-2 ${selectedImage === index
                        ? "border-blue-500"
                        : "border-transparent"
                      }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center mb-4">
                <div className="flex items-center">
                  {renderStars(Math.floor(product.rating))}
                </div>
                <span className="ml-2 text-gray-600">
                  ({getVisibleReviewCount()} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-center space-x-3 flex-wrap">
                  <span className="text-3xl font-bold text-gray-900">
                    ${(unitPrice ?? 0).toFixed(2)}
                  </span>
                  {product.saleActive &&
                    product.salePercentage &&
                    product.salePercentage > 0 && (
                    <>
                      <span className="text-xl text-gray-500 line-through">
                        ${(product.price ?? 0).toFixed(2)}
                      </span>
                      <span className="bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded">
                        Sale ({product.salePercentage}% off)
                      </span>
                    </>
                  )}
                  {!product.saleActive &&
                    applicableRule &&
                    unitPrice < baseUnitPrice && (
                      <span className="text-xl text-gray-500 line-through">
                        ${(baseUnitPrice ?? 0).toFixed(2)}
                      </span>
                    )}
                </div>
                {applicableRule && (
                  <p className="mt-2 text-sm text-green-700">
                    Bulk price applied: {applicableRule.minQty}+ units at $
                    {(applicableRule.unitPrice ?? 0).toFixed(2)} each.
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
                <h3 className="text-lg font-semibold mb-4">Specifications</h3>
                <ul className="space-y-2">
                  {specifications.map((spec, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                      <span className="text-gray-700">{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm"
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
                  <h3 className="text-lg font-semibold mb-4">Bulk Pricing</h3>
                  <div className="overflow-hidden border border-gray-200 rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left">
                            Buy At Least
                          </th>
                          <th className="px-4 py-2 text-left">Unit Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
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
                              ${(rule.unitPrice ?? 0).toFixed(2)}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity:
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={isProductInCart()}
                    className={`w-10 h-10 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50 ${isProductInCart() ? "opacity-50 cursor-not-allowed" : ""
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
                    className={`w-10 h-10 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50 ${isProductInCart() ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                  >
                    +
                  </button>
                  {isProductInCart() && (
                    <span className="text-sm text-gray-500 ml-2">
                      Go to cart to change quantity
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 mb-8">
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
                    ? "Adding..."
                    : isProductInCart()
                    ? "In Cart"
                    : isOutOfStock
                    ? "Out of Stock"
                    : "Add to Cart"}
                </button>
                <button
                  onClick={handleLoveProduct}
                  disabled={loading}
                  className={`flex-1 py-3 px-6 rounded-md transition-colors ${isProductLoved()
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                    } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isProductLoved()
                    ? "❤️ Remove from Wishlist"
                    : "❤️ Add to Wishlist"}
                </button>
              </div>

              {/* Cart Status */}
              {isProductInCart() && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-800 text-sm">
                    This item is already in your cart ({getCartQuantity()}{" "}
                    quantity)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Product Description & Reviews Tabs */}
          <div className="mt-16">
            <div className="border-b border-gray-200 flex space-x-8">
              <button
                className={`pb-4 text-2xl font-bold text-gray-900 border-b-2 transition-colors ${tab === "description"
                    ? "border-blue-600"
                    : "border-transparent text-gray-500"
                  }`}
                onClick={() => setTab("description")}
              >
                Description
              </button>
              <button
                className={`pb-4 text-2xl font-bold text-gray-900 border-b-2 transition-colors ${tab === "reviews"
                    ? "border-blue-600"
                    : "border-transparent text-gray-500"
                  }`}
                onClick={() => setTab("reviews")}
              >
                Reviews
              </button>
            </div>
            <div className="py-8">
              {tab === "description" && (
                <p className="text-gray-700 leading-relaxed">
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
                              ? "Checking eligibility..."
                              : "Write a Review"}
                          </button>
                          {!canReview && !checkingEligibility && (
                            <span className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
                              Only customers who purchased this product can
                              leave a review.
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="mb-6 p-4 bg-gray-50 rounded-md">
                          <p className="text-gray-600 mb-2">
                            You have already reviewed this product.
                          </p>
                          <button
                            onClick={() => handleEditReview(userReview!)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mr-2"
                          >
                            Edit Review
                          </button>
                          <button
                            onClick={() => handleDeleteReview(userReview!._id)}
                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                          >
                            Delete Review
                          </button>
                        </div>
                      )}

                      {showReviewForm && (
                        <div className="bg-gray-50 p-6 rounded-md mb-6">
                          <h3 className="text-lg font-semibold mb-4">
                            {editingReview ? "Edit Review" : "Write a Review"}
                          </h3>

                          {/* Rating */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Rating:
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Comment:
                            </label>
                            <textarea
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              rows={4}
                              placeholder="Share your experience with this product..."
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex space-x-3">
                            <button
                              onClick={handleSubmitReview}
                              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                            >
                              {editingReview
                                ? "Update Review"
                                : "Submit Review"}
                            </button>
                            <button
                              onClick={handleCancelReview}
                              className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-blue-800 mb-3">
                        Please log in to write a review for this product.
                      </p>
                      <Link
                        to="/login"
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                      >
                        Login to Review
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
                                alt={review.user.name || "User Avatar"}
                                className="w-10 h-10 rounded-full mr-3"
                              />
                              <span className="font-semibold text-gray-900 mr-2">
                                {review.user.name || "Anonymous"}
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
                                    Hidden
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
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteReview(review._id)}
                                  className="text-red-600 hover:text-red-700 text-sm"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-gray-700">{review.comment}</p>
                          {review.createdAt && (
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-500">No reviews yet.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
