/**
 * Shift Assignment Dialog
 *
 * Dialog for assigning staff members to a shift.
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStaffList, useAssignShift } from '@/hooks/queries/use-staff';
import type { Shift } from '@/types/staff';

const assignmentSchema = z.object({
  userId: z.string().min(1, 'Select a staff member'),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  effectiveUntil: z.string().optional(),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

interface ShiftAssignmentDialogProps {
  shift: Shift;
  branchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShiftAssignmentDialog({
  shift,
  branchId,
  open,
  onOpenChange,
}: ShiftAssignmentDialogProps) {
  const t = useTranslations('staff');
  const tCommon = useTranslations('common');

  const { data: staffData } = useStaffList({ branchId, isActive: true, limit: 100 });
  const assignShift = useAssignShift();

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      userId: '',
      effectiveFrom: format(new Date(), 'yyyy-MM-dd'),
      effectiveUntil: '',
    },
  });

  const onSubmit = async (values: AssignmentFormValues) => {
    try {
      await assignShift.mutateAsync({
        userId: values.userId,
        branchId,
        shiftId: shift.id,
        effectiveFrom: values.effectiveFrom,
        effectiveUntil: values.effectiveUntil || undefined,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to assign shift:', error);
    }
  };

  const staffList = staffData?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('shifts.assignShift')}</DialogTitle>
          <DialogDescription>
            {t('shifts.assignShiftDescription', { shiftName: shift.name })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('shifts.form.staffMember')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('shifts.form.selectStaff')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staffList.map((staff) => (
                        <SelectItem key={staff.userId} value={staff.userId}>
                          {staff.user?.name} ({staff.user?.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="effectiveFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('shifts.form.effectiveFrom')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="effectiveUntil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('shifts.form.effectiveUntil')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {tCommon('actions.cancel')}
              </Button>
              <Button type="submit" disabled={assignShift.isPending}>
                {assignShift.isPending ? tCommon('actions.saving') : t('shifts.assign')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
