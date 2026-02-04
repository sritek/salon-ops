/**
 * Dashboard Layout
 * Based on: .cursor/rules/14-frontend-implementation.mdc lines 381-412
 */

import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:flex lg:flex-col" />

      {/* Mobile Navigation Drawer */}
      <MobileNav />

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
