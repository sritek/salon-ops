'use client';

/**
 * My Schedule Page - Stylist Personal View
 * Single-column calendar showing only the logged-in stylist's appointments
 * Requirements: 7.6
 */

import { useMemo, useCallback, useState } from 'react';
import { format, isToday, isTomorrow, addDays, subDays } from 'date-fns';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Phone,
  FileText,
  Play,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Star,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/common';
import { useAuthStore } from '@/stores/auth-store';
import { useMySchedule, useMyStylistStats } from '@/hooks/queries/use-my-schedule';
import { maskPhoneNumber } from '@/lib/phone-masking';

export default function MySchedulePage() {
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dateString = format(selectedDate, 'yyyy-MM-dd');
  const { data: scheduleData, isLoading: scheduleLoading } = useMySchedule(dateString);
  const { data: statsData, isLoading: statsLoading } = useMyStylistStats();

  const handlePrevDay = useCallback(() => {
    setSelectedDate((prev) => subDays(prev, 1));
  }, []);

  const handleNextDay = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, 1));
  }, []);

  const handleToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  // Get the next upcoming appointment
  const nextAppointment = useMemo(() => {
    if (!scheduleData?.appointments) return null;
    const now = new Date();
    const currentTime = format(now, 'HH:mm');

    return scheduleData.appointments.find(
      (apt) =>
        apt.date === format(now, 'yyyy-MM-dd') &&
        apt.startTime >= currentTime &&
        !['completed', 'cancelled', 'no_show'].includes(apt.status)
    );
  }, [scheduleData?.appointments]);

  // Format date label
  const dateLabel = useMemo(() => {
    if (isToday(selectedDate)) return 'Today';
    if (isTomorrow(selectedDate)) return 'Tomorrow';
    return format(selectedDate, 'EEEE, MMM d');
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Schedule</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name}</p>
        </div>
      </div>

      {/* Stats Section */}
      <MyStats stats={statsData} isLoading={statsLoading} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Date Navigation */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={handlePrevDay}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">{dateLabel}</span>
                  <span className="text-muted-foreground">
                    {format(selectedDate, 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!isToday(selectedDate) && (
                    <Button variant="outline" size="sm" onClick={handleToday}>
                      Today
                    </Button>
                  )}
                  <Button variant="outline" size="icon" onClick={handleNextDay}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appointments List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {scheduleLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <AppointmentCardSkeleton key={i} />
                  ))}
                </div>
              ) : !scheduleData?.appointments?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No appointments scheduled for this day</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scheduleData.appointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      isStylist={user?.role === 'stylist'}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Next Client Card */}
        <div className="space-y-4">
          <NextClientCard appointment={nextAppointment} isLoading={scheduleLoading} />
        </div>
      </div>
    </div>
  );
}

// Stats Component
interface MyStatsProps {
  stats:
    | {
        todayAppointments: number;
        todayRevenue: number;
        weeklyAppointments: number;
        weeklyRevenue: number;
        averageRating: number;
        tipsToday: number;
      }
    | null
    | undefined;
  isLoading: boolean;
}

function MyStats({ stats, isLoading }: MyStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      label: "Today's Appointments",
      value: stats?.todayAppointments ?? 0,
      icon: Calendar,
      color: 'text-blue-600',
    },
    {
      label: "Today's Revenue",
      value: `₹${(stats?.todayRevenue ?? 0).toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      label: 'Weekly Appointments',
      value: stats?.weeklyAppointments ?? 0,
      icon: TrendingUp,
      color: 'text-purple-600',
    },
    {
      label: 'Tips Today',
      value: `₹${(stats?.tipsToday ?? 0).toLocaleString('en-IN')}`,
      icon: Star,
      color: 'text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <item.icon className={cn('h-4 w-4', item.color)} />
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </div>
            <p className="text-2xl font-bold">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Appointment Card Component
interface AppointmentCardProps {
  appointment: {
    id: string;
    customerName: string;
    customerPhone: string;
    startTime: string;
    endTime: string;
    services: string[];
    status: string;
    totalAmount: number;
    notes?: string;
    customerPreferences?: string;
  };
  isStylist: boolean;
}

function AppointmentCard({ appointment, isStylist }: AppointmentCardProps) {
  const statusColors: Record<string, string> = {
    booked: 'border-l-blue-500',
    confirmed: 'border-l-green-500',
    checked_in: 'border-l-purple-500',
    in_progress: 'border-l-purple-500',
    completed: 'border-l-gray-400',
    cancelled: 'border-l-red-500',
    no_show: 'border-l-gray-400',
  };

  const canStart = ['checked_in'].includes(appointment.status);
  const canComplete = ['in_progress'].includes(appointment.status);

  return (
    <div
      className={cn(
        'border rounded-lg p-4 border-l-4 transition-colors hover:bg-muted/50',
        statusColors[appointment.status] || 'border-l-gray-300'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {appointment.startTime} - {appointment.endTime}
            </span>
            <StatusBadge status={appointment.status as any} size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{appointment.customerName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {isStylist ? maskPhoneNumber(appointment.customerPhone) : appointment.customerPhone}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{appointment.services.join(', ')}</span>
          </div>
          {appointment.notes && (
            <p className="text-sm text-muted-foreground mt-2 italic">Note: {appointment.notes}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="font-semibold">₹{appointment.totalAmount.toLocaleString('en-IN')}</span>
          <div className="flex gap-2">
            {canStart && (
              <Button size="sm" variant="default">
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
            )}
            {canComplete && (
              <Button size="sm" variant="default">
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 border-l-4 border-l-gray-200">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );
}

// Next Client Card Component
interface NextClientCardProps {
  appointment:
    | {
        id: string;
        customerName: string;
        customerPhone: string;
        startTime: string;
        endTime: string;
        services: string[];
        status: string;
        totalAmount: number;
        notes?: string;
        customerPreferences?: string;
        customerHistory?: {
          totalVisits: number;
          lastVisit: string;
          favoriteServices: string[];
        };
      }
    | null
    | undefined;
  isLoading: boolean;
}

function NextClientCard({ appointment, isLoading }: NextClientCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Next Client</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!appointment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Next Client</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No upcoming appointments</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          Next Client
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-xl font-bold">{appointment.customerName}</h3>
          <p className="text-muted-foreground">
            {appointment.startTime} - {appointment.endTime}
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">Services</h4>
          <div className="flex flex-wrap gap-2">
            {appointment.services.map((service) => (
              <span
                key={service}
                className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
              >
                {service}
              </span>
            ))}
          </div>
        </div>

        {appointment.customerPreferences && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Preferences</h4>
            <p className="text-sm bg-muted p-2 rounded-md">{appointment.customerPreferences}</p>
          </div>
        )}

        {appointment.notes && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Notes</h4>
            <p className="text-sm bg-amber-50 dark:bg-amber-950/20 p-2 rounded-md text-amber-800 dark:text-amber-200">
              {appointment.notes}
            </p>
          </div>
        )}

        {appointment.customerHistory && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-medium text-sm text-muted-foreground">Customer History</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Total Visits:</span>
                <span className="ml-1 font-medium">{appointment.customerHistory.totalVisits}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Visit:</span>
                <span className="ml-1 font-medium">{appointment.customerHistory.lastVisit}</span>
              </div>
            </div>
            {appointment.customerHistory.favoriteServices.length > 0 && (
              <div>
                <span className="text-muted-foreground text-sm">Favorites: </span>
                <span className="text-sm">
                  {appointment.customerHistory.favoriteServices.join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button className="flex-1" size="sm">
            <Play className="h-4 w-4 mr-1" />
            Start Service
          </Button>
          <Button variant="outline" size="sm">
            <User className="h-4 w-4 mr-1" />
            View Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
