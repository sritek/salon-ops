/**
 * Notification Store
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 *
 * Manages in-app notifications with support for:
 * - Grouped notifications by type
 * - Read/unread state
 * - Auto-archiving after 30 days
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type NotificationType = 'appointments' | 'billing' | 'inventory' | 'staff' | 'system';
export type NotificationPriority = 'high' | 'medium' | 'low';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
  expiresAt?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  filter: NotificationType | 'all';

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearExpired: () => void;
  setOpen: (open: boolean) => void;
  setFilter: (filter: NotificationType | 'all') => void;
  getFilteredNotifications: () => Notification[];
  getGroupedNotifications: () => Record<NotificationType, Notification[]>;
}

// Helper to generate unique IDs
const generateId = () => `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// 30 days in milliseconds
const NOTIFICATION_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isOpen: false,
      filter: 'all',

      addNotification: (notification) => {
        const id = generateId();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + NOTIFICATION_RETENTION_MS).toISOString();

        const newNotification: Notification = {
          ...notification,
          id,
          isRead: false,
          createdAt: now.toISOString(),
          expiresAt,
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
      },

      markAsRead: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          if (!notification || notification.isRead) return state;

          return {
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, isRead: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
          unreadCount: 0,
        }));
      },

      removeNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          const wasUnread = notification && !notification.isRead;

          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          };
        });
      },

      clearExpired: () => {
        const now = new Date();
        set((state) => {
          const validNotifications = state.notifications.filter((n) => {
            if (!n.expiresAt) return true;
            return new Date(n.expiresAt) > now;
          });

          const removedUnreadCount = state.notifications.filter(
            (n) => !n.isRead && n.expiresAt && new Date(n.expiresAt) <= now
          ).length;

          return {
            notifications: validNotifications,
            unreadCount: Math.max(0, state.unreadCount - removedUnreadCount),
          };
        });
      },

      setOpen: (open) => set({ isOpen: open }),

      setFilter: (filter) => set({ filter }),

      getFilteredNotifications: () => {
        const state = get();
        if (state.filter === 'all') return state.notifications;
        return state.notifications.filter((n) => n.type === state.filter);
      },

      getGroupedNotifications: () => {
        const state = get();
        const grouped: Record<NotificationType, Notification[]> = {
          appointments: [],
          billing: [],
          inventory: [],
          staff: [],
          system: [],
        };

        state.notifications.forEach((n) => {
          grouped[n.type].push(n);
        });

        return grouped;
      },
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
      }),
    }
  )
);

// Selector hooks
export const useNotifications = () => useNotificationStore((state) => state.notifications);
export const useUnreadCount = () => useNotificationStore((state) => state.unreadCount);
export const useNotificationIsOpen = () => useNotificationStore((state) => state.isOpen);
