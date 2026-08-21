import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type { Order } from "../types/order.type";
// import type { Order } from "../types/order.type";

interface OrderStore {
  orders: Order[];
  order?: Order;
  loading: boolean;
  error?: string;
  createOrder: (data: Partial<Order>) => Promise<Order | undefined>;
  fetchOrders: (params?: Record<string, any>) => Promise<void>;
  fetchOrderById: (id: string) => Promise<void>;
  fetchUserOrders: (userId?: string) => Promise<void>;
  updateOrderStatus: (id: string, status: string) => Promise<boolean>;
  markOrderPaid: (id: string, paymentResult?: any) => Promise<boolean>;
  markOrderDelivered: (id: string) => Promise<boolean>;
  cancelOrder: (id: string) => Promise<boolean>;
  deleteOrder: (id: string) => Promise<boolean>;
}

export const useOrderStore = create<OrderStore>((set) => ({
  orders: [],
  order: undefined,
  loading: false,
  error: undefined,

  createOrder: async (data) => {
    set({ loading: true, error: undefined });
    try {
      const res = await axiosInstance.post<{ success: boolean; order: Order }>(
        "/orders",
        data
      );
      set({ order: res.data.order, loading: false });
      return res.data.order;
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  fetchOrders: async (params = {}) => {
    set({ loading: true, error: undefined });
    try {
      const res = await axiosInstance.get<{
        success: boolean;
        orders: Order[];
      }>("/orders", { params });
      set({ orders: res.data.orders ?? [], loading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  fetchOrderById: async (id) => {
    set({ loading: true, error: undefined });
    try {
      const res = await axiosInstance.get<{ success: boolean; order: Order }>(
        `/orders/${id}`
      );
      set({ order: res.data.order, loading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  fetchUserOrders: async () => {
    set({ loading: true, error: undefined });
    try {
      const res = await axiosInstance.get<{
        success: boolean;
        orders: Order[];
      }>(`/orders/my-orders`);
      set({ orders: res.data.orders ?? [], loading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  updateOrderStatus: async (id, status) => {
    set({ loading: true, error: undefined });
    try {
      await axiosInstance.put(`/orders/${id}/status`, { status });
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

  markOrderPaid: async (id, paymentResult) => {
    set({ loading: true, error: undefined });
    try {
      await axiosInstance.put(`/orders/${id}/pay`, { paymentResult });
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

  markOrderDelivered: async (id) => {
    set({ loading: true, error: undefined });
    try {
      await axiosInstance.put(`/orders/${id}/deliver`);
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

  cancelOrder: async (id) => {
    set({ loading: true, error: undefined });
    try {
      await axiosInstance.put(`/orders/${id}/cancel`);
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

  deleteOrder: async (id) => {
    set({ loading: true, error: undefined });
    try {
      await axiosInstance.delete(`/orders/${id}`);
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
}));
