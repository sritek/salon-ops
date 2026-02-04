/**
 * Sidebar - Collapsible navigation sidebar
 *
 * Features:
 * - Expand/collapse toggle
 * - Icons only with tooltips when collapsed
 * - Smooth transition animation
 * - State persisted in localStorage
 * - Permission-based navigation filtering
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  Receipt,
  Package,
  BarChart3,
  Megaphone,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { PERMISSIONS } from '@salon-ops/shared';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  /** Permission required to view this nav item (undefined = always visible) */
  permission?: string;
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    title: 'Appointments',
    href: '/appointments',
    icon: Calendar,
    permission: PERMISSIONS.APPOINTMENTS_READ,
  },
  {
    title: 'Customers',
    href: '/customers',
    icon: Users,
    permission: PERMISSIONS.CUSTOMERS_READ,
  },
  {
    title: 'Services',
    href: '/services',
    icon: Scissors,
    permission: PERMISSIONS.SERVICES_READ,
  },
  {
    title: 'Billing',
    href: '/billing',
    icon: Receipt,
    permission: PERMISSIONS.BILLS_READ,
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: Package,
    permission: PERMISSIONS.INVENTORY_READ,
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: BarChart3,
    permission: PERMISSIONS.REPORTS_READ,
  },
  {
    title: 'Marketing',
    href: '/marketing',
    icon: Megaphone,
    permission: PERMISSIONS.MARKETING_READ,
  },
];

const bottomNavItems: NavItem[] = [
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    permission: PERMISSIONS.SETTINGS_MANAGE,
  },
  { title: 'Help', href: '/help', icon: HelpCircle },
];

function NavLink({ item, isCollapsed }: { item: NavItem; isCollapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(item.href);

  const link = (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {!isCollapsed && <span>{item.title}</span>}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-4">
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebarCollapse } = useUIStore();
  const { hasPermission } = usePermissions();

  // Filter nav items based on user permissions
  const visibleMainNavItems = useMemo(
    () => mainNavItems.filter((item) => !item.permission || hasPermission(item.permission)),
    [hasPermission]
  );

  const visibleBottomNavItems = useMemo(
    () => bottomNavItems.filter((item) => !item.permission || hasPermission(item.permission)),
    [hasPermission]
  );

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'flex h-screen flex-col border-r bg-card transition-[width] duration-300 ease-in-out',
          sidebarCollapsed ? 'w-16' : 'w-64',
          className
        )}
      >
        {/* Logo / Brand */}
        <div className={cn(
          'flex h-16 items-center border-b px-4',
          sidebarCollapsed ? 'justify-center' : 'justify-between'
        )}>
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center gap-2 font-bold',
              sidebarCollapsed ? 'text-lg' : 'text-xl'
            )}
          >
            {sidebarCollapsed ? (
              <span className="text-primary">SO</span>
            ) : (
              <>
                <span className="text-primary">Salon</span>
                <span>Ops</span>
              </>
            )}
          </Link>

          {/* Collapse toggle - only show on expanded */}
          {!sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleSidebarCollapse}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {visibleMainNavItems.map((item) => (
              <li key={item.href}>
                <NavLink item={item} isCollapsed={sidebarCollapsed} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom navigation */}
        <div className="border-t p-2">
          <ul className="space-y-1">
            {visibleBottomNavItems.map((item) => (
              <li key={item.href}>
                <NavLink item={item} isCollapsed={sidebarCollapsed} />
              </li>
            ))}
          </ul>

          {/* Expand toggle - only show when collapsed */}
          {sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="mt-2 h-8 w-full"
              onClick={toggleSidebarCollapse}
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
