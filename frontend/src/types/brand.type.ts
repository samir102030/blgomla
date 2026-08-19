export interface Brand {
  _id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  logo?: string;
  // Categories this brand is curated onto. The list endpoint populates them,
  // so an entry can arrive as an object rather than a bare id.
  categories?: Array<string | { _id: string; name?: string; nameAr?: string }>;
  isActive: boolean;
  deleted: boolean;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
