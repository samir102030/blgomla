import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useProductStore } from "../stores/product.store";
import { useUserStore } from "../stores/user.store";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const ProductDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const fetchProductById = useProductStore((state) => state.fetchProductById);
  const product = useProductStore((state) => state.product);
  const loading = useProductStore((state) => state.loading);
  const error = useProductStore((state) => state.error);
  const addToCart = useProductStore((state) => state.addToCart);
  const fetchCart = useUserStore((state) => state.fetchCart);
  const toggleLoveProduct = useUserStore((state) => state.toggleLoveProduct);
  const getLovedProducts = useUserStore((state) => state.getLovedProducts);
  const user = useUserStore((state) => state.user);

  useEffect(() => {
    fetchCart();
    getLovedProducts();
  }, [fetchCart, getLovedProducts]);

  useEffect(() => {
    if (productId) fetchProductById(productId);
  }, [productId, fetchProductById]);

  // Check if product is already in cart
  const isProductInCart = () => {
    if (!user?.cart || !productId) return false;
    return user.cart.some((item) => item.product === productId);
  };

  // Get current quantity in cart
  const getCartQuantity = () => {
    if (!user?.cart || !productId) return 0;
    const cartItem = user.cart.find((item) => item.product === productId);
    return cartItem ? cartItem.quantity : 0;
  };

  // Check if product is in loved products
  const isProductLoved = () => {
    if (!user?.love || !productId) return false;
    return user.love.some((item) => item._id === productId);
  };

  const handleLoveProduct = async () => {
    if (!productId) return;
    
    try {
      await toggleLoveProduct(productId);
      await getLovedProducts();
      toast.success(isProductLoved() ? 'Removed from wishlist' : 'Added to wishlist');
    } catch (error) {
      console.error('Failed to update wishlist:', error);
      toast.error('Failed to update wishlist');
    }
  };

  const handleAddToCart = async () => {
    if (!productId) return;
    if (isProductInCart()) {
      toast("Product already in cart!");

      navigate("/cart");
      return;
    }

    try {
      await addToCart(productId, quantity);
      navigate("/cart");

      // You could add a success notification here
      // console.log("Product added to cart successfully!");
    } catch (error) {
      console.error("Failed to add product to cart:", error);
    }
  };

  if (loading) {
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

  // Generate specifications based on product data
  const specifications = [
    product.brand ? `Brand: ${product.brand}` : undefined,
    product.Category ? `Category: ${product.Category}` : undefined,
    `Price: ${
      product.saleActive && product.salePrice !== undefined
        ? product.salePrice
        : product.price
    }`,
    product.stock > 0 ? "In Stock" : "Out of Stock",
    ...(product.features || []).map((f) => `Feature: ${f}`),
    ...(product.attributes || []).map((a) => `${a.name}: ${a.value}`),
  ].filter(Boolean);

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-lg ${
          i < rating ? "text-yellow-400" : "text-gray-300"
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
                    className={`w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border-2 ${
                      selectedImage === index
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
                  ({product.reviews?.length || 0} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-900">
                  {product.saleActive && product.salePrice !== undefined
                    ? product.salePrice
                    : product.price}
                </span>
                {product.saleActive && (
                  <span className="ml-3 bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded">
                    Sale
                  </span>
                )}
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

              {/* Quantity */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity:
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    className="w-10 h-10 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="text-lg font-medium w-12 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    className="w-10 h-10 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 mb-8">
                <button
                  onClick={handleAddToCart}
                  disabled={loading}
                  className={`flex-1 py-3 px-6 rounded-md transition-colors ${
                    isProductInCart()
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {loading
                    ? "Adding..."
                    : isProductInCart()
                    ? "In Cart"
                    : "Add to Cart"}
                </button>
                <button 
                  onClick={handleLoveProduct}
                  disabled={loading}
                  className={`flex-1 py-3 px-6 rounded-md transition-colors ${
                    isProductLoved()
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isProductLoved() ? "❤️ Remove from Wishlist" : "❤️ Add to Wishlist"}
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

              {/* Share */}
              <div className="border-t pt-6">
                <span className="text-sm font-medium text-gray-700 mr-4">
                  Share:
                </span>
                <div className="inline-flex space-x-2">
                  <button className="text-blue-600 hover:text-blue-700">
                    Facebook
                  </button>
                  <button className="text-blue-400 hover:text-blue-500">
                    Twitter
                  </button>
                  <button className="text-pink-600 hover:text-pink-700">
                    Instagram
                  </button>
                  <button className="text-red-600 hover:text-red-700">
                    Google+
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Product Description */}
          <div className="mt-16">
            <div className="border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 pb-4">
                Product Description
              </h2>
            </div>
            <div className="py-8">
              <p className="text-gray-700 leading-relaxed">
                {product.description}
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
