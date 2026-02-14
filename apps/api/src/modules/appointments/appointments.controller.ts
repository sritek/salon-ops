import type { FastifyRequest, FastifyReply } from 'fastify';
import { successResponse, paginatedResponse, errorResponse } from '../../lib/response';
import { AppointmentsService } from './appointments.service';
import { AvailabilityService } from './availability.service';
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  ListAppointmentsInput,
  CancelAppointmentInput,
  RescheduleAppointmentInput,
  GetAvailableSlotsInput,
  GetCalendarInput,
} from './appointments.schema';

export class AppointmentsController {
  constructor(
    private appointmentsService: AppointmentsService,
    private availabilityService: AvailabilityService
  ) {}

  /**
   * List appointments
   */
  async list(request: FastifyRequest<{ Querystring: ListAppointmentsInput }>, reply: FastifyReply) {
    const { tenantId } = request.user!;
    const result = await this.appointmentsService.getAppointments(tenantId, request.query);

    return reply.send(paginatedResponse(result.data, result.meta));
  }

  /**
   * Get single appointment
   */
  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user!;
    const appointment = await this.appointmentsService.getAppointmentById(
      tenantId,
      request.params.id
    );

    return reply.send(successResponse(appointment));
  }

  /**
   * Check for conflicts before creating appointment
   */
  async checkConflicts(
    request: FastifyRequest<{
      Body: {
        branchId: string;
        scheduledDate: string;
        scheduledTime: string;
        serviceIds: string[];
        stylistId?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user!;
    const { branchId, scheduledDate, scheduledTime, serviceIds, stylistId } = request.body;

    // Calculate total duration from services
    const services = await this.appointmentsService['prisma'].service.findMany({
      where: {
        id: { in: serviceIds },
        tenantId,
      },
      select: { durationMinutes: true },
    });

    const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);

    const conflicts = await this.appointmentsService.checkConflicts(
      tenantId,
      branchId,
      scheduledDate,
      scheduledTime,
      totalDuration,
      stylistId
    );

    return reply.send(
      successResponse({
        hasConflicts: conflicts.length > 0,
        conflicts,
      })
    );
  }

  /**
   * Create appointment
   */
  async create(
    request: FastifyRequest<{
      Body: CreateAppointmentInput & {
        forceOverride?: boolean;
        overrideReason?: string;
        conflictActions?: { appointmentId: string; action: 'keep' | 'cancel' }[];
      };
    }>,
    reply: FastifyReply
  ) {
    const { tenantId, branchIds, sub: userId } = request.user!;
    const { forceOverride, overrideReason, conflictActions, ...appointmentData } = request.body;
    const branchId = appointmentData.branchId;

    // Validate user has access to branch
    if (!branchIds.includes(branchId)) {
      return reply
        .status(403)
        .send(errorResponse('FORBIDDEN', 'You do not have access to this branch'));
    }

    const result = await this.appointmentsService.createAppointment(
      tenantId,
      branchId,
      appointmentData,
      userId,
      forceOverride,
      overrideReason,
      conflictActions
    );

    // If force override was used, log it
    if (forceOverride && overrideReason) {
      await this.appointmentsService['prisma'].auditLog.create({
        data: {
          tenantId,
          branchId,
          userId,
          action: 'APPOINTMENT_CONFLICT_OVERRIDE',
          entityType: 'appointment',
          entityId: result.appointment.id,
          newValues: {
            reason: overrideReason,
            scheduledDate: appointmentData.scheduledDate,
            scheduledTime: appointmentData.scheduledTime,
            conflictActions: conflictActions,
          },
        },
      });
    }

    return reply.status(201).send(successResponse(result));
  }

  /**
   * Update appointment
   */
  async update(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateAppointmentInput }>,
    reply: FastifyReply
  ) {
    const { tenantId, sub: userId } = request.user!;
    const appointment = await this.appointmentsService.updateAppointment(
      tenantId,
      request.params.id,
      request.body,
      userId
    );

    return reply.send(successResponse(appointment));
  }

  /**
   * Check in customer
   */
  async checkIn(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId, sub: userId } = request.user!;
    const appointment = await this.appointmentsService.checkIn(tenantId, request.params.id, userId);

    return reply.send(successResponse(appointment));
  }

  /**
   * Start appointment
   */
  async start(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId, sub: userId } = request.user!;
    const appointment = await this.appointmentsService.start(tenantId, request.params.id, userId);

    return reply.send(successResponse(appointment));
  }

  /**
   * Complete appointment
   */
  async complete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId, sub: userId } = request.user!;
    const appointment = await this.appointmentsService.complete(
      tenantId,
      request.params.id,
      userId
    );

    return reply.send(successResponse(appointment));
  }

  /**
   * Cancel appointment
   */
  async cancel(
    request: FastifyRequest<{ Params: { id: string }; Body: CancelAppointmentInput }>,
    reply: FastifyReply
  ) {
    const { tenantId, sub: userId } = request.user!;
    const appointment = await this.appointmentsService.cancel(
      tenantId,
      request.params.id,
      request.body,
      userId
    );

    return reply.send(successResponse(appointment));
  }

  /**
   * Mark as no-show
   */
  async markNoShow(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId, sub: userId } = request.user!;
    const appointment = await this.appointmentsService.markNoShow(
      tenantId,
      request.params.id,
      userId
    );

    return reply.send(successResponse(appointment));
  }

  /**
   * Resolve conflict
   */
  async resolveConflict(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId, sub: userId } = request.user!;
    const appointment = await this.appointmentsService.resolveConflict(
      tenantId,
      request.params.id,
      userId
    );

    return reply.send(successResponse(appointment));
  }

  /**
   * Reschedule appointment
   */
  async reschedule(
    request: FastifyRequest<{ Params: { id: string }; Body: RescheduleAppointmentInput }>,
    reply: FastifyReply
  ) {
    const { tenantId, sub: userId } = request.user!;
    const result = await this.appointmentsService.reschedule(
      tenantId,
      request.params.id,
      request.body,
      userId
    );

    return reply.send(successResponse(result));
  }

  /**
   * Get available slots
   */
  async getAvailableSlots(
    request: FastifyRequest<{ Querystring: GetAvailableSlotsInput }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user!;
    const result = await this.availabilityService.getAvailableSlots(tenantId, request.query);

    return reply.send(successResponse(result));
  }

  /**
   * Get available stylists for a time slot
   */
  async getAvailableStylists(
    request: FastifyRequest<{
      Querystring: {
        branchId: string;
        date: string;
        time: string;
        duration: number;
        genderPreference?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user!;
    const { branchId, date, time, duration, genderPreference } = request.query;

    const stylists = await this.availabilityService.getAvailableStylists(
      tenantId,
      branchId,
      date,
      time,
      duration,
      genderPreference
    );

    return reply.send(successResponse(stylists));
  }

  /**
   * Get calendar view
   */
  async getCalendar(
    request: FastifyRequest<{ Querystring: GetCalendarInput }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user!;
    const { branchId, view, date, stylistId } = request.query;

    // Calculate date range based on view
    const baseDate = new Date(date);
    let startDate: Date;
    let endDate: Date;

    if (view === 'day') {
      startDate = new Date(baseDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(baseDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (view === 'week') {
      // Get Monday of the week (weekStartsOn: 1)
      const dayOfWeek = baseDate.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, otherwise go to Monday
      startDate = new Date(baseDate);
      startDate.setDate(baseDate.getDate() + diff);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // month view
      startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    const where: any = {
      tenantId,
      branchId,
      scheduledDate: {
        gte: startDate,
        lte: endDate,
      },
      deletedAt: null,
    };

    if (stylistId) {
      where.stylistId = stylistId;
    }

    const appointments = await this.appointmentsService['prisma'].appointment.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
        services: {
          select: { serviceName: true },
        },
      },
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
    });

    // Calculate summary
    const summary = {
      total: appointments.length,
      byStatus: {} as Record<string, number>,
    };

    for (const apt of appointments) {
      summary.byStatus[apt.status] = (summary.byStatus[apt.status] || 0) + 1;
    }

    // Transform to calendar format
    const calendarAppointments = appointments.map((apt: any) => ({
      id: apt.id,
      scheduledDate: apt.scheduledDate.toISOString().split('T')[0],
      scheduledTime: apt.scheduledTime,
      endTime: apt.endTime,
      customerName: apt.customer?.name || apt.customerName || 'Guest',
      customerPhone: apt.customer?.phone || apt.customerPhone,
      stylistId: apt.stylistId,
      services: apt.services.map((s: any) => s.serviceName),
      status: apt.status,
      bookingType: apt.bookingType,
      totalAmount: Number(apt.totalAmount),
      tokenNumber: apt.tokenNumber,
      hasConflict: apt.hasConflict || false,
    }));

    return reply.send(
      successResponse({
        view,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        appointments: calendarAppointments,
        summary,
      })
    );
  }
}
