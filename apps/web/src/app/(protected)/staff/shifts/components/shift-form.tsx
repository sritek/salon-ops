/**
 * Shift Form Component
 *
 * Form for creating and editing shifts.
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { TimePicker } from '@/components/common';
import { useCreateShift, useUpdateShift } from '@/hooks/queries/use-staff';
import type { Shift } from '@/types/staff';

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const shiftSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  breakDurationMinutes: z.coerce.number().min(0).max(120),
  applicableDays: z.array(z.number()).min(1, 'Select at least one day'),
});

type ShiftFormValues = z.infer<typeof shiftSchema>;

interface ShiftFormProps {
  branchId: string;
  shift?: Shift;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ShiftForm({ branchId, shift, onSuccess, onCancel }: ShiftFormProps) {
  const t = useTranslations('staff');
  const tCommon = useTranslations('common');

  const createShift = useCreateShift();
  const updateShift = useUpdateShift();

  const form = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      name: shift?.name ?? '',
      startTime: shift?.startTime ?? '09:00',
      endTime: shift?.endTime ?? '18:00',
      breakDurationMinutes: shift?.breakDurationMinutes ?? 60,
      applicableDays: shift?.applicableDays ?? [1, 2, 3, 4, 5, 6], // Mon-Sat default
    },
  });

  const isSubmitting = createShift.isPending || updateShift.isPending;

  const onSubmit = async (values: ShiftFormValues) => {
    try {
      if (shift) {
        await updateShift.mutateAsync({
          id: shift.id,
          ...values,
        });
      } else {
        await createShift.mutateAsync({
          branchId,
          ...values,
        });
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save shift:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('shifts.form.name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('shifts.form.namePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('shifts.form.startTime')}</FormLabel>
                <FormControl>
                  <TimePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('shifts.form.endTime')}</FormLabel>
                <FormControl>
                  <TimePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="breakDurationMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('shifts.form.breakDuration')}</FormLabel>
              <FormControl>
                <Input type="number" min={0} max={120} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="applicableDays"
          render={() => (
            <FormItem>
              <FormLabel>{t('shifts.form.applicableDays')}</FormLabel>
              <div className="grid grid-cols-4 gap-2">
                {DAYS.map((day) => (
                  <FormField
                    key={day.value}
                    control={form.control}
                    name="applicableDays"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(day.value)}
                            onCheckedChange={(checked) => {
                              const current = field.value ?? [];
                              if (checked) {
                                field.onChange([...current, day.value]);
                              } else {
                                field.onChange(current.filter((v) => v !== day.value));
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">{day.label}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            {tCommon('actions.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? tCommon('actions.saving')
              : shift
                ? tCommon('actions.save')
                : tCommon('actions.create')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
