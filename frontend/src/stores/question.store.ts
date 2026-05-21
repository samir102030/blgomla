import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type { ProductQuestion } from "../types/question.type";

interface QuestionStore {
  questions: ProductQuestion[];
  loading: boolean;
  error?: string;
  fetchByProduct: (productId: string) => Promise<void>;
  ask: (productId: string, text: string) => Promise<boolean>;
  answer: (questionId: string, text: string) => Promise<boolean>;
  remove: (questionId: string) => Promise<boolean>;
}

export const useQuestionStore = create<QuestionStore>((set, get) => ({
  questions: [],
  loading: false,
  error: undefined,

  fetchByProduct: async (productId) => {
    set({ loading: true, error: undefined });
    try {
      const res = await axiosInstance.get<{
        success: boolean;
        questions: ProductQuestion[];
      }>(`/questions/product/${productId}`);
      set({ questions: res.data.questions || [], loading: false });
    } catch (error: any) {
      set({
        error: error?.response?.data?.message || error.message,
        loading: false,
      });
    }
  },

  ask: async (productId, text) => {
    try {
      const res = await axiosInstance.post<{
        success: boolean;
        question: ProductQuestion;
      }>(`/questions/product/${productId}`, { text });
      set({ questions: [res.data.question, ...get().questions] });
      return true;
    } catch (error: any) {
      set({ error: error?.response?.data?.message || error.message });
      return false;
    }
  },

  answer: async (questionId, text) => {
    try {
      const res = await axiosInstance.post<{
        success: boolean;
        question: ProductQuestion;
      }>(`/questions/${questionId}/answers`, { text });
      set({
        questions: get().questions.map((q) =>
          q._id === questionId ? res.data.question : q
        ),
      });
      return true;
    } catch (error: any) {
      set({ error: error?.response?.data?.message || error.message });
      return false;
    }
  },

  remove: async (questionId) => {
    try {
      await axiosInstance.delete(`/questions/${questionId}`);
      set({ questions: get().questions.filter((q) => q._id !== questionId) });
      return true;
    } catch (error: any) {
      set({ error: error?.response?.data?.message || error.message });
      return false;
    }
  },
}));
