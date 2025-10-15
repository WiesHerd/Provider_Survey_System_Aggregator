import React from 'react';
import { cn } from '../../utils/cn';

interface LoadingContainerProps {
  loading: boolean;
  children: React.ReactNode;
  spinner?: React.ReactNode;
  message?: string;
  variant?: 'page' | 'component' | 'inline' | 'overlay';
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * ENTERPRISE LOADING CONTAINER - Google/Microsoft Pattern
 * 
 * Reusable container that can wrap any content with loading states.
 * Follows enterprise patterns used by OpenAI, Google, Microsoft.
 * 
 * @param loading - Whether to show loading state
 * @param children - Content to wrap
 * @param spinner - Custom spinner component
 * @param message - Loading message
 * @param variant - Loading variant (page, component, inline, overlay)
 * @param className - Additional CSS classes
 * @param fallback - Custom fallback content
 */
export const LoadingContainer: React.FC<LoadingContainerProps> = ({
  loading,
  children,
  spinner,
  message = 'Loading...',
  variant = 'component',
  className,
  fallback
}) => {
  // If not loading, render children
  if (!loading) {
    return <>{children}</>;
  }

  // Custom fallback content
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default spinner based on variant
  const getDefaultSpinner = () => {
    switch (variant) {
      case 'page':
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full mx-4">
              <div className="w-8 h-8 rounded-full animate-spin mx-auto mb-4"
                style={{
                  background: 'conic-gradient(from 0deg, #8B5CF6, #A855F7, #C084FC, transparent 70%)',
                  animationDuration: '1s',
                  animationTimingFunction: 'linear',
                  mask: 'radial-gradient(circle at center, transparent 60%, black 60%)',
                  WebkitMask: 'radial-gradient(circle at center, transparent 60%, black 60%)'
                }}
              />
              <p className="text-sm text-gray-600 font-medium text-center">{message}</p>
            </div>
          </div>
        );
      
      case 'component':
        return (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 rounded-full animate-spin mr-3"
              style={{
                background: 'conic-gradient(from 0deg, #8B5CF6, #A855F7, #C084FC, transparent 70%)',
                animationDuration: '1s',
                animationTimingFunction: 'linear',
                mask: 'radial-gradient(circle at center, transparent 60%, black 60%)',
                WebkitMask: 'radial-gradient(circle at center, transparent 60%, black 60%)'
              }}
            />
            <span className="text-sm text-gray-600">{message}</span>
          </div>
        );
      
      case 'inline':
        return (
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full animate-spin mr-2"
              style={{
                background: 'conic-gradient(from 0deg, #8B5CF6, #A855F7, #C084FC, transparent 70%)',
                animationDuration: '1s',
                animationTimingFunction: 'linear',
                mask: 'radial-gradient(circle at center, transparent 60%, black 60%)',
                WebkitMask: 'radial-gradient(circle at center, transparent 60%, black 60%)'
              }}
            />
            <span className="text-sm text-gray-500">{message}</span>
          </div>
        );
      
      case 'overlay':
        return (
          <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <div className="w-6 h-6 rounded-full animate-spin mx-auto mb-3"
                style={{
                  background: 'conic-gradient(from 0deg, #8B5CF6, #A855F7, #C084FC, transparent 70%)',
                  animationDuration: '1s',
                  animationTimingFunction: 'linear',
                  mask: 'radial-gradient(circle at center, transparent 60%, black 60%)',
                  WebkitMask: 'radial-gradient(circle at center, transparent 60%, black 60%)'
                }}
              />
              <p className="text-sm text-gray-600 text-center">{message}</p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={cn(className)}>
      {spinner || getDefaultSpinner()}
    </div>
  );
};

/**
 * DEPRECATED: Use UnifiedLoadingSpinner instead
 * 
 * This component is deprecated in favor of UnifiedLoadingSpinner.
 * All new implementations should use UnifiedLoadingSpinner for consistency.
 * 
 * @deprecated Use UnifiedLoadingSpinner from './UnifiedLoadingSpinner' instead
 */
export const withLoading = <P extends object>(
  Component: React.ComponentType<P>,
  loadingProps: Partial<LoadingContainerProps> = {}
) => {
  return (props: P & { loading?: boolean }) => {
    const { loading, ...componentProps } = props;
    
    return (
      <LoadingContainer
        loading={loading || false}
        {...loadingProps}
      >
        <Component {...(componentProps as P)} />
      </LoadingContainer>
    );
  };
};

/**
 * ENTERPRISE BUTTON LOADING - Microsoft/Google Pattern
 * 
 * Reusable button with built-in loading state.
 * Used by Microsoft Office, Google Workspace.
 */
export const LoadingButton: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}> = ({ loading, children, onClick, disabled, className, variant = 'primary' }) => {
  const baseClasses = "inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantClasses = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-indigo-500"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        baseClasses,
        variantClasses[variant],
        (disabled || loading) && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {loading && (
        <div className="w-4 h-4 rounded-full animate-spin mr-2"
          style={{
            background: 'conic-gradient(from 0deg, #8B5CF6, #A855F7, #C084FC, transparent 70%)',
            animationDuration: '1s',
            animationTimingFunction: 'linear',
            mask: 'radial-gradient(circle at center, transparent 60%, black 60%)',
            WebkitMask: 'radial-gradient(circle at center, transparent 60%, black 60%)'
          }}
        />
      )}
      {children}
    </button>
  );
};

/**
 * ENTERPRISE FORM LOADING - Google/OpenAI Pattern
 * 
 * Form wrapper with loading state management.
 * Used by Google Forms, OpenAI API interfaces.
 */
export const LoadingForm: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}> = ({ loading, children, onSubmit, className }) => {
  return (
    <LoadingContainer
      loading={loading}
      variant="overlay"
      message="Processing form..."
      className={className}
    >
      <form onSubmit={onSubmit}>
        {children}
      </form>
    </LoadingContainer>
  );
};
