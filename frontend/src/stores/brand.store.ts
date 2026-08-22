import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "../lib/axios";
import { keepIfSameLang, uiLang } from "../lib/langCache";
import type { Brand } from "../types/brand.type";

interface BrandStore {
  brands: Brand[];
  brand?: Brand;
  loading: boolean;
  error?: string;
  fetchBrands: () => Promise<void>;
  fetchBrandById: (brandId: string) => Promise<void>;
  createBrand: (data: Partial<Brand>) => Promise<Brand | undefined>;
  updateBrand: (
    brandId: string,
    data: Partial<Brand>
  ) => Promise<Brand | undefined>;
  deleteBrand: (brandId: string) => Promise<boolean>;
  safeDeleteBrand: (brandId: string) => Promise<boolean>;
  setBrandToProduct: (productId: string, brandId: string) => Promise<boolean>;
}

export const useBrandStore = create<BrandStore>()(
  persist(
    (set) => ({
      brands: [],
      brand: undefined,
      loading: false,
      error: undefined,

      fetchBrands: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            brands: Brand[];
          }>("/brands");
          set({ brands: data.brands, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      fetchBrandById: async (brandId: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            brand: Brand;
          }>(`/brands/${brandId}`);
          set({ brand: data.brand, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      createBrand: async (brandData: Partial<Brand>) => {
        set({ loading: true, error: undefined });
        try {
          const res = await axiosInstance.post<{
            success: boolean;
            brand: Brand;
          }>(`/brands`, brandData);
          set({ loading: false });
          return res.data.brand;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      updateBrand: async (brandId: string, brandData: Partial<Brand>) => {
        set({ loading: true, error: undefined });
        try {
          const res = await axiosInstance.put<{
            success: boolean;
            brand: Brand;
          }>(`/brands/${brandId}`, brandData);
          set({ loading: false });
          return res.data.brand;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      deleteBrand: async (brandId: string) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.delete(`/brands/${brandId}`);
          set({ loading: false });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      safeDeleteBrand: async (brandId: string) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.put(`/brands/delete/${brandId}`);
          set({ loading: false });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      setBrandToProduct: async (productId: string, brandId: string) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.put(`/brands/setBrandToProduct/${productId}`, {
            brandId,
          });
          set({ loading: false });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },
    }),
    {
      name: "brand-store",
      skipHydration: true,
      // Brand names carry an Arabic sibling too, so the saved copy is in one
      // language just as the category one is — same stamp, same reason.
      version: 1,
      partialize: (state) => ({ lang: uiLang(), brands: state.brands }),
      merge: (persisted, current) => ({
        ...current,
        ...keepIfSameLang(persisted, { brands: [] }),
      }),
    }
  )
);
