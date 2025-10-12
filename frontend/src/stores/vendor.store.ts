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

  // Store Management
  createStore: (data: Partial<VendorStoreType>) => Promise<VendorStoreType>;
  fetchVendorStore: (vendorId?: string) => Promise<void>;
  updateStore: (id: string, data: Partial<VendorStoreType>) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;

  // Analytics & Stats
  fetchVendorAnalytics: (vendorId?: string) => Promise<void>;
  fetchDashboardStats: (vendorId?: string) => Promise<void>;

  // Utility
  clearError: () => void;
  reset: () => void;
}

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
            vendors: Vendor[];
          }>("/stores/vendors", { params });
          set({ vendors: response.data.vendors, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
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
      fetchVendorStore: async (vendorId?: string) => {
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
