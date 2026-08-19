import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

/**
 * The university student programme — one store for both sides of it.
 *
 * The student portal and the dashboard module talk to the same endpoints and
 * the same documents, so splitting them into two stores would mean two copies
 * of the same types drifting apart. What separates them is the permission on
 * the route, not the data layer.
 */

export type Faculty = "engineering" | "computer_science" | "other";
export type StudentStatus = "pending" | "verified" | "rejected" | "suspended" | "expired";

export interface ProgramDiscount {
  type: "percentage" | "fixed";
  value: number;
  maximumDiscount?: number;
  minimumPurchase: number;
}

export interface ProgramRenewal {
  usesPerPeriod: number;
  periodDays: number;
}

export interface ProgramDomain {
  _id: string;
  domain: string;
  university?: string;
  universityAr?: string;
  faculty: Faculty;
  active: boolean;
}

/** What the public portal is allowed to know before anyone signs in. */
export interface PublicProgram {
  enabled: boolean;
  discount: ProgramDiscount;
  renewal: ProgramRenewal;
  membershipDays: number;
  categories: string[];
  universities: { university?: string; universityAr?: string; faculty: Faculty }[];
  domains: string[];
}

/** A category as the settings endpoint returns it once populated. */
export interface ShelfCategory {
  _id: string;
  name: string;
  nameAr?: string;
  slug?: string;
}

/** A product on the student shelf, filled in enough to list it. */
export interface ShelfProduct {
  _id: string;
  name: string;
  nameAr?: string;
  slug?: string;
  price: number;
  images?: Array<{ url?: string } | string>;
  stock?: number;
  isActive?: boolean;
}

/** The full settings document, dashboard side. */
export interface ProgramSettings {
  _id: string;
  enabled: boolean;
  domains: ProgramDomain[];
  discount: ProgramDiscount;
  renewal: ProgramRenewal;
  categories: Array<ShelfCategory | string>;
  /** Hand-picked products, on top of whatever the departments bring in. */
  products: Array<ShelfProduct | string>;
  membershipDays: number;
  updatedAt?: string;
}

export interface MyStudentProfile {
  _id: string;
  universityEmail: string;
  university?: string;
  faculty: Faculty;
  status: StudentStatus;
  rejectionReason?: string;
  verifiedAt?: string;
  expiresAt?: string;
  periodStartedAt?: string;
  /** Null until the address is confirmed — the code does not exist before then. */
  code: string | null;
  usesLeft: number;
  usesPerPeriod: number;
  periodDays: number;
}

export interface StudentMember {
  _id: string;
  user?: { _id: string; name?: string; email?: string; phoneNumber?: string };
  universityEmail: string;
  university?: string;
  domain?: string;
  faculty: Faculty;
  status: StudentStatus;
  rejectionReason?: string;
  verifiedAt?: string;
  expiresAt?: string;
  createdAt?: string;
  coupon?: { _id: string; code: string; usageCount: number; usageLimit?: number; isActive: boolean };
}

export interface StudentStats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  suspended: number;
  expired: number;
  codesIssued: number;
  redemptions: number;
}

const message = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

/** One page of the student shelf, as the storefront reads it. */
export interface StudentCatalogue {
  products: any[];
  total: number;
  page: number;
  pages: number;
  departments: ShelfCategory[];
}

interface StudentStore {
  publicProgram: PublicProgram | undefined;
  myProfile: MyStudentProfile | null | undefined;
  settings: ProgramSettings | undefined;
  members: StudentMember[];
  membersTotal: number;
  membersPages: number;
  stats: StudentStats | undefined;
  catalogue: StudentCatalogue | undefined;
  catalogueLoading: boolean;
  loading: boolean;
  saving: boolean;
  error: string | undefined;

  fetchPublicProgram: () => Promise<void>;
  fetchMyProfile: () => Promise<void>;
  apply: (universityEmail: string) => Promise<{ ok: boolean; message: string }>;
  verify: (token: string) => Promise<{ ok: boolean; message: string; code?: string }>;

  fetchSettings: () => Promise<void>;
  saveSettings: (patch: Partial<ProgramSettings>) => Promise<boolean>;
  addDomain: (data: Partial<ProgramDomain>) => Promise<boolean>;
  updateDomain: (domainId: string, data: Partial<ProgramDomain>) => Promise<boolean>;
  removeDomain: (domainId: string) => Promise<boolean>;
  fetchMembers: (params?: Record<string, any>) => Promise<void>;
  setMemberStatus: (id: string, status: StudentStatus, rejectionReason?: string) => Promise<boolean>;
  fetchStats: () => Promise<void>;
  runMaintenance: () => Promise<boolean>;
  fetchCatalogue: (params?: Record<string, any>) => Promise<void>;
  clearError: () => void;
}

export const useStudentStore = create<StudentStore>((set, get) => ({
  publicProgram: undefined,
  myProfile: undefined,
  settings: undefined,
  members: [],
  membersTotal: 0,
  membersPages: 1,
  stats: undefined,
  catalogue: undefined,
  catalogueLoading: false,
  loading: false,
  saving: false,
  error: undefined,

  fetchCatalogue: async (params) => {
    // Its own loading flag: the shelf sits under the membership panel on the
    // same page, and sharing `loading` would blank one while the other reads.
    set({ catalogueLoading: true });
    try {
      const { data } = await axiosInstance.get("/students/catalogue", { params });
      set({
        catalogue: {
          products: data.products || [],
          total: data.total || 0,
          page: data.page || 1,
          pages: data.pages || 1,
          departments: data.departments || [],
        },
        catalogueLoading: false,
      });
    } catch (error: any) {
      set({ error: message(error, "Could not load the products."), catalogueLoading: false });
    }
  },

  fetchPublicProgram: async () => {
    set({ loading: true, error: undefined });
    try {
      const { data } = await axiosInstance.get("/students/program");
      set({ publicProgram: data.program, loading: false });
    } catch (error: any) {
      set({ error: message(error, "Could not load the programme."), loading: false });
    }
  },

  fetchMyProfile: async () => {
    try {
      const { data } = await axiosInstance.get("/students/me");
      set({ myProfile: data.profile ?? null });
    } catch {
      // A signed-out visitor is the normal case on this page, not an error to
      // put in front of them.
      set({ myProfile: null });
    }
  },

  apply: async (universityEmail) => {
    set({ saving: true, error: undefined });
    try {
      const { data } = await axiosInstance.post("/students/apply", { universityEmail });
      set({ saving: false });
      await get().fetchMyProfile();
      return { ok: true, message: data.message || "Check your university inbox." };
    } catch (error: any) {
      const text = message(error, "Could not submit the application.");
      set({ saving: false, error: text });
      return { ok: false, message: text };
    }
  },

  verify: async (token) => {
    set({ loading: true, error: undefined });
    try {
      const { data } = await axiosInstance.post(`/students/verify/${encodeURIComponent(token)}`);
      set({ loading: false });
      return { ok: true, message: data.message, code: data.code };
    } catch (error: any) {
      const text = message(error, "This link is no longer valid.");
      set({ loading: false, error: text });
      return { ok: false, message: text };
    }
  },

  /* ── dashboard ── */

  fetchSettings: async () => {
    set({ loading: true, error: undefined });
    try {
      const { data } = await axiosInstance.get("/students/admin/settings");
      set({ settings: data.program, loading: false });
    } catch (error: any) {
      set({ error: message(error, "Could not load settings."), loading: false });
    }
  },

  saveSettings: async (patch) => {
    set({ saving: true, error: undefined });
    try {
      const { data } = await axiosInstance.put("/students/admin/settings", patch);
      set({ settings: data.program, saving: false });
      return true;
    } catch (error: any) {
      set({ error: message(error, "Could not save settings."), saving: false });
      return false;
    }
  },

  addDomain: async (payload) => {
    set({ saving: true, error: undefined });
    try {
      const { data } = await axiosInstance.post("/students/admin/domains", payload);
      set({ settings: data.program, saving: false });
      return true;
    } catch (error: any) {
      set({ error: message(error, "Could not add the domain."), saving: false });
      return false;
    }
  },

  updateDomain: async (domainId, payload) => {
    set({ saving: true, error: undefined });
    try {
      const { data } = await axiosInstance.patch(`/students/admin/domains/${domainId}`, payload);
      set({ settings: data.program, saving: false });
      return true;
    } catch (error: any) {
      set({ error: message(error, "Could not update the domain."), saving: false });
      return false;
    }
  },

  removeDomain: async (domainId) => {
    set({ saving: true, error: undefined });
    try {
      const { data } = await axiosInstance.delete(`/students/admin/domains/${domainId}`);
      set({ settings: data.program, saving: false });
      return true;
    } catch (error: any) {
      set({ error: message(error, "Could not remove the domain."), saving: false });
      return false;
    }
  },

  fetchMembers: async (params = {}) => {
    set({ loading: true, error: undefined });
    try {
      const { data } = await axiosInstance.get("/students/admin/members", { params });
      set({
        members: data.members || [],
        membersTotal: data.total || 0,
        membersPages: data.pages || 1,
        loading: false,
      });
    } catch (error: any) {
      set({ error: message(error, "Could not load members."), loading: false });
    }
  },

  setMemberStatus: async (id, status, rejectionReason) => {
    set({ saving: true, error: undefined });
    try {
      await axiosInstance.patch(`/students/admin/members/${id}`, { status, rejectionReason });
      set({ saving: false });
      return true;
    } catch (error: any) {
      set({ error: message(error, "Could not update the member."), saving: false });
      return false;
    }
  },

  fetchStats: async () => {
    try {
      const { data } = await axiosInstance.get("/students/admin/stats");
      set({ stats: data.stats });
    } catch (error: any) {
      set({ error: message(error, "Could not load statistics.") });
    }
  },

  runMaintenance: async () => {
    set({ saving: true, error: undefined });
    try {
      await axiosInstance.post("/students/admin/maintenance");
      set({ saving: false });
      return true;
    } catch (error: any) {
      set({ error: message(error, "Maintenance run failed."), saving: false });
      return false;
    }
  },

  clearError: () => set({ error: undefined }),
}));
