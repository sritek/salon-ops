'use client';

/**
 * Checkout Panel Registry
 * Registers the CheckoutPanel component with the slide-over system
 */

import { useRegisterSlideOverComponent } from '@/components/ux/slide-over';
import { CheckoutPanel } from './checkout-panel';

export const CHECKOUT_PANEL_ID = 'checkout-panel';

/**
 * Hook to register the CheckoutPanel with the slide-over system.
 * Call this in a component that's rendered within the SlideOverProvider.
 */
export function useRegisterCheckoutPanel() {
  useRegisterSlideOverComponent(
    CHECKOUT_PANEL_ID,
    CheckoutPanel as React.ComponentType<Record<string, unknown>>
  );
}

/**
 * Component that registers the CheckoutPanel.
 * Include this in your app layout within the SlideOverProvider.
 */
export function CheckoutPanelRegistry() {
  useRegisterCheckoutPanel();
  return null;
}
