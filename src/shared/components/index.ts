// ENTERPRISE LOADING SPINNER - Single Source of Truth
// This is the ONLY spinner component that should be used throughout the application
export { 
  EnterpriseLoadingSpinner,
  default as EnterpriseLoadingSpinnerDefault
} from './EnterpriseLoadingSpinner';
export type { EnterpriseLoadingSpinnerProps } from './EnterpriseLoadingSpinner';

// Loading Progress Hook
export { useLoadingProgress } from '../hooks/useLoadingProgress';

// DEPRECATED: Legacy spinner components - kept for backward compatibility
// ⚠️ WARNING: These components are deprecated. Use EnterpriseLoadingSpinner instead.
// UnifiedLoadingSpinner redirects to EnterpriseLoadingSpinner for backward compatibility
export { 
  EnterpriseLoadingSpinner as UnifiedLoadingSpinner,
  EnterpriseLoadingSpinner as UnifiedLoadingSpinnerDefault
} from './EnterpriseLoadingSpinner';
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
export { SpecialtyDropdown } from './SpecialtyDropdown';
export type { SpecialtyDropdownProps } from './SpecialtyDropdown';

// Analysis Progress Components (DEPRECATED - Use EnterpriseLoadingSpinner)
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

// Clear Filter Button - REUSABLE COMPONENT for all filter sections
export { ClearFilterButton } from './ClearFilterButton';

// Welcome Banner - First-time user guidance
export { WelcomeBanner, isWelcomeBannerDismissed, resetWelcomeBanner } from './WelcomeBanner';