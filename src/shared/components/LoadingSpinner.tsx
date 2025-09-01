import React from 'react';
import { cn } from '../../utils/cn';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
  showMessage?: boolean;
}

/**
 * STANDARDIZED Loading Spinner - Microsoft/Google Style
 * 
 * CRITICAL: Same exact spinner everywhere in the app
 * - Always 32x32px (w-8 h-8)
 * - Always centered
 * - Same animation (1s linear)
 * - Same colors (gray-200 background, indigo-600 accent)
 * - Professional, consistent UX
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  size = 'md', // Ignored - always same size for consistency
  variant = 'primary', // Ignored - always same colors for consistency
  fullScreen = false,
  overlay = false,
  className,
  showMessage = true
}) => {
  // Microsoft/Google style spinner - ALWAYS the same
  const SpinnerIcon = () => (
    <div 
      className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin border-t-indigo-600"
      style={{
        animationDuration: '1s',
        animationTimingFunction: 'linear'
      }}
    />
  );

  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center gap-3',
      fullScreen ? 'min-h-screen' : 'py-8',
      className
    )}>
      <SpinnerIcon />
      {showMessage && message && (
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

// Button loading spinner - SAME EXACT SPINNER, inline
export const ButtonSpinner: React.FC<{ size?: 'sm' | 'md'; className?: string }> = ({ 
  size, // Ignored - always same size
  className 
}) => (
  <div 
    className={cn(
      'w-5 h-5 border-2 border-gray-200 rounded-full animate-spin border-t-current inline-block',
      className
    )}
    style={{
      animationDuration: '1s',
      animationTimingFunction: 'linear'
    }}
  />
);

// Page loading spinner - SAME EXACT SPINNER, full page
export const PageSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <LoadingSpinner 
    message={message}
    fullScreen={true}
  />
);

// Inline loading spinner - SAME EXACT SPINNER, small areas
export const InlineSpinner: React.FC<{ 
  message?: string; 
  size?: 'sm' | 'md'; // Ignored - always same size
  className?: string;
}> = ({ 
  message, 
  size, // Ignored
  className
}) => (
  <LoadingSpinner 
    message={message}
    className={cn('py-4', className)}
    showMessage={!!message}
  />
);

// Overlay loading spinner - SAME EXACT SPINNER, with overlay
export const OverlaySpinner: React.FC<{ message?: string }> = ({ message = 'Processing...' }) => (
  <LoadingSpinner 
    message={message}
    overlay={true}
  />
);

// Suspense fallback spinner - SAME EXACT SPINNER, for React Suspense
export const SuspenseSpinner: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="text-center py-8">
    <LoadingSpinner 
      message={message}
      showMessage={true}
      className="min-h-[120px]"
    />
  </div>
);

// Table loading spinner - SAME EXACT SPINNER, with skeleton
export const TableSpinner: React.FC<{ message?: string; rows?: number }> = ({ 
  message = 'Loading data...', 
  rows = 3 
}) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex space-x-4 py-2 animate-pulse">
        <div className="rounded-full bg-gray-200 h-6 w-6"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    ))}
    <div className="text-center pt-4">
      <LoadingSpinner message={message} />
    </div>
  </div>
);

export default LoadingSpinner;
