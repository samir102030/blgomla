import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import DashboardOverview from '../pages/dashboard/DashboardOverview';
import VendorsList from '../pages/dashboard/vendors/VendorsList';
import VendorRequests from '../pages/dashboard/vendors/VendorRequests';
import CustomersList from '../pages/dashboard/crm/CustomersList';
import SupportTickets from '../pages/dashboard/crm/SupportTickets';
import SalesReports from '../pages/dashboard/analytics/SalesReports';
import NotificationsPage from '../pages/NotificationsPage';
import AdvertisementsPage from '../pages/admin/AdvertisementsPage';

const PlaceholderPage: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="flex items-center justify-center min-h-96">
    <div className="text-center">
      <div className="text-6xl mb-4">🚧</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600">{description}</p>
    </div>
  </div>
);

const DashboardRoutes: React.FC = () => {
  return (
    <DashboardLayout>
      <Routes>
        {/* Main Dashboard */}
        <Route path="/" element={<DashboardOverview />} />
        
        {/* Vendors */}
        <Route path="vendors" element={<VendorsList />} />
        <Route path="vendors/add" element={<PlaceholderPage title="Add Vendor" description="Create new vendor registration form" />} />
        <Route path="vendors/requests" element={<VendorRequests />} />
        <Route path="vendors/analytics" element={<PlaceholderPage title="Vendor Analytics" description="Vendor performance metrics and insights" />} />
        
        {/* Products */}
        <Route path="products" element={<PlaceholderPage title="Products Management" description="Manage all products in the marketplace" />} />
        <Route path="products/add" element={<PlaceholderPage title="Add Product" description="Create new product listing" />} />
        <Route path="products/categories" element={<PlaceholderPage title="Product Categories" description="Manage product categories and hierarchies" />} />
        <Route path="products/inventory" element={<PlaceholderPage title="Inventory Management" description="Track stock levels and inventory" />} />
        
        {/* Orders */}
        <Route path="orders" element={<PlaceholderPage title="Orders Management" description="Manage all marketplace orders" />} />
        <Route path="orders/pending" element={<PlaceholderPage title="Pending Orders" description="Orders awaiting processing" />} />
        <Route path="orders/processing" element={<PlaceholderPage title="Processing Orders" description="Orders currently being processed" />} />
        <Route path="orders/completed" element={<PlaceholderPage title="Completed Orders" description="Successfully completed orders" />} />
        
        {/* CRM */}
        <Route path="crm/customers" element={<CustomersList />} />
        <Route path="crm/tickets" element={<SupportTickets />} />
        <Route path="crm/communications" element={<PlaceholderPage title="Communications" description="Customer communication history and tools" />} />
        <Route path="crm/analytics" element={<PlaceholderPage title="Customer Analytics" description="Customer behavior and engagement metrics" />} />
        
        {/* Analytics */}
        <Route path="analytics/sales" element={<SalesReports />} />
        <Route path="analytics/performance" element={<PlaceholderPage title="Performance Analytics" description="Platform performance metrics and KPIs" />} />
        <Route path="analytics/revenue" element={<PlaceholderPage title="Revenue Analytics" description="Revenue tracking and financial insights" />} />
        <Route path="analytics/traffic" element={<PlaceholderPage title="Traffic Analytics" description="Website traffic and user behavior analysis" />} />
        
        {/* Finance */}
        <Route path="finance/payments" element={<PlaceholderPage title="Payments Management" description="Track and manage all payments" />} />
        <Route path="finance/commissions" element={<PlaceholderPage title="Commission Management" description="Vendor commission tracking and payouts" />} />
        <Route path="finance/payouts" element={<PlaceholderPage title="Payouts Management" description="Manage vendor payouts and settlements" />} />
        <Route path="finance/reports" element={<PlaceholderPage title="Financial Reports" description="Comprehensive financial reporting and analysis" />} />
        
        {/* Messages */}
        <Route path="messages/inbox" element={<PlaceholderPage title="Inbox" description="Incoming messages and communications" />} />
        <Route path="messages/sent" element={<PlaceholderPage title="Sent Messages" description="Outgoing messages and communications" />} />
        <Route path="messages/notifications" element={<NotificationsPage />} />

        {/* Marketing */}
        <Route path="marketing/advertisements" element={<AdvertisementsPage />} />

        {/* Settings */}
        <Route path="settings/general" element={<PlaceholderPage title="General Settings" description="General system configuration" />} />
        <Route path="settings/users" element={<PlaceholderPage title="User Management" description="Manage system users and permissions" />} />
        <Route path="settings/system" element={<PlaceholderPage title="System Settings" description="Advanced system configuration" />} />
        <Route path="settings/integrations" element={<PlaceholderPage title="Integrations" description="Third-party integrations and APIs" />} />
      </Routes>
    </DashboardLayout>
  );
};

export default DashboardRoutes;
