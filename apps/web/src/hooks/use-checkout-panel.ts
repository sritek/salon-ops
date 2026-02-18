/**
 * Checkout Panel Hook
 * Helper hook to open the checkout panel from anywhere in the app
 * Requirements: 6.1, 6.2
 */

import { useCallback } from 'react';
import { useSlideOver } from '@/components/ux/slide-over';
import { CHECKOUT_PANEL_ID } from '@/components/ux/checkout';

interface OpenCheckoutOptions {
  appointmentId?: string;
  customerId?: string;
  onComplete?: (invoiceId: string) => void;
}

/**
 * Hook to open the checkout panel
 *
 * @example
 * ```tsx
 * const { openCheckout } = useCheckoutPanel();
 *
 * // Open checkout for an appointment
 * openCheckout({ appointmentId: 'apt-123' });
 *
 * // Open checkout for a customer
 * openCheckout({ customerId: 'cust-456' });
 *
 * // Open checkout with completion callback
 * openCheckout({
 *   appointmentId: 'apt-123',
 *   onComplete: (invoiceId) => {
 *     console.log('Invoice created:', invoiceId);
 *   }
 * });
 * ```
 */
export function useCheckoutPanel() {
  const { openPanel } = useSlideOver();

  const openCheckout = useCallback(
    (options: OpenCheckoutOptions = {}) => {
      return openPanel(
        CHECKOUT_PANEL_ID,
        {
          appointmentId: options.appointmentId,
          customerId: options.customerId,
          onComplete: options.onComplete,
        },
        {
          width: 'wide',
          title: 'Checkout',
        }
      );
    },
    [openPanel]
  );

  return { openCheckout };
}
