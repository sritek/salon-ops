/**
 * Duration Parsing Utilities
 * Parses duration strings like '15m', '7d', '8h' into milliseconds
 */

/**
 * Parse a duration string into milliseconds
 * Supports: s (seconds), m (minutes), h (hours), d (days)
 *
 * @example
 * parseDuration('15m') // 900000 (15 minutes in ms)
 * parseDuration('7d')  // 604800000 (7 days in ms)
 * parseDuration('8h')  // 28800000 (8 hours in ms)
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error(`Invalid duration format: ${duration}. Expected format like '15m', '7d', '8h'`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000, // seconds
    m: 60 * 1000, // minutes
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days
  };

  return value * multipliers[unit];
}

/**
 * Calculate expiry date from a duration string
 *
 * @example
 * getExpiryDate('7d') // Date 7 days from now
 * getExpiryDate('8h') // Date 8 hours from now
 */
export function getExpiryDate(duration: string): Date {
  const ms = parseDuration(duration);
  return new Date(Date.now() + ms);
}
