'use client';

/**
 * Command Palette Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.7, 2.8, 2.9, 2.10
 *
 * Features:
 * - Fuzzy search across navigation, customers, appointments
 * - Recent searches storage in localStorage
 * - Keyboard navigation (arrow keys, Enter, Escape)
 * - Display keyboard shortcuts next to actions
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Users,
  FileText,
  Settings,
  Home,
  Scissors,
  Package,
  UserPlus,
  CalendarPlus,
  CreditCard,
  BarChart3,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command';
import { useUIStore } from '@/stores/ui-store';
import { useSlideOver } from '@/hooks/use-slide-over';

// Types
export type CommandItemType = 'navigation' | 'customer' | 'appointment' | 'action';

export interface CommandItemData {
  id: string;
  type: CommandItemType;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  shortcut?: string;
  keywords?: string[];
  onSelect: () => void;
}

export interface CommandGroupData {
  id: string;
  title: string;
  items: CommandItemData[];
}

// Recent searches storage key
const RECENT_SEARCHES_KEY = 'command-palette-recent';
const MAX_RECENT_SEARCHES = 5;

// Built-in navigation commands
const NAVIGATION_COMMANDS: CommandItemData[] = [
  {
    id: 'nav-dashboard',
    type: 'navigation',
    title: 'Dashboard',
    icon: Home,
    shortcut: 'G D',
    keywords: ['home', 'overview'],
    onSelect: () => {},
  },
  {
    id: 'nav-appointments',
    type: 'navigation',
    title: 'Appointments',
    icon: Calendar,
    shortcut: 'G A',
    keywords: ['bookings', 'schedule'],
    onSelect: () => {},
  },
  {
    id: 'nav-customers',
    type: 'navigation',
    title: 'Customers',
    icon: Users,
    shortcut: 'G C',
    keywords: ['clients', 'contacts'],
    onSelect: () => {},
  },
  {
    id: 'nav-services',
    type: 'navigation',
    title: 'Services',
    icon: Scissors,
    keywords: ['treatments', 'offerings'],
    onSelect: () => {},
  },
  {
    id: 'nav-billing',
    type: 'navigation',
    title: 'Billing',
    icon: FileText,
    keywords: ['invoices', 'payments'],
    onSelect: () => {},
  },
  {
    id: 'nav-inventory',
    type: 'navigation',
    title: 'Inventory',
    icon: Package,
    keywords: ['products', 'stock'],
    onSelect: () => {},
  },
  {
    id: 'nav-staff',
    type: 'navigation',
    title: 'Staff',
    icon: Users,
    keywords: ['employees', 'team'],
    onSelect: () => {},
  },
  {
    id: 'nav-reports',
    type: 'navigation',
    title: 'Reports',
    icon: BarChart3,
    keywords: ['analytics', 'statistics'],
    onSelect: () => {},
  },
  {
    id: 'nav-settings',
    type: 'navigation',
    title: 'Settings',
    icon: Settings,
    keywords: ['preferences', 'configuration'],
    onSelect: () => {},
  },
];

// Built-in action commands
const ACTION_COMMANDS: CommandItemData[] = [
  {
    id: 'action-new-appointment',
    type: 'action',
    title: 'New Appointment',
    icon: CalendarPlus,
    shortcut: 'N',
    keywords: ['book', 'schedule', 'create'],
    onSelect: () => {},
  },
  {
    id: 'action-new-customer',
    type: 'action',
    title: 'New Customer',
    icon: UserPlus,
    shortcut: '⇧N',
    keywords: ['add', 'create', 'client'],
    onSelect: () => {},
  },
  {
    id: 'action-walk-in',
    type: 'action',
    title: 'Add Walk-in',
    icon: Clock,
    shortcut: 'W',
    keywords: ['queue', 'waiting'],
    onSelect: () => {},
  },
  {
    id: 'action-new-invoice',
    type: 'action',
    title: 'New Invoice',
    icon: CreditCard,
    shortcut: 'I',
    keywords: ['bill', 'payment', 'checkout'],
    onSelect: () => {},
  },
];

// Navigation routes mapping
const NAVIGATION_ROUTES: Record<string, string> = {
  'nav-dashboard': '/dashboard',
  'nav-appointments': '/appointments',
  'nav-customers': '/customers',
  'nav-services': '/services',
  'nav-billing': '/billing',
  'nav-inventory': '/inventory',
  'nav-staff': '/staff',
  'nav-reports': '/reports',
  'nav-settings': '/settings',
};

// Action routes mapping
const ACTION_ROUTES: Record<string, string> = {
  'action-new-appointment': '/appointments/new',
  'action-new-customer': '/customers/new',
  'action-walk-in': '/walk-in',
  'action-new-invoice': '/billing/new',
};

interface CommandPaletteProps {
  /** Additional custom commands */
  customCommands?: CommandGroupData[];
}

export function CommandPalette({ customCommands = [] }: CommandPaletteProps) {
  const router = useRouter();
  const { commandPaletteOpen, closeCommandPalette } = useUIStore();
  useSlideOver(); // For future use
  const [search, setSearch] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== searchTerm);
      const updated = [searchTerm, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Handle navigation
  const handleNavigation = useCallback(
    (id: string) => {
      const route = NAVIGATION_ROUTES[id];
      if (route) {
        router.push(route);
        closeCommandPalette();
        saveRecentSearch(NAVIGATION_COMMANDS.find((c) => c.id === id)?.title || '');
      }
    },
    [router, closeCommandPalette, saveRecentSearch]
  );

  // Handle action
  const handleAction = useCallback(
    (id: string) => {
      const route = ACTION_ROUTES[id];
      if (route) {
        // For now, navigate to the route
        // In the future, this could open a slide-over panel
        router.push(route);
        closeCommandPalette();
        saveRecentSearch(ACTION_COMMANDS.find((c) => c.id === id)?.title || '');
      }
    },
    [router, closeCommandPalette, saveRecentSearch]
  );

  // Create navigation commands with handlers
  const navigationCommands = useMemo(
    () =>
      NAVIGATION_COMMANDS.map((cmd) => ({
        ...cmd,
        onSelect: () => handleNavigation(cmd.id),
      })),
    [handleNavigation]
  );

  // Create action commands with handlers
  const actionCommands = useMemo(
    () =>
      ACTION_COMMANDS.map((cmd) => ({
        ...cmd,
        onSelect: () => handleAction(cmd.id),
      })),
    [handleAction]
  );

  // Handle open change
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeCommandPalette();
        setSearch('');
      }
    },
    [closeCommandPalette]
  );

  // Handle item select
  const handleSelect = useCallback((item: CommandItemData) => {
    item.onSelect();
  }, []);

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={handleOpenChange}>
      <CommandInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Recent searches - only show when no search query */}
        {!search && recentSearches.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentSearches.map((recent, index) => (
                <CommandItem
                  key={`recent-${index}`}
                  value={recent}
                  onSelect={() => setSearch(recent)}
                >
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  {recent}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          {actionCommands.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.title} ${item.keywords?.join(' ') || ''}`}
              onSelect={() => handleSelect(item)}
            >
              {item.icon && <item.icon className="mr-2 h-4 w-4" />}
              <span>{item.title}</span>
              {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          {navigationCommands.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.title} ${item.keywords?.join(' ') || ''}`}
              onSelect={() => handleSelect(item)}
            >
              {item.icon && <item.icon className="mr-2 h-4 w-4" />}
              <span>{item.title}</span>
              {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Custom command groups */}
        {customCommands.map((group) => (
          <CommandGroup key={group.id} heading={group.title}>
            {group.items.map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.title} ${item.subtitle || ''} ${item.keywords?.join(' ') || ''}`}
                onSelect={() => handleSelect(item)}
              >
                {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                <div className="flex flex-col">
                  <span>{item.title}</span>
                  {item.subtitle && (
                    <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                  )}
                </div>
                {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
