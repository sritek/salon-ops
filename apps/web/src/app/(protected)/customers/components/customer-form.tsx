'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

import { useCreateCustomer, useUpdateCustomer } from '@/hooks/queries/use-customers';

import { FormActions, FormSection } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import type { Customer } from '@/types/customers';

const customerFormSchema = z.object({
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number is too long')
    .regex(/^[0-9+\-\s]+$/, 'Invalid phone number format'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dateOfBirth: z.string().optional().or(z.literal('')),
  anniversaryDate: z.string().optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  allergies: z.string().optional(),
  marketingConsent: z.boolean().default(true),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  customer?: Customer;
  onSuccess?: () => void;
}

export function CustomerForm({ customer, onSuccess }: CustomerFormProps) {
  const router = useRouter();
  const t = useTranslations('customers.form');
  const tCommon = useTranslations('common');
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const isEditing = !!customer;

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      phone: customer?.phone || '',
      name: customer?.name || '',
      email: customer?.email || '',
      gender: customer?.gender || undefined,
      dateOfBirth: customer?.dateOfBirth?.split('T')[0] || '',
      anniversaryDate: customer?.anniversaryDate?.split('T')[0] || '',
      address: customer?.address || '',
      allergies: customer?.allergies?.join(', ') || '',
      marketingConsent: customer?.marketingConsent ?? true,
    },
  });

  const onSubmit = async (data: CustomerFormValues) => {
    try {
      const payload = {
        ...data,
        email: data.email || null,
        gender: data.gender || null,
        dateOfBirth: data.dateOfBirth || null,
        anniversaryDate: data.anniversaryDate || null,
        address: data.address || null,
        allergies: data.allergies
          ? data.allergies
              .split(',')
              .map((a) => a.trim())
              .filter(Boolean)
          : [],
      };

      if (isEditing && customer) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { phone, ...updatePayload } = payload;
        await updateCustomer.mutateAsync({ id: customer.id, data: updatePayload });
      } else {
        await createCustomer.mutateAsync(payload);
      }
      onSuccess?.();
      router.push('/customers');
    } catch (error) {
      console.error('Failed to save customer:', error);
    }
  };

  const isPending = createCustomer.isPending || updateCustomer.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <FormSection title={t('basicInfo')} description={t('basicInfoDesc')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('phone.label')} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t('phone.placeholder')} {...field} disabled={isEditing} />
                  </FormControl>
                  <FormDescription>
                    {isEditing ? t('phone.cannotChange') : t('phone.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name.label')} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t('name.placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('email.label')}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={t('email.placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('gender.label')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('gender.placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">{t('gender.male')}</SelectItem>
                      <SelectItem value="female">{t('gender.female')}</SelectItem>
                      <SelectItem value="other">{t('gender.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        {/* Personal Details */}
        <FormSection title={t('personalDetails')} description={t('personalDetailsDesc')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dateOfBirth.label')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>{t('dateOfBirth.description')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="anniversaryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('anniversary.label')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>{t('anniversary.description')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('address.label')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('address.placeholder')}
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        {/* Health & Safety */}
        <FormSection title={t('healthSafety')} description={t('healthSafetyDesc')}>
          <FormField
            control={form.control}
            name="allergies"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('allergies.label')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('allergies.placeholder')}
                    className="resize-none"
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormDescription>{t('allergies.description')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        {/* Preferences */}
        <FormSection title={t('communication')} description={t('communicationDesc')}>
          <FormField
            control={form.control}
            name="marketingConsent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>{t('marketingConsent.label')}</FormLabel>
                  <FormDescription>{t('marketingConsent.description')}</FormDescription>
                </div>
              </FormItem>
            )}
          />
        </FormSection>

        {/* Actions */}
        <FormActions>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            {tCommon('actions.cancel')}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEditing
                ? tCommon('status.saving')
                : tCommon('status.creating')
              : isEditing
                ? t('saveChanges')
                : t('createCustomer')}
          </Button>
        </FormActions>
      </form>
    </Form>
  );
}
