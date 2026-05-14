import { PrismaClient } from '@prisma/client';
import { format, addDays } from 'date-fns';
import type { GetAvailableSlotsInput } from './appointments.schema';

/**
 * Parse a date string (yyyy-MM-dd) to UTC midnight Date
 */
function parseToUTCDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Get day of week from a date string (0 = Sunday, 6 = Saturday)
 */
function getDayOfWeek(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getDay();
}

interface WorkingHours {
  [key: string]: { start: string; end: string; closed?: boolean } | undefined;
}

interface TimeSlot {
  time: string;
  available: boolean;
  stylistId?: string;
  stylistName?: string;
}

interface StylistInfo {
  id: string;
  name: string;
  gender: string | null;
}

export class AvailabilityService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get available time slots for a branch/date/services
   */
  async getAvailableSlots(tenantId: string, input: GetAvailableSlotsInput) {
    const { branchId, date, serviceIds, stylistId, genderPreference } = input;

    // 1. Get branch working hours for the day
    const workingHours = await this.getBranchWorkingHours(branchId, date);
    if (!workingHours) {
      return {
        date,
        slots: [],
        nextAvailableDate: await this.findNextAvailableDate(branchId, date),
      };
    }

    // 2. Calculate total duration needed
    const totalDuration = await this.calculateTotalDuration(tenantId, serviceIds);

    // 3. Get eligible stylists
    const stylists = await this.getEligibleStylists(
      tenantId,
      branchId,
      stylistId,
      genderPreference
    );

    if (stylists.length === 0) {
      return {
        date,
        slots: [],
        nextAvailableDate: await this.findNextAvailableDate(branchId, date),
      };
    }

    // 4. Generate all possible slots based on working hours
    const allSlots = this.generateTimeSlots(workingHours.start, workingHours.end, 15); // 15-min intervals

    // 5. For each slot, check if any stylist is available
    const availableSlots: TimeSlot[] = [];

    for (const slotTime of allSlots) {
      // Check if slot + duration fits within working hours
      const slotEndTime = this.addMinutes(slotTime, totalDuration);
      if (slotEndTime > workingHours.end) continue;

      // Find an available stylist for this slot
      for (const stylist of stylists) {
        const isAvailable = await this.isStylistAvailable(
          tenantId,
          stylist.id,
          date,
          slotTime,
          totalDuration
        );

        if (isAvailable) {
          availableSlots.push({
            time: slotTime,
            available: true,
            stylistId: stylist.id,
            stylistName: stylist.name,
          });
          break; // Found one available stylist, move to next slot
        }
      }
    }

    // Remove duplicates (same time, different stylists)
    const uniqueSlots = this.deduplicateSlots(availableSlots);

    return {
      date,
      slots: uniqueSlots,
      nextAvailableDate:
        uniqueSlots.length === 0 ? await this.findNextAvailableDate(branchId, date) : undefined,
    };
  }

  /**
   * Check if a specific slot is available for a stylist
   */
  async isSlotAvailable(
    tenantId: string,
    branchId: string,
    stylistId: string,
    date: string,
    startTime: string,
    duration: number
  ): Promise<boolean> {
    // Check branch working hours
    const workingHours = await this.getBranchWorkingHours(branchId, date);
    if (!workingHours) return false;

    const endTime = this.addMinutes(startTime, duration);
    if (startTime < workingHours.start || endTime > workingHours.end) {
      return false;
    }

    return this.isStylistAvailable(tenantId, stylistId, date, startTime, duration);
  }

  /**
   * Get available stylists for a specific time slot
   */
  async getAvailableStylists(
    tenantId: string,
    branchId: string,
    date: string,
    time: string,
    duration: number,
    genderPreference?: string
  ) {
    const stylists = await this.getEligibleStylists(
      tenantId,
      branchId,
      undefined,
      genderPreference
    );

    const availableStylists = [];
    for (const stylist of stylists) {
      const isAvailable = await this.isStylistAvailable(tenantId, stylist.id, date, time, duration);
      if (isAvailable) {
        availableStylists.push({
          ...stylist,
          isAvailable: true,
        });
      }
    }

    return availableStylists;
  }

  /**
   * Auto-assign stylist based on preferences and workload
   */
  async autoAssignStylist(
    tenantId: string,
    branchId: string,
    date: string,
    time: string,
    duration: number,
    genderPreference?: string
  ): Promise<string | null> {
    const availableStylists = await this.getAvailableStylists(
      tenantId,
      branchId,
      date,
      time,
      duration,
      genderPreference
    );

    if (availableStylists.length === 0) return null;

    // Get workload for each stylist (count of appointments for the day)
    const workloads = await Promise.all(
      availableStylists.map(async (stylist) => {
        const count = await this.prisma.appointment.count({
          where: {
            tenantId,
            stylistId: stylist.id,
            scheduledDate: parseToUTCDate(date),
            status: { notIn: ['cancelled', 'no_show', 'rescheduled'] },
          },
        });
        return { stylistId: stylist.id, count };
      })
    );

    // Select stylist with least workload
    workloads.sort((a, b) => a.count - b.count);
    return workloads[0].stylistId;
  }

  /**
   * Get branch working hours for a specific date
   */
  private async getBranchWorkingHours(
    branchId: string,
    date: string
  ): Promise<{ start: string; end: string } | null> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { workingHours: true, settings: true },
    });

    if (!branch?.workingHours) return null;

    const workingHours = branch.workingHours as WorkingHours;
    const dayOfWeek = getDayOfWeek(date);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];

    const dayHours = workingHours[dayName];
    if (!dayHours || dayHours.closed) return null;

    return { start: dayHours.start, end: dayHours.end };
  }

  /**
   * Calculate total duration from service IDs
   */
  private async calculateTotalDuration(tenantId: string, serviceIds: string[]): Promise<number> {
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        tenantId,
      },
      select: { durationMinutes: true },
    });

    return services.reduce((sum, s) => sum + s.durationMinutes, 0);
  }

  /**
   * Get eligible stylists for a branch
   */
  private async getEligibleStylists(
    tenantId: string,
    branchId: string,
    specificStylistId?: string,
    genderPreference?: string
  ): Promise<StylistInfo[]> {
    const where: any = {
      tenantId,
      role: 'stylist',
      isActive: true,
      deletedAt: null,
      branchAssignments: {
        some: { branchId },
      },
    };

    if (specificStylistId) {
      where.id = specificStylistId;
    }

    if (genderPreference && genderPreference !== 'any') {
      where.gender = genderPreference;
    }

    const stylists = await this.prisma.user.findMany({
      where,
      select: { id: true, name: true, gender: true },
    });

    return stylists;
  }

  /**
   * Check if a stylist is available for a time slot
   */
  private async isStylistAvailable(
    tenantId: string,
    stylistId: string,
    date: string,
    startTime: string,
    duration: number
  ): Promise<boolean> {
    const endTime = this.addMinutes(startTime, duration);
    const dateObj = parseToUTCDate(date);

    // Check for blocked slots (full day or overlapping)
    const blockedSlots = await this.prisma.stylistBlockedSlot.findMany({
      where: {
        tenantId,
        stylistId,
        blockedDate: dateObj,
      },
    });

    for (const block of blockedSlots) {
      if (block.isFullDay) return false;
      if (block.startTime && block.endTime) {
        if (this.timesOverlap(startTime, endTime, block.startTime, block.endTime)) {
          return false;
        }
      }
    }

    // Check for breaks
    const dayOfWeek = getDayOfWeek(date);
    const breaks = await this.prisma.stylistBreak.findMany({
      where: {
        tenantId,
        stylistId,
        isActive: true,
        OR: [{ dayOfWeek: null }, { dayOfWeek }],
      },
    });

    for (const brk of breaks) {
      if (this.timesOverlap(startTime, endTime, brk.startTime, brk.endTime)) {
        return false;
      }
    }

    // Check for existing appointments where stylist is primary
    const primaryAppointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        stylistId,
        scheduledDate: dateObj,
        status: { notIn: ['cancelled', 'no_show', 'rescheduled'] },
        deletedAt: null,
      },
      select: {
        scheduledTime: true,
        scheduledEndTime: true,
        services: {
          where: {
            OR: [{ assignedStylistId: stylistId }, { actualStylistId: stylistId }],
          },
          select: {
            scheduledStartTime: true,
            scheduledEndTime: true,
          },
        },
      },
    });

    // Check for appointments where stylist is assigned to services (but not primary)
    const serviceAppointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        scheduledDate: dateObj,
        status: { notIn: ['cancelled', 'no_show', 'rescheduled'] },
        deletedAt: null,
        stylistId: { not: stylistId },
        services: {
          some: {
            OR: [{ assignedStylistId: stylistId }, { actualStylistId: stylistId }],
          },
        },
      },
      select: {
        scheduledTime: true,
        scheduledEndTime: true,
        services: {
          where: {
            OR: [{ assignedStylistId: stylistId }, { actualStylistId: stylistId }],
          },
          select: {
            scheduledStartTime: true,
            scheduledEndTime: true,
          },
        },
      },
    });

    const allAppointments = [...primaryAppointments, ...serviceAppointments];

    for (const apt of allAppointments) {
      // Always use the appointment's scheduledTime and scheduledEndTime for overlap check
      // These are stored as local time strings (e.g., "12:30", "13:15")
      // The per-service times are stored as UTC DateTime and would need timezone conversion
      if (this.timesOverlap(startTime, endTime, apt.scheduledTime, apt.scheduledEndTime)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate time slots between start and end
   */
  private generateTimeSlots(start: string, end: string, intervalMinutes: number): string[] {
    const slots: string[] = [];
    let current = start;

    while (current < end) {
      slots.push(current);
      current = this.addMinutes(current, intervalMinutes);
    }

    return slots;
  }

  /**
   * Add minutes to a time string
   */
  private addMinutes(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  /**
   * Check if two time ranges overlap
   */
  private timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Deduplicate slots by time
   */
  private deduplicateSlots(slots: TimeSlot[]): TimeSlot[] {
    const seen = new Set<string>();
    return slots.filter((slot) => {
      if (seen.has(slot.time)) return false;
      seen.add(slot.time);
      return true;
    });
  }

  /**
   * Get busy time slots for a stylist on a specific date
   * Returns all time ranges where the stylist is unavailable (appointments, breaks, blocked slots)
   */
  async getStylistBusySlots(
    tenantId: string,
    stylistId: string,
    branchId: string,
    date: string
  ): Promise<{
    date: string;
    stylistId: string;
    busySlots: Array<{
      startTime: string;
      endTime: string;
      type: 'appointment' | 'break' | 'blocked';
      label?: string;
    }>;
  }> {
    const dateObj = parseToUTCDate(date);
    const dayOfWeek = getDayOfWeek(date);
    const busySlots: Array<{
      startTime: string;
      endTime: string;
      type: 'appointment' | 'break' | 'blocked';
      label?: string;
    }> = [];

    // 1. Get existing appointments where stylist is the primary stylist
    const primaryAppointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        stylistId,
        scheduledDate: dateObj,
        status: { notIn: ['cancelled', 'no_show', 'rescheduled'] },
        deletedAt: null,
      },
      select: {
        id: true,
        scheduledTime: true,
        scheduledEndTime: true,
        customerName: true,
        services: {
          where: {
            OR: [{ assignedStylistId: stylistId }, { actualStylistId: stylistId }],
          },
          select: {
            scheduledStartTime: true,
            scheduledEndTime: true,
            durationMinutes: true,
          },
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    // 2. Get appointments where stylist is assigned to services (but not primary stylist)
    const serviceAppointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        scheduledDate: dateObj,
        status: { notIn: ['cancelled', 'no_show', 'rescheduled'] },
        deletedAt: null,
        stylistId: { not: stylistId }, // Exclude appointments where stylist is primary (already fetched)
        services: {
          some: {
            OR: [{ assignedStylistId: stylistId }, { actualStylistId: stylistId }],
          },
        },
      },
      select: {
        id: true,
        scheduledTime: true,
        scheduledEndTime: true,
        customerName: true,
        services: {
          where: {
            OR: [{ assignedStylistId: stylistId }, { actualStylistId: stylistId }],
          },
          select: {
            scheduledStartTime: true,
            scheduledEndTime: true,
            durationMinutes: true,
          },
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    // Combine all appointments
    const allAppointments = [...primaryAppointments, ...serviceAppointments];

    // Process appointments - always use appointment's scheduledTime/scheduledEndTime
    // These are stored as local time strings (e.g., "12:30", "13:15")
    for (const apt of allAppointments) {
      busySlots.push({
        startTime: apt.scheduledTime,
        endTime: apt.scheduledEndTime,
        type: 'appointment',
        label: apt.customerName || 'Appointment',
      });
    }

    // 2. Get breaks (recurring or specific day)
    const breaks = await this.prisma.stylistBreak.findMany({
      where: {
        tenantId,
        stylistId,
        isActive: true,
        OR: [{ dayOfWeek: null }, { dayOfWeek }],
      },
      select: {
        startTime: true,
        endTime: true,
        name: true,
      },
    });

    for (const brk of breaks) {
      busySlots.push({
        startTime: brk.startTime,
        endTime: brk.endTime,
        type: 'break',
        label: brk.name,
      });
    }

    // 3. Get blocked slots
    const blockedSlots = await this.prisma.stylistBlockedSlot.findMany({
      where: {
        tenantId,
        stylistId,
        blockedDate: dateObj,
      },
      select: {
        startTime: true,
        endTime: true,
        isFullDay: true,
        reason: true,
      },
    });

    // Get branch working hours for full day blocks
    const workingHours = await this.getBranchWorkingHours(branchId, date);

    for (const block of blockedSlots) {
      if (block.isFullDay && workingHours) {
        busySlots.push({
          startTime: workingHours.start,
          endTime: workingHours.end,
          type: 'blocked',
          label: block.reason || 'Blocked',
        });
      } else if (block.startTime && block.endTime) {
        busySlots.push({
          startTime: block.startTime,
          endTime: block.endTime,
          type: 'blocked',
          label: block.reason || 'Blocked',
        });
      }
    }

    // Sort by start time
    busySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

    return {
      date,
      stylistId,
      busySlots,
    };
  }

  /**
   * Check availability for multiple services with per-service stylist assignments
   * Calculates the correct time slot for each service based on sequence and parallel flags
   */
  async checkMultiServiceStylistAvailability(
    tenantId: string,
    date: string,
    startTime: string,
    services: Array<{
      serviceId: string;
      stylistId?: string;
      sequence: number;
      runParallel?: boolean;
      durationMinutes: number;
    }>
  ): Promise<{
    valid: boolean;
    conflicts: Array<{
      serviceId: string;
      stylistId: string;
      stylistName?: string;
      serviceName?: string;
      conflictReason: string;
      scheduledStartTime: string;
      scheduledEndTime: string;
    }>;
    serviceSchedule: Array<{
      serviceId: string;
      scheduledStartTime: string;
      scheduledEndTime: string;
    }>;
  }> {
    // Sort services by sequence
    const sortedServices = [...services].sort((a, b) => a.sequence - b.sequence);

    // Calculate scheduled times for each service
    const serviceSchedule: Array<{
      serviceId: string;
      scheduledStartTime: string;
      scheduledEndTime: string;
    }> = [];

    let currentTime = startTime;

    for (let i = 0; i < sortedServices.length; i++) {
      const service = sortedServices[i];
      let serviceStartTime: string;

      if (i === 0) {
        // First service always starts at appointment start time
        serviceStartTime = startTime;
      } else if (service.runParallel) {
        // Parallel service starts at the same time as the previous service
        serviceStartTime = serviceSchedule[i - 1].scheduledStartTime;
      } else {
        // Sequential service starts after the previous service ends
        serviceStartTime = currentTime;
      }

      const serviceEndTime = this.addMinutes(serviceStartTime, service.durationMinutes);

      serviceSchedule.push({
        serviceId: service.serviceId,
        scheduledStartTime: serviceStartTime,
        scheduledEndTime: serviceEndTime,
      });

      // Update current time to the latest end time
      if (serviceEndTime > currentTime) {
        currentTime = serviceEndTime;
      }
    }

    // Check availability for each service with an assigned stylist
    const conflicts: Array<{
      serviceId: string;
      stylistId: string;
      stylistName?: string;
      serviceName?: string;
      conflictReason: string;
      scheduledStartTime: string;
      scheduledEndTime: string;
    }> = [];

    // Get service and stylist names for better error messages
    const serviceIds = services.map((s) => s.serviceId);
    const stylistIds = services.filter((s) => s.stylistId).map((s) => s.stylistId!);

    const [serviceRecords, stylistRecords] = await Promise.all([
      this.prisma.service.findMany({
        where: { id: { in: serviceIds }, tenantId },
        select: { id: true, name: true },
      }),
      stylistIds.length > 0
        ? this.prisma.user.findMany({
            where: { id: { in: stylistIds }, tenantId },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const serviceNameMap = new Map(serviceRecords.map((s) => [s.id, s.name]));
    const stylistNameMap = new Map(stylistRecords.map((s) => [s.id, s.name]));

    for (const service of sortedServices) {
      if (!service.stylistId) continue;

      const schedule = serviceSchedule.find((s) => s.serviceId === service.serviceId);
      if (!schedule) continue;

      const duration = service.durationMinutes;
      const availability = await this.checkStylistAvailability(
        tenantId,
        service.stylistId,
        date,
        schedule.scheduledStartTime,
        duration
      );

      if (!availability.available) {
        conflicts.push({
          serviceId: service.serviceId,
          stylistId: service.stylistId,
          stylistName: stylistNameMap.get(service.stylistId),
          serviceName: serviceNameMap.get(service.serviceId),
          conflictReason: availability.conflictReason || 'Stylist is not available',
          scheduledStartTime: schedule.scheduledStartTime,
          scheduledEndTime: schedule.scheduledEndTime,
        });
      }
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
      serviceSchedule,
    };
  }

  /**
   * Find next available date
   */
  private async findNextAvailableDate(
    branchId: string,
    fromDate: string
  ): Promise<string | undefined> {
    // Parse the date string to get year, month, day
    const [year, month, day] = fromDate.split('-').map(Number);
    let date = new Date(year, month - 1, day);

    for (let i = 1; i <= 30; i++) {
      date = addDays(date, 1);
      const dateStr = format(date, 'yyyy-MM-dd');
      const workingHours = await this.getBranchWorkingHours(branchId, dateStr);
      if (workingHours) return dateStr;
    }
    return undefined;
  }

  /**
   * Check if a stylist is available for a specific time slot
   * Returns availability status and conflict details if busy
   */
  async checkStylistAvailability(
    tenantId: string,
    stylistId: string,
    date: string,
    time: string,
    duration: number
  ): Promise<{
    available: boolean;
    conflictReason?: string;
    conflictingAppointment?: {
      id: string;
      customerName: string;
      scheduledTime: string;
      scheduledDate: string;
    };
  }> {
    const endTime = this.addMinutes(time, duration);
    const dateObj = parseToUTCDate(date);

    // Check for blocked slots (full day or overlapping)
    const blockedSlots = await this.prisma.stylistBlockedSlot.findMany({
      where: {
        tenantId,
        stylistId,
        blockedDate: dateObj,
      },
    });

    for (const block of blockedSlots) {
      if (block.isFullDay) {
        return {
          available: false,
          conflictReason: block.reason || 'Stylist is blocked for the entire day',
        };
      }
      if (block.startTime && block.endTime) {
        if (this.timesOverlap(time, endTime, block.startTime, block.endTime)) {
          return {
            available: false,
            conflictReason: block.reason || 'Stylist has a blocked time slot',
          };
        }
      }
    }

    // Check for breaks
    const dayOfWeek = getDayOfWeek(date);
    const breaks = await this.prisma.stylistBreak.findMany({
      where: {
        tenantId,
        stylistId,
        isActive: true,
        OR: [{ dayOfWeek: null }, { dayOfWeek }],
      },
    });

    for (const brk of breaks) {
      if (this.timesOverlap(time, endTime, brk.startTime, brk.endTime)) {
        return {
          available: false,
          conflictReason: brk.name || 'Stylist is on a break',
        };
      }
    }

    // Check for existing appointments where stylist is primary
    const primaryAppointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        stylistId,
        scheduledDate: dateObj,
        status: { notIn: ['cancelled', 'no_show', 'rescheduled'] },
        deletedAt: null,
      },
      select: {
        id: true,
        scheduledTime: true,
        scheduledEndTime: true,
        scheduledDate: true,
        customerName: true,
        customer: { select: { name: true } },
        services: {
          where: {
            OR: [{ assignedStylistId: stylistId }, { actualStylistId: stylistId }],
          },
          select: {
            scheduledStartTime: true,
            scheduledEndTime: true,
          },
        },
      },
    });

    // Check for appointments where stylist is assigned to services (but not primary)
    const serviceAppointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        scheduledDate: dateObj,
        status: { notIn: ['cancelled', 'no_show', 'rescheduled'] },
        deletedAt: null,
        stylistId: { not: stylistId },
        services: {
          some: {
            OR: [{ assignedStylistId: stylistId }, { actualStylistId: stylistId }],
          },
        },
      },
      select: {
        id: true,
        scheduledTime: true,
        scheduledEndTime: true,
        scheduledDate: true,
        customerName: true,
        customer: { select: { name: true } },
        services: {
          where: {
            OR: [{ assignedStylistId: stylistId }, { actualStylistId: stylistId }],
          },
          select: {
            scheduledStartTime: true,
            scheduledEndTime: true,
          },
        },
      },
    });

    const allAppointments = [...primaryAppointments, ...serviceAppointments];

    for (const apt of allAppointments) {
      // Always use the appointment's scheduledTime and scheduledEndTime for overlap check
      // These are stored as local time strings (e.g., "12:30", "13:15")
      // The per-service times are stored as UTC DateTime and would need timezone conversion
      const aptStartTime = apt.scheduledTime;
      const aptEndTime = apt.scheduledEndTime;

      if (this.timesOverlap(time, endTime, aptStartTime, aptEndTime)) {
        const customerName = apt.customerName || apt.customer?.name || 'Customer';
        return {
          available: false,
          conflictReason: `Has appointment with ${customerName}`,
          conflictingAppointment: {
            id: apt.id,
            customerName,
            scheduledTime: aptStartTime,
            scheduledDate: apt.scheduledDate.toISOString().split('T')[0],
          },
        };
      }
    }

    return { available: true };
  }
}
