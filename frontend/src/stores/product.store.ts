import { create } from "zustand";
import { persist } from "zustand/middleware";
// import { Product } from "../types/product.type";
import { axiosInstance } from "../lib/axios";
import type { Product } from "../types/product.type";

interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  page: number;
  pages: number;
  success: boolean;
}

interface CartItem {
  product: Product | string;
  quantity: number;
  _id?: string;
}

interface ProductStore {
  products: Product[];
  product?: Product;
  paginated?: PaginatedResult<Product>;
  loading: boolean;
  error?: string;
  cart: CartItem[];
  fetchProducts: (params?: Record<string, any>) => Promise<void>;
  fetchProductById: (productId: string) => Promise<void>;
  fetchFeaturedProducts: () => Promise<void>;
  fetchSaleProducts: () => Promise<void>;
  fetchBestSellers: () => Promise<void>;
  fetchNewestProducts: () => Promise<void>;
  fetchMostRatedProducts: () => Promise<void>;
  createProduct: (data: Partial<Product>) => Promise<Product | undefined>;
  updateProduct: (
    productId: string,
    data: Partial<Product>
  ) => Promise<Product | undefined>;
  deleteProduct: (productId: string) => Promise<boolean>;
  // Cart actions
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateCartItem: (cartItemId: string, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  // ...add more actions as needed (reviews, features, attributes)
}

export const useProductStore = create<ProductStore>()(
  persist(
    (set) => ({
      products: [],
      product: undefined,
      paginated: undefined,
      loading: false,
      error: undefined,
      cart: [],
      // CART ACTIONS
      fetchCart: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{ cart: CartItem[] }>(
            "/products/cart"
          );
          set({ cart: data.cart, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      addToCart: async (productId: string, quantity = 1) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.post<{ cart: CartItem[] }>(
            "/products/cart",
            { productId, quantity }
          );
          set({ cart: data.cart, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      updateCartItem: async (cartItemId: string, quantity: number) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.put<{ cart: CartItem[] }>(
            `/products/cart/${cartItemId}`,
            { quantity }
          );
          set({ cart: data.cart, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      removeFromCart: async (cartItemId: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.delete<{ cart: CartItem[] }>(
            `/products/cart/${cartItemId}`
          );
          set({ cart: data.cart, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      clearCart: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.delete<{ cart: CartItem[] }>(
            "/cart"
          );
          set({ cart: data.cart, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      fetchProducts: async (params = {}) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<PaginatedResult<Product>>(
            "/products",
            { params }
          );
          set({ products: data.data, paginated: data, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      fetchProductById: async (productId: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<PaginatedResult<Product>>(
            `/products/${productId}`
          );
          set({ product: data.data?.[0], loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      fetchFeaturedProducts: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<PaginatedResult<Product>>(
            "/products/featured"
          );
          set({ products: data.data, paginated: data, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      fetchSaleProducts: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<PaginatedResult<Product>>(
            "/products/saleProducts"
          );
          set({ products: data.data, paginated: data, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      fetchBestSellers: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<PaginatedResult<Product>>(
            "/products/bestSellers"
          );
          set({ products: data.data, paginated: data, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      fetchNewestProducts: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<PaginatedResult<Product>>(
            "/products/newest"
          );
          set({ products: data.data, paginated: data, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      fetchMostRatedProducts: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<PaginatedResult<Product>>(
            "/products/mostRated"
          );
          set({ products: data.data, paginated: data, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      createProduct: async (data: Partial<Product>) => {
        set({ loading: true, error: undefined });
        try {
          const res = await axiosInstance.post<{
            success: boolean;
            product: Product;
          }>("/products", data);
          set({ loading: false });
          return res.data.product;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      updateProduct: async (productId: string, data: Partial<Product>) => {
        set({ loading: true, error: undefined });
        try {
          const res = await axiosInstance.put<{
            success: boolean;
            product: Product;
          }>(`/products/${productId}`, data);
          set({ loading: false });
          return res.data.product;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      deleteProduct: async (productId: string) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.delete(`/products/${productId}`);
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
      name: "product-store",
      skipHydration: true,
    }
  )
);
