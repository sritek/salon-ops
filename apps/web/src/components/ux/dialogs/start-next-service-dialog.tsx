'use client';

/**
 * Start Next Service Dialog
 *
 * Dialog for starting the next service in a multi-service appointment.
 * Allows station selection and optional stylist override.
 * Shows station grid with status badges (consistent with StartServiceDialog).
 * Shows stylist availability when overriding.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  PlayCircle,
  Armchair,
  AlertCircle,
  Loader2,
  Scissors,
  Clock,
  User,
  CheckCircle,
  XCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFloorView } from '@/hooks/queries/use-stations';
import { useStartService, useStylistAvailability } from '@/hooks/queries/use-appointments';
import { useStaffList } from '@/hooks/queries/use-staff';
import { useBranchContext } from '@/hooks/use-branch-context';
import { cn } from '@/lib/utils';
import { isPendingAppointment } from '@/lib/appointment-helpers';
import { toast } from 'sonner';
import type { UpNextService, FloorViewStatus } from '@/types/stations';

interface StartNextServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  service: UpNextService;
  currentStationId?: string;
  onSuccess?: () => void;
}

// Station status configuration (consistent with StartServiceDialog)
const statusConfig: Record<FloorViewStatus, { bg: string; text?: string; label: string }> = {
  available: {
    bg: 'bg-green-400',
    label: 'Available',
  },
  occupied: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Occupied',
  },
  reserved: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    label: 'Reserved',
  },
  out_of_service: {
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'text-gray-400',
    label: 'Out of Service',
  },
};

export function StartNextServiceDialog({
  open,
  onOpenChange,
  appointmentId,
  service,
  currentStationId,
  onSuccess,
}: StartNextServiceDialogProps) {
  const { branchId } = useBranchContext();
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    currentStationId || null
  );
  const [overrideStylist, setOverrideStylist] = useState(false);
  const [selectedStylistId, setSelectedStylistId] = useState<string | null>(
    service.assignedStylistId
  );
  const [showPendingWarning, setShowPendingWarning] = useState(false);
  const [pendingStationData, setPendingStationData] = useState<{
    stationId: string;
    stationName: string;
    appointment: any;
  } | null>(null);

  const { data: floorViewData, isLoading: stationsLoading } = useFloorView(branchId || '');
  const { data: staffData, isLoading: stylistsLoading } = useStaffList({
    branchId: branchId || undefined,
    role: 'stylist',
    isActive: true,
  });
  const startServiceMutation = useStartService();

  // Check stylist availability when override is enabled
  const stylistToCheck = overrideStylist ? selectedStylistId : null;

  // For conflict detection when starting a service, we check availability for NOW
  // because the service will start immediately when the user clicks "Start Service"
  // The estimatedStartTime is only used for display purposes
  // We use useMemo with `open` dependency to recalculate when dialog opens
  const { availabilityDate, availabilityTime } = useMemo(() => {
    const now = new Date();
    return {
      availabilityDate: now.toLocaleDateString('en-CA'), // YYYY-MM-DD format
      availabilityTime: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
    };
  }, [open]); // Recalculate when dialog opens

  const { data: availabilityData, isLoading: availabilityLoading } = useStylistAvailability(
    stylistToCheck || '',
    availabilityDate,
    availabilityTime,
    service.durationMinutes,
    { enabled: !!stylistToCheck && open }
  );

  const isLoading = startServiceMutation.isPending;

  // Handle station selection with pending appointment check
  const handleStationSelect = useCallback(
    (stationId: string) => {
      const station = floorViewData?.stations.find((s) => s.id === stationId);
      if (!station) return;

      // Check if station has a pending appointment
      if (station.appointment && isPendingAppointment(station.appointment)) {
        setPendingStationData({
          stationId,
          stationName: station.name,
          appointment: station.appointment,
        });
        setShowPendingWarning(true);
        return;
      }

      // If no pending appointment, select the station
      setSelectedStationId(stationId);
    },
    [floorViewData?.stations]
  );

  const handleStart = useCallback(() => {
    if (!selectedStationId) {
      toast.error('Please select a station');
      return;
    }

    startServiceMutation.mutate(
      {
        appointmentId,
        serviceId: service.id,
        stationId: selectedStationId,
        actualStylistId: overrideStylist ? selectedStylistId || undefined : undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Started ${service.serviceName}`);
          onOpenChange(false);
          setSelectedStationId(null);
          setOverrideStylist(false);
          onSuccess?.();
        },
        onError: (error: Error & { response?: { data?: { error?: { message?: string } } } }) => {
          const message = error?.response?.data?.error?.message || 'Failed to start service';
          toast.error(message);
        },
      }
    );
  }, [
    appointmentId,
    service.id,
    service.serviceName,
    selectedStationId,
    overrideStylist,
    selectedStylistId,
    startServiceMutation,
    onOpenChange,
    onSuccess,
  ]);

  const handleClose = useCallback(() => {
    // Don't allow closing while operation is in progress
    if (isLoading) {
      return;
    }
    setSelectedStationId(currentStationId || null);
    setOverrideStylist(false);
    setSelectedStylistId(service.assignedStylistId);
    setShowPendingWarning(false);
    setPendingStationData(null);
    onOpenChange(false);
  }, [onOpenChange, currentStationId, service.assignedStylistId, isLoading]);

  // Reset state when dialog opens
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      // Don't allow closing while operation is in progress
      if (!newOpen && isLoading) {
        return;
      }
      if (newOpen) {
        setSelectedStationId(currentStationId || null);
        setOverrideStylist(false);
        setSelectedStylistId(service.assignedStylistId);
        setShowPendingWarning(false);
        setPendingStationData(null);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, currentStationId, service.assignedStylistId, isLoading]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-2xl"
          onPointerDownOutside={(e) => {
            // Prevent closing by clicking outside while pending
            if (isLoading) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing by escape key while pending
            if (isLoading) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              Start Next Service
            </DialogTitle>
            <DialogDescription>
              Start the next service in this multi-service appointment
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* Service Info */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{service.serviceName}</span>
                </div>
                <Badge variant="outline">{service.durationMinutes} min</Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span>{service.customerName}</span>
                </div>
                {service.assignedStylistName && (
                  <div className="flex items-center gap-1.5">
                    <Scissors className="h-3.5 w-3.5" />
                    <span>Assigned: {service.assignedStylistName}</span>
                  </div>
                )}
                {service.estimatedStartTime && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      Est.{' '}
                      {new Date(service.estimatedStartTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Station Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Armchair className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Select Station</span>
                <span className="text-xs text-red-500">*</span>
              </div>

              {stationsLoading ? (
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : !floorViewData?.stations || floorViewData.stations.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-lg">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No stations available</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto px-2 py-1">
                  {floorViewData.stations.map((station) => {
                    const config = statusConfig[station.status];
                    const isCurrent = station.id === currentStationId;

                    return (
                      <button
                        key={station.id}
                        onClick={() => handleStationSelect(station.id)}
                        disabled={isLoading}
                        className={cn(
                          'relative p-3 rounded-lg border-2 transition-all text-left',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          selectedStationId === station.id
                            ? 'border-primary bg-primary/5 ring-2 ring-primary'
                            : 'border-border hover:border-primary/50 hover:bg-accent/50'
                        )}
                      >
                        {/* Station Name */}
                        <p className="font-medium text-sm truncate">{station.name}</p>

                        <div className="flex justify-between items-center mt-1">
                          {/* Station Type */}
                          <p className="text-xs text-muted-foreground truncate">
                            {station.stationType?.name}
                          </p>
                          {/* Status Badge */}
                          <div className="flex items-center gap-1">
                            {isCurrent && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Current
                              </Badge>
                            )}
                            <Badge
                              className={cn('text-[10px] px-2 py-0.5', config.bg, config.text)}
                              variant="outline"
                            >
                              {config.label}
                            </Badge>
                          </div>
                        </div>

                        {/* Selection Indicator */}
                        {selectedStationId === station.id && (
                          <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Stylist Override */}
            <div className="border-t pt-4">
              <div className="flex items-center space-x-2 mb-3">
                <Checkbox
                  id="override-stylist"
                  checked={overrideStylist}
                  onCheckedChange={(checked) => setOverrideStylist(checked === true)}
                  disabled={isLoading}
                />
                <Label
                  htmlFor="override-stylist"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Override assigned stylist
                </Label>
              </div>

              {overrideStylist && (
                <div className="ml-6 space-y-3">
                  <div>
                    <Label
                      htmlFor="stylist-select"
                      className="text-xs text-muted-foreground mb-1.5 block"
                    >
                      Select different stylist
                    </Label>
                    <Select
                      value={selectedStylistId || ''}
                      onValueChange={setSelectedStylistId}
                      disabled={isLoading || stylistsLoading}
                    >
                      <SelectTrigger id="stylist-select" className="w-full">
                        <SelectValue placeholder="Select stylist" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffData?.data?.map((stylist) => (
                          <SelectItem key={stylist.id} value={stylist.userId}>
                            {stylist.user?.name || 'Unknown'}
                            {stylist.userId === service.assignedStylistId &&
                              ' (Originally Assigned)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Stylist Availability Feedback */}
                  {selectedStylistId && selectedStylistId !== service.assignedStylistId && (
                    <div
                      className={cn(
                        'p-3 rounded-lg border flex items-start gap-2',
                        availabilityLoading
                          ? 'bg-gray-50 border-gray-200'
                          : availabilityData?.available
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                      )}
                    >
                      {availabilityLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-gray-500 mt-0.5" />
                          <span className="text-sm text-gray-600">Checking availability...</span>
                        </>
                      ) : availabilityData?.available ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-green-900">
                              Stylist is available
                            </p>
                            <p className="text-xs text-green-700">
                              No conflicting appointments during this time slot
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-900">Stylist is busy</p>
                            <p className="text-xs text-red-700">
                              {availabilityData?.conflictReason ||
                                'Has a conflicting appointment during this time'}
                            </p>
                            {availabilityData?.conflictingAppointment && (
                              <p className="text-xs text-red-600 mt-1">
                                Conflict: {availabilityData.conflictingAppointment.customerName} at{' '}
                                {availabilityData.conflictingAppointment.scheduledTime}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleStart} disabled={isLoading || !selectedStationId}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start Service
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Appointment Warning Dialog */}
      {showPendingWarning && pendingStationData && (
        <Dialog open={showPendingWarning} onOpenChange={setShowPendingWarning}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Pending Appointment
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-red-900">
                  Station &ldquo;{pendingStationData.stationName}&rdquo; has an incomplete
                  appointment
                </p>
                <div className="text-sm text-red-700 space-y-1">
                  <p>
                    <span className="font-medium">Customer:</span>{' '}
                    {pendingStationData.appointment.customerName}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span>{' '}
                    {pendingStationData.appointment.scheduledDate}
                  </p>
                  <p>
                    <span className="font-medium">Time:</span>{' '}
                    {pendingStationData.appointment.scheduledTime}
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Please complete or deassign the previous appointment before assigning a new one to
                this station.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPendingWarning(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
