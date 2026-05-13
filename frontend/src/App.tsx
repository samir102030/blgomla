import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect, lazy, Suspense, Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import useNotificationSocket from "./hooks/useNotificationSocket";

// ── Eagerly loaded (above-the-fold critical path) ──
import HomePage from "./pages/HomePage";
import GeneralSupportChat from "./components/GeneralSupportChat";
import InstallPrompt from "./components/InstallPrompt";

// ── Error Boundary ──
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", fontFamily: "monospace", background: "#1a1a2e", color: "#e94560", minHeight: "100vh" }}>
          <h1 style={{ color: "#e94560", fontSize: "1.5rem", marginBottom: "1rem" }}>⚠️ Something went wrong</h1>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", color: "#eaeaea", background: "#16213e", padding: "1rem", borderRadius: "8px", fontSize: "0.85rem" }}>
            {this.state.error?.toString()}
            {"\n\n"}
            {this.state.errorInfo?.componentStack}
          </pre>
          <button
            onClick={() => { this.setState({ hasError: false, error: null, errorInfo: null }); window.location.reload(); }}
            style={{ marginTop: "1rem", padding: "0.5rem 1rem", background: "#e94560", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Lazy-loaded pages (code-split into separate chunks) ──
const ContactPage = lazy(() => import("./pages/ContactPage"));
const BrandsPage = lazy(() => import("./pages/BrandsPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const LoginRegisterPage = lazy(() => import("./pages/LoginRegisterPage"));
const ShoppingCartPage = lazy(() => import("./pages/ShoppingCartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrderConfirmationPage = lazy(() => import("./pages/OrderConfirmationPage"));
const WishlistPage = lazy(() => import("./pages/WishlistPage"));
const MyAccountPage = lazy(() => import("./pages/MyAccountPage"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const CollectionDetailPage = lazy(() => import("./pages/CollectionDetailPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const VendorRegistrationPage = lazy(() => import("./pages/VendorRegistrationPage"));
const VendorRegistrationSuccess = lazy(() => import("./pages/VendorRegistrationSuccess"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const AdminRoutes = lazy(() => import("./routes/AdminRoutes"));
const VendorRoutes = lazy(() => import("./routes/VendorRoutes"));

// ── Page Loading Fallback ──
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
    <div className="flex flex-col items-center gap-4 animate-fadeIn">
      <div className="w-10 h-10 border-3 border-[var(--brand-nav)] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-[var(--text-muted)] font-medium">Loading…</p>
    </div>
  </div>
);

function App() {
  const { i18n } = useTranslation();
  useNotificationSocket();

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = lng;
    };

    i18n.on("languageChanged", handleLanguageChange);
    handleLanguageChange(i18n.language); // initial

    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, [i18n]);

  return (
    <Router>
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/collections" element={<CollectionsPage />} />
          <Route
            path="/collections/:collectionId"
            element={<CollectionDetailPage />}
          />
          <Route path="/account" element={<MyAccountPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route
            path="/vendor-registration"
            element={<VendorRegistrationPage />}
          />
          <Route
            path="/vendor-registration-success"
            element={<VendorRegistrationSuccess />}
          />

          {/* Dashboard Routes */}
          <Route path="/dashboard/*" element={<AdminRoutes />} />

          {/* Vendor Routes */}
          <Route path="/vendor/*" element={<VendorRoutes />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
      <GeneralSupportChat />
      <InstallPrompt />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "10px 14px",
            fontSize: "14px",
            boxShadow: "var(--shadow-lg)",
          },
          success: {
            iconTheme: { primary: "#FF6A1A", secondary: "#FFFFFF" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#FFFFFF" },
          },
        }}
      />
    </Router>
  );
}

export default App;
