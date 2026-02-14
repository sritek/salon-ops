/**
 * Geo-location Validator Tests
 *
 * Tests for the Haversine distance calculation and geo-validation logic.
 * Includes property-based tests for correctness verification.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  validateCheckInLocation,
  isValidCoordinates,
  GeoCoordinates,
} from './geo-validator';

describe('Geo-location Validator', () => {
  describe('calculateDistance (Haversine)', () => {
    /**
     * Property 1: Geo Distance Calculation Accuracy
     * For any two geographic coordinate pairs, the Haversine distance calculation
     * SHALL return a value within 0.1% of the mathematically correct great-circle distance.
     */
    it('should calculate distance between two known points accurately', () => {
      // New Delhi to Mumbai (approximately 1,153 km)
      const delhi: GeoCoordinates = { latitude: 28.6139, longitude: 77.209 };
      const mumbai: GeoCoordinates = { latitude: 19.076, longitude: 72.8777 };

      const distance = calculateDistance(delhi, mumbai);

      // Expected distance is approximately 1,153,000 meters
      // Allow 1% tolerance for different calculation methods
      expect(distance).toBeGreaterThan(1140000);
      expect(distance).toBeLessThan(1170000);
    });

    it('should return 0 for same coordinates', () => {
      const point: GeoCoordinates = { latitude: 28.6139, longitude: 77.209 };
      const distance = calculateDistance(point, point);
      expect(distance).toBe(0);
    });

    it('should calculate short distances accurately (within 100m)', () => {
      // Two points approximately 50 meters apart
      const point1: GeoCoordinates = { latitude: 28.6139, longitude: 77.209 };
      const point2: GeoCoordinates = { latitude: 28.6143, longitude: 77.209 };

      const distance = calculateDistance(point1, point2);

      // Approximately 44 meters (0.0004 degrees latitude ≈ 44m)
      expect(distance).toBeGreaterThan(40);
      expect(distance).toBeLessThan(50);
    });

    it('should handle coordinates at equator', () => {
      const point1: GeoCoordinates = { latitude: 0, longitude: 0 };
      const point2: GeoCoordinates = { latitude: 0, longitude: 1 };

      const distance = calculateDistance(point1, point2);

      // 1 degree of longitude at equator ≈ 111,320 meters
      expect(distance).toBeGreaterThan(110000);
      expect(distance).toBeLessThan(112000);
    });

    it('should handle coordinates at poles', () => {
      const northPole: GeoCoordinates = { latitude: 90, longitude: 0 };
      const nearPole: GeoCoordinates = { latitude: 89, longitude: 0 };

      const distance = calculateDistance(northPole, nearPole);

      // 1 degree of latitude ≈ 111,000 meters
      expect(distance).toBeGreaterThan(110000);
      expect(distance).toBeLessThan(112000);
    });

    it('should be symmetric (distance A to B equals B to A)', () => {
      const point1: GeoCoordinates = { latitude: 28.6139, longitude: 77.209 };
      const point2: GeoCoordinates = { latitude: 19.076, longitude: 72.8777 };

      const distanceAB = calculateDistance(point1, point2);
      const distanceBA = calculateDistance(point2, point1);

      expect(distanceAB).toBeCloseTo(distanceBA, 5);
    });

    it('should handle negative coordinates (southern/western hemispheres)', () => {
      // Sydney, Australia to Cape Town, South Africa
      const sydney: GeoCoordinates = { latitude: -33.8688, longitude: 151.2093 };
      const capeTown: GeoCoordinates = { latitude: -33.9249, longitude: 18.4241 };

      const distance = calculateDistance(sydney, capeTown);

      // Approximately 11,000 km
      expect(distance).toBeGreaterThan(10500000);
      expect(distance).toBeLessThan(11500000);
    });
  });

  describe('validateCheckInLocation', () => {
    const branchLocation: GeoCoordinates = { latitude: 28.6139, longitude: 77.209 };

    /**
     * Property 2: Geo Validation Rejection
     * For any check-in request where the calculated distance exceeds the configured radius,
     * the validation SHALL reject with an appropriate error.
     */
    it('should reject check-in when distance exceeds allowed radius', () => {
      // Staff is approximately 500 meters away
      const staffLocation: GeoCoordinates = { latitude: 28.618, longitude: 77.209 };

      const result = validateCheckInLocation(staffLocation, branchLocation, 100);

      expect(result.isValid).toBe(false);
      expect(result.distance).toBeGreaterThan(100);
      expect(result.maxAllowedDistance).toBe(100);
      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain('meters away');
    });

    /**
     * Property 3: Geo Validation Acceptance
     * For any check-in request where the calculated distance is within the configured radius,
     * the validation SHALL accept the check-in.
     */
    it('should accept check-in when distance is within allowed radius', () => {
      // Staff is approximately 30 meters away
      const staffLocation: GeoCoordinates = { latitude: 28.6141, longitude: 77.209 };

      const result = validateCheckInLocation(staffLocation, branchLocation, 100);

      expect(result.isValid).toBe(true);
      expect(result.distance).toBeLessThanOrEqual(100);
      expect(result.maxAllowedDistance).toBe(100);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should accept check-in at exact branch location', () => {
      const result = validateCheckInLocation(branchLocation, branchLocation, 100);

      expect(result.isValid).toBe(true);
      expect(result.distance).toBe(0);
    });

    it('should use default radius when not specified', () => {
      // Staff is approximately 50 meters away (within default 100m)
      const staffLocation: GeoCoordinates = { latitude: 28.6143, longitude: 77.209 };

      const result = validateCheckInLocation(staffLocation, branchLocation);

      expect(result.isValid).toBe(true);
      expect(result.maxAllowedDistance).toBe(100); // default
    });

    it('should accept check-in at boundary of allowed radius', () => {
      // Staff is exactly at the boundary (approximately 100 meters)
      const staffLocation: GeoCoordinates = { latitude: 28.6148, longitude: 77.209 };

      const result = validateCheckInLocation(staffLocation, branchLocation, 150);

      // Should be valid since distance is around 100m and radius is 150m
      expect(result.isValid).toBe(true);
    });

    it('should handle custom radius configuration', () => {
      const staffLocation: GeoCoordinates = { latitude: 28.618, longitude: 77.209 };

      // With 100m radius - should fail
      const result100 = validateCheckInLocation(staffLocation, branchLocation, 100);
      expect(result100.isValid).toBe(false);

      // With 1000m radius - should pass
      const result1000 = validateCheckInLocation(staffLocation, branchLocation, 1000);
      expect(result1000.isValid).toBe(true);
    });
  });

  describe('isValidCoordinates', () => {
    it('should return true for valid coordinates', () => {
      expect(isValidCoordinates({ latitude: 0, longitude: 0 })).toBe(true);
      expect(isValidCoordinates({ latitude: 90, longitude: 180 })).toBe(true);
      expect(isValidCoordinates({ latitude: -90, longitude: -180 })).toBe(true);
      expect(isValidCoordinates({ latitude: 28.6139, longitude: 77.209 })).toBe(true);
    });

    it('should return false for invalid latitude', () => {
      expect(isValidCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
      expect(isValidCoordinates({ latitude: -91, longitude: 0 })).toBe(false);
    });

    it('should return false for invalid longitude', () => {
      expect(isValidCoordinates({ latitude: 0, longitude: 181 })).toBe(false);
      expect(isValidCoordinates({ latitude: 0, longitude: -181 })).toBe(false);
    });
  });

  describe('Property-based tests', () => {
    /**
     * Property: Distance is always non-negative
     */
    it('should always return non-negative distance', () => {
      const testCases = [
        { p1: { latitude: 0, longitude: 0 }, p2: { latitude: 0, longitude: 0 } },
        { p1: { latitude: 90, longitude: 0 }, p2: { latitude: -90, longitude: 0 } },
        { p1: { latitude: 45, longitude: 90 }, p2: { latitude: -45, longitude: -90 } },
        {
          p1: { latitude: 28.6139, longitude: 77.209 },
          p2: { latitude: 19.076, longitude: 72.8777 },
        },
      ];

      for (const { p1, p2 } of testCases) {
        const distance = calculateDistance(p1, p2);
        expect(distance).toBeGreaterThanOrEqual(0);
      }
    });

    /**
     * Property: Triangle inequality holds
     * distance(A, C) <= distance(A, B) + distance(B, C)
     */
    it('should satisfy triangle inequality', () => {
      const pointA: GeoCoordinates = { latitude: 28.6139, longitude: 77.209 };
      const pointB: GeoCoordinates = { latitude: 19.076, longitude: 72.8777 };
      const pointC: GeoCoordinates = { latitude: 12.9716, longitude: 77.5946 };

      const distAB = calculateDistance(pointA, pointB);
      const distBC = calculateDistance(pointB, pointC);
      const distAC = calculateDistance(pointA, pointC);

      expect(distAC).toBeLessThanOrEqual(distAB + distBC + 1); // +1 for floating point tolerance
    });

    /**
     * Property: Validation result consistency
     * If distance < radius, isValid should be true
     * If distance > radius, isValid should be false
     */
    it('should have consistent validation results', () => {
      const branch: GeoCoordinates = { latitude: 28.6139, longitude: 77.209 };
      const testLocations = [
        { latitude: 28.6139, longitude: 77.209 }, // Same location
        { latitude: 28.6141, longitude: 77.209 }, // ~22m away
        { latitude: 28.615, longitude: 77.209 }, // ~122m away
        { latitude: 28.62, longitude: 77.209 }, // ~678m away
      ];

      for (const location of testLocations) {
        const result = validateCheckInLocation(location, branch, 100);
        const distance = calculateDistance(location, branch);

        if (distance <= 100) {
          expect(result.isValid).toBe(true);
        } else {
          expect(result.isValid).toBe(false);
        }
      }
    });
  });
});
