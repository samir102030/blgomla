import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "../lib/axios";
import { keepIfSameLang, uiLang } from "../lib/langCache";
import type { Category, CategoryTree } from "../types/category.type";

/*
  Four methods used to live here that could not have worked.

  `fetchDeletedCategories`, `fetchCategoryStats` and `reorderCategories` called
  `/categories/deleted`, `/categories/stats` and `PUT /categories/reorder`.
  None of those routes exists. The first two would have fallen through to
  `GET /:categoryId` and asked the database for a category whose id is the
  word "deleted"; the third would have fallen through to `PUT /:categoryId`
  and tried to update one called "reorder". `getProductsByCategory` did reach
  a real route and then threw the response away without storing it.

  No component called any of them, which is the only reason nobody ever saw
  the errors. They are gone rather than fixed: an endpoint written to satisfy
  a caller that does not exist is a second thing to keep working.

  `fetchCategoryById` and `fetchCategoryTree` stay, because they name real
  routes — but both were reading the wrong key off the response, so both
  stored `undefined`. Fixed below.
*/
interface CategoryStore {
  // State
  categories: Category[];
  category: Category | undefined;
  categoryTree: CategoryTree[];
  loading: boolean;
  error: string | undefined;

  // Category CRUD
  fetchCategories: (params?: Record<string, any>) => Promise<void>;
  fetchCategoryById: (categoryId: string) => Promise<void>;
  fetchCategoryTree: () => Promise<void>;
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
          // `getCategoryById` answers `{ success, data }`. Reading `.category`
          // stored undefined on every successful fetch.
          const { data } = await axiosInstance.get<{
            success: boolean;
            data: Category;
          }>(`/categories/${categoryId}`);
          set({ category: data.data, loading: false });
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
          // `getCategoryTree` answers `{ success, tree }`, not `categoryTree`.
          const { data } = await axiosInstance.get<{
            success: boolean;
            tree: CategoryTree[];
          }>("/categories/tree");
          set({ categoryTree: data.tree || [], loading: false });
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
          // The server answers `{ success, message }`. It never sent the
          // category back, so the copy this used to file under
          // `deletedCategories` was always undefined.
          await axiosInstance.put(`/categories/safeDelete/${categoryId}`);
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

      // Restore Category
      restoreCategory: async (categoryId: string) => {
        set({ loading: true, error: undefined });
        try {
          // Same shape as safeDelete: a message, not a record. The caller
          // refetches, which is the only way the restored row comes back with
          // its parent and counts attached anyway.
          await axiosInstance.put(`/categories/restore/${categoryId}`);
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

      // Clear Error
      clearError: () => set({ error: undefined }),

      // Reset Store
      reset: () =>
        set({
          categories: [],
          category: undefined,
          categoryTree: [],
          loading: false,
          error: undefined,
        }),
    }),
    {
      name: "category-store",
      // Bumped when the language stamp below was added: without it, every
      // browser already holding a v0 copy would keep rendering it, and the
      // stamp would only start protecting people who had never visited.
      version: 1,
      partialize: (state) => ({
        lang: uiLang(),
        categories: state.categories,
        categoryTree: state.categoryTree,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...keepIfSameLang(persisted, { categories: [], categoryTree: [] }),
      }),
    }
  )
);
