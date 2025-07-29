# Site Configuration System

This directory contains the centralized configuration for the EGY-CHEM-HUB website. All site-wide settings, URLs, and SEO configurations are managed from here.

## How to Change the Domain

When you buy a new domain, you only need to update the configuration in one place:

### 1. Update Frontend Configuration

Edit `frontend/src/config/siteConfig.ts`:

```typescript
export const siteConfig = {
  // Change this to your new domain
  baseUrl: 'https://your-new-domain.com',
  
  // Update environment-specific URLs
  urls: {
    production: 'https://your-new-domain.com',
    staging: 'https://staging.your-new-domain.com',
    development: 'http://localhost:3000',
  },
  
  // Update company information if needed
  company: {
    // ... other fields
    contactPoint: {
      email: 'info@your-new-domain.com',
      // ... other fields
    }
  }
};
```

### 2. Update Backend Configuration

Edit `backend/models/metaContentModel.js`:

```javascript
const siteConfig = {
  baseUrl: 'https://your-new-domain.com',
  // ... update other fields as needed
};
```

### 3. Update Environment Variables

If you have any environment variables pointing to the old domain, update them in your deployment platform.

## Configuration Structure

### Main Configuration Sections

- **baseUrl**: The main website URL
- **urls**: Environment-specific URLs (production, staging, development)
- **site**: Basic site information (name, title, description, keywords)
- **social**: Social media URLs
- **seo**: SEO-related settings and defaults
- **company**: Company information for structured data
- **api**: API configuration
- **languages**: Supported languages and locales
- **features**: Feature flags and settings

### Helper Functions

- `getSiteUrl(path)`: Generate full URLs with the base URL
- `getApiUrl(endpoint)`: Generate API URLs
- `getSocialUrl(platform)`: Get social media URLs
- `getLocale(language)`: Get locale for a language
- `getConfig()`: Get environment-specific configuration

## SEO Configuration

The SEO configuration includes:

- Default meta titles and descriptions
- Open Graph settings
- Twitter Card settings
- Structured data defaults
- Robots.txt settings
- Sitemap configuration

## Multilingual Support

The configuration supports 8 languages:
- English (en)
- Arabic (ar)
- French (fr)
- German (de)
- Chinese (zh)
- Spanish (es)
- Russian (ru)
- Japanese (ja)

Each language has its own locale mapping for proper SEO.

## Usage Examples

### In Components

```typescript
import { siteConfig, getSiteUrl } from '../config/siteConfig';

// Use site name
const siteName = siteConfig.site.name;

// Generate full URL
const productUrl = getSiteUrl('/products/123');

// Get social media URL
const facebookUrl = getSocialUrl('facebook');
```

### In SEO Component

```typescript
import { siteConfig } from '../config/siteConfig';

<SEO 
  title={siteConfig.site.title}
  description={siteConfig.site.description}
  image={siteConfig.seo.defaultImage}
/>
```

## Best Practices

1. **Never hardcode URLs** - Always use the configuration
2. **Update both frontend and backend** when changing domains
3. **Test all environments** after configuration changes
4. **Keep social media URLs updated** when changing domains
5. **Update structured data** with new company information if needed

## Migration Checklist

When changing domains:

- [ ] Update `frontend/src/config/siteConfig.ts`
- [ ] Update `backend/models/metaContentModel.js`
- [ ] Update environment variables
- [ ] Update DNS settings
- [ ] Update SSL certificates
- [ ] Test all pages and functionality
- [ ] Update Google Search Console
- [ ] Update Google Analytics
- [ ] Update social media profiles
- [ ] Test SEO meta tags
- [ ] Verify structured data
- [ ] Check sitemap generation
- [ ] Test multilingual URLs 