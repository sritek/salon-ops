'use client';

/**
 * Walk-In Queue Panel Component
 * Displays and manages walk-in queue in Command Center
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Phone, MoreVertical, X, Crown, AlertTriangle, Users, Timer } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';

interface WalkInEntry {
  id: string;
  tokenNumber: number;
  customer: {
    id: string;
    name: string;
    phone: string;
    isVip?: boolean;
  };
  requestedService?: {
    id: string;
    name: string;
  };
  assignedStylist?: {
    id: string;
    name: string;
  };
  status: 'waiting' | 'called' | 'serving' | 'completed' | 'left';
  position: number;
  estimatedWaitMinutes: number;
  waitingSince: string;
  priority: number;
}

interface QueueStats {
  totalWaiting: number;
  averageWaitMinutes: number;
  longestWaitMinutes: number;
}

interface WalkInQueuePanelProps {
  branchId: string;
  /** Threshold in minutes to highlight long-waiting customers */
  longWaitThreshold?: number;
  className?: string;
}

// Draggable walk-in item
function DraggableWalkInItem({
  entry,
  longWaitThreshold,
  onCall,
  onMarkLeft,
}: {
  entry: WalkInEntry;
  longWaitThreshold: number;
  onCall: () => void;
  onMarkLeft: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `walk-in-${entry.id}`,
    data: { type: 'walk-in', entry },
  });

  const waitingMinutes = Math.floor((Date.now() - new Date(entry.waitingSince).getTime()) / 60000);
  const isLongWait = waitingMinutes >= longWaitThreshold;

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'p-3 rounded-lg border bg-card cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50 shadow-lg',
        isLongWait && 'border-orange-500 bg-orange-50 dark:bg-orange-950/20',
        entry.customer.isVip && 'border-yellow-500'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {/* Token number */}
          <div
            className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg',
              entry.status === 'called'
                ? 'bg-blue-500 text-white'
                : entry.status === 'serving'
                  ? 'bg-green-500 text-white'
                  : 'bg-muted'
            )}
          >
            {entry.tokenNumber}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{entry.customer.name}</span>
              {entry.customer.isVip && <Crown className="h-4 w-4 text-yellow-500" />}
              {isLongWait && <AlertTriangle className="h-4 w-4 text-orange-500" />}
            </div>
            <div className="text-sm text-muted-foreground">
              {entry.requestedService?.name || 'Any service'}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              <span>
                Waiting {waitingMinutes} min
                {entry.estimatedWaitMinutes > 0 && ` • Est. ${entry.estimatedWaitMinutes} min`}
              </span>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {entry.status === 'waiting' && (
              <DropdownMenuItem onClick={onCall}>
                <Phone className="mr-2 h-4 w-4" />
                Call Customer
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onMarkLeft} className="text-red-600">
              <X className="mr-2 h-4 w-4" />
              Mark as Left
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status badge */}
      {entry.status !== 'waiting' && (
        <Badge variant={entry.status === 'called' ? 'default' : 'secondary'} className="mt-2">
          {entry.status === 'called'
            ? 'Called'
            : entry.status === 'serving'
              ? 'Serving'
              : entry.status}
        </Badge>
      )}
    </div>
  );
}

export function WalkInQueuePanel({
  branchId,
  longWaitThreshold = 15,
  className,
}: WalkInQueuePanelProps) {
  const queryClient = useQueryClient();
  const [leftDialogOpen, setLeftDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WalkInEntry | null>(null);
  const [leftReason, setLeftReason] = useState('');

  // Fetch queue
  const { data, isLoading } = useQuery({
    queryKey: ['walk-in-queue', branchId],
    queryFn: async () => {
      const response = await api.get<{
        data: { entries: WalkInEntry[]; stats: QueueStats };
      }>(`/appointments/walk-in-queue?branchId=${branchId}`);
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Call customer mutation
  const callMutation = useMutation({
    mutationFn: async (entryId: string) => {
      await api.post(`/appointments/walk-in-queue/${entryId}/call`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walk-in-queue', branchId] });
      toast.success('Customer called');
    },
    onError: () => {
      toast.error('Failed to call customer');
    },
  });

  // Mark as left mutation
  const markLeftMutation = useMutation({
    mutationFn: async ({ entryId, reason }: { entryId: string; reason?: string }) => {
      await api.post(`/appointments/walk-in-queue/${entryId}/left`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walk-in-queue', branchId] });
      toast.success('Customer marked as left');
      setLeftDialogOpen(false);
      setSelectedEntry(null);
      setLeftReason('');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  const handleCall = useCallback(
    (entry: WalkInEntry) => {
      callMutation.mutate(entry.id);
    },
    [callMutation]
  );

  const handleMarkLeft = useCallback((entry: WalkInEntry) => {
    setSelectedEntry(entry);
    setLeftDialogOpen(true);
  }, []);

  const confirmMarkLeft = useCallback(() => {
    if (selectedEntry) {
      markLeftMutation.mutate({
        entryId: selectedEntry.id,
        reason: leftReason || undefined,
      });
    }
  }, [selectedEntry, leftReason, markLeftMutation]);

  const entries = data?.entries || [];
  const stats = data?.stats;
  const waitingEntries = entries.filter((e) => e.status === 'waiting' || e.status === 'called');

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Walk-In Queue
            </CardTitle>
            {stats && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {stats.totalWaiting} waiting
                </span>
                <span className="flex items-center gap-1">
                  <Timer className="h-3 w-3" />~{stats.averageWaitMinutes} min avg
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {waitingEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No walk-ins waiting</p>
            </div>
          ) : (
            <div className="space-y-2">
              {waitingEntries.map((entry) => (
                <DraggableWalkInItem
                  key={entry.id}
                  entry={entry}
                  longWaitThreshold={longWaitThreshold}
                  onCall={() => handleCall(entry)}
                  onMarkLeft={() => handleMarkLeft(entry)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mark as Left Dialog */}
      <Dialog open={leftDialogOpen} onOpenChange={setLeftDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Left</DialogTitle>
            <DialogDescription>
              Mark {selectedEntry?.customer.name} as left without service. You can optionally add a
              reason.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason (optional)"
              value={leftReason}
              onChange={(e) => setLeftReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeftDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmMarkLeft}
              disabled={markLeftMutation.isPending}
            >
              Mark as Left
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
