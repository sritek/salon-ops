/**
 * Internal Admin Store
 * Separate auth state for internal admin portal
 */

import Cookies from 'js-cookie';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AdminState {
  email: string | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (email: string, accessToken: string) => void;
  logout: () => void;
}

/**
 * Cookie storage for admin auth
 */
const cookieStorageApi = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    return Cookies.get(name) ?? null;
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    Cookies.set(name, value, {
      expires: 1, // 1 day (shorter than user auth)
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    Cookies.remove(name, { path: '/' });
  },
};

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      email: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (email, accessToken) =>
        set({
          email,
          accessToken,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          email: null,
          accessToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'admin-storage',
      storage: createJSONStorage(() => cookieStorageApi),
    }
  )
);
