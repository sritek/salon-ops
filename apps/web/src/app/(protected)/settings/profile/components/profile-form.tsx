'use client';

/**
 * Profile Form Component
 * Editable form for tenant business information
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useUpdateTenant, type Tenant } from '@/hooks/queries/use-tenant';

const profileFormSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters').max(255),
  legalName: z.string().max(255).optional().nullable(),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number (10 digits starting with 6-9)')
    .optional()
    .nullable()
    .or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileFormProps {
  tenant: Tenant;
}

export function ProfileForm({ tenant }: ProfileFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const updateTenant = useUpdateTenant();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: tenant.name,
      legalName: tenant.legalName || '',
      email: tenant.email,
      phone: tenant.phone || '',
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await updateTenant.mutateAsync({
        name: data.name,
        legalName: data.legalName || null,
        email: data.email,
        phone: data.phone || null,
      });
      toast.success('Business profile updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    form.reset({
      name: tenant.name,
      legalName: tenant.legalName || '',
      email: tenant.email,
      phone: tenant.phone || '',
    });
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Business Name</label>
            <p className="mt-1">{tenant.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Legal Name</label>
            <p className="mt-1">{tenant.legalName || '-'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="mt-1">{tenant.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Phone</label>
            <p className="mt-1">{tenant.phone || '-'}</p>
          </div>
        </div>
        <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter business name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="legalName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Legal Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter legal name" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Enter email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="Enter phone number" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={updateTenant.isPending}>
            {updateTenant.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
