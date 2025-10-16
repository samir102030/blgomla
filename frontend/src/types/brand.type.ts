export interface Brand {
  _id: string;
  name: string;
  description?: string;
  logo?: string;
  isActive: boolean;
  deleted: boolean;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
