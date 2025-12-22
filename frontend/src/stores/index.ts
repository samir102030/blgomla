// Export all stores for easy importing
export { useUserStore } from './user.store';
export { useProductStore } from './product.store';
export { useOrderStore } from './order.store';
export { useBrandStore } from './brand.store';
export { useAddressStore } from './address.store';
export { useVendorStore } from './vendor.store';
export { useCategoryStore } from './category.store';
export { useWishlistStore } from './wishlist.store';
export { useCouponStore } from './coupon.store';
export { useNotificationStore } from './notification.store';
export { useAnalyticsStore } from './analytics.store';
export { useSettingsStore } from './settings.store';
export { useReturnStore } from './return.store';
export { useCollectionStore } from './collection.store';

// Export types
export type { User } from '../types/user.type';
export type { Product } from '../types/product.type';
export type { Order } from '../types/order.type';
export type { Brand } from '../types/brand.type';
export type { Address } from '../types/address.type';
export type { Vendor } from '../types/vendor.type';
export type { Category } from '../types/category.type';
export type { Wishlist, WishlistItem } from '../types/wishlist.type';
export type { Coupon } from '../types/coupon.type';
export type { Notification } from '../types/notification.type';
export type { DashboardStats, SalesAnalytics } from '../types/analytics.type';
export type { AppSettings, UserPreferences } from '../types/settings.type';
export type { ReturnRequest, ReturnStatus } from '../types/return.type';
export type { Collection, CollectionItem } from '../types/collection.type';
