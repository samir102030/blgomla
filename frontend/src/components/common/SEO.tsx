import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { siteConfig, getSiteUrl, getLocale } from '../../config/siteConfig';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  nofollow?: boolean;
  structuredData?: any;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  twitterSite?: string;
  twitterCreator?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  canonicalUrl,
  noindex = false,
  nofollow = false,
  structuredData,
  ogTitle,
  ogDescription,
  ogImage,
  ogType,
  twitterCard,
  twitterSite,
  twitterCreator,
  author,
  publishedTime,
  modifiedTime,
  section,
  tags = []
}) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'en';
  
  // Use centralized configuration
  const config = siteConfig;
  
  // Default values from config
  const defaultTitle = config.site.title;
  const defaultDescription = config.site.description;
  const defaultImage = config.seo.defaultImage;
  const defaultAuthor = config.site.author;

  // Use provided values or defaults
  const finalTitle = title || defaultTitle;
  const finalDescription = description || defaultDescription;
  const finalImage = image || defaultImage;
  const finalUrl = url || window.location.href;
  const finalCanonicalUrl = canonicalUrl || finalUrl;
  const finalOgTitle = ogTitle || finalTitle;
  const finalOgDescription = ogDescription || finalDescription;
  const finalOgImage = ogImage || finalImage;
  const finalOgType = ogType || type;
  const finalAuthor = author || defaultAuthor;

  // Robots meta tag
  const robots = [];
  if (noindex) robots.push('noindex');
  if (nofollow) robots.push('nofollow');
  if (!noindex && !nofollow) robots.push(config.seo.robots);
  const robotsContent = robots.join(', ');

  // Generate hreflang tags for all supported languages
  const supportedLanguages = config.languages.supported;
  const hreflangTags = supportedLanguages.map(lang => {
    const langUrl = new URL(finalCanonicalUrl);
    langUrl.searchParams.set('lang', lang);
    return { rel: 'alternate', hreflang: lang, href: langUrl.toString() };
  });

  // Default structured data for organization
  const defaultStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": config.company.name,
    "url": config.baseUrl,
    "logo": getSiteUrl(config.company.logo),
    "description": config.company.description,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": config.company.address.streetAddress,
      "addressLocality": config.company.address.addressLocality,
      "addressRegion": config.company.address.addressRegion,
      "postalCode": config.company.address.postalCode,
      "addressCountry": config.company.address.addressCountry
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": config.company.contactPoint.telephone,
      "contactType": config.company.contactPoint.contactType,
      "email": config.company.contactPoint.email
    },
    "sameAs": [
      config.social.facebook,
      config.social.linkedin,
      config.social.twitter
    ]
  };

  // Breadcrumb structured data
  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": config.baseUrl
      }
    ]
  };

  // Combine structured data
  const finalStructuredData = structuredData || [defaultStructuredData, breadcrumbStructuredData];

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={keywords || config.site.keywords} />
      <meta name="author" content={finalAuthor} />
      <meta name="robots" content={robotsContent} />
      <meta name="language" content={currentLang} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={finalCanonicalUrl} />
      
      {/* Hreflang Tags */}
      {hreflangTags.map((tag, index) => (
        <link key={index} rel={tag.rel} hrefLang={tag.hreflang} href={tag.href} />
      ))}
      <link rel="alternate" hrefLang="x-default" href={finalCanonicalUrl} />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={finalOgTitle} />
      <meta property="og:description" content={finalOgDescription} />
      <meta property="og:image" content={getSiteUrl(finalOgImage)} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:type" content={finalOgType} />
      <meta property="og:site_name" content={config.seo.ogSiteName} />
      <meta property="og:locale" content={getLocale(currentLang)} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={finalOgTitle} />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={twitterCard || config.seo.twitterCard} />
      <meta name="twitter:site" content={twitterSite || config.seo.twitterSite} />
      <meta name="twitter:creator" content={twitterCreator || config.seo.twitterCreator} />
      <meta name="twitter:title" content={finalOgTitle} />
      <meta name="twitter:description" content={finalOgDescription} />
      <meta name="twitter:image" content={getSiteUrl(finalOgImage)} />
      <meta name="twitter:image:alt" content={finalOgTitle} />
      
      {/* Additional Meta Tags */}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {section && <meta property="article:section" content={section} />}
      {tags.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}
      
      {/* Structured Data */}
      {Array.isArray(finalStructuredData) ? (
        finalStructuredData.map((data, index) => (
          <script key={index} type="application/ld+json">
            {JSON.stringify(data)}
          </script>
        ))
      ) : (
        <script type="application/ld+json">
          {JSON.stringify(finalStructuredData)}
        </script>
      )}
      
      {/* Additional SEO Meta Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#B40519" />
      <meta name="msapplication-TileColor" content="#B40519" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={config.site.name} />
      
      {/* Preconnect to external domains for performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* Favicon and App Icons */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/logo192.png" />
      <link rel="manifest" href="/manifest.json" />
    </Helmet>
  );
};

export default SEO; 