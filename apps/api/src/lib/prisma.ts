/**
 * Prisma Client with RLS Support
 * Based on: .cursor/rules/13-backend-implementation.mdc lines 48-100
 */

import { PrismaClient } from '@prisma/client';

import { env } from '../config/env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Execute queries with tenant context (RLS)
 */
export async function withTenant<T>(
  tenantId: string,
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Set tenant context for RLS
    await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    return callback(tx as PrismaClient);
  });
}

/**
 * Execute queries with tenant and branch context
 */
export async function withTenantAndBranch<T>(
  tenantId: string,
  branchId: string,
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    await tx.$executeRawUnsafe(`SET LOCAL app.current_branch_id = '${branchId}'`);
    return callback(tx as PrismaClient);
  });
}

/**
 * Execute queries with full context (tenant, branch, user)
 */
export async function withFullContext<T>(
  tenantId: string,
  branchId: string | null,
  userId: string,
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
    if (branchId) {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_branch_id = '${branchId}'`);
    }
    await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${userId}'`);
    return callback(tx as PrismaClient);
  });
}

export default prisma;
