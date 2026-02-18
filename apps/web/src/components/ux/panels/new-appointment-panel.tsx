'use client';

/**
 * New Appointment Panel
 * Based on: .kiro/specs/ux-consolidation-slideover/design.md
 * Requirements: 5.2, 5.3, 5.7
 *
 * SlideOver panel for creating new appointments.
 * Supports pre-populated values from calendar slot clicks.
 */

import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar, Clock, User, Scissors, FileText, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/common';
import { Skeleton } from '@/components/ui/skeleton';
import { useSlideOver } from '@/components/ux/slide-over';
import {
  ShakeInput,
  InlineError,
  FormFeedbackOverlay,
  useFormFeedback,
} from '@/components/ux/feedback';
import { useCreateAppointment } from '@/hooks/queries/use-appointments';
import { useServices } from '@/hooks/queries/use-services';
import { useStaffList } from '@/hooks/queries/use-staff';
import { useCustomers } from '@/hooks/queries/use-customers';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

// Form validation schema
const appointmentSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().optional(),
  serviceIds: z.array(z.string()).min(1, 'At least one service is required'),
  stylistId: z.string().min(1, 'Stylist is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  notes: z.string().optional(),
  bookingType: z.enum(['online', 'phone', 'walk_in']).default('phone'),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface NewAppointmentPanelProps {
  panelId: string;
  // Pre-populated values from calendar slot click
  stylistId?: string;
  date?: string;
  time?: string;
  // Pre-populated from customer peek
  customerId?: string;
  onSuccess?: (appointmentId: string) => void;
}

export function NewAppointmentPanel({
  panelId,
  stylistId: initialStylistId,
  date: initialDate,
  time: initialTime,
  customerId: initialCustomerId,
  onSuccess,
}: NewAppointmentPanelProps) {
  const { closePanel, setUnsavedChanges } = useSlideOver();
  const { user } = useAuthStore();
  const branchId = user?.branchIds?.[0] || '';

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [shakeFields, setShakeFields] = useState<Record<string, boolean>>({});
  const {
    status: feedbackStatus,
    showSuccess,
    showError,
    reset: resetFeedback,
  } = useFormFeedback();

  // Fetch data
  const { data: servicesData, isLoading: servicesLoading } = useServices({});
  const { data: staffData, isLoading: staffLoading } = useStaffList({ branchId, role: 'stylist' });
  const { data: customersData } = useCustomers({
    search: customerSearch,
    limit: 10,
  });

  const createMutation = useCreateAppointment();

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      stylistId: initialStylistId || '',
      date: initialDate || format(new Date(), 'yyyy-MM-dd'),
      time: initialTime || '',
      customerId: initialCustomerId || '',
      customerName: '',
      customerPhone: '',
      serviceIds: [],
      notes: '',
      bookingType: 'phone',
    },
  });

  const watchedDate = watch('date');
  const watchedStylistId = watch('stylistId');

  // Track unsaved changes
  useEffect(() => {
    setUnsavedChanges(isDirty);
  }, [isDirty, setUnsavedChanges]);

  // Handle customer selection
  const handleCustomerSelect = useCallback(
    (customer: { id: string; name: string; phone: string }) => {
      setValue('customerId', customer.id);
      setValue('customerName', customer.name);
      setValue('customerPhone', customer.phone);
      setCustomerSearch('');
    },
    [setValue]
  );

  // Handle service toggle
  const handleServiceToggle = useCallback(
    (serviceId: string) => {
      setSelectedServices((prev) => {
        const newServices = prev.includes(serviceId)
          ? prev.filter((id) => id !== serviceId)
          : [...prev, serviceId];
        setValue('serviceIds', newServices);
        return newServices;
      });
    },
    [setValue]
  );

  // Handle form submission
  const onSubmit = useCallback(
    async (data: AppointmentFormData) => {
      try {
        const result = await createMutation.mutateAsync({
          branchId,
          customerId: data.customerId || undefined,
          customerName: data.customerName,
          customerPhone: data.customerPhone || undefined,
          services: data.serviceIds.map((serviceId) => ({
            serviceId,
            stylistId: data.stylistId,
          })),
          stylistId: data.stylistId,
          scheduledDate: data.date,
          scheduledTime: data.time,
          customerNotes: data.notes || undefined,
          bookingType: data.bookingType,
        });

        showSuccess('Appointment created successfully!');
        setTimeout(() => {
          if (onSuccess && result.appointment?.id) {
            onSuccess(result.appointment.id);
          }
          closePanel(panelId);
        }, 1500);
      } catch (error) {
        showError('Failed to create appointment');
        console.error('Failed to create appointment:', error);
      }
    },
    [branchId, createMutation, closePanel, panelId, onSuccess, showSuccess, showError]
  );

  // Handle form errors with shake animation
  const onError = useCallback(() => {
    const errorFields: Record<string, boolean> = {};
    Object.keys(errors).forEach((key) => {
      errorFields[key] = true;
    });
    setShakeFields(errorFields);
    setTimeout(() => setShakeFields({}), 500);
  }, [errors]);

  // Generate time slots
  const timeSlots = [];
  for (let hour = 9; hour <= 20; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  const services = servicesData?.data || [];
  const stylists = staffData?.data || [];
  const customers = customersData?.data || [];

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="flex flex-col h-full relative">
      {/* Form Feedback Overlay */}
      <FormFeedbackOverlay
        status={feedbackStatus}
        successMessage="Appointment created successfully!"
        errorMessage="Failed to create appointment"
        onDismiss={resetFeedback}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Customer Section */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer
          </Label>

          {/* Customer Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search existing customer..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="pl-9"
            />

            {/* Customer Search Results */}
            {customerSearch && customers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleCustomerSelect(customer)}
                    className="w-full px-3 py-2 text-left hover:bg-muted flex justify-between items-center"
                  >
                    <span>{customer.name}</span>
                    <span className="text-sm text-muted-foreground">{customer.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Customer Name (for new customers) */}
          <ShakeInput shake={!!shakeFields.customerName}>
            <Input
              placeholder="Customer name"
              {...register('customerName')}
              className={cn(errors.customerName && 'border-red-500')}
            />
          </ShakeInput>
          <InlineError message={errors.customerName?.message} />

          {/* Customer Phone */}
          <Input placeholder="Phone number (optional)" {...register('customerPhone')} />
        </div>

        {/* Services Section */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            Services
          </Label>

          {servicesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => handleServiceToggle(service.id)}
                  className={cn(
                    'flex justify-between items-center p-3 rounded-md border text-left transition-colors',
                    selectedServices.includes(service.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted'
                  )}
                >
                  <span>{service.name}</span>
                  <span className="text-sm font-medium">
                    ₹{service.basePrice?.toLocaleString('en-IN') || 0}
                  </span>
                </button>
              ))}
            </div>
          )}
          <InlineError message={errors.serviceIds?.message} />
        </div>

        {/* Date & Time Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date
            </Label>
            <DatePicker
              value={watchedDate ? new Date(watchedDate) : undefined}
              onChange={(date) => setValue('date', date ? format(date, 'yyyy-MM-dd') : '')}
              placeholder="Select date"
            />
            <InlineError message={errors.date?.message} />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time
            </Label>
            <ShakeInput shake={!!shakeFields.time}>
              <Select value={watch('time')} onValueChange={(value) => setValue('time', value)}>
                <SelectTrigger className={cn(errors.time && 'border-red-500')}>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ShakeInput>
            <InlineError message={errors.time?.message} />
          </div>
        </div>

        {/* Stylist Section */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Stylist
          </Label>
          {staffLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <ShakeInput shake={!!shakeFields.stylistId}>
              <Select
                value={watchedStylistId}
                onValueChange={(value) => setValue('stylistId', value)}
              >
                <SelectTrigger className={cn(errors.stylistId && 'border-red-500')}>
                  <SelectValue placeholder="Select stylist" />
                </SelectTrigger>
                <SelectContent>
                  {stylists.map((stylist) => (
                    <SelectItem key={stylist.id} value={stylist.id}>
                      {stylist.user?.name || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ShakeInput>
          )}
          <InlineError message={errors.stylistId?.message} />
        </div>

        {/* Booking Type */}
        <div className="space-y-2">
          <Label>Booking Type</Label>
          <Select
            value={watch('bookingType')}
            onValueChange={(value: 'online' | 'phone' | 'walk_in') =>
              setValue('bookingType', value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="walk_in">Walk-in</SelectItem>
              <SelectItem value="online">Online</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notes Section */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notes (optional)
          </Label>
          <Textarea
            placeholder="Add any special instructions or notes..."
            {...register('notes')}
            rows={3}
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t p-4 flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => closePanel(panelId)}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Creating...' : 'Create Appointment'}
        </Button>
      </div>
    </form>
  );
}
