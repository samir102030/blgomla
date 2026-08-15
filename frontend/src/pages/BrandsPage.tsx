import React from 'react';
import Header from '../components/Header';
import BrandsBanner from '../components/BrandsBanner';
import BrandsContent from '../components/BrandsContent';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

const BrandsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <SEO
        title="Brands"
        description="Shop products from the leading IT and networking brands on Belgomla — TP-Link, Cisco, Hikvision, Ubiquiti and more."
      />
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
