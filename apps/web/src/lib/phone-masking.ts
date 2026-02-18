/**
 * Phone Number Masking Utility
 * Masks phone numbers for privacy (shows only last 4 digits)
 * Requirements: 7.5
 */

/**
 * Mask a phone number, showing only the last 4 digits
 * @param phone - The phone number to mask
 * @returns Masked phone number (e.g., "******6789")
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '******';

  // Remove any non-digit characters for processing
  const digits = phone.replace(/\D/g, '');

  if (digits.length <= 4) {
    return phone; // Don't mask if too short
  }

  // Get last 4 digits
  const lastFour = digits.slice(-4);

  // Create mask for remaining digits
  const maskLength = digits.length - 4;
  const mask = '*'.repeat(maskLength);

  return `${mask}${lastFour}`;
}

/**
 * Format a masked phone number with proper spacing
 * @param phone - The phone number to mask and format
 * @returns Formatted masked phone number (e.g., "***-***-6789")
 */
export function formatMaskedPhone(phone: string | null | undefined): string {
  if (!phone) return '***-***-****';

  const digits = phone.replace(/\D/g, '');

  if (digits.length <= 4) {
    return phone;
  }

  const lastFour = digits.slice(-4);

  // For 10-digit numbers, format as ***-***-XXXX
  if (digits.length === 10) {
    return `***-***-${lastFour}`;
  }

  // For other lengths, just show asterisks and last 4
  const maskLength = digits.length - 4;
  return `${'*'.repeat(maskLength)}${lastFour}`;
}

/**
 * Check if a user role should see masked phone numbers
 * @param role - The user's role
 * @returns Whether phone numbers should be masked
 */
export function shouldMaskPhoneForRole(role: string): boolean {
  // Stylists should see masked phone numbers
  return role === 'stylist';
}
