'use client';

/**
 * Command Palette Provider
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 2.1, 2.9
 *
 * Provides keyboard listener for Cmd+K / Ctrl+K to open command palette.
 * Also handles other global keyboard shortcuts.
 */

import { useEffect, type ReactNode } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { CommandPalette, type CommandGroupData } from './command-palette';

interface CommandPaletteProviderProps {
  children: ReactNode;
  /** Additional custom commands to include in the palette */
  customCommands?: CommandGroupData[];
}

export function CommandPaletteProvider({ children, customCommands }: CommandPaletteProviderProps) {
  const { openCommandPalette, closeCommandPalette, commandPaletteOpen } = useUIStore();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to toggle command palette
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        if (commandPaletteOpen) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
        return;
      }

      // Escape to close command palette (handled by the dialog itself, but adding here for safety)
      if (event.key === 'Escape' && commandPaletteOpen) {
        closeCommandPalette();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openCommandPalette, closeCommandPalette, commandPaletteOpen]);

  return (
    <>
      {children}
      <CommandPalette customCommands={customCommands} />
    </>
  );
}
