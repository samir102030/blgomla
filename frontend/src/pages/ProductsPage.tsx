import React from "react";
import Header from "../components/Header";
import ProductsContent from "../components/ProductsContent";
import Footer from "../components/Footer";

const ProductsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <ProductsContent />
      </main>
      <Footer />
    </div>
  );
};

export default ProductsPage;
