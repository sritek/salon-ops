'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Clock, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { PERMISSIONS } from '@salon-ops/shared';

import {
  useAppointment,
  useRescheduleAppointment,
  useAvailableSlots,
} from '@/hooks/queries/use-appointments';
import { usePermissions } from '@/hooks/use-permissions';
import { useBranchContext } from '@/hooks/use-branch-context';
import { formatCurrency } from '@/lib/format';

import {
  AccessDenied,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
  LoadingSpinner,
  DatePicker,
} from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';

const rescheduleSchema = z.object({
  newDate: z.date({ required_error: 'New date is required' }),
  newTime: z.string().min(1, 'New time is required'),
  reason: z.string().max(500).optional(),
});

type RescheduleFormData = z.infer<typeof rescheduleSchema>;

export default function RescheduleAppointmentPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('appointments');
  usePermissions(); // Permission check for guard

  const id = params.id as string;
  const { data: appointment, isLoading } = useAppointment(id);

  const { branchId: contextBranchId } = useBranchContext();
  const branchId = contextBranchId || '';

  const rescheduleAppointment = useRescheduleAppointment();

  const form = useForm<RescheduleFormData>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: {
      reason: '',
    },
  });

  const selectedDate = form.watch('newDate');

  // Get service IDs from appointment
  const serviceIds = useMemo(() => {
    return appointment?.services?.map((s) => s.serviceId) || [];
  }, [appointment]);

  // Fetch available slots for the selected date
  const { data: slotsData } = useAvailableSlots({
    branchId: appointment?.branchId || branchId,
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
    serviceIds,
    stylistId: appointment?.stylistId || undefined,
  });

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  if (!appointment) {
    return (
      <PageContainer>
        <PageContent>
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold">{t('detail.notFound')}</h2>
            <p className="text-muted-foreground mt-2">{t('detail.notFoundDesc')}</p>
            <Button className="mt-4" onClick={() => router.push('/appointments')}>
              {t('detail.backToList')}
            </Button>
          </div>
        </PageContent>
      </PageContainer>
    );
  }

  // Check if reschedule is allowed
  const canReschedule =
    appointment.rescheduleCount < 3 &&
    ['booked', 'confirmed', 'checked_in'].includes(appointment.status);

  if (!canReschedule) {
    return (
      <PageContainer>
        <PageContent>
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">{t('reschedule.notAllowed')}</h2>
            <p className="text-muted-foreground mt-2">
              {appointment.rescheduleCount >= 3
                ? t('reschedule.maxReached')
                : t('reschedule.invalidStatus')}
            </p>
            <Button className="mt-4" onClick={() => router.push(`/appointments/${id}`)}>
              {t('detail.backToDetail')}
            </Button>
          </div>
        </PageContent>
      </PageContainer>
    );
  }

  const onSubmit = async (data: RescheduleFormData) => {
    try {
      await rescheduleAppointment.mutateAsync({
        id,
        data: {
          newDate: format(data.newDate, 'yyyy-MM-dd'),
          newTime: data.newTime,
          reason: data.reason,
        },
      });
      toast.success(t('reschedule.success'));
      router.push('/appointments');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('reschedule.error'));
    }
  };

  return (
    <PermissionGuard permission={PERMISSIONS.APPOINTMENTS_WRITE} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title={t('reschedule.title')}
          description={t('reschedule.description')}
          actions={
            <Button variant="outline" onClick={() => router.push(`/appointments/${id}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('reschedule.backToDetail')}
            </Button>
          }
        />

        <PageContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Current Appointment Info */}
            <Card>
              <CardHeader>
                <CardTitle>{t('reschedule.currentAppointment')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-md space-y-3">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">{t('detail.date')}</div>
                      <div className="font-medium">
                        {format(parseISO(appointment.scheduledDate), 'EEEE, MMMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">{t('detail.time')}</div>
                      <div className="font-medium">
                        {appointment.scheduledTime} - {appointment.endTime}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">{t('detail.customer')}</div>
                  <div className="font-medium">
                    {appointment.customer?.name || appointment.customerName || 'Guest'}
                  </div>
                  {(appointment.customer?.phone || appointment.customerPhone) && (
                    <div className="text-sm text-muted-foreground">
                      {appointment.customer?.phone || appointment.customerPhone}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">{t('detail.services')}</div>
                  <div className="flex flex-wrap gap-2">
                    {appointment.services?.map((service) => (
                      <Badge key={service.id} variant="outline">
                        {service.serviceName}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">{t('detail.total')}</span>
                  <span className="font-semibold">{formatCurrency(appointment.totalAmount)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{t('reschedule.count')}:</span>
                  <Badge variant={appointment.rescheduleCount >= 2 ? 'destructive' : 'secondary'}>
                    {appointment.rescheduleCount}/3
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Reschedule Form */}
            <Card>
              <CardHeader>
                <CardTitle>{t('reschedule.newDateTime')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="newDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('reschedule.newDate')}</FormLabel>
                          <FormControl>
                            <DatePicker
                              value={field.value}
                              onChange={field.onChange}
                              placeholder={t('reschedule.selectDate')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="newTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('reschedule.newTime')}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={!selectedDate}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('reschedule.selectTime')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {slotsData?.slots
                                ?.filter((slot) => slot.available)
                                .map((slot) => (
                                  <SelectItem key={slot.time} value={slot.time}>
                                    {slot.time}
                                  </SelectItem>
                                )) ||
                                // Default time slots if no availability data
                                Array.from({ length: 24 }, (_, i) => {
                                  const hour = (9 + Math.floor(i / 2)).toString().padStart(2, '0');
                                  const min = i % 2 === 0 ? '00' : '30';
                                  return `${hour}:${min}`;
                                })
                                  .filter((t) => t >= '09:00' && t <= '20:00')
                                  .map((time) => (
                                    <SelectItem key={time} value={time}>
                                      {time}
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
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('reschedule.reason')}</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder={t('reschedule.reasonPlaceholder')}
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {appointment.rescheduleCount >= 2 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex items-center gap-2 text-yellow-800">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {t('reschedule.lastReschedule')}
                          </span>
                        </div>
                        <p className="text-sm text-yellow-700 mt-1">
                          {t('reschedule.lastRescheduleWarning')}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push(`/appointments/${id}`)}
                      >
                        {t('form.cancel')}
                      </Button>
                      <Button type="submit" disabled={rescheduleAppointment.isPending}>
                        {rescheduleAppointment.isPending
                          ? t('reschedule.rescheduling')
                          : t('reschedule.confirm')}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </PageContent>
      </PageContainer>
    </PermissionGuard>
  );
}
