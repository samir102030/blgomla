import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { axiosInstance } from '../lib/axios';
import type { Coupon, CouponUsage, CouponValidation, CouponStats } from '../types/coupon.type';

interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  page: number;
  pages: number;
  success: boolean;
}

interface CouponStore {
  // State
  coupons: Coupon[];
  coupon: Coupon | undefined;
  couponUsages: CouponUsage[];
  couponStats: CouponStats | undefined;
  appliedCoupon: Coupon | undefined;
  couponValidation: CouponValidation | undefined;
  paginated: PaginatedResult<Coupon> | undefined;
  loading: boolean;
  error: string | undefined;

  // Coupon CRUD
  fetchCoupons: (params?: Record<string, any>) => Promise<void>;
  fetchCouponById: (couponId: string) => Promise<void>;
  fetchCouponByCode: (code: string) => Promise<void>;
  createCoupon: (data: Partial<Coupon>) => Promise<Coupon | undefined>;
  updateCoupon: (couponId: string, data: Partial<Coupon>) => Promise<Coupon | undefined>;
  deleteCoupon: (couponId: string) => Promise<boolean>;
  toggleCouponStatus: (couponId: string) => Promise<boolean>;

  // Coupon Validation & Application
  validateCoupon: (code: string, orderAmount: number, productIds?: string[]) => Promise<CouponValidation | undefined>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;

  // Coupon Usage
  fetchCouponUsages: (couponId?: string) => Promise<void>;
  fetchUserCouponUsages: (userId: string) => Promise<void>;

  // Coupon Analytics
  fetchCouponStats: () => Promise<void>;
  fetchAvailableCoupons: () => Promise<void>;

  // Utility
  clearError: () => void;
  reset: () => void;
}

export const useCouponStore = create<CouponStore>()(
  persist(
    (set) => ({
      // Initial State
      coupons: [],
      coupon: undefined,
      couponUsages: [],
      couponStats: undefined,
      appliedCoupon: undefined,
      couponValidation: undefined,
      paginated: undefined,
      loading: false,
      error: undefined,

      // Fetch Coupons
      fetchCoupons: async (params = {}) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<PaginatedResult<Coupon>>('/coupons', { params });
          set({ 
            coupons: data.data, 
            paginated: data, 
            loading: false 
          });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Coupon by ID
      fetchCouponById: async (couponId: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{ success: boolean; coupon: Coupon }>(`/coupons/${couponId}`);
          set({ coupon: data.coupon, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Coupon by Code
      fetchCouponByCode: async (code: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{ success: boolean; coupon: Coupon }>(`/coupons/code/${code}`);
          set({ coupon: data.coupon, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Create Coupon
      createCoupon: async (couponData: Partial<Coupon>) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.post<{ success: boolean; coupon: Coupon }>('/coupons', couponData);
          const newCoupon = data.coupon;
          set(state => ({
            coupons: [...state.coupons, newCoupon],
            loading: false
          }));
          return newCoupon;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return undefined;
        }
      },

      // Update Coupon
      updateCoupon: async (couponId: string, couponData: Partial<Coupon>) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.put<{ success: boolean; coupon: Coupon }>(`/coupons/${couponId}`, couponData);
          const updatedCoupon = data.coupon;
          set(state => ({
            coupons: state.coupons.map(coupon => 
              coupon._id === couponId ? updatedCoupon : coupon
            ),
            coupon: state.coupon?._id === couponId ? updatedCoupon : state.coupon,
            loading: false
          }));
          return updatedCoupon;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return undefined;
        }
      },

      // Delete Coupon
      deleteCoupon: async (couponId: string) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.delete(`/coupons/${couponId}`);
          set(state => ({
            coupons: state.coupons.filter(coupon => coupon._id !== couponId),
            loading: false
          }));
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Toggle Coupon Status
      toggleCouponStatus: async (couponId: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.patch<{ success: boolean; coupon: Coupon }>(`/coupons/${couponId}/toggle`);
          const updatedCoupon = data.coupon;
          set(state => ({
            coupons: state.coupons.map(coupon => 
              coupon._id === couponId ? updatedCoupon : coupon
            ),
            loading: false
          }));
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Validate Coupon
      validateCoupon: async (code: string, orderAmount: number, productIds?: string[]) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.post<{ success: boolean; validation: CouponValidation }>('/coupons/validate', {
            code,
            orderAmount,
            productIds
          });
          set({ couponValidation: data.validation, loading: false });
          return data.validation;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return undefined;
        }
      },

      // Apply Coupon
      applyCoupon: async (code: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.post<{ success: boolean; coupon: Coupon }>('/coupons/apply', { code });
          set({ appliedCoupon: data.coupon, loading: false });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Remove Coupon
      removeCoupon: () => {
        set({ appliedCoupon: undefined, couponValidation: undefined });
      },

      // Fetch Coupon Usages
      fetchCouponUsages: async (couponId?: string) => {
        set({ loading: true, error: undefined });
        try {
          const url = couponId ? `/coupons/${couponId}/usages` : '/coupons/usages';
          const { data } = await axiosInstance.get<{ success: boolean; usages: CouponUsage[] }>(url);
          set({ couponUsages: data.usages, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch User Coupon Usages
      fetchUserCouponUsages: async (userId: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{ success: boolean; usages: CouponUsage[] }>(`/coupons/user/${userId}/usages`);
          set({ couponUsages: data.usages, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Coupon Stats
      fetchCouponStats: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{ success: boolean; stats: CouponStats }>('/coupons/stats');
          set({ couponStats: data.stats, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Available Coupons
      fetchAvailableCoupons: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{ success: boolean; coupons: Coupon[] }>('/coupons/available');
          set({ coupons: data.coupons, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Clear Error
      clearError: () => set({ error: undefined }),

      // Reset Store
      reset: () => set({
        coupons: [],
        coupon: undefined,
        couponUsages: [],
        couponStats: undefined,
        appliedCoupon: undefined,
        couponValidation: undefined,
        paginated: undefined,
        loading: false,
        error: undefined,
      }),
    }),
    {
      name: 'coupon-store',
      partialize: (state) => ({
        appliedCoupon: state.appliedCoupon,
      }),
    }
  )
);
