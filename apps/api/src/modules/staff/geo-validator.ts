/**
 * Geo-location Validation Service
 *
 * Validates staff check-in/check-out locations against branch coordinates
 * using the Haversine formula for accurate distance calculation.
 */

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface GeoValidationResult {
  isValid: boolean;
  distance: number; // in meters
  maxAllowedDistance: number;
  errorMessage?: string;
}

export interface GeoValidatorConfig {
  defaultRadiusMeters: number;
}

const DEFAULT_CONFIG: GeoValidatorConfig = {
  defaultRadiusMeters: 100,
};

/**
 * Earth's radius in meters (mean radius)
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the great-circle distance between two geographic coordinates
 * using the Haversine formula.
 *
 * The Haversine formula determines the shortest distance over the earth's
 * surface, giving an "as-the-crow-flies" distance between two points.
 *
 * @param point1 - First coordinate (latitude, longitude)
 * @param point2 - Second coordinate (latitude, longitude)
 * @returns Distance in meters
 */
export function calculateDistance(point1: GeoCoordinates, point2: GeoCoordinates): number {
  const lat1Rad = toRadians(point1.latitude);
  const lat2Rad = toRadians(point2.latitude);
  const deltaLatRad = toRadians(point2.latitude - point1.latitude);
  const deltaLonRad = toRadians(point2.longitude - point1.longitude);

  // Haversine formula
  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Validate if a staff member's location is within the allowed radius
 * of the branch location.
 *
 * @param staffLocation - Staff member's current coordinates
 * @param branchLocation - Branch's configured coordinates
 * @param allowedRadiusMeters - Maximum allowed distance in meters (optional)
 * @param config - Validator configuration (optional)
 * @returns Validation result with distance and validity status
 */
export function validateCheckInLocation(
  staffLocation: GeoCoordinates,
  branchLocation: GeoCoordinates,
  allowedRadiusMeters?: number,
  config: GeoValidatorConfig = DEFAULT_CONFIG
): GeoValidationResult {
  const maxAllowedDistance = allowedRadiusMeters ?? config.defaultRadiusMeters;
  const distance = calculateDistance(staffLocation, branchLocation);

  if (distance <= maxAllowedDistance) {
    return {
      isValid: true,
      distance: Math.round(distance),
      maxAllowedDistance,
    };
  }

  return {
    isValid: false,
    distance: Math.round(distance),
    maxAllowedDistance,
    errorMessage: `You are ${Math.round(distance)} meters away from the branch. Maximum allowed distance is ${maxAllowedDistance} meters.`,
  };
}

/**
 * Check if coordinates are valid (within valid ranges)
 */
export function isValidCoordinates(coords: GeoCoordinates): boolean {
  return (
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  );
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(coords: GeoCoordinates): string {
  return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
}
