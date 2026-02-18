/**
 * Dashboard Types
 * Types for Command Center dashboard
 */

export interface Station {
  id: string;
  name: string;
  stylistId: string | null;
  stylistName: string | null;
  stylistAvatar: string | null;
  status: 'available' | 'occupied' | 'break' | 'offline';
  currentAppointment: {
    id: string;
    customerName: string;
    serviceName: string;
    startTime: string;
    endTime: string;
    progress: number;
    timeRemaining: number;
  } | null;
}

export interface UpcomingAppointment {
  id: string;
  customerName: string;
  customerPhone: string;
  scheduledTime: string;
  services: string[];
  stylistName: string;
  status: 'booked' | 'confirmed' | 'checked_in';
  isLate: boolean;
}

export interface WalkInEntry {
  id: string;
  tokenNumber: number;
  customerName: string;
  services: string[];
  waitTime: number;
  status: 'waiting' | 'called' | 'serving';
}

export interface AttentionItem {
  id: string;
  type:
    | 'late_arrival'
    | 'pending_checkout'
    | 'walk_in_waiting'
    | 'low_stock'
    | 'pending_approval'
    | 'no_show_risk';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  entityType: 'appointment' | 'customer' | 'inventory' | 'expense';
  entityId: string;
  createdAt: string;
}

export interface TimelineAppointment {
  id: string;
  startTime: string;
  endTime: string;
  customerName: string;
  status: string;
}

export interface StylistSchedule {
  stylistId: string;
  stylistName: string;
  avatar: string | null;
  appointments: TimelineAppointment[];
}

// Alias for LiveTimeline component
export type TimelineEntry = StylistSchedule;

export interface QuickStats {
  todayRevenue: number;
  revenueChange: number;
  appointmentsCompleted: number;
  appointmentsRemaining: number;
  walkInsServed: number;
  averageWaitTime: number;
  noShows: number;
  occupancyRate: number;
}

export interface CommandCenterData {
  stats: QuickStats;
  stations: Station[];
  nextUp: {
    appointments: UpcomingAppointment[];
    walkIns: WalkInEntry[];
  };
  attentionItems: AttentionItem[];
  timeline: StylistSchedule[];
}
