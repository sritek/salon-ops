'use client';

/**
 * SlideOver Panel Registry
 * Based on: .kiro/specs/ux-consolidation-slideover/design.md
 * Requirements: 4.1, 5.1, 6.1, 7.2
 *
 * Centralized registry for all SlideOver panel components.
 * This component registers all panel types so they can be dynamically rendered.
 */

import { useEffect, useCallback } from 'react';
import { useSlideOver } from './slide-over-provider';
import { useSlideOverStore } from '@/stores/slide-over-store';

// Panel component IDs - use these constants when opening panels
export const PANEL_IDS = {
  APPOINTMENT_DETAILS: 'appointment-details',
  NEW_APPOINTMENT: 'new-appointment',
  CUSTOMER_PEEK: 'customer-peek',
  CHECKOUT: 'checkout',
  RESCHEDULE: 'reschedule',
  CUSTOMER_EDIT: 'customer-edit',
  SERVICE_DETAILS: 'service-details',
  INVOICE_DETAILS: 'invoice-details',
  UNASSIGNED_APPOINTMENTS: 'unassigned-appointments',
} as const;

export type PanelId = (typeof PANEL_IDS)[keyof typeof PANEL_IDS];

// Lazy load panel components to reduce initial bundle size
const AppointmentDetailsPanel = () =>
  import('@/components/ux/panels/appointment-details-panel').then((m) => m.AppointmentDetailsPanel);
const NewAppointmentPanel = () =>
  import('@/components/ux/panels/new-appointment-panel').then((m) => m.NewAppointmentPanel);
const CustomerPeekPanel = () =>
  import('@/components/ux/panels/customer-peek-panel').then((m) => m.CustomerPeekPanel);
const CheckoutPanel = () =>
  import('@/components/ux/checkout/checkout-panel').then((m) => m.CheckoutPanel);
const UnassignedAppointmentsPanel = () =>
  import('@/components/ux/panels/unassigned-appointments-panel').then(
    (m) => m.UnassignedAppointmentsPanel
  );

/**
 * SlideOverRegistry Component
 *
 * Add this component to the protected layout to register all panel components.
 * Panels are lazy-loaded when first opened to optimize initial page load.
 */
export function SlideOverRegistry() {
  const { registerComponent } = useSlideOver();

  useEffect(() => {
    // Register panel components
    // Components are loaded dynamically when the panel is first opened

    // Appointment Details Panel
    AppointmentDetailsPanel().then((Component) => {
      registerComponent(
        PANEL_IDS.APPOINTMENT_DETAILS,
        Component as unknown as React.ComponentType<Record<string, unknown>>
      );
    });

    // New Appointment Panel
    NewAppointmentPanel().then((Component) => {
      registerComponent(
        PANEL_IDS.NEW_APPOINTMENT,
        Component as unknown as React.ComponentType<Record<string, unknown>>
      );
    });

    // Customer Peek Panel
    CustomerPeekPanel().then((Component) => {
      registerComponent(
        PANEL_IDS.CUSTOMER_PEEK,
        Component as unknown as React.ComponentType<Record<string, unknown>>
      );
    });

    // Checkout Panel
    CheckoutPanel().then((Component) => {
      registerComponent(
        PANEL_IDS.CHECKOUT,
        Component as unknown as React.ComponentType<Record<string, unknown>>
      );
    });

    // Unassigned Appointments Panel
    UnassignedAppointmentsPanel().then((Component) => {
      registerComponent(
        PANEL_IDS.UNASSIGNED_APPOINTMENTS,
        Component as unknown as React.ComponentType<Record<string, unknown>>
      );
    });
  }, [registerComponent]);

  // This component doesn't render anything - it just registers components
  return null;
}

// Helper hook to open specific panels with type safety
export function useOpenPanel() {
  const { openPanel } = useSlideOver();
  const panels = useSlideOverStore((state) => state.panels);

  // Check if a panel with specific componentId and props is already open
  const findExistingPanel = useCallback(
    (componentId: string, propKey: string, propValue: string) => {
      return panels.find(
        (panel) => panel.componentId === componentId && panel.props[propKey] === propValue
      );
    },
    [panels]
  );

  return {
    openAppointmentDetails: (appointmentId: string) => {
      // Check if appointment details panel for this appointment is already open
      const existing = findExistingPanel(
        PANEL_IDS.APPOINTMENT_DETAILS,
        'appointmentId',
        appointmentId
      );
      if (existing) {
        // Panel already open, return existing panel ID
        return existing.id;
      }

      return openPanel(
        PANEL_IDS.APPOINTMENT_DETAILS,
        { appointmentId },
        { title: 'Appointment Details', width: 'wide' }
      );
    },

    openNewAppointment: (options?: {
      stylistId?: string;
      date?: string;
      time?: string;
      customerId?: string;
    }) => {
      return openPanel(PANEL_IDS.NEW_APPOINTMENT, options || {}, {
        title: 'New Appointment',
        width: 'wide',
      });
    },

    openCustomerPeek: (customerId: string) => {
      // Check if customer peek panel for this customer is already open
      const existing = findExistingPanel(PANEL_IDS.CUSTOMER_PEEK, 'customerId', customerId);
      if (existing) {
        return existing.id;
      }

      return openPanel(
        PANEL_IDS.CUSTOMER_PEEK,
        { customerId },
        { title: 'Customer Profile', width: 'medium' }
      );
    },

    openCheckout: (appointmentId: string) => {
      // Check if checkout panel for this appointment is already open
      // This prevents duplicate checkout panels and infinite re-render loops
      const existing = findExistingPanel(PANEL_IDS.CHECKOUT, 'appointmentId', appointmentId);
      if (existing) {
        // Panel already open, return existing panel ID instead of opening new one
        return existing.id;
      }

      return openPanel(PANEL_IDS.CHECKOUT, { appointmentId }, { title: 'Checkout', width: 'wide' });
    },

    openUnassignedAppointments: () => {
      // Check if unassigned appointments panel is already open
      const existingPanel = panels.find(
        (panel) => panel.componentId === PANEL_IDS.UNASSIGNED_APPOINTMENTS
      );
      if (existingPanel) {
        return existingPanel.id;
      }

      return openPanel(
        PANEL_IDS.UNASSIGNED_APPOINTMENTS,
        {},
        { title: 'Unassigned Appointments', width: 'medium' }
      );
    },
  };
}
