/**
 * BullMQ Job Queue Infrastructure
 *
 * Sets up job queues for background processing tasks like:
 * - Auto-absent marking at end of day
 * - Leave balance initialization on new financial year
 * - Payslip generation and distribution
 */

import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

import { env } from '@/config/env';
import { logger } from '@/lib/logger';

// Redis connection for BullMQ (separate from cache connection)
const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
});

// Queue names
export const QUEUE_NAMES = {
  STAFF: 'staff-jobs',
  NOTIFICATIONS: 'notification-jobs',
  REPORTS: 'report-jobs',
} as const;

// Job types for staff queue
export const STAFF_JOB_TYPES = {
  AUTO_ABSENT: 'auto-absent',
  LEAVE_BALANCE_INIT: 'leave-balance-init',
  PAYSLIP_GENERATE: 'payslip-generate',
  PAYSLIP_EMAIL: 'payslip-email',
  PAYSLIP_WHATSAPP: 'payslip-whatsapp',
} as const;

// Create queues
export const staffQueue = new Queue(QUEUE_NAMES.STAFF, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Queue events for monitoring
export const staffQueueEvents = new QueueEvents(QUEUE_NAMES.STAFF, { connection });

staffQueueEvents.on('completed', ({ jobId }) => {
  logger.info({ jobId, queue: QUEUE_NAMES.STAFF }, 'Job completed');
});

staffQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error({ jobId, queue: QUEUE_NAMES.STAFF, reason: failedReason }, 'Job failed');
});

// Job data types
export interface AutoAbsentJobData {
  tenantId: string;
  branchId: string;
  date: string; // YYYY-MM-DD
}

export interface LeaveBalanceInitJobData {
  tenantId: string;
  financialYear: string; // e.g., "2026-27"
}

export interface PayslipGenerateJobData {
  tenantId: string;
  payrollId: string;
}

export interface PayslipEmailJobData {
  tenantId: string;
  payslipId: string;
  staffEmail: string;
}

export interface PayslipWhatsAppJobData {
  tenantId: string;
  payslipId: string;
  staffPhone: string;
}

// Helper to add jobs
export const addStaffJob = {
  async autoAbsent(data: AutoAbsentJobData, delay?: number) {
    return staffQueue.add(STAFF_JOB_TYPES.AUTO_ABSENT, data, {
      delay,
      jobId: `auto-absent-${data.branchId}-${data.date}`,
    });
  },

  async leaveBalanceInit(data: LeaveBalanceInitJobData) {
    return staffQueue.add(STAFF_JOB_TYPES.LEAVE_BALANCE_INIT, data, {
      jobId: `leave-balance-init-${data.tenantId}-${data.financialYear}`,
    });
  },

  async payslipGenerate(data: PayslipGenerateJobData) {
    return staffQueue.add(STAFF_JOB_TYPES.PAYSLIP_GENERATE, data, {
      jobId: `payslip-generate-${data.payrollId}`,
    });
  },

  async payslipEmail(data: PayslipEmailJobData) {
    return staffQueue.add(STAFF_JOB_TYPES.PAYSLIP_EMAIL, data);
  },

  async payslipWhatsApp(data: PayslipWhatsAppJobData) {
    return staffQueue.add(STAFF_JOB_TYPES.PAYSLIP_WHATSAPP, data);
  },
};

// Graceful shutdown
export async function closeQueues() {
  await staffQueue.close();
  await staffQueueEvents.close();
  await connection.quit();
  logger.info('Job queues closed');
}
