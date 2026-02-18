/**
 * Real-Time Module
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 9.1
 */

export { realTimeRoutes } from './real-time.routes';
export { realTimeService, publishEvent } from './real-time.service';
export type { EventType, SSEEvent } from './real-time.schema';
