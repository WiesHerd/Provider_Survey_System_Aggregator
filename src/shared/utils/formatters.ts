/**
 * Shared formatting utilities for the Survey Aggregator application
 * These functions provide consistent formatting across all features
 */

/**
 * Formats a number as currency
 * 
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 * 
 * @example
 * ```typescript
 * formatCurrency(1234.56); // Returns "$1,235"
 * formatCurrency(1234.56, 2); // Returns "$1,234.56"
 * ```
 */
export const formatCurrency = (
  value: number, 
  decimals: number = 0,
  currency: string = 'USD'
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Formats a number with specified decimal places
 * 
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 * 
 * @example
 * ```typescript
 * formatNumber(1234.567); // Returns "1,234.57"
 * formatNumber(1234.567, 3); // Returns "1,234.567"
 * ```
 */
export const formatNumber = (
  value: number, 
  decimals: number = 2
): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Formats a number as a percentage
 * 
 * @param value - Number to format (0-1 for decimal, 0-100 for percentage)
 * @param isDecimal - Whether the value is in decimal form (default: false)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 * 
 * @example
 * ```typescript
 * formatPercentage(0.1234); // Returns "12.3%"
 * formatPercentage(12.34, false); // Returns "12.3%"
 * ```
 */
export const formatPercentage = (
  value: number, 
  isDecimal: boolean = true,
  decimals: number = 1
): string => {
  const percentageValue = isDecimal ? value * 100 : value;
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(percentageValue / 100);
};

/**
 * Formats a date string or Date object
 * 
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string
 * 
 * @example
 * ```typescript
 * formatDate(new Date()); // Returns "8/11/2025"
 * formatDate(new Date(), { year: 'numeric', month: 'long' }); // Returns "August 2025"
 * ```
 */
export const formatDate = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
};

/**
 * Formats a file size in bytes to human readable format
 * 
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted file size string
 * 
 * @example
 * ```typescript
 * formatFileSize(1024); // Returns "1.00 KB"
 * formatFileSize(1048576); // Returns "1.00 MB"
 * ```
 */
export const formatFileSize = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Formats a phone number to a readable format
 * 
 * @param phoneNumber - Phone number string
 * @returns Formatted phone number
 * 
 * @example
 * ```typescript
 * formatPhoneNumber('1234567890'); // Returns "(123) 456-7890"
 * ```
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  
  return phoneNumber;
};

/**
 * Truncates text to a specified length with ellipsis
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @param suffix - Suffix to add when truncated (default: '...')
 * @returns Truncated text
 * 
 * @example
 * ```typescript
 * truncateText('This is a very long text', 10); // Returns "This is a..."
 * ```
 */
export const truncateText = (
  text: string, 
  maxLength: number, 
  suffix: string = '...'
): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Capitalizes the first letter of each word in a string
 * 
 * @param text - Text to capitalize
 * @returns Capitalized text
 * 
 * @example
 * ```typescript
 * capitalizeWords('hello world'); // Returns "Hello World"
 * ```
 */
export const capitalizeWords = (text: string): string => {
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};
