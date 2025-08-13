/**
 * Application constants for the Survey Aggregator
 * These constants are used across multiple features and should be centralized
 */

/**
 * Survey source options
 */
export const SURVEY_SOURCES = [
  'SullivanCotter',
  'MGMA',
  'Gallagher',
  'ECG',
  'AMGA'
] as const;

/**
 * Provider type options
 */
export const PROVIDER_TYPES = [
  'Physician',
  'Advanced Practice Provider',
  'Nurse Practitioner',
  'Physician Assistant',
  'CRNA',
  'Other'
] as const;

/**
 * Geographic region options
 */
export const GEOGRAPHIC_REGIONS = [
  'Northeast',
  'Southeast',
  'Midwest',
  'West',
  'National',
  'International'
] as const;

/**
 * Common specialties
 */
export const COMMON_SPECIALTIES = [
  'Allergy & Immunology',
  'Anesthesiology',
  'Cardiology',
  'Dermatology',
  'Emergency Medicine',
  'Endocrinology',
  'Family Medicine',
  'Gastroenterology',
  'General Surgery',
  'Hematology/Oncology',
  'Infectious Disease',
  'Internal Medicine',
  'Nephrology',
  'Neurology',
  'Obstetrics & Gynecology',
  'Ophthalmology',
  'Orthopedics',
  'Otolaryngology',
  'Pathology',
  'Pediatrics',
  'Physical Medicine & Rehabilitation',
  'Psychiatry',
  'Pulmonology',
  'Radiology',
  'Rheumatology',
  'Urology'
] as const;

/**
 * Compensation metrics
 */
export const COMPENSATION_METRICS = [
  'tcc_p25',
  'tcc_p50',
  'tcc_p75',
  'tcc_p90',
  'wrvu_p25',
  'wrvu_p50',
  'wrvu_p75',
  'wrvu_p90',
  'cf_p25',
  'cf_p50',
  'cf_p75',
  'cf_p90'
] as const;

/**
 * Table pagination options
 */
export const PAGINATION_OPTIONS = [10, 25, 50, 100] as const;

/**
 * Default pagination settings
 */
export const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 25,
  total: 0
} as const;

/**
 * Chart colors for consistent theming
 */
export const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  warning: '#F97316',
  info: '#06B6D4',
  success: '#22C55E',
  gray: '#6B7280'
} as const;

/**
 * Application routes
 */
export const ROUTES = {
  DASHBOARD: '/dashboard',
  UPLOAD: '/upload',
  ANALYTICS: '/analytics',
  REGIONAL_ANALYTICS: '/regional-analytics',
  FMV_CALCULATOR: '/fmv-calculator',
  SPECIALTY_MAPPING: '/specialty-mapping',
  COLUMN_MAPPING: '/column-mapping'
} as const;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  SURVEYS: '/api/surveys',
  ANALYTICS: '/api/analytics',
  REGIONAL: '/api/regional',
  FMV: '/api/fmv',
  MAPPINGS: '/api/mappings',
  UPLOAD: '/api/upload'
} as const;

/**
 * File upload settings
 */
export const FILE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['.csv', '.xlsx', '.xls'],
  MAX_FILES: 1
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  COLUMN_MAPPINGS: 'columnMappings',
  SPECIALTY_MAPPINGS: 'specialtyMappings',
  USER_PREFERENCES: 'userPreferences',
  AUTH_TOKEN: 'authToken'
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'File size exceeds the maximum limit of 10MB',
  INVALID_FILE_TYPE: 'Please upload a valid CSV or Excel file',
  UPLOAD_FAILED: 'Failed to upload file. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again.'
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  FILE_UPLOADED: 'File uploaded successfully',
  DATA_SAVED: 'Data saved successfully',
  MAPPING_UPDATED: 'Mapping updated successfully',
  EXPORT_COMPLETED: 'Export completed successfully'
} as const;

/**
 * Validation rules
 */
export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  YEAR: /^(19|20)\d{2}$/,
  CURRENCY: /^\d+(\.\d{1,2})?$/
} as const;

/**
 * Performance thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  MAX_BUNDLE_SIZE: 500 * 1024, // 500KB
  MAX_BUILD_TIME: 30 * 1000, // 30 seconds
  MAX_API_RESPONSE_TIME: 5000, // 5 seconds
  MIN_LIGHTHOUSE_SCORE: 90
} as const;
