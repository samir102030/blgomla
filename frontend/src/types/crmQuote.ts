// CRM-Quote Integration Types

export interface UserDetails {
  _id: string;
  username: string;
  email: string;
  companyName?: string;
  phoneNumber?: string;
  bio?: string;
  profilePic?: string;
  isApproved: boolean;
  approvalStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface CRMItem {
  _id: string;
  source: 'gitCode' | 'supplier';
  data: any;
  status: string;
  columnId: string;
  isArchived: boolean;
  archivedAt?: Date;
  archivedFrom?: string;
  movedFrom?: string;
  // Quote integration fields
  quotes: string[] | Quote[];
  hasActiveQuote: boolean;
  lastQuoteDate?: Date;
  quoteCount: number;
  createdAt: string;
  updatedAt: string;
  // User details field
  userDetails?: UserDetails;
}

export interface CRMColumn {
  id: string;
  title: string;
  deletable: boolean;
  order: number;
  itemCount: number;
  items: CRMItem[];
}

export interface Quote {
  _id: string;
  customerName: string;
  company: string;
  email: string;
  quantity: number;
  status: boolean;
  country?: string;
  product?: any;
  productName?: string;
  message?: string;
  date: string;
  userId?: any;
  isDeleted: boolean;
  // CRM integration fields
  crmId?: string;
  leadSource: 'crm' | 'direct' | 'website';
  crmStage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInfo {
  name: string;
  email: string;
  company: string;
  phone: string;
  country: string;
}

export interface QuoteCreationData {
  productName?: string;
  quantity?: number;
  message?: string;
  product?: string;
}

export interface CRMQuoteValidation {
  isValid: boolean;
  message: string;
}

export interface CRMCustomerInfoResponse {
  customerInfo: CustomerInfo;
  validation: CRMQuoteValidation;
  crmStage: string;
  quoteCount: number;
  hasActiveQuote: boolean;
  lastQuoteDate?: Date;
}

export interface QuoteHistoryPagination {
  currentPage: number;
  totalPages: number;
  totalQuotes: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CRMQuoteHistoryResponse {
  data: Quote[];
  pagination: QuoteHistoryPagination;
}

// API Response types
export interface CRMDataResponse {
  success: boolean;
  data: CRMColumn[];
}

export interface QuoteResponse {
  success: boolean;
  data: Quote;
  message?: string;
}

export interface CRMItemWithQuotesResponse {
  success: boolean;
  data: CRMItem;
}

export interface CRMCustomerInfoAPIResponse {
  success: boolean;
  data: CRMCustomerInfoResponse;
} 