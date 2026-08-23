import React, { useEffect, useState } from "react";
import ProductRail from "./ProductRail";
import { axiosInstance } from "../lib/axios";
import { getRecentlyViewed } from "../lib/recentlyViewed";
import type { Product } from "../types/product.type";

interface RecentlyViewedProps {
  /** Product id to drop (e.g. the current product on its own page). */
  excludeId?: string;
}

const RecentlyViewed: React.FC<RecentlyViewedProps> = ({ excludeId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ids = getRecentlyViewed().filter((id) => id !== excludeId);
    if (ids.length === 0) {
      setLoaded(true);
      return;
    }
    (async () => {
      try {
        const { data } = await axiosInstance.post<{ data: Product[] }>(
          "/products/by-ids",
          { ids }
        );
        if (!cancelled) setProducts(data.data || []);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [excludeId]);

  if (!loaded || products.length === 0) return null;

  return (
    /*
      ProductRail runs t() over `title` and `subtitle` itself, so these are the
      keys, passed raw — wrapping them here would translate twice.

      The heading was the string "Recently Viewed" and no key existed for it,
      so it rendered in English among ten Arabic headings on an Arabic-first
      shop. It survived this long because the rail only appears for a visitor
      who has already looked at a product: it is invisible on a first load.
    */
    <ProductRail
 icon=""
      title="Recently Viewed"
      subtitle="Pick up where you left off"
      products={products}
      excludeId={excludeId}
    />
  );
};

export default RecentlyViewed;
