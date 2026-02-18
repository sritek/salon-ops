'use client';

/**
 * Operational Dashboard Component
 * For receptionist and stylist roles
 * Shows timeline, queue, and attention items
 */

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { NextUpQueue, AttentionItems, LiveTimeline } from '@/components/ux/command-center';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { AttentionItem, CommandCenterData } from '@/types/dashboard';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  mobileDefaultOpen?: boolean;
  className?: string;
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  mobileDefaultOpen,
  className,
}: CollapsibleSectionProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only showing after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (isMobile && mobileDefaultOpen !== undefined) {
        setIsOpen(mobileDefaultOpen);
      } else {
        setIsOpen(defaultOpen);
      }
    }
  }, [mounted, isMobile, defaultOpen, mobileDefaultOpen]);

  // During SSR and initial hydration, show a simple non-collapsible version
  if (!mounted) {
    return (
      <div className={cn('', className)}>
        <h2 className="text-lg font-semibold mb-3">{title}</h2>
        <div>{children}</div>
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      {/* Mobile: Collapsible button */}
      {isMobile ? (
        <button
          className="flex items-center justify-between w-full py-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="text-lg font-semibold">{title}</span>
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      ) : (
        <h2 className="text-lg font-semibold mb-3">{title}</h2>
      )}
      <div className={cn(isMobile && !isOpen && 'hidden')}>{children}</div>
    </div>
  );
}

interface OperationalDashboardProps {
  data: CommandCenterData | undefined;
  isLoading: boolean;
  currentTime: Date;
  onTimelineSlotClick: (stylistId: string, time: string) => void;
  onAppointmentClick: (id: string) => void;
  onCheckIn: (id: string) => void;
  onCallWalkIn: (id: string) => void;
  onAttentionItemClick: (item: AttentionItem) => void;
  onDismissAttention: (id: string) => void;
}

export function OperationalDashboard({
  data,
  isLoading,
  currentTime,
  onTimelineSlotClick,
  onAppointmentClick,
  onCheckIn,
  onCallWalkIn,
  onAttentionItemClick,
  onDismissAttention,
}: OperationalDashboardProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Column - Timeline (2/3 width on desktop) */}
      <div className="lg:col-span-2 space-y-6">
        <CollapsibleSection title="Timeline" defaultOpen={true} mobileDefaultOpen={false}>
          <LiveTimeline
            entries={data?.timeline || []}
            currentTime={currentTime}
            isLoading={isLoading}
            onSlotClick={onTimelineSlotClick}
            onAppointmentClick={onAppointmentClick}
          />
        </CollapsibleSection>
      </div>

      {/* Right Column - Queue and Attention (1/3 width on desktop) */}
      <div className="space-y-6">
        <CollapsibleSection title="Next Up" defaultOpen={true} mobileDefaultOpen={true}>
          <NextUpQueue
            appointments={data?.nextUp.appointments || []}
            walkIns={data?.nextUp.walkIns || []}
            isLoading={isLoading}
            onAppointmentClick={onAppointmentClick}
            onCheckIn={onCheckIn}
            onCallWalkIn={onCallWalkIn}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Needs Attention" defaultOpen={true} mobileDefaultOpen={true}>
          <AttentionItems
            items={data?.attentionItems || []}
            isLoading={isLoading}
            onItemClick={onAttentionItemClick}
            onDismiss={onDismissAttention}
          />
        </CollapsibleSection>
      </div>
    </div>
  );
}
