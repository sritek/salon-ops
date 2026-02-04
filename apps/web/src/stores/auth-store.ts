/**
 * Auth Store
 * Based on: .cursor/rules/14-frontend-implementation.mdc lines 522-596
 *
 * Uses cookies for persistence so Next.js middleware can access auth state
 */

import Cookies from 'js-cookie';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email?: string;
  phone: string;
  name: string;
  role: string;
  tenantId: string;
  branchIds: string[];
  permissions: string[];
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (user: User, tenant: Tenant, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Custom cookie storage adapter for Zustand
 * Stores auth state in cookies so Next.js middleware can read it
 */
const cookieStorageApi = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    return Cookies.get(name) ?? null;
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    // Set cookie with secure options
    // 7 day expiry to match refresh token
    Cookies.set(name, value, {
      expires: 7,
      path: '/',
      sameSite: 'lax',
      // secure: true in production
      secure: process.env.NODE_ENV === 'production',
    });
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    Cookies.remove(name, { path: '/' });
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, tenant, accessToken, refreshToken) =>
        set({
          user,
          tenant,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      logout: () =>
        set({
          user: null,
          tenant: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => cookieStorageApi),
    }
  )
);
