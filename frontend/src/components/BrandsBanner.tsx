import React from 'react';
import { Link } from 'react-router-dom';

const BrandsBanner: React.FC = () => {
  return (
    <div className="relative bg-gradient-to-r from-[#002B5B] to-[#004080] text-white py-8 sm:py-12 lg:py-16">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4">
          Brands
        </h1>
        <nav className="text-xs sm:text-sm opacity-90">
          <Link to="/" className="hover:opacity-100">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>Brands</span>
        </nav>
      </div>
    </div>
  );
};

export default BrandsBanner;
