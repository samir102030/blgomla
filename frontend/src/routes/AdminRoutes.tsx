import React from "react";
import { Routes, Route } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout";
import AdminDashboard from "../pages/admin/AdminDashboard";
import OrdersPage from "../pages/admin/OrdersPage";
import ProductsPage from "../pages/admin/ProductsPage";
import UsersPage from "../pages/admin/UsersPage";
import CategoriesPage from "../pages/admin/CategoriesPage";
import BrandsPage from "../pages/admin/BrandsPage";
import SalesPage from "../pages/admin/SalesPage";
import CustomerReviewsPage from "../pages/admin/CustomerReviewsPage";
import CustomerSupportPage from "../pages/admin/CustomerSupportPage";
import VendorManagement from "../pages/admin/vendors/VendorManagement";
import CouponsPage from "../pages/vendor/CouponsPage";
import RequestsPage from "../pages/admin/RequestsPage";
import ReturnsPage from "../pages/admin/ReturnsPage";
import VendorCollectionsPage from "../pages/vendor/VendorCollectionsPage";
import AdminCollectionsPage from "../pages/admin/AdminCollectionsPage";
import AdvertisementsPage from "../pages/admin/AdvertisementsPage";
import MosaicPage from "../pages/admin/MosaicPage";
import LayoutPage from "../pages/admin/LayoutPage";
import ProductApprovalsPage from "../pages/admin/ProductApprovalsPage";
import PaymentManagementPage from "../pages/admin/PaymentManagementPage";
import PaymobChannelsPage from "../pages/admin/PaymobChannelsPage";
import InventoryAlertsPage from "../pages/admin/InventoryAlertsPage";
import StockRequestsPage from "../pages/admin/StockRequestsPage";
import CustomerAnalyticsPage from "../pages/admin/CustomerAnalyticsPage";
import VisitorAnalyticsPage from "../pages/admin/VisitorAnalyticsPage";
import QuotationsPage from "../pages/admin/QuotationsPage";
import InstallationOrdersPage from "../pages/admin/InstallationOrdersPage";
import StorefrontVisibilityPage from "../pages/admin/StorefrontVisibilityPage";
import { useUserStore } from "../stores/user.store";
import AdminsPage from "../pages/admin/AdminsPage";
import SiteModePage from "../pages/admin/SiteModePage";
import ShippingSettingsPage from "../pages/admin/ShippingSettingsPage";
import AccurateSettingsPage from "../pages/admin/AccurateSettingsPage";
import PayoutsPage from "../pages/admin/PayoutsPage";
import AuditLogPage from "../pages/admin/AuditLogPage";
import RolesAccessPage from "../pages/admin/RolesAccessPage";
import DataResetPage from "../pages/admin/DataResetPage";
import StudentsLayout from "../pages/admin/students/StudentsLayout";
import StudentsOverviewPage from "../pages/admin/students/StudentsOverviewPage";
import StudentsProductsPage from "../pages/admin/students/StudentsProductsPage";
import StudentsCategoriesPage from "../pages/admin/students/StudentsCategoriesPage";
import StudentsFacultiesPage from "../pages/admin/students/StudentsFacultiesPage";
import StudentsMembersPage from "../pages/admin/students/StudentsMembersPage";
import StudentsOfferPage from "../pages/admin/students/StudentsOfferPage";
import { RequirePermission } from "../components/Can";

const PlaceholderPage: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
  <div className="flex items-center justify-center min-h-96">
    <div className="text-center">
 <div className="text-6xl mb-4"></div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600">{description}</p>
    </div>
  </div>
);

const AdminRoutes: React.FC = () => {
  const user = useUserStore((s) => s.user);
  const isVendor = user?.role === "store";

  return (
    <AdminLayout>
      <Routes>
        {/* Main Dashboard */}
        <Route path="/" element={<AdminDashboard />} />

        {/* Vendor Management */}
        <Route path="/vendors" element={<VendorManagement />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/approvals" element={<ProductApprovalsPage />} />
        <Route path="/admins" element={<AdminsPage />} />

        {/* E-commerce */}
        <Route path="/category" element={<CategoriesPage />} />
        <Route path="/brands" element={<BrandsPage />} />
        <Route
          path="/storefront-visibility"
          element={
            <RequirePermission perm="categories.manage">
              <StorefrontVisibilityPage />
            </RequirePermission>
          }
        />
        <Route path="/coupons" element={<CouponsPage />} />
        {/* The student module. Reading the section and changing it are
            different levels of trust, so the shelf and the terms sit behind
            `students.configure` while the overview and the roll only need
            `students.view`. */}
        {/* Nested under a layout so every page of the module inherits the one
            thing all six of them forgot when the single screen was split: a
            refusal from the server shows up on screen. */}
        <Route path="/electronics" element={<StudentsLayout />}>
          <Route
            index
            element={
              <RequirePermission perm="students.view">
                <StudentsOverviewPage />
              </RequirePermission>
            }
          />
          <Route
            path="products"
            element={
              <RequirePermission perm="students.configure">
                <StudentsProductsPage />
              </RequirePermission>
            }
          />
          <Route
            path="categories"
            element={
              <RequirePermission perm="students.configure">
                <StudentsCategoriesPage />
              </RequirePermission>
            }
          />
          <Route
            path="offer"
            element={
              <RequirePermission perm="students.configure">
                <StudentsOfferPage />
              </RequirePermission>
            }
          />
          <Route
            path="faculties"
            element={
              <RequirePermission perm="students.configure">
                <StudentsFacultiesPage />
              </RequirePermission>
            }
          />
          <Route
            path="members"
            element={
              <RequirePermission perm="students.view">
                <StudentsMembersPage />
              </RequirePermission>
            }
          />
        </Route>
        <Route
          path="/attributes"
          element={
            <PlaceholderPage
              title="Product Attributes"
              description="Manage product attributes and specifications"
            />
          }
        />
        <Route path="/order" element={<OrdersPage />} />
        <Route path="/returns" element={<ReturnsPage />} />
        <Route path="/vendor-collections" element={<VendorCollectionsPage />} />

        {/* Products */}
        <Route path="/products" element={<ProductsPage />} />

        {/* Collections */}
        <Route
          path="/collections"
          element={isVendor ? <VendorCollectionsPage /> : <AdminCollectionsPage />}
        />

        {/* User Management */}
        <Route path="/user" element={<UsersPage />} />

        {/* Customer Reviews */}
        <Route path="/reviews" element={<CustomerReviewsPage />} />

        {/* Customer Support */}
        <Route path="/support" element={<CustomerSupportPage />} />

        {/* Sales & Analytics */}
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/payments" element={<PaymentManagementPage />} />
        <Route
          path="/paymob-channels"
          element={
            <RequirePermission perm="payments.channels">
              <PaymobChannelsPage />
            </RequirePermission>
          }
        />
        <Route path="/inventory" element={<InventoryAlertsPage />} />
        <Route path="/stock-requests" element={<StockRequestsPage />} />
        <Route path="/customers" element={<CustomerAnalyticsPage />} />
        <Route path="/visitors" element={<VisitorAnalyticsPage />} />
        <Route
          path="/quotations"
          element={
            <RequirePermission perm="quotations.view">
              <QuotationsPage />
            </RequirePermission>
          }
        />
        <Route
          path="/installations"
          element={
            <RequirePermission perm="installations.view">
              <InstallationOrdersPage />
            </RequirePermission>
          }
        />
        <Route
          path="/report"
          element={
            <PlaceholderPage
              title="Reports"
              description="Comprehensive reporting and analysis"
            />
          }
        />

        {/* Site Mode */}
        <Route path="/site-mode" element={<SiteModePage />} />

        {/* Shipping */}
        <Route path="/shipping" element={<ShippingSettingsPage />} />
        <Route path="/accurate" element={<AccurateSettingsPage />} />
        <Route path="/payouts" element={<PayoutsPage />} />
        <Route path="/audit-log" element={<AuditLogPage />} />
        {/* Super-admin only; the page checks the role itself and the API
            enforces it again. */}
        <Route path="/data-reset" element={<DataResetPage />} />
        <Route
          path="/roles"
          element={
            <RequirePermission perm="roles.manage">
              <RolesAccessPage />
            </RequirePermission>
          }
        />

        {/* Content Management */}
        <Route path="/advertisements" element={<AdvertisementsPage />} />
        <Route path="/mosaic" element={<MosaicPage />} />
        <Route
          path="/layout"
          element={
            <RequirePermission perm="layout.manage">
              <LayoutPage />
            </RequirePermission>
          }
        />
        <Route
          path="/gallery"
          element={
            <PlaceholderPage
              title="Gallery Management"
              description="Manage media files and images"
            />
          }
        />
        <Route
          path="/pages"
          element={
            <PlaceholderPage
              title="Page Management"
              description="Manage website pages and content"
            />
          }
        />

        {/* System */}
        <Route
          path="/location"
          element={
            <PlaceholderPage
              title="Location Management"
              description="Manage shipping locations and zones"
            />
          }
        />
        <Route
          path="/components"
          element={
            <PlaceholderPage
              title="Components"
              description="System components and modules"
            />
          }
        />

        {/* Support */}
        <Route
          path="/help"
          element={
            <PlaceholderPage
              title="Help Center"
              description="Customer support and help documentation"
            />
          }
        />
        <Route
          path="/faqs"
          element={
            <PlaceholderPage
              title="FAQs Management"
              description="Manage frequently asked questions"
            />
          }
        />
      </Routes>
    </AdminLayout>
  );
};

export default AdminRoutes;
