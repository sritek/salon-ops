/**
 * Dashboard Layout
 * Based on: .cursor/rules/14-frontend-implementation.mdc lines 381-412
 */

import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { ResponsiveLayout } from '@/components/layout/responsive-layout';
import { SlideOverProvider } from '@/components/ux';
import { SlideOverRegistry } from '@/components/ux/slide-over/slide-over-registry';
import { AuthGuard } from '@/components/auth';
import { BranchChangeProvider } from '@/components/providers/branch-change-provider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <BranchChangeProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          {/* Desktop/Tablet Sidebar - hidden on mobile (<768px) */}
          <Sidebar className="hidden md:flex flex-col" />

          {/* Mobile Navigation Drawer */}
          <MobileNav />

          {/* Main Content */}
          <SlideOverProvider>
            {/* Register slide-over panels */}
            <SlideOverRegistry />

            <div className="flex flex-1 flex-col">
              <Header />
              <main className="flex-1 overflow-auto p-4 lg:p-6 pb-20 md:pb-6">
                <ResponsiveLayout>{children}</ResponsiveLayout>
              </main>
            </div>
          </SlideOverProvider>
        </div>
      </BranchChangeProvider>
    </AuthGuard>
  );
}
