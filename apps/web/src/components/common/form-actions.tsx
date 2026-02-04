/**
 * FormActions - Consistent form action buttons layout
 */

import { cn } from '@/lib/utils';

interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function FormActions({ children, className }: FormActionsProps) {
  return (
    <div className={cn(
      'flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end',
      className
    )}>
      {children}
    </div>
  );
}
