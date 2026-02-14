/**
 * Edit Deduction Dialog
 *
 * Dialog for editing an existing deduction's monthly amount.
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

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
  FormDescription,
} from '@/components/ui/form';
import { useUpdateDeduction } from '@/hooks/queries/use-staff';
import { formatCurrency } from '@/lib/format';
import type { StaffDeduction } from '@/types/staff';

const editDeductionSchema = z.object({
  monthlyDeduction: z.coerce.number().min(1, 'Monthly deduction must be at least 1'),
});

type EditDeductionFormValues = z.infer<typeof editDeductionSchema>;

interface EditDeductionDialogProps {
  deduction: StaffDeduction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditDeductionDialog({ deduction, open, onOpenChange }: EditDeductionDialogProps) {
  const t = useTranslations('staff.deductions');
  const tCommon = useTranslations('common');

  const updateDeduction = useUpdateDeduction();

  const form = useForm<EditDeductionFormValues>({
    resolver: zodResolver(editDeductionSchema),
    defaultValues: {
      monthlyDeduction: deduction.monthlyDeduction,
    },
  });

  const onSubmit = async (values: EditDeductionFormValues) => {
    try {
      await updateDeduction.mutateAsync({
        id: deduction.id,
        monthlyDeduction: values.monthlyDeduction,
      });
      toast.success(t('updateSuccess'));
      onOpenChange(false);
    } catch (error) {
      toast.error(t('updateError'));
    }
  };

  // Calculate estimated remaining months
  const monthlyDeduction = form.watch('monthlyDeduction');
  const estimatedMonths =
    monthlyDeduction > 0 ? Math.ceil(deduction.remainingAmount / monthlyDeduction) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('form.editTitle')}</DialogTitle>
          <DialogDescription>{t('form.editDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t('form.type')}</p>
              <p className="font-medium capitalize">{t(`types.${deduction.deductionType}`)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('table.totalAmount')}</p>
              <p className="font-medium">{formatCurrency(deduction.totalAmount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('form.remaining')}</p>
              <p className="font-medium text-red-600">
                {formatCurrency(deduction.remainingAmount)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('form.paid')}</p>
              <p className="font-medium text-green-600">
                {formatCurrency(deduction.totalAmount - deduction.remainingAmount)}
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="monthlyDeduction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.monthlyDeduction')}</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} step={100} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('form.currentMonthly', {
                      amount: formatCurrency(deduction.monthlyDeduction),
                    })}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {estimatedMonths > 0 && (
              <p className="text-sm text-muted-foreground">
                {t('form.estimatedRemaining', { months: estimatedMonths })}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {tCommon('actions.cancel')}
              </Button>
              <Button type="submit" disabled={updateDeduction.isPending}>
                {updateDeduction.isPending ? tCommon('actions.saving') : tCommon('actions.save')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
