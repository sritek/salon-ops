'use client';

/**
 * Accountant Dashboard Component
 * For accountant role
 * Shows billing metrics and financial summary
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, FileText, CreditCard, Receipt } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useOwnerDashboard } from '@/hooks/queries/use-owner-dashboard';

interface AccountantDashboardProps {
  branchId: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function AccountantDashboard({ branchId }: AccountantDashboardProps) {
  const { data, isLoading } = useOwnerDashboard({ branchId });

  if (isLoading) {
    return <AccountantDashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Revenue Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.revenue.today || 0)}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>vs yesterday:</span>
              <span
                className={cn(
                  'flex items-center',
                  (data?.revenue.percentChangeVsYesterday || 0) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                )}
              >
                {(data?.revenue.percentChangeVsYesterday || 0) >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {formatPercent(data?.revenue.percentChangeVsYesterday || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yesterday</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.revenue.yesterday || 0)}</div>
            <p className="text-xs text-muted-foreground">Previous day revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Week Same Day</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.revenue.lastWeekSameDay || 0)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>vs today:</span>
              <span
                className={cn(
                  'flex items-center',
                  (data?.revenue.percentChangeVsLastWeek || 0) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                )}
              >
                {(data?.revenue.percentChangeVsLastWeek || 0) >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {formatPercent(data?.revenue.percentChangeVsLastWeek || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Today&apos;s Billing Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{data?.appointments.completed || 0}</div>
              <div className="text-xs text-muted-foreground">Invoices Generated</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(data?.revenue.today || 0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Collected</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {data?.appointments.total || 0}
              </div>
              <div className="text-xs text-muted-foreground">Total Appointments</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {data?.appointments.inProgress || 0}
              </div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quick Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/billing"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <Receipt className="h-5 w-5 text-muted-foreground" />
              <span>Invoices</span>
            </Link>
            <Link
              href="/reports"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span>Reports</span>
            </Link>
            <Link
              href="/expenses"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <span>Expenses</span>
            </Link>
            <Link
              href="/inventory"
              className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted transition-colors"
            >
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <span>Inventory</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AccountantDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center p-4 bg-muted/50 rounded-lg">
                <Skeleton className="h-8 w-16 mx-auto mb-1" />
                <Skeleton className="h-3 w-20 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
