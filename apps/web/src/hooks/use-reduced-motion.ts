/**
 * Reduced Motion Support Hook
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 10.11
 *
 * Detects user's prefers-reduced-motion preference and provides
 * appropriate animation configurations.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { transitions, getTransitions } from '@/lib/animations/transitions';
import type { Transition, Variants } from 'framer-motion';

interface UseReducedMotionReturn {
  prefersReducedMotion: boolean;
  transitions: typeof transitions;
  getVariants: <T extends Variants>(variants: T) => T;
  getTransition: (transition: Transition) => Transition;
}

/**
 * Hook to detect and respond to user's reduced motion preference
 */
export function useReducedMotion(): UseReducedMotionReturn {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window is available (SSR safety)
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Get appropriate transitions based on preference
  const currentTransitions = getTransitions(prefersReducedMotion);

  // Transform variants to reduced motion versions
  const getVariants = useCallback(
    <T extends Variants>(variants: T): T => {
      if (!prefersReducedMotion) return variants;

      // Create reduced motion variants by removing/minimizing animations
      const reducedVariants: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(variants)) {
        if (typeof value === 'object' && value !== null) {
          const variant = value as Record<string, unknown>;
          reducedVariants[key] = {
            ...variant,
            // Remove transform animations
            x: 0,
            y: 0,
            scale: 1,
            rotate: 0,
            // Keep opacity but make it instant
            transition: { duration: 0.01 },
          };
        } else {
          reducedVariants[key] = value;
        }
      }

      return reducedVariants as T;
    },
    [prefersReducedMotion]
  );

  // Transform a single transition to reduced motion version
  const getTransition = useCallback(
    (transition: Transition): Transition => {
      if (!prefersReducedMotion) return transition;
      return { type: 'tween', duration: 0.01 };
    },
    [prefersReducedMotion]
  );

  return {
    prefersReducedMotion,
    transitions: currentTransitions,
    getVariants,
    getTransition,
  };
}

/**
 * Simple hook that just returns the boolean preference
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}
