import type { Product } from "./product.type";

export interface UserCartItem {
  product: string; // ObjectId as string
  quantity: number;
}

export interface UserLoveItem {
  product: string; // ObjectId as string
}

export type UserRole = "customer" | "store" | "admin";

export interface User {
  _id?: string;
  email: string;
  password?: string;
  name?: string;
  lastLogin?: string;
  isVerified: boolean;
  phoneVerified: boolean;
  phoneNumber?: string;
  profilePicture?: string;
  cart: UserCartItem[];
  love: Product[];
  // love: UserLoveItem[];
  role: UserRole;
  deleted: boolean;
  active: boolean;
  resetPasswordToken?: string;
  resetPasswordExpiresAt?: string;
  verificationToken?: string;
  verificationTokenExpiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
  // wishlist?: string[];
}
