import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type {
  Collection,
  CollectionItemInput,
} from "../types/collection.type";

interface CollectionStore {
  collections: Collection[];
  loading: boolean;
  error?: string;
  fetchCollections: (params?: Record<string, any>) => Promise<void>;
  fetchMyCollections: () => Promise<void>;
  createCollection: (data: {
    name: string;
    description?: string;
    bundlePrice: number;
    items: CollectionItemInput[];
  }) => Promise<Collection | null>;
  updateCollection: (
    id: string,
    data: Partial<Omit<Collection, "items">> & { items?: CollectionItemInput[] }
  ) => Promise<Collection | null>;
  deleteCollection: (id: string) => Promise<boolean>;
  addCollectionToCart: (collectionId: string, quantity?: number) => Promise<boolean>;
  updateCollectionCart: (collectionId: string, quantity: number) => Promise<boolean>;
  removeCollectionFromCart: (collectionId: string) => Promise<boolean>;
}

export const useCollectionStore = create<CollectionStore>((set) => ({
  collections: [],
  loading: false,
  error: undefined,

  fetchCollections: async (params = {}) => {
    set({ loading: true, error: undefined });
    try {
      const res = await axiosInstance.get<{
        success: boolean;
        collections: Collection[];
      }>("/collections", { params });
      set({ collections: res.data.collections, loading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  fetchMyCollections: async () => {
    set({ loading: true, error: undefined });
    try {
      const res = await axiosInstance.get<{
        success: boolean;
        collections: Collection[];
      }>("/collections/vendor/my-collections");
      set({ collections: res.data.collections, loading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  createCollection: async (data) => {
    set({ loading: true, error: undefined });
    try {
      const res = await axiosInstance.post<{
        success: boolean;
        collection: Collection;
      }>("/collections", data);
      set((state) => ({
        collections: [res.data.collection, ...state.collections],
        loading: false,
      }));
      return res.data.collection;
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
      return null;
    }
  },

  updateCollection: async (id, data) => {
    set({ loading: true, error: undefined });
    try {
      const res = await axiosInstance.put<{
        success: boolean;
        collection: Collection;
      }>(`/collections/${id}`, data);
      set((state) => ({
        collections: state.collections.map((item) =>
          item._id === id ? res.data.collection : item
        ),
        loading: false,
      }));
      return res.data.collection;
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
      return null;
    }
  },

  deleteCollection: async (id) => {
    set({ loading: true, error: undefined });
    try {
      await axiosInstance.delete(`/collections/${id}`);
      set((state) => ({
        collections: state.collections.filter((item) => item._id !== id),
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

  addCollectionToCart: async (collectionId, quantity = 1) => {
    set({ loading: true, error: undefined });
    try {
      await axiosInstance.post("/collections/cart", { collectionId, quantity });
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

  updateCollectionCart: async (collectionId, quantity) => {
    set({ loading: true, error: undefined });
    try {
      await axiosInstance.put(`/collections/cart/${collectionId}`, { quantity });
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

  removeCollectionFromCart: async (collectionId) => {
    set({ loading: true, error: undefined });
    try {
      await axiosInstance.delete(`/collections/cart/${collectionId}`);
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
}));
