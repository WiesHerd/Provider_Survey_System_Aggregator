import React from 'react';
import { BoltIcon } from '@heroicons/react/24/outline';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

/**
 * EmptyState component - Reusable empty state for all mapping screens
 * Provides consistent styling and layout for empty states across the application
 * 
 * @param icon - Optional custom icon (defaults to BoltIcon)
 * @param title - Empty state title
 * @param message - Empty state description
 * @param action - Optional action button
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action
}) => {
  const defaultIcon = <BoltIcon className="h-6 w-6 text-gray-500" />;
  
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          {icon || defaultIcon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
};
