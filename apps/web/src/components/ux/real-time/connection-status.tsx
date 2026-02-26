'use client';

/**
 * Connection Status Indicator
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 9.5, 2.5, 2.7
 */

import { Wifi, WifiOff, Loader2, RefreshCw, Radio } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useConnectionStatus, type ConnectionStatus } from '@/stores/real-time-store';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const STATUS_CONFIG: Record<
  ConnectionStatus,
  {
    icon: typeof Wifi;
    label: string;
    color: string;
    bgColor: string;
    animate?: boolean;
  }
> = {
  connecting: {
    icon: Loader2,
    label: 'Connecting...',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    animate: true,
  },
  connected: {
    icon: Wifi,
    label: 'Live',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  disconnected: {
    icon: WifiOff,
    label: 'Offline',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  reconnecting: {
    icon: RefreshCw,
    label: 'Reconnecting...',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    animate: true,
  },
  polling: {
    icon: Radio,
    label: 'Polling',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  disabled: {
    icon: WifiOff,
    label: 'Real-time disabled',
    color: 'text-gray-400',
    bgColor: 'bg-gray-100',
  },
};

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
}

export function ConnectionStatus({ className, showLabel = false }: ConnectionStatusProps) {
  const status = useConnectionStatus();
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2 py-1',
              config.bgColor,
              className
            )}
          >
            <Icon className={cn('h-3.5 w-3.5', config.color, config.animate && 'animate-spin')} />
            {showLabel && (
              <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
