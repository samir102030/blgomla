import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export interface MosaicTile {
  label?: string;
  labelAr?: string;
  image?: string;
  link?: string;
}

export interface MosaicCard {
  _id: string;
  title: string;
  titleAr?: string;
  type: "single" | "quadrant";
  image?: string;
  link?: string;
  tiles: MosaicTile[];
  isActive: boolean;
  sortOrder: number;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MosaicStore {
  cards: MosaicCard[];
  activeCards: MosaicCard[];
  loading: boolean;
  error: string | undefined;

  fetchMosaicCards: () => Promise<void>;
  fetchActiveMosaicCards: () => Promise<void>;
  createMosaicCard: (data: Partial<MosaicCard>) => Promise<boolean>;
  updateMosaicCard: (id: string, data: Partial<MosaicCard>) => Promise<boolean>;
  deleteMosaicCard: (id: string) => Promise<boolean>;
}

export const useMosaicStore = create<MosaicStore>((set) => ({
  cards: [],
  activeCards: [],
  loading: false,
  error: undefined,

  fetchMosaicCards: async () => {
    set({ loading: true, error: undefined });
    try {
      const { data } = await axiosInstance.get("/mosaic-cards");
      set({ cards: data.cards, loading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  fetchActiveMosaicCards: async () => {
    set({ loading: true, error: undefined });
    try {
      const { data } = await axiosInstance.get("/mosaic-cards/active");
      set({ activeCards: data.cards, loading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  createMosaicCard: async (cardData) => {
    set({ loading: true, error: undefined });
    try {
      const { data } = await axiosInstance.post("/mosaic-cards", cardData);
      set((state) => ({
        cards: [...state.cards, data.card],
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

  updateMosaicCard: async (id, cardData) => {
    set({ loading: true, error: undefined });
    try {
      const { data } = await axiosInstance.put(`/mosaic-cards/${id}`, cardData);
      set((state) => ({
        cards: state.cards.map((c) => (c._id === id ? data.card : c)),
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

  deleteMosaicCard: async (id) => {
    set({ loading: true, error: undefined });
    try {
      await axiosInstance.delete(`/mosaic-cards/${id}`);
      set((state) => ({
        cards: state.cards.filter((c) => c._id !== id),
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
}));
