import { create } from "zustand";
import { persist } from "zustand/middleware";

export const COMPARE_MAX = 4;

interface CompareState {
  ids: string[];
  toggle: (id: string) => boolean; // returns true if added, false if removed/blocked
  remove: (id: string) => void;
  clear: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const ids = get().ids;
        if (ids.includes(id)) {
          set({ ids: ids.filter((x) => x !== id) });
          return false;
        }
        if (ids.length >= COMPARE_MAX) return false;
        set({ ids: [...ids, id] });
        return true;
      },
      remove: (id) => set({ ids: get().ids.filter((x) => x !== id) }),
      clear: () => set({ ids: [] }),
    }),
    { name: "compare" }
  )
);
