/**
 * Wallet Service
 * Business logic for customer wallet management
 */

import { prisma } from '../../lib/prisma';

import type { AdjustWalletBody, WalletQuery } from './customers.schema';

export class WalletService {
  /**
   * Get wallet balance and transaction history
   */
  async getWalletBalance(tenantId: string, customerId: string, query: WalletQuery) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const where = { customerId };
    const total = await prisma.walletTransaction.count({ where });

    const transactions = await prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      balance: Number(customer.walletBalance),
      transactions: {
        data: transactions,
        total,
        page: query.page,
        limit: query.limit,
      },
    };
  }

  /**
   * Manually adjust wallet balance (manager action)
   */
  async adjustWalletBalance(
    tenantId: string,
    customerId: string,
    data: AdjustWalletBody,
    adjustedBy: string
  ) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const currentBalance = Number(customer.walletBalance);
    const amountChange = data.type === 'credit' ? data.amount : -data.amount;
    const newBalance = currentBalance + amountChange;

    if (newBalance < 0) {
      throw new Error('Insufficient wallet balance');
    }

    const [, transaction] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { walletBalance: newBalance },
      }),
      prisma.walletTransaction.create({
        data: {
          tenantId,
          customerId,
          type: 'adjustment',
          amount: amountChange,
          balance: newBalance,
          reference: 'Manual adjustment',
          reason: data.reason,
          createdBy: adjustedBy,
        },
      }),
      prisma.auditLog.create({
        data: {
          tenantId,
          userId: adjustedBy,
          action: 'wallet.adjusted',
          entityType: 'customer',
          entityId: customerId,
          oldValues: { walletBalance: currentBalance },
          newValues: { walletBalance: newBalance, reason: data.reason },
        },
      }),
    ]);

    return {
      newBalance,
      transaction,
    };
  }

  /**
   * Credit wallet (top-up)
   */
  async creditWallet(
    tenantId: string,
    customerId: string,
    amount: number,
    reference: string,
    createdBy?: string
  ) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const currentBalance = Number(customer.walletBalance);
    const newBalance = currentBalance + amount;

    const [, transaction] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { walletBalance: newBalance },
      }),
      prisma.walletTransaction.create({
        data: {
          tenantId,
          customerId,
          type: 'credit',
          amount,
          balance: newBalance,
          reference,
          createdBy,
        },
      }),
    ]);

    return {
      transaction,
      newBalance,
    };
  }

  /**
   * Debit wallet (payment)
   */
  async debitWallet(
    tenantId: string,
    customerId: string,
    amount: number,
    reference: string,
    createdBy?: string
  ) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const currentBalance = Number(customer.walletBalance);
    if (currentBalance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    const newBalance = currentBalance - amount;

    const [, transaction] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { walletBalance: newBalance },
      }),
      prisma.walletTransaction.create({
        data: {
          tenantId,
          customerId,
          type: 'debit',
          amount: -amount,
          balance: newBalance,
          reference,
          createdBy,
        },
      }),
    ]);

    return {
      transaction,
      newBalance,
    };
  }
}

export const walletService = new WalletService();
