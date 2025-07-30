import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

const CheckoutPage: React.FC = () => {
  const [billingData, setBillingData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    address1: '',
    address2: '',
    country: 'Bangladesh',
    city: '',
    state: '',
    zipCode: '',
    createAccount: false,
    shipToDifferent: false
  });

  const [paymentMethod, setPaymentMethod] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const orderItems: OrderItem[] = [
    { name: 'TP-Link M7200 4G LTE Mobile Wi-Fi', quantity: 1, price: 2220 },
    { name: 'MERCUSYS MA30H Dual-band Adapter', quantity: 2, price: 675 },
    { name: 'Tapo C110 3MP Security Camera', quantity: 1, price: 1025 },
    { name: 'MERCUSYS Halo H30 Mesh Wi-Fi System', quantity: 1, price: 3300 }
  ];

  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingFee = 0.00;
  const grandTotal = subtotal + shippingFee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }
    if (!acceptTerms) {
      alert('Please accept the terms and conditions');
      return;
    }
    console.log('Order placed:', { billingData, paymentMethod, orderItems });
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Checkout</h1>
          <nav className="text-sm text-gray-600">
            <Link to="/" className="hover:text-gray-900">Home</Link>
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
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing Address</h2>
                
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
                        onChange={(e) => setBillingData({ ...billingData, firstName: e.target.value })}
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
                        onChange={(e) => setBillingData({ ...billingData, lastName: e.target.value })}
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
                        onChange={(e) => setBillingData({ ...billingData, email: e.target.value })}
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
                        onChange={(e) => setBillingData({ ...billingData, phone: e.target.value })}
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
                      onChange={(e) => setBillingData({ ...billingData, company: e.target.value })}
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
                      onChange={(e) => setBillingData({ ...billingData, address1: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Address line 2"
                      value={billingData.address2}
                      onChange={(e) => setBillingData({ ...billingData, address2: e.target.value })}
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
                        onChange={(e) => setBillingData({ ...billingData, country: e.target.value })}
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
                        onChange={(e) => setBillingData({ ...billingData, city: e.target.value })}
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
                        onChange={(e) => setBillingData({ ...billingData, state: e.target.value })}
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
                        onChange={(e) => setBillingData({ ...billingData, zipCode: e.target.value })}
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
                        onChange={(e) => setBillingData({ ...billingData, createAccount: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Create An Account?</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={billingData.shipToDifferent}
                        onChange={(e) => setBillingData({ ...billingData, shipToDifferent: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Ship To Different Address</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-white p-8 rounded-lg shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Cart Total</h2>
                
                {/* Order Items */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between font-medium border-b pb-2">
                    <span>Product</span>
                    <span>Total</span>
                  </div>
                  {orderItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.name} X {item.quantity.toString().padStart(2, '0')}</span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
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
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Grand Total</span>
                      <span>${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
                  <div className="space-y-3">
                    {[
                      { id: 'check', label: 'Check Payment' },
                      { id: 'bank', label: 'Direct Bank Transfer' },
                      { id: 'cod', label: 'Cash On Delivery' },
                      { id: 'paypal', label: 'Paypal' },
                      { id: 'payoneer', label: 'Payoneer' }
                    ].map((method) => (
                      <label key={method.id} className="flex items-center">
                        <input
                          type="radio"
                          name="payment"
                          value={method.id}
                          checked={paymentMethod === method.id}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{method.label}</span>
                      </label>
                    ))}
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
                      I've Read And Accept The{' '}
                      <Link to="/terms" className="text-blue-600 hover:text-blue-800">
                        Terms & Conditions
                      </Link>
                    </span>
                  </label>
                </div>

                {/* Place Order Button */}
                <button
                  type="submit"
                  className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  PLACE ORDER
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
