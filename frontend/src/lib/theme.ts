export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "theme";

/**
 * Bumped whenever the storefront's default appearance changes.
 *
 * A theme saved before a redesign is a choice about a different site, and a
 * stored value always beats a default — so without this, every returning
 * visitor would keep the old storefront's appearance and never see the one
 * that shipped. On a version mismatch the stale value is dropped once, the
 * visitor lands on the current default, and anything they choose from then
 * on is kept.
 */
const THEME_VERSION_KEY = "theme:version";
const THEME_VERSION = "2-smart-solutions";

/**
 * The storefront opens dark.
 *
 * The Smart Solutions surfaces — the home journey, the header, the footer —
 * are painted on their own charcoal ground and do not follow the toggle. When
 * the rest of the page defaulted to the operating system's preference, a
 * visitor on a light desktop got a dark top half and a white bottom half of
 * the same page. Dark is the identity; light stays one click away for anyone
 * who wants it, and an explicit choice is always honoured over this default.
 */
const DEFAULT_THEME: Theme = "dark";

const isTheme = (value: string | null): value is Theme =>
  value === "light" || value === "dark";

export const getTheme = (): Theme => {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (isTheme(stored)) return stored;
  if (document.documentElement.classList.contains("dark")) return "dark";
  return DEFAULT_THEME;
};

export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  // The Smart Solutions stylesheet inverts the other way round: it is dark by
  // default and its light palette hangs off an `mn-light` class, so the two
  // switches are driven from here together rather than left to disagree.
  root.classList.toggle("mn-light", theme === "light");
  root.style.colorScheme = theme;
};

export const setTheme = (theme: Theme) => {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  // Stamping on write is what makes a deliberate choice survive: it is now a
  // choice about *this* design, so the next load has no reason to drop it.
  localStorage.setItem(THEME_VERSION_KEY, THEME_VERSION);
  applyTheme(theme);
  return theme;
};

export const toggleTheme = () => {
  const next = getTheme() === "dark" ? "light" : "dark";
  return setTheme(next);
};

export const applyInitialTheme = () => {
  if (localStorage.getItem(THEME_VERSION_KEY) !== THEME_VERSION) {
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.setItem(THEME_VERSION_KEY, THEME_VERSION);
  }

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  const theme = isTheme(stored) ? stored : DEFAULT_THEME;
  applyTheme(theme);
};
