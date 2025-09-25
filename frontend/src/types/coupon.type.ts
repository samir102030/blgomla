export interface Coupon {
  _id: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderAmount?: number;
  maximumDiscountAmount?: number;
  usageLimit?: number;
  usedCount: number;
  userUsageLimit?: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  applicableProducts?: string[];
  applicableCategories?: string[];
  excludedProducts?: string[];
  excludedCategories?: string[];
  applicableUsers?: string[];
  firstTimeUserOnly?: boolean;
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
  isValid: boolean;
  message: string;
  discountAmount?: number;
  finalAmount?: number;
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
