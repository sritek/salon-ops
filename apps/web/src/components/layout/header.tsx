/**
 * Header - Top header with navigation and user controls
 *
 * Features:
 * - Mobile: Hamburger menu + logo + user avatar
 * - Desktop: Search (Cmd+K) + notifications + user dropdown
 * - Branch switcher (if multiple branches)
 * - View switcher for role-based views
 */

'use client';

import { useRouter } from 'next/navigation';
import { Menu, Search, LogOut, User, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import { useCommandPalette } from '@/hooks/use-command-palette';
import { ViewSwitcher } from './view-switcher';
import { BranchSelector } from './branch-selector';
import { ConnectionStatus } from '@/components/ux/real-time';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const router = useRouter();
  const { user, tenant, refreshToken, logout } = useAuthStore();
  const { setMobileNavOpen } = useUIStore();
  const { open: openCommandPalette } = useCommandPalette();

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Continue with logout even if API call fails
    }
    logout();
    router.push('/login');
  };

  // Get user initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6',
        className
      )}
    >
      {/* Left side - Mobile menu + Logo/Tenant */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Tenant name */}
        <div className="hidden sm:block">
          <p className="text-sm font-medium">{tenant?.name}</p>
        </div>

        {/* Branch Selector - for multi-branch users */}
        <BranchSelector className="hidden sm:flex" />
      </div>

      {/* Right side - Connection Status + View Switcher + Search + User */}
      <div className="flex items-center gap-2">
        {/* Connection Status Indicator (Requirement 9.5) */}
        <ConnectionStatus className="hidden sm:flex" />

        {/* View Switcher (Requirement 7.9, 7.10) */}
        <ViewSwitcher className="hidden md:flex" />

        {/* Search button - opens command palette (Requirement 2.11) */}
        <Button
          variant="outline"
          size="sm"
          className="hidden md:flex items-center gap-2 text-muted-foreground"
          onClick={openCommandPalette}
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">Search...</span>
          <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        {/* Mobile search button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={openCommandPalette}
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium">{user?.name}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {user?.role?.replace(/_/g, ' ')}
                </span>
              </div>
              <ChevronDown className="hidden md:block h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email || user?.phone}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings/account')}>
              <User className="mr-2 h-4 w-4" />
              My Account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
