/**
 * Success/Error Feedback Animations
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 10.3, 10.9
 *
 * Provides animated feedback for form submissions and validation errors.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion';

// Success checkmark animation
interface SuccessCheckmarkProps {
  show: boolean;
  size?: 'sm' | 'md' | 'lg';
  onComplete?: () => void;
  className?: string;
}

export function SuccessCheckmark({
  show,
  size = 'md',
  onComplete,
  className,
}: SuccessCheckmarkProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, prefersReducedMotion ? 100 : 1000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete, prefersReducedMotion]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.01 }
              : {
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                }
          }
          className={cn(
            'flex items-center justify-center rounded-full bg-green-500 text-white',
            sizeClasses[size],
            className
          )}
        >
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={prefersReducedMotion ? { duration: 0.01 } : { delay: 0.2, duration: 0.3 }}
          >
            <Check className={iconSizes[size]} strokeWidth={3} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Error X animation
interface ErrorCrossProps {
  show: boolean;
  size?: 'sm' | 'md' | 'lg';
  onComplete?: () => void;
  className?: string;
}

export function ErrorCross({ show, size = 'md', onComplete, className }: ErrorCrossProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, prefersReducedMotion ? 100 : 1000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete, prefersReducedMotion]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.01 }
              : {
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                }
          }
          className={cn(
            'flex items-center justify-center rounded-full bg-red-500 text-white',
            sizeClasses[size],
            className
          )}
        >
          <X className={iconSizes[size]} strokeWidth={3} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Input shake animation for validation errors
interface ShakeInputProps {
  shake: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ShakeInput({ shake, children, className }: ShakeInputProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      animate={
        shake && !prefersReducedMotion
          ? {
              x: [-10, 10, -10, 10, 0],
            }
          : {}
      }
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Inline error message with animation
interface InlineErrorProps {
  message: string | undefined;
  className?: string;
}

export function InlineError({ message, className }: InlineErrorProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.2 }}
          className={cn('flex items-center gap-1 text-sm text-destructive mt-1', className)}
        >
          <AlertCircle className="h-3 w-3" />
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Form submission feedback overlay
interface FormFeedbackOverlayProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  successMessage?: string;
  errorMessage?: string;
  onDismiss?: () => void;
}

export function FormFeedbackOverlay({
  status,
  successMessage = 'Saved successfully!',
  errorMessage = 'Something went wrong',
  onDismiss,
}: FormFeedbackOverlayProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if ((status === 'success' || status === 'error') && onDismiss) {
      const timer = setTimeout(onDismiss, prefersReducedMotion ? 500 : 2000);
      return () => clearTimeout(timer);
    }
  }, [status, onDismiss, prefersReducedMotion]);

  if (status === 'idle' || status === 'loading') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: prefersReducedMotion ? 0.01 : 0.2 }}
        className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm rounded-lg"
      >
        <div className="flex flex-col items-center gap-3">
          {status === 'success' ? (
            <>
              <SuccessCheckmark show size="lg" />
              <p className="text-sm font-medium text-green-600">{successMessage}</p>
            </>
          ) : (
            <>
              <ErrorCross show size="lg" />
              <p className="text-sm font-medium text-red-600">{errorMessage}</p>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook for managing form feedback state
export function useFormFeedback() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const showSuccess = useCallback((msg?: string) => {
    setStatus('success');
    setMessage(msg || 'Success!');
  }, []);

  const showError = useCallback((msg?: string) => {
    setStatus('error');
    setMessage(msg || 'Error occurred');
  }, []);

  const setLoading = useCallback(() => {
    setStatus('loading');
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setMessage('');
  }, []);

  return {
    status,
    message,
    showSuccess,
    showError,
    setLoading,
    reset,
  };
}

// Pulse animation for status changes
interface PulseOnChangeProps {
  value: unknown;
  children: React.ReactNode;
  className?: string;
}

export function PulseOnChange({ value, children, className }: PulseOnChangeProps) {
  const [shouldPulse, setShouldPulse] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    setShouldPulse(true);
    const timer = setTimeout(() => setShouldPulse(false), 300);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <motion.div
      animate={
        shouldPulse && !prefersReducedMotion
          ? {
              scale: [1, 1.05, 1],
            }
          : {}
      }
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
