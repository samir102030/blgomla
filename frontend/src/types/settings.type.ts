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
