import { create } from 'zustand';
import { axiosInstance } from '../lib/axios';

export interface Logo {
  _id: string;
  url: string;
  cloudinaryId: string;
  originalName: string;
  mimeType: string;
  size: number;
  isActive: boolean;
  uploadedBy: {
    _id: string;
    username: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface AdminLogoState {
  currentLogo: Logo | null;
  allLogos: Logo[];
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
  
  // Actions
  fetchCurrentLogo: () => Promise<void>;
  fetchAllLogos: () => Promise<void>;
  uploadLogo: (file: File) => Promise<void>;
  setLogoActive: (logoId: string) => Promise<void>;
  deleteLogo: (logoId: string) => Promise<void>;
  clearError: () => void;
}

export const useAdminLogoStore = create<AdminLogoState>((set, get) => ({
  currentLogo: null,
  allLogos: [],
  isLoading: false,
  isUploading: false,
  error: null,

  fetchCurrentLogo: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await axiosInstance.get('/logo/current');
      set({ currentLogo: response.data });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch current logo' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAllLogos: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await axiosInstance.get('/logo');
      set({ allLogos: response.data });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch logos' });
    } finally {
      set({ isLoading: false });
    }
  },

  uploadLogo: async (file: File) => {
    try {
      set({ isUploading: true, error: null });
      
      // First upload to Cloudinary using the existing endpoint
      const formData = new FormData();
      formData.append('myFile', file);
      
      const cloudinaryResponse = await axiosInstance.post('/cloudinary/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Then save logo record to database using the Cloudinary response
      const logoData = {
        cloudinaryUrl: cloudinaryResponse.data.url,
        cloudinaryId: cloudinaryResponse.data.publicId,
        originalName: file.name,
        mimeType: file.type,
        size: file.size
      };
      
      const response = await axiosInstance.post('/logo', logoData);
      
      // Update current logo and add to all logos
      const newLogo = response.data;
      set(state => ({
        currentLogo: newLogo,
        allLogos: [newLogo, ...state.allLogos],
        isUploading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to upload logo',
        isUploading: false 
      });
    }
  },

  setLogoActive: async (logoId: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axiosInstance.put(`/logo/${logoId}/activate`);
      
      // Update current logo and update all logos
      const updatedLogo = response.data;
      set(state => ({
        currentLogo: updatedLogo,
        allLogos: state.allLogos.map(logo => ({
          ...logo,
          isActive: logo._id === logoId
        })),
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to activate logo',
        isLoading: false 
      });
    }
  },

  deleteLogo: async (logoId: string) => {
    try {
      set({ isLoading: true, error: null });
      await axiosInstance.delete(`/logo/${logoId}`);
      
      // Remove from all logos and update current if needed
      set(state => {
        const updatedLogos = state.allLogos.filter(logo => logo._id !== logoId);
        const newCurrentLogo = updatedLogos.find(logo => logo.isActive) || null;
        
        return {
          allLogos: updatedLogos,
          currentLogo: newCurrentLogo,
          isLoading: false
        };
      });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to delete logo',
        isLoading: false 
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
})); 