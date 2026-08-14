import type { Product } from "./product.type";

export interface CollectionBrand {
  _id: string;
  name: string;
  nameAr?: string;
  logo?: string;
}

export interface CollectionItem {
  product: Product;
  quantity: number;
  /** Quoted price for this line. `null` means "follow the product's price". */
  unitPrice?: number | null;
}

export interface CollectionItemInput {
  product: string;
  quantity: number;
  unitPrice?: number | null;
}

/** Optional on-site fitting the customer can opt into. */
export interface CollectionInstallation {
  offered: boolean;
  /** Added per bundle. 0 while offered reads as "included". */
  price: number;
  note?: string;
  noteAr?: string;
}

export interface Collection {
  _id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  store: string | { _id: string; name?: string };
  items: CollectionItem[];
  brands?: CollectionBrand[];
  installation?: CollectionInstallation;
  bundlePrice: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
