import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export interface SiteModeBilingual {
  en: string;
  ar: string;
}

export interface SiteModePublic {
  comingSoon: boolean;
  title: SiteModeBilingual;
  message: SiteModeBilingual;
  launchAt: string | null;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
}

export interface SiteModeAdmin extends SiteModePublic {
  _id: string;
  key: string;
  previewKey: string;
  allowAdminBypass: boolean;
  blockPublicApi: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface SiteModeStore {
  mode?: SiteModePublic;
  adminMode?: SiteModeAdmin;
  subscribers: { _id: string; email: string; createdAt: string }[];
  loading: boolean;
  error?: string;

  fetchPublicMode: () => Promise<void>;
  fetchAdminMode: () => Promise<void>;
  updateAdminMode: (patch: Partial<SiteModeAdmin>) => Promise<boolean>;
  subscribe: (email: string, locale: string) => Promise<boolean>;
  fetchSubscribers: () => Promise<void>;
}

export const useSiteModeStore = create<SiteModeStore>((set, get) => ({
  mode: undefined,
  adminMode: undefined,
  subscribers: [],
  loading: false,
  error: undefined,

  fetchPublicMode: async () => {
    try {
      const { data } = await axiosInstance.get<{
        success: boolean;
        mode: SiteModePublic;
      }>("/site-mode");
      set({ mode: data.mode });
    } catch (err: any) {
      set({ error: err?.response?.data?.message || err.message });
    }
  },

  fetchAdminMode: async () => {
    set({ loading: true, error: undefined });
    try {
      const { data } = await axiosInstance.get<{
        success: boolean;
        mode: SiteModeAdmin;
      }>("/site-mode/admin");
      set({ adminMode: data.mode, loading: false });
    } catch (err: any) {
      set({
        error: err?.response?.data?.message || err.message,
        loading: false,
      });
    }
  },

  updateAdminMode: async (patch) => {
    set({ loading: true, error: undefined });
    try {
      const { data } = await axiosInstance.put<{
        success: boolean;
        mode: SiteModeAdmin;
      }>("/site-mode/admin", patch);
      set({ adminMode: data.mode, loading: false });
      // Refresh public mirror so the gate reflects the change immediately.
      get().fetchPublicMode();
      return true;
    } catch (err: any) {
      set({
        error: err?.response?.data?.message || err.message,
        loading: false,
      });
      return false;
    }
  },

  subscribe: async (email, locale) => {
    try {
      await axiosInstance.post("/site-mode/subscribe", { email, locale });
      return true;
    } catch (err: any) {
      set({ error: err?.response?.data?.message || err.message });
      return false;
    }
  },

  fetchSubscribers: async () => {
    set({ loading: true, error: undefined });
    try {
      const { data } = await axiosInstance.get<{
        success: boolean;
        subscribers: { _id: string; email: string; createdAt: string }[];
      }>("/site-mode/admin/subscribers");
      set({ subscribers: data.subscribers, loading: false });
    } catch (err: any) {
      set({
        error: err?.response?.data?.message || err.message,
        loading: false,
      });
    }
  },
}));
