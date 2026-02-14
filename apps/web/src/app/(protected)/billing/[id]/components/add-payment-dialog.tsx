'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';

import { formatCurrency } from '@/lib/format';
import type { PaymentInput, PaymentMethod } from '@/types/billing';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountDue: number;
  onSubmit: (payments: PaymentInput[]) => Promise<void>;
  isLoading: boolean;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'card',
  'upi',
  'wallet',
  'bank_transfer',
  'cheque',
];

interface PaymentEntry {
  id: string;
  method: PaymentMethod;
  amount: string;
  transactionId: string;
  cardLastFour: string;
  upiId: string;
}

export function AddPaymentDialog({
  open,
  onOpenChange,
  amountDue,
  onSubmit,
  isLoading,
}: AddPaymentDialogProps) {
  const t = useTranslations('billing');

  const [payments, setPayments] = useState<PaymentEntry[]>([
    {
      id: '1',
      method: 'cash',
      amount: amountDue.toString(),
      transactionId: '',
      cardLastFour: '',
      upiId: '',
    },
  ]);

  const totalPayment = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const remaining = amountDue - totalPayment;

  const addPayment = () => {
    setPayments([
      ...payments,
      {
        id: Date.now().toString(),
        method: 'cash',
        amount: '',
        transactionId: '',
        cardLastFour: '',
        upiId: '',
      },
    ]);
  };

  const removePayment = (id: string) => {
    if (payments.length > 1) {
      setPayments(payments.filter((p) => p.id !== id));
    }
  };

  const updatePayment = (id: string, field: keyof PaymentEntry, value: string) => {
    setPayments(payments.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = async () => {
    const validPayments: PaymentInput[] = payments
      .filter((p) => parseFloat(p.amount) > 0)
      .map((p) => ({
        paymentMethod: p.method,
        amount: parseFloat(p.amount),
        transactionId: p.transactionId || undefined,
        cardLastFour: p.cardLastFour || undefined,
        upiId: p.upiId || undefined,
      }));

    if (validPayments.length === 0) return;

    await onSubmit(validPayments);
    // Reset form
    setPayments([
      {
        id: '1',
        method: 'cash',
        amount: amountDue.toString(),
        transactionId: '',
        cardLastFour: '',
        upiId: '',
      },
    ]);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setPayments([
        {
          id: '1',
          method: 'cash',
          amount: amountDue.toString(),
          transactionId: '',
          cardLastFour: '',
          upiId: '',
        },
      ]);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('actions.addPayment')}</DialogTitle>
          <DialogDescription>Amount due: {formatCurrency(amountDue)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {payments.map((payment, index) => (
            <div key={payment.id} className="space-y-3 p-3 border rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Payment {index + 1}</span>
                {payments.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePayment(payment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('form.paymentMethod')}</Label>
                  <Select
                    value={payment.method}
                    onValueChange={(value) => updatePayment(payment.id, 'method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {t(`paymentMethods.${method}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('form.amount')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={payment.amount}
                    onChange={(e) => updatePayment(payment.id, 'amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Additional fields based on payment method */}
              {payment.method === 'card' && (
                <div className="space-y-2">
                  <Label>Card Last 4 Digits</Label>
                  <Input
                    maxLength={4}
                    value={payment.cardLastFour}
                    onChange={(e) => updatePayment(payment.id, 'cardLastFour', e.target.value)}
                    placeholder="1234"
                  />
                </div>
              )}

              {payment.method === 'upi' && (
                <div className="space-y-2">
                  <Label>UPI ID / Transaction Ref</Label>
                  <Input
                    value={payment.upiId}
                    onChange={(e) => updatePayment(payment.id, 'upiId', e.target.value)}
                    placeholder="user@upi"
                  />
                </div>
              )}

              {(payment.method === 'bank_transfer' || payment.method === 'cheque') && (
                <div className="space-y-2">
                  <Label>Reference / Transaction ID</Label>
                  <Input
                    value={payment.transactionId}
                    onChange={(e) => updatePayment(payment.id, 'transactionId', e.target.value)}
                    placeholder="Transaction reference"
                  />
                </div>
              )}
            </div>
          ))}

          <Button type="button" variant="outline" className="w-full" onClick={addPayment}>
            <Plus className="mr-2 h-4 w-4" />
            Add Split Payment
          </Button>

          {/* Summary */}
          <div className="p-3 bg-muted rounded-md space-y-1">
            <div className="flex justify-between text-sm">
              <span>Total Payment</span>
              <span className="font-medium">{formatCurrency(totalPayment)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Remaining</span>
              <span
                className={
                  remaining > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'
                }
              >
                {formatCurrency(Math.max(0, remaining))}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || totalPayment <= 0}>
            {isLoading ? 'Adding...' : 'Add Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
