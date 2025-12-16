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
  reviewRequests: any[];
  requestsTotal: number;
  requestsPage: number;
  requestsPages: number;

  // Actions
  fetchReviews: (filters?: ReviewFilters) => Promise<void>;
  fetchReviewStats: () => Promise<void>;
  toggleReviewVisibility: (
    productId: string,
    reviewId: string
  ) => Promise<boolean>;
  deleteReview: (productId: string, reviewId: string) => Promise<boolean>;
  requestHideReview: (productId: string, reviewId: string) => Promise<boolean>;
  requestDeleteReview: (
    productId: string,
    reviewId: string
  ) => Promise<boolean>;
  requestUnhideReview: (
    productId: string,
    reviewId: string
  ) => Promise<boolean>;
  fetchReviewRequests: (page?: number, status?: string) => Promise<void>;
  fetchVendorReviewRequests: (page?: number, status?: string) => Promise<void>;
  approveReviewRequest: (
    productId: string,
    requestId: string
  ) => Promise<boolean>;
  rejectReviewRequest: (
    productId: string,
    requestId: string,
    reason?: string
  ) => Promise<boolean>;

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
      reviewRequests: [],
      requestsTotal: 0,
      requestsPage: 1,
      requestsPages: 0,

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

      // Request to hide review (vendor)
      requestHideReview: async (productId: string, reviewId: string) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.post(
            `/reviews/${productId}/${reviewId}/request-hide`
          );

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

      // Request to delete review (vendor)
      requestDeleteReview: async (productId: string, reviewId: string) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.post(
            `/reviews/${productId}/${reviewId}/request-delete`
          );

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

      // Request to unhide review (vendor)
      requestUnhideReview: async (productId: string, reviewId: string) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.post(
            `/reviews/${productId}/${reviewId}/request-unhide`
          );

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

      // Fetch review requests (admin)
      fetchReviewRequests: async (page = 1, status = "pending") => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            data: any[];
            total: number;
            page: number;
            limit: number;
            pages: number;
          }>("/reviews/requests/list/all", {
            params: { page, limit: 20, status },
          });

          set({
            reviewRequests: data.data,
            requestsTotal: data.total,
            requestsPage: data.page,
            requestsPages: data.pages,
            loading: false,
          });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch vendor's own review requests
      fetchVendorReviewRequests: async (page = 1, status?: string) => {
        set({ loading: true, error: undefined });
        try {
          const params: any = { page, limit: 20 };
          if (status) params.status = status;

          const { data } = await axiosInstance.get<{
            success: boolean;
            data: any[];
            total: number;
            page: number;
            limit: number;
            pages: number;
          }>("/reviews/requests/vendor/my-requests", { params });

          set({
            reviewRequests: data.data,
            requestsTotal: data.total,
            requestsPage: data.page,
            requestsPages: data.pages,
            loading: false,
          });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Approve review request (admin)
      approveReviewRequest: async (productId: string, requestId: string) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.put(
            `/reviews/${productId}/requests/${requestId}/approve`
          );

          // Refresh requests
          const state = get();
          await state.fetchReviewRequests(state.requestsPage, "pending");

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

      // Reject review request (admin)
      rejectReviewRequest: async (
        productId: string,
        requestId: string,
        reason = ""
      ) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.put(
            `/reviews/${productId}/requests/${requestId}/reject`,
            { rejectionReason: reason }
          );

          // Refresh requests
          const state = get();
          await state.fetchReviewRequests(state.requestsPage, "pending");

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
          reviewRequests: [],
          requestsTotal: 0,
          requestsPage: 1,
          requestsPages: 0,
        }),
    }),
    {
      name: "review-store",
      partialize: () => ({}), // Don't persist review data
    }
  )
);
