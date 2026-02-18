/**
 * Framer Motion Transition Configurations
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 10.1, 10.2, 10.11
 */

import type { Transition } from 'framer-motion';

// Standard transitions
export const transitions = {
  // Fast transition for micro-interactions (150ms)
  fast: {
    type: 'tween',
    duration: 0.15,
    ease: 'easeOut',
  } as Transition,

  // Default transition (200ms)
  default: {
    type: 'tween',
    duration: 0.2,
    ease: 'easeOut',
  } as Transition,

  // Medium transition for panels (300ms)
  medium: {
    type: 'tween',
    duration: 0.3,
    ease: 'easeOut',
  } as Transition,

  // Slow transition for complex animations (500ms)
  slow: {
    type: 'tween',
    duration: 0.5,
    ease: 'easeOut',
  } as Transition,

  // Spring transition for bouncy effects
  spring: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
  } as Transition,

  // Gentle spring for subtle movements
  gentleSpring: {
    type: 'spring',
    stiffness: 200,
    damping: 20,
  } as Transition,

  // Stiff spring for snappy interactions
  stiffSpring: {
    type: 'spring',
    stiffness: 600,
    damping: 30,
  } as Transition,
};

// Reduced motion transitions (for accessibility)
export const reducedMotionTransitions = {
  fast: {
    type: 'tween',
    duration: 0,
  } as Transition,

  default: {
    type: 'tween',
    duration: 0.01,
  } as Transition,

  medium: {
    type: 'tween',
    duration: 0.01,
  } as Transition,

  slow: {
    type: 'tween',
    duration: 0.01,
  } as Transition,

  spring: {
    type: 'tween',
    duration: 0.01,
  } as Transition,

  gentleSpring: {
    type: 'tween',
    duration: 0.01,
  } as Transition,

  stiffSpring: {
    type: 'tween',
    duration: 0.01,
  } as Transition,
};

// Get appropriate transitions based on reduced motion preference
export function getTransitions(prefersReducedMotion: boolean) {
  return prefersReducedMotion ? reducedMotionTransitions : transitions;
}
