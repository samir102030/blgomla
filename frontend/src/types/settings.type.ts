/*
  ⚠ Nothing on this shop implements this. Do not build against it.

  These two interfaces describe a settings model that was never built. The
  store that consumes them — stores/settings.store.ts — calls /settings/app,
  /settings/user and eight more; the API mounts no /settings route at all, and
  no component calls the store. Kept because it is a reasonable sketch of where
  a consolidated settings page could go, but it is a sketch, and it reads like
  documentation of something real.

  It is actively misleading in two places:

    · `shippingSettings` below is freeShipping / flatRate / localPickup. The
      real one, at GET+PUT /api/shipping, is { enabled, defaultFee,
      freeShippingThreshold, deliveryDaysMin, deliveryDaysMax, zones[] } and is
      typed in lib/shipping.ts. Anyone reading this file for the shipping shape
      gets the wrong one.

    · `paymentSettings` declares stripe.secretKey and paypal.clientSecret as
      fields the browser holds. Gateway secrets live in the API's environment
      and never leave it; GET /api/payments/methods reports only whether each
      gateway is configured and which setting names are missing.

  Where the real settings are:

    shipping    GET/PUT /api/shipping          lib/shipping.ts
    payments    GET     /api/payments/methods  (booleans and names only)
    layout      GET/PUT /api/layout            pageLayout.route.js
    visibility  GET/PUT /api/storefront-visibility
*/
export interface AppSettings {
  _id: string;
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  currency: string;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  allowGuestCheckout: boolean;
  defaultShippingMethod: string;
  defaultPaymentMethod: string;
  taxRate: number;
  shippingFee: number;
  freeShippingThreshold: number;
  maxFileUploadSize: number;
  allowedFileTypes: string[];
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
  contactInfo: {
    email: string;
    phone: string;
    address: string;
    workingHours: string;
  };
  seoSettings: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    ogImage: string;
  };
  emailSettings: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
  };
  paymentSettings: {
    stripe: {
      enabled: boolean;
      publicKey: string;
      secretKey: string;
    };
    paypal: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
    };
    cashOnDelivery: {
      enabled: boolean;
    };
  };
  shippingSettings: {
    freeShipping: {
      enabled: boolean;
      threshold: number;
    };
    flatRate: {
      enabled: boolean;
      rate: number;
    };
    localPickup: {
      enabled: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  _id: string;
  user: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  currency: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private';
    showOnlineStatus: boolean;
    allowMessages: boolean;
  };
  dashboard: {
    layout: 'grid' | 'list';
    itemsPerPage: number;
    defaultView: string;
  };
  createdAt: string;
  updatedAt: string;
}
