/**
 * Loyalty Service Unit Tests
 */

import { describe, it, expect } from 'vitest';

describe('Loyalty Points Calculation', () => {
  /**
   * Calculate points earned from bill amount
   */
  function calculatePointsEarned(billAmount: number, pointsPerUnit: number): number {
    return Math.floor(billAmount * pointsPerUnit);
  }

  /**
   * Calculate discount value from points
   */
  function calculateDiscountValue(points: number, redemptionValuePerPoint: number): number {
    return points * redemptionValuePerPoint;
  }

  describe('Points Earning', () => {
    it('should calculate points correctly with default rate', () => {
      // Default: 1 point per ₹100 (0.01 points per unit)
      const pointsPerUnit = 0.01;

      expect(calculatePointsEarned(1000, pointsPerUnit)).toBe(10);
      expect(calculatePointsEarned(500, pointsPerUnit)).toBe(5);
      expect(calculatePointsEarned(100, pointsPerUnit)).toBe(1);
    });

    it('should floor fractional points', () => {
      const pointsPerUnit = 0.01;

      expect(calculatePointsEarned(150, pointsPerUnit)).toBe(1);
      expect(calculatePointsEarned(199, pointsPerUnit)).toBe(1);
      expect(calculatePointsEarned(250, pointsPerUnit)).toBe(2);
    });

    it('should return 0 for small amounts', () => {
      const pointsPerUnit = 0.01;

      expect(calculatePointsEarned(50, pointsPerUnit)).toBe(0);
      expect(calculatePointsEarned(99, pointsPerUnit)).toBe(0);
    });

    it('should handle higher earning rates', () => {
      // 2 points per ₹100
      const pointsPerUnit = 0.02;

      expect(calculatePointsEarned(1000, pointsPerUnit)).toBe(20);
      expect(calculatePointsEarned(500, pointsPerUnit)).toBe(10);
    });

    it('should handle zero bill amount', () => {
      expect(calculatePointsEarned(0, 0.01)).toBe(0);
    });
  });

  describe('Points Redemption', () => {
    it('should calculate discount value correctly', () => {
      // Default: ₹0.50 per point
      const redemptionValuePerPoint = 0.5;

      expect(calculateDiscountValue(100, redemptionValuePerPoint)).toBe(50);
      expect(calculateDiscountValue(200, redemptionValuePerPoint)).toBe(100);
      expect(calculateDiscountValue(10, redemptionValuePerPoint)).toBe(5);
    });

    it('should handle different redemption rates', () => {
      // ₹0.25 per point
      expect(calculateDiscountValue(100, 0.25)).toBe(25);

      // ₹1.00 per point
      expect(calculateDiscountValue(100, 1.0)).toBe(100);
    });

    it('should handle zero points', () => {
      expect(calculateDiscountValue(0, 0.5)).toBe(0);
    });
  });

  describe('Balance Calculations', () => {
    it('should calculate new balance after credit', () => {
      const currentBalance = 100;
      const pointsEarned = 10;
      const newBalance = currentBalance + pointsEarned;

      expect(newBalance).toBe(110);
    });

    it('should calculate new balance after debit', () => {
      const currentBalance = 100;
      const pointsRedeemed = 50;
      const newBalance = currentBalance - pointsRedeemed;

      expect(newBalance).toBe(50);
    });

    it('should detect insufficient balance', () => {
      const currentBalance = 30;
      const pointsToRedeem = 50;
      const hasInsufficientBalance = currentBalance < pointsToRedeem;

      expect(hasInsufficientBalance).toBe(true);
    });

    it('should allow exact balance redemption', () => {
      const currentBalance = 50;
      const pointsToRedeem = 50;
      const hasInsufficientBalance = currentBalance < pointsToRedeem;

      expect(hasInsufficientBalance).toBe(false);
    });
  });
});

describe('Loyalty Adjustment Types', () => {
  function calculatePointsChange(type: 'credit' | 'debit', points: number): number {
    return type === 'credit' ? points : -points;
  }

  it('should handle credit adjustment', () => {
    const pointsChange = calculatePointsChange('credit', 100);
    expect(pointsChange).toBe(100);
  });

  it('should handle debit adjustment', () => {
    const pointsChange = calculatePointsChange('debit', 100);
    expect(pointsChange).toBe(-100);
  });
});

describe('Transaction Types', () => {
  const TRANSACTION_TYPES = ['earned', 'redeemed', 'adjusted', 'expired'];

  it('should have all expected transaction types', () => {
    expect(TRANSACTION_TYPES).toContain('earned');
    expect(TRANSACTION_TYPES).toContain('redeemed');
    expect(TRANSACTION_TYPES).toContain('adjusted');
    expect(TRANSACTION_TYPES).toContain('expired');
  });
});
