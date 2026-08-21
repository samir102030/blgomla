import type { Product } from "./product.type";

export interface UserCartItem {
  type?: "product" | "collection";
  product?: string; // ObjectId as string
  collection?: string; // ObjectId as string
  quantity: number;
}

export interface UserLoveItem {
  product: string; // ObjectId as string
}

// Built-in roles, plus any custom role key created in Roles & Access.
export type UserRole =
  | "customer"
  | "store"
  | "admin"
  | "super_admin"
  | (string & {});

export interface User {
  _id?: string;
  email: string;
  password?: string;
  name?: string;
  lastLogin?: string;
  isVerified: boolean;
  phoneVerified: boolean;
  phoneNumber?: string;
  twoFactorEnabled?: boolean;
  profilePicture?: string;
  cart: UserCartItem[];
  love: Product[];
  loyaltyPoints?: number;
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;
  role: UserRole;
  /** Category branches this account is confined to. Empty means the whole catalogue. */
  categoryScope?: string[];
  /** Resolved permission keys for this user's role (from the backend). */
  permissions?: string[];
  deleted: boolean;
  active: boolean;
  resetPasswordToken?: string;
  resetPasswordExpiresAt?: string;
  verificationToken?: string;
  verificationTokenExpiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
  store?: any; // Store object if role is store
  adminExpiresAt?: string;
  adminGrantedBy?: string | User;
  // wishlist?: string[];
}
