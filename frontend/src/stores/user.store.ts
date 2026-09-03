import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, UserCartItem } from "../types/user.type";
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
  getProfile: () => Promise<User | undefined>;
  signup: (
    data: Partial<User> & { password: string }
  ) => Promise<User | undefined>;
  login: (data: {
    email: string;
    password: string;
    totpCode?: string;
  }) => Promise<{ user?: User; totpRequired?: boolean; emailNotVerified?: boolean }>;
  googleSignIn: (credential: string) => Promise<{ user?: User; totpRequired?: boolean }>;
  logout: () => Promise<void>;
  updateUser: (
    userId: string,
    data: Partial<User>
  ) => Promise<User | undefined>;
  updateProfile: (data: Partial<User>) => Promise<User | undefined>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<boolean>;
  safeDeleteUser: (userId: string) => Promise<boolean>;
  finalDeleteUser: (userId: string) => Promise<boolean>;
  changeUserRole: (userId: string, role: string) => Promise<boolean>;
  activateUser: (userId: string) => Promise<boolean>;
  deActivateUser: (userId: string) => Promise<boolean>;
  restoreUser: (userId: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (token: string, password: string) => Promise<boolean>;
  // ── Email verification ──
  verifyEmail: (email: string, code: string) => Promise<User | undefined>;
  resendVerificationCode: (email: string) => Promise<boolean>;
  loveProduct: (productId: string) => Promise<boolean>;
  toggleLoveProduct: (productId: string) => Promise<boolean>;
  fetchCart: () => Promise<void>;
  getLovedProducts: () => Promise<void>;
  // ── TOTP 2FA ──
  setup2FA: () => Promise<{ qrCodeDataUrl: string; secret: string } | undefined>;
  enable2FA: (code: string) => Promise<boolean>;
  disable2FA: (password: string, code: string) => Promise<boolean>;
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

      getProfile: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            user: User;
          }>(`/users/profile`);
          set({ user: data.user, loading: false });
          return data.user;
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

      login: async ({ email, password, totpCode }) => {
        set({ loading: true, error: undefined });
        try {
          const res = await axiosInstance.post<{
            success: boolean;
            user: User;
          }>(`/users/login`, { email, password, totpCode });
          set({ user: res.data.user, loading: false });
          return { user: res.data.user };
        } catch (error: any) {
          console.error('Login error:', error);
          // Backend returns code:"TOTP_REQUIRED" when the user has 2FA on
          // and submitted no code. Bubble that up so the UI can prompt
          // for the 6-digit code instead of showing a generic error.
          // Same idea for EMAIL_NOT_VERIFIED — the UI redirects to the
          // verify-email page rather than just printing the message.
          const code = error?.response?.data?.code;
          if (code === "TOTP_REQUIRED") {
            set({ error: undefined, loading: false });
            return { totpRequired: true };
          }
          if (code === "EMAIL_NOT_VERIFIED") {
            set({ error: undefined, loading: false });
            return { emailNotVerified: true };
          }
          const errorMessage = error?.response?.data?.message || error.message || 'Login failed';
          set({
            error: errorMessage,
            loading: false,
          });
          return {};
        }
      },

      googleSignIn: async (credential) => {
        set({ loading: true, error: undefined });
        try {
          const res = await axiosInstance.post<{
            success: boolean;
            user: User;
          }>(`/users/google`, { credential });
          set({ user: res.data.user, loading: false });
          return { user: res.data.user };
        } catch (error: any) {
          const code = error?.response?.data?.code;
          if (code === "TOTP_REQUIRED") {
            set({ error: undefined, loading: false });
            return { totpRequired: true };
          }
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return {};
        }
      },

      /*
        Signing out ends the session here whatever the server says.

        This used to clear `user` inside the try, after the POST resolved —
        so any failure left the account signed in. Offline, server down, or a
        session already expired and answering 401: the request rejects, the
        catch writes a message nobody displays, and the app carries on as the
        signed-in user with everything still in localStorage. On a shared
        machine that is the whole point of the button not happening.

        The path that matters most is the one in lib/axios.ts: when a token
        refresh fails it calls this to end the dead session — and if the
        refresh failed because the server is unreachable, so does this POST,
        so the session it was meant to clear survived.

        Telling the server is best effort and worth doing, since it is what
        revokes the refresh token. Ending the session locally is not
        optional, so it happens either way, and takes the cached roster with
        it rather than leaving it for the next person at this browser.
      */
      logout: async () => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.post(`/users/logout`);
        } catch {
          // Deliberately swallowed: there is nothing the person can do about
          // it, and the sign-out below happens regardless.
        } finally {
          set({
            user: undefined,
            users: [],
            deletedUsers: [],
            paginated: undefined,
            loading: false,
            error: undefined,
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
          // Only update the current user if it's the same user being updated
          const currentUser = get().user;
          if (currentUser && currentUser._id === userId) {
            set({ user: res.data.user, loading: false });
          } else {
            // Update the user in the users array if it exists
            set((state) => ({
              users: state.users.map((u) =>
                u._id === userId ? res.data.user : u
              ),
              loading: false,
            }));
          }
          return res.data.user;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      updateProfile: async (data) => {
        set({ loading: true, error: undefined });
        try {
          const res = await axiosInstance.put<{ success: boolean; user: User }>(
            `/users/profile`,
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

      changePassword: async (currentPassword, newPassword) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.put<{ success: boolean; message: string }>(
            `/users/changePassword`,
            { currentPassword, newPassword }
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

      verifyEmail: async (email, code) => {
        set({ loading: true, error: undefined });
        try {
          // Backend sets accessToken/refreshToken cookies on success, so
          // the returned user is already logged in — store it in `user`.
          const res = await axiosInstance.put<{ success: boolean; user: User }>(
            "/users/verifyEmail",
            { email, code }
          );
          set({ user: res.data.user, loading: false });
          return res.data.user;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return undefined;
        }
      },

      resendVerificationCode: async (email) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.post("/users/generateVerificationCode", { email });
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
          const res = await axiosInstance.put<{
            success: boolean;
            user: User;
          }>(`/users/loveProduct/${productId}`);

          // Update the user state with the new love array
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
      fetchCart: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{ cart: UserCartItem[] }>(
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

      setup2FA: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.post<{
            success: boolean;
            qrCodeDataUrl: string;
            secret: string;
          }>("/users/2fa/setup");
          set({ loading: false });
          return { qrCodeDataUrl: data.qrCodeDataUrl, secret: data.secret };
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return undefined;
        }
      },

      enable2FA: async (code) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.post("/users/2fa/enable", { code });
          const currentUser = get().user;
          if (currentUser) {
            set({ user: { ...currentUser, twoFactorEnabled: true }, loading: false });
          } else {
            set({ loading: false });
          }
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      disable2FA: async (password, code) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.post("/users/2fa/disable", { password, code });
          const currentUser = get().user;
          if (currentUser) {
            set({ user: { ...currentUser, twoFactorEnabled: false }, loading: false });
          } else {
            set({ loading: false });
          }
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },
    }),

    {
      name: "user-store",
      /*
        Only the signed-in account is persisted.

        With no `partialize`, zustand writes the whole store — which meant
        `users`, the admin roster fetched by the Users page, was copied into
        localStorage: every account's name, email, role and status, sitting
        in the browser profile indefinitely. Nothing removed it on sign-out,
        because sign-out cleared `user` and nothing else. An admin who opened
        that page once on a shared machine left the shop's user list behind
        for whoever sat down next, readable from the browser console.

        `deletedUsers` went the same way, and `loading` too — persisted mid
        request as `true`, it came back `true` on the next visit and left a
        spinner running over a screen with nothing loading.

        No version bump on purpose. Zustand discards persisted state when the
        version changes and no migration is supplied, which would sign every
        customer out on deploy. The keys below simply stop being written, and
        the first state change after this ships rewrites the entry without
        them; `merge` keeps a stale copy from being read back in meanwhile.
      */
      partialize: (state) => ({ user: state.user }),
      merge: (persisted, current) => ({
        ...current,
        user: (persisted as { user?: User } | undefined)?.user,
      }),
    }
  )
);
