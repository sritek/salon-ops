'use client';

import { Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { LoyaltyBalanceResponse } from '@/types/customers';

// ============================================
// Helper
// ============================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ============================================
// Types
// ============================================

interface LoyaltyTabProps {
  balance: number;
  loyaltyData?: LoyaltyBalanceResponse;
  canManage: boolean;
  onAdjust: () => void;
}

// ============================================
// Component
// ============================================

export function LoyaltyTab({ balance, loyaltyData, canManage, onAdjust }: LoyaltyTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              <div className="text-2xl font-bold">{balance.toLocaleString()}</div>
            </div>
            <p className="text-xs text-muted-foreground">Current Balance</p>
            {canManage && (
              <Button variant="outline" size="sm" className="mt-4" onClick={onAdjust}>
                Adjust Points
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {loyaltyData?.transactions.data && loyaltyData.transactions.data.length > 0 ? (
            <div className="space-y-2">
              {loyaltyData.transactions.data.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium capitalize">{tx.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {tx.reason || tx.reference || '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold ${tx.points >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {tx.points >= 0 ? '+' : ''}
                      {tx.points}
                    </p>
                    <p className="text-xs text-muted-foreground">Balance: {tx.balance}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
