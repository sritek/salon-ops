/**
 * Shift Management Page
 *
 * Displays and manages shifts for a selected branch.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Clock, Edit, Trash2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageHeader, PageContent, EmptyState } from '@/components/common';
import { useShiftList, useDeleteShift } from '@/hooks/queries/use-staff';
import { useAuthStore } from '@/stores/auth-store';
import { ShiftForm } from './components/shift-form';
import { ShiftAssignmentDialog } from './components/shift-assignment-dialog';
import type { Shift } from '@/types/staff';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ShiftsPage() {
  const t = useTranslations('staff');
  const tCommon = useTranslations('common');

  const { user } = useAuthStore();
  // User has branchIds array, not branchAssignments
  const branchIds = user?.branchIds ?? [];
  const defaultBranchId = branchIds[0] ?? '';

  const [selectedBranchId, setSelectedBranchId] = useState<string>(defaultBranchId);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [deletingShift, setDeletingShift] = useState<Shift | null>(null);
  const [assigningShift, setAssigningShift] = useState<Shift | null>(null);

  const { data: shifts, isLoading, error } = useShiftList(selectedBranchId);
  const deleteShift = useDeleteShift();

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatApplicableDays = (days: number[]) => {
    return days.map((d) => DAYS[d]).join(', ');
  };

  const handleDelete = async () => {
    if (!deletingShift) return;
    try {
      await deleteShift.mutateAsync(deletingShift.id);
      setDeletingShift(null);
    } catch (error) {
      console.error('Failed to delete shift:', error);
    }
  };

  return (
    <>
      <PageHeader
        title={t('shifts.title')}
        description={t('shifts.description')}
        actions={
          selectedBranchId && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('shifts.addShift')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('shifts.createShift')}</DialogTitle>
                  <DialogDescription>{t('shifts.createShiftDescription')}</DialogDescription>
                </DialogHeader>
                <ShiftForm
                  branchId={selectedBranchId}
                  onSuccess={() => setIsCreateOpen(false)}
                  onCancel={() => setIsCreateOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )
        }
      />

      <PageContent>
        {/* Branch Selector */}
        <div className="mb-6">
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder={t('shifts.selectBranch')} />
            </SelectTrigger>
            <SelectContent>
              {branchIds.map((branchId) => (
                <SelectItem key={branchId} value={branchId}>
                  {branchId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Shifts Table */}
        {!selectedBranchId ? (
          <EmptyState
            icon={Clock}
            title={t('shifts.selectBranchFirst')}
            description={t('shifts.selectBranchDescription')}
          />
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <EmptyState icon={Clock} title={tCommon('status.error')} description={error.message} />
        ) : !shifts || shifts.length === 0 ? (
          <EmptyState
            icon={Clock}
            title={t('shifts.noShifts')}
            description={t('shifts.noShiftsDescription')}
            action={
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('shifts.addShift')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('shifts.createShift')}</DialogTitle>
                    <DialogDescription>{t('shifts.createShiftDescription')}</DialogDescription>
                  </DialogHeader>
                  <ShiftForm
                    branchId={selectedBranchId}
                    onSuccess={() => setIsCreateOpen(false)}
                    onCancel={() => setIsCreateOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            }
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('shifts.table.name')}</TableHead>
                  <TableHead>{t('shifts.table.timing')}</TableHead>
                  <TableHead>{t('shifts.table.break')}</TableHead>
                  <TableHead>{t('shifts.table.applicableDays')}</TableHead>
                  <TableHead>{t('shifts.table.status')}</TableHead>
                  <TableHead className="text-right">{tCommon('actions.title')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift: Shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-medium">{shift.name}</TableCell>
                    <TableCell>
                      {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                    </TableCell>
                    <TableCell>{shift.breakDurationMinutes} min</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatApplicableDays(shift.applicableDays)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={shift.isActive ? 'default' : 'secondary'}>
                        {shift.isActive ? tCommon('status.active') : tCommon('status.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setAssigningShift(shift)}
                          title={t('shifts.assignStaff')}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditingShift(shift)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingShift(shift)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageContent>

      {/* Edit Shift Dialog */}
      <Dialog open={!!editingShift} onOpenChange={(open) => !open && setEditingShift(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('shifts.editShift')}</DialogTitle>
            <DialogDescription>{t('shifts.editShiftDescription')}</DialogDescription>
          </DialogHeader>
          {editingShift && (
            <ShiftForm
              branchId={selectedBranchId}
              shift={editingShift}
              onSuccess={() => setEditingShift(null)}
              onCancel={() => setEditingShift(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingShift} onOpenChange={(open) => !open && setDeletingShift(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('shifts.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('shifts.deleteConfirmDescription', { name: deletingShift?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tCommon('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shift Assignment Dialog */}
      {assigningShift && (
        <ShiftAssignmentDialog
          shift={assigningShift}
          branchId={selectedBranchId}
          open={!!assigningShift}
          onOpenChange={(open) => !open && setAssigningShift(null)}
        />
      )}
    </>
  );
}
