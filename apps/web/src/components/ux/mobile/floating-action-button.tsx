/**
 * Floating Action Button Component
 * Center navigation item that opens a radial menu for quick actions
 * Requirements: 8.2, 8.3
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  X,
  CalendarPlus,
  UserPlus,
  CreditCard,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import type { UserRole } from '@/lib/role-views';

interface FABAction {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  href?: string;
  action?: string;
}

// Role-specific FAB actions
const ROLE_FAB_ACTIONS: Record<UserRole, FABAction[]> = {
  super_owner: [
    { id: 'new-appointment', label: 'New Appointment', icon: CalendarPlus, color: 'bg-blue-500' },
    { id: 'new-customer', label: 'New Customer', icon: UserPlus, color: 'bg-green-500' },
    { id: 'quick-checkout', label: 'Quick Checkout', icon: CreditCard, color: 'bg-purple-500' },
  ],
  regional_manager: [
    { id: 'new-appointment', label: 'New Appointment', icon: CalendarPlus, color: 'bg-blue-500' },
    { id: 'new-customer', label: 'New Customer', icon: UserPlus, color: 'bg-green-500' },
    { id: 'quick-checkout', label: 'Quick Checkout', icon: CreditCard, color: 'bg-purple-500' },
  ],
  branch_manager: [
    { id: 'new-appointment', label: 'New Appointment', icon: CalendarPlus, color: 'bg-blue-500' },
    { id: 'walk-in', label: 'Add Walk-in', icon: UserPlus, color: 'bg-green-500' },
    { id: 'quick-checkout', label: 'Quick Checkout', icon: CreditCard, color: 'bg-purple-500' },
  ],
  receptionist: [
    { id: 'new-appointment', label: 'New Appointment', icon: CalendarPlus, color: 'bg-blue-500' },
    { id: 'walk-in', label: 'Add Walk-in', icon: UserPlus, color: 'bg-green-500' },
    { id: 'quick-checkout', label: 'Quick Checkout', icon: CreditCard, color: 'bg-purple-500' },
    { id: 'check-in', label: 'Check In', icon: UserCheck, color: 'bg-amber-500' },
  ],
  stylist: [
    { id: 'new-appointment', label: 'New Appointment', icon: CalendarPlus, color: 'bg-blue-500' },
  ],
  accountant: [
    { id: 'quick-checkout', label: 'Quick Checkout', icon: CreditCard, color: 'bg-purple-500' },
  ],
};

interface FloatingActionButtonProps {
  className?: string;
  onActionSelect?: (actionId: string) => void;
}

export function FloatingActionButton({ className, onActionSelect }: FloatingActionButtonProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  // Get actions based on user role
  const actions = useMemo(() => {
    const role = (user?.role || 'receptionist') as UserRole;
    return ROLE_FAB_ACTIONS[role] || ROLE_FAB_ACTIONS.receptionist;
  }, [user?.role]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleActionClick = useCallback(
    (action: FABAction) => {
      setIsOpen(false);

      if (action.href) {
        router.push(action.href);
      } else if (onActionSelect) {
        onActionSelect(action.id);
      }
    },
    [router, onActionSelect]
  );

  // Calculate positions for radial menu
  const getActionPosition = (index: number, total: number) => {
    // Spread actions in an arc above the FAB
    const startAngle = -150; // Start from left
    const endAngle = -30; // End at right
    const angleRange = endAngle - startAngle;
    const angle = startAngle + (angleRange / (total - 1 || 1)) * index;
    const radians = (angle * Math.PI) / 180;
    const radius = 80; // Distance from center

    return {
      x: Math.cos(radians) * radius,
      y: Math.sin(radians) * radius,
    };
  };

  return (
    <div className={cn('fixed bottom-20 left-1/2 -translate-x-1/2 z-50 md:hidden', className)}>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 -z-10"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <AnimatePresence>
        {isOpen &&
          actions.map((action, index) => {
            const position = getActionPosition(index, actions.length);
            const Icon = action.icon;

            return (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: position.x,
                  y: position.y,
                }}
                exit={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleActionClick(action)}
                className={cn(
                  'absolute flex items-center justify-center',
                  'w-12 h-12 rounded-full shadow-lg',
                  'text-white',
                  action.color
                )}
                style={{
                  left: '50%',
                  top: '50%',
                  marginLeft: '-24px',
                  marginTop: '-24px',
                }}
              >
                <Icon className="h-5 w-5" />
              </motion.button>
            );
          })}
      </AnimatePresence>

      {/* Action labels */}
      <AnimatePresence>
        {isOpen &&
          actions.map((action, index) => {
            const position = getActionPosition(index, actions.length);

            return (
              <motion.span
                key={`label-${action.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: index * 0.05 + 0.1 }}
                className="absolute text-xs font-medium text-foreground bg-background px-2 py-1 rounded shadow whitespace-nowrap"
                style={{
                  left: `calc(50% + ${position.x}px)`,
                  top: `calc(50% + ${position.y - 30}px)`,
                  transform: 'translateX(-50%)',
                }}
              >
                {action.label}
              </motion.span>
            );
          })}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.button
        onClick={handleToggle}
        animate={{ rotate: isOpen ? 45 : 0 }}
        className={cn(
          'flex items-center justify-center',
          'w-14 h-14 rounded-full shadow-lg',
          'bg-primary text-primary-foreground',
          'transition-colors hover:bg-primary/90'
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </motion.button>
    </div>
  );
}
