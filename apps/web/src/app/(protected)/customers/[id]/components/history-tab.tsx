'use client';

import { Star, Wallet } from 'lucide-react';

import { formatCurrency } from '@/lib/format';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import type { CustomerStats } from '@/types/customers';

// ============================================
// Helper
// ============================================

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ============================================
// Types
// ============================================

interface HistoryTabProps {
  stats?: CustomerStats;
  loyaltyPoints: number;
  walletBalance: number;
}

// ============================================
// Component
// ============================================

export function HistoryTab({ stats, loyaltyPoints, walletBalance }: HistoryTabProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Visit Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats ? (
            <>
              <StatRow label="Total Visits" value={stats.visitCount.toString()} />
              <StatRow label="Total Spend" value={formatCurrency(stats.totalSpend)} />
              <StatRow label="Avg. Ticket Size" value={formatCurrency(stats.avgTicketSize)} />
              <Separator />
              <StatRow label="First Visit" value={formatDate(stats.firstVisitDate)} />
              <StatRow label="Last Visit" value={formatDate(stats.lastVisitDate)} />
              <StatRow label="No-Shows" value={stats.noShowCount.toString()} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No statistics available</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Balances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Loyalty Points</span>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="font-medium">{loyaltyPoints.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Wallet Balance</span>
            <div className="flex items-center gap-1">
              <Wallet className="h-4 w-4 text-green-600" />
              <span className="font-medium">{formatCurrency(walletBalance)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Sub-component
// ============================================

interface StatRowProps {
  label: string;
  value: string;
}

function StatRow({ label, value }: StatRowProps) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
