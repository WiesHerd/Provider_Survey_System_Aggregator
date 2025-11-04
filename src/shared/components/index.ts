// UNIFIED LOADING SPINNER - Single Source of Truth
// This is the ONLY spinner component that should be used throughout the application
export { 
  UnifiedLoadingSpinner,
  default as UnifiedLoadingSpinnerDefault
} from './UnifiedLoadingSpinner';

// DEPRECATED: Legacy spinner components - kept for backward compatibility
// ⚠️ WARNING: These components are deprecated. Use UnifiedLoadingSpinner instead.
export { 
  default as LoadingSpinner,
  ButtonSpinner,
  PageSpinner,
  InlineSpinner,
  OverlaySpinner,
  SuspenseSpinner,
  TableSpinner
} from './LoadingSpinner';

export { SpecialtyAutocomplete } from './SpecialtyAutocomplete';

// Confirmation Dialog - ENTERPRISE-GRADE confirmation system
export { ConfirmationDialog } from './ConfirmationDialog';

// Provider Type Components
export {
  default as ProviderTypeSelector,
  CompactProviderTypeSelector,
  ProviderTypeBadge
} from './ProviderTypeSelector';

// Provider Empty State Components
export {
  default as ProviderEmptyState,
  CompactProviderEmptyState
} from './ProviderEmptyState';

// Standard Form Components
export { StandardDropdown } from './StandardDropdown';

// Analysis Progress Components
export { AnalysisProgressBar } from './AnalysisProgressBar';

// Pagination Components
export { ModernPagination } from './ModernPagination';

// DEPRECATED: Legacy loading containers - kept for backward compatibility
// ⚠️ WARNING: These components are deprecated. Use UnifiedLoadingSpinner instead.
export { 
  LoadingContainer, 
  withLoading, 
  LoadingButton, 
  LoadingForm 
} from './LoadingContainer';

// Standard Tooltip Components - SINGLE SOURCE OF TRUTH for all tooltips
export {
  default as StandardTooltip,
  SimpleTooltip,
  RichTooltip,
  HelpTooltip
} from './StandardTooltip';