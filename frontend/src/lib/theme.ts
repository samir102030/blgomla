export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "theme";

const isTheme = (value: string | null): value is Theme =>
  value === "light" || value === "dark";

const getSystemTheme = (): Theme =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export const getTheme = (): Theme => {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (isTheme(stored)) return stored;
  if (document.documentElement.classList.contains("dark")) return "dark";
  return getSystemTheme();
};

export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
};

export const setTheme = (theme: Theme) => {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
  return theme;
};

export const toggleTheme = () => {
  const next = getTheme() === "dark" ? "light" : "dark";
  return setTheme(next);
};

export const applyInitialTheme = () => {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  const theme = isTheme(stored) ? stored : getSystemTheme();
  applyTheme(theme);
};
