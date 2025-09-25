import React from 'react';
import { Routes, Route } from 'react-router-dom';
import VendorDashboard from '../pages/vendor/VendorDashboard';
import VendorProductManagement from '../pages/vendor/VendorProductManagement';
import VendorStoreManagement from '../pages/vendor/VendorStoreManagement';
import VendorLayout from '../components/vendor/VendorLayout';

// Placeholder component for routes not yet implemented
const PlaceholderPage: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="text-center py-12">
    <div className="text-6xl mb-4">🚧</div>
    <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
    <p className="text-gray-600">{description}</p>
  </div>
);

const VendorRoutes: React.FC = () => {
  return (
    <VendorLayout>
      <Routes>
        {/* Main Vendor Dashboard */}
        <Route path="/" element={<VendorDashboard />} />

        {/* Store Management */}
        <Route path="store" element={<VendorStoreManagement />} />

        {/* Product Management */}
        <Route path="products" element={<VendorProductManagement />} />
        <Route path="products/add" element={<PlaceholderPage title="Add Product" description="Create a new product for your store" />} />
        <Route path="products/edit/:id" element={<PlaceholderPage title="Edit Product" description="Edit product details" />} />
        <Route path="products/inventory" element={<PlaceholderPage title="Inventory Management" description="Manage your product inventory" />} />
        
        {/* Order Management */}
        <Route path="orders" element={<PlaceholderPage title="Orders" description="Manage your store orders" />} />
        <Route path="orders/pending" element={<PlaceholderPage title="Pending Orders" description="View and process pending orders" />} />
        <Route path="orders/processing" element={<PlaceholderPage title="Processing Orders" description="Orders currently being processed" />} />
        <Route path="orders/completed" element={<PlaceholderPage title="Completed Orders" description="View completed orders" />} />
        
        {/* Analytics */}
        <Route path="analytics" element={<PlaceholderPage title="Analytics" description="View your store performance analytics" />} />
        <Route path="analytics/sales" element={<PlaceholderPage title="Sales Analytics" description="Detailed sales performance metrics" />} />
        <Route path="analytics/products" element={<PlaceholderPage title="Product Analytics" description="Product performance insights" />} />
        
        {/* Customer Management */}
        <Route path="customers" element={<PlaceholderPage title="Customers" description="Manage your store customers" />} />
        <Route path="reviews" element={<PlaceholderPage title="Reviews" description="Manage customer reviews and ratings" />} />
        
        {/* Marketing */}
        <Route path="marketing" element={<PlaceholderPage title="Marketing" description="Marketing tools and campaigns" />} />
        <Route path="marketing/promotions" element={<PlaceholderPage title="Promotions" description="Create and manage promotions" />} />
        <Route path="marketing/coupons" element={<PlaceholderPage title="Coupons" description="Manage discount coupons" />} />
        
        {/* Settings */}
        <Route path="settings" element={<PlaceholderPage title="Settings" description="Vendor account settings" />} />
        <Route path="settings/profile" element={<PlaceholderPage title="Profile Settings" description="Update your vendor profile" />} />
        <Route path="settings/notifications" element={<PlaceholderPage title="Notification Settings" description="Manage notification preferences" />} />
        <Route path="settings/billing" element={<PlaceholderPage title="Billing Settings" description="Manage billing and payment information" />} />
        
        {/* Support */}
        <Route path="support" element={<PlaceholderPage title="Support" description="Get help and support" />} />
        <Route path="support/tickets" element={<PlaceholderPage title="Support Tickets" description="View and manage support tickets" />} />
        <Route path="support/documentation" element={<PlaceholderPage title="Documentation" description="Vendor documentation and guides" />} />
      </Routes>
    </VendorLayout>
  );
};

export default VendorRoutes;
