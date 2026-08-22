import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export interface InstallationFeature {
  text: string;
  textAr?: string;
}

export interface InstallationService {
  _id: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  image?: string;
  icon?: string;
  features: InstallationFeature[];
  priceFrom: number;
  priceNote?: string;
  priceNoteAr?: string;
  badge?: string;
  badgeAr?: string;
  href: string;
  ctaLabel?: string;
  ctaLabelAr?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

interface InstallationServiceStore {
  services: InstallationService[];
  loading: boolean;
  error?: string;
  loaded: boolean;

  fetchActiveServices: () => Promise<void>;
  fetchAllServices: () => Promise<void>;
  createService: (data: Partial<InstallationService>) => Promise<boolean>;
  updateService: (id: string, data: Partial<InstallationService>) => Promise<boolean>;
  deleteService: (id: string) => Promise<boolean>;
  reorderServices: (order: string[]) => Promise<boolean>;
  seedDefaults: () => Promise<boolean>;
}

const message = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

export const useInstallationServiceStore = create<InstallationServiceStore>((set, get) => ({
  services: [],
  loading: false,
  error: undefined,
  loaded: false,

  fetchActiveServices: async () => {
    set({ loading: true, error: undefined });
    try {
      const { data } = await axiosInstance.get("/installation-services/active");
      set({ services: data.services || [], loading: false, loaded: true });
    } catch (error: any) {
      set({ error: message(error, "Could not load services"), loading: false, loaded: true });
    }
  },

  fetchAllServices: async () => {
    set({ loading: true, error: undefined });
    try {
      const { data } = await axiosInstance.get("/installation-services");
      set({ services: data.services || [], loading: false, loaded: true });
    } catch (error: any) {
      set({ error: message(error, "Could not load services"), loading: false, loaded: true });
    }
  },

  createService: async (payload) => {
    try {
      await axiosInstance.post("/installation-services", payload);
      await get().fetchAllServices();
      return true;
    } catch (error: any) {
      set({ error: message(error, "Could not save the service") });
      return false;
    }
  },

  updateService: async (id, payload) => {
    try {
      await axiosInstance.put(`/installation-services/${id}`, payload);
      await get().fetchAllServices();
      return true;
    } catch (error: any) {
      set({ error: message(error, "Could not save the service") });
      return false;
    }
  },

  deleteService: async (id) => {
    try {
      await axiosInstance.delete(`/installation-services/${id}`);
      await get().fetchAllServices();
      return true;
    } catch (error: any) {
      set({ error: message(error, "Could not delete the service") });
      return false;
    }
  },

  reorderServices: async (order) => {
    const previous = get().services;
    const byId = new Map(previous.map((service) => [service._id, service]));
    set({
      services: order.map((id) => byId.get(id)).filter(Boolean) as InstallationService[],
    });
    try {
      const { data } = await axiosInstance.put("/installation-services/reorder", { order });
      set({ services: data.services || [] });
      return true;
    } catch (error: any) {
      set({ services: previous, error: message(error, "Could not save the new order") });
      return false;
    }
  },

  seedDefaults: async () => {
    try {
      const { data } = await axiosInstance.post("/installation-services/seed-defaults");
      set({ services: data.services || [], loaded: true });
      return true;
    } catch (error: any) {
      set({ error: message(error, "Could not restore the built-in services") });
      return false;
    }
  },
}));
