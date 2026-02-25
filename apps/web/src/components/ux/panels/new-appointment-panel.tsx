'use client';

/**
 * New Appointment Panel - Redesigned
 * Based on: .kiro/specs/ux-consolidation-slideover/design.md
 *
 * Features:
 * - Customer combobox with search + create new option
 * - Selected customer card with details
 * - Service multi-select combobox with categories
 * - Stylist avatar cards
 * - Booking type toggle buttons
 * - Time slot grid
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  User,
  Scissors,
  FileText,
  Phone,
  Globe,
  Footprints,
  X,
  Plus,
  Check,
  ChevronsUpDown,
  UserPlus,
  Star,
  UserX,
  ClipboardList,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { DatePicker } from '@/components/common';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSlideOver } from '@/components/ux/slide-over';
import { FormFeedbackOverlay, useFormFeedback } from '@/components/ux/feedback';
import { useCreateAppointment } from '@/hooks/queries/use-appointments';
import { useServices } from '@/hooks/queries/use-services';
import { useStaffList } from '@/hooks/queries/use-staff';
import { useCustomers } from '@/hooks/queries/use-customers';
import {
  useWaitlistCount,
  useWaitlistMatches,
  useUpdateWaitlistEntry,
} from '@/hooks/queries/use-waitlist';
import { useBranchContext } from '@/hooks/use-branch-context';
import { cn } from '@/lib/utils';

// Form validation schema
const appointmentSchema = z
  .object({
    customerId: z.string().optional(),
    customerName: z.string().min(1, 'Customer name is required'),
    customerPhone: z.string().optional(),
    serviceIds: z.array(z.string()).min(1, 'At least one service is required'),
    stylistId: z.string().optional(),
    assignLater: z.boolean().default(false),
    date: z.string().min(1, 'Date is required'),
    time: z.string().min(1, 'Time is required'),
    notes: z.string().optional(),
    bookingType: z.enum(['online', 'phone', 'walk_in']).default('phone'),
  })
  .refine(
    (data) => {
      // Walk-ins cannot be unassigned
      if (data.bookingType === 'walk_in' && data.assignLater) {
        return false;
      }
      return true;
    },
    { message: 'Walk-in appointments cannot be unassigned', path: ['assignLater'] }
  )
  .refine(
    (data) => {
      // Stylist is required unless assignLater is true
      if (!data.assignLater && !data.stylistId) {
        return false;
      }
      return true;
    },
    { message: 'Stylist is required', path: ['stylistId'] }
  );

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface Customer {
  id: string;
  name: string;
  phone: string;
  visitCount?: number;
  loyaltyPoints?: number;
  tags?: string[];
}

interface NewAppointmentPanelProps {
  panelId: string;
  stylistId?: string;
  date?: string;
  time?: string;
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
  const { branchId } = useBranchContext();

  // UI State
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [selectedWaitlistEntryId, setSelectedWaitlistEntryId] = useState<string | null>(null);

  const {
    status: feedbackStatus,
    showSuccess,
    showError,
    reset: resetFeedback,
  } = useFormFeedback();

  // Fetch data
  const { data: servicesData, isLoading: servicesLoading } = useServices({});
  const { data: staffData, isLoading: staffLoading } = useStaffList({
    branchId: branchId || '',
    role: 'stylist',
  });
  const { data: customersData } = useCustomers({
    search: customerSearch,
    limit: 10,
  });

  // Waitlist queries
  const { data: waitlistCountData } = useWaitlistCount(branchId || '');
  const waitlistCount = waitlistCountData?.count || 0;

  const createMutation = useCreateAppointment();
  const updateWaitlistEntry = useUpdateWaitlistEntry();

  // Stable default values
  const stableDefaultValues = useMemo(
    () => ({
      stylistId: initialStylistId || '',
      assignLater: false,
      date: initialDate || format(new Date(), 'yyyy-MM-dd'),
      time: initialTime || '',
      customerId: initialCustomerId || '',
      customerName: '',
      customerPhone: '',
      serviceIds: [] as string[],
      notes: '',
      bookingType: 'phone' as const,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: stableDefaultValues,
  });

  const watchedDate = watch('date');
  const watchedTime = watch('time');
  const watchedStylistId = watch('stylistId');
  const watchedBookingType = watch('bookingType');
  const watchedAssignLater = watch('assignLater');

  // Track unsaved changes
  useEffect(() => {
    if (isDirty) {
      setUnsavedChanges(true);
    }
    return () => setUnsavedChanges(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  // Handle customer selection
  const handleCustomerSelect = useCallback(
    (customer: Customer) => {
      setSelectedCustomer(customer);
      setIsNewCustomer(false);
      setValue('customerId', customer.id);
      setValue('customerName', customer.name);
      setValue('customerPhone', customer.phone);
      setCustomerOpen(false);
    },
    [setValue]
  );

  // Handle new customer mode
  const handleNewCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setIsNewCustomer(true);
    setValue('customerId', '');
    setValue('customerName', '');
    setValue('customerPhone', '');
    setCustomerOpen(false);
  }, [setValue]);

  // Clear customer selection
  const handleClearCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setValue('customerId', '');
    setValue('customerName', '');
    setValue('customerPhone', '');
  }, [setValue]);

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

  // Remove service
  const handleRemoveService = useCallback(
    (serviceId: string) => {
      setSelectedServices((prev) => {
        const newServices = prev.filter((id) => id !== serviceId);
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
          branchId: branchId || '',
          customerId: data.customerId || undefined,
          customerName: data.customerName,
          customerPhone: data.customerPhone || undefined,
          services: data.serviceIds.map((serviceId) => ({
            serviceId,
            stylistId: data.assignLater ? undefined : data.stylistId,
          })),
          stylistId: data.assignLater ? undefined : data.stylistId,
          scheduledDate: data.date,
          scheduledTime: data.time,
          customerNotes: data.notes || undefined,
          bookingType: data.bookingType,
          assignLater: data.assignLater,
          waitlistEntryId: selectedWaitlistEntryId || undefined,
        });

        showSuccess('Appointment created successfully!');
        setTimeout(() => {
          if (onSuccess && result.appointment?.id) {
            onSuccess(result.appointment.id);
          }
          closePanel(panelId);
        }, 1500);
      } catch {
        showError('Failed to create appointment');
      }
    },
    [
      branchId,
      createMutation,
      closePanel,
      panelId,
      onSuccess,
      showSuccess,
      showError,
      selectedWaitlistEntryId,
    ]
  );

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 9; hour <= 20; hour++) {
      for (let min = 0; min < 60; min += 30) {
        slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  // Group services by category
  const servicesByCategory = useMemo(() => {
    const services = servicesData?.data || [];
    const grouped: Record<string, typeof services> = {};
    services.forEach((service) => {
      const category = service.category?.name || 'Other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(service);
    });
    return grouped;
  }, [servicesData]);

  const services = servicesData?.data || [];
  const stylists = staffData?.data || [];
  const customers = customersData?.data || [];

  // Calculate total price
  const totalPrice = useMemo(() => {
    return selectedServices.reduce((sum, id) => {
      const service = services.find((s) => s.id === id);
      return sum + (service?.basePrice || 0);
    }, 0);
  }, [selectedServices, services]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full relative">
      <FormFeedbackOverlay
        status={feedbackStatus}
        successMessage="Appointment created successfully!"
        errorMessage="Failed to create appointment"
        onDismiss={resetFeedback}
      />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Waitlist Indicator Banner */}
          {waitlistCount > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {waitlistCount} customer{waitlistCount !== 1 ? 's' : ''} waiting
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Fill this slot from the waitlist
                  </p>
                </div>
              </div>
              <Popover open={waitlistOpen} onOpenChange={setWaitlistOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-white dark:bg-background">
                    Fill from Waitlist
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <WaitlistPopover
                    branchId={branchId || ''}
                    date={watchedDate}
                    time={watchedTime}
                    onSelect={(entry) => {
                      // Track the waitlist entry ID for conversion
                      setSelectedWaitlistEntryId(entry.id);
                      // Pre-fill form with waitlist entry data
                      if (entry.customerId) {
                        setSelectedCustomer({
                          id: entry.customerId,
                          name: entry.customerName,
                          phone: entry.customerPhone || '',
                        });
                        setValue('customerId', entry.customerId);
                      } else {
                        setIsNewCustomer(true);
                      }
                      setValue('customerName', entry.customerName);
                      setValue('customerPhone', entry.customerPhone || '');
                      setSelectedServices(entry.serviceIds);
                      setValue('serviceIds', entry.serviceIds);
                      if (entry.preferredStylistId) {
                        setValue('stylistId', entry.preferredStylistId);
                      }
                      setWaitlistOpen(false);
                    }}
                    onClose={() => setWaitlistOpen(false)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Customer Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Customer
            </Label>

            {/* Selected Customer Card */}
            {selectedCustomer && (
              <div className="relative p-4 rounded-lg border bg-muted/30">
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{selectedCustomer.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {selectedCustomer.visitCount !== undefined && (
                        <span>{selectedCustomer.visitCount} visits</span>
                      )}
                      {selectedCustomer.loyaltyPoints !== undefined &&
                        selectedCustomer.loyaltyPoints > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-500" />
                            {selectedCustomer.loyaltyPoints} pts
                          </span>
                        )}
                    </div>
                    {selectedCustomer.tags && selectedCustomer.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedCustomer.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* New Customer Form */}
            {isNewCustomer && (
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">New Customer</span>
                  <button
                    type="button"
                    onClick={handleClearCustomer}
                    className="p-1 rounded-full hover:bg-muted"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <Input
                  placeholder="Customer name *"
                  {...register('customerName')}
                  className={cn(errors.customerName && 'border-destructive')}
                />
                <Input placeholder="Phone number" {...register('customerPhone')} />
                {errors.customerName && (
                  <p className="text-xs text-destructive">{errors.customerName.message}</p>
                )}
              </div>
            )}

            {/* Customer Combobox */}
            {!selectedCustomer && !isNewCustomer && (
              <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerOpen}
                    className={cn(
                      'w-full justify-between font-normal',
                      errors.customerName && 'border-destructive'
                    )}
                  >
                    <span className="text-muted-foreground">Search or add customer...</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput
                      placeholder="Search by name or phone..."
                      value={customerSearch}
                      onValueChange={setCustomerSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No customers found.</CommandEmpty>
                      {customers.length > 0 && (
                        <CommandGroup heading="Customers">
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.name}
                              onSelect={() => handleCustomerSelect(customer)}
                              className="flex items-center gap-3 py-3"
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {customer.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{customer.name}</p>
                                <p className="text-xs text-muted-foreground">{customer.phone}</p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      <CommandSeparator />
                      <CommandGroup>
                        <CommandItem onSelect={handleNewCustomer} className="py-3">
                          <UserPlus className="mr-2 h-4 w-4" />
                          <span>Create new customer</span>
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            {errors.customerName && !isNewCustomer && !selectedCustomer && (
              <p className="text-xs text-destructive">{errors.customerName.message}</p>
            )}
          </div>

          {/* Services Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Scissors className="h-4 w-4 text-muted-foreground" />
              Services
            </Label>

            {/* Selected Services */}
            {selectedServices.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedServices.map((id) => {
                  const service = services.find((s) => s.id === id);
                  if (!service) return null;
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="pl-3 pr-1 py-1.5 flex items-center gap-2"
                    >
                      <span>{service.name}</span>
                      <span className="text-muted-foreground">
                        ₹{service.basePrice?.toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveService(id)}
                        className="ml-1 p-0.5 rounded-full hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Service Combobox */}
            {servicesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      'w-full justify-between font-normal',
                      errors.serviceIds && 'border-destructive'
                    )}
                  >
                    <span className="text-muted-foreground">
                      {selectedServices.length > 0
                        ? `${selectedServices.length} service(s) selected`
                        : 'Select services...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Search services..." />
                    <CommandList>
                      <CommandEmpty>No services found.</CommandEmpty>
                      {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                        <CommandGroup key={category} heading={category}>
                          {categoryServices.map((service) => (
                            <CommandItem
                              key={service.id}
                              value={service.name}
                              onSelect={() => handleServiceToggle(service.id)}
                              className="flex items-center justify-between py-2"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    'h-4 w-4 rounded border flex items-center justify-center',
                                    selectedServices.includes(service.id)
                                      ? 'bg-primary border-primary'
                                      : 'border-muted-foreground/30'
                                  )}
                                >
                                  {selectedServices.includes(service.id) && (
                                    <Check className="h-3 w-3 text-primary-foreground" />
                                  )}
                                </div>
                                <span>{service.name}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                ₹{service.basePrice?.toLocaleString('en-IN')}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            {errors.serviceIds && (
              <p className="text-xs text-destructive">{errors.serviceIds.message}</p>
            )}

            {/* Total Price */}
            {totalPrice > 0 && (
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-muted-foreground">Estimated Total</span>
                <span className="font-semibold">₹{totalPrice.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {/* Stylist Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Stylist
              </Label>
              {/* Assign Later Toggle - disabled for walk-in */}
              {watchedBookingType !== 'walk_in' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-muted-foreground">Assign Later</span>
                  <Switch
                    checked={watchedAssignLater}
                    onCheckedChange={(checked) => {
                      setValue('assignLater', checked);
                      if (checked) {
                        setValue('stylistId', '');
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {/* Assign Later Info */}
            {watchedAssignLater && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-dashed">
                <UserX className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">No stylist assigned</p>
                  <p className="text-xs text-muted-foreground">
                    Stylist can be assigned later from the unassigned appointments panel
                  </p>
                </div>
              </div>
            )}

            {/* Stylist Selection - hidden when assignLater is true */}
            {!watchedAssignLater && (
              <>
                {staffLoading ? (
                  <div className="flex gap-3">
                    <Skeleton className="h-16 w-16 rounded-lg" />
                    <Skeleton className="h-16 w-16 rounded-lg" />
                    <Skeleton className="h-16 w-16 rounded-lg" />
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {stylists.map((stylist) => (
                      <button
                        key={stylist.id}
                        type="button"
                        onClick={() => setValue('stylistId', stylist.id)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all min-w-[80px]',
                          watchedStylistId === stylist.id
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'hover:bg-muted/50'
                        )}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback
                            className={cn(
                              'text-sm font-medium',
                              watchedStylistId === stylist.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            )}
                          >
                            {(stylist.user?.name || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-center truncate max-w-[70px]">
                          {stylist.user?.name || 'Unknown'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {errors.stylistId && (
                  <p className="text-xs text-destructive">{errors.stylistId.message}</p>
                )}
              </>
            )}
            {errors.assignLater && (
              <p className="text-xs text-destructive">{errors.assignLater.message}</p>
            )}
          </div>

          {/* Date & Time Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Date & Time
            </Label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <DatePicker
                  value={watchedDate ? new Date(watchedDate) : undefined}
                  onChange={(date) => setValue('date', date ? format(date, 'yyyy-MM-dd') : '')}
                  placeholder="Select date"
                />
                {errors.date && (
                  <p className="text-xs text-destructive mt-1">{errors.date.message}</p>
                )}
              </div>
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start font-normal',
                        !watchedTime && 'text-muted-foreground',
                        errors.time && 'border-destructive'
                      )}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      {watchedTime || 'Select time'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <div className="grid grid-cols-4 gap-1.5">
                      {timeSlots.map((time) => (
                        <Button
                          key={time}
                          type="button"
                          variant={watchedTime === time ? 'default' : 'ghost'}
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setValue('time', time)}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {errors.time && (
                  <p className="text-xs text-destructive mt-1">{errors.time.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Booking Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Booking Type</Label>
            <ToggleGroup
              type="single"
              value={watchedBookingType}
              onValueChange={(value) => {
                if (value) setValue('bookingType', value as 'phone' | 'walk_in' | 'online');
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="phone" aria-label="Phone booking" className="gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </ToggleGroupItem>
              <ToggleGroupItem value="walk_in" aria-label="Walk-in" className="gap-2">
                <Footprints className="h-4 w-4" />
                Walk-in
              </ToggleGroupItem>
              <ToggleGroupItem value="online" aria-label="Online booking" className="gap-2">
                <Globe className="h-4 w-4" />
                Online
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Notes
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              placeholder="Add any special instructions..."
              {...register('notes')}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4 flex gap-3 bg-background">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => closePanel(panelId)}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            'Creating...'
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Create Appointment
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ============================================
// Waitlist Popover Component
// ============================================

interface WaitlistEntry {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  serviceIds: string[];
  preferredStylistId?: string;
  preferredStartDate: string;
  preferredEndDate: string;
  timePreferences: string[];
  matchScore?: number;
  matchReasons?: string[];
}

interface WaitlistPopoverProps {
  branchId: string;
  date: string;
  time: string;
  onSelect: (entry: WaitlistEntry) => void;
  onClose: () => void;
}

function WaitlistPopover({ branchId, date, time, onSelect, onClose }: WaitlistPopoverProps) {
  // Calculate duration (default 60 minutes for now)
  const durationMinutes = 60;

  const { data: matches, isLoading } = useWaitlistMatches(
    { branchId, date, time, durationMinutes },
    !!date && !!time
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="p-4 text-center">
        <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">No matching entries</p>
        <p className="text-xs text-muted-foreground mt-1">
          {date && time
            ? 'No waitlist entries match this time slot'
            : 'Select a date and time to see matches'}
        </p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto">
      <div className="p-2 border-b">
        <p className="text-xs text-muted-foreground">
          {matches.length} matching entr{matches.length !== 1 ? 'ies' : 'y'}
        </p>
      </div>
      <div className="p-2 space-y-2">
        {matches.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelect(entry)}
            className="w-full p-3 rounded-lg border hover:bg-muted/50 text-left transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">{entry.customerName}</p>
                {entry.customerPhone && (
                  <p className="text-xs text-muted-foreground">{entry.customerPhone}</p>
                )}
              </div>
              {entry.matchScore !== undefined && (
                <Badge
                  variant={entry.matchScore >= 70 ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {entry.matchScore}% match
                </Badge>
              )}
            </div>
            {entry.matchReasons && entry.matchReasons.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {entry.matchReasons.slice(0, 2).map((reason, i) => (
                  <span
                    key={i}
                    className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
