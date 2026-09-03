import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "../lib/axios";
import type {
  Vendor,
  VendorRegistrationData,
  VendorStore as VendorStoreType,
  VendorAnalytics,
  VendorDashboardStats,
} from "../types/vendor.type";

interface VendorStore {
  // State
  vendors: Vendor[];
  vendor: Vendor | undefined;
  vendorStore: VendorStoreType | undefined;
  analytics: VendorAnalytics | undefined;
  vendorAnalytics: VendorAnalytics | undefined;
  dashboardStats: VendorDashboardStats | undefined;
  loading: boolean;
  error: string | undefined;

  // Vendor Registration & Management
  registerVendor: (data: VendorRegistrationData | FormData) => Promise<Vendor>;
  fetchVendors: (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;
  fetchVendorById: (id: string) => Promise<void>;
  approveVendor: (id: string) => Promise<void>;
  rejectVendor: (id: string, reason: string) => Promise<void>;
  suspendVendor: (id: string) => Promise<void>;
  activateVendor: (id: string) => Promise<void>;
  updateVendorStatus: (id: string, status: string) => Promise<void>;
  updateVendor: (id: string, data: Partial<Vendor>) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;
  safeDeleteVendor: (id: string) => Promise<void>;
  restoreVendor: (id: string) => Promise<void>;

  // Store Management
  createStore: (data: Partial<VendorStoreType>) => Promise<VendorStoreType>;
  fetchVendorStore: () => Promise<void>;
  updateStore: (id: string, data: Partial<VendorStoreType>) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;

  // Analytics & Stats
  fetchVendorAnalytics: (vendorId?: string) => Promise<void>;
  fetchDashboardStats: (vendorId?: string) => Promise<void>;

  // Utility
  clearError: () => void;
  reset: () => void;
}

/*
  Mutating actions in this store record the error AND rethrow it.

  They used to only record it, and resolve. Every page that calls one does so
  inside a try/catch and shows a success toast after the await — so the catch
  could never run and the toast always fired. An administrator whose session
  had expired pressed "Approve" on a pending vendor, got a 403 the store
  swallowed, was told "Vendor approved successfully", and watched the row keep
  its Pending badge. They moved on believing the vendor was live.

  Reads (`fetch*`) deliberately still swallow: their failure is what the
  `error` field is for, and their callers do not wrap them.
*/
export const useVendorStore = create<VendorStore>()(
  persist(
    (set, get) => ({
      // Initial State
      vendors: [],
      vendor: undefined,
      vendorStore: undefined,
      analytics: undefined,
      vendorAnalytics: undefined,
      dashboardStats: undefined,
      loading: false,
      error: undefined,

      // Vendor Registration
      registerVendor: async (data: VendorRegistrationData | FormData) => {
        set({ loading: true, error: undefined });
        try {
          let formData: FormData;

          if (data instanceof FormData) {
            formData = data;
          } else {
            formData = new FormData();

            // Append all text fields
            Object.entries(data).forEach(([key, value]) => {
              if (
                value !== undefined &&
                value !== null &&
                !(value instanceof File)
              ) {
                if (Array.isArray(value)) {
                  formData.append(key, JSON.stringify(value));
                } else if (typeof value === "object") {
                  formData.append(key, JSON.stringify(value));
                } else {
                  formData.append(key, value.toString());
                }
              }
            });

            // Append files
            if (data.commercialRegistrationDocument instanceof File) {
              formData.append(
                "commercialRegistrationDocument",
                data.commercialRegistrationDocument
              );
            }
            if (data.taxCardDocument instanceof File) {
              formData.append("taxCardDocument", data.taxCardDocument);
            }
            if (data.nationalIdDocument instanceof File) {
              formData.append("nationalIdDocument", data.nationalIdDocument);
            }
            if (data.bankStatementDocument instanceof File) {
              formData.append(
                "bankStatementDocument",
                data.bankStatementDocument
              );
            }
            if (data.storeLogo instanceof File) {
              formData.append("storeLogo", data.storeLogo);
            }
          }

          const response = await axiosInstance.post<{
            success: boolean;
            vendor: Vendor;
          }>("/stores/register", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });

          set({ vendor: response.data.vendor, loading: false });
          return response.data.vendor;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          throw error;
        }
      },

      // Fetch Vendors
      fetchVendors: async (params = {}) => {
        set({ loading: true, error: undefined });
        try {
          const response = await axiosInstance.get<{
            success: boolean;
            data: Vendor[];
          }>("/stores/vendors", { params });
          set({ vendors: response.data.data || [], loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
            vendors: [], // Ensure vendors is always an array
          });
        }
      },

      // Fetch Vendor by ID
      fetchVendorById: async (id: string) => {
        set({ loading: true, error: undefined });
        try {
          const response = await axiosInstance.get<{
            success: boolean;
            vendor: Vendor;
          }>(`/stores/vendors/${id}`);
          set({ vendor: response.data.vendor, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Approve Vendor
      approveVendor: async (id: string) => {
        set({ loading: true, error: undefined });
        try {
          const response = await axiosInstance.put<{
            success: boolean;
            vendor: Vendor;
          }>(`/stores/vendors/${id}/approve`);

          const { vendors } = get();
          const updatedVendors = vendors.map((v) =>
            v._id === id ? response.data.vendor : v
          );

          set({
            vendors: updatedVendors,
            vendor: response.data.vendor,
            loading: false,
          });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          // Rethrown so the caller's catch can run. Without this the action
          // resolved on failure, every page `await`ed it inside a try/catch
          // whose catch could never fire, and the success toast showed on a
          // 403 — see the note at the top of this file.
          throw error;
        }
      },

      // Reject Vendor
      rejectVendor: async (id: string, reason: string) => {
        set({ loading: true, error: undefined });
        try {
          const response = await axiosInstance.put<{
            success: boolean;
            vendor: Vendor;
          }>(`/stores/vendors/${id}/reject`, { reason });

          const { vendors } = get();
          const updatedVendors = vendors.map((v) =>
            v._id === id ? response.data.vendor : v
          );

          set({
            vendors: updatedVendors,
            vendor: response.data.vendor,
            loading: false,
          });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          // Rethrown so the caller's catch can run. Without this the action
          // resolved on failure, every page `await`ed it inside a try/catch
          // whose catch could never fire, and the success toast showed on a
          // 403 — see the note at the top of this file.
          throw error;
        }
      },

      // Suspend Vendor
      suspendVendor: async (id: string) => {
        set({ loading: true, error: undefined });
        try {
          const response = await axiosInstance.put<{
            success: boolean;
            vendor: Vendor;
          }>(`/stores/vendors/${id}/suspend`);

          const { vendors } = get();
          const updatedVendors = vendors.map((v) =>
            v._id === id ? response.data.vendor : v
          );

          set({
            vendors: updatedVendors,
            vendor: response.data.vendor,
            loading: false,
          });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          // Rethrown so the caller's catch can run. Without this the action
          // resolved on failure, every page `await`ed it inside a try/catch
          // whose catch could never fire, and the success toast showed on a
          // 403 — see the note at the top of this file.
          throw error;
        }
      },

      // Activate Vendor
      activateVendor: async (id: string) => {
        set({ loading: true, error: undefined });
        try {
          const response = await axiosInstance.put<{
            success: boolean;
            vendor: Vendor;
          }>(`/stores/vendors/${id}/activate`);

          const { vendors } = get();
          const updatedVendors = vendors.map((v) =>
            v._id === id ? response.data.vendor : v
          );

          set({
            vendors: updatedVendors,
            vendor: response.data.vendor,
            loading: false,
          });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          // Rethrown so the caller's catch can run. Without this the action
          // resolved on failure, every page `await`ed it inside a try/catch
          // whose catch could never fire, and the success toast showed on a
          // 403 — see the note at the top of this file.
          throw error;
        }
      },

      // Update Vendor Status
      updateVendorStatus: async (id: string, status: string) => {
        set({ loading: true, error: undefined });
        try {
          const response = await axiosInstance.put<{
            success: boolean;
            vendor: Vendor;
          }>(`/stores/vendors/${id}/status`, { status });

          const { vendors } = get();
          const updatedVendors = vendors.map((v) =>
            v._id === id ? response.data.vendor : v
          );

          set({
            vendors: updatedVendors,
            vendor: response.data.vendor,
            loading: false,
          });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          // Rethrown so the caller's catch can run. Without this the action
          // resolved on failure, every page `await`ed it inside a try/catch
          // whose catch could never fire, and the success toast showed on a
          // 403 — see the note at the top of this file.
          throw error;
        }
      },

      // Update Vendor
      updateVendor: async (id: string, data: Partial<Vendor>) => {
        set({ loading: true, error: undefined });
        try {
          const response = await axiosInstance.put<{
            success: boolean;
            vendor: Vendor;
          }>(`/vendors/${id}`, data);

          const { vendors } = get();
          const updatedVendors = vendors.map((v) =>
            v._id === id ? response.data.vendor : v
          );

          set({
            vendors: updatedVendors,
            vendor: response.data.vendor,
            loading: false,
          });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          // Rethrown so the caller's catch can run. Without this the action
          // resolved on failure, every page `await`ed it inside a try/catch
          // whose catch could never fire, and the success toast showed on a
          // 403 — see the note at the top of this file.
          throw error;
        }
      },

      // Delete Vendor
      deleteVendor: async (id: string) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.delete(`/stores/vendors/${id}`);

          const { vendors } = get();
          const updatedVendors = vendors.filter((v) => v._id !== id);

          set({ vendors: updatedVendors, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          // Rethrown so the caller's catch can run. Without this the action
          // resolved on failure, every page `await`ed it inside a try/catch
          // whose catch could never fire, and the success toast showed on a
          // 403 — see the note at the top of this file.
          throw error;
        }
      },

      // Safe Delete Vendor
      safeDeleteVendor: async (id: string) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.put(`/stores/vendors/${id}/safeDelete`);

          const { vendors } = get();
          const updatedVendors = vendors.map((v) =>
            v._id === id ? { ...v, deleted: true, isActive: false } : v
          );

          set({ vendors: updatedVendors, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          // Rethrown so the caller's catch can run. Without this the action
          // resolved on failure, every page `await`ed it inside a try/catch
          // whose catch could never fire, and the success toast showed on a
          // 403 — see the note at the top of this file.
          throw error;
        }
      },

      // Restore Vendor
      restoreVendor: async (id: string) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.put(`/stores/vendors/${id}/restore`);

          const { vendors } = get();
          const updatedVendors = vendors.map((v) =>
            v._id === id ? { ...v, deleted: false, isActive: true } : v
          );

          set({ vendors: updatedVendors, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          // Rethrown so the caller's catch can run. Without this the action
          // resolved on failure, every page `await`ed it inside a try/catch
          // whose catch could never fire, and the success toast showed on a
          // 403 — see the note at the top of this file.
          throw error;
        }
      },

      // Create Store
      createStore: async (data: Partial<VendorStoreType>) => {
        set({ loading: true, error: undefined });
        try {
          const response = await axiosInstance.post<{
            success: boolean;
            store: VendorStoreType;
          }>("/stores", data);
          set({ vendorStore: response.data.store, loading: false });
          return response.data.store;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          throw error;
        }
      },

      // Fetch Vendor Store
      fetchVendorStore: async () => {
        set({ loading: true, error: undefined });
        try {
          // const url = vendorId ? `/stores/${vendorId}` : "/stores/store";
          console.log("Fetching vendor store");
          const url = "/stores/store";
          const response = await axiosInstance.get<{
            success: boolean;
            store: VendorStoreType;
          }>(url);
          set({ vendorStore: response.data.store, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Update Store
      updateStore: async (id: string, data: Partial<VendorStoreType>) => {
        set({ loading: true, error: undefined });
        try {
          const response = await axiosInstance.put<{
            success: boolean;
            store: VendorStoreType;
          }>(`/stores/${id}`, data);
          set({ vendorStore: response.data.store, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          // Rethrown so the caller's catch can run. Without this the action
          // resolved on failure, every page `await`ed it inside a try/catch
          // whose catch could never fire, and the success toast showed on a
          // 403 — see the note at the top of this file.
          throw error;
        }
      },

      // Delete Store
      deleteStore: async (id: string) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.delete(`/stores/${id}`);
          set({ vendorStore: undefined, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          // Rethrown so the caller's catch can run. Without this the action
          // resolved on failure, every page `await`ed it inside a try/catch
          // whose catch could never fire, and the success toast showed on a
          // 403 — see the note at the top of this file.
          throw error;
        }
      },

      // Fetch Analytics
      fetchVendorAnalytics: async (vendorId?: string) => {
        set({ loading: true, error: undefined });
        try {
          const url = vendorId
            ? `/stores/${vendorId}/analytics`
            : "/stores/analytics";
          const response = await axiosInstance.get<{
            success: boolean;
            analytics: VendorAnalytics;
          }>(url);
          set({ analytics: response.data.analytics, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Dashboard Stats
      fetchDashboardStats: async (vendorId?: string) => {
        set({ loading: true, error: undefined });
        try {
          const url = vendorId
            ? `/stores/${vendorId}/statistics`
            : "/stores/statistics";
          const response = await axiosInstance.get<{
            success: boolean;
            statistics: VendorDashboardStats;
          }>(url);
          set({ dashboardStats: response.data.statistics, loading: false });
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
      reset: () =>
        set({
          vendors: [],
          vendor: undefined,
          vendorStore: undefined,
          analytics: undefined,
          vendorAnalytics: undefined,
          dashboardStats: undefined,
          loading: false,
          error: undefined,
        }),
    }),
    {
      name: "vendor-store",
      partialize: (state) => ({
        vendor: state.vendor,
        vendorStore: state.vendorStore,
      }),
    }
  )
);
