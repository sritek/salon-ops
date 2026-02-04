'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useCategories } from '@/hooks/queries/use-categories';
import { useCreateService, useUpdateService } from '@/hooks/queries/use-services';

import { FormActions, FormSection } from '@/components/common';
import { CurrencyInput } from '@/components/common/currency-input';
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

import type { Service } from '@/types/services';

const serviceFormSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  sku: z.string().min(1, 'SKU is required').max(50),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  description: z.string().optional(),
  basePrice: z.coerce.number().positive('Price must be positive'),
  taxRate: z.coerce.number().min(0).max(100).default(18),
  hsnSacCode: z.string().max(20).optional(),
  isTaxInclusive: z.boolean().default(false),
  durationMinutes: z.coerce.number().int().positive('Duration must be positive'),
  activeTimeMinutes: z.coerce.number().int().positive('Active time must be positive'),
  processingTimeMinutes: z.coerce.number().int().min(0).default(0),
  genderApplicable: z.enum(['all', 'male', 'female']).default('all'),
  skillLevelRequired: z.enum(['any', 'junior', 'senior', 'expert']).default('any'),
  commissionType: z.enum(['percentage', 'fixed']).default('percentage'),
  commissionValue: z.coerce.number().min(0).default(0),
  assistantCommissionValue: z.coerce.number().min(0).default(0),
  isPopular: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isOnlineBookable: z.boolean().default(true),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

interface ServiceFormProps {
  service?: Service;
  onSuccess?: () => void;
}

export function ServiceForm({ service, onSuccess }: ServiceFormProps) {
  const router = useRouter();
  const { data: categories, isLoading: categoriesLoading } = useCategories({
    flat: true,
  });
  const createService = useCreateService();
  const updateService = useUpdateService();

  const isEditing = !!service;

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      categoryId: service?.categoryId || '',
      sku: service?.sku || '',
      name: service?.name || '',
      description: service?.description || '',
      basePrice: service?.basePrice || 0,
      taxRate: service?.taxRate || 18,
      hsnSacCode: service?.hsnSacCode || '',
      isTaxInclusive: service?.isTaxInclusive || false,
      durationMinutes: service?.durationMinutes || 30,
      activeTimeMinutes: service?.activeTimeMinutes || 30,
      processingTimeMinutes: service?.processingTimeMinutes || 0,
      genderApplicable: service?.genderApplicable || 'all',
      skillLevelRequired: service?.skillLevelRequired || 'any',
      commissionType: service?.commissionType || 'percentage',
      commissionValue: service?.commissionValue || 0,
      assistantCommissionValue: service?.assistantCommissionValue || 0,
      isPopular: service?.isPopular || false,
      isFeatured: service?.isFeatured || false,
      isActive: service?.isActive ?? true,
      isOnlineBookable: service?.isOnlineBookable ?? true,
    },
  });

  const onSubmit = async (data: ServiceFormValues) => {
    try {
      if (isEditing && service) {
        await updateService.mutateAsync({ id: service.id, data });
      } else {
        await createService.mutateAsync(data);
      }
      onSuccess?.();
      router.push('/services');
    } catch (error) {
      console.error('Failed to save service:', error);
    }
  };

  const isPending = createService.isPending || updateService.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <FormSection title="Basic Information" description="General service details">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={categoriesLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </div>
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
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., HAIR-001" {...field} />
                  </FormControl>
                  <FormDescription>
                    Unique identifier for this service
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Haircut - Men" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Brief description of the service..."
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        {/* Pricing */}
        <FormSection title="Pricing" description="Set the service price and tax">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              control={form.control}
              name="basePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Price *</FormLabel>
                  <FormControl>
                    <CurrencyInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Enter price"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taxRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Rate (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormDescription>GST rate for this service</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hsnSacCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HSN/SAC Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 9902" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="isTaxInclusive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Price includes tax</FormLabel>
                  <FormDescription>
                    If checked, the base price already includes tax
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </FormSection>

        {/* Duration */}
        <FormSection title="Duration" description="Service timing details">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="durationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Duration (min) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormDescription>
                    Total time for the service
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activeTimeMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Active Time (min) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormDescription>
                    Time stylist is actively working
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="processingTimeMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Processing Time (min)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormDescription>
                    Time for color/treatment processing
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        {/* Applicability */}
        <FormSection
          title="Applicability"
          description="Who can perform and receive this service"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="genderApplicable"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="male">Male Only</SelectItem>
                      <SelectItem value="female">Female Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Which customers this service is for
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="skillLevelRequired"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skill Level Required</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="junior">Junior</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Minimum skill level to perform
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        {/* Commission */}
        <FormSection title="Commission" description="Staff commission settings">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="commissionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commission Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="commissionValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stylist Commission</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assistantCommissionValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assistant Commission</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        {/* Settings */}
        <FormSection title="Settings" description="Visibility and booking options">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Show this service in listings and allow bookings
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isOnlineBookable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Online Bookable</FormLabel>
                    <FormDescription>
                      Allow customers to book this service online
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPopular"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Popular</FormLabel>
                    <FormDescription>
                      Mark as a popular service
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isFeatured"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Featured</FormLabel>
                    <FormDescription>
                      Highlight this service in the booking page
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        {/* Actions */}
        <FormActions>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEditing
                ? 'Saving...'
                : 'Creating...'
              : isEditing
                ? 'Save Changes'
                : 'Create Service'}
          </Button>
        </FormActions>
      </form>
    </Form>
  );
}
