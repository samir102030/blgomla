import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export interface Advertisement {
  _id: string;
  title: string;
  titleAr?: string;
  subtitle?: string;
  subtitleAr?: string;
  description?: string;
  descriptionAr?: string;
  image: string;
  link?: string;
  /** The artwork already has the headline on it — don't draw ours over it. */
  textInImage?: boolean;
  position:
    | "hero"
    | "banner"
    | "popup"
    | "announcement"
    | "category-strip"
    | "sidebar"
    | "pdp";
  isActive: boolean;
  startDate: string;
  endDate?: string;
  clickCount: number;
  viewCount: number;
  sortOrder: number;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdvertisementStore {
  advertisements: Advertisement[];
  activeAdvertisements: Advertisement[];
  loading: boolean;
  error: string | undefined;

  // Actions
  fetchAdvertisements: () => Promise<void>;
  fetchActiveAdvertisements: (position?: string) => Promise<void>;
  createAdvertisement: (data: Partial<Advertisement>) => Promise<boolean>;
  updateAdvertisement: (id: string, data: Partial<Advertisement>) => Promise<boolean>;
  deleteAdvertisement: (id: string) => Promise<boolean>;
  incrementViewCount: (id: string) => Promise<void>;
  incrementClickCount: (id: string) => Promise<void>;
}

export const useAdvertisementStore = create<AdvertisementStore>((set) => ({
  advertisements: [],
  activeAdvertisements: [],
  loading: false,
  error: undefined,

  fetchAdvertisements: async () => {
    set({ loading: true, error: undefined });
    try {
      const { data } = await axiosInstance.get("/advertisements");
      set({ advertisements: data.advertisements, loading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  fetchActiveAdvertisements: async (position?: string) => {
    set({ loading: true, error: undefined });
    try {
      const params = position ? { position } : {};
      const { data } = await axiosInstance.get("/advertisements/active", { params });
      set({ activeAdvertisements: data.advertisements, loading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  createAdvertisement: async (advertisementData) => {
    set({ loading: true, error: undefined });
    try {
      const { data } = await axiosInstance.post("/advertisements", advertisementData);
      set((state) => ({
        advertisements: [...state.advertisements, data.advertisement],
        loading: false,
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

  updateAdvertisement: async (id, advertisementData) => {
    set({ loading: true, error: undefined });
    try {
      const { data } = await axiosInstance.put(`/advertisements/${id}`, advertisementData);
      set((state) => ({
        advertisements: state.advertisements.map((ad) =>
          ad._id === id ? data.advertisement : ad
        ),
        loading: false,
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

  deleteAdvertisement: async (id) => {
    set({ loading: true, error: undefined });
    try {
      await axiosInstance.delete(`/advertisements/${id}`);
      set((state) => ({
        advertisements: state.advertisements.filter((ad) => ad._id !== id),
        loading: false,
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

  incrementViewCount: async (id) => {
    try {
      await axiosInstance.post(`/advertisements/${id}/view`);
    } catch (error) {
      console.error("Failed to increment view count:", error);
    }
  },

  incrementClickCount: async (id) => {
    try {
      await axiosInstance.post(`/advertisements/${id}/click`);
    } catch (error) {
      console.error("Failed to increment click count:", error);
    }
  },
}));

