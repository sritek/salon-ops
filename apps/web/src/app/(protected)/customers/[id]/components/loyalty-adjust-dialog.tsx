'use client';

import { useState } from 'react';

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

import type { AdjustLoyaltyInput } from '@/types/customers';

interface LoyaltyAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AdjustLoyaltyInput) => Promise<void>;
  isPending: boolean;
}

export function LoyaltyAdjustDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: LoyaltyAdjustDialogProps) {
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!points || !reason) return;
    await onSubmit({
      type,
      points: parseInt(points, 10),
      reason,
    });
    resetForm();
  };

  const resetForm = () => {
    setType('credit');
    setPoints('');
    setReason('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) resetForm();
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Loyalty Points</DialogTitle>
          <DialogDescription>Add or remove loyalty points for this customer.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'credit' | 'debit')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">Credit (Add Points)</SelectItem>
                <SelectItem value="debit">Debit (Remove Points)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Points</Label>
            <Input
              type="number"
              min="1"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="Enter points"
            />
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for adjustment"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!points || !reason || isPending}>
            {isPending ? 'Adjusting...' : 'Adjust Points'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
