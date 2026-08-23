/*
  ⚠ Not wired to anything. Every request in here 404s.

  This store calls /settings/app, /settings/app/reset, /settings/user and
  seven more. The API mounts no /settings route — see routes/system.route.js,
  which mounts forty of them and not this — so every action sets `error` and
  returns false. No component calls any of them either; the only reference is
  the barrel re-export in stores/index.ts.

  Kept rather than removed, but read types/settings.type.ts before using it:
  the shape it stores contradicts the shipping settings that actually exist.
*/
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { axiosInstance } from '../lib/axios';
import type { AppSettings, UserPreferences } from '../types/settings.type';

interface SettingsStore {
  // State
  appSettings: AppSettings | undefined;
  userPreferences: UserPreferences | undefined;
  loading: boolean;
  error: string | undefined;

  // App Settings (Admin)
  fetchAppSettings: () => Promise<void>;
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<boolean>;
  resetAppSettings: () => Promise<boolean>;
  uploadLogo: (file: File) => Promise<string | undefined>;
  uploadFavicon: (file: File) => Promise<string | undefined>;

  // User Preferences
  fetchUserPreferences: () => Promise<void>;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => Promise<boolean>;
  resetUserPreferences: () => Promise<boolean>;

  // Theme Management
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  toggleTheme: () => void;
  getCurrentTheme: () => 'light' | 'dark';

  // Language Management
  setLanguage: (language: string) => Promise<boolean>;
  getSupportedLanguages: () => Promise<string[]>;

  // Currency Management
  setCurrency: (currency: string) => Promise<boolean>;
  getSupportedCurrencies: () => Promise<string[]>;

  // Maintenance Mode
  enableMaintenanceMode: (message?: string) => Promise<boolean>;
  disableMaintenanceMode: () => Promise<boolean>;

  // Cache Management
  clearCache: () => Promise<boolean>;
  refreshSettings: () => Promise<void>;

  // Utility
  clearError: () => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // Initial State
      appSettings: undefined,
      userPreferences: undefined,
      loading: false,
      error: undefined,

      // Fetch App Settings
      fetchAppSettings: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{ success: boolean; settings: AppSettings }>('/settings/app');
          set({ appSettings: data.settings, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Update App Settings
      updateAppSettings: async (settings: Partial<AppSettings>) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.put<{ success: boolean; settings: AppSettings }>('/settings/app', settings);
          set({ appSettings: data.settings, loading: false });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Reset App Settings
      resetAppSettings: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.post<{ success: boolean; settings: AppSettings }>('/settings/app/reset');
          set({ appSettings: data.settings, loading: false });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Upload Logo
      uploadLogo: async (file: File) => {
        set({ loading: true, error: undefined });
        try {
          const formData = new FormData();
          formData.append('logo', file);
          const { data } = await axiosInstance.post<{ success: boolean; logoUrl: string }>('/settings/app/logo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          // Update app settings with new logo
          const currentSettings = get().appSettings;
          if (currentSettings) {
            set({ 
              appSettings: { ...currentSettings, logo: data.logoUrl },
              loading: false 
            });
          }
          
          return data.logoUrl;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return undefined;
        }
      },

      // Upload Favicon
      uploadFavicon: async (file: File) => {
        set({ loading: true, error: undefined });
        try {
          const formData = new FormData();
          formData.append('favicon', file);
          const { data } = await axiosInstance.post<{ success: boolean; faviconUrl: string }>('/settings/app/favicon', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          // Update app settings with new favicon
          const currentSettings = get().appSettings;
          if (currentSettings) {
            set({ 
              appSettings: { ...currentSettings, favicon: data.faviconUrl },
              loading: false 
            });
          }
          
          return data.faviconUrl;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return undefined;
        }
      },

      // Fetch User Preferences
      fetchUserPreferences: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{ success: boolean; preferences: UserPreferences }>('/settings/user');
          set({ userPreferences: data.preferences, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Update User Preferences
      updateUserPreferences: async (preferences: Partial<UserPreferences>) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.put<{ success: boolean; preferences: UserPreferences }>('/settings/user', preferences);
          set({ userPreferences: data.preferences, loading: false });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Reset User Preferences
      resetUserPreferences: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.post<{ success: boolean; preferences: UserPreferences }>('/settings/user/reset');
          set({ userPreferences: data.preferences, loading: false });
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Set Theme
      setTheme: (theme: 'light' | 'dark' | 'auto') => {
        const currentPreferences = get().userPreferences;
        if (currentPreferences) {
          const updatedPreferences = { ...currentPreferences, theme };
          set({ userPreferences: updatedPreferences });
          
          // Apply theme to document
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else if (theme === 'light') {
            document.documentElement.classList.remove('dark');
          } else {
            // Auto theme - check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
        }
      },

      // Toggle Theme
      toggleTheme: () => {
        const currentTheme = get().getCurrentTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },

      // Get Current Theme
      getCurrentTheme: () => {
        const preferences = get().userPreferences;
        if (!preferences || preferences.theme === 'auto') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return preferences.theme;
      },

      // Set Language
      setLanguage: async (language: string) => {
        const currentPreferences = get().userPreferences;
        if (currentPreferences) {
          return await get().updateUserPreferences({ language });
        }
        return false;
      },

      // Get Supported Languages
      getSupportedLanguages: async () => {
        try {
          const { data } = await axiosInstance.get<{ success: boolean; languages: string[] }>('/settings/languages');
          return data.languages;
        } catch (error) {
          return ['en', 'ar']; // Default languages
        }
      },

      // Set Currency
      setCurrency: async (currency: string) => {
        const currentPreferences = get().userPreferences;
        if (currentPreferences) {
          return await get().updateUserPreferences({ currency });
        }
        return false;
      },

      // Get Supported Currencies
      getSupportedCurrencies: async () => {
        try {
          const { data } = await axiosInstance.get<{ success: boolean; currencies: string[] }>('/settings/currencies');
          return data.currencies;
        } catch (error) {
          return ['USD', 'EUR', 'EGP']; // Default currencies
        }
      },

      // Enable Maintenance Mode
      enableMaintenanceMode: async (message = 'Site is under maintenance. Please check back later.') => {
        return await get().updateAppSettings({ 
          maintenanceMode: true, 
          maintenanceMessage: message 
        });
      },

      // Disable Maintenance Mode
      disableMaintenanceMode: async () => {
        return await get().updateAppSettings({ maintenanceMode: false });
      },

      // Clear Cache
      clearCache: async () => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.post('/settings/cache/clear');
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

      // Refresh Settings
      refreshSettings: async () => {
        await Promise.all([
          get().fetchAppSettings(),
          get().fetchUserPreferences()
        ]);
      },

      // Clear Error
      clearError: () => set({ error: undefined }),

      // Reset Store
      reset: () => set({
        appSettings: undefined,
        userPreferences: undefined,
        loading: false,
        error: undefined,
      }),
    }),
    {
      name: 'settings-store',
      partialize: (state) => ({
        userPreferences: state.userPreferences,
      }),
    }
  )
);
