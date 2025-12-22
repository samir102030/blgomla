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
import { useTranslation } from "react-i18next";

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  console.log("Current User:", user);
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />
      <main>
        <HeroSlider />

        {/* Brand Logos Section */}
        <BrandLogos />

        {/* Hero Banner Section */}
        <section className="bg-gradient-to-r from-[#FFD600] to-[#e6c100] dark:from-slate-900 dark:to-slate-800 py-6 sm:py-8 lg:py-12 lg:py-16 mb-4 sm:mb-6 lg:mb-8">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6 lg:gap-8">
              <div className="w-full lg:flex-1 mb-0 lg:mb-0 text-center lg:text-left">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#333333] dark:text-white mb-2 sm:mb-3 lg:mb-4">
                  {t("Back to School Offers")}
                  <br />
                  <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl">
                    {t("Up to 30% Off")}
                  </span>
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-[#333333] dark:text-slate-200 mb-4 sm:mb-6">
                  {t("Electronics")}
                </p>
                <button className="bg-[#002B5B] text-white px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 lg:py-3 rounded-lg hover:bg-[#001a3d] dark:bg-white/10 dark:hover:bg-white/20 transition-colors text-sm sm:text-base">
                  {t("Shop Now")}
                </button>
              </div>
              <div className="w-full lg:flex-1 flex justify-center lg:justify-end">
                <img
                  src="p1.jpeg"
                  alt="Electronics Sale"
                  className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg h-40 sm:h-48 md:h-56 lg:h-64 object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Product Categories Section */}
        <section className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 lg:py-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8 lg:mb-8">
            {[
              { name: t("Chromecast"), image: "p1.jpeg" },
              { name: t("Set Top Box"), image: "p2.jpeg" },
              { name: t("Gaming Console"), image: "p3.jpeg" },
              { name: t("Sound System"), image: "p4.jpeg" },
              { name: t("Apple TV"), image: "p5.jpeg" },
              { name: t("Smart TV"), image: "p1.jpeg" },
            ].map((category, index) => (
              <div
                key={index}
                className="bg-white rounded-full p-2 sm:p-3 lg:p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer dark:bg-slate-900/80 dark:border dark:border-slate-800"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 mx-auto mb-1 sm:mb-2 bg-gray-100 rounded-full flex items-center justify-center dark:bg-slate-800">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 object-contain"
                  />
                </div>
                <p className="text-center text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-200 line-clamp-2">
                  {category.name}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* All Products Section */}
        <section className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-transparent dark:border-slate-800">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 lg:mb-8 text-gray-900 dark:text-white">
            {t("All Products")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {/* Products grid: all products, images cycle from /p1.jpeg to /p5.jpeg */}
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
