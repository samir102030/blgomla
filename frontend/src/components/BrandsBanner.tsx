import React from 'react';

const BrandsBanner: React.FC = () => {
  return (
    <div className="relative bg-gradient-to-r from-blue-600 to-purple-700 text-white">
      <div className="absolute inset-0 bg-black opacity-20"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Belgomla
          </h1>
          <p className="text-xl md:text-2xl mb-6 opacity-90">
            Your Trusted Partner for Networking Solutions
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 mb-8">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">📡</span>
              </div>
              <span className="text-lg">Wi-Fi Solutions</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">🔒</span>
              </div>
              <span className="text-lg">Security Cameras</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">🌐</span>
              </div>
              <span className="text-lg">Network Equipment</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
              <div className="text-3xl mb-3">🏆</div>
              <h3 className="text-lg font-semibold mb-2">Premium Brands</h3>
              <p className="text-sm opacity-90">TP-Link, MERCUSYS, and Tapo - Leading networking brands</p>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
              <div className="text-3xl mb-3">🚚</div>
              <h3 className="text-lg font-semibold mb-2">Fast Delivery</h3>
              <p className="text-sm opacity-90">Quick and reliable delivery across Egypt</p>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6">
              <div className="text-3xl mb-3">💎</div>
              <h3 className="text-lg font-semibold mb-2">Best Prices</h3>
              <p className="text-sm opacity-90">Competitive pricing with genuine products</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-white opacity-5 rounded-full"></div>
        <div className="absolute top-32 right-20 w-16 h-16 bg-white opacity-5 rounded-full"></div>
        <div className="absolute bottom-20 left-32 w-12 h-12 bg-white opacity-5 rounded-full"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 bg-white opacity-5 rounded-full"></div>
      </div>
    </div>
  );
};

export default BrandsBanner;
