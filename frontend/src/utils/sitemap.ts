// Sitemap utility for SEO optimization

import { siteConfig, getSiteUrl } from '../config/siteConfig';

// Types for sitemap URLs
interface SitemapUrl {
  url: string;
  priority: string;
  changefreq: string;
  lastmod?: string;
}

export interface SitemapConfig {
  baseUrl: string;
  urls: SitemapUrl[];
}

export const generateSitemapXML = (config: SitemapConfig): string => {
  const { baseUrl, urls } = config;
  
  const xmlUrls = urls.map(url => {
    const fullUrl = url.url.startsWith('http') ? url.url : `${baseUrl}${url.url}`;
    const lastmod = url.lastmod || new Date().toISOString().split('T')[0];
    const changefreq = url.changefreq || 'weekly';
    const priority = url.priority || 0.5;
    
    return `  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls}
</urlset>`;
};

// Default sitemap configuration for EGY-CHEM-HUB
export const getDefaultSitemapConfig = (): SitemapConfig => {
  const baseUrl = 'https://egy-chem-hub.com';
  const today = new Date().toISOString().split('T')[0];
  
  return {
    baseUrl,
    urls: [
      {
        url: '/',
        lastmod: today,
        changefreq: 'daily',
        priority: '1.0'
      },
      {
        url: '/products',
        lastmod: today,
        changefreq: 'weekly',
        priority: '0.9'
      },
      {
        url: '/industries',
        lastmod: today,
        changefreq: 'monthly',
        priority: '0.8'
      },
      {
        url: '/news-events',
        lastmod: today,
        changefreq: 'weekly',
        priority: '0.7'
      },
      {
        url: '/request-sample',
        lastmod: today,
        changefreq: 'monthly',
        priority: '0.6'
      },
      {
        url: '/contact',
        lastmod: today,
        changefreq: 'monthly',
        priority: '0.6'
      },
      {
        url: '/login',
        lastmod: today,
        changefreq: 'yearly',
        priority: '0.3'
      },
      {
        url: '/register',
        lastmod: today,
        changefreq: 'yearly',
        priority: '0.3'
      }
    ]
  };
};

// Generate sitemap for products
export const generateProductSitemap = (products: any[]): SitemapUrl[] => {
  return products.map(product => ({
    url: `/products/${product._id}`,
    lastmod: product.updatedAt ? new Date(product.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: '0.8'
  }));
};

// Generate sitemap for articles/news
export const generateArticleSitemap = (articles: any[]): SitemapUrl[] => {
  return articles.map(article => ({
    url: `/news-events/${article._id}`,
    lastmod: article.updatedAt ? new Date(article.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    changefreq: 'monthly',
    priority: '0.6'
  }));
};

// Download sitemap as file
export const downloadSitemap = (sitemapXML: string, filename: string = 'sitemap.xml') => {
  const blob = new Blob([sitemapXML], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Generate sitemap XML
export const generateSitemap = (products: any[] = [], articles: any[] = [], companies: any[] = []) => {
  const baseUrl = siteConfig.baseUrl;
  const currentDate = new Date().toISOString();
  
  // Static pages
  const staticPages: SitemapUrl[] = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/products', priority: '0.9', changefreq: 'weekly' },
    { url: '/news-events', priority: '0.8', changefreq: 'weekly' },
    { url: '/contact-us', priority: '0.7', changefreq: 'monthly' },
    { url: '/industries', priority: '0.8', changefreq: 'weekly' },
    { url: '/request-sample', priority: '0.6', changefreq: 'monthly' },
    { url: '/login', priority: '0.3', changefreq: 'monthly' },
    { url: '/register', priority: '0.3', changefreq: 'monthly' },
  ];

  // Generate language-specific URLs for static pages
  const languageUrls: SitemapUrl[] = siteConfig.languages.supported.flatMap(lang => 
    staticPages.map(page => ({
      ...page,
      url: `${page.url}?lang=${lang}`,
    }))
  );

  // Product URLs
  const productUrls: SitemapUrl[] = products.flatMap(product => 
    siteConfig.languages.supported.map(lang => ({
      url: `/products/${product._id}?lang=${lang}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: product.updatedAt || currentDate
    }))
  );

  // Article URLs
  const articleUrls: SitemapUrl[] = articles.flatMap(article => 
    siteConfig.languages.supported.map(lang => ({
      url: `/news-events/${article._id}?lang=${lang}`,
      priority: '0.7',
      changefreq: 'monthly',
      lastmod: article.updatedAt || currentDate
    }))
  );

  // Company URLs
  const companyUrls: SitemapUrl[] = companies.flatMap(company => 
    siteConfig.languages.supported.map(lang => ({
      url: `/industries/${company._id}?lang=${lang}`,
      priority: '0.7',
      changefreq: 'monthly',
      lastmod: company.updatedAt || currentDate
    }))
  );

  // Combine all URLs
  const allUrls: SitemapUrl[] = [...languageUrls, ...productUrls, ...articleUrls, ...companyUrls];

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allUrls.map(url => `
  <url>
    <loc>${baseUrl}${url.url}</loc>
    <lastmod>${url.lastmod || currentDate}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
    ${siteConfig.languages.supported.map(lang => `
    <xhtml:link rel="alternate" hreflang="${lang}" href="${baseUrl}${url.url.split('?')[0]}?lang=${lang}" />
    `).join('')}
  </url>`).join('')}
</urlset>`;

  return xml;
};

// Generate robots.txt content
export const generateRobotsTxt = () => {
  const baseUrl = siteConfig.baseUrl;
  
  return `User-agent: *
Allow: /

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin and private areas
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /static/

# Allow important pages
Allow: /products/
Allow: /news-events/
Allow: /industries/
Allow: /contact-us/

# Crawl delay (optional)
Crawl-delay: 1`;
}; 