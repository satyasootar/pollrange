import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isHydrated: boolean;
  setUser: (user: User) => void;
  setAuth: (user: User, accessToken?: string, refreshToken?: string) => void;
  clearAuth: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isHydrated: false,
      // Same account: merge, so payloads without the /auth/me-only fields (isAdmin, hasPassword, hasGoogle) don't drop them.
      setUser: (user) => set((s) => ({ user: s.user?._id === user._id ? { ...s.user, ...user } : user })),
      setAuth: (user, accessToken, refreshToken) => 
        set({ user, accessToken: accessToken ?? null, refreshToken: refreshToken ?? null }),
      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
