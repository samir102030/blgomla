import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { useUserStore } from "./user.store";

export interface MultilangText {
  en: string;
  ar?: string;
  fr?: string;
  de?: string;
  zh?: string;
  es?: string;
  ru?: string;
  ja?: string;
}

export interface Slider {
  _id: string;
  image: string;
  title: string;
  subtitle: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SlidersStoreState {
  sliders: Slider[];
  loading: boolean;
  error: string | null;
  fetchSliders: (lang?: string) => Promise<void>;
}

export const useSlidersStore = create<SlidersStoreState>((set) => ({
  sliders: [],
  loading: false,
  error: null,

  fetchSliders: async () => {
    set({ loading: true, error: null });
    try {
      const lang = useUserStore.getState().lang;
      const res = await axiosInstance.get("/sliders", { params: { lang } });
      const sliderData = res.data?.sliders || [];
      set({ sliders: Array.isArray(sliderData) ? sliderData : [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false, sliders: [] });
    }
  },
})); 