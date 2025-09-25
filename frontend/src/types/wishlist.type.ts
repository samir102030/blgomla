import type { Product } from './product.type';
import type { User } from './user.type';

export interface WishlistItem {
  _id: string;
  user: string | User;
  product: string | Product;
  addedAt: string;
  notes?: string;
}

export interface Wishlist {
  _id: string;
  user: string | User;
  items: WishlistItem[];
  totalItems: number;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistStats {
  totalItems: number;
  recentlyAdded: WishlistItem[];
  mostWishlisted: Array<{
    product: Product;
    count: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
  }>;
}
