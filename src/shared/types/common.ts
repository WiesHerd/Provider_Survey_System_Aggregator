/**
 * Shared type definitions for the Survey Aggregator application
 * These types are used across multiple features and should be centralized
 */

/**
 * Base interface for all data entities
 */
export interface BaseEntity {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
  total?: number;
  page?: number;
  pageSize?: number;
}

/**
 * Generic API error response
 */
export interface ApiError {
  error: string;
  message: string;
  code?: string;
  details?: Record<string, any>;
  timestamp?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

/**
 * Generic filter interface
 */
export interface BaseFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Loading state interface
 */
export interface LoadingState {
  loading: boolean;
  error: string | null;
  lastUpdated?: Date;
}

/**
 * File upload interface
 */
export interface FileUpload {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: Date;
  preview?: string;
}

/**
 * Survey source types
 */
export type SurveySource = 'SullivanCotter' | 'MGMA' | 'Gallagher' | 'ECG' | 'AMGA' | 'Custom';

/**
 * Provider types
 */
export type ProviderType = 'Physician' | 'Advanced Practice Provider' | 'Nurse Practitioner' | 'Physician Assistant' | 'CRNA' | 'Other';

/**
 * Geographic regions
 */
export type GeographicRegion = 'Northeast' | 'Southeast' | 'Midwest' | 'West' | 'National' | 'International';

/**
 * Compensation metrics
 */
export interface CompensationMetrics {
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  wrvu_p25: number;
  wrvu_p50: number;
  wrvu_p75: number;
  wrvu_p90: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
}

/**
 * Survey data row interface
 */
export interface SurveyDataRow extends BaseEntity, CompensationMetrics {
  standardizedName: string;
  surveySource: SurveySource;
  surveySpecialty: string;
  geographicRegion: GeographicRegion;
  providerType: ProviderType;
  n_orgs: number;
  n_incumbents: number;
  surveyYear: string;
  rawData?: Record<string, any>;
}

/**
 * Column mapping interface
 */
export interface ColumnMapping extends BaseEntity {
  sourceColumns: Array<{
    name: string;
    surveySource: SurveySource;
  }>;
  standardizedName: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
  description?: string;
}

/**
 * Specialty mapping interface
 */
export interface SpecialtyMapping extends BaseEntity {
  sourceSpecialty: string;
  surveySource: SurveySource;
  standardizedSpecialty: string;
  confidence: number;
  isCustom: boolean;
}

/**
 * Chart data point interface
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

/**
 * Chart configuration interface
 */
export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  data: ChartDataPoint[];
  options?: Record<string, any>;
}

/**
 * Table column definition interface
 */
export interface TableColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'percentage';
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any) => string;
}

/**
 * Table configuration interface
 */
export interface TableConfig {
  columns: TableColumn[];
  data: any[];
  pagination?: PaginationParams;
  sorting?: {
    column: string;
    direction: 'asc' | 'desc';
  };
  filters?: Record<string, any>;
}

/**
 * Form field interface
 */
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'password' | 'select' | 'multiselect' | 'date' | 'textarea' | 'checkbox' | 'radio';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

/**
 * Form configuration interface
 */
export interface FormConfig {
  fields: FormField[];
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
  initialValues?: Record<string, any>;
}

/**
 * Modal configuration interface
 */
export interface ModalConfig {
  title: string;
  content: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
}

/**
 * Toast notification interface
 */
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Breadcrumb item interface
 */
export interface BreadcrumbItem {
  label: string;
  path?: string;
  active?: boolean;
}

/**
 * Navigation item interface
 */
export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ComponentType<any>;
  children?: NavigationItem[];
  active?: boolean;
  disabled?: boolean;
}

/**
 * User interface
 */
export interface User extends BaseEntity {
  email: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: string[];
  lastLogin?: Date;
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry extends BaseEntity {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Export format types
 */
export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

/**
 * Export configuration interface
 */
export interface ExportConfig {
  format: ExportFormat;
  filename?: string;
  includeHeaders?: boolean;
  filters?: Record<string, any>;
  columns?: string[];
}
