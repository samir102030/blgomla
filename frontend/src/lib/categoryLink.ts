import type { Category } from "../types/category.type";

/**
 * Resolves the catalogue link for a category that a design surface names
 * rather than identifies.
 *
 * `ProductsContent` filters on `?category=<_id>` and expands that id to its
 * descendants, so a readable slug in the URL matches no category at all and
 * the page renders empty. Design surfaces therefore say which category they
 * mean — by slug and by display name — and the id is looked up from the
 * catalogue the category store already holds.
 *
 * Order matters: slugs are stable, display names get retitled, and the Arabic
 * name is the last resort because it is the one most likely to be edited.
 * Until the store has loaded, the link falls back to the unfiltered catalogue,
 * which is a worse landing page than the right filter but a much better one
 * than a filter that returns nothing.
 */

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

export const findCategory = (
  categories: Category[] | undefined,
  candidates: readonly string[]
): Category | undefined => {
  if (!categories?.length) return undefined;

  const wanted = candidates.map(normalize);
  const matches = (value: string | undefined) => !!value && wanted.includes(normalize(value));

  return (
    categories.find((category) => matches(category.slug)) ||
    categories.find((category) => matches(category.name)) ||
    categories.find((category) => matches(category.nameAr))
  );
};

export const categoryHref = (
  categories: Category[] | undefined,
  candidates: readonly string[]
): string => {
  const category = findCategory(categories, candidates);
  return category ? `/products?category=${encodeURIComponent(category._id)}` : "/products";
};
