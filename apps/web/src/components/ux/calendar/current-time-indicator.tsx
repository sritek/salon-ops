/**
 * Current Time Indicator Component
 * Red line showing current time on the calendar
 */

'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface CurrentTimeIndicatorProps {
  workingHours: { start: string; end: string };
  timeSlotInterval: number;
  slotHeight: number;
}

export function CurrentTimeIndicator({
  workingHours,
  timeSlotInterval,
  slotHeight,
}: CurrentTimeIndicatorProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Calculate position
  const now = currentTime;
  const currentTimeStr = format(now, 'HH:mm');
  const [startHour, startMin] = workingHours.start.split(':').map(Number);
  const [endHour, endMin] = workingHours.end.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Check if current time is within working hours
  if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
    return null;
  }

  // Calculate top position
  const minutesSinceStart = currentMinutes - startMinutes;
  const topPosition = (minutesSinceStart / timeSlotInterval) * slotHeight;

  return (
    <div
      className="absolute left-0 right-0 z-30 pointer-events-none"
      style={{ top: `${topPosition}px` }}
    >
      {/* Time label */}
      <div className="absolute -left-1 -top-2.5 bg-red-500 text-white text-xs px-1 py-0.5 rounded">
        {currentTimeStr}
      </div>
      {/* Line */}
      <div className="h-0.5 bg-red-500 w-full" />
      {/* Circle indicator */}
      <div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
    </div>
  );
}
