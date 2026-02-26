/**
 * Real-Time Service (Conditional)
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 9.1
 *
 * When ENABLE_REDIS is false, all methods return safe defaults
 * without attempting Redis operations.
 */

import { randomUUID } from 'crypto';
import Redis from 'ioredis';

import redis, { isRedisEnabled } from '@/lib/redis';
import { logger } from '@/lib/logger';
import type { EventType, SSEEvent } from './real-time.schema';

// Create separate Redis instances for pub/sub (only if Redis enabled)
let publisher: Redis | null = null;
let subscriber: Redis | null = null;

function getPublisher(): Redis | null {
  if (!isRedisEnabled) return null;
  if (!publisher) {
    publisher = redis.duplicate();
  }
  return publisher;
}

function getSubscriber(): Redis | null {
  if (!isRedisEnabled) return null;
  if (!subscriber) {
    subscriber = redis.duplicate();
  }
  return subscriber;
}

// Event log settings
const EVENT_LOG_MAX_SIZE = 1000;
const EVENT_LOG_TTL_SECONDS = 3600; // 1 hour

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `${Date.now()}-${randomUUID().slice(0, 8)}`;
}

/**
 * Get channel name for tenant events
 */
function getChannelName(tenantId: string): string {
  return `events:${tenantId}`;
}

/**
 * Get event log key for tenant
 */
function getEventLogKey(tenantId: string): string {
  return `event_log:${tenantId}`;
}

/**
 * Publish an event to all connected clients
 * Returns null if Redis is disabled
 */
export async function publishEvent(
  tenantId: string,
  branchId: string,
  type: EventType,
  data: unknown
): Promise<SSEEvent | null> {
  if (!isRedisEnabled) {
    logger.debug({ type, tenantId, branchId }, 'Redis disabled - SSE event not published');
    return null;
  }

  const pub = getPublisher();
  if (!pub) return null;

  const event: SSEEvent = {
    id: generateEventId(),
    type,
    data,
    timestamp: new Date().toISOString(),
    branchId,
    tenantId,
  };

  const channel = getChannelName(tenantId);

  // Publish to Redis channel
  await pub.publish(channel, JSON.stringify(event));

  // Store in event log for replay
  const logKey = getEventLogKey(tenantId);
  await pub.lpush(logKey, JSON.stringify(event));
  await pub.ltrim(logKey, 0, EVENT_LOG_MAX_SIZE - 1);
  await pub.expire(logKey, EVENT_LOG_TTL_SECONDS);

  logger.debug({ eventId: event.id, type, tenantId, branchId }, 'Event published');

  return event;
}

/**
 * Get missed events since a given event ID
 * Returns empty array if Redis is disabled
 */
export async function getMissedEvents(tenantId: string, lastEventId: string): Promise<SSEEvent[]> {
  if (!isRedisEnabled) {
    return [];
  }

  const logKey = getEventLogKey(tenantId);
  const events = await redis.lrange(logKey, 0, -1);

  const missedEvents: SSEEvent[] = [];
  let foundLastEvent = false;

  // Events are stored newest first, so we iterate in reverse
  for (let i = events.length - 1; i >= 0; i--) {
    const event = JSON.parse(events[i]) as SSEEvent;

    if (foundLastEvent) {
      missedEvents.push(event);
    } else if (event.id === lastEventId) {
      foundLastEvent = true;
    }
  }

  return missedEvents;
}

/**
 * Subscribe to tenant events
 * Returns no-op unsubscribe function if Redis is disabled
 */
export async function subscribeToTenant(
  tenantId: string,
  callback: (event: SSEEvent) => void
): Promise<() => void> {
  if (!isRedisEnabled) {
    logger.debug({ tenantId }, 'Redis disabled - SSE subscription not created');
    return () => {};
  }

  const sub = getSubscriber();
  if (!sub) return () => {};

  const channel = getChannelName(tenantId);

  const messageHandler = (ch: string, message: string) => {
    if (ch === channel) {
      try {
        const event = JSON.parse(message) as SSEEvent;
        callback(event);
      } catch (err) {
        logger.error({ err, channel }, 'Failed to parse event message');
      }
    }
  };

  sub.on('message', messageHandler);
  await sub.subscribe(channel);

  logger.debug({ tenantId, channel }, 'Subscribed to tenant events');

  // Return unsubscribe function
  return async () => {
    sub.off('message', messageHandler);
    await sub.unsubscribe(channel);
    logger.debug({ tenantId, channel }, 'Unsubscribed from tenant events');
  };
}

export const realTimeService = {
  publishEvent,
  getMissedEvents,
  subscribeToTenant,
  isEnabled: isRedisEnabled,
};
