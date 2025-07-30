import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getProductById } from '../data/productsData';

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  // Get product from our data
  const product = productId ? getProductById(productId) : null;

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
            <p className="text-gray-600 mb-8">The product you're looking for doesn't exist.</p>
            <Link to="/brands" className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700">
              Browse Products
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Create multiple product images from the single image
  const productImages = [product.image, product.image, product.image, product.image];

  // Generate specifications based on product data
  const specifications = [
    `${product.brand.toUpperCase()} ${product.model}`,
    `Category: ${product.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    `Price: ${product.price} ${product.currency}`,
    `Brand: ${product.brand.toUpperCase()}`,
    `Model: ${product.model}`,
    product.inStock ? 'In Stock' : 'Out of Stock'
  ];

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`text-lg ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}>
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
                <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
              </li>
              <li>
                <span className="text-gray-500">/</span>
              </li>
              <li>
                <Link to="/brands" className="text-gray-500 hover:text-gray-700">Products</Link>
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
                      selectedImage === index ? 'border-blue-500' : 'border-transparent'
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
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
              
              {/* Rating */}
              <div className="flex items-center mb-4">
                <div className="flex items-center">
                  {renderStars(Math.floor(product.rating))}
                </div>
                <span className="ml-2 text-gray-600">({product.reviews} reviews)</span>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-900">{product.price} {product.currency}</span>
                {product.isOnSale && (
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
                  <span className="text-lg font-medium w-12 text-center">{quantity}</span>
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
                <button className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors">
                   Add to Cart
                </button>
                <button className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-md hover:bg-gray-50 transition-colors">
                  ❤️ Add to Wishlist
                </button>
              </div>

              {/* Share */}
              <div className="border-t pt-6">
                <span className="text-sm font-medium text-gray-700 mr-4">Share:</span>
                <div className="inline-flex space-x-2">
                  <button className="text-blue-600 hover:text-blue-700">Facebook</button>
                  <button className="text-blue-400 hover:text-blue-500">Twitter</button>
                  <button className="text-pink-600 hover:text-pink-700">Instagram</button>
                  <button className="text-red-600 hover:text-red-700">Google+</button>
                </div>
              </div>
            </div>
          </div>

          {/* Product Description */}
          <div className="mt-16">
            <div className="border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 pb-4">Product Description</h2>
            </div>
            <div className="py-8">
              <p className="text-gray-700 leading-relaxed">{product.description}</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
