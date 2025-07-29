import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "../lib/axios";

export interface User {
  _id: string;
  username: string;
  email: string;
  companyName?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  password?: string;
  bio?: string;
  isAdmin: boolean;
  isApproved: boolean;
  approvalStatus?: "not requested" | "pending" | "approved" | "rejected";
  approvalRequestedAt?: string;
  profilePic?: string;
  googleId?: string;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  adminPermissions?: string[];
  isSuperAdmin?: boolean;
}

interface UserStoreState {
  user: User | null;
  users: User[];
  lang: string;
  loading: boolean;
  error: string | null;
  setLang: (lang: string) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: Partial<User>) => Promise<void>;
  getProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  requestApproval: () => Promise<void>;
  getAllUsers: () => Promise<void>;
  setUser: (user: User | null) => void;
  googleLogin: (credential: string) => Promise<void>;
}

export const useUserStore = create<UserStoreState>()(
  persist(
    (set, get) => ({
      user: null,
      users: [],
      lang: "en",
      loading: false,
      error: null,
      setLang: (lang: string) => set({ lang }),

      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const res = await axiosInstance.post("/users/login", { email, password });
          set({ user: res.data.user, loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      logout: async () => {
        set({ loading: true, error: null });
        try {
          await axiosInstance.post("/users/logout");
          set({ user: null, loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      register: async (data) => {
        set({ loading: true, error: null });
        try {
          const res = await axiosInstance.post("/users", data);
          set({ user: res.data.user, loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      getProfile: async () => {
        set({ loading: true, error: null });
        try {
          const res = await axiosInstance.get("/users/profile");
          set({ user: res.data, loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      updateProfile: async (data) => {
        set({ loading: true, error: null });
        try {
          const res = await axiosInstance.put("/users/profile", data);
          set({ user: res.data, loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      requestApproval: async () => {
        set({ loading: true, error: null });
        try {
          const res = await axiosInstance.post("/users/request-approval");
          set({ user: { ...get().user, approvalStatus: res.data.approvalStatus } as User, loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      getAllUsers: async () => {
        set({ loading: true, error: null });
        try {
          const res = await axiosInstance.get("/users");
          set({ users: res.data, loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },

      setUser: (user) => set({ user }),

      googleLogin: async (credential) => {
        set({ loading: true, error: null });
        try {
          const res = await axiosInstance.post("/users/google-login", { credential });
          set({ user: res.data.user, loading: false });
        } catch (err: any) {
          set({ error: err.message, loading: false });
        }
      },
    }),
    {
      name: "user-store",
      
      partialize: (state) => ({
        user: state.user,
        lang: state.lang,
      }),
    }
  )
);