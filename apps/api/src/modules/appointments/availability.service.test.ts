/**
 * Availability Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AvailabilityService } from './availability.service';

// Mock Prisma client
const mockPrisma = {
  branch: {
    findUnique: vi.fn(),
  },
  service: {
    findMany: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
  },
  appointment: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  stylistBreak: {
    findMany: vi.fn(),
  },
  stylistBlockedSlot: {
    findMany: vi.fn(),
  },
};

describe('AvailabilityService', () => {
  let service: AvailabilityService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AvailabilityService(mockPrisma as any);
  });

  describe('Time Utilities', () => {
    it('should add minutes correctly', () => {
      const addMinutes = (service as any).addMinutes.bind(service);

      expect(addMinutes('09:00', 30)).toBe('09:30');
      expect(addMinutes('09:30', 45)).toBe('10:15');
      expect(addMinutes('23:30', 60)).toBe('00:30');
      expect(addMinutes('12:00', 0)).toBe('12:00');
    });

    it('should detect time overlaps correctly', () => {
      const timesOverlap = (service as any).timesOverlap.bind(service);

      // Overlapping cases
      expect(timesOverlap('09:00', '10:00', '09:30', '10:30')).toBe(true);
      expect(timesOverlap('09:00', '11:00', '10:00', '10:30')).toBe(true);
      expect(timesOverlap('10:00', '11:00', '09:00', '10:30')).toBe(true);

      // Non-overlapping cases
      expect(timesOverlap('09:00', '10:00', '10:00', '11:00')).toBe(false);
      expect(timesOverlap('09:00', '10:00', '11:00', '12:00')).toBe(false);
      expect(timesOverlap('11:00', '12:00', '09:00', '10:00')).toBe(false);
    });

    it('should generate time slots correctly', () => {
      const generateTimeSlots = (service as any).generateTimeSlots.bind(service);

      const slots = generateTimeSlots('09:00', '10:00', 15);
      expect(slots).toEqual(['09:00', '09:15', '09:30', '09:45']);

      const slots30 = generateTimeSlots('09:00', '11:00', 30);
      expect(slots30).toEqual(['09:00', '09:30', '10:00', '10:30']);
    });

    it('should deduplicate slots by time', () => {
      const deduplicateSlots = (service as any).deduplicateSlots.bind(service);

      const slots = [
        { time: '09:00', available: true, stylistId: '1' },
        { time: '09:00', available: true, stylistId: '2' },
        { time: '09:30', available: true, stylistId: '1' },
      ];

      const result = deduplicateSlots(slots);
      expect(result).toHaveLength(2);
      expect(result[0].time).toBe('09:00');
      expect(result[1].time).toBe('09:30');
    });
  });

  describe('Slot Conflict Detection', () => {
    beforeEach(() => {
      mockPrisma.branch.findUnique.mockResolvedValue({
        workingHours: {
          monday: { start: '09:00', end: '18:00' },
          tuesday: { start: '09:00', end: '18:00' },
          wednesday: { start: '09:00', end: '18:00' },
          thursday: { start: '09:00', end: '18:00' },
          friday: { start: '09:00', end: '18:00' },
          saturday: { start: '10:00', end: '16:00' },
          sunday: { closed: true },
        },
      });
      mockPrisma.stylistBlockedSlot.findMany.mockResolvedValue([]);
      mockPrisma.stylistBreak.findMany.mockResolvedValue([]);
    });

    it('should detect conflict with existing appointment', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([
        { scheduledTime: '10:00', endTime: '11:00' },
      ]);

      const result = await service.isSlotAvailable(
        'tenant-1',
        'branch-1',
        'stylist-1',
        '2026-02-09', // Monday
        '10:30',
        30
      );

      expect(result).toBe(false);
    });

    it('should allow non-overlapping slot', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([
        { scheduledTime: '10:00', endTime: '11:00' },
      ]);

      const result = await service.isSlotAvailable(
        'tenant-1',
        'branch-1',
        'stylist-1',
        '2026-02-09', // Monday
        '11:00',
        30
      );

      expect(result).toBe(true);
    });

    it('should detect conflict with blocked slot', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.stylistBlockedSlot.findMany.mockResolvedValue([
        { isFullDay: false, startTime: '14:00', endTime: '15:00' },
      ]);

      const result = await service.isSlotAvailable(
        'tenant-1',
        'branch-1',
        'stylist-1',
        '2026-02-09',
        '14:30',
        30
      );

      expect(result).toBe(false);
    });

    it('should detect conflict with full day block', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.stylistBlockedSlot.findMany.mockResolvedValue([{ isFullDay: true }]);

      const result = await service.isSlotAvailable(
        'tenant-1',
        'branch-1',
        'stylist-1',
        '2026-02-09',
        '10:00',
        30
      );

      expect(result).toBe(false);
    });

    it('should detect conflict with break', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.stylistBreak.findMany.mockResolvedValue([
        { dayOfWeek: null, startTime: '12:00', endTime: '13:00', isActive: true },
      ]);

      const result = await service.isSlotAvailable(
        'tenant-1',
        'branch-1',
        'stylist-1',
        '2026-02-09',
        '12:30',
        30
      );

      expect(result).toBe(false);
    });

    it('should reject slot outside working hours', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      const result = await service.isSlotAvailable(
        'tenant-1',
        'branch-1',
        'stylist-1',
        '2026-02-09',
        '08:00', // Before 09:00 opening
        30
      );

      expect(result).toBe(false);
    });

    it('should reject slot that extends past closing', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      const result = await service.isSlotAvailable(
        'tenant-1',
        'branch-1',
        'stylist-1',
        '2026-02-09',
        '17:45', // Would end at 18:15, past 18:00 closing
        30
      );

      expect(result).toBe(false);
    });

    it('should reject slot on closed day', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      const result = await service.isSlotAvailable(
        'tenant-1',
        'branch-1',
        'stylist-1',
        '2026-02-08', // Sunday (closed)
        '10:00',
        30
      );

      expect(result).toBe(false);
    });
  });

  describe('Auto-Assign Stylist', () => {
    beforeEach(() => {
      mockPrisma.branch.findUnique.mockResolvedValue({
        workingHours: {
          monday: { start: '09:00', end: '18:00' },
        },
      });
      mockPrisma.stylistBlockedSlot.findMany.mockResolvedValue([]);
      mockPrisma.stylistBreak.findMany.mockResolvedValue([]);
      mockPrisma.appointment.findMany.mockResolvedValue([]);
    });

    it('should select stylist with least workload', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'stylist-1', name: 'Alice', gender: 'female' },
        { id: 'stylist-2', name: 'Bob', gender: 'male' },
      ]);

      // Stylist 1 has 5 appointments, Stylist 2 has 2
      mockPrisma.appointment.count
        .mockResolvedValueOnce(5) // stylist-1
        .mockResolvedValueOnce(2); // stylist-2

      const result = await service.autoAssignStylist(
        'tenant-1',
        'branch-1',
        '2026-02-09',
        '10:00',
        60
      );

      expect(result).toBe('stylist-2');
    });

    it('should filter by gender preference', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'stylist-1', name: 'Alice', gender: 'female' },
      ]);
      mockPrisma.appointment.count.mockResolvedValue(0);

      const result = await service.autoAssignStylist(
        'tenant-1',
        'branch-1',
        '2026-02-09',
        '10:00',
        60,
        'female'
      );

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gender: 'female',
          }),
        })
      );
      expect(result).toBe('stylist-1');
    });

    it('should return null if no stylists available', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.autoAssignStylist(
        'tenant-1',
        'branch-1',
        '2026-02-09',
        '10:00',
        60
      );

      expect(result).toBeNull();
    });
  });

  describe('Get Available Slots', () => {
    beforeEach(() => {
      mockPrisma.branch.findUnique.mockResolvedValue({
        workingHours: {
          monday: { start: '09:00', end: '12:00' },
        },
      });
      mockPrisma.service.findMany.mockResolvedValue([{ durationMinutes: 30 }]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'stylist-1', name: 'Alice', gender: 'female' },
      ]);
      mockPrisma.stylistBlockedSlot.findMany.mockResolvedValue([]);
      mockPrisma.stylistBreak.findMany.mockResolvedValue([]);
      mockPrisma.appointment.findMany.mockResolvedValue([]);
    });

    it('should return available slots', async () => {
      const result = await service.getAvailableSlots('tenant-1', {
        branchId: 'branch-1',
        date: '2026-02-09', // Monday
        serviceIds: ['service-1'],
      });

      expect(result.date).toBe('2026-02-09');
      expect(result.slots.length).toBeGreaterThan(0);
      expect(result.slots[0]).toHaveProperty('time');
      expect(result.slots[0]).toHaveProperty('available', true);
    });

    it('should return empty slots for closed day', async () => {
      mockPrisma.branch.findUnique.mockResolvedValue({
        workingHours: {
          sunday: { closed: true },
        },
      });

      const result = await service.getAvailableSlots('tenant-1', {
        branchId: 'branch-1',
        date: '2026-02-08', // Sunday
        serviceIds: ['service-1'],
      });

      expect(result.slots).toHaveLength(0);
    });

    it('should exclude slots that conflict with appointments', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([
        { scheduledTime: '10:00', endTime: '10:30' },
      ]);

      const result = await service.getAvailableSlots('tenant-1', {
        branchId: 'branch-1',
        date: '2026-02-09',
        serviceIds: ['service-1'],
      });

      const times = result.slots.map((s) => s.time);
      expect(times).not.toContain('10:00');
    });
  });
});
