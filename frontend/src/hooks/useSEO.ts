import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { metaContentAPI } from '../utils/api';
import { siteConfig } from '../config/siteConfig';
import { useConsoleLog } from './useConsoleLog';

interface MetaContent {
  _id: string;
  title: { [key: string]: string };
  description: { [key: string]: string };
  keywords: { [key: string]: string };
  ogTitle: { [key: string]: string };
  ogDescription: { [key: string]: string };
  ogImage: string;
  ogType: string;
  ogSiteName: string;
  ogLocale: string;
  twitterCard: string;
  twitterSite: string;
  twitterCreator: string;
  canonicalUrl: string;
  robots: string;
  author: string;
  structuredData: any;
}

interface SEOData {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  ogSiteName: string;
  ogLocale: string;
  twitterCard: string;
  twitterSite: string;
  twitterCreator: string;
  canonicalUrl: string;
  robots: string;
  author: string;
  structuredData: any;
}

export const useSEO = (customSEO?: Partial<SEOData>) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'en';
  
  const [metaContent, setMetaContent] = useState<MetaContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { log } = useConsoleLog();

  useEffect(() => {
    const fetchMetaContent = async () => {
      try {
        setLoading(true);
        log('🔍 Fetching meta content for language:', currentLang, { dependencies: [currentLang] });
        const data = await metaContentAPI.get({ lang: currentLang });
        log('📊 Meta content from API:', data, { dependencies: [currentLang] });
        setMetaContent(data);
        setError(null);
      } catch (err) {
        console.error('❌ Failed to fetch meta content:', err);
        setError('Failed to load SEO data');
      } finally {
        setLoading(false);
      }
    };

    fetchMetaContent();
  }, [currentLang, log]);

  // Helper function to get text in current language
  const getTextInLang = (field: { [key: string]: string } | undefined, fallback: string = ''): string => {
    if (!field) return fallback;
    if (typeof field === 'string') return field;
    return field[currentLang] || field.en || fallback;
  };

  // Generate SEO data with proper priority: Custom SEO > Database > Defaults
  const seoData: SEOData = {
    // Title: Custom > Database > Default
    title: customSEO?.title || 
           getTextInLang(metaContent?.title) || 
           siteConfig.site.title,
    
    // Description: Custom > Database > Default
    description: customSEO?.description || 
                getTextInLang(metaContent?.description) || 
                siteConfig.site.description,
    
    // Keywords: Custom > Database > Default
    keywords: customSEO?.keywords || 
             getTextInLang(metaContent?.keywords) || 
             siteConfig.site.keywords,
    
    // Open Graph Title: Custom > Database > Page Title > Default
    ogTitle: customSEO?.ogTitle || 
            getTextInLang(metaContent?.ogTitle) || 
            customSEO?.title || 
            getTextInLang(metaContent?.title) || 
            siteConfig.site.title,
    
    // Open Graph Description: Custom > Database > Page Description > Default
    ogDescription: customSEO?.ogDescription || 
                  getTextInLang(metaContent?.ogDescription) || 
                  customSEO?.description || 
                  getTextInLang(metaContent?.description) || 
                  siteConfig.site.description,
    
    // Open Graph Image: Custom > Database > Default
    ogImage: customSEO?.ogImage || 
            metaContent?.ogImage || 
            siteConfig.seo.defaultImage,
    
    // Open Graph Type: Custom > Database > Default
    ogType: customSEO?.ogType || 
           metaContent?.ogType || 
           'website',
    
    // Open Graph Site Name: Custom > Database > Default
    ogSiteName: customSEO?.ogSiteName || 
               metaContent?.ogSiteName || 
               siteConfig.seo.ogSiteName,
    
    // Open Graph Locale: Custom > Database > Default
    ogLocale: customSEO?.ogLocale || 
             metaContent?.ogLocale || 
             siteConfig.languages.locales[currentLang as keyof typeof siteConfig.languages.locales] || 
             'en_US',
    
    // Twitter Card: Custom > Database > Default
    twitterCard: customSEO?.twitterCard || 
                metaContent?.twitterCard || 
                siteConfig.seo.twitterCard,
    
    // Twitter Site: Custom > Database > Default
    twitterSite: customSEO?.twitterSite || 
                metaContent?.twitterSite || 
                siteConfig.seo.twitterSite,
    
    // Twitter Creator: Custom > Database > Default
    twitterCreator: customSEO?.twitterCreator || 
                   metaContent?.twitterCreator || 
                   siteConfig.seo.twitterCreator,
    
    // Canonical URL: Custom > Database > Current URL
    canonicalUrl: customSEO?.canonicalUrl || 
                 metaContent?.canonicalUrl || 
                 window.location.href,
    
    // Robots: Custom > Database > Default
    robots: customSEO?.robots || 
           metaContent?.robots || 
           siteConfig.seo.robots,
    
    // Author: Custom > Database > Default
    author: customSEO?.author || 
           metaContent?.author || 
           siteConfig.site.author,
    
    // Structured Data: Custom > Database > Default
    structuredData: customSEO?.structuredData || 
                   metaContent?.structuredData || 
                   null,
  };

  log('🎯 Final SEO Data:', {
    customSEO,
    metaContent: metaContent ? 'exists' : 'null',
    finalTitle: seoData.title,
    finalDescription: seoData.description
  }, { dependencies: [currentLang, customSEO, metaContent] });

  return {
    seoData,
    metaContent,
    loading,
    error,
    currentLang,
  };
};

// Hook for product-specific SEO
export const useProductSEO = (product: any) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  const getProductText = (field: any): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[currentLang] || field.en || '';
  };

  const productSEO = {
    title: getProductText(product?.metaTitle) || getProductText(product?.name) || 'Product - EGY-CHEM-HUB',
    description: getProductText(product?.metaDescription) || getProductText(product?.description) || 'High-quality chemical product from EGY-CHEM-HUB',
    keywords: `${getProductText(product?.name)}, chemical product, ${getProductText(product?.brand)}, EGY-CHEM-HUB`,
    ogTitle: getProductText(product?.metaTitle) || getProductText(product?.name) || 'Product - EGY-CHEM-HUB',
    ogDescription: getProductText(product?.metaDescription) || getProductText(product?.description) || 'High-quality chemical product from EGY-CHEM-HUB',
    ogImage: product?.image || product?.hdPhotos?.[0] || siteConfig.seo.defaultImage,
    ogType: 'product',
    canonicalUrl: `${siteConfig.baseUrl}/products/${product?._id}`,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": getProductText(product?.name),
      "description": getProductText(product?.description),
      "image": product?.image || product?.hdPhotos?.[0] || siteConfig.seo.defaultImage,
      "brand": {
        "@type": "Brand",
        "name": getProductText(product?.brand)
      },
      "category": getProductText(product?.category),
      "offers": {
        "@type": "Offer",
        "availability": "https://schema.org/InStock",
        "priceCurrency": "USD",
        "price": "0",
        "seller": {
          "@type": "Organization",
          "name": siteConfig.company.name
        }
      }
    }
  };

  return productSEO;
};

// Hook for article/news SEO
export const useArticleSEO = (article: any) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  const getArticleText = (field: any): string => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[currentLang] || field.en || '';
  };

  const articleSEO = {
    title: getArticleText(article?.title) || 'Article - EGY-CHEM-HUB',
    description: getArticleText(article?.description) || getArticleText(article?.content)?.substring(0, 160) || 'Read our latest article on EGY-CHEM-HUB',
    keywords: `${getArticleText(article?.title)}, chemical industry, EGY-CHEM-HUB, article`,
    ogTitle: getArticleText(article?.title) || 'Article - EGY-CHEM-HUB',
    ogDescription: getArticleText(article?.description) || getArticleText(article?.content)?.substring(0, 160) || 'Read our latest article on EGY-CHEM-HUB',
    ogImage: article?.image || siteConfig.seo.defaultImage,
    ogType: 'article',
    publishedTime: article?.createdAt,
    modifiedTime: article?.updatedAt,
    canonicalUrl: `${siteConfig.baseUrl}/news-events/${article?._id}`,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": getArticleText(article?.title),
      "description": getArticleText(article?.description) || getArticleText(article?.content)?.substring(0, 160),
      "image": article?.image || siteConfig.seo.defaultImage,
      "author": {
        "@type": "Organization",
        "name": siteConfig.company.name
      },
      "publisher": {
        "@type": "Organization",
        "name": siteConfig.company.name,
        "logo": {
          "@type": "ImageObject",
          "url": siteConfig.company.logo
        }
      },
      "datePublished": article?.createdAt,
      "dateModified": article?.updatedAt
    }
  };

  return articleSEO;
}; 