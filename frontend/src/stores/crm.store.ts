import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { CRMColumn, CRMItem } from "../types/crmQuote";

interface CRMState {
  columns: CRMColumn[];
  loading: boolean;
  error: string | null;
  getCRMData: () => Promise<void>;
  updateItemColumn: (itemId: string, columnId: string) => Promise<void>;
  reorderItemsInColumn: (columnId: string, itemIds: string[]) => Promise<void>;
  createColumn: (title: string) => Promise<void>;
  deleteColumn: (columnId: string, action: string, targetColumnId?: string) => Promise<void>;
  reorderColumns: (columns: { id: string; order: number }[]) => Promise<void>;
  // Quote-related methods that were in crmAPI
  getItemWithQuotes: (itemId: string) => Promise<any>;
  createQuoteFromCRM: (itemId: string, data: any) => Promise<any>;
  getQuoteHistory: (itemId: string, params?: any) => Promise<any>;
  getCustomerInfo: (itemId: string) => Promise<any>;
}

export const useCRMStore = create<CRMState>((set, get) => ({
  columns: [],
  loading: false,
  error: null,

  getCRMData: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.get("/crm");
      set({ columns: response.data.data || [], loading: false });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      set({ error: errorMessage, loading: false });
    }
  },

  updateItemColumn: async (itemId: string, columnId: string) => {
    // Note: No loading state set here as it's an optimistic update in the UI
    try {
      await axiosInstance.put(`/crm/items/${itemId}`, { columnId });
      // The component will handle reverting on error. A full refresh on success
      // can be triggered from the component if needed, but is often not necessary.
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      set({ error: errorMessage });
      // Re-throw to be caught in the component for toast notifications and reverting
      throw new Error(errorMessage);
    }
  },

  reorderItemsInColumn: async (columnId: string, itemIds: string[]) => {
    try {
      await axiosInstance.put(`/crm/columns/${columnId}/items/reorder`, { itemIds });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  createColumn: async (title: string) => {
    set({ loading: true });
    try {
      await axiosInstance.post("/crm/columns", { title });
      // Refresh data to show the new column
      await get().getCRMData();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  deleteColumn: async (columnId: string, action: string, targetColumnId?: string) => {
    set({ loading: true });
    try {
      // The body for a delete request is passed in the `data` property of the config object
      await axiosInstance.delete(`/crm/columns/${columnId}`, { 
        data: { action, targetColumnId } 
      });
      await get().getCRMData();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  reorderColumns: async (columns: { id: string; order: number }[]) => {
    try {
      await axiosInstance.put("/crm/columns/reorder", { columns });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Quote-related methods
  getItemWithQuotes: async (itemId: string) => {
    // These methods can set their own loading state if needed within the component
    // or we can add a separate loading indicator in the store for them.
    // For now, they just perform the API call.
    const response = await axiosInstance.get(`/crm/items/${itemId}/quotes`);
    return response.data;
  },

  createQuoteFromCRM: async (itemId: string, data: any) => {
    const response = await axiosInstance.post(
      `/crm/items/${itemId}/quotes`,
      data
    );
    return response.data;
  },

  getQuoteHistory: async (itemId: string, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await axiosInstance.get(
      `/crm/items/${itemId}/quote-history${queryString ? `?${queryString}` : ""}`
    );
    return response.data;
  },

  getCustomerInfo: async (itemId: string) => {
    const response = await axiosInstance.get(
      `/crm/items/${itemId}/customer-info`
    );
    return response.data;
  },
})); 