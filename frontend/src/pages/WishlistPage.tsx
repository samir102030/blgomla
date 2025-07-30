import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image: string;
}

const WishlistPage: React.FC = () => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([
    {
      id: 'tp-link-m7200',
      name: 'TP-Link M7200 4G LTE Mobile Wi-Fi',
      price: 2220,
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop'
    },
    {
      id: 'mercusys-ma30h',
      name: 'MERCUSYS MA30H Dual-band Adapter',
      price: 675,
      image: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=100&h=100&fit=crop'
    },
    {
      id: 'tapo-c110',
      name: 'Tapo C110 3MP Security Camera',
      price: 1025,
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop'
    },
    {
      id: 'mercusys-halo-h30',
      name: 'MERCUSYS Halo H30 Mesh Wi-Fi System',
      price: 3300,
      image: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=100&h=100&fit=crop'
    }
  ]);

  const [quantities, setQuantities] = useState<Record<string, number>>({
    'tp-link-m7200': 1,
    'mercusys-ma30h': 1,
    'tapo-c110': 1,
    'mercusys-halo-h30': 1
  });

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setQuantities(prev => ({ ...prev, [id]: newQuantity }));
  };

  const removeItem = (id: string) => {
    setWishlistItems(items => items.filter(item => item.id !== id));
    setQuantities(prev => {
      const newQuantities = { ...prev };
      delete newQuantities[id];
      return newQuantities;
    });
  };

  const addToCart = (id: string) => {
    console.log(`Adding item ${id} to cart with quantity ${quantities[id]}`);
    // Here you would typically add the item to cart
    alert('Item added to cart!');
  };

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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Wishlist</h1>
          <nav className="text-sm text-gray-600">
            <Link to="/" className="hover:text-gray-900">Home</Link>
            <span className="mx-2">/</span>
            <span>Wishlist</span>
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
          
          {wishlistItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-gray-400 text-6xl mb-4">💝</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Wishlist is Empty</h2>
              <p className="text-gray-600 mb-8">Add some products to your wishlist to see them here.</p>
              <Link
                to="/brands"
                className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Image</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Product</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Price</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Quantity</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Add to Cart</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {wishlistItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">${item.price}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <button
                              onClick={() => updateQuantity(item.id, quantities[item.id] - 1)}
                              className="px-2 py-1 border border-gray-300 rounded-l-md hover:bg-gray-50"
                            >
                              -
                            </button>
                            <span className="px-4 py-1 border-t border-b border-gray-300 bg-white">
                              {quantities[item.id]}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, quantities[item.id] + 1)}
                              className="px-2 py-1 border border-gray-300 rounded-r-md hover:bg-gray-50"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => addToCart(item.id)}
                            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                          >
                            ADD TO CART
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Action Buttons */}
              <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
                <Link
                  to="/brands"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  ← Continue Shopping
                </Link>
                <div className="space-x-4">
                  <button
                    onClick={() => {
                      wishlistItems.forEach(item => addToCart(item.id));
                    }}
                    className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Add All to Cart
                  </button>
                  <button
                    onClick={() => {
                      setWishlistItems([]);
                      setQuantities({});
                    }}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Clear Wishlist
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Related Products or Recommendations */}
          {wishlistItems.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">You Might Also Like</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="aspect-square bg-gray-100">
                      <img
                        src={`https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=300&h=300&fit=crop&sig=${i}`}
                        alt={`Recommended Product ${i}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 mb-2">Camera Model {i}</h3>
                      <p className="text-lg font-bold text-gray-900">${(199 + i * 50).toFixed(2)}</p>
                      <button className="w-full mt-3 bg-black text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                        Add to Wishlist
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default WishlistPage;
