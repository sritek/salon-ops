/**
 * Dashboard Page
 *
 * Balanced layout with:
 * - Personalized welcome header
 * - Key statistics
 * - Quick actions
 * - Today's schedule + Recent activity
 */

'use client';

import { Calendar, Users, IndianRupee, Clock, Plus, UserPlus, CalendarPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer, PageContent, StatCard, EmptyState } from '@/components/common';
import { useAuthStore } from '@/stores/auth-store';
import { formatTime, formatTimeAgo } from '@/lib/format';

// ============================================
// WELCOME HEADER
// ============================================

function WelcomeHeader() {
  const { user, tenant } = useAuthStore();
  const t = useTranslations('dashboard');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greeting.morning');
    if (hour < 17) return t('greeting.afternoon');
    return t('greeting.evening');
  };

  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-bold tracking-tight">
        {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}!
      </h1>
      <p className="text-muted-foreground">
        {t('subtitle', { salon: tenant?.name || 'your salon' })}
      </p>
    </div>
  );
}

// ============================================
// QUICK ACTIONS
// ============================================

function QuickActions() {
  const t = useTranslations('dashboard.quickActions');

  return (
    <div className="flex flex-wrap gap-3">
      <Button>
        <CalendarPlus className="mr-2 h-4 w-4" />
        {t('newAppointment')}
      </Button>
      <Button variant="outline">
        <Plus className="mr-2 h-4 w-4" />
        {t('walkIn')}
      </Button>
      <Button variant="outline">
        <UserPlus className="mr-2 h-4 w-4" />
        {t('addCustomer')}
      </Button>
    </div>
  );
}

// ============================================
// TODAY'S SCHEDULE
// ============================================

interface Appointment {
  id: string;
  time: string;
  customerName: string;
  serviceName: string;
  status: 'confirmed' | 'pending' | 'in_progress';
}

// Mock data - replace with API call
const mockAppointments: Appointment[] = [
  {
    id: '1',
    time: '10:00',
    customerName: 'Priya Sharma',
    serviceName: 'Haircut',
    status: 'confirmed',
  },
  {
    id: '2',
    time: '10:30',
    customerName: 'Rahul Kumar',
    serviceName: 'Facial',
    status: 'confirmed',
  },
  {
    id: '3',
    time: '11:00',
    customerName: 'Anita Patel',
    serviceName: 'Hair Spa',
    status: 'pending',
  },
  {
    id: '4',
    time: '11:30',
    customerName: 'Vikram Singh',
    serviceName: 'Beard Trim',
    status: 'confirmed',
  },
];

function TodaySchedule() {
  const t = useTranslations('dashboard.schedule');
  const tStatus = useTranslations('common.status');
  const appointments = mockAppointments; // Replace with useQuery

  if (appointments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Calendar}
            title={t('noAppointments')}
            description={t('noAppointmentsDesc')}
            action={
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                {useTranslations('dashboard.quickActions')('newAppointment')}
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return tStatus('confirmed');
      case 'pending':
        return tStatus('pending');
      case 'in_progress':
        return tStatus('inProgress');
      default:
        return status;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div
              key={apt.id}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="text-sm font-medium text-muted-foreground w-16">
                  {formatTime(apt.time)}
                </div>
                <div>
                  <p className="font-medium">{apt.customerName}</p>
                  <p className="text-sm text-muted-foreground">{apt.serviceName}</p>
                </div>
              </div>
              <div
                className={`
                text-xs px-2 py-1 rounded-full
                ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : ''}
                ${apt.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                ${apt.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : ''}
              `}
              >
                {getStatusLabel(apt.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// RECENT ACTIVITY
// ============================================

interface Activity {
  id: string;
  type: 'booking' | 'payment' | 'checkin' | 'customer';
  description: string;
  timestamp: Date;
}

// Mock data - replace with API call
const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'booking',
    description: 'Priya Sharma booked a haircut',
    timestamp: new Date(Date.now() - 2 * 60000),
  },
  {
    id: '2',
    type: 'payment',
    description: 'Payment received ₹1,500',
    timestamp: new Date(Date.now() - 15 * 60000),
  },
  {
    id: '3',
    type: 'checkin',
    description: 'Rahul Kumar checked in',
    timestamp: new Date(Date.now() - 30 * 60000),
  },
  {
    id: '4',
    type: 'customer',
    description: 'New customer registered',
    timestamp: new Date(Date.now() - 45 * 60000),
  },
];

function RecentActivity() {
  const t = useTranslations('dashboard.activity');
  const activities = mockActivities; // Replace with useQuery

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={Clock} title={t('noActivity')} description={t('noActivityDesc')} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div
                className={`
                mt-1 h-2 w-2 rounded-full
                ${activity.type === 'booking' ? 'bg-blue-500' : ''}
                ${activity.type === 'payment' ? 'bg-green-500' : ''}
                ${activity.type === 'checkin' ? 'bg-purple-500' : ''}
                ${activity.type === 'customer' ? 'bg-orange-500' : ''}
              `}
              />
              <div className="flex-1 space-y-1">
                <p className="text-sm">{activity.description}</p>
                <p className="text-xs text-muted-foreground">{formatTimeAgo(activity.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// STATS LOADING SKELETON
// ============================================

function StatsLoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// MAIN DASHBOARD PAGE
// ============================================

export default function DashboardPage() {
  const t = useTranslations('dashboard.stats');

  // Mock stats - replace with API data
  const stats = {
    todayAppointments: 12,
    pendingConfirmations: 3,
    todayRevenue: 15000,
    walkinSlots: 5,
  };

  const isLoading = false; // Replace with actual loading state

  return (
    <PageContainer>
      <PageContent className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <WelcomeHeader />
          <QuickActions />
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <StatsLoadingSkeleton />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t('todayAppointments')}
              value={stats.todayAppointments}
              format="number"
              icon={Calendar}
              href="/appointments"
            />
            <StatCard
              title={t('pendingConfirmations')}
              value={stats.pendingConfirmations}
              format="number"
              icon={Clock}
              href="/appointments?status=pending"
            />
            <StatCard
              title={t('todayRevenue')}
              value={stats.todayRevenue}
              format="currency"
              icon={IndianRupee}
              trend={{ value: 12, direction: 'up' }}
              href="/reports/revenue"
            />
            <StatCard
              title={t('walkInSlots')}
              value={stats.walkinSlots}
              format="number"
              icon={Users}
            />
          </div>
        )}

        {/* Schedule and Activity Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <TodaySchedule />
          <RecentActivity />
        </div>
      </PageContent>
    </PageContainer>
  );
}
