import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";

/**
 * The arrangement of a storefront page, as saved by an admin.
 *
 * The order the storefront shipped with. If the request fails — offline, cold
 * database, a deploy mid-flight — the page renders in this order rather than
 * rendering nothing. A layout editor that can black out the home page when
 * its own endpoint hiccups would be a bad trade.
 */
export const DEFAULT_HOME_ORDER = [
  "hero",
  "services",
  "categoryRail",
  "adCategoryStrip",
  "cardMosaic",
  "couponStrip",
  "flashDeals",
  "adHero",
  "featured",
  "bestsellers",
  "topRated",
  "recentlyViewed",
  "brandLogos",
  "newArrivals",
  "adBanner",
  "bundleDeals",
  "allProducts",
  "newsletter",
];

export interface LayoutSection {
  key: string;
  slot: string;
  config?: Record<string, unknown>;
}

/**
 * Returns the section keys for a page, in render order.
 *
 * Slots are flattened here: the storefront lays sections out in one column,
 * and the slot exists so the editor can group them into regions and stop, say,
 * the newsletter being dragged above the hero.
 */
export const useSectionOrder = (page = "home"): string[] => {
  const { data } = useQuery({
    queryKey: ["layout", page],
    queryFn: async () => {
      const { data } = await axiosInstance.get<{
        success: boolean;
        sections: LayoutSection[];
      }>(`/layouts/${page}`);
      return data.sections;
    },
    staleTime: 60_000,
    retry: 1,
  });

  if (!data || data.length === 0) return DEFAULT_HOME_ORDER;

  // Already sorted server-side into a single sequence across all slots, so
  // there is nothing to re-sort here.
  return data.map((s) => s.key);
};
