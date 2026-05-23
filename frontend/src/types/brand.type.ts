export interface Brand {
  _id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  logo?: string;
  isActive: boolean;
  deleted: boolean;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
