/**
 * Shared TanStack Query hooks for read-only data.
 *
 * Read-side fetches live here (home feed, brands, categories, product detail)
 * so multiple components can share the same in-memory cache, dedupe in-flight
 * requests, and serve stale results instantly on navigation.
 *
 * Writes still go through the Zustand stores — React Query is only the read
 * cache.
 *
 * Language is included in all query keys so that switching the app language
 * automatically invalidates the cache and triggers a refetch with the new
 * Accept-Language header (set by the axios request interceptor in axios.ts).
 */
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "./axios";
import type { Product } from "../types/product.type";
import type { Brand } from "../types/brand.type";
import type { Category } from "../types/category.type";

export const queryKeys = {
  homeFeed: (lang: string) => ["home-feed", lang] as const,
  brands: (lang: string) => ["brands", lang] as const,
  categories: (lang: string) => ["categories", lang] as const,
  productList: (params?: Record<string, unknown>) =>
    ["products", params] as const,
  product: (id: string) => ["product", id] as const,
  featured: (lang: string) => ["products", "featured", lang] as const,
  newest: (lang: string) => ["products", "newest", lang] as const,
  bestSellers: (lang: string) => ["products", "bestSellers", lang] as const,
  mostRated: (lang: string) => ["products", "mostRated", lang] as const,
  saleProducts: (lang: string) => ["products", "saleProducts", lang] as const,
};

interface HomeFeed {
  products: Product[];
  saleProducts: Product[];
  newestProducts: Product[];
  bestSellers: Product[];
  topRated: Product[];
  categories: Category[];
  collections: any[];
}

export const useHomeFeed = () => {
  const { i18n } = useTranslation();
  return useQuery<HomeFeed>({
    queryKey: queryKeys.homeFeed(i18n.language),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/home-feed");
      return data?.data ?? {};
    },
    staleTime: 60_000,
  });
};

export const useBrands = () => {
  const { i18n } = useTranslation();
  return useQuery<Brand[]>({
    queryKey: queryKeys.brands(i18n.language),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/brands");
      return data?.data ?? data ?? [];
    },
    staleTime: 5 * 60_000,
  });
};

export const useCategories = () => {
  const { i18n } = useTranslation();
  return useQuery<Category[]>({
    queryKey: queryKeys.categories(i18n.language),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/categories");
      return data?.data ?? data ?? [];
    },
    staleTime: 5 * 60_000,
  });
};

export const useFeaturedProducts = () => {
  const { i18n } = useTranslation();
  return useQuery<Product[]>({
    queryKey: queryKeys.featured(i18n.language),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/products/featured");
      return data?.data ?? [];
    },
  });
};

export const useNewestProducts = () => {
  const { i18n } = useTranslation();
  return useQuery<Product[]>({
    queryKey: queryKeys.newest(i18n.language),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/products/newest");
      return data?.data ?? [];
    },
  });
};

export const useBestSellers = () => {
  const { i18n } = useTranslation();
  return useQuery<Product[]>({
    queryKey: queryKeys.bestSellers(i18n.language),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/products/bestSellers");
      return data?.data ?? [];
    },
  });
};

export const useMostRatedProducts = () => {
  const { i18n } = useTranslation();
  return useQuery<Product[]>({
    queryKey: queryKeys.mostRated(i18n.language),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/products/mostRated");
      return data?.data ?? [];
    },
  });
};

export const useSaleProducts = () => {
  const { i18n } = useTranslation();
  return useQuery<Product[]>({
    queryKey: queryKeys.saleProducts(i18n.language),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/products/saleProducts");
      return data?.data ?? [];
    },
  });
};
