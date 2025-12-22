import type { Product } from "./product.type";

export interface CollectionItem {
  product: Product;
  quantity: number;
}

export interface Collection {
  _id: string;
  name: string;
  description?: string;
  store: string | { _id: string; name?: string };
  items: CollectionItem[];
  bundlePrice: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
