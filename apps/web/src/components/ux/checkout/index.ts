/**
 * Checkout Components
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 6.1-6.12
 */

export { CheckoutPanel } from './checkout-panel';
export {
  CheckoutPanelRegistry,
  useRegisterCheckoutPanel,
  CHECKOUT_PANEL_ID,
} from './checkout-panel-registry';
export { ServiceList } from './service-list';
export { ProductSearch, InlineProductSearch } from './product-search';
export { DiscountSelector } from './discount-selector';
export { PaymentMethods } from './payment-methods';
export { SplitPayment } from './split-payment';
export { TipSelector } from './tip-selector';
export { CheckoutCompletion } from './checkout-completion';
export { OutstandingBalanceWarning, OutstandingBalanceBadge } from './outstanding-balance-warning';
