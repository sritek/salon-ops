/**
 * 404 Not Found Page
 * Modern, fun design with Tailwind animations
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Animated 404 */}
        <div className="relative mb-8">
          {/* Background glow effect */}
          <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full animate-pulse" />

          {/* 404 Text */}
          <h1 className="relative text-[10rem] sm:text-[14rem] font-black leading-none tracking-tighter select-none">
            <span className="bg-gradient-to-br from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              4
            </span>
            <span className="relative inline-block">
              <span className="bg-gradient-to-br from-pink-500 via-primary to-purple-500 bg-clip-text text-transparent">
                0
              </span>
              {/* Floating scissors emoji */}
              <span className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 text-3xl sm:text-4xl animate-bounce">
                ✂️
              </span>
            </span>
            <span className="bg-gradient-to-br from-purple-500 via-pink-500 to-primary bg-clip-text text-transparent">
              4
            </span>
          </h1>
        </div>

        {/* Message */}
        <div className="space-y-4 mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Oops! This page got a bad haircut
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Looks like this page wandered off to get a coffee. Let&apos;s get you back to somewhere
            that exists!
          </p>
        </div>

        {/* Fun illustration */}
        <div className="flex justify-center gap-4 mb-8 text-5xl sm:text-6xl">
          <span
            className="inline-block animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '1s' }}
          >
            💇
          </span>
          <span
            className="inline-block animate-bounce"
            style={{ animationDelay: '150ms', animationDuration: '1s' }}
          >
            💅
          </span>
          <span
            className="inline-block animate-bounce"
            style={{ animationDelay: '300ms', animationDuration: '1s' }}
          >
            💆
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="gap-2 min-w-[160px]">
            <Link href="/today">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2 min-w-[160px]"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>

        {/* Footer hint */}
        <p className="mt-12 text-sm text-muted-foreground">
          Lost? Try using the <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">⌘K</kbd>{' '}
          search to find what you&apos;re looking for.
        </p>
      </div>
    </div>
  );
}
