import React from 'react';
import { cn } from '../../utils/cn';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  size = 'md',
  variant = 'primary',
  fullScreen = false,
  overlay = false,
  className
}) => {
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6', 
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const variantClasses = {
    default: 'text-gray-600',
    primary: 'text-indigo-600',
    secondary: 'text-gray-500',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    error: 'text-red-600'
  };

  const spinnerSize = sizeClasses[size];
  const spinnerColor = variantClasses[variant];

  const SpinnerIcon = () => (
    <svg 
      className={cn(
        'animate-spin',
        spinnerSize,
        spinnerColor,
        'inline-block'
      )}
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const content = (
    <div className={cn(
      'flex flex-col items-center justify-center gap-3',
      fullScreen ? 'min-h-screen' : 'min-h-[200px]',
      className
    )}>
      <SpinnerIcon />
      {message && (
        <p className={cn(
          'text-sm font-medium text-center',
          variant === 'default' ? 'text-gray-600' : 'text-gray-700'
        )}>
          {message}
        </p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-50">
        {content}
      </div>
    );
  }

  return content;
};

// Button loading spinner for inline use
export const ButtonSpinner: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5'
  };

  return (
    <svg 
      className={cn(
        'animate-spin text-current',
        sizeClasses[size]
      )}
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// Page loading spinner for full page loads
export const PageSpinner: React.FC<{ message?: string }> = ({ message = 'Loading page...' }) => (
  <LoadingSpinner 
    message={message}
    size="lg"
    variant="primary"
    fullScreen={true}
  />
);

// Inline loading spinner for small areas
export const InlineSpinner: React.FC<{ message?: string; size?: 'sm' | 'md' }> = ({ 
  message, 
  size = 'md' 
}) => (
  <LoadingSpinner 
    message={message}
    size={size}
    variant="default"
    className="py-8"
  />
);

// Overlay loading spinner for modal/overlay contexts
export const OverlaySpinner: React.FC<{ message?: string }> = ({ message = 'Processing...' }) => (
  <LoadingSpinner 
    message={message}
    size="md"
    variant="primary"
    overlay={true}
  />
);

export default LoadingSpinner;
