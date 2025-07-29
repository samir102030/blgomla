import { create } from 'zustand';
import { missionAPI, visionAPI, valuesAPI } from '../utils/api';

interface AboutContent {
  _id?: string;
  title: { en: string; ar?: string; fr?: string; de?: string; zh?: string; es?: string; ru?: string; ja?: string } | string;
  content: { en: string; ar?: string; fr?: string; de?: string; zh?: string; es?: string; ru?: string; ja?: string } | string;
  image?: string;
}

interface AboutStore {
  // State
  mission: AboutContent | null;
  vision: AboutContent | null;
  values: AboutContent | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchMission: (lang?: string) => Promise<void>;
  fetchVision: (lang?: string) => Promise<void>;
  fetchValues: (lang?: string) => Promise<void>;
  updateMission: (data: any) => Promise<void>;
  updateVision: (data: any) => Promise<void>;
  updateValues: (data: any) => Promise<void>;
  clearError: () => void;
}

export const useAboutStore = create<AboutStore>((set, get) => ({
  // Initial state
  mission: null,
  vision: null,
  values: null,
  loading: false,
  error: null,

  // Actions
  fetchMission: async (lang = 'en') => {
    try {
      set({ loading: true, error: null });
      const response = await missionAPI.get({ lang });
      set({ mission: response, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch mission';
      set({ error: errorMessage, loading: false });
    }
  },

  fetchVision: async (lang = 'en') => {
    try {
      set({ loading: true, error: null });
      const response = await visionAPI.get({ lang });
      set({ vision: response, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch vision';
      set({ error: errorMessage, loading: false });
    }
  },

  fetchValues: async (lang = 'en') => {
    try {
      set({ loading: true, error: null });
      const response = await valuesAPI.get({ lang });
      set({ values: response, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch values';
      set({ error: errorMessage, loading: false });
    }
  },

  updateMission: async (data) => {
    try {
      set({ loading: true, error: null });
      console.log('[updateMission] Sending data to API:', data);
      const response = await missionAPI.update(data);
      set({ mission: response, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update mission';
      set({ error: errorMessage, loading: false });
    }
  },

  updateVision: async (data) => {
    try {
      set({ loading: true, error: null });
      const response = await visionAPI.update(data);
      set({ vision: response, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update vision';
      set({ error: errorMessage, loading: false });
    }
  },

  updateValues: async (data) => {
    try {
      set({ loading: true, error: null });
      const response = await valuesAPI.update(data);
      set({ values: response, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update values';
      set({ error: errorMessage, loading: false });
    }
  },

  clearError: () => set({ error: null }),
})); 