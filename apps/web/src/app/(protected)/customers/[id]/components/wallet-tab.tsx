'use client';

import { Wallet } from 'lucide-react';

import { formatCurrency } from '@/lib/format';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { WalletBalanceResponse } from '@/types/customers';

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

interface WalletTabProps {
  balance: number;
  walletData?: WalletBalanceResponse;
  canManage: boolean;
  onAdjust: () => void;
}

// ============================================
// Component
// ============================================

export function WalletTab({ balance, walletData, canManage, onAdjust }: WalletTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-600" />
              <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
            </div>
            <p className="text-xs text-muted-foreground">Current Balance</p>
            {canManage && (
              <Button variant="outline" size="sm" className="mt-4" onClick={onAdjust}>
                Adjust Balance
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
          {walletData?.transactions.data && walletData.transactions.data.length > 0 ? (
            <div className="space-y-2">
              {walletData.transactions.data.map((tx) => (
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
                      className={`font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {tx.amount >= 0 ? '+' : ''}
                      {formatCurrency(tx.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Balance: {formatCurrency(tx.balance)}
                    </p>
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
