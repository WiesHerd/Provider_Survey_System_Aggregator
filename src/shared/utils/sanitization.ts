/**
 * XSS Protection and Input Sanitization Utilities
 * 
 * Provides functions to sanitize user input and prevent XSS attacks.
 * All user-generated content should be sanitized before display.
 */

/**
 * Sanitize a string to prevent XSS attacks
 * Escapes HTML special characters
 * 
 * @param input - String to sanitize
 * @returns Sanitized string safe for HTML display
 */
export const sanitizeHtml = (input: string | null | undefined): string => {
  if (!input) return '';
  
  const str = String(input);
  
  // Escape HTML special characters
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitize an object's string values recursively
 * Useful for sanitizing CSV data before display
 * 
 * @param obj - Object to sanitize
 * @returns New object with sanitized string values
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeHtml(sanitized[key]) as any;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]) as any;
    }
  }
  
  return sanitized;
};

/**
 * Validate file name to prevent path traversal attacks
 * 
 * @param filename - File name to validate
 * @returns True if filename is safe
 */
export const isValidFilename = (filename: string): boolean => {
  // Check for path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  
  // Check for null bytes
  if (filename.includes('\0')) {
    return false;
  }
  
  // Check length (reasonable limit)
  if (filename.length > 255) {
    return false;
  }
  
  return true;
};

/**
 * Sanitize file name for safe storage
 * 
 * @param filename - File name to sanitize
 * @returns Sanitized file name
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '').replace(/[\/\\]/g, '_');
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Remove other dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*]/g, '_');
  
  // Trim and limit length
  sanitized = sanitized.trim().substring(0, 255);
  
  return sanitized || 'file';
};

/**
 * Validate CSV cell content for XSS
 * 
 * @param cellValue - Cell value to validate
 * @returns True if cell value is safe
 */
export const isValidCSVCell = (cellValue: any): boolean => {
  if (cellValue === null || cellValue === undefined) {
    return true; // Null/undefined values are safe
  }
  
  const str = String(cellValue);
  
  // Check for script tags
  if (/<script/i.test(str)) {
    return false;
  }
  
  // Check for javascript: protocol
  if (/javascript:/i.test(str)) {
    return false;
  }
  
  // Check for on* event handlers
  if (/on\w+\s*=/i.test(str)) {
    return false;
  }
  
  // Check for data: URLs with scripts
  if (/data:text\/html/i.test(str)) {
    return false;
  }
  
  return true;
};

/**
 * Sanitize CSV cell content
 * 
 * @param cellValue - Cell value to sanitize
 * @returns Sanitized cell value
 */
export const sanitizeCSVCell = (cellValue: any): string => {
  if (cellValue === null || cellValue === undefined) {
    return '';
  }
  
  const str = String(cellValue);
  
  // First check if it's safe
  if (!isValidCSVCell(str)) {
    // Remove dangerous content
    return str
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:text\/html/gi, '');
  }
  
  // If safe, just escape HTML
  return sanitizeHtml(str);
};






