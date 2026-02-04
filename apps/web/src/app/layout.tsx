/**
 * Root Layout
 * Based on: .cursor/rules/14-frontend-implementation.mdc lines 344-375
 */

import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';

import { Providers } from '@/providers';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Salon Ops',
  description: 'Salon Management Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
