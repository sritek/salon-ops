/**
 * Customers Service Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { normalizePhone, maskPhone } from './customers.service';

describe('normalizePhone', () => {
  it('should return 10-digit phone as-is', () => {
    expect(normalizePhone('9876543210')).toBe('9876543210');
  });

  it('should strip non-digit characters', () => {
    expect(normalizePhone('987-654-3210')).toBe('9876543210');
    expect(normalizePhone('(987) 654-3210')).toBe('9876543210');
    expect(normalizePhone('987 654 3210')).toBe('9876543210');
    expect(normalizePhone('+91 987 654 3210')).toBe('9876543210');
  });

  it('should strip 91 country code from 12-digit number', () => {
    expect(normalizePhone('919876543210')).toBe('9876543210');
    expect(normalizePhone('+919876543210')).toBe('9876543210');
    expect(normalizePhone('91-987-654-3210')).toBe('9876543210');
  });

  it('should throw error for invalid phone length', () => {
    expect(() => normalizePhone('12345')).toThrow('Invalid phone number format');
    expect(() => normalizePhone('123456789')).toThrow('Invalid phone number format');
    expect(() => normalizePhone('12345678901234')).toThrow('Invalid phone number format');
  });

  it('should throw error for 12-digit number not starting with 91', () => {
    expect(() => normalizePhone('929876543210')).toThrow('Invalid phone number format');
    expect(() => normalizePhone('019876543210')).toThrow('Invalid phone number format');
  });
});

describe('maskPhone', () => {
  it('should mask middle digits of 10-digit phone', () => {
    expect(maskPhone('9876543210')).toBe('98XXX-XX210');
  });

  it('should return phone as-is if not 10 digits', () => {
    expect(maskPhone('12345')).toBe('12345');
    expect(maskPhone('123456789012')).toBe('123456789012');
  });

  it('should preserve first 2 and last 3 digits', () => {
    const masked = maskPhone('1234567890');
    expect(masked.startsWith('12')).toBe(true);
    expect(masked.endsWith('890')).toBe(true);
  });
});
