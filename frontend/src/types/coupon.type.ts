export interface Coupon {
  _id: string;
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minimumPurchase?: number;
  maximumDiscount?: number;
  startDate: string;
  endDate: string;
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
  applicableProducts?: string[];
  applicableCategories?: string[];
  store: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CouponUsage {
  _id: string;
  coupon: string | Coupon;
  user: string;
  order: string;
  discountAmount: number;
  usedAt: string;
}

export interface CouponValidation {
  success: boolean;
  coupon?: {
    _id: string;
    code: string;
    discountType: string;
    discountValue: number;
    discount: number;
    applicableItems: number;
  };
  message?: string;
}

export interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  expiredCoupons: number;
  totalUsage: number;
  totalDiscountGiven: number;
  topCoupons: Array<{
    coupon: Coupon;
    usageCount: number;
    totalDiscount: number;
  }>;
}
