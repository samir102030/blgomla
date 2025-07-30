import React from 'react';
import Header from '../components/Header';
import BrandsBanner from '../components/BrandsBanner';
import BrandsContent from '../components/BrandsContent';
import Footer from '../components/Footer';

const BrandsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <BrandsBanner />
        <BrandsContent />
      </main>
      <Footer />
    </div>
  );
};

export default BrandsPage;
