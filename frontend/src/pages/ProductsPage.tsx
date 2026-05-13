import React from "react";
import Header from "../components/Header";
import ProductsContent from "../components/ProductsContent";
import Footer from "../components/Footer";
import SEO from "../components/SEO";

const ProductsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SEO
        title="All Products"
        description="Browse the full Belgomla catalog — routers, switches, cables, servers, cameras, and IT accessories from leading brands at competitive prices."
      />
      <Header />
      <main>
        <ProductsContent />
      </main>
      <Footer />
    </div>
  );
};

export default ProductsPage;
