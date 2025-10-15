import React from 'react';

/**
 * DEPRECATED: Use UnifiedLoadingSpinner instead
 * 
 * This component is deprecated in favor of UnifiedLoadingSpinner.
 * All new implementations should use UnifiedLoadingSpinner for consistency.
 * 
 * @deprecated Use UnifiedLoadingSpinner from './UnifiedLoadingSpinner' instead
 */

interface StandardSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
}

const StandardSpinner: React.FC<StandardSpinnerProps> = ({ 
  message = 'Loading...', 
  fullScreen = false,
  overlay = false,
  className = ''
}) => {
  // Microsoft/Google style spinner - consistent everywhere
  const SpinnerIcon = () => (
    <div className="relative">
      {/* Main spinner ring - exactly 32x32px always */}
      <div 
        className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin border-t-indigo-600"
        style={{
          animationDuration: '1s',
          animationTimingFunction: 'linear'
        }}
      />
    </div>
  );

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${fullScreen ? 'min-h-screen' : 'py-8'} ${className}`}>
      <SpinnerIcon />
      {message && (
        <p className="text-sm text-gray-600 font-medium text-center max-w-xs">
          {message}
        </p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

// Button spinner - same size but inline
export const ButtonSpinner: React.FC = () => (
  <div 
    className="w-5 h-5 border-2 border-gray-200 rounded-full animate-spin border-t-current inline-block"
    style={{
      animationDuration: '1s',
      animationTimingFunction: 'linear'
    }}
  />
);

// Page spinner - same spinner, full screen
export const PageSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <StandardSpinner message={message} fullScreen={true} />
);

// Overlay spinner - same spinner, with overlay
export const OverlaySpinner: React.FC<{ message?: string }> = ({ message = 'Processing...' }) => (
  <StandardSpinner message={message} overlay={true} />
);

// Suspense spinner - same spinner, for React Suspense
export const SuspenseSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="text-center py-8">
    <StandardSpinner message={message} className="min-h-[120px]" />
  </div>
);

export default StandardSpinner;
