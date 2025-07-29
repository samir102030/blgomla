import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import HomePage from './routes/HomePage'
import LoginPage from './routes/LoginPage'
import RegisterPage from './routes/RegisterPage'
import ProductsPage from './routes/ProductsPage'
import IndustriesPage from './routes/IndustriesPage'
import ProductDetailsPage from './routes/ProductDetailsPage'
import IndustryDetailsPage from './routes/IndustryDetailsPage'
import RequestSamplePage from './routes/RequestSamplePage';
import ContactUsPage from './routes/ContactUsPage'
import NewsEventsPage from './routes/NewsEventsPage'
import NewsEventDetailsPage from './routes/NewsEventDetailsPage'
import ProfilePage from './routes/ProfilePage'
import AdminRoutes from './routes/AdminRoutes'
import { AuthProvider } from './contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { useUserStore } from './stores/user.store'
import { useEffect } from 'react'
import { useLanguageDirection } from './hooks/useLanguageDirection'
import "./languages/i18n"

const App = () => {
  const {t, i18n} = useTranslation();
  const lang = useUserStore(state => state.lang);
  const { dir } = useLanguageDirection();
  
  useEffect(() =>{
    i18n.changeLanguage(lang);
  }, [lang, i18n])

  useEffect(() => {
    // Set document direction
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/industries" element={<IndustriesPage />} />
            <Route path="/products/:id" element={<ProductDetailsPage />} />
            <Route path="/industries/:id" element={<IndustryDetailsPage />} />
            <Route path="/request-sample" element={<RequestSamplePage />} />
            <Route path="/contact" element={<ContactUsPage />} />
            <Route path="/news-events" element={<NewsEventsPage />} />
            <Route path="/news-events/:id" element={<NewsEventDetailsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            
            {/* Admin Routes */}
            <Route path="/admin/*" element={<AdminRoutes />} />
          </Routes>
        </Router>
      </AuthProvider>
    </HelmetProvider>
  )
}

export default App