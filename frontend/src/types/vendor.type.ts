export interface VendorRegistrationData {
  // Business Information
  businessType: "individual" | "company" | "partnership";
  commercialRegistrationNumber?: string;
  taxNumber?: string;

  // Legal Entity Information
  legalEntityType: "egyptian_tax_authority" | "ministry_supply_trade" | "other";
  licenseNumber: string;
  companyName: string;
  companyAddress: string;
  issueDate: string;
  expiryDate: string;
  allowedActivities?: string;

  // Contact Information
  contactPersonName: string;
  email: string;
  phone: string;
  alternativePhone?: string;

  // Address Information
  address: string;
  city: string;
  governorate: string;
  postalCode?: string;

  // Business Details
  businessDescription: string;
  productCategories: string[];
  expectedMonthlyVolume?: number;

  // Documents
  commercialRegistrationDocument?: File | string;
  taxCardDocument?: File | string;
  nationalIdDocument?: File | string;
  bankStatementDocument?: File | string;

  // Store Information
  storeName?: string;
  storeDescription?: string;
  storeLogo?: File | string;

  // Agreement
  termsAccepted: boolean;
  privacyPolicyAccepted: boolean;
}

export interface Vendor {
  _id: string;
  businessName: string;
  businessType: "individual" | "company" | "partnership";
  commercialRegistrationNumber?: string;
  taxNumber?: string;

  // Legal Entity
  legalEntityType: string;
  licenseNumber: string;
  companyName: string;
  companyAddress: string;
  issueDate: string;
  expiryDate: string;
  allowedActivities?: string;

  // Contact
  contactPersonName: string;
  email: string;
  contactEmail: string; // Alias for email
  phone: string;
  contactPhone: string; // Alias for phone
  alternativePhone?: string;

  // Address
  address: string;
  city: string;
  governorate: string;
  postalCode?: string;

  // Business
  businessDescription: string;
  productCategories: string[];
  expectedMonthlyVolume?: number;

  // Status
  status: "pending" | "approved" | "rejected" | "suspended" | "active";
  rejectionReason?: string;
  isActive?: boolean;
  deleted?: boolean;

  // Documents
  documents: {
    commercialRegistration?: string;
    taxCard?: string;
    nationalId?: string;
    bankStatement?: string;
  };

  // Store
  store?: {
    _id: string;
    name: string;
    description: string;
    logo?: string;
    isActive: boolean;
    productCount?: number;
    orderCount?: number;
    rating?: number;
  };

  // User
  userId: string;
  owner?: {
    _id: string;
    name: string;
    email: string;
    phoneNumber: string;
    role: string;
    isVerified: boolean;
    active: boolean;
  };

  // Metrics
  totalSales?: number;
  totalProducts?: number;
  rating?: number;
  commission?: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export interface VendorStore {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  alternativePhone?: string;
  description?: string;
  owner: string; // User ID
  logo?: string;
  isActive: boolean;
  deleted: boolean;

  // Business Information
  businessName?: string;
  businessType?: "individual" | "company" | "partnership";
  businessDescription?: string;
  commercialRegistrationNumber?: string;
  taxNumber?: string;

  // Legal Entity Information
  legalEntityType?: string;
  licenseNumber?: string;
  companyName?: string;
  companyAddress?: string;
  issueDate?: string;
  expiryDate?: string;
  allowedActivities?: string;

  // Contact Information
  contactPersonName?: string;

  // Address Information
  address?: string;
  city?: string;
  governorate?: string;
  postalCode?: string;
  location?: string;

  // Product and Business Details
  productCategories?: string[];
  expectedMonthlyVolume?: number;

  // Store Status and Approval
  status?: "pending" | "approved" | "rejected" | "suspended" | "active";
  rejectionReason?: string;
  approvedAt?: string;
  rejectedAt?: string;

  // Documents
  documents?: {
    commercialRegistration?: string;
    taxCard?: string;
    nationalId?: string;
    bankStatement?: string;
  };

  // Agreement Acceptance
  termsAccepted?: boolean;
  privacyPolicyAccepted?: boolean;

  // Store Metrics
  totalSales?: number;
  totalProducts?: number;
  totalOrders?: number;
  rating?: number;
  totalReviews?: number;
  commission?: number;

  // Store Customization
  subscribers?: string[];
  slider?: Array<{
    image?: string;
    title?: string;
    description?: string;
  }>;
  socialLinks?: Array<{
    platform: string;
    url: string;
  }>;
  features?: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  about?: string;
  story?: string;
  achievements?: Array<{
    number: number;
    name: string;
  }>;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface VendorAnalytics {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  averageRating: number;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  ordersByStatus: {
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
}

export interface VendorDashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  monthlyRevenue: number;
  averageRating: number;
  activeProducts: number;
  pendingOrders: number;
  totalReviews: number;
  topProducts: Array<{
    name: string;
    sales: number;
    units: number;
    image?: string;
  }>;
  topCountries: Array<{
    country: string;
    sales: number;
    flag?: string;
    trend?: string;
  }>;
  bestSellers: Array<{
    name: string;
    revenue: number;
    orders: number;
    progress: number;
  }>;
  productOverview: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    status: string;
    revenue: number;
    rating: number;
  }>;
  salesChange: string;
  // Legacy fields
  totalSales: number;
  totalIncome: number;
  ordersNumber: number;
  productsNumber: number;
  paidOrders: number;
  unpaidOrders: number;
}
