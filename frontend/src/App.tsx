import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect, lazy, Suspense, Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import useNotificationSocket from "./hooks/useNotificationSocket";
import { useUserStore } from "./stores/user.store";
import SiteModeGate from "./components/SiteModeGate";
import CompareBar from "./components/CompareBar";
import FloatingActions from "./components/FloatingActions";
import RequireDashboardAccess from "./components/RequireDashboardAccess";
import { captureError } from "./lib/sentry";

// ── Eagerly loaded (above-the-fold critical path) ──
import HomePage from "./pages/HomePage";

// ── Deferred (off the critical mobile path) ──
// Chat widget, PWA install prompt, and analytics listener mount after first paint
// so the home view's LCP isn't dragged down by socket.io / GA bootstrap.
const GeneralSupportChat = lazy(() => import("./components/GeneralSupportChat"));
const InstallPrompt = lazy(() => import("./components/InstallPrompt"));
const RouteAnalytics = lazy(() => import("./components/RouteAnalytics"));
const ExitIntentPopup = lazy(() => import("./components/ExitIntentPopup"));
const SocialProofToast = lazy(() => import("./components/SocialProofToast"));

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
    // A failed lazy-chunk import after a redeploy isn't a real bug — recover by
    // reloading once (10s guard prevents a loop) instead of showing the error.
    const msg = error?.message || "";
    if (
      /dynamically imported module|Loading chunk|Importing a module script failed/i.test(
        msg
      )
    ) {
      const KEY = "chunk-reload-ts";
      const last = Number(sessionStorage.getItem(KEY) || 0);
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
        return;
      }
    }
    console.error("ErrorBoundary caught:", error, errorInfo);
    captureError(error, { componentStack: errorInfo.componentStack });
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
const DealsPage = lazy(() => import("./pages/DealsPage"));
const StudentsPage = lazy(() => import("./pages/StudentsPage"));
const StudentVerifyPage = lazy(() => import("./pages/StudentVerifyPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const LoginRegisterPage = lazy(() => import("./pages/LoginRegisterPage"));
const ShoppingCartPage = lazy(() => import("./pages/ShoppingCartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrderConfirmationPage = lazy(() => import("./pages/OrderConfirmationPage"));
const OrderTrackingPage = lazy(() => import("./pages/OrderTrackingPage"));
const WishlistPage = lazy(() => import("./pages/WishlistPage"));
const MyAccountPage = lazy(() => import("./pages/MyAccountPage"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const CollectionDetailPage = lazy(() => import("./pages/CollectionDetailPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const NotificationPreferencesPage = lazy(
  () => import("./pages/NotificationPreferencesPage")
);
const VendorRegistrationPage = lazy(() => import("./pages/VendorRegistrationPage"));
const VendorRegistrationSuccess = lazy(() => import("./pages/VendorRegistrationSuccess"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
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
    // Refresh the logged-in user on boot so newly-added fields (e.g. resolved
    // `permissions`) populate even from a previously persisted session.
    const { user, getProfile } = useUserStore.getState();
    if (user?._id) getProfile().catch(() => {});
  }, []);

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
      <Suspense fallback={null}>
        <RouteAnalytics />
      </Suspense>
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <SiteModeGate>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/brands" element={<BrandsPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/deals" element={<DealsPage />} />
          {/* University student programme — a system inside the system. The verify

              route takes no session: the link arrives in a faculty mailbox. */}
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/students/verify/:token" element={<StudentVerifyPage />} />
          <Route path="/product/:productId" element={<ProductDetailPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/login" element={<LoginRegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/cart" element={<ShoppingCartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route
            path="/order-confirmation/:orderId"
            element={<OrderConfirmationPage />}
          />
          <Route
            path="/orders/:orderId/track"
            element={<OrderTrackingPage />}
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
            path="/account/notifications"
            element={<NotificationPreferencesPage />}
          />
          <Route
            path="/vendor-registration"
            element={<VendorRegistrationPage />}
          />
          <Route
            path="/vendor-registration-success"
            element={<VendorRegistrationSuccess />}
          />

          {/* Dashboard Routes */}
          <Route
            path="/dashboard/*"
            element={
              <RequireDashboardAccess>
                <AdminRoutes />
              </RequireDashboardAccess>
            }
          />

          {/* Vendor Routes */}
          <Route
            path="/vendor/*"
            element={
              <RequireDashboardAccess>
                <VendorRoutes />
              </RequireDashboardAccess>
            }
          />
        </Routes>
        </SiteModeGate>
      </Suspense>
      </ErrorBoundary>
      <CompareBar />
      <FloatingActions />
      <Suspense fallback={null}>
        <GeneralSupportChat />
        <InstallPrompt />
        <ExitIntentPopup />
        <SocialProofToast />
      </Suspense>
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
