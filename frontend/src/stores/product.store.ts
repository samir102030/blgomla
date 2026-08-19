import { create } from "zustand";
import { persist } from "zustand/middleware";
// import { Product } from "../types/product.type";
import { axiosInstance } from "../lib/axios";
import { trackBehavior } from "../lib/analytics";
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
  type?: "product" | "collection";
  product?: Product | string;
  collection?: string;
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
  scheduleSale: (
    productId: string,
    data: {
      salePercentage: number;
      saleStartsAt?: string | null;
      saleEndsAt?: string | null;
      clear?: boolean;
    }
  ) => Promise<Product | undefined>;
  deleteProduct: (productId: string) => Promise<boolean>;
  // Cart actions
  fetchCart: () => Promise<void>;
  addToCart: (
    productId: string,
    quantity?: number,
    installation?: boolean
  ) => Promise<void>;
  updateCartItem: (
    cartItemId: string,
    quantity: number,
    installation?: boolean
  ) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  // Review actions
  addReview: (
    productId: string,
    review: { rating: number; comment: string }
  ) => Promise<void>;
  updateReview: (
    productId: string,
    reviewId: string,
    review: { rating: number; comment: string }
  ) => Promise<void>;
  deleteReview: (productId: string, reviewId: string) => Promise<void>;
  checkReviewEligibility: (productId: string) => Promise<boolean>;
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

      addToCart: async (productId: string, quantity = 1, installation = false) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.post<{ cart: CartItem[] }>(
            "/products/cart",
            { productId, quantity, installation }
          );
          set({ cart: data.cart, loading: false });
          trackBehavior("add_to_cart", { product: productId });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      updateCartItem: async (
        cartItemId: string,
        quantity: number,
        installation?: boolean
      ) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.put<{ cart: CartItem[] }>(
            `/products/cart/${cartItemId}`,
            {
              quantity,
              ...(installation === undefined ? {} : { installation }),
            }
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
          const { data } = await axiosInstance.get<any>(
            `/products/${productId}`
          );
          console.log("fetchProductById response:", data);

          // Handle different response formats
          const product = data?.data?._id ? data.data : (data.product || data);
          set({ product, loading: false });
        } catch (error: any) {
          console.error("fetchProductById error:", error);
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

      scheduleSale: async (productId, data) => {
        set({ loading: true, error: undefined });
        try {
          const res = await axiosInstance.put<{
            success: boolean;
            product: Product;
          }>(`/products/sale-schedule/${productId}`, data);
          set({ loading: false });
          return res.data.product;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return undefined;
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

      // Review actions
      addReview: async (
        productId: string,
        review: { rating: number; comment: string }
      ) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.post<any>(
            `/products/${productId}/reviews`,
            review
          );
          console.log("addReview response:", data);
          const product = data?.data?._id ? data.data : (data.product || data);
          set({ product, loading: false });
        } catch (error: any) {
          console.error("addReview error:", error);
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      updateReview: async (
        productId: string,
        reviewId: string,
        review: { rating: number; comment: string }
      ) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.put<any>(
            `/products/${productId}/reviews/${reviewId}`,
            review
          );
          console.log("updateReview response:", data);
          const product = data?.data?._id ? data.data : (data.product || data);
          set({ product, loading: false });
        } catch (error: any) {
          console.error("updateReview error:", error);
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      deleteReview: async (productId: string, reviewId: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.delete<any>(
            `/products/${productId}/reviews/${reviewId}`
          );
          console.log("deleteReview response:", data);
          const product = data?.data?._id ? data.data : (data.product || data);
          set({ product, loading: false });
        } catch (error: any) {
          console.error("deleteReview error:", error);
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      checkReviewEligibility: async (productId: string) => {
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            eligible: boolean;
          }>(`/products/${productId}/reviews/eligibility`);
          return Boolean(data.eligible);
        } catch (error: any) {
          set({ error: error?.response?.data?.message || error.message });
          return false;
        }
      },
    }),
    {
      name: "product-store",
      skipHydration: true,
      /**
       * Only the cart is worth keeping across a reload.
       *
       * Without this the whole store went to localStorage, product lists
       * included. A listing page holds hundreds of products with their images,
       * descriptions and attributes, which overruns the 5MB quota — and a
       * failed `setItem` throws inside the persist middleware, so the write
       * that was meant to be a convenience took the page down with it and the
       * listing rendered "No products found". Lists are fetched on mount
       * anyway; they were never something a reload needed to restore.
       */
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);
