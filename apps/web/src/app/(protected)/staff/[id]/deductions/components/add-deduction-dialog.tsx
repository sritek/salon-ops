/**
 * Add Deduction Dialog
 *
 * Dialog for adding a new deduction to a staff member.
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAddDeduction } from '@/hooks/queries/use-staff';
import type { DeductionType } from '@/types/staff';

const DEDUCTION_TYPES: DeductionType[] = ['loan', 'advance', 'emi', 'penalty', 'other'];

const addDeductionSchema = z.object({
  deductionType: z.enum(['loan', 'advance', 'emi', 'penalty', 'other']),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  totalAmount: z.coerce.number().min(1, 'Total amount must be at least 1'),
  monthlyDeduction: z.coerce.number().min(1, 'Monthly deduction must be at least 1'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  endDate: z.string().optional(),
});

type AddDeductionFormValues = z.infer<typeof addDeductionSchema>;

interface AddDeductionDialogProps {
  staffId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDeductionDialog({ staffId, open, onOpenChange }: AddDeductionDialogProps) {
  const t = useTranslations('staff.deductions');
  const tCommon = useTranslations('common');

  const addDeduction = useAddDeduction();

  const form = useForm<AddDeductionFormValues>({
    resolver: zodResolver(addDeductionSchema),
    defaultValues: {
      deductionType: 'loan',
      description: '',
      totalAmount: 0,
      monthlyDeduction: 0,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: '',
    },
  });

  const onSubmit = async (values: AddDeductionFormValues) => {
    try {
      await addDeduction.mutateAsync({
        userId: staffId,
        deductionType: values.deductionType,
        description: values.description,
        totalAmount: values.totalAmount,
        monthlyDeduction: values.monthlyDeduction,
        startDate: values.startDate,
        endDate: values.endDate || undefined,
      });
      toast.success(t('addSuccess'));
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(t('addError'));
    }
  };

  // Calculate estimated end date based on total and monthly
  const totalAmount = form.watch('totalAmount');
  const monthlyDeduction = form.watch('monthlyDeduction');
  const estimatedMonths = monthlyDeduction > 0 ? Math.ceil(totalAmount / monthlyDeduction) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('form.addTitle')}</DialogTitle>
          <DialogDescription>{t('form.addDescription')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="deductionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.type')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('form.selectType')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DEDUCTION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`types.${type}`)}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('form.descriptionPlaceholder')}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.totalAmount')}</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthlyDeduction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.monthlyDeduction')}</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {estimatedMonths > 0 && (
              <p className="text-sm text-muted-foreground">
                {t('form.estimatedDuration', { months: estimatedMonths })}
              </p>
            )}

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.startDate')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.endDate')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>{t('form.endDateHint')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {tCommon('actions.cancel')}
              </Button>
              <Button type="submit" disabled={addDeduction.isPending}>
                {addDeduction.isPending ? tCommon('actions.saving') : t('form.add')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
