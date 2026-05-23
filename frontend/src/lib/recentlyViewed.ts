// Recently-viewed product ids, persisted in localStorage (most-recent first).
const KEY = "recentlyViewed";
const MAX = 12;

export const getRecentlyViewed = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

export const addRecentlyViewed = (id: string): void => {
  if (!id) return;
  try {
    const next = [id, ...getRecentlyViewed().filter((x) => x !== id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore (private mode / quota)
  }
};
