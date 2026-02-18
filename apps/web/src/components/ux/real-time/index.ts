/**
 * Real-Time Components
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 9.1-9.11
 */

export { RealTimeProvider, useRealTime, useRealTimeEvent } from './real-time-provider';
export { ConnectionStatus } from './connection-status';
export {
  useRealTimeQueryInvalidation,
  useRealTimeQueryUpdate,
  useAppointmentRealTimeUpdates,
  useWalkInRealTimeUpdates,
  useInvoiceRealTimeUpdates,
} from './use-real-time';
