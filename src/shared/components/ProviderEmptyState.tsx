/**
 * Provider Empty State Component
 * 
 * Professional empty state component for when no provider-specific data
 * is available. Provides clear guidance and actionable next steps.
 */

import React from 'react';
import { 
  ArrowUpTrayIcon, 
  ArrowPathIcon, 
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ProviderType } from '../../types/provider';

export interface ProviderEmptyStateProps {
  providerType: ProviderType;
  message?: string;
  actions?: Array<{
    label: string;
    action: string;
    variant: 'primary' | 'secondary';
    icon?: string;
  }>;
  onAction?: (action: string) => void;
  className?: string;
}

/**
 * Provider Empty State Component
 * 
 * Displays a professional empty state when no provider data is available,
 * with clear messaging and actionable next steps.
 */
export const ProviderEmptyState: React.FC<ProviderEmptyStateProps> = ({
  providerType,
  message,
  actions = [],
  onAction,
  className = ''
}) => {
  // Get provider-specific content
  const getProviderContent = () => {
    switch (providerType) {
      case 'PHYSICIAN':
        return {
          title: 'No Physician Data Available',
          description: message || 'To view physician analytics and perform fair market value calculations, you need to upload and map physician survey data.',
          icon: ChartBarIcon,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'APP':
        return {
          title: 'No APP Data Available',
          description: message || 'To view Advanced Practice Provider analytics and perform fair market value calculations, you need to upload and map APP survey data.',
          icon: ChartBarIcon,
          iconColor: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      default:
        return {
          title: 'No Data Available',
          description: message || 'No data is currently available for the selected provider type.',
          icon: ExclamationTriangleIcon,
          iconColor: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const content = getProviderContent();
  const Icon = content.icon;

  // Handle action clicks
  const handleAction = (action: string) => {
    if (onAction) {
      onAction(action);
    }
  };

  // Get icon for action
  const getActionIcon = (iconName?: string) => {
    switch (iconName) {
      case 'upload':
        return ArrowUpTrayIcon;
      case 'retry':
        return ArrowPathIcon;
      case 'switch':
        return ArrowPathIcon;
      default:
        return null;
    }
  };

  return (
    <div className={`provider-empty-state ${className}`}>
      <div className={`max-w-md mx-auto ${content.bgColor} ${content.borderColor} border rounded-xl p-8 text-center`}>
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={`w-16 h-16 ${content.bgColor} ${content.borderColor} border-2 rounded-full flex items-center justify-center`}>
            <Icon className={`w-8 h-8 ${content.iconColor}`} />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {content.title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          {content.description}
        </p>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="space-y-3">
            {actions.map((action, index) => {
              const ActionIcon = getActionIcon(action.icon);
              
              return (
                <button
                  key={index}
                  onClick={() => handleAction(action.action)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    action.variant === 'primary'
                      ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  }`}
                >
                  {ActionIcon && <ActionIcon className="w-4 h-4" />}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Additional Help */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Need help? Check the{' '}
            <button 
              onClick={() => handleAction('help')}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              getting started guide
            </button>
            {' '}or contact support.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact version for smaller spaces
 */
export const CompactProviderEmptyState: React.FC<ProviderEmptyStateProps> = ({
  providerType,
  message,
  actions = [],
  onAction,
  className = ''
}) => {
  const getProviderContent = () => {
    switch (providerType) {
      case 'PHYSICIAN':
        return {
          title: 'No Physician Data',
          description: message || 'Upload physician data to view analytics.',
          iconColor: 'text-blue-500'
        };
      case 'APP':
        return {
          title: 'No APP Data',
          description: message || 'Upload APP data to view analytics.',
          iconColor: 'text-green-500'
        };
      default:
        return {
          title: 'No Data',
          description: message || 'No data available.',
          iconColor: 'text-gray-500'
        };
    }
  };

  const content = getProviderContent();

  return (
    <div className={`compact-provider-empty-state ${className}`}>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <h4 className="text-sm font-medium text-gray-900 mb-1">
          {content.title}
        </h4>
        <p className="text-xs text-gray-600 mb-3">
          {content.description}
        </p>
        
        {actions.length > 0 && (
          <div className="flex gap-2 justify-center">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => onAction?.(action.action)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  action.variant === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderEmptyState;
