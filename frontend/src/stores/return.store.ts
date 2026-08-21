import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type { ReturnRequest, ReturnStatus } from "../types/return.type";

interface ReturnStore {
  returns: ReturnRequest[];
  loading: boolean;
  error?: string;
  fetchMyReturns: () => Promise<void>;
  fetchReturns: () => Promise<void>;
  createReturn: (data: { orderId: string; reason?: string }) => Promise<boolean>;
  updateReturnStatus: (
    id: string,
    status: ReturnStatus,
    adminNote?: string
  ) => Promise<boolean>;
}

export const useReturnStore = create<ReturnStore>((set, get) => ({
  returns: [],
  loading: false,
  error: undefined,

  fetchMyReturns: async () => {
    set({ loading: true, error: undefined });
    try {
      const res = await axiosInstance.get<{
        success: boolean;
        returns: ReturnRequest[];
      }>("/returns/my-returns");
      set({ returns: res.data.returns ?? [], loading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  fetchReturns: async () => {
    set({ loading: true, error: undefined });
    try {
      const res = await axiosInstance.get<{
        success: boolean;
        returns: ReturnRequest[];
      }>("/returns");
      set({ returns: res.data.returns ?? [], loading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  createReturn: async (data) => {
    set({ loading: true, error: undefined });
    try {
      const res = await axiosInstance.post<{
        success: boolean;
        return: ReturnRequest;
      }>("/returns", data);
      set({
        returns: [res.data.return, ...get().returns],
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

  updateReturnStatus: async (id, status, adminNote) => {
    set({ loading: true, error: undefined });
    try {
      const res = await axiosInstance.put<{
        success: boolean;
        return: ReturnRequest;
      }>(`/returns/${id}/status`, { status, adminNote });
      set({
        returns: get().returns.map((item) =>
          item._id === id ? res.data.return : item
        ),
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
}));
