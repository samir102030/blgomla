import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "../lib/axios";
import type { Review, ReviewStats, ReviewFilters } from "../types/review.type";

interface ReviewStore {
  // State
  reviews: Review[];
  stats: ReviewStats | undefined;
  loading: boolean;
  error: string | undefined;
  total: number;
  page: number;
  limit: number;
  pages: number;

  // Actions
  fetchReviews: (filters?: ReviewFilters) => Promise<void>;
  fetchReviewStats: () => Promise<void>;
  toggleReviewVisibility: (
    productId: string,
    reviewId: string
  ) => Promise<boolean>;
  deleteReview: (productId: string, reviewId: string) => Promise<boolean>;

  // Utility
  clearError: () => void;
  reset: () => void;
}

export const useReviewStore = create<ReviewStore>()(
  persist(
    (set, get) => ({
      // Initial State
      reviews: [],
      stats: undefined,
      loading: false,
      error: undefined,
      total: 0,
      page: 1,
      limit: 20,
      pages: 0,

      // Fetch Reviews
      fetchReviews: async (filters?: ReviewFilters) => {
        set({ loading: true, error: undefined });
        try {
          const params = {
            page: filters?.page || 1,
            limit: filters?.limit || 20,
            ...filters,
          };

          const { data } = await axiosInstance.get<{
            success: boolean;
            data: Review[];
            total: number;
            page: number;
            limit: number;
            pages: number;
          }>("/reviews", { params });

          set({
            reviews: data.data,
            total: data.total,
            page: data.page,
            limit: data.limit,
            pages: data.pages,
            loading: false,
          });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Review Stats
      fetchReviewStats: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            stats: ReviewStats;
          }>("/reviews/stats");

          set({ stats: data.stats, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Toggle Review Visibility
      toggleReviewVisibility: async (productId: string, reviewId: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.put<{
            success: boolean;
            message: string;
            isVisible: boolean;
          }>(`/reviews/${productId}/${reviewId}/visibility`);

          // Update the review in the local state
          const { reviews } = get();
          const updatedReviews = reviews.map((review) =>
            review.reviewId === reviewId
              ? { ...review, isVisible: data.isVisible }
              : review
          );

          set({ reviews: updatedReviews, loading: false });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Delete Review
      deleteReview: async (productId: string, reviewId: string) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.delete(`/reviews/${productId}/${reviewId}`);

          // Remove the review from local state
          const { reviews, total } = get();
          const updatedReviews = reviews.filter(
            (review) => review.reviewId !== reviewId
          );

          set({
            reviews: updatedReviews,
            total: total - 1,
            loading: false,
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

      // Clear Error
      clearError: () => set({ error: undefined }),

      // Reset Store
      reset: () =>
        set({
          reviews: [],
          stats: undefined,
          loading: false,
          error: undefined,
          total: 0,
          page: 1,
          limit: 20,
          pages: 0,
        }),
    }),
    {
      name: "review-store",
      partialize: () => ({}), // Don't persist review data
    }
  )
);
