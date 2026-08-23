import React from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import BrandsBanner from '../components/BrandsBanner';
import BrandsContent from '../components/BrandsContent';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

const BrandsPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <SEO
        title={t("Brands", "Brands")}
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
