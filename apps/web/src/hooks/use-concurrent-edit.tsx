/**
 * Concurrent Edit Indicator Hook
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 9.9
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';

// Heartbeat interval for edit presence (30 seconds)
const HEARTBEAT_INTERVAL = 30000;
// Stale threshold - consider edit stale after 60 seconds without heartbeat
const STALE_THRESHOLD = 60000;

interface UseConcurrentEditOptions {
  entityType: string;
  entityId: string;
  isEditing?: boolean;
}

interface EditingUser {
  /** Entity type (e.g., 'appointment', 'customer') */
  entityType?: string;
  /** Entity ID being edited */
  entityId?: string;
  /** Whether the current user is editing */
  isEditing?: boolean;
  /** User ID of the editor */
  userId?: string;
  /** User name of the editor */
  userName?: string;
  /** When editing started */
  startedAt?: number;
  /** Last heartbeat timestamp */
  lastHeartbeat?: number;
}

/**
 * Hook to track and display concurrent editors
 */
export function useConcurrentEdit({
  isEditing = false,
}: Omit<UseConcurrentEditOptions, 'entityType' | 'entityId'> & {
  entityType?: string;
  entityId?: string;
}) {
  const { user } = useAuthStore();
  const [editors, setEditors] = useState<EditingUser[]>([]);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupRef = useRef<NodeJS.Timeout | null>(null);

  // Get other editors (excluding current user)
  const otherEditors = editors.filter((editor) => editor.userId !== user?.id);

  // Check if entity is being edited by others
  const isBeingEditedByOthers = otherEditors.length > 0;

  // Get display text for editors
  const getEditorsText = useCallback(() => {
    if (otherEditors.length === 0) return null;
    if (otherEditors.length === 1) {
      return `Being edited by ${otherEditors[0].userName}`;
    }
    return `Being edited by ${otherEditors.length} users`;
  }, [otherEditors]);

  // Start editing (announce presence)
  const startEditing = useCallback(() => {
    if (!user) return;

    const newEditor: EditingUser = {
      userId: user.id,
      userName: user.name || 'Unknown',
      startedAt: Date.now(),
      lastHeartbeat: Date.now(),
    };

    // Add to local state
    setEditors((prev) => {
      const filtered = prev.filter((e) => e.userId !== user.id);
      return [...filtered, newEditor];
    });

    // TODO: In a real implementation, this would broadcast via WebSocket/SSE
    // For now, we just track locally
  }, [user]);

  // Stop editing (remove presence)
  const stopEditing = useCallback(() => {
    if (!user) return;

    setEditors((prev) => prev.filter((e) => e.userId !== user.id));

    // TODO: Broadcast stop editing via WebSocket/SSE
  }, [user]);

  // Send heartbeat
  const sendHeartbeat = useCallback(() => {
    if (!user) return;

    setEditors((prev) =>
      prev.map((e) => (e.userId === user.id ? { ...e, lastHeartbeat: Date.now() } : e))
    );

    // TODO: Broadcast heartbeat via WebSocket/SSE
  }, [user]);

  // Clean up stale editors
  const cleanupStaleEditors = useCallback(() => {
    const now = Date.now();
    setEditors((prev) => prev.filter((e) => now - (e.lastHeartbeat ?? 0) < STALE_THRESHOLD));
  }, []);

  // Handle editing state changes
  useEffect(() => {
    if (isEditing) {
      startEditing();

      // Start heartbeat
      heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

      return () => {
        stopEditing();
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
        }
      };
    }
  }, [isEditing, startEditing, stopEditing, sendHeartbeat]);

  // Cleanup stale editors periodically
  useEffect(() => {
    cleanupRef.current = setInterval(cleanupStaleEditors, STALE_THRESHOLD / 2);

    return () => {
      if (cleanupRef.current) {
        clearInterval(cleanupRef.current);
      }
    };
  }, [cleanupStaleEditors]);

  return {
    editors,
    otherEditors,
    isBeingEditedByOthers,
    editorsText: getEditorsText(),
    startEditing,
    stopEditing,
  };
}

/**
 * Component to display concurrent edit indicator
 */
export function ConcurrentEditIndicator({
  editorsText,
  className = '',
}: {
  editorsText: string | null;
  className?: string;
}) {
  if (!editorsText) return null;

  return (
    <div
      className={`flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md ${className}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      {editorsText}
    </div>
  );
}
