/**
 * Customers Controller
 * Request handlers for customer management
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  successResponse,
  paginatedResponse,
  deleteResponse,
  errorResponse,
  buildPaginationMeta,
} from '../../lib/response';
import { customersService, maskPhone } from './customers.service';

import type {
  CreateCustomerBody,
  UpdateCustomerBody,
  UpdateCustomerPhoneBody,
  CustomerQuery,
  CustomerSearchQuery,
  CreateNoteBody,
  NotesQuery,
} from './customers.schema';

// Roles that should see masked phone numbers
const MASKED_PHONE_ROLES = ['stylist'];

export class CustomersController {
  /**
   * Get all customers with pagination and filtering
   */
  async getCustomers(request: FastifyRequest<{ Querystring: CustomerQuery }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    const result = await customersService.getCustomers(tenantId, request.query);

    // Mask phone numbers for stylists
    const data = MASKED_PHONE_ROLES.includes(request.user.role)
      ? result.data.map((c) => ({ ...c, phone: maskPhone(c.phone) }))
      : result.data;

    return reply.send(
      paginatedResponse(data, buildPaginationMeta(result.page, result.limit, result.total))
    );
  }

  /**
   * Search customers (quick lookup)
   */
  async searchCustomers(
    request: FastifyRequest<{ Querystring: CustomerSearchQuery }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const customers = await customersService.searchCustomers(tenantId, request.query);

    // Mask phone numbers for stylists
    const data = MASKED_PHONE_ROLES.includes(request.user.role)
      ? customers.map((c) => ({ ...c, phone: maskPhone(c.phone) }))
      : customers;

    return reply.send(successResponse(data));
  }

  /**
   * Get a single customer by ID
   */
  async getCustomerById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId, role } = request.user;
    const isStylist = MASKED_PHONE_ROLES.includes(role);

    const customer = await customersService.getCustomerById(tenantId, request.params.id, {
      includeNotes: !isStylist,
    });

    if (!customer) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Customer not found'));
    }

    // Mask phone for stylists
    const data = isStylist
      ? { ...customer, phone: maskPhone(customer.phone), email: undefined }
      : customer;

    return reply.send(
      successResponse({
        ...data,
        hasAllergyWarning: customer.allergies.length > 0,
      })
    );
  }

  /**
   * Create a new customer
   */
  async createCustomer(request: FastifyRequest<{ Body: CreateCustomerBody }>, reply: FastifyReply) {
    try {
      const { tenantId, sub, branchIds } = request.user;

      const customer = await customersService.createCustomer(
        tenantId,
        request.body,
        branchIds?.[0], // Use first branch as first visit branch
        sub
      );

      return reply.code(201).send(successResponse(customer));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create customer';

      if (message.includes('already exists')) {
        return reply.code(409).send(errorResponse('DUPLICATE_PHONE', message));
      }

      if (message.includes('not found')) {
        return reply.code(400).send(errorResponse('INVALID_REFERRER', message));
      }

      return reply.code(400).send(errorResponse('CREATE_FAILED', message));
    }
  }

  /**
   * Update a customer
   */
  async updateCustomer(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateCustomerBody }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId, sub } = request.user;

      const customer = await customersService.updateCustomer(
        tenantId,
        request.params.id,
        request.body,
        sub
      );

      return reply.send(successResponse(customer));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update customer';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('UPDATE_FAILED', message));
    }
  }

  /**
   * Update customer phone number (manager only)
   */
  async updateCustomerPhone(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateCustomerPhoneBody }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId, sub } = request.user;

      const customer = await customersService.updateCustomerPhone(
        tenantId,
        request.params.id,
        request.body.phone,
        request.body.reason,
        sub
      );

      return reply.send(successResponse(customer));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update phone';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }

      if (message.includes('already in use')) {
        return reply.code(409).send(errorResponse('DUPLICATE_PHONE', message));
      }

      return reply.code(400).send(errorResponse('UPDATE_FAILED', message));
    }
  }

  /**
   * Delete (deactivate) a customer
   */
  async deleteCustomer(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { tenantId, sub } = request.user;

      await customersService.deleteCustomer(tenantId, request.params.id, sub);

      return reply.send(deleteResponse('Customer deactivated successfully'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete customer';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }

      if (message.includes('active appointments')) {
        return reply.code(400).send(errorResponse('CANNOT_DEACTIVATE_APPOINTMENTS', message));
      }

      if (message.includes('wallet balance')) {
        return reply.code(400).send(errorResponse('CANNOT_DEACTIVATE_WALLET', message));
      }

      return reply.code(400).send(errorResponse('DELETE_FAILED', message));
    }
  }

  /**
   * Reactivate a customer
   */
  async reactivateCustomer(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId, sub } = request.user;

      const customer = await customersService.reactivateCustomer(tenantId, request.params.id, sub);

      return reply.send(successResponse(customer));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reactivate customer';

      return reply.code(400).send(errorResponse('REACTIVATE_FAILED', message));
    }
  }

  /**
   * Unblock customer from booking restrictions
   */
  async unblockCustomer(
    request: FastifyRequest<{ Params: { id: string }; Body: { reason: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId, sub } = request.user;

      const customer = await customersService.unblockCustomer(
        tenantId,
        request.params.id,
        request.body.reason,
        sub
      );

      return reply.send(successResponse(customer));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unblock customer';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }

      if (message.includes('no booking restrictions')) {
        return reply.code(400).send(errorResponse('NO_RESTRICTIONS', message));
      }

      return reply.code(400).send(errorResponse('UNBLOCK_FAILED', message));
    }
  }

  /**
   * Get customer notes
   */
  async getCustomerNotes(
    request: FastifyRequest<{ Params: { id: string }; Querystring: NotesQuery }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId } = request.user;

      const result = await customersService.getCustomerNotes(
        tenantId,
        request.params.id,
        request.query
      );

      return reply.send(
        paginatedResponse(result.data, buildPaginationMeta(result.page, result.limit, result.total))
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get notes';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('GET_NOTES_FAILED', message));
    }
  }

  /**
   * Add a note to customer
   */
  async addCustomerNote(
    request: FastifyRequest<{ Params: { id: string }; Body: CreateNoteBody }>,
    reply: FastifyReply
  ) {
    try {
      const { tenantId, sub } = request.user;

      const note = await customersService.addCustomerNote(
        tenantId,
        request.params.id,
        request.body,
        sub
      );

      return reply.code(201).send(successResponse(note));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add note';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('ADD_NOTE_FAILED', message));
    }
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { tenantId } = request.user;

      const stats = await customersService.getCustomerStats(tenantId, request.params.id);

      return reply.send(successResponse(stats));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get stats';

      if (message.includes('not found')) {
        return reply.code(404).send(errorResponse('NOT_FOUND', message));
      }

      return reply.code(400).send(errorResponse('GET_STATS_FAILED', message));
    }
  }
}

export const customersController = new CustomersController();
