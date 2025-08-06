import React from 'react';
import ProductCard from '../components/ProductCard';
import { products } from '../data/productsData';
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

        {/* Promo Banners Section */}
        <section className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-lg overflow-hidden shadow hover:shadow-xl transition-shadow duration-300 bg-pink-100 group cursor-pointer">
            <img
              src="public/ban2.jpg"
              alt="Digital Camera With Zoom"
              className="w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-300"
            />
            <div className="p-4 text-center">
              <div className="text-lg font-semibold text-gray-800 mb-1">Mega Sale Offer</div>
              <div className="text-xl font-bold text-gray-900">Digital Camera<br />With Zoom</div>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden shadow hover:shadow-xl transition-shadow duration-300 bg-green-100 group cursor-pointer">
            <img
              src="public/ban1.png"
              alt="Instant Camera With Lens"
              className="w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-300"
            />
            <div className="p-4 text-center">
              <div className="text-lg font-semibold text-gray-800 mb-1">Upto 35% Off</div>
              <div className="text-xl font-bold text-gray-900">Instant Camera<br />With Lens</div>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden shadow hover:shadow-xl transition-shadow duration-300 bg-yellow-100 group cursor-pointer">
            <img
              src="public/p2.jpeg"
              alt="Travel Instant Camera"
              className="w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-300"
            />
            <div className="p-4 text-center">
              <div className="text-lg font-semibold text-gray-800 mb-1">Special Offer 65%</div>
              <div className="text-xl font-bold text-gray-900">Travel Instant<br />Camera</div>
            </div>
          </div>
        </section>

        {/* All Products Section */}
        <section className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-3xl font-bold mb-8 text-gray-900">All Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Left images column */}
            <div className="flex flex-col gap-6 md:col-span-1">
              <div className="rounded-lg overflow-hidden shadow hover:shadow-xl transition-shadow duration-300 bg-blue-100 group cursor-pointer">
                <img
                  src="public/p1.jpeg"
                  alt="Promo Left 1"
                  className="w-full h-56 object-cover transform group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="rounded-lg overflow-hidden shadow hover:shadow-xl transition-shadow duration-300 bg-purple-100 group cursor-pointer">
                <img
                  src="public/p2.jpeg"
                  alt="Promo Left 2"
                  className="w-full h-56 object-cover transform group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
            {/* Products grid: all products, images cycle from /p1.jpeg to /p5.jpeg */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  currency={product.currency}
                  originalPrice={undefined}
                  image={`/p${(idx % 5) + 1}.jpeg`}
                  rating={product.rating}
                  description={product.description}
                  isNew={product.isNew}
                  isOnSale={product.isOnSale}
                />
              ))}
            </div>
          </div>
        </section>

        <FeaturedProducts />
        <Newsletter />
        <Services />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
