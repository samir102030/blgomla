import React from "react";
import ProductCard from "../components/ProductCard";
import { products } from "../data/productsData";
import Header from "../components/Header";
import HeroSlider from "../components/HeroSlider";
import FeaturedProducts from "../components/FeaturedProducts";
import Newsletter from "../components/Newsletter";
import Services from "../components/Services";
import Footer from "../components/Footer";
import BrandLogos from "../components/BrandLogos";
import { useUserStore } from "../stores";

const HomePage: React.FC = () => {
  const user = useUserStore((state) => state.user);
  console.log("Current User:", user);
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />
      <main>
        <HeroSlider />

        {/* Brand Logos Section */}
        <BrandLogos />

        {/* Hero Banner Section */}
        <section className="bg-gradient-to-r from-[#FFD600] to-[#e6c100] py-12 mb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-4xl font-bold text-[#333333] mb-4">
                  Back to School Offers
                  <br />
                  <span className="text-3xl">Up to 30% Off</span>
                </h2>
                <p className="text-lg text-[#333333] mb-6">Electronics</p>
                <button className="bg-[#002B5B] text-white px-8 py-3 rounded-lg hover:bg-[#001a3d] transition-colors">
                  Shop Now
                </button>
              </div>
              <div className="flex-1 flex justify-end">
                <img
                  src="p1.jpeg"
                  alt="Electronics Sale"
                  className="max-w-md h-64 object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Product Categories Section */}
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            {[
              { name: "Chromecast", image: "p1.jpeg" },
              { name: "Set Top Box", image: "p2.jpeg" },
              { name: "Gaming Console", image: "p3.jpeg" },
              { name: "Sound System", image: "p4.jpeg" },
              { name: "Apple TV", image: "p5.jpeg" },
              { name: "Smart TV", image: "p1.jpeg" },
            ].map((category, index) => (
              <div
                key={index}
                className="bg-white rounded-full p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="w-20 h-20 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <p className="text-center text-sm font-medium text-gray-700">
                  {category.name}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* All Products Section */}
        <section className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-3xl font-bold mb-8 text-gray-900">
            All Products
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Left images column */}
            <div className="flex flex-col gap-6 md:col-span-1">
              <div className="rounded-lg overflow-hidden shadow hover:shadow-xl transition-shadow duration-300 bg-blue-100 group cursor-pointer">
                <img
                  src="p1.jpeg"
                  alt="Promo Left 1"
                  className="w-full h-56 object-cover transform group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="rounded-lg overflow-hidden shadow hover:shadow-xl transition-shadow duration-300 bg-purple-100 group cursor-pointer">
                <img
                  src="p2.jpeg"
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
                  isFeatured={product.isFeatured}
                  salePercentage={product.salePercentage}
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
