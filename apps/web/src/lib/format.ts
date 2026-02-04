/**
 * Formatting Utilities
 * 
 * Provides consistent formatting for currency, dates, times, phone numbers,
 * and other values across the application.
 */

import { format, formatDistance, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { enIN } from 'date-fns/locale';

/**
 * Format currency in Indian format (₹X,XX,XXX.XX)
 */
export function formatCurrency(amount: number, compact = false): string {
  if (compact && amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (compact && amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (compact && amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number in Indian format (X,XX,XXX)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Format date with customizable format string
 */
export function formatDate(
  date: string | Date | null | undefined,
  formatStr: string = 'dd/MM/yyyy'
): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: enIN });
}

/**
 * Format relative date (Today, Tomorrow, Yesterday, or date)
 */
export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : date;

  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';

  return format(d, 'dd MMM yyyy', { locale: enIN });
}

/**
 * Format time (12-hour with AM/PM)
 */
export function formatTime(time: string | null | undefined): string {
  if (!time) return '-';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
}

/**
 * Format duration in minutes to human readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format phone number (Indian format)
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

/**
 * Mask phone number (for privacy)
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `${digits.slice(0, 2)}XXXX${digits.slice(6)}`;
  }
  return phone.replace(/\d(?=\d{4})/g, 'X');
}

/**
 * Format time ago (e.g., "2 minutes ago", "3 hours ago")
 */
export function formatTimeAgo(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistance(d, new Date(), { addSuffix: true, locale: enIN });
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Format name (Title Case)
 */
export function formatName(name: string | null | undefined): string {
  if (!name) return '-';
  return name
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get initials from name
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
