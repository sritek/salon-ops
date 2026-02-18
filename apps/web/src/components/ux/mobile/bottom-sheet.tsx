/**
 * Bottom Sheet Component
 * Slide-up panel from the bottom of the screen for mobile
 * Requirements: 8.5, 8.12
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';

import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  snapPoints?: number[]; // Percentage heights (e.g., [50, 100])
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  snapPoints = [50, 100],
  children,
  className,
}: BottomSheetProps) {
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [currentSnapIndex, setCurrentSnapIndex] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(0);

  // Calculate the current height based on snap point
  const currentHeight = snapPoints[currentSnapIndex];

  // Update sheet height on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      if (typeof window !== 'undefined') {
        setSheetHeight(window.innerHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Handle drag end - snap to nearest point or close
  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const velocity = info.velocity.y;
      const offset = info.offset.y;

      // If dragged down fast or far enough, close
      if (velocity > 500 || offset > sheetHeight * 0.3) {
        onOpenChange(false);
        return;
      }

      // If dragged up fast, go to max snap point
      if (velocity < -500) {
        setCurrentSnapIndex(snapPoints.length - 1);
        return;
      }

      // Find nearest snap point based on current position
      const currentY = (sheetHeight * currentHeight) / 100 - offset;
      const currentPercent = (currentY / sheetHeight) * 100;

      let nearestIndex = 0;
      let nearestDistance = Math.abs(snapPoints[0] - currentPercent);

      snapPoints.forEach((point, index) => {
        const distance = Math.abs(point - currentPercent);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      setCurrentSnapIndex(nearestIndex);
    },
    [currentHeight, onOpenChange, sheetHeight, snapPoints]
  );

  // Reset snap index when opening
  useEffect(() => {
    if (open) {
      setCurrentSnapIndex(0);
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-50 bg-black/50"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: `${100 - currentHeight}%` }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={cn(
              'fixed inset-x-0 bottom-0 z-50',
              'bg-background rounded-t-2xl shadow-xl',
              'flex flex-col',
              'max-h-[95vh]',
              className
            )}
            style={{ height: `${currentHeight}%` }}
          >
            {/* Drag Handle */}
            <div
              className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Title */}
            {title && (
              <div className="px-4 pb-2 border-b">
                <h2 className="text-lg font-semibold">{title}</h2>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto px-4 py-2 pb-safe">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
