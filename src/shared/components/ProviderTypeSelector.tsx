/**
 * Provider Type Selector Component
 * 
 * A reusable component for selecting between Physician, APP, and Combined views
 * across different contexts in the application.
 */

import React from 'react';
import { 
  MedicalCrossIcon, 
  UserIcon, 
  ChartBarIcon 
} from '@heroicons/react/24/outline';
import { ProviderTypeSelectorProps } from '../../types/provider';

/**
 * Provider Type Selector component
 * 
 * @param value - Current selected provider type
 * @param onChange - Callback when provider type changes
 * @param showBothOption - Whether to show the "Both" option
 * @param context - Context where the selector is used
 * @param className - Additional CSS classes
 */
export const ProviderTypeSelector: React.FC<ProviderTypeSelectorProps> = ({
  value,
  onChange,
  showBothOption = false,
  context = 'navigation',
  className = ''
}) => {
  // Get appropriate styling based on context
  const getContextStyles = () => {
    switch (context) {
      case 'navigation':
        return {
          container: 'bg-white border border-gray-200 rounded-xl shadow-sm p-1',
          tab: 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
          activeTab: 'bg-blue-100 text-blue-800 border border-blue-200',
          inactiveTab: 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
        };
      case 'analytics':
        return {
          container: 'bg-gray-50 border border-gray-200 rounded-lg p-1',
          tab: 'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
          activeTab: 'bg-white text-blue-600 border border-blue-200 shadow-sm',
          inactiveTab: 'text-gray-600 hover:text-gray-800 hover:bg-white'
        };
      case 'fmv':
        return {
          container: 'bg-white border border-gray-200 rounded-lg p-1',
          tab: 'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
          activeTab: 'bg-blue-600 text-white shadow-sm',
          inactiveTab: 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
        };
      default:
        return {
          container: 'bg-white border border-gray-200 rounded-lg p-1',
          tab: 'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
          activeTab: 'bg-blue-100 text-blue-800 border border-blue-200',
          inactiveTab: 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
        };
    }
  };

  const styles = getContextStyles();

  return (
    <div className={`provider-type-selector ${styles.container} ${className}`}>
      <div className="flex items-center gap-1">
        {/* Physician Tab */}
        <button
          className={`${styles.tab} ${value === 'PHYSICIAN' ? styles.activeTab : styles.inactiveTab}`}
          onClick={() => onChange('PHYSICIAN')}
          aria-label="Select Physician Data"
        >
          <MedicalCrossIcon className="w-4 h-4" />
          <span>Physician</span>
        </button>

        {/* APP Tab */}
        <button
          className={`${styles.tab} ${value === 'APP' ? styles.activeTab : styles.inactiveTab}`}
          onClick={() => onChange('APP')}
          aria-label="Select APP Data"
        >
          <UserIcon className="w-4 h-4" />
          <span>APP</span>
        </button>

        {/* Combined Tab (conditional) */}
        {showBothOption && (
          <button
            className={`${styles.tab} ${value === 'BOTH' ? styles.activeTab : styles.inactiveTab}`}
            onClick={() => onChange('BOTH')}
            aria-label="Select Combined View"
          >
            <ChartBarIcon className="w-4 h-4" />
            <span>Combined</span>
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Compact version of Provider Type Selector for smaller spaces
 */
export const CompactProviderTypeSelector: React.FC<ProviderTypeSelectorProps> = ({
  value,
  onChange,
  showBothOption = false,
  context = 'navigation',
  className = ''
}) => {
  return (
    <div className={`compact-provider-type-selector ${className}`}>
      <div className="flex items-center gap-1">
        <button
          className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
            value === 'PHYSICIAN' 
              ? 'bg-blue-100 text-blue-800' 
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
          onClick={() => onChange('PHYSICIAN')}
          title="Physician Data"
        >
          <MedicalCrossIcon className="w-3 h-3" />
        </button>
        
        <button
          className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
            value === 'APP' 
              ? 'bg-blue-100 text-blue-800' 
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
          onClick={() => onChange('APP')}
          title="APP Data"
        >
          <UserIcon className="w-3 h-3" />
        </button>
        
        {showBothOption && (
          <button
            className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
              value === 'BOTH' 
                ? 'bg-blue-100 text-blue-800' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            onClick={() => onChange('BOTH')}
            title="Combined View"
          >
            <ChartBarIcon className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Provider Type Badge for displaying current selection
 */
export const ProviderTypeBadge: React.FC<{
  providerType: 'PHYSICIAN' | 'APP' | 'BOTH';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ providerType, size = 'md', className = '' }) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'md':
        return 'px-3 py-1 text-sm';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1 text-sm';
    }
  };

  const getProviderTypeConfig = () => {
    switch (providerType) {
      case 'PHYSICIAN':
        return {
          icon: MedicalCrossIcon,
          label: 'Physician',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200'
        };
      case 'APP':
        return {
          icon: UserIcon,
          label: 'APP',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      case 'BOTH':
        return {
          icon: ChartBarIcon,
          label: 'Combined',
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-200'
        };
    }
  };

  const config = getProviderTypeConfig();
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 ${getSizeClasses()} ${config.bgColor} ${config.textColor} ${config.borderColor} border rounded-lg font-medium ${className}`}>
      <Icon className="w-4 h-4" />
      <span>{config.label}</span>
    </div>
  );
};

export default ProviderTypeSelector;
