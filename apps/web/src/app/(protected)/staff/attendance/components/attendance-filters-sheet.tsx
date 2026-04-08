'use client';

/**
 * Attendance Filters Sheet
 * Slide-out filter panel with date range (From / To), staff checkboxes, status checkboxes.
 * Same pattern as appointments ListFiltersSheet.
 */

import { useState, useEffect, useMemo } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { format, isAfter, startOfDay, parse } from 'date-fns';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { DatePicker } from '@/components/common';
import { useStaffList } from '@/hooks/queries/use-staff';
import { useBranchContext } from '@/hooks/use-branch-context';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', color: 'bg-primary' },
  { value: 'absent', label: 'Absent', color: 'bg-destructive' },
  { value: 'on_leave', label: 'On Leave', color: 'bg-warning' },
  { value: 'not_marked', label: 'Not Marked', color: 'bg-muted-foreground' },
] as const;

export interface AttendanceFiltersState {
  dateFrom: string;
  dateTo: string;
  statuses: string[];
  staffIds: string[];
}

interface AttendanceFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: AttendanceFiltersState;
  onFiltersChange: (filters: AttendanceFiltersState) => void;
}

export function AttendanceFiltersSheet({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: AttendanceFiltersSheetProps) {
  const t = useTranslations('staff.attendance');
  const { branchId } = useBranchContext();

  const [localFilters, setLocalFilters] = useState<AttendanceFiltersState>(filters);
  const [staffSearch, setStaffSearch] = useState('');

  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
      setStaffSearch('');
    }
  }, [open, filters]);

  const { data: staffData } = useStaffList({ branchId: branchId || '', limit: 100 });

  const staffMembers = useMemo(
    () =>
      (staffData?.data || []).map((s) => ({
        id: s.user?.id || s.userId,
        name: s.user?.name || 'Unknown',
      })),
    [staffData]
  );

  const filteredStaff = useMemo(
    () =>
      staffSearch
        ? staffMembers.filter((s) => s.name.toLowerCase().includes(staffSearch.toLowerCase()))
        : staffMembers,
    [staffMembers, staffSearch]
  );

  // Parse dates safely (avoid timezone shift from parseISO)
  const dateFromValue = localFilters.dateFrom
    ? parse(localFilters.dateFrom, 'yyyy-MM-dd', new Date())
    : undefined;
  const dateToValue = localFilters.dateTo
    ? parse(localFilters.dateTo, 'yyyy-MM-dd', new Date())
    : undefined;

  const handleDateFromChange = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    if (dateToValue && isAfter(startOfDay(date), startOfDay(dateToValue))) {
      setLocalFilters({ ...localFilters, dateFrom: dateStr, dateTo: dateStr });
    } else {
      setLocalFilters({ ...localFilters, dateFrom: dateStr });
    }
  };

  const handleDateToChange = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    if (dateFromValue && isAfter(startOfDay(dateFromValue), startOfDay(date))) {
      setLocalFilters({ ...localFilters, dateFrom: dateStr, dateTo: dateStr });
    } else {
      setLocalFilters({ ...localFilters, dateTo: dateStr });
    }
  };

  const toggleStatus = (status: string) => {
    const next = localFilters.statuses.includes(status)
      ? localFilters.statuses.filter((s) => s !== status)
      : [...localFilters.statuses, status];
    setLocalFilters({ ...localFilters, statuses: next });
  };

  const toggleStaff = (staffId: string) => {
    const next = localFilters.staffIds.includes(staffId)
      ? localFilters.staffIds.filter((id) => id !== staffId)
      : [...localFilters.staffIds, staffId];
    setLocalFilters({ ...localFilters, staffIds: next });
  };

  const handleReset = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const reset: AttendanceFiltersState = {
      dateFrom: today,
      dateTo: today,
      statuses: [],
      staffIds: [],
    };
    setLocalFilters(reset);
    onFiltersChange(reset);
    onOpenChange(false);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const activeCount = localFilters.statuses.length + localFilters.staffIds.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col p-0">
        <SheetHeader className="px-4 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('filters')}
            {activeCount > 0 && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                {activeCount}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Date Range */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
                <DatePicker
                  value={dateFromValue}
                  onChange={handleDateFromChange}
                  placeholder="Start date"
                  className="w-full"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
                <DatePicker
                  value={dateToValue}
                  onChange={handleDateToChange}
                  placeholder="End date"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Staff Filter */}
          {staffMembers.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-3 block">
                Staff
                {localFilters.staffIds.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({localFilters.staffIds.length} selected)
                  </span>
                )}
              </Label>
              {staffMembers.length > 6 && (
                <Input
                  placeholder="Search staff..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="mb-2"
                />
              )}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredStaff.map((staff) => (
                  <div key={staff.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`staff-${staff.id}`}
                      checked={localFilters.staffIds.includes(staff.id)}
                      onCheckedChange={() => toggleStaff(staff.id)}
                    />
                    <Label htmlFor={`staff-${staff.id}`} className="cursor-pointer">
                      {staff.name}
                    </Label>
                  </div>
                ))}
                {filteredStaff.length === 0 && (
                  <p className="text-xs text-muted-foreground py-1">No staff found</p>
                )}
              </div>
            </div>
          )}

          {/* Status Filter */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Status
              {localFilters.statuses.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({localFilters.statuses.length} selected)
                </span>
              )}
            </Label>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((status) => (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`att-status-${status.value}`}
                    checked={localFilters.statuses.includes(status.value)}
                    onCheckedChange={() => toggleStatus(status.value)}
                  />
                  <Label
                    htmlFor={`att-status-${status.value}`}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className={`w-3 h-3 rounded-full ${status.color}`} />
                    {status.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <SheetFooter className="px-4 py-4 border-t gap-2">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
