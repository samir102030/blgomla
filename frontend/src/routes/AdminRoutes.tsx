import React from "react";
import { Routes, Route } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout";
import AdminDashboard from "../pages/admin/AdminDashboard";
import OrdersPage from "../pages/admin/OrdersPage";
import ProductsPage from "../pages/admin/ProductsPage";
import UsersPage from "../pages/admin/UsersPage";
import CategoriesPage from "../pages/admin/CategoriesPage";
import SalesPage from "../pages/admin/SalesPage";
import CustomerReviewsPage from "../pages/admin/CustomerReviewsPage";
import CustomerSupportPage from "../pages/admin/CustomerSupportPage";
import VendorRequests from "../pages/dashboard/vendors/VendorRequests";
import AllVendors from "../pages/admin/vendors/AllVendors";
import ApprovedVendors from "../pages/admin/vendors/ApprovedVendors";
import RejectedVendors from "../pages/admin/vendors/RejectedVendors";
import VendorAnalytics from "../pages/admin/vendors/VendorAnalytics";

const PlaceholderPage: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
  <div className="flex items-center justify-center min-h-96">
    <div className="text-center">
      <div className="text-6xl mb-4">🚧</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600">{description}</p>
    </div>
  </div>
);

const AdminRoutes: React.FC = () => {
  return (
    <AdminLayout>
      <Routes>
        {/* Main Dashboard */}
        <Route path="/" element={<AdminDashboard />} />

        {/* Vendor Management */}
        <Route path="/vendors/requests" element={<VendorRequests />} />
        <Route path="/vendors/all" element={<AllVendors />} />
        <Route path="/vendors/approved" element={<ApprovedVendors />} />
        <Route path="/vendors/rejected" element={<RejectedVendors />} />
        <Route path="/vendors/analytics" element={<VendorAnalytics />} />

        {/* E-commerce */}
        <Route path="/category" element={<CategoriesPage />} />
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

        {/* Products */}
        <Route path="/products" element={<ProductsPage />} />

        {/* User Management */}
        <Route path="/user" element={<UsersPage />} />

        {/* Customer Reviews */}
        <Route path="/reviews" element={<CustomerReviewsPage />} />

        {/* Customer Support */}
        <Route path="/support" element={<CustomerSupportPage />} />

        {/* Sales & Analytics */}
        <Route path="/sales" element={<SalesPage />} />
        <Route
          path="/report"
          element={
            <PlaceholderPage
              title="Reports"
              description="Comprehensive reporting and analysis"
            />
          }
        />

        {/* Content Management */}
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
