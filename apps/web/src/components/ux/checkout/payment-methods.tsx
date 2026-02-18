'use client';

/**
 * Payment Methods Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 6.5
 *
 * Payment method selection with Cash, Card, UPI, Wallet, Loyalty Points.
 * Supports quick amount buttons and split payments.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Banknote, CreditCard, Smartphone, Wallet, Star, X, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaymentEntry } from '@/types/checkout';

// ============================================
// Types
// ============================================

type PaymentMethod = 'cash' | 'card' | 'upi' | 'wallet' | 'loyalty';

interface PaymentMethodsProps {
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

interface PaymentMethodButtonProps {
  method: PaymentMethod;
  icon: React.ElementType;
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
}

// ============================================
// Payment Method Button Component
// ============================================

function PaymentMethodButton({
  icon: Icon,
  label,
  selected,
  onClick,
  disabled,
  badge,
}: PaymentMethodButtonProps) {
  return (
    <Button
      variant={selected ? 'default' : 'outline'}
      className={cn(
        'flex-1 flex-col h-auto py-3 gap-1 relative',
        selected && 'ring-2 ring-primary'
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs">{label}</span>
      {badge && (
        <Badge variant="secondary" className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0">
          {badge}
        </Badge>
      )}
    </Button>
  );
}

// ============================================
// Payment Entry Row Component
// ============================================

function PaymentEntryRow({
  payment,
  onRemove,
  isRemoving,
}: {
  payment: PaymentEntry;
  onRemove?: () => void;
  isRemoving?: boolean;
}) {
  const getIcon = () => {
    switch (payment.paymentMethod) {
      case 'cash':
        return Banknote;
      case 'card':
        return CreditCard;
      case 'upi':
        return Smartphone;
      case 'wallet':
        return Wallet;
      case 'loyalty':
        return Star;
      default:
        return Banknote;
    }
  };

  const Icon = getIcon();

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-green-50 dark:bg-green-950 rounded-md">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-green-600" />
        <span className="text-sm capitalize">{payment.paymentMethod}</span>
        {payment.cardLastFour && (
          <span className="text-xs text-muted-foreground">•••• {payment.cardLastFour}</span>
        )}
        {payment.upiId && <span className="text-xs text-muted-foreground">{payment.upiId}</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium text-green-600">₹{payment.amount.toFixed(2)}</span>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            disabled={isRemoving}
          >
            {isRemoving ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function PaymentMethods({
  amountDue,
  payments,
  onAddPayment,
  onRemovePayment,
  walletBalance,
  loyaltyPoints,
  loyaltyPointValue,
  isProcessing,
  className,
}: PaymentMethodsProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [cardLastFour, setCardLastFour] = useState('');
  const [upiId, setUpiId] = useState('');
  const [transactionId, setTransactionId] = useState('');

  // Calculate available wallet and loyalty amounts
  const walletAvailable = Math.min(walletBalance, amountDue);
  const loyaltyValue = loyaltyPoints * loyaltyPointValue;
  const loyaltyAvailable = Math.min(loyaltyValue, amountDue);

  // Handle method selection
  const handleSelectMethod = useCallback((method: PaymentMethod) => {
    setSelectedMethod(method);
    setAmount('');
    setCardLastFour('');
    setUpiId('');
    setTransactionId('');
  }, []);

  // Handle quick amount buttons
  const handleQuickAmount = useCallback(
    (type: 'exact' | 'round' | 'wallet' | 'loyalty') => {
      switch (type) {
        case 'exact':
          setAmount(amountDue.toFixed(2));
          break;
        case 'round':
          setAmount((Math.ceil(amountDue / 10) * 10).toFixed(2));
          break;
        case 'wallet':
          setAmount(walletAvailable.toFixed(2));
          break;
        case 'loyalty':
          setAmount(loyaltyAvailable.toFixed(2));
          break;
      }
    },
    [amountDue, walletAvailable, loyaltyAvailable]
  );

  // Handle add payment
  const handleAddPayment = useCallback(() => {
    if (!selectedMethod || !amount) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    onAddPayment({
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
  }, [selectedMethod, amount, cardLastFour, upiId, transactionId, onAddPayment]);

  // Calculate total paid
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const isPaid = amountDue <= 0.01;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Payment Complete Indicator */}
      {isPaid && payments.length > 0 && (
        <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg text-green-700 dark:text-green-300">
          <Check className="h-5 w-5" />
          <span className="font-medium">Payment Complete</span>
        </div>
      )}

      {/* Payment Method Selection */}
      {!isPaid && (
        <>
          <div className="grid grid-cols-5 gap-2">
            <PaymentMethodButton
              method="cash"
              icon={Banknote}
              label="Cash"
              selected={selectedMethod === 'cash'}
              onClick={() => handleSelectMethod('cash')}
            />
            <PaymentMethodButton
              method="card"
              icon={CreditCard}
              label="Card"
              selected={selectedMethod === 'card'}
              onClick={() => handleSelectMethod('card')}
            />
            <PaymentMethodButton
              method="upi"
              icon={Smartphone}
              label="UPI"
              selected={selectedMethod === 'upi'}
              onClick={() => handleSelectMethod('upi')}
            />
            <PaymentMethodButton
              method="wallet"
              icon={Wallet}
              label="Wallet"
              selected={selectedMethod === 'wallet'}
              onClick={() => handleSelectMethod('wallet')}
              disabled={walletBalance <= 0}
              badge={walletBalance > 0 ? `₹${walletBalance.toFixed(0)}` : undefined}
            />
            <PaymentMethodButton
              method="loyalty"
              icon={Star}
              label="Points"
              selected={selectedMethod === 'loyalty'}
              onClick={() => handleSelectMethod('loyalty')}
              disabled={loyaltyPoints <= 0 || loyaltyPointValue <= 0}
              badge={loyaltyPoints > 0 ? `${loyaltyPoints}` : undefined}
            />
          </div>

          {/* Payment Form */}
          {selectedMethod && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Amount</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      id="payment-amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-7 text-right font-medium"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <Button onClick={handleAddPayment} disabled={!amount || isProcessing}>
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                  </Button>
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleQuickAmount('exact')}
                >
                  Exact (₹{amountDue.toFixed(2)})
                </Button>
                {selectedMethod === 'cash' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleQuickAmount('round')}
                  >
                    Round Up
                  </Button>
                )}
                {selectedMethod === 'wallet' && walletAvailable > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleQuickAmount('wallet')}
                  >
                    Use All (₹{walletAvailable.toFixed(2)})
                  </Button>
                )}
                {selectedMethod === 'loyalty' && loyaltyAvailable > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleQuickAmount('loyalty')}
                  >
                    Use All (₹{loyaltyAvailable.toFixed(2)})
                  </Button>
                )}
              </div>

              {/* Card-specific fields */}
              {selectedMethod === 'card' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="card-last-four">Last 4 Digits</Label>
                    <Input
                      id="card-last-four"
                      value={cardLastFour}
                      onChange={(e) => setCardLastFour(e.target.value.slice(0, 4))}
                      placeholder="1234"
                      maxLength={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transaction-id">Transaction ID</Label>
                    <Input
                      id="transaction-id"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              )}

              {/* UPI-specific fields */}
              {selectedMethod === 'upi' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="upi-id">UPI ID</Label>
                    <Input
                      id="upi-id"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="name@upi"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="upi-transaction-id">Transaction ID</Label>
                    <Input
                      id="upi-transaction-id"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              )}

              {/* Wallet info */}
              {selectedMethod === 'wallet' && (
                <p className="text-xs text-muted-foreground">
                  Available balance: ₹{walletBalance.toFixed(2)}
                </p>
              )}

              {/* Loyalty info */}
              {selectedMethod === 'loyalty' && (
                <p className="text-xs text-muted-foreground">
                  {loyaltyPoints} points = ₹{loyaltyValue.toFixed(2)} value
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Payments Made */}
      {payments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">Payments Made</h4>
            <span className="text-sm font-medium text-green-600">₹{totalPaid.toFixed(2)}</span>
          </div>
          <div className="space-y-2">
            {payments.map((payment) => (
              <PaymentEntryRow
                key={payment.id}
                payment={payment}
                onRemove={onRemovePayment ? () => onRemovePayment(payment.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
