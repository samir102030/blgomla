import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

// Contact Us (Supplier Request) form fields
export interface SupplierRequestForm {
  item: string;
  email: string;
  details?: string;
  quantity: string;
  phone: string;
}

// Service (Get quote) form fields
export interface GetQuoteForm {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  phone: string;
  country: string;
  products: string[];
  quantity: string;
  message?: string;
}

interface FormsStoreState {
  loading: boolean;
  error: string | null;
  supplierSuccess: boolean;
  getQuoteSuccess: boolean;
  submitSupplierRequest: (data: SupplierRequestForm) => Promise<void>;
  submitGetQuote: (data: GetQuoteForm) => Promise<void>;
  resetStatus: () => void;
}

export const useFormsStore = create<FormsStoreState>((set) => ({
  loading: false,
  error: null,
  supplierSuccess: false,
  getQuoteSuccess: false,

  submitSupplierRequest: async (data) => {
    set({ loading: true, error: null, supplierSuccess: false });
    try {
      await axiosInstance.post("/suppliers", data);
      set({ loading: false, supplierSuccess: true });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message, loading: false });
    }
  },

  submitGetQuote: async (data) => {
    set({ loading: true, error: null, getQuoteSuccess: false });
    try {
      await axiosInstance.post("/gitcodes", data);
      set({ loading: false, getQuoteSuccess: true });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message, loading: false });
    }
  },

  resetStatus: () => set({ supplierSuccess: false, getQuoteSuccess: false, error: null }),
}));
