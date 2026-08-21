import { useMemo } from "react";
import { useUserStore } from "../stores/user.store";
import { useCategoryStore } from "../stores/category.store";

const idOf = (value: any): string | null =>
  !value ? null : typeof value === "string" ? value : value._id ?? null;

/**
 * The categories this account may work in, as whole branches.
 *
 * The server already refuses to return anything outside them, so a filter
 * naming somebody else's section comes back empty. That is safe and useless:
 * the dropdown still listed all 330 categories, and picking one gave no
 * products and no explanation. Somebody put in charge of one section should be
 * offered that section — nothing else is theirs to file a product into either.
 *
 * An empty scope means unrestricted, which is what every administrator is, so
 * it returns the full list rather than an empty one. The two are opposites and
 * confusing them empties the catalogue for the people who own all of it.
 *
 * Branches, not single categories: naming a parent takes everything beneath
 * it, matching what `scopedCategoryIds` does on the server.
 */
export const useScopedCategories = () => {
  const scope = useUserStore((s) => s.user?.categoryScope);
  const categories = useCategoryStore((s) => s.categories);

  return useMemo(() => {
    const all = categories ?? [];
    const roots = (scope ?? []).map(String).filter(Boolean);
    if (!roots.length) return all;

    const childrenOf = new Map<string, string[]>();
    for (const category of all) {
      const key = String(idOf((category as any).parentCategory) ?? "");
      if (!childrenOf.has(key)) childrenOf.set(key, []);
      childrenOf.get(key)!.push(String(category._id));
    }

    const allowed = new Set<string>();
    const pending = [...roots];
    while (pending.length) {
      const id = pending.pop()!;
      if (allowed.has(id)) continue;
      allowed.add(id);
      for (const child of childrenOf.get(id) ?? []) pending.push(child);
    }

    return all.filter((category) => allowed.has(String(category._id)));
  }, [categories, scope]);
};
