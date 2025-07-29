import { create } from "zustand";
import { uploadAPI } from "../utils/api";

interface UploadStoreState {
  uploading: boolean;
  error: string | null;
  uploadImage: (file: File) => Promise<string | null>;
}

export const useUploadStore = create<UploadStoreState>((set) => ({
  uploading: false,
  error: null,
  uploadImage: async (file: File) => {
    set({ uploading: true, error: null });
    try {
      const res = await uploadAPI.uploadImage(file);
      set({ uploading: false });
      return res.url as string;
    } catch (err: any) {
      set({ error: err.message, uploading: false });
      return null;
    }
  },
}));
