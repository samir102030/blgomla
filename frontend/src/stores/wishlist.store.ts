import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { axiosInstance } from '../lib/axios';
import { keepIfSameLang, uiLang } from '../lib/langCache';
import type { Wishlist, WishlistItem, WishlistStats } from '../types/wishlist.type';
import type { Product } from '../types/product.type';

interface WishlistStore {
  // State
  wishlist: Wishlist | undefined;
  wishlistItems: WishlistItem[];
  wishlistStats: WishlistStats | undefined;
  loading: boolean;
  error: string | undefined;

  // Wishlist Management
  fetchWishlist: () => Promise<void>;
  addToWishlist: (productId: string, notes?: string) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<boolean>;
  clearWishlist: () => Promise<boolean>;
  updateWishlistItem: (itemId: string, notes: string) => Promise<boolean>;
  
  // Wishlist Operations
  moveToCart: (itemId: string, quantity?: number) => Promise<boolean>;
  shareWishlist: () => Promise<string | undefined>;
  isInWishlist: (productId: string) => boolean;
  
  // Wishlist Analytics
  fetchWishlistStats: () => Promise<void>;
  
  // Utility
  clearError: () => void;
  reset: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      // Initial State
      wishlist: undefined,
      wishlistItems: [],
      wishlistStats: undefined,
      loading: false,
      error: undefined,

      // Fetch Wishlist
      fetchWishlist: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{ success: boolean; wishlist: Wishlist }>('/wishlist');
          set({ 
            wishlist: data.wishlist,
            wishlistItems: data.wishlist.items,
            loading: false 
          });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Add to Wishlist
      addToWishlist: async (productId: string, notes?: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.post<{ success: boolean; wishlist: Wishlist }>('/wishlist/add', {
            productId,
            notes
          });
          set({ 
            wishlist: data.wishlist,
            wishlistItems: data.wishlist.items,
            loading: false 
          });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Remove from Wishlist
      removeFromWishlist: async (productId: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.delete<{ success: boolean; wishlist: Wishlist }>(`/wishlist/remove/${productId}`);
          set({ 
            wishlist: data.wishlist,
            wishlistItems: data.wishlist.items,
            loading: false 
          });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Clear Wishlist
      clearWishlist: async () => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.delete('/wishlist/clear');
          set({ 
            wishlist: undefined,
            wishlistItems: [],
            loading: false 
          });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Update Wishlist Item
      updateWishlistItem: async (itemId: string, notes: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.put<{ success: boolean; wishlist: Wishlist }>(`/wishlist/item/${itemId}`, {
            notes
          });
          set({ 
            wishlist: data.wishlist,
            wishlistItems: data.wishlist.items,
            loading: false 
          });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Move to Cart
      moveToCart: async (itemId: string, quantity = 1) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.post<{ success: boolean; wishlist: Wishlist }>(`/wishlist/move-to-cart/${itemId}`, {
            quantity
          });
          set({ 
            wishlist: data.wishlist,
            wishlistItems: data.wishlist.items,
            loading: false 
          });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Share Wishlist
      shareWishlist: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.post<{ success: boolean; shareUrl: string }>('/wishlist/share');
          set({ loading: false });
          return data.shareUrl;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return undefined;
        }
      },

      // Check if Product is in Wishlist
      isInWishlist: (productId: string) => {
        const { wishlistItems } = get();
        return wishlistItems.some(item => {
          const product = item.product as Product;
          return typeof item.product === 'string' ? item.product === productId : product._id === productId;
        });
      },

      // Fetch Wishlist Stats
      fetchWishlistStats: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{ success: boolean; stats: WishlistStats }>('/wishlist/stats');
          set({ wishlistStats: data.stats, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Clear Error
      clearError: () => set({ error: undefined }),

      // Reset Store
      reset: () => set({
        wishlist: undefined,
        wishlistItems: [],
        wishlistStats: undefined,
        loading: false,
        error: undefined,
      }),
    }),
    {
      name: 'wishlist-store',
      // Saved items carry product names, which the API translates on the way
      // out — so the saved copy is in one language, same as the category and
      // brand ones. See lib/langCache.
      version: 1,
      partialize: (state) => ({
        lang: uiLang(),
        wishlistItems: state.wishlistItems,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...keepIfSameLang(persisted, { wishlistItems: [] }),
      }),
    }
  )
);
