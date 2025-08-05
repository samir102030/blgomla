import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../types/user.type";
import { axiosInstance } from "../lib/axios";

interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  page: number;
  pages: number;
  success: boolean;
}

interface UserStore {
  users: User[];
  user?: User;
  deletedUsers: User[];
  paginated?: PaginatedResult<User>;
  loading: boolean;
  error?: string;
  fetchUsers: (params?: Record<string, any>) => Promise<void>;
  fetchDeletedUsers: (params?: Record<string, any>) => Promise<void>;
  fetchUserById: (userId: string) => Promise<void>;
  signup: (
    data: Partial<User> & { password: string }
  ) => Promise<User | undefined>;
  login: (data: {
    email: string;
    password: string;
  }) => Promise<User | undefined>;
  logout: () => Promise<void>;
  updateUser: (
    userId: string,
    data: Partial<User>
  ) => Promise<User | undefined>;
  safeDeleteUser: (userId: string) => Promise<boolean>;
  finalDeleteUser: (userId: string) => Promise<boolean>;
  changeUserRole: (userId: string, role: string) => Promise<boolean>;
  activateUser: (userId: string) => Promise<boolean>;
  deActivateUser: (userId: string) => Promise<boolean>;
  restoreUser: (userId: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (token: string, password: string) => Promise<boolean>;
  loveProduct: (productId: string) => Promise<boolean>;
  toggleLoveProduct: (productId: string) => Promise<boolean>;
  fetchCart: () => Promise<void>;
  getLovedProducts: () => Promise<void>;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      users: [],
      user: undefined,
      deletedUsers: [],
      paginated: undefined,
      loading: false,
      error: undefined,

      fetchUsers: async (params = {}) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<PaginatedResult<User>>(
            "/users",
            { params }
          );
          set({ users: data.data, paginated: data, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      fetchDeletedUsers: async (params = {}) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<PaginatedResult<User>>(
            "/users/deletedUsers",
            { params }
          );
          set({ deletedUsers: data.data, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      fetchUserById: async (userId: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            user: User;
          }>(`/users/${userId}`);
          set({ user: data.user, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      signup: async (userData) => {
        set({ loading: true, error: undefined });
        try {
          const res = await axiosInstance.post<{
            success: boolean;
            user: User;
          }>(`/users/signup`, userData);
          set({ user: res.data.user, loading: false });
          return res.data.user;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      login: async ({ email, password }) => {
        set({ loading: true, error: undefined });
        try {
          const res = await axiosInstance.post<{
            success: boolean;
            user: User;
          }>(`/users/login`, { email, password });
          set({ user: res.data.user, loading: false });
          return res.data.user;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      logout: async () => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.post(`/users/logout`);
          set({ user: undefined, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      updateUser: async (userId, data) => {
        set({ loading: true, error: undefined });
        try {
          const res = await axiosInstance.put<{ success: boolean; user: User }>(
            `/users/${userId}`,
            data
          );
          set({ user: res.data.user, loading: false });
          return res.data.user;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      safeDeleteUser: async (userId) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.delete(`/users/${userId}`);
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

      finalDeleteUser: async (userId) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.delete(`/users/usersFinalDelete/${userId}`);
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

      changeUserRole: async (userId, role) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.put(`/users/changeRole/${userId}`, { role });
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

      activateUser: async (userId) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.put(`/users/activateUser/${userId}`);
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

      deActivateUser: async (userId) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.put(`/users/deactivateUser/${userId}`);
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

      restoreUser: async (userId) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.put(`/users/restoreUser/${userId}`);
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

      forgotPassword: async (email) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.post(`/users/forgotPassword`, { email });
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

      resetPassword: async (token, password) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.post(`/users/resetPassword/${token}`, {
            password,
          });
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
      loveProduct: async (productId) => {
        set({ loading: true, error: undefined });
        try {
          const res = await axiosInstance.post<{
            success: boolean;
            user: User;
          }>(`/users/loveProduct/${productId}`);
          set({ user: res.data.user, loading: false });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },
      toggleLoveProduct: async (productId) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.put<{
            success: boolean;
            user: User;
          }>(`/users/loveProduct/${productId}`);
          set({  loading: false });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },
      fetchCart: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{ cart: any }>(
            "/products/cart"
          );
          const currentUser = get().user;
          if (currentUser) {
            set({
              user: {
                ...currentUser,
                cart: data.cart,
              },
              loading: false,
            });
          }
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      getLovedProducts: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get("/users/loveProducts");
          const currentUser = get().user;
          if (currentUser) {
            set({
              user: {
                ...currentUser,
                love: data.love,
              },
              loading: false,
            });
          }
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },
    }),

    {
      name: "user-store",
    }
  )
);
