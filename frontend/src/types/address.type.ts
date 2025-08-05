export interface Address {
  _id: string;
  user: string; // user id
  name: string;
  phone?: string;
  address: string;
  city: string;
  state?: string;
  zipCode?: string;
  country?: string;
  isDefault: boolean;
  type: "Billing" | "Shipping";
  createdAt?: string;
  updatedAt?: string;
}
