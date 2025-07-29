// Centralized site configuration
// Update this file when changing domains or site settings

export const siteConfig = {
  // Main website URL - Change this when you buy a new domain
  baseUrl: 'https://egy-chem-hub.netlify.app',
  
  // Alternative URLs for different environments
  urls: {
    production: 'https://egy-chem-hub.netlify.app',
    staging: 'https://egy-chem-hub-staging.netlify.app',
    development: 'http://localhost:3000',
  },
  
  // Site information
  site: {
    name: 'EGY-CHEM-HUB',
    title: 'EGY-CHEM-HUB - Leading Chemical Solutions Provider',
    description: 'EGY-CHEM-HUB is the premier destination for high-quality chemical solutions in the region. We provide innovative chemical products and services for various industries including paints, coatings, pharmaceuticals, and manufacturing.',
    keywords: 'chemical solutions, industrial chemicals, EGY-CHEM-HUB, chemical products, manufacturing chemicals, paints, coatings, pharmaceuticals',
    author: 'EGY-CHEM-HUB',
    email: 'info@egy-chem-hub.com',
    phone: '+20-123-456-789',
  },
  
  // Social media
  social: {
    facebook: 'https://www.facebook.com/egychemhub',
    twitter: 'https://twitter.com/egychemhub',
    linkedin: 'https://www.linkedin.com/company/egy-chem-hub',
    instagram: 'https://www.instagram.com/egychemhub',
    youtube: 'https://www.youtube.com/egychemhub',
  },
  
  // SEO settings
  seo: {
    defaultImage: '/images/logo1.png',
    ogType: 'website',
    ogSiteName: 'EGY-CHEM-HUB',
    twitterCard: 'summary_large_image',
    twitterSite: '@egychemhub',
    twitterCreator: '@egychemhub',
    robots: 'index, follow',
  },
  
  // Company information for structured data
  company: {
    name: 'EGY-CHEM-HUB',
    legalName: 'EGY-CHEM-HUB Chemical Solutions',
    description: 'Leading Chemical Solutions Provider',
    logo: '/images/logo1.png',
    address: {
      streetAddress: 'Chemical Industry Zone',
      addressLocality: 'Cairo',
      addressRegion: 'Cairo',
      postalCode: '12345',
      addressCountry: 'Egypt',
    },
    contactPoint: {
      telephone: '+20-123-456-789',
      contactType: 'customer service',
      email: 'info@egy-chem-hub.com',
    },
  },
  
  // API configuration
  api: {
    baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:5002',
    timeout: 10000,
  },
  
  // Supported languages
  languages: {
    supported: ['en', 'ar', 'fr', 'de', 'zh', 'es', 'ru', 'ja'],
    default: 'en',
    locales: {
      en: 'en_US',
      ar: 'ar_EG',
      fr: 'fr_FR',
      de: 'de_DE',
      zh: 'zh_CN',
      es: 'es_ES',
      ru: 'ru_RU',
      ja: 'ja_JP',
    },
  },
  
  // Features and settings
  features: {
    multilingual: true,
    rtlSupport: true,
    seoOptimization: true,
    socialSharing: true,
    analytics: true,
  },
};

// Helper functions
export const getSiteUrl = (path: string = '') => {
  return `${siteConfig.baseUrl}${path}`;
};

export const getApiUrl = (endpoint: string = '') => {
  return `${siteConfig.api.baseUrl}${endpoint}`;
};

export const getSocialUrl = (platform: keyof typeof siteConfig.social) => {
  return siteConfig.social[platform];
};

export const getLocale = (language: string) => {
  return siteConfig.languages.locales[language as keyof typeof siteConfig.languages.locales] || 'en_US';
};

// Environment-specific configuration
export const getConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  return {
    ...siteConfig,
    baseUrl: siteConfig.urls[env as keyof typeof siteConfig.urls] || siteConfig.baseUrl,
  };
};

export default siteConfig; 