import { create } from "zustand";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  profileInfo?: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "AGENT" | "VIEWER";
  organizationId?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (isLoading: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));
