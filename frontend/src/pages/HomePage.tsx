import React from 'react';
import Header from '../components/Header';
import HeroSlider from '../components/HeroSlider';
import FeaturedProducts from '../components/FeaturedProducts';
import Newsletter from '../components/Newsletter';
import Services from '../components/Services';
import Footer from '../components/Footer';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <HeroSlider />
        <FeaturedProducts />
        <Newsletter />
        <Services />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
