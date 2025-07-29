import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

interface Brand {
  _id: string;
  name: string;
  description: string;
  website: string;
  logo: string;
  createdAt: string;
}


type UpsertBrand = Omit<Brand, "_id" | "createdAt">;

interface BrandStore {
  brands: Brand[];
  brand: Brand | null;
  loading: boolean;
  error: string | null;

  getAllBrands: () => Promise<void>;
  getBrandById: (id: string) => Promise<void>;
  createBrand: (brandData: UpsertBrand) => Promise<void>;
  updateBrand: (id: string, brandData: UpsertBrand) => Promise<void>;
  deleteBrand: (id: string) => Promise<void>;
}


const useBrandStore = create<BrandStore>((set, get) => ({
  brands: [],
  brand: null,
  loading: false,
  error: null,

  // fetch all
  getAllBrands: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get<Brand[]>("/brands");
      set({ brands: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  // fetch one
  getBrandById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get<Brand>(`/brands/${id}`);
      set({ brand: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  // create
  createBrand: async (brandData: UpsertBrand) => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.post<Brand>("/brands", brandData);
      set({
        brands: [...get().brands, data],
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  // update
  updateBrand: async (id: string, brandData: UpsertBrand) => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.put<Brand>(`/brands/${id}`, brandData);
      set({
        brands: get().brands.map((b) =>
          b._id === id ? data : b
        ),
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  // delete
  deleteBrand: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await axiosInstance.delete(`/brands/${id}`);
      set({
        brands: get().brands.filter((b) => b._id !== id),
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
}));

export default useBrandStore;
