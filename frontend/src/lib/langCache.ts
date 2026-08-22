import i18n from "./i18n";

/**
 * Keeping persisted server text honest about which language it is in.
 *
 * Category and brand names arrive from the API already translated — the server
 * swaps `nameAr` into `name` when the request asks for Arabic — and both
 * stores then persist that list to localStorage. Nothing recorded which
 * language the saved copy was in, and the header only fetches when the list is
 * empty ("usually a no-op after first visit"), so a visitor who browsed in
 * Arabic and came back in English was served the Arabic names under an English
 * interface, for good: no fetch to correct it, and no language switch in that
 * session to trigger the refetch that would have.
 *
 * So the saved copy carries the language it was written in, and a copy written
 * in the other one is dropped on rehydrate. The store then reads as empty,
 * which is exactly the condition the existing fetch is waiting for.
 */

export type UiLang = "ar" | "en";

export const uiLang = (): UiLang =>
  (i18n.language || "en").toLowerCase().startsWith("ar") ? "ar" : "en";

/**
 * The persisted slice if it was written in the language now on screen, and
 * `empty` if it was written in the other one.
 *
 * `empty` rather than `undefined` so the caller can spread the result into the
 * merged state unconditionally and be sure the stale lists are cleared, not
 * merely left out of the spread.
 */
export const keepIfSameLang = <T extends object>(persisted: unknown, empty: T): T => {
  const held = persisted as (T & { lang?: string }) | undefined;
  if (!held || typeof held !== "object") return empty;
  return held.lang === uiLang() ? held : empty;
};
