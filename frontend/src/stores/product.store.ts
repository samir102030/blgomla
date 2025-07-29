import { create } from "zustand";
// import axios from "axios";
import { axiosInstance } from "../lib/axios";
import { useUserStore } from "./user.store";

export interface brand {
  _id: string;
  name: string;
  logo: string;
}


export interface Product {
  _id: string;
  name: string | { en: string; [key: string]: any };
  price: number;
  category: string | Category;
  brand: string | brand;
  onSale: boolean;
  description?: string | { en: string; [key: string]: any };
  image?: string;
  rating?: number;
  saleStartDate?: string;
  saleEndDate?: string;
  // Technical and packaging fields
  chemicalName?: string | { en?: string | null; [key: string]: any };
  grade?: string | { en?: string | null; [key: string]: any };
  commercialName?: string | { en?: string | null; [key: string]: any };
  hsCode?: string | null;
  casNo?: string | null;
  usageApplications?: string | { en?: string | null; [key: string]: any };
  packingType?: string | null;
  packagingType?: string | null;
  hdPhotos?: string[];
  storage?: string | { en?: string | null; [key: string]: any };
  safetyStandard?: string | { en?: string | null; [key: string]: any };
  minimumQuantities?: number | null;
  certifications?: string | { en?: string | null; [key: string]: any };
}

export interface Category {
  _id: string;
  name: string;
  image: string;
}

export interface Industry {
  _id: string;
  name: string;
  category: string;
  brand: string;
  description: string;
  image: string;
}

interface Review {
  rating: number;
  comment: string;
}

interface ProductStore {
  products: Product[];
  product: Product | null;
  topProducts: Product[];
  newProducts: Product[];
  saleProducts: Product[];
  categoryProducts: Product[];
  brandProducts: Product[];
  loading: boolean;
  error: string | null;
  categories: Category[];

  getAllProducts: () => Promise<void>;
  getProductById: (id: string) => Promise<void>;
  createProduct: (data: Partial<Product>) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  searchProducts: (query: string) => Promise<void>;
  getTopProducts: () => Promise<void>;
  getNewProducts: () => Promise<void>;
  applySaleToProduct: (id: string, saleData: any) => Promise<void>;
  getProductsOnSale: () => Promise<void>;
  addProductReview: (id: string, review: Review) => Promise<void>;
  filterProducts: (filters: any) => Promise<void>;
  getProductsByCategoryId: (categoryId: string) => Promise<void>;
  getProductsByBrandId: (brandId: string) => Promise<void>;
  getAllCategories: () => Promise<void>;
}

export const useProductStore = create<ProductStore>((set) => ({
  products: [],
  product: null,
  topProducts: [],
  newProducts: [],
  saleProducts: [],
  categoryProducts: [],
  brandProducts: [],
  loading: false,
  error: null,
  categories: [],

  getAllProducts: async () => {
    set({ loading: true });
    try {
      const lang = useUserStore.getState().lang;
      const res = await axiosInstance.get(`/products?lang=${lang}`);
      set({ products: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  getProductById: async (id) => {
    set({ loading: true });
    try {
      const lang = useUserStore.getState().lang;
      const res = await axiosInstance.get(`/products/${id}?lang=${lang}`);
      set({ product: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createProduct: async (data) => {
    set({ loading: true });
    try {
      const lang = useUserStore.getState().lang;
      await axiosInstance.post("/api/products", data);
      await useProductStore.getState().getAllProducts();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  updateProduct: async (id, data) => {
    set({ loading: true });
    try {
      const lang = useUserStore.getState().lang;
      await axiosInstance.put(`/products/${id}?lang=${lang}`, data);
      await useProductStore.getState().getAllProducts();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  deleteProduct: async (id) => {
    set({ loading: true });
    try {
      const lang = useUserStore.getState().lang;
      await axiosInstance.delete(`/api/products/${id}?lang=${lang}`);
      await useProductStore.getState().getAllProducts();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  searchProducts: async (query) => {
    set({ loading: true });
    try {
      const lang = useUserStore.getState().lang;
      const res = await axiosInstance.get(`/api/products/search?name=${query}&lang=${lang}`);
      set({ products: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  getTopProducts: async () => {
    set({ loading: true });
    try {
      const lang = useUserStore.getState().lang;
      const res = await axiosInstance.get(`/api/products/top?lang=${lang}`);
      set({ topProducts: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  getNewProducts: async () => {
    set({ loading: true });
    try {
      const lang = useUserStore.getState().lang;
      const res = await axiosInstance.get(`/api/products/new?lang=${lang}`);
      set({ newProducts: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  applySaleToProduct: async (id, saleData) => {
    set({ loading: true });
    try {
      const lang = useUserStore.getState().lang;
      await axiosInstance.put(`/api/products/sale/${id}?lang=${lang}`, saleData);
      await useProductStore.getState().getAllProducts();
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  getProductsOnSale: async () => {
    set({ loading: true });
    try {
      const lang = useUserStore.getState().lang;
      const res = await axiosInstance.get(`/products/sale?lang=${lang}`);
      set({ saleProducts: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addProductReview: async (id, review) => {
    set({ loading: true });
    try {
      const lang = useUserStore.getState().lang;
      await axiosInstance.post(`/api/products/${id}/review?lang=${lang}`, review);
      await useProductStore.getState().getProductById(id);
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  filterProducts: async (filters) => {
    set({ loading: true });
    try {
      const lang = useUserStore.getState().lang;
      const res = await axiosInstance.post(`/api/products/filter?lang=${lang}`, filters);
      set({ products: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  getProductsByCategoryId: async (categoryId) => {
    set({ loading: true });
    try {
      const lang = useUserStore.getState().lang;
      const res = await axiosInstance.get(`/products/category/${categoryId}?lang=${lang}`);
      set({ categoryProducts: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  getProductsByBrandId: async (brandId) => {
    set({ loading: true });
    try {
      const lang = useUserStore.getState().lang;
      const res = await axiosInstance.get(`/api/products/brand/${brandId}?lang=${lang}`);
      set({ brandProducts: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
  getAllCategories: async () => {
    set({ loading: true });
    try {
      const lang = useUserStore.getState().lang;
      const res = await axiosInstance.get(`/categories?lang=${lang}`);
      set({ categories: res.data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
}));
