/**
 * Global Search Service
 * Searches across customers, appointments, and invoices
 * Requirements: 12.1, 12.2
 */

import { prisma } from '@/lib/prisma';

interface SearchParams {
  query: string;
  tenantId: string;
  branchIds: string[];
  limit: number;
}

interface SearchResult {
  id: string;
  type: 'customer' | 'appointment' | 'invoice';
  title: string;
  subtitle?: string;
  metadata?: string;
}

class SearchService {
  async search(params: SearchParams): Promise<SearchResult[]> {
    const { query, tenantId, branchIds, limit } = params;
    const searchTerm = `%${query.toLowerCase()}%`;

    // Search in parallel
    const [customers, appointments, invoices] = await Promise.all([
      this.searchCustomers(tenantId, searchTerm, Math.ceil(limit / 3)),
      this.searchAppointments(tenantId, branchIds, searchTerm, Math.ceil(limit / 3)),
      this.searchInvoices(tenantId, branchIds, searchTerm, Math.ceil(limit / 3)),
    ]);

    // Combine and deduplicate results
    const results: SearchResult[] = [...customers, ...appointments, ...invoices];

    // Sort by relevance (exact matches first)
    const lowerQuery = query.toLowerCase();
    results.sort((a, b) => {
      const aExact = a.title.toLowerCase().includes(lowerQuery) ? 0 : 1;
      const bExact = b.title.toLowerCase().includes(lowerQuery) ? 0 : 1;
      return aExact - bExact;
    });

    return results.slice(0, limit);
  }

  private async searchCustomers(
    tenantId: string,
    searchTerm: string,
    limit: number
  ): Promise<SearchResult[]> {
    const customers = await prisma.customer.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { name: { contains: searchTerm.replace(/%/g, ''), mode: 'insensitive' } },
          { phone: { contains: searchTerm.replace(/%/g, ''), mode: 'insensitive' } },
          { email: { contains: searchTerm.replace(/%/g, ''), mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    return customers.map((customer) => ({
      id: customer.id,
      type: 'customer' as const,
      title: customer.name,
      subtitle: customer.phone,
      metadata: customer.email || undefined,
    }));
  }

  private async searchAppointments(
    tenantId: string,
    branchIds: string[],
    searchTerm: string,
    limit: number
  ): Promise<SearchResult[]> {
    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        branchId: { in: branchIds },
        deletedAt: null,
        OR: [
          { customer: { name: { contains: searchTerm.replace(/%/g, ''), mode: 'insensitive' } } },
          { customer: { phone: { contains: searchTerm.replace(/%/g, ''), mode: 'insensitive' } } },
        ],
      },
      select: {
        id: true,
        scheduledDate: true,
        scheduledTime: true,
        status: true,
        customer: {
          select: {
            name: true,
          },
        },
        services: {
          select: {
            service: {
              select: {
                name: true,
              },
            },
          },
          take: 1,
        },
      },
      take: limit,
      orderBy: { scheduledDate: 'desc' },
    });

    return appointments.map((appointment) => {
      const serviceName = appointment.services[0]?.service?.name || 'Service';
      const date = new Date(appointment.scheduledDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      });

      return {
        id: appointment.id,
        type: 'appointment' as const,
        title: `${appointment.customer?.name || 'Customer'} - ${serviceName}`,
        subtitle: `${date} ${appointment.scheduledTime}`,
        metadata: appointment.status,
      };
    });
  }

  private async searchInvoices(
    tenantId: string,
    branchIds: string[],
    searchTerm: string,
    limit: number
  ): Promise<SearchResult[]> {
    const cleanSearchTerm = searchTerm.replace(/%/g, '');

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        branchId: { in: branchIds },
        status: { not: 'cancelled' },
        OR: [
          { invoiceNumber: { contains: cleanSearchTerm, mode: 'insensitive' } },
          { customerName: { contains: cleanSearchTerm, mode: 'insensitive' } },
          { customerPhone: { contains: cleanSearchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        invoiceNumber: true,
        grandTotal: true,
        status: true,
        createdAt: true,
        customerName: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map((invoice) => {
      const date = new Date(invoice.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      });

      return {
        id: invoice.id,
        type: 'invoice' as const,
        title: `${invoice.invoiceNumber} - ${invoice.customerName || 'Customer'}`,
        subtitle: `₹${invoice.grandTotal.toNumber().toLocaleString('en-IN')}`,
        metadata: `${date} • ${invoice.status}`,
      };
    });
  }
}

export const searchService = new SearchService();
