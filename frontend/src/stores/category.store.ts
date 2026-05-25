import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "../lib/axios";
import type {
  Category,
  CategoryTree,
  CategoryStats,
} from "../types/category.type";

interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  page: number;
  pages: number;
  success: boolean;
}

interface CategoryStore {
  // State
  categories: Category[];
  category: Category | undefined;
  categoryTree: CategoryTree[];
  deletedCategories: Category[];
  categoryStats: CategoryStats | undefined;
  paginated: PaginatedResult<Category> | undefined;
  loading: boolean;
  error: string | undefined;

  // Category CRUD
  fetchCategories: (params?: Record<string, any>) => Promise<void>;
  fetchCategoryById: (categoryId: string) => Promise<void>;
  fetchCategoryTree: () => Promise<void>;
  fetchDeletedCategories: () => Promise<void>;
  createCategory: (data: Partial<Category>) => Promise<Category | undefined>;
  updateCategory: (
    categoryId: string,
    data: Partial<Category>
  ) => Promise<Category | undefined>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  safeDeleteCategory: (categoryId: string) => Promise<boolean>;
  restoreCategory: (categoryId: string) => Promise<boolean>;

  // Category Management
  setCategoryToProduct: (
    productId: string,
    categoryId: string
  ) => Promise<boolean>;
  getProductsByCategory: (
    categoryId: string,
    params?: Record<string, any>
  ) => Promise<void>;
  fetchCategoryStats: () => Promise<void>;
  reorderCategories: (categoryIds: string[]) => Promise<boolean>;

  // Utility
  clearError: () => void;
  reset: () => void;
}

export const useCategoryStore = create<CategoryStore>()(
  persist(
    (set) => ({
      // Initial State
      categories: [],
      category: undefined,
      categoryTree: [],
      deletedCategories: [],
      categoryStats: undefined,
      paginated: undefined,
      loading: false,
      error: undefined,

      // Fetch Categories
      fetchCategories: async (params = {}) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            data?: Category[];
            categories?: Category[];
          }>("/categories", { params });
          set({
            categories: data.data || data.categories || [],
            loading: false,
          });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Category by ID
      fetchCategoryById: async (categoryId: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            category: Category;
          }>(`/categories/${categoryId}`);
          set({ category: data.category, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Category Tree
      fetchCategoryTree: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            categoryTree: CategoryTree[];
          }>("/categories/tree");
          set({ categoryTree: data.categoryTree, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Deleted Categories
      fetchDeletedCategories: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            categories: Category[];
          }>("/categories/deleted");
          set({ deletedCategories: data.categories, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Create Category
      createCategory: async (categoryData: Partial<Category>) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.post<{
            success: boolean;
            category: Category;
          }>("/categories", categoryData);
          const newCategory = data.category;
          set((state) => ({
            categories: [...state.categories, newCategory],
            loading: false,
          }));
          return newCategory;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return undefined;
        }
      },

      // Update Category
      updateCategory: async (
        categoryId: string,
        categoryData: Partial<Category>
      ) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.put<{
            success: boolean;
            data: Category;
          }>(`/categories/${categoryId}`, categoryData);
          const updatedCategory = data.data;
          set((state) => ({
            categories: state.categories.map((cat) =>
              cat._id === categoryId ? updatedCategory : cat
            ),
            category:
              state.category?._id === categoryId
                ? updatedCategory
                : state.category,
            loading: false,
          }));
          return updatedCategory;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return undefined;
        }
      },

      // Delete Category (Hard Delete)
      deleteCategory: async (categoryId: string) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.delete(`/categories/${categoryId}`);
          set((state) => ({
            categories: state.categories.filter(
              (cat) => cat._id !== categoryId
            ),
            loading: false,
          }));
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Safe Delete Category
      safeDeleteCategory: async (categoryId: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.put<{
            success: boolean;
            category: Category;
          }>(`/categories/safeDelete/${categoryId}`);
          const deletedCategory = data.category;
          set((state) => ({
            categories: state.categories.filter(
              (cat) => cat._id !== categoryId
            ),
            deletedCategories: deletedCategory
              ? [...state.deletedCategories, deletedCategory]
              : state.deletedCategories,
            loading: false,
          }));
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Restore Category
      restoreCategory: async (categoryId: string) => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.put<{
            success: boolean;
            category: Category;
          }>(`/categories/restore/${categoryId}`);
          const restoredCategory = data.category;
          set((state) => ({
            categories: restoredCategory
              ? [...state.categories, restoredCategory]
              : state.categories,
            deletedCategories: state.deletedCategories.filter(
              (cat) => cat._id !== categoryId
            ),
            loading: false,
          }));
          return true;
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
          return false;
        }
      },

      // Set Category to Product
      setCategoryToProduct: async (productId: string, categoryId: string) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.put(
            `/categories/setCategoryToProduct/${productId}`,
            { categoryId }
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

      // Get Products by Category
      getProductsByCategory: async (categoryId: string, params = {}) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.get(`/categories/products/${categoryId}`, {
            params,
          });
          set({ loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Fetch Category Stats
      fetchCategoryStats: async () => {
        set({ loading: true, error: undefined });
        try {
          const { data } = await axiosInstance.get<{
            success: boolean;
            stats: CategoryStats;
          }>("/categories/stats");
          set({ categoryStats: data.stats, loading: false });
        } catch (error: any) {
          set({
            error: error?.response?.data?.message || error.message,
            loading: false,
          });
        }
      },

      // Reorder Categories
      reorderCategories: async (categoryIds: string[]) => {
        set({ loading: true, error: undefined });
        try {
          await axiosInstance.put("/categories/reorder", { categoryIds });
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

      // Clear Error
      clearError: () => set({ error: undefined }),

      // Reset Store
      reset: () =>
        set({
          categories: [],
          category: undefined,
          categoryTree: [],
          deletedCategories: [],
          categoryStats: undefined,
          paginated: undefined,
          loading: false,
          error: undefined,
        }),
    }),
    {
      name: "category-store",
      partialize: (state) => ({
        categories: state.categories,
        categoryTree: state.categoryTree,
      }),
    }
  )
);
