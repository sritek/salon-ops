'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

import { useCreateStaff, useUpdateStaff } from '@/hooks/queries/use-staff';

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

import type { StaffProfile } from '@/types/staff';

const staffFormSchema = z.object({
  // User fields
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number is too long')
    .regex(/^[0-9+\-\s]+$/, 'Invalid phone number format'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(['branch_manager', 'receptionist', 'stylist', 'accountant']),
  gender: z.enum(['male', 'female', 'other']).optional(),

  // Staff profile fields
  dateOfBirth: z.string().optional().or(z.literal('')),
  bloodGroup: z.string().optional().or(z.literal('')),
  emergencyContactName: z.string().optional().or(z.literal('')),
  emergencyContactPhone: z.string().optional().or(z.literal('')),
  addressLine1: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  pincode: z.string().optional().or(z.literal('')),

  // Employment fields
  employeeCode: z.string().optional().or(z.literal('')),
  designation: z.string().optional().or(z.literal('')),
  department: z.string().optional().or(z.literal('')),
  dateOfJoining: z.string().min(1, 'Date of joining is required'),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'intern']),
  skillLevel: z.enum(['junior', 'senior', 'expert']).optional(),

  // Salary fields
  salaryType: z.enum(['monthly', 'daily', 'hourly']),
  baseSalary: z.coerce.number().min(0, 'Salary must be positive'),
  commissionEnabled: z.boolean().default(false),
  defaultCommissionType: z.enum(['percentage', 'flat']).optional(),
  defaultCommissionRate: z.coerce.number().min(0).optional(),

  // Bank details
  bankAccountNumber: z.string().optional().or(z.literal('')),
  bankName: z.string().optional().or(z.literal('')),
  bankIfsc: z.string().optional().or(z.literal('')),

  // ID documents
  aadharNumber: z.string().optional().or(z.literal('')),
  panNumber: z.string().optional().or(z.literal('')),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

interface StaffFormProps {
  staff?: StaffProfile;
  branchId: string;
  onSuccess?: () => void;
}

export function StaffForm({ staff, branchId, onSuccess }: StaffFormProps) {
  const router = useRouter();
  const t = useTranslations('staff.form');
  const tCommon = useTranslations('common');
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();

  const isEditing = !!staff;

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name: staff?.user?.name || '',
      phone: staff?.user?.phone || '',
      email: staff?.user?.email || '',
      password: '',
      role: (staff?.user?.role as any) || 'stylist',
      gender: (staff?.user?.gender as any) || undefined,
      dateOfBirth: staff?.dateOfBirth?.split('T')[0] || '',
      bloodGroup: staff?.bloodGroup || '',
      emergencyContactName: staff?.emergencyContactName || '',
      emergencyContactPhone: staff?.emergencyContactPhone || '',
      addressLine1: staff?.addressLine1 || '',
      city: staff?.city || '',
      state: staff?.state || '',
      pincode: staff?.pincode || '',
      employeeCode: staff?.employeeCode || '',
      designation: staff?.designation || '',
      department: staff?.department || '',
      dateOfJoining: staff?.dateOfJoining?.split('T')[0] || '',
      employmentType: staff?.employmentType || 'full_time',
      skillLevel: (staff?.skillLevel as any) || undefined,
      salaryType: (staff?.salaryType as any) || 'monthly',
      baseSalary: staff?.baseSalary || 0,
      commissionEnabled: staff?.commissionEnabled || false,
      defaultCommissionType: (staff?.defaultCommissionType as any) || undefined,
      defaultCommissionRate: staff?.defaultCommissionRate || 0,
      bankAccountNumber: staff?.bankAccountNumber || '',
      bankName: staff?.bankName || '',
      bankIfsc: staff?.bankIfsc || '',
      aadharNumber: staff?.aadharNumber || '',
      panNumber: staff?.panNumber || '',
    },
  });

  const commissionEnabled = form.watch('commissionEnabled');

  const onSubmit = async (data: StaffFormValues) => {
    try {
      if (isEditing && staff) {
        const { phone, password, ...updatePayload } = data;
        await updateStaff.mutateAsync({
          id: staff.userId,
          ...updatePayload,
          email: updatePayload.email || undefined,
          dateOfBirth: updatePayload.dateOfBirth || undefined,
          bloodGroup: updatePayload.bloodGroup || undefined,
          emergencyContactName: updatePayload.emergencyContactName || undefined,
          emergencyContactPhone: updatePayload.emergencyContactPhone || undefined,
          addressLine1: updatePayload.addressLine1 || undefined,
          city: updatePayload.city || undefined,
          state: updatePayload.state || undefined,
          pincode: updatePayload.pincode || undefined,
          employeeCode: updatePayload.employeeCode || undefined,
          designation: updatePayload.designation || undefined,
          department: updatePayload.department || undefined,
          skillLevel: updatePayload.skillLevel || undefined,
          defaultCommissionType: updatePayload.commissionEnabled
            ? updatePayload.defaultCommissionType
            : undefined,
          defaultCommissionRate: updatePayload.commissionEnabled
            ? updatePayload.defaultCommissionRate
            : undefined,
          bankAccountNumber: updatePayload.bankAccountNumber || undefined,
          bankName: updatePayload.bankName || undefined,
          bankIfsc: updatePayload.bankIfsc || undefined,
          aadharNumber: updatePayload.aadharNumber || undefined,
          panNumber: updatePayload.panNumber || undefined,
        });
      } else {
        if (!data.password) {
          form.setError('password', { message: 'Password is required for new staff' });
          return;
        }
        await createStaff.mutateAsync({
          ...data,
          password: data.password,
          email: data.email || undefined,
          gender: data.gender || undefined,
          dateOfBirth: data.dateOfBirth || undefined,
          bloodGroup: data.bloodGroup || undefined,
          emergencyContactName: data.emergencyContactName || undefined,
          emergencyContactPhone: data.emergencyContactPhone || undefined,
          addressLine1: data.addressLine1 || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          pincode: data.pincode || undefined,
          employeeCode: data.employeeCode || undefined,
          designation: data.designation || undefined,
          department: data.department || undefined,
          skillLevel: data.skillLevel || undefined,
          defaultCommissionType: data.commissionEnabled ? data.defaultCommissionType : undefined,
          defaultCommissionRate: data.commissionEnabled ? data.defaultCommissionRate : undefined,
          bankAccountNumber: data.bankAccountNumber || undefined,
          bankName: data.bankName || undefined,
          bankIfsc: data.bankIfsc || undefined,
          aadharNumber: data.aadharNumber || undefined,
          panNumber: data.panNumber || undefined,
          branchAssignments: [{ branchId, isPrimary: true }],
        });
      }
      onSuccess?.();
      router.push('/staff');
    } catch (error) {
      console.error('Failed to save staff:', error);
    }
  };

  const isPending = createStaff.isPending || updateStaff.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <FormSection title={t('basicInfo')} description={t('basicInfoDesc')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name')} *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full name" {...field} />
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
                  <FormLabel>{t('phone')} *</FormLabel>
                  <FormControl>
                    <Input placeholder="9876543210" {...field} disabled={isEditing} />
                  </FormControl>
                  {isEditing && <FormDescription>Phone cannot be changed</FormDescription>}
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
                  <FormLabel>{t('email')}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('password')} *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormDescription>Minimum 6 characters</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('role')} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="branch_manager">Branch Manager</SelectItem>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                      <SelectItem value="stylist">Stylist</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('gender')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
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
                  <FormLabel>{t('dateOfBirth')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bloodGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('bloodGroup')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="emergencyContactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('emergencyContactName')}</FormLabel>
                  <FormControl>
                    <Input placeholder="Emergency contact name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emergencyContactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('emergencyContactPhone')}</FormLabel>
                  <FormControl>
                    <Input placeholder="Emergency contact phone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="addressLine1"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('address')}</FormLabel>
                <FormControl>
                  <Input placeholder="Street address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('city')}</FormLabel>
                  <FormControl>
                    <Input placeholder="City" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('state')}</FormLabel>
                  <FormControl>
                    <Input placeholder="State" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pincode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('pincode')}</FormLabel>
                  <FormControl>
                    <Input placeholder="PIN Code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        {/* Employment Details */}
        <FormSection title={t('employmentDetails')} description={t('employmentDetailsDesc')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="employeeCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('employeeCode')}</FormLabel>
                  <FormControl>
                    <Input placeholder="EMP001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateOfJoining"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dateOfJoining')} *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('designation')}</FormLabel>
                  <FormControl>
                    <Input placeholder="Senior Stylist" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('department')}</FormLabel>
                  <FormControl>
                    <Input placeholder="Hair Care" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="employmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('employmentType')} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="skillLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('skillLevel')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select skill level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="junior">Junior</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        {/* Salary & Commission */}
        <FormSection title={t('salaryCommission')} description={t('salaryCommissionDesc')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="salaryType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('salaryType')} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select salary type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="baseSalary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('baseSalary')} *</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="25000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="commissionEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>{t('commissionEnabled')}</FormLabel>
                  <FormDescription>{t('commissionEnabledDesc')}</FormDescription>
                </div>
              </FormItem>
            )}
          />

          {commissionEnabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="defaultCommissionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('commissionType')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="flat">Flat Amount</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultCommissionRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('commissionRate')}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="10" {...field} />
                    </FormControl>
                    <FormDescription>
                      {form.watch('defaultCommissionType') === 'percentage' ? '%' : '₹'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </FormSection>

        {/* Bank Details */}
        <FormSection title={t('bankDetails')} description={t('bankDetailsDesc')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('bankName')}</FormLabel>
                  <FormControl>
                    <Input placeholder="Bank name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bankAccountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('bankAccountNumber')}</FormLabel>
                  <FormControl>
                    <Input placeholder="Account number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="bankIfsc"
            render={({ field }) => (
              <FormItem className="sm:w-1/2">
                <FormLabel>{t('bankIfsc')}</FormLabel>
                <FormControl>
                  <Input placeholder="IFSC code" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        {/* ID Documents */}
        <FormSection title={t('idDocuments')} description={t('idDocumentsDesc')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="aadharNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('aadharNumber')}</FormLabel>
                  <FormControl>
                    <Input placeholder="XXXX XXXX XXXX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="panNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('panNumber')}</FormLabel>
                  <FormControl>
                    <Input placeholder="ABCDE1234F" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
                : t('createStaff')}
          </Button>
        </FormActions>
      </form>
    </Form>
  );
}
