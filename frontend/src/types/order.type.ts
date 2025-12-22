export interface OrderItem {
  product: string; // product id
  collection?: string; // collection id (if part of bundle)
  collectionName?: string;
  quantity: number;
  price?: number;
}

export interface Order {
  _id: string;
  user: string; // user id
  orderItems: OrderItem[];
  shippingAddress: string; // address id
  paymentMethod: string;
  paymentResult?: {
    id?: string;
    status?: string;
    update_time?: string;
    email_address?: string;
  };
  itemsPrice: number;
  shippingPrice: number;
  taxPrice: number;
  totalPrice: number;
  isPaid: boolean;
  paidAt?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  cancelled: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
