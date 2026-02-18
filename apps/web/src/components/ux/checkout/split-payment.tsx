'use client';

/**
 * Split Payment Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 6.5
 *
 * Allows multiple payment methods for a single checkout.
 * Shows running total of payments.
 * Validates total payments equal amount due.
 */

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Banknote,
  CreditCard,
  Smartphone,
  Wallet,
  Star,
  X,
  Loader2,
  Check,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaymentEntry } from '@/types/checkout';

// ============================================
// Types
// ============================================

type PaymentMethod = 'cash' | 'card' | 'upi' | 'wallet' | 'loyalty';

interface SplitPaymentProps {
  amountDue: number;
  payments: PaymentEntry[];
  onAddPayment: (payment: {
    paymentMethod: PaymentMethod;
    amount: number;
    cardLastFour?: string;
    cardType?: 'visa' | 'mastercard' | 'rupay' | 'amex';
    upiId?: string;
    transactionId?: string;
  }) => void;
  onRemovePayment?: (paymentId: string) => void;
  walletBalance: number;
  loyaltyPoints: number;
  loyaltyPointValue: number;
  isProcessing?: boolean;
  className?: string;
}

// ============================================
// Payment Method Config
// ============================================

const PAYMENT_METHODS: Array<{
  method: PaymentMethod;
  icon: React.ElementType;
  label: string;
  color: string;
}> = [
  { method: 'cash', icon: Banknote, label: 'Cash', color: 'bg-green-500' },
  { method: 'card', icon: CreditCard, label: 'Card', color: 'bg-blue-500' },
  { method: 'upi', icon: Smartphone, label: 'UPI', color: 'bg-purple-500' },
  { method: 'wallet', icon: Wallet, label: 'Wallet', color: 'bg-orange-500' },
  { method: 'loyalty', icon: Star, label: 'Points', color: 'bg-yellow-500' },
];

// ============================================
// Payment Entry Card Component
// ============================================

function PaymentEntryCard({
  payment,
  onRemove,
  isRemoving,
}: {
  payment: PaymentEntry;
  onRemove?: () => void;
  isRemoving?: boolean;
}) {
  const config = PAYMENT_METHODS.find((m) => m.method === payment.paymentMethod);
  const Icon = config?.icon || Banknote;

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-full text-white', config?.color || 'bg-gray-500')}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="font-medium capitalize">{payment.paymentMethod}</p>
          {payment.cardLastFour && (
            <p className="text-xs text-muted-foreground">•••• {payment.cardLastFour}</p>
          )}
          {payment.upiId && <p className="text-xs text-muted-foreground">{payment.upiId}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-green-600">₹{payment.amount.toFixed(2)}</span>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            disabled={isRemoving}
          >
            {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Add Payment Form Component
// ============================================

function AddPaymentForm({
  amountRemaining,
  walletBalance,
  loyaltyPoints,
  loyaltyPointValue,
  onAdd,
  isProcessing,
}: {
  amountRemaining: number;
  walletBalance: number;
  loyaltyPoints: number;
  loyaltyPointValue: number;
  onAdd: (payment: {
    paymentMethod: PaymentMethod;
    amount: number;
    cardLastFour?: string;
    upiId?: string;
    transactionId?: string;
  }) => void;
  isProcessing?: boolean;
}) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [cardLastFour, setCardLastFour] = useState('');
  const [upiId, setUpiId] = useState('');
  const [transactionId, setTransactionId] = useState('');

  const walletAvailable = Math.min(walletBalance, amountRemaining);
  const loyaltyValue = loyaltyPoints * loyaltyPointValue;
  const loyaltyAvailable = Math.min(loyaltyValue, amountRemaining);

  const handleSubmit = useCallback(() => {
    if (!selectedMethod || !amount) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    onAdd({
      paymentMethod: selectedMethod,
      amount: numAmount,
      cardLastFour: cardLastFour || undefined,
      upiId: upiId || undefined,
      transactionId: transactionId || undefined,
    });

    // Reset form
    setAmount('');
    setCardLastFour('');
    setUpiId('');
    setTransactionId('');
    setSelectedMethod(null);
  }, [selectedMethod, amount, cardLastFour, upiId, transactionId, onAdd]);

  const handleQuickAmount = useCallback(
    (type: 'exact' | 'round' | 'wallet' | 'loyalty') => {
      switch (type) {
        case 'exact':
          setAmount(amountRemaining.toFixed(2));
          break;
        case 'round':
          setAmount((Math.ceil(amountRemaining / 10) * 10).toFixed(2));
          break;
        case 'wallet':
          setAmount(walletAvailable.toFixed(2));
          break;
        case 'loyalty':
          setAmount(loyaltyAvailable.toFixed(2));
          break;
      }
    },
    [amountRemaining, walletAvailable, loyaltyAvailable]
  );

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-2">
        <Plus className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">Add Payment</span>
      </div>

      {/* Method Selection */}
      <div className="grid grid-cols-5 gap-2">
        {PAYMENT_METHODS.map(({ method, icon: Icon, label }) => {
          const isDisabled =
            (method === 'wallet' && walletBalance <= 0) ||
            (method === 'loyalty' && (loyaltyPoints <= 0 || loyaltyPointValue <= 0));

          return (
            <Button
              key={method}
              variant={selectedMethod === method ? 'default' : 'outline'}
              className={cn(
                'flex-col h-auto py-2 gap-1',
                selectedMethod === method && 'ring-2 ring-primary'
              )}
              onClick={() => setSelectedMethod(method)}
              disabled={isDisabled}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs">{label}</span>
            </Button>
          );
        })}
      </div>

      {/* Amount Input */}
      {selectedMethod && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ₹
                </span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-7 text-right font-medium"
                  min="0"
                  step="0.01"
                />
              </div>
              <Button onClick={handleSubmit} disabled={!amount || isProcessing}>
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
          </div>

          {/* Quick Amounts */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => handleQuickAmount('exact')}>
              Remaining (₹{amountRemaining.toFixed(2)})
            </Button>
            {selectedMethod === 'cash' && (
              <Button variant="outline" size="sm" onClick={() => handleQuickAmount('round')}>
                Round Up
              </Button>
            )}
            {selectedMethod === 'wallet' && walletAvailable > 0 && (
              <Button variant="outline" size="sm" onClick={() => handleQuickAmount('wallet')}>
                Use Wallet (₹{walletAvailable.toFixed(2)})
              </Button>
            )}
            {selectedMethod === 'loyalty' && loyaltyAvailable > 0 && (
              <Button variant="outline" size="sm" onClick={() => handleQuickAmount('loyalty')}>
                Use Points (₹{loyaltyAvailable.toFixed(2)})
              </Button>
            )}
          </div>

          {/* Method-specific fields */}
          {selectedMethod === 'card' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Last 4 Digits</Label>
                <Input
                  value={cardLastFour}
                  onChange={(e) => setCardLastFour(e.target.value.slice(0, 4))}
                  placeholder="1234"
                  maxLength={4}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Transaction ID</Label>
                <Input
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          )}

          {selectedMethod === 'upi' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">UPI ID</Label>
                <Input
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="name@upi"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Transaction ID</Label>
                <Input
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function SplitPayment({
  amountDue,
  payments,
  onAddPayment,
  onRemovePayment,
  walletBalance,
  loyaltyPoints,
  loyaltyPointValue,
  isProcessing,
  className,
}: SplitPaymentProps) {
  // Calculate totals
  const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
  const amountRemaining = useMemo(() => Math.max(0, amountDue - totalPaid), [amountDue, totalPaid]);
  const progressPercent = useMemo(
    () => (amountDue > 0 ? Math.min(100, (totalPaid / amountDue) * 100) : 0),
    [totalPaid, amountDue]
  );
  const isComplete = amountRemaining <= 0.01;
  const isOverpaid = totalPaid > amountDue + 0.01;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Payment Progress</span>
          <span className="font-medium">
            ₹{totalPaid.toFixed(2)} / ₹{amountDue.toFixed(2)}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        {!isComplete && (
          <p className="text-xs text-muted-foreground">₹{amountRemaining.toFixed(2)} remaining</p>
        )}
      </div>

      {/* Payment Complete Indicator */}
      {isComplete && !isOverpaid && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg text-green-700 dark:text-green-300">
          <Check className="h-5 w-5" />
          <span className="font-medium">Payment Complete</span>
        </div>
      )}

      {/* Overpayment Warning */}
      {isOverpaid && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-yellow-700 dark:text-yellow-300">
          <AlertCircle className="h-5 w-5" />
          <div>
            <span className="font-medium">Overpayment</span>
            <p className="text-xs">Change due: ₹{(totalPaid - amountDue).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Existing Payments */}
      {payments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Payments ({payments.length})</h4>
            <Badge variant="secondary" className="text-green-600">
              ₹{totalPaid.toFixed(2)}
            </Badge>
          </div>
          <div className="space-y-2">
            {payments.map((payment) => (
              <PaymentEntryCard
                key={payment.id}
                payment={payment}
                onRemove={onRemovePayment ? () => onRemovePayment(payment.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add Payment Form */}
      {!isComplete && (
        <AddPaymentForm
          amountRemaining={amountRemaining}
          walletBalance={walletBalance}
          loyaltyPoints={loyaltyPoints}
          loyaltyPointValue={loyaltyPointValue}
          onAdd={onAddPayment}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
