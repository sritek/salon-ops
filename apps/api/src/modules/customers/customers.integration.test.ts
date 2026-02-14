/**
 * Customers Service Integration Tests
 * Tests customer CRUD operations, duplicate detection, and business logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CustomersService, normalizePhone } from './customers.service';

// Mock Prisma client
vi.mock('../../lib/prisma', () => ({
  prisma: {
    customer: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    customerNote: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    appointment: {
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => {
      if (typeof callback === 'function') {
        return callback({
          customer: {
            update: vi.fn().mockResolvedValue({}),
            create: vi.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({}),
          },
          $executeRawUnsafe: vi.fn(),
        });
      }
      return Promise.all(callback);
    }),
  },
}));

import { prisma } from '../../lib/prisma';

// Type assertion for mocked prisma
const mockPrisma = prisma as unknown as {
  customer: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  customerNote: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  appointment: {
    findMany: ReturnType<typeof vi.fn>;
  };
  auditLog: {
    create: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe('CustomersService Integration Tests', () => {
  let service: CustomersService;
  const tenantId = 'tenant-123';
  const userId = 'user-123';
  const branchId = 'branch-123';

  beforeEach(() => {
    service = new CustomersService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // Customer CRUD Operations
  // ============================================

  describe('getCustomers', () => {
    it('should return paginated customers with default filters', async () => {
      const mockCustomers = [
        { id: '1', name: 'John Doe', phone: '9876543210', tenantId },
        { id: '2', name: 'Jane Smith', phone: '9876543211', tenantId },
      ];

      mockPrisma.customer.count.mockResolvedValue(2);
      mockPrisma.customer.findMany.mockResolvedValue(mockCustomers);

      const result = await service.getCustomers(tenantId, {
        page: 1,
        limit: 20,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId, deletedAt: null }),
          skip: 0,
          take: 20,
        })
      );
    });

    it('should filter customers by search term', async () => {
      mockPrisma.customer.count.mockResolvedValue(1);
      mockPrisma.customer.findMany.mockResolvedValue([
        { id: '1', name: 'John Doe', phone: '9876543210', tenantId },
      ]);

      await service.getCustomers(tenantId, {
        page: 1,
        limit: 20,
        search: 'John',
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'John', mode: 'insensitive' } },
              { phone: { contains: 'John' } },
              { email: { contains: 'John', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('should filter customers by tags', async () => {
      mockPrisma.customer.count.mockResolvedValue(1);
      mockPrisma.customer.findMany.mockResolvedValue([]);

      await service.getCustomers(tenantId, {
        page: 1,
        limit: 20,
        tags: 'VIP,Regular',
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { hasSome: ['VIP', 'Regular'] },
          }),
        })
      );
    });

    it('should filter customers by booking status', async () => {
      mockPrisma.customer.count.mockResolvedValue(0);
      mockPrisma.customer.findMany.mockResolvedValue([]);

      await service.getCustomers(tenantId, {
        page: 1,
        limit: 20,
        bookingStatus: 'blocked',
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bookingStatus: 'blocked',
          }),
        })
      );
    });
  });

  describe('getCustomerById', () => {
    it('should return customer when found', async () => {
      const mockCustomer = {
        id: 'cust-1',
        name: 'John Doe',
        phone: '9876543210',
        tenantId,
        deletedAt: null,
      };

      mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);

      const result = await service.getCustomerById(tenantId, 'cust-1');

      expect(result).toEqual(mockCustomer);
      expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'cust-1', tenantId, deletedAt: null },
        include: { customerNotes: false },
      });
    });

    it('should return null when customer not found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      const result = await service.getCustomerById(tenantId, 'non-existent');

      expect(result).toBeNull();
    });

    it('should include notes when requested', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        customerNotes: [{ id: 'note-1', content: 'Test note' }],
      });

      await service.getCustomerById(tenantId, 'cust-1', { includeNotes: true });

      expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            customerNotes: expect.objectContaining({
              orderBy: { createdAt: 'desc' },
              take: 10,
            }),
          },
        })
      );
    });
  });

  // ============================================
  // Duplicate Phone Detection
  // ============================================

  describe('createCustomer - Duplicate Detection', () => {
    it('should throw error when phone already exists for active customer', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'existing-1',
        phone: '9876543210',
        tenantId,
        deletedAt: null,
      });

      await expect(
        service.createCustomer(tenantId, {
          phone: '9876543210',
          name: 'New Customer',
          marketingConsent: true,
          preferences: {},
          allergies: [],
        })
      ).rejects.toThrow('Customer with this phone number already exists');
    });

    it('should reactivate soft-deleted customer with same phone', async () => {
      const deletedCustomer = {
        id: 'deleted-1',
        phone: '9876543210',
        tenantId,
        deletedAt: new Date(),
        name: 'Old Name',
      };

      mockPrisma.customer.findFirst.mockResolvedValue(deletedCustomer);

      const updatedCustomer = {
        ...deletedCustomer,
        deletedAt: null,
        name: 'New Name',
      };

      mockPrisma.$transaction.mockImplementation(async (operations: unknown) => {
        if (Array.isArray(operations)) {
          return [updatedCustomer, {}];
        }
        return (operations as (tx: unknown) => Promise<unknown>)({
          customer: { update: vi.fn().mockResolvedValue(updatedCustomer) },
          auditLog: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const result = await service.createCustomer(tenantId, {
        phone: '9876543210',
        name: 'New Name',
        marketingConsent: true,
        preferences: {},
        allergies: [],
      });

      expect(result.deletedAt).toBeNull();
    });

    it('should normalize phone before duplicate check', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (operations: unknown) => {
        if (Array.isArray(operations)) {
          return [{ id: 'new-1', phone: '9876543210' }, {}];
        }
        return (operations as (tx: unknown) => Promise<unknown>)({
          customer: {
            create: vi.fn().mockResolvedValue({ id: 'new-1', phone: '9876543210' }),
          },
          auditLog: { create: vi.fn().mockResolvedValue({}) },
        });
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      // Phone with country code should be normalized
      await service.createCustomer(tenantId, {
        phone: '+91-987-654-3210',
        name: 'Test Customer',
        marketingConsent: true,
        preferences: {},
        allergies: [],
      });

      expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            phone: '9876543210', // Normalized
          }),
        })
      );
    });
  });

  describe('updateCustomerPhone - Duplicate Detection', () => {
    it('should throw error when new phone is already in use', async () => {
      // Current customer
      mockPrisma.customer.findFirst
        .mockResolvedValueOnce({
          id: 'cust-1',
          phone: '9876543210',
          tenantId,
          deletedAt: null,
        })
        // Duplicate check
        .mockResolvedValueOnce({
          id: 'cust-2',
          phone: '9876543211',
          tenantId,
          deletedAt: null,
        });

      await expect(
        service.updateCustomerPhone(tenantId, 'cust-1', '9876543211', 'Customer request', userId)
      ).rejects.toThrow('Phone number already in use by another customer');
    });

    it('should allow updating to unused phone number', async () => {
      const existingCustomer = {
        id: 'cust-1',
        phone: '9876543210',
        tenantId,
        deletedAt: null,
      };

      mockPrisma.customer.findFirst
        .mockResolvedValueOnce(existingCustomer)
        .mockResolvedValueOnce(null); // No duplicate

      const updatedCustomer = { ...existingCustomer, phone: '9876543299' };

      mockPrisma.$transaction.mockResolvedValue([updatedCustomer, {}]);

      const result = await service.updateCustomerPhone(
        tenantId,
        'cust-1',
        '9876543299',
        'Customer request',
        userId
      );

      expect(result.phone).toBe('9876543299');
    });
  });

  // ============================================
  // Role-Based Data Filtering
  // ============================================

  describe('searchCustomers', () => {
    it('should search across name, phone, and email', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([
        { id: '1', name: 'John Doe', phone: '9876543210', email: 'john@example.com' },
      ]);

      await service.searchCustomers(tenantId, { q: 'john', limit: 10 });

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'john', mode: 'insensitive' } },
              { phone: { contains: 'john' } },
              { email: { contains: 'john', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should respect limit parameter', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([]);

      await service.searchCustomers(tenantId, { q: 'test', limit: 5 });

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });
  });

  // ============================================
  // Customer Deletion Validation
  // ============================================

  describe('deleteCustomer', () => {
    it('should throw error when customer has active appointments', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        tenantId,
        deletedAt: null,
        walletBalance: 0,
        appointments: [{ id: 'apt-1', status: 'scheduled' }],
      });

      await expect(service.deleteCustomer(tenantId, 'cust-1', userId)).rejects.toThrow(
        'Cannot deactivate customer with active appointments'
      );
    });

    it('should throw error when customer has wallet balance', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        tenantId,
        deletedAt: null,
        walletBalance: 500,
        appointments: [],
      });

      await expect(service.deleteCustomer(tenantId, 'cust-1', userId)).rejects.toThrow(
        'Cannot deactivate customer with wallet balance'
      );
    });

    it('should soft delete customer when no restrictions', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        tenantId,
        deletedAt: null,
        walletBalance: 0,
        appointments: [],
      });

      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.deleteCustomer(tenantId, 'cust-1', userId);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // ============================================
  // Customer Notes
  // ============================================

  describe('getCustomerNotes', () => {
    it('should return paginated notes', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        tenantId,
        deletedAt: null,
      });

      mockPrisma.customerNote.count.mockResolvedValue(5);
      mockPrisma.customerNote.findMany.mockResolvedValue([
        { id: 'note-1', content: 'Note 1' },
        { id: 'note-2', content: 'Note 2' },
      ]);

      const result = await service.getCustomerNotes(tenantId, 'cust-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it('should throw error when customer not found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.getCustomerNotes(tenantId, 'non-existent', { page: 1, limit: 10 })
      ).rejects.toThrow('Customer not found');
    });
  });

  describe('addCustomerNote', () => {
    it('should create note for existing customer', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        tenantId,
        deletedAt: null,
      });

      const newNote = {
        id: 'note-1',
        customerId: 'cust-1',
        content: 'Test note',
        createdBy: userId,
      };

      mockPrisma.customerNote.create.mockResolvedValue(newNote);

      const result = await service.addCustomerNote(
        tenantId,
        'cust-1',
        { content: 'Test note' },
        userId
      );

      expect(result.content).toBe('Test note');
      expect(mockPrisma.customerNote.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          customerId: 'cust-1',
          content: 'Test note',
          createdBy: userId,
        },
      });
    });
  });

  // ============================================
  // Customer Statistics
  // ============================================

  describe('getCustomerStats', () => {
    it('should calculate correct statistics', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        tenantId,
        deletedAt: null,
        loyaltyPoints: 100,
        walletBalance: 500,
        noShowCount: 1,
        firstVisitBranchId: branchId,
      });

      mockPrisma.appointment.findMany.mockResolvedValue([
        { id: 'apt-1', totalAmount: 1000, appointmentDate: new Date('2024-01-01'), branchId },
        { id: 'apt-2', totalAmount: 1500, appointmentDate: new Date('2024-02-01'), branchId },
        { id: 'apt-3', totalAmount: 500, appointmentDate: new Date('2024-03-01'), branchId },
      ]);

      const stats = await service.getCustomerStats(tenantId, 'cust-1');

      expect(stats.visitCount).toBe(3);
      expect(stats.totalSpend).toBe(3000);
      expect(stats.avgTicketSize).toBe(1000);
      expect(stats.loyaltyPoints).toBe(100);
      expect(stats.walletBalance).toBe(500);
      expect(stats.noShowCount).toBe(1);
      expect(stats.mostVisitedBranchId).toBe(branchId);
    });

    it('should handle customer with no appointments', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        tenantId,
        deletedAt: null,
        loyaltyPoints: 0,
        walletBalance: 0,
        noShowCount: 0,
        firstVisitBranchId: null,
      });

      mockPrisma.appointment.findMany.mockResolvedValue([]);

      const stats = await service.getCustomerStats(tenantId, 'cust-1');

      expect(stats.visitCount).toBe(0);
      expect(stats.totalSpend).toBe(0);
      expect(stats.avgTicketSize).toBe(0);
      expect(stats.firstVisitDate).toBeNull();
      expect(stats.lastVisitDate).toBeNull();
    });
  });

  // ============================================
  // Phone Normalization Edge Cases
  // ============================================

  describe('Phone Normalization in Service', () => {
    it('should handle various phone formats when creating customer', async () => {
      const phoneFormats = [
        { input: '9876543210', expected: '9876543210' },
        { input: '+919876543210', expected: '9876543210' },
        { input: '91-987-654-3210', expected: '9876543210' },
        { input: '(987) 654-3210', expected: '9876543210' },
      ];

      for (const { input, expected } of phoneFormats) {
        expect(normalizePhone(input)).toBe(expected);
      }
    });

    it('should reject invalid phone formats', () => {
      const invalidPhones = ['12345', '123456789', '929876543210', 'abcdefghij'];

      for (const phone of invalidPhones) {
        expect(() => normalizePhone(phone)).toThrow();
      }
    });
  });
});
