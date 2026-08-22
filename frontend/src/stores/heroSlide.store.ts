import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export interface HeroSlideButton {
  label: string;
  labelAr?: string;
  href: string;
  style: "primary" | "ghost";
}

export interface HeroSlide {
  _id: string;
  eyebrow?: string;
  eyebrowAr?: string;
  title: string;
  titleAr?: string;
  accent?: string;
  accentAr?: string;
  image: string;
  icon?: string;
  buttons: HeroSlideButton[];
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Both languages travel on every slide and the storefront picks — the API
 * deliberately skips the translate middleware for this resource, so nothing
 * here is persisted and nothing goes stale in the wrong language. (See
 * lib/langCache for what happens when a store forgets that.)
 */
interface HeroSlideStore {
  slides: HeroSlide[];
  loading: boolean;
  error?: string;
  /** True once a fetch has settled, so the hero can tell "empty" from "not yet". */
  loaded: boolean;

  fetchActiveSlides: () => Promise<void>;
  fetchAllSlides: () => Promise<void>;
  createSlide: (data: Partial<HeroSlide>) => Promise<boolean>;
  updateSlide: (id: string, data: Partial<HeroSlide>) => Promise<boolean>;
  deleteSlide: (id: string) => Promise<boolean>;
  reorderSlides: (order: string[]) => Promise<boolean>;
  seedDefaults: () => Promise<boolean>;
}

const message = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

export const useHeroSlideStore = create<HeroSlideStore>((set, get) => ({
  slides: [],
  loading: false,
  error: undefined,
  loaded: false,

  fetchActiveSlides: async () => {
    set({ loading: true, error: undefined });
    try {
      const { data } = await axiosInstance.get("/hero-slides/active");
      set({ slides: data.slides || [], loading: false, loaded: true });
    } catch (error: any) {
      // The hero falls back to its built-in slides when this fails, so a dead
      // API costs the banner its editability, not its existence.
      set({ error: message(error, "Could not load slides"), loading: false, loaded: true });
    }
  },

  fetchAllSlides: async () => {
    set({ loading: true, error: undefined });
    try {
      const { data } = await axiosInstance.get("/hero-slides");
      set({ slides: data.slides || [], loading: false, loaded: true });
    } catch (error: any) {
      set({ error: message(error, "Could not load slides"), loading: false, loaded: true });
    }
  },

  createSlide: async (payload) => {
    try {
      await axiosInstance.post("/hero-slides", payload);
      await get().fetchAllSlides();
      return true;
    } catch (error: any) {
      set({ error: message(error, "Could not save the slide") });
      return false;
    }
  },

  updateSlide: async (id, payload) => {
    try {
      await axiosInstance.put(`/hero-slides/${id}`, payload);
      await get().fetchAllSlides();
      return true;
    } catch (error: any) {
      set({ error: message(error, "Could not save the slide") });
      return false;
    }
  },

  deleteSlide: async (id) => {
    try {
      await axiosInstance.delete(`/hero-slides/${id}`);
      await get().fetchAllSlides();
      return true;
    } catch (error: any) {
      set({ error: message(error, "Could not delete the slide") });
      return false;
    }
  },

  reorderSlides: async (order) => {
    // Paint the new order before the request settles: a list that only moves
    // after a round trip reads as a click that did nothing.
    const previous = get().slides;
    const byId = new Map(previous.map((slide) => [slide._id, slide]));
    set({ slides: order.map((id) => byId.get(id)).filter(Boolean) as HeroSlide[] });
    try {
      const { data } = await axiosInstance.put("/hero-slides/reorder", { order });
      set({ slides: data.slides || [] });
      return true;
    } catch (error: any) {
      set({ slides: previous, error: message(error, "Could not save the new order") });
      return false;
    }
  },

  seedDefaults: async () => {
    try {
      const { data } = await axiosInstance.post("/hero-slides/seed-defaults");
      set({ slides: data.slides || [], loaded: true });
      return true;
    } catch (error: any) {
      set({ error: message(error, "Could not restore the built-in slides") });
      return false;
    }
  },
}));
