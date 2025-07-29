import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { useUserStore } from "./user.store";

export interface News {
  _id: string;
  title: string;
  content: string;
  mainImage: string;
  additionalImages?: string[];
  date: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Event {
  _id: string;
  title: string;
  description: string;
  shortDescription: string;
  mainImage: string;
  additionalImages?: string[];
  location: string;
  date: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Article {
  _id: string;
  title: string;
  content: string;
  mainImage: string;
  additionalImages?: string[];
  categories?: string[];
  tags?: string[];
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ArticlesStoreState {
  news: News[];
  events: Event[];
  articles: Article[];
  loading: boolean;
  error: string | null;
  fetchNews: () => Promise<void>;
  fetchEvents: () => Promise<void>;
  fetchArticles: () => Promise<void>;
  fetchAll: () => Promise<void>;
}

export const useArticlesStore = create<ArticlesStoreState>((set) => ({
  news: [],
  events: [],
  articles: [],
  loading: false,
  error: null,

  fetchNews: async () => {
    set({ loading: true, error: null });
    try {
      const lang = useUserStore.getState().lang;
      const res = await axiosInstance.get(`/news?limit=100&lang=${lang}`);
      // Handle paginated response
      const newsData = res.data?.news || res.data || [];
      set({ news: Array.isArray(newsData) ? newsData : [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false, news: [] });
    }
  },

  fetchEvents: async () => {
    set({ loading: true, error: null });
    try {
      const lang = useUserStore.getState().lang;
      const res = await axiosInstance.get(`/events?limit=100&lang=${lang}`);
      // Handle paginated response
      const eventsData = res.data?.events || res.data || [];
      set({ events: Array.isArray(eventsData) ? eventsData : [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false, events: [] });
    }
  },

  fetchArticles: async () => {
    set({ loading: true, error: null });
    try {
      const lang = useUserStore.getState().lang;
      const res = await axiosInstance.get(`/articles/all?limit=100&lang=${lang}`);
      // Handle paginated response
      const articlesData = res.data?.articles || res.data || [];
      set({ articles: Array.isArray(articlesData) ? articlesData : [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false, articles: [] });
    }
  },

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const lang = useUserStore.getState().lang;
      const [newsRes, eventsRes, articlesRes] = await Promise.all([
        axiosInstance.get(`/news?limit=100&lang=${lang}`),
        axiosInstance.get(`/events?limit=100&lang=${lang}`),
        axiosInstance.get(`/articles/all?limit=100&lang=${lang}`),
      ]);
      
      // Handle paginated responses safely
      const newsData = newsRes.data?.news || newsRes.data || [];
      const eventsData = eventsRes.data?.events || eventsRes.data || [];
      const articlesData = articlesRes.data?.articles || articlesRes.data || [];
      
      set({
        news: Array.isArray(newsData) ? newsData : [],
        events: Array.isArray(eventsData) ? eventsData : [],
        articles: Array.isArray(articlesData) ? articlesData : [],
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message, loading: false, news: [], events: [], articles: [] });
    }
  },
}));