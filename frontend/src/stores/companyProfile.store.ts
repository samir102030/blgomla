import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

export interface Location {
  address: string;
  link?: string;
  isPublic: boolean;
}

export interface SocialLink {
  url?: string;
  isPublic: boolean;
}

export interface SocialLinks {
  facebook: SocialLink;
  x: SocialLink;
  youtube: SocialLink;
  instagram: SocialLink;
  linkedin: SocialLink;
}

interface CompanyProfileState {
  location: Location | null;
  socialLinks: SocialLinks | null;
  fetchLocation: () => Promise<void>;
  updateLocation: (data: Location) => Promise<void>;
  fetchSocialLinks: () => Promise<void>;
  updateSocialLinks: (data: SocialLinks) => Promise<void>;
}

export const useCompanyProfileStore = create<CompanyProfileState>((set) => ({
  location: null,
  socialLinks: null,
  fetchLocation: async () => {
    const res = await axiosInstance.get("/location");
    set({ location: res.data });
  },
  updateLocation: async (data: Location) => {
    const res = await axiosInstance.put("/location", data);
    set({ location: res.data });
  },
  fetchSocialLinks: async () => {
    const res = await axiosInstance.get("/social-links");
    set({ socialLinks: res.data });
  },
  updateSocialLinks: async (data: SocialLinks) => {
    const res = await axiosInstance.put("/social-links", data);
    set({ socialLinks: res.data });
  },
}));
