/**
 * MobileNav - Mobile navigation drawer
 * 
 * Features:
 * - Sheet drawer from left side
 * - Same navigation items as desktop sidebar
 * - Closes on route change
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Appointments', href: '/appointments', icon: Calendar },
  { title: 'Customers', href: '/customers', icon: Users },
  { title: 'Services', href: '/services', icon: Scissors },
  { title: 'Billing', href: '/billing', icon: Receipt },
  { title: 'Inventory', href: '/inventory', icon: Package },
  { title: 'Reports', href: '/reports', icon: BarChart3 },
  { title: 'Marketing', href: '/marketing', icon: Megaphone },
];

const bottomNavItems: NavItem[] = [
  { title: 'Settings', href: '/settings', icon: Settings },
  { title: 'Help', href: '/help', icon: HelpCircle },
];

export function MobileNav() {
  const pathname = usePathname();
  const { mobileNavOpen, setMobileNavOpen } = useUIStore();

  // Close on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  return (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle asChild>
            <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold">
              <span className="text-primary">Salon</span>
              <span>Ops</span>
            </Link>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-65px)]">
          <nav className="p-4">
            {/* Main navigation */}
            <div className="space-y-1">
              {mainNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.title}
                  </Link>
                );
              })}
            </div>

            {/* Divider */}
            <div className="my-4 border-t" />

            {/* Bottom navigation */}
            <div className="space-y-1">
              {bottomNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
