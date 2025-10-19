import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import HomePage from "./pages/HomePage";
import ContactPage from "./pages/ContactPage";
import BrandsPage from "./pages/BrandsPage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import LoginRegisterPage from "./pages/LoginRegisterPage";
import ShoppingCartPage from "./pages/ShoppingCartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import WishlistPage from "./pages/WishlistPage";
import MyAccountPage from "./pages/MyAccountPage";
import AboutUsPage from "./pages/AboutUsPage";
import VendorRegistrationPage from "./pages/VendorRegistrationPage";
import VendorRegistrationSuccess from "./pages/VendorRegistrationSuccess";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
//import DashboardRoutes from './routes/DashboardRoutes';
import AdminRoutes from "./routes/AdminRoutes";
import VendorRoutes from "./routes/VendorRoutes";
import GeneralSupportChat from "./components/GeneralSupportChat";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/brands" element={<BrandsPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/product/:productId" element={<ProductDetailPage />} />
        <Route path="/login" element={<LoginRegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/cart" element={<ShoppingCartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route
          path="/order-confirmation/:orderId"
          element={<OrderConfirmationPage />}
        />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/account" element={<MyAccountPage />} />
        <Route path="/about" element={<AboutUsPage />} />
        <Route
          path="/vendor-registration"
          element={<VendorRegistrationPage />}
        />
        <Route
          path="/vendor-registration-success"
          element={<VendorRegistrationSuccess />}
        />

        {/* Test Route */}
        <Route
          path="/test"
          element={
            <div className="p-8 bg-green-500 text-white text-2xl">
              TEST ROUTE WORKING!
            </div>
          }
        />

        {/* Dashboard Test Route */}
        <Route
          path="/dashboard-test"
          element={
            <div className="p-8 bg-blue-500 text-white text-2xl">
              DASHBOARD TEST WORKING!
            </div>
          }
        />

        {/* Dashboard Routes */}
        <Route path="/dashboard/*" element={<AdminRoutes />} />

        {/* Vendor Routes */}
        <Route path="/vendor/*" element={<VendorRoutes />} />
      </Routes>
      <GeneralSupportChat />
      <Toaster />
    </Router>
  );
}

export default App;
