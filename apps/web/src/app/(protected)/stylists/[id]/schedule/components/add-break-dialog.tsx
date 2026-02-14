'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TimePicker } from '@/components/common';
import { useCreateBreak } from '@/hooks/queries/use-appointments';

interface AddBreakDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stylistId: string;
  onSuccess: () => void;
}

const DAYS_OF_WEEK = [
  { value: '0', label: 'Monday' },
  { value: '1', label: 'Tuesday' },
  { value: '2', label: 'Wednesday' },
  { value: '3', label: 'Thursday' },
  { value: '4', label: 'Friday' },
  { value: '5', label: 'Saturday' },
  { value: '6', label: 'Sunday' },
];

export function AddBreakDialog({ open, onOpenChange, stylistId, onSuccess }: AddBreakDialogProps) {
  const t = useTranslations('stylistSchedule.breakDialog');
  const createBreak = useCreateBreak();

  const [name, setName] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<string>('');
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createBreak.mutateAsync({
        stylistId,
        data: {
          name,
          dayOfWeek: dayOfWeek ? parseInt(dayOfWeek) : undefined,
          startTime,
          endTime,
        },
      });
      onSuccess();
      resetForm();
    } catch (error) {
      console.error('Failed to create break:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setDayOfWeek('');
    setStartTime('12:00');
    setEndTime('13:00');
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
              <Label htmlFor="name">{t('name')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dayOfWeek">{t('dayOfWeek')}</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectDay')} />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('dayHint')}</p>
            </div>

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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={createBreak.isPending}>
              {createBreak.isPending ? t('adding') : t('add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
