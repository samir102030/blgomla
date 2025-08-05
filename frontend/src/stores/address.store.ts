import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type { Address } from "../types/address.type";
// import type { Address } from "../types/address.type";

interface AddressStore {
  addresses: Address[];
  address?: Address;
  loading: boolean;
  error?: string;
  createAddress: (data: Partial<Address>) => Promise<Address | undefined>;
  fetchAddresses: (params?: Record<string, any>) => Promise<void>;
  fetchAddressById: (id: string) => Promise<void>;
  fetchUserAddresses: (userId: string) => Promise<void>;
  updateAddress: (
    id: string,
    data: Partial<Address>
  ) => Promise<Address | undefined>;
  deleteAddress: (id: string) => Promise<boolean>;
  setDefaultAddress: (id: string) => Promise<boolean>;
}

export const useAddressStore = create<AddressStore>((set) => ({
  addresses: [],
  address: undefined,
  loading: false,
  error: undefined,

  createAddress: async (data) => {
    set({ loading: true, error: undefined });
    try {
      const res = await axiosInstance.post<{
        success: boolean;
        address: Address;
      }>("/addresses", data);
      set({ address: res.data.address, loading: false });
      return res.data.address;
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  fetchAddresses: async (params = {}) => {
    set({ loading: true, error: undefined });
    try {
      const res = await axiosInstance.get<{
        success: boolean;
        addresses: Address[];
      }>("/addresses", { params });
      set({ addresses: res.data.addresses, loading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  fetchAddressById: async (id) => {
    set({ loading: true, error: undefined });
    try {
      const res = await axiosInstance.get<{
        success: boolean;
        address: Address;
      }>(`/addresses/${id}`);
      set({ address: res.data.address, loading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  fetchUserAddresses: async () => {
    set({ loading: true, error: undefined });
    try {
      const res = await axiosInstance.get<{
        success: boolean;
        addresses: Address[];
      }>(`/addresses/`);
      // }>(`/addresses/user/${userId}`);
      set({ addresses: res.data.addresses, loading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  updateAddress: async (id, data) => {
    set({ loading: true, error: undefined });
    try {
      const res = await axiosInstance.put<{
        success: boolean;
        address: Address;
      }>(`/addresses/${id}`, data);
      set({ address: res.data.address, loading: false });
      return res.data.address;
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  deleteAddress: async (id) => {
    set({ loading: true, error: undefined });
    try {
      await axiosInstance.delete(`/addresses/${id}`);
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

  setDefaultAddress: async (id) => {
    set({ loading: true, error: undefined });
    try {
      await axiosInstance.put(`/addresses/${id}/default`);
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
