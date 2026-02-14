/**
 * Job Scheduler
 *
 * Sets up cron-based scheduling for recurring jobs:
 * - Auto-absent: Daily at 11:59 PM for each branch
 * - Leave balance init: April 1st annually
 */

import { format } from 'date-fns';

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { addStaffJob, staffQueue } from './index';

/**
 * Schedule auto-absent jobs for all branches
 * Should be called once at server startup
 */
export async function scheduleAutoAbsentJobs() {
  logger.info('Scheduling auto-absent jobs for all branches');

  // Get all active branches
  const branches = await prisma.branch.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, tenantId: true, name: true, timezone: true },
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  for (const branch of branches) {
    // Calculate delay until 11:59 PM in branch timezone
    // For simplicity, we'll use a fixed delay (can be enhanced with timezone support)
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 0, 0);

    const now = new Date();
    const delayMs = Math.max(0, endOfDay.getTime() - now.getTime());

    await addStaffJob.autoAbsent(
      {
        tenantId: branch.tenantId,
        branchId: branch.id,
        date: today,
      },
      delayMs
    );

    logger.debug(
      { branchId: branch.id, branchName: branch.name, delayMs },
      'Scheduled auto-absent job'
    );
  }

  logger.info({ branchCount: branches.length }, 'Auto-absent jobs scheduled');
}

/**
 * Schedule leave balance initialization for new financial year
 * Should be called on April 1st
 */
export async function scheduleLeaveBalanceInit() {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed, so April = 3
  const day = now.getDate();

  // Only run on April 1st
  if (month !== 3 || day !== 1) {
    logger.debug('Not April 1st, skipping leave balance initialization');
    return;
  }

  logger.info('Scheduling leave balance initialization for new financial year');

  // Get all active tenants
  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });

  const year = now.getFullYear();
  const financialYear = `${year}-${((year + 1) % 100).toString().padStart(2, '0')}`;

  for (const tenant of tenants) {
    await addStaffJob.leaveBalanceInit({
      tenantId: tenant.id,
      financialYear,
    });

    logger.debug(
      { tenantId: tenant.id, tenantName: tenant.name, financialYear },
      'Scheduled leave balance init'
    );
  }

  logger.info({ tenantCount: tenants.length, financialYear }, 'Leave balance init jobs scheduled');
}

/**
 * Initialize all scheduled jobs
 * Call this at server startup
 */
export async function initializeScheduler() {
  logger.info('Initializing job scheduler');

  try {
    // Schedule today's auto-absent jobs
    await scheduleAutoAbsentJobs();

    // Check if we need to run leave balance init
    await scheduleLeaveBalanceInit();

    // Set up recurring schedule using BullMQ repeat
    // Auto-absent: Every day at 11:59 PM
    await staffQueue.add(
      'schedule-auto-absent',
      {},
      {
        repeat: {
          pattern: '59 23 * * *', // 11:59 PM daily
        },
        jobId: 'recurring-auto-absent-scheduler',
      }
    );

    // Leave balance init: April 1st at 12:01 AM
    await staffQueue.add(
      'schedule-leave-balance-init',
      {},
      {
        repeat: {
          pattern: '1 0 1 4 *', // 12:01 AM on April 1st
        },
        jobId: 'recurring-leave-balance-init',
      }
    );

    logger.info('Job scheduler initialized');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize job scheduler');
    throw error;
  }
}

/**
 * Manually trigger auto-absent for a specific branch and date
 * Useful for testing or catching up on missed days
 */
export async function triggerAutoAbsent(tenantId: string, branchId: string, date: string) {
  await addStaffJob.autoAbsent({ tenantId, branchId, date });
  logger.info({ tenantId, branchId, date }, 'Manual auto-absent job triggered');
}

/**
 * Manually trigger leave balance initialization
 * Useful for testing or setting up new tenants mid-year
 */
export async function triggerLeaveBalanceInit(tenantId: string, financialYear: string) {
  await addStaffJob.leaveBalanceInit({ tenantId, financialYear });
  logger.info({ tenantId, financialYear }, 'Manual leave balance init job triggered');
}
