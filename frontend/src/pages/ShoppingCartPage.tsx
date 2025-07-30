import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

const ShoppingCartPage: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 'tp-link-m7200',
      name: 'TP-Link M7200 4G LTE Mobile Wi-Fi',
      price: 2220,
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop',
      quantity: 1
    },
    {
      id: 'mercusys-ma30h',
      name: 'MERCUSYS MA30H Dual-band Adapter',
      price: 675,
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop',
      quantity: 2
    },
    {
      id: 'tapo-c110',
      name: 'Tapo C110 3MP Security Camera',
      price: 1025,
      image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=100&h=100&fit=crop',
      quantity: 1
    },
    {
      id: '4',
      name: 'MERCUSYS Halo H30 Mesh Wi-Fi System',
      price: 3300,
      image: 'https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=100&h=100&fit=crop',
      quantity: 1
    }
  ]);

  const [shippingInfo, setShippingInfo] = useState({
    country: 'Bangladesh',
    city: 'Dhaka',
    postcode: ''
  });

  const [couponCode, setCouponCode] = useState('');

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCartItems(items =>
      items.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = 0.00;
  const grandTotal = subtotal + shippingCost;

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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Shopping Cart</h1>
          <nav className="text-sm text-gray-600">
            <Link to="/" className="hover:text-gray-900">Home</Link>
            <span className="mx-2">/</span>
            <span>Shopping Cart</span>
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
          
          {/* Cart Items Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Image</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Product</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Price</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Quantity</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Total</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cartItems.map((item) => (
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
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="px-2 py-1 border border-gray-300 rounded-l-md hover:bg-gray-50"
                          >
                            -
                          </button>
                          <span className="px-4 py-1 border-t border-b border-gray-300 bg-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="px-2 py-1 border border-gray-300 rounded-r-md hover:bg-gray-50"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column - Shipping & Coupon */}
            <div className="space-y-6">
              
              {/* Calculate Shipping */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Calculate Shipping</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <select
                    value={shippingInfo.country}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, country: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Bangladesh">Bangladesh</option>
                    <option value="India">India</option>
                    <option value="Pakistan">Pakistan</option>
                  </select>
                  <select
                    value={shippingInfo.city}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Dhaka">Dhaka</option>
                    <option value="Chittagong">Chittagong</option>
                    <option value="Sylhet">Sylhet</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Postcode / Zip"
                  value={shippingInfo.postcode}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, postcode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                />
                <button className="w-full bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors">
                  ESTIMATE
                </button>
              </div>

              {/* Discount Coupon */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Discount Coupon Code</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon Code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                    APPLY CODE
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Cart Summary */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Cart Summary</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sub Total</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping Cost</span>
                  <span className="font-medium">${shippingCost.toFixed(2)}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Grand Total</span>
                    <span>${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  to="/checkout"
                  className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors text-center block"
                >
                  CHECKOUT
                </Link>
                <button className="w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors">
                  UPDATE CART
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
