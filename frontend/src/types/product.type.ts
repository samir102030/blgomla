import type { User } from "./user.type";

export interface ProductReview {
  _id: string;
  user: User; // ObjectId as string
  rating: number;
  comment?: string;
  isVisible?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductImage {
  url: string;
  alt?: string;
}

export interface ProductAttribute {
  name: string;
  value: string;
}

export interface BulkPricingRule {
  minQty: number;
  unitPrice: number;
}

export interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category?: string | { _id: string; name: string; slug?: string }; // ObjectId or populated
  brand?: string | { _id: string; name: string; slug?: string; logo?: string }; // ObjectId or populated
  stock: number;
  images: ProductImage[];
  salePercentage: number;
  saleActive: boolean;
  isActive: boolean;
  deleted: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  approvalNotes?: string;
  approvedBy?: string | User;
  approvedAt?: string;
  createdBy?: string | User;
  reviews: ProductReview[];
  rating: number;
  store?: string | { _id: string; storeName: string; logo?: string }; // ObjectId or populated
  featured: boolean;
  tags?: string[];
  soldCount?: number;
  features: string[];
  attributes: ProductAttribute[];
  bulkPricing?: BulkPricingRule[];
  createdAt?: string;
  updatedAt?: string;
  salePrice?: number;
  averageRating?: number;
  product?: string; // ObjectId as string
}
