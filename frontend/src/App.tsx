
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ContactPage from './pages/ContactPage';
import BrandsPage from './pages/BrandsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoginRegisterPage from './pages/LoginRegisterPage';
import ShoppingCartPage from './pages/ShoppingCartPage';
import CheckoutPage from './pages/CheckoutPage';
import WishlistPage from './pages/WishlistPage';
import MyAccountPage from './pages/MyAccountPage';
import AboutUsPage from './pages/AboutUsPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/brands" element={<BrandsPage />} />
        <Route path="/product/:productId" element={<ProductDetailPage />} />
        <Route path="/login" element={<LoginRegisterPage />} />
        <Route path="/cart" element={<ShoppingCartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/account" element={<MyAccountPage />} />
        <Route path="/about" element={<AboutUsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
