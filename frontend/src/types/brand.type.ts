export interface Brand {
  _id: string;
  name: string;
  description?: string;
  logo?: string;
  isActive: boolean;
  deleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}
