'use client';

/**
 * Checkout Completion Component
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 6.6, 6.10
 *
 * Handles checkout completion flow:
 * - Updates appointment status to "completed"
 * - Generates invoice
 * - Offers receipt delivery (WhatsApp, email, print)
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, MessageCircle, Mail, Printer, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

type ReceiptMethod = 'whatsapp' | 'email' | 'print' | 'none';

interface CheckoutCompletionProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (options: { sendReceipt: boolean; receiptMethod?: ReceiptMethod }) => Promise<void>;
  invoiceId?: string;
  customerPhone?: string;
  customerEmail?: string;
  isProcessing?: boolean;
}

interface ReceiptSuccessProps {
  invoiceId: string;
  receiptMethod: ReceiptMethod;
  onClose: () => void;
  onViewInvoice: () => void;
}

// ============================================
// Receipt Method Option Component
// ============================================

function ReceiptMethodOption({
  value,
  icon: Icon,
  label,
  description,
  disabled,
}: {
  value: ReceiptMethod;
  icon: React.ElementType;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center space-x-3">
      <RadioGroupItem value={value} id={value} disabled={disabled} />
      <Label
        htmlFor={value}
        className={cn(
          'flex items-center gap-3 cursor-pointer flex-1',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="p-2 rounded-full bg-muted">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </Label>
    </div>
  );
}

// ============================================
// Receipt Success Dialog Component
// ============================================

function ReceiptSuccessDialog({
  invoiceId,
  receiptMethod,
  onClose,
  onViewInvoice,
}: ReceiptSuccessProps) {
  const getMessage = () => {
    switch (receiptMethod) {
      case 'whatsapp':
        return 'Receipt sent via WhatsApp';
      case 'email':
        return 'Receipt sent via Email';
      case 'print':
        return 'Receipt ready for printing';
      default:
        return 'Checkout completed successfully';
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <DialogTitle className="text-center">Checkout Complete!</DialogTitle>
          <DialogDescription className="text-center">{getMessage()}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-4">
          <p className="text-center text-sm text-muted-foreground">
            Invoice #{invoiceId.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button onClick={onViewInvoice} className="flex-1">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Main Component
// ============================================

export function CheckoutCompletion({
  isOpen,
  onClose,
  onComplete,
  invoiceId,
  customerPhone,
  customerEmail,
  isProcessing,
}: CheckoutCompletionProps) {
  const [receiptMethod, setReceiptMethod] = useState<ReceiptMethod>('none');
  const [showSuccess, setShowSuccess] = useState(false);
  const [completedInvoiceId, setCompletedInvoiceId] = useState<string | null>(null);

  const handleComplete = useCallback(async () => {
    try {
      await onComplete({
        sendReceipt: receiptMethod !== 'none',
        receiptMethod: receiptMethod !== 'none' ? receiptMethod : undefined,
      });

      // Show success dialog if we have an invoice ID
      if (invoiceId) {
        setCompletedInvoiceId(invoiceId);
        setShowSuccess(true);
      }
    } catch {
      // Error handled by parent
    }
  }, [receiptMethod, onComplete, invoiceId]);

  const handleViewInvoice = useCallback(() => {
    if (completedInvoiceId) {
      window.open(`/billing/invoices/${completedInvoiceId}`, '_blank');
    }
    setShowSuccess(false);
    onClose();
  }, [completedInvoiceId, onClose]);

  const handleSuccessClose = useCallback(() => {
    setShowSuccess(false);
    onClose();
  }, [onClose]);

  // Show success dialog
  if (showSuccess && completedInvoiceId) {
    return (
      <ReceiptSuccessDialog
        invoiceId={completedInvoiceId}
        receiptMethod={receiptMethod}
        onClose={handleSuccessClose}
        onViewInvoice={handleViewInvoice}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Checkout</DialogTitle>
          <DialogDescription>
            How would you like to send the receipt to the customer?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={receiptMethod}
            onValueChange={(v) => setReceiptMethod(v as ReceiptMethod)}
          >
            <div className="space-y-3">
              <ReceiptMethodOption
                value="whatsapp"
                icon={MessageCircle}
                label="WhatsApp"
                description={
                  customerPhone ? `Send to ${customerPhone}` : 'No phone number available'
                }
                disabled={!customerPhone}
              />
              <ReceiptMethodOption
                value="email"
                icon={Mail}
                label="Email"
                description={customerEmail ? `Send to ${customerEmail}` : 'No email available'}
                disabled={!customerEmail}
              />
              <ReceiptMethodOption
                value="print"
                icon={Printer}
                label="Print"
                description="Print receipt now"
              />
              <ReceiptMethodOption
                value="none"
                icon={CheckCircle}
                label="No Receipt"
                description="Complete without sending receipt"
              />
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Complete Checkout'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
