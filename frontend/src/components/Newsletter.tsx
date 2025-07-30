import React, { useState } from 'react';

const Newsletter: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      console.log('Newsletter subscription:', email);
      setIsSubmitted(true);
      setEmail('');
      
      setTimeout(() => {
        setIsSubmitted(false);
      }, 3000);
    }
  };

  return (
    <section className="relative py-16 bg-gradient-to-r from-gray-100 to-gray-200 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-20 h-20 bg-blue-500 rounded-full"></div>
        <div className="absolute top-32 right-20 w-16 h-16 bg-purple-500 rounded-full"></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-yellow-500 rounded-full"></div>
        <div className="absolute bottom-32 right-1/3 w-8 h-8 bg-green-500 rounded-full"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              SUBSCRIBE OUR NEWSLETTER
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              GET UPDATE FOR NEWS, OFFERS
            </p>

            {/* Newsletter Form */}
            <form onSubmit={handleSubmit} className="max-w-md mx-auto lg:mx-0">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email here"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 font-medium flex items-center justify-center"
                >
                  <span className="mr-2">✈️</span>
                  Subscribe
                </button>
              </div>
              
              {isSubmitted && (
                <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                  <p className="text-green-700 text-sm">
                    ✅ Thank you for subscribing to our newsletter!
                  </p>
                </div>
              )}
            </form>

            {/* Additional Info */}
            <p className="text-sm text-gray-500 mt-4">
              Join Belgomla family
            </p>
          </div>

          {/* Camera Image */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              {/* Main Router Placeholder */}
              <div className="w-80 h-64 md:w-96 md:h-80 bg-gray-800 rounded-lg shadow-2xl flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="text-center text-white">
                  <div className="text-6xl mb-4">📡</div>
                  <p className="text-xl font-bold">TP-Link AX10</p>
                  <p className="text-sm opacity-75">Wi-Fi 6 Router</p>

                  {/* Router Details */}
                  <div className="mt-4 text-xs opacity-60">
                    <p>AX1500 Dual Band Wi-Fi 6</p>
                    <p>Advanced Security Features</p>
                    <p>Easy Setup & Management</p>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-6 -left-6 w-12 h-12 bg-blue-500 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-purple-500 rounded-full opacity-30 animate-pulse delay-1000"></div>
              <div className="absolute top-1/2 -right-8 w-6 h-6 bg-yellow-500 rounded-full opacity-40 animate-pulse delay-500"></div>
              
              {/* Floating Icons */}
              <div className="absolute top-10 -left-10 text-2xl animate-bounce">📸</div>
              <div className="absolute bottom-10 -right-10 text-2xl animate-bounce delay-300">🎯</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
