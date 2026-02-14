'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TimePicker } from '@/components/common';
import { useCreateBlockedSlot } from '@/hooks/queries/use-appointments';

interface BlockSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stylistId: string;
  initialDate?: string | null;
  onSuccess: () => void;
}

export function BlockSlotDialog({
  open,
  onOpenChange,
  stylistId,
  initialDate,
  onSuccess,
}: BlockSlotDialogProps) {
  const t = useTranslations('stylistSchedule.blockDialog');
  const createBlockedSlot = useCreateBlockedSlot();

  const [blockedDate, setBlockedDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (initialDate) {
      setBlockedDate(initialDate);
    }
  }, [initialDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createBlockedSlot.mutateAsync({
        stylistId,
        data: {
          blockedDate,
          isFullDay,
          startTime: isFullDay ? undefined : startTime,
          endTime: isFullDay ? undefined : endTime,
          reason: reason || undefined,
        },
      });
      onSuccess();
      resetForm();
    } catch (error) {
      console.error('Failed to create blocked slot:', error);
    }
  };

  const resetForm = () => {
    setBlockedDate(format(new Date(), 'yyyy-MM-dd'));
    setIsFullDay(true);
    setStartTime('09:00');
    setEndTime('18:00');
    setReason('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="blockedDate">{t('date')}</Label>
              <Input
                id="blockedDate"
                type="date"
                value={blockedDate}
                onChange={(e) => setBlockedDate(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isFullDay">{t('fullDay')}</Label>
                <p className="text-xs text-muted-foreground">{t('fullDayHint')}</p>
              </div>
              <Switch id="isFullDay" checked={isFullDay} onCheckedChange={setIsFullDay} />
            </div>

            {!isFullDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startTime">{t('startTime')}</Label>
                  <TimePicker id="startTime" value={startTime} onChange={setStartTime} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endTime">{t('endTime')}</Label>
                  <TimePicker id="endTime" value={endTime} onChange={setEndTime} />
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="reason">{t('reason')}</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('reasonPlaceholder')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={createBlockedSlot.isPending}>
              {createBlockedSlot.isPending ? t('blocking') : t('block')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
