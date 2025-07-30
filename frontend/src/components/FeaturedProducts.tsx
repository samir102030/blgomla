import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { products } from '../data/productsData';


const featuredProducts = products.slice(0, 8);

const FeaturedProducts: React.FC = () => {
  const [wishlist, setWishlist] = useState<string[]>([]);

  const toggleWishlist = (productId: string) => {
    setWishlist(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={i} className="text-yellow-400">★</span>
      );
    }

    if (hasHalfStar) {
      stars.push(
        <span key="half" className="text-yellow-400">☆</span>
      );
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <span key={`empty-${i}`} className="text-gray-300">☆</span>
      );
    }

    return stars;
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
          
          {/* Promotional banners */}
          <div className="hidden lg:flex space-x-4">
            <div className="bg-blue-100 rounded-lg p-4 w-48">
              <div className="text-center">
                <div className="text-4xl mb-2">📡</div>
                <h3 className="font-semibold text-gray-900">Wi-Fi 6</h3>
                <p className="text-sm text-gray-600">High Speed</p>
              </div>
            </div>
            <div className="bg-green-100 rounded-lg p-4 w-48">
              <div className="text-center">
                <div className="text-4xl mb-2">📹</div>
                <h3 className="font-semibold text-gray-900">Security</h3>
                <p className="text-sm text-gray-600">Smart Cameras</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <div key={product.id} className="group relative bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
              {/* Product Image */}
              <div className="relative overflow-hidden rounded-t-lg bg-gray-100 aspect-square">
                {/* Badges */}
                <div className="absolute top-2 left-2 z-10 flex flex-col space-y-1">
                  {product.isNew && (
                    <span className="bg-black text-white text-xs px-2 py-1 rounded">New</span>
                  )}
                  {product.isOnSale && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">Sale</span>
                  )}
                </div>

                {/* Wishlist Button */}
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="absolute top-2 right-2 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
                >
                  <span className={`text-lg ${wishlist.includes(product.id) ? 'text-red-500' : 'text-gray-400'}`}>
                    {wishlist.includes(product.id) ? '❤️' : '🤍'}
                  </span>
                </button>

                {/* Product Image */}
                <Link to={`/product/${product.id}`}>
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </Link>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <Link to={`/product/${product.id}`}>
                  <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer">
                    {product.name}
                  </h3>
                </Link>
                
                <div className="flex items-center mb-2">
                  <div className="flex items-center">
                    {renderStars(product.rating)}
                  </div>
                  <span className="text-xs text-gray-500 ml-2">({product.reviews})</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-gray-900">
                      {product.price} {product.currency}
                    </span>
                    {product.isOnSale && (
                      <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded">
                        Sale
                      </span>
                    )}
                  </div>
                </div>

                {/* Add to Cart Button */}
                <button className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-300 text-sm font-medium">
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
