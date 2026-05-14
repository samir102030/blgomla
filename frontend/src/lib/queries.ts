/**
 * Shared TanStack Query hooks for read-only data.
 *
 * Read-side fetches live here (home feed, brands, categories, product detail)
 * so multiple components can share the same in-memory cache, dedupe in-flight
 * requests, and serve stale results instantly on navigation.
 *
 * Writes still go through the Zustand stores — React Query is only the read
 * cache.
 */
import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "./axios";
import type { Product } from "../types/product.type";
import type { Brand } from "../types/brand.type";
import type { Category } from "../types/category.type";

export const queryKeys = {
  homeFeed: ["home-feed"] as const,
  brands: ["brands"] as const,
  categories: ["categories"] as const,
  productList: (params?: Record<string, unknown>) =>
    ["products", params] as const,
  product: (id: string) => ["product", id] as const,
  featured: ["products", "featured"] as const,
  newest: ["products", "newest"] as const,
  bestSellers: ["products", "bestSellers"] as const,
  mostRated: ["products", "mostRated"] as const,
  saleProducts: ["products", "saleProducts"] as const,
};

interface HomeFeed {
  products: Product[];
  saleProducts: Product[];
  newestProducts: Product[];
  categories: Category[];
  collections: any[];
}

export const useHomeFeed = () =>
  useQuery<HomeFeed>({
    queryKey: queryKeys.homeFeed,
    queryFn: async () => {
      const { data } = await axiosInstance.get("/home-feed");
      return data?.data ?? {};
    },
    staleTime: 60_000,
  });

export const useBrands = () =>
  useQuery<Brand[]>({
    queryKey: queryKeys.brands,
    queryFn: async () => {
      const { data } = await axiosInstance.get("/brands");
      return data?.data ?? data ?? [];
    },
    staleTime: 5 * 60_000,
  });

export const useCategories = () =>
  useQuery<Category[]>({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const { data } = await axiosInstance.get("/categories");
      return data?.data ?? data ?? [];
    },
    staleTime: 5 * 60_000,
  });

export const useFeaturedProducts = () =>
  useQuery<Product[]>({
    queryKey: queryKeys.featured,
    queryFn: async () => {
      const { data } = await axiosInstance.get("/products/featured");
      return data?.data ?? [];
    },
  });

export const useNewestProducts = () =>
  useQuery<Product[]>({
    queryKey: queryKeys.newest,
    queryFn: async () => {
      const { data } = await axiosInstance.get("/products/newest");
      return data?.data ?? [];
    },
  });

export const useBestSellers = () =>
  useQuery<Product[]>({
    queryKey: queryKeys.bestSellers,
    queryFn: async () => {
      const { data } = await axiosInstance.get("/products/bestSellers");
      return data?.data ?? [];
    },
  });

export const useMostRatedProducts = () =>
  useQuery<Product[]>({
    queryKey: queryKeys.mostRated,
    queryFn: async () => {
      const { data } = await axiosInstance.get("/products/mostRated");
      return data?.data ?? [];
    },
  });

export const useSaleProducts = () =>
  useQuery<Product[]>({
    queryKey: queryKeys.saleProducts,
    queryFn: async () => {
      const { data } = await axiosInstance.get("/products/saleProducts");
      return data?.data ?? [];
    },
  });
