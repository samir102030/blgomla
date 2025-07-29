import { Routes, Route } from 'react-router-dom'
import Admin from '../pages/Admin'
import AdminAbout from '../components/admin/AdminAbout'
import AdminCRM from '../components/admin/AdminCRM'
import AdminProducts from '../components/admin/AdminProducts'
import AdminCompaniesLanding from '../components/admin/AdminCompaniesLanding'
import AdminSEO from '../components/admin/AdminSEO'

import AdminAddSlider from '../components/admin/AdminAddSlider'
import AdminEditSlider from '../components/admin/AdminEditSlider'
import AdminIndustries from '../components/admin/AdminIndustries'
import MissionEdit from '../pages/MissionEdit'
import VisionEdit from '../pages/VisionEdit'
import ValuesEdit from '../pages/ValuesEdit'

import AdminEvents from '../components/admin/AdminEvents'
import AdminNews from '../components/admin/AdminNews'
import AdminArticles from '../components/admin/AdminArticles'
import AdminCustomers from '../components/admin/AdminCustomers'
import AdminUsers from '../components/admin/AdminUsers'
import AdminQuotes from '../components/admin/AdminQuotes'
import AdminCompanyProfile from '../components/admin/AdminCompanyProfile'

import AdminAddBrand from '../components/admin/AdminAddBrand'
import AdminEditBrand from '../components/admin/AdminEditBrand'
import AdminNotifications from '../components/admin/AdminNotifications'
import AdminProtectedRoute from '../components/admin/AdminProtectedRoute'

const AdminRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Admin />} />
      <Route path="/about" element={<AdminAbout />} />
      <Route path="/about/slider/add" element={
        <AdminProtectedRoute>
          <AdminAddSlider />
        </AdminProtectedRoute>
      } />
      <Route path="/about/slider/:id/edit" element={
        <AdminProtectedRoute>
          <AdminEditSlider />
        </AdminProtectedRoute>
      } />
      
      {/* CRM - now using protection */}
      <Route path="/crm" element={<AdminCRM />} />
      
      {/* Products with hierarchical protection - AdminProducts handles all product routes */}
      <Route path="/products/*" element={<AdminProducts />} />
      
      {/* Industries with hierarchical protection - AdminIndustries handles all industry routes */}
      <Route path="/industries/*" element={<AdminIndustries />} />
      
      {/* Companies with hierarchical protection - AdminCompaniesLanding handles all company routes */}
      <Route path="/companies/*" element={<AdminCompaniesLanding />} />
      
      <Route path="/about/mission/edit" element={<MissionEdit />} />
      <Route path="/about/vision/edit" element={<VisionEdit />} />
      <Route path="/about/values/edit" element={<ValuesEdit />} />
      
      {/* Events with hierarchical protection - AdminEvents handles all event routes */}
      <Route path="/events/*" element={<AdminEvents />} />
      
      {/* News with hierarchical protection - AdminNews handles all news routes */}
      <Route path="/news/*" element={<AdminNews />} />
      
      {/* Articles with hierarchical protection - AdminArticles handles all article routes */}
      <Route path="/articles/*" element={<AdminArticles />} />
      
      {/* Customers - now using protection */}
      <Route path="/customers" element={<AdminCustomers />} />
      
      {/* Users (Admins) - now using protection */}
      <Route path="/admins" element={<AdminUsers />} />
      
      {/* Quotes - now using protection */}
      <Route path="/quotes" element={<AdminQuotes />} />
      
      {/* Company Profile - now using protection */}
      <Route path="/company-profile" element={<AdminCompanyProfile />} />
      
      {/* Notifications - now using protection */}
      <Route path="/notifications" element={<AdminNotifications />} />
      
      {/* SEO Management - now using protection */}
      <Route path="/seo" element={<AdminSEO />} />
      
      <Route path="/brands/add" element={<AdminAddBrand />} />
      <Route path="/brands/edit/:brandId" element={<AdminEditBrand />} />
    </Routes>
  )
}

export default AdminRoutes 