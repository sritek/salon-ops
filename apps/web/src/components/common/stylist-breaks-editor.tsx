'use client';

/**
 * Stylist Breaks Editor Component
 * Manage recurring breaks for a stylist (e.g., lunch break)
 */

import { useState, useCallback } from 'react';
import { Plus, Trash2, Coffee, Loader2 } from 'lucide-react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TimePicker } from './time-picker';
import { ConfirmDialog } from './confirm-dialog';

export interface StylistBreak {
  id?: string;
  name: string;
  dayOfWeek: number | null; // null = all days, 0-6 = specific day
  startTime: string;
  endTime: string;
}

const DAYS_OF_WEEK = [
  { value: 'all', label: 'Every Day' },
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

interface FormErrors {
  name?: string;
  startTime?: string;
  endTime?: string;
}

interface StylistBreaksEditorProps {
  breaks: StylistBreak[];
  onAdd: (breakData: Omit<StylistBreak, 'id'>) => Promise<void>;
  onRemove: (breakId: string) => Promise<void>;
  isAdding?: boolean;
  isRemoving?: boolean;
}

export function StylistBreaksEditor({
  breaks,
  onAdd,
  onRemove,
  isAdding = false,
  isRemoving = false,
}: StylistBreaksEditorProps) {
  const [showForm, setShowForm] = useState(false);
  const [newBreak, setNewBreak] = useState<Omit<StylistBreak, 'id'>>({
    name: 'Lunch Break',
    dayOfWeek: null,
    startTime: '13:00',
    endTime: '14:00',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [deleteBreakId, setDeleteBreakId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate name
    if (!newBreak.name.trim()) {
      newErrors.name = 'Break name is required';
    } else if (newBreak.name.trim().length < 2) {
      newErrors.name = 'Break name must be at least 2 characters';
    } else if (newBreak.name.trim().length > 50) {
      newErrors.name = 'Break name must be less than 50 characters';
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newBreak.startTime)) {
      newErrors.startTime = 'Invalid start time format';
    }
    if (!timeRegex.test(newBreak.endTime)) {
      newErrors.endTime = 'Invalid end time format';
    }

    // Validate end time is after start time
    if (!newErrors.startTime && !newErrors.endTime) {
      const [startHour, startMin] = newBreak.startTime.split(':').map(Number);
      const [endHour, endMin] = newBreak.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        newErrors.endTime = 'End time must be after start time';
      }

      // Validate break duration (min 5 minutes, max 4 hours)
      const duration = endMinutes - startMinutes;
      if (duration < 5) {
        newErrors.endTime = 'Break must be at least 5 minutes';
      } else if (duration > 240) {
        newErrors.endTime = 'Break cannot exceed 4 hours';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddBreak = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    await onAdd({
      ...newBreak,
      name: newBreak.name.trim(),
    });
    setNewBreak({
      name: 'Break',
      dayOfWeek: null,
      startTime: '13:00',
      endTime: '14:00',
    });
    setErrors({});
    setShowForm(false);
  }, [newBreak, onAdd]);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteBreakId) {
      setRemovingId(deleteBreakId);
      try {
        await onRemove(deleteBreakId);
      } finally {
        setRemovingId(null);
        setDeleteBreakId(null);
      }
    }
  }, [deleteBreakId, onRemove]);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setErrors({});
    setNewBreak({
      name: 'Lunch Break',
      dayOfWeek: null,
      startTime: '13:00',
      endTime: '14:00',
    });
  }, []);

  const getDayLabel = (dayOfWeek: number | null) => {
    if (dayOfWeek === null) return 'Every Day';
    return DAYS_OF_WEEK.find((d) => d.value === String(dayOfWeek))?.label || 'Unknown';
  };

  const breakToDelete = deleteBreakId ? breaks.find((b) => b.id === deleteBreakId) : null;

  const disabled = isAdding || isRemoving;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            Recurring Breaks
          </CardTitle>
          <CardDescription>
            Set up regular breaks like lunch time. These will be blocked on the appointment
            calendar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing breaks */}
          {breaks.length > 0 ? (
            <div className="space-y-2">
              {breaks.map((brk) => (
                <div
                  key={brk.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">{brk.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {getDayLabel(brk.dayOfWeek)} • {brk.startTime} - {brk.endTime}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => brk.id && setDeleteBreakId(brk.id)}
                    disabled={disabled || !brk.id}
                  >
                    {removingId === brk.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No breaks configured. Add a break to block time on the calendar.
            </p>
          )}

          {/* Add new break form */}
          {showForm ? (
            <div className="p-4 rounded-lg border bg-muted/50 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Break Name *</Label>
                  <Input
                    value={newBreak.name}
                    onChange={(e) => {
                      setNewBreak({ ...newBreak, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: undefined });
                    }}
                    placeholder="e.g., Lunch Break"
                    disabled={isAdding}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Day</Label>
                  <Select
                    value={newBreak.dayOfWeek === null ? 'all' : String(newBreak.dayOfWeek)}
                    onValueChange={(value) =>
                      setNewBreak({
                        ...newBreak,
                        dayOfWeek: value === 'all' ? null : parseInt(value),
                      })
                    }
                    disabled={isAdding}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <TimePicker
                    value={newBreak.startTime}
                    onChange={(time) => {
                      setNewBreak({ ...newBreak, startTime: time });
                      if (errors.startTime) setErrors({ ...errors, startTime: undefined });
                    }}
                    disabled={isAdding}
                    className={errors.startTime ? 'border-destructive' : ''}
                  />
                  {errors.startTime && (
                    <p className="text-sm text-destructive">{errors.startTime}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>End Time *</Label>
                  <TimePicker
                    value={newBreak.endTime}
                    onChange={(time) => {
                      setNewBreak({ ...newBreak, endTime: time });
                      if (errors.endTime) setErrors({ ...errors, endTime: undefined });
                    }}
                    disabled={isAdding}
                    className={errors.endTime ? 'border-destructive' : ''}
                  />
                  {errors.endTime && <p className="text-sm text-destructive">{errors.endTime}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddBreak} size="sm" disabled={isAdding}>
                  {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Break
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancelForm} disabled={isAdding}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowForm(true)}
              disabled={disabled}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Break
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteBreakId}
        onOpenChange={(open) => !open && setDeleteBreakId(null)}
        title="Delete Break"
        description={
          breakToDelete
            ? `Are you sure you want to delete "${breakToDelete.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this break?'
        }
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        isLoading={!!removingId}
      />
    </>
  );
}
