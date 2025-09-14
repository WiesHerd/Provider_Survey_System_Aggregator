/**
 * Provider Type Selector Component
 * 
 * A reusable component for selecting between Physician, APP, and Combined views
 * across different contexts in the application.
 */

import React, { useState } from 'react';
import { 
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { ProviderTypeSelectorProps } from '../../types/provider';

/**
 * Provider Type Selector component - DROPDOWN VERSION
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
  const [isOpen, setIsOpen] = useState(false);

  // Get the display text for the current value
  const getCurrentDisplay = () => {
    switch (value) {
      case 'PHYSICIAN':
        return {
          text: 'Physician'
        };
      case 'APP':
        return {
          text: 'APP'
        };
      case 'BOTH':
        return {
          text: 'Combined'
        };
      default:
        return {
          text: 'Select Provider Type'
        };
    }
  };

  const currentDisplay = getCurrentDisplay();

  // Get dropdown options
  const getOptions = () => {
    const options: Array<{
      value: 'PHYSICIAN' | 'APP' | 'BOTH';
      text: string;
      description: string;
    }> = [
      {
        value: 'PHYSICIAN',
        text: 'Physician',
        description: 'Physician compensation data'
      },
      {
        value: 'APP',
        text: 'APP',
        description: 'Advanced Practice Provider data'
      }
    ];

    if (showBothOption) {
      options.push({
        value: 'BOTH',
        text: 'Combined',
        description: 'Both provider types combined'
      });
    }

    return options;
  };

  const options = getOptions();

  return (
    <div className={`relative ${className}`}>
      {/* Dropdown Button - Google Style */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-normal bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
        aria-label="Select provider type"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-gray-900">{currentDisplay.text}</span>
        <ChevronDownIcon 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu - Google Style */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 overflow-hidden">
            {options.map((option) => {
              const isSelected = value === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start px-3 py-2.5 text-sm text-left transition-colors duration-150 ${
                    isSelected 
                      ? 'bg-blue-50 text-blue-900' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex-1">
                    <div className="font-medium">{option.text}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
                  </div>
                  {isSelected && (
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Compact version of Provider Type Selector for smaller spaces - DROPDOWN VERSION
 */
export const CompactProviderTypeSelector: React.FC<ProviderTypeSelectorProps> = ({
  value,
  onChange,
  showBothOption = false,
  context = 'navigation',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Get the display text for the current value
  const getCurrentText = () => {
    switch (value) {
      case 'PHYSICIAN':
        return 'Physician';
      case 'APP':
        return 'APP';
      case 'BOTH':
        return 'Combined';
      default:
        return 'Select';
    }
  };

  // Get dropdown options
  const getOptions = () => {
    const options: Array<{
      value: 'PHYSICIAN' | 'APP' | 'BOTH';
      text: string;
      title: string;
    }> = [
      {
        value: 'PHYSICIAN',
        text: 'Physician',
        title: 'Physician Data'
      },
      {
        value: 'APP',
        text: 'APP',
        title: 'APP Data'
      }
    ];

    if (showBothOption) {
      options.push({
        value: 'BOTH',
        text: 'Combined',
        title: 'Combined View'
      });
    }

    return options;
  };

  const options = getOptions();

  return (
    <div className={`relative ${className}`}>
      {/* Compact Dropdown Button - Google Style */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1.5 text-xs font-normal bg-white border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
        aria-label="Select provider type"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-gray-900">{getCurrentText()}</span>
        <ChevronDownIcon 
          className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu - Google Style */}
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 overflow-hidden min-w-[100px]">
            {options.map((option) => {
              const isSelected = value === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors duration-150 ${
                    isSelected 
                      ? 'bg-blue-50 text-blue-900' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                  title={option.title}
                >
                  <span className="font-medium">{option.text}</span>
                  {isSelected && (
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
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
          label: 'Physician',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200'
        };
      case 'APP':
        return {
          label: 'APP',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200'
        };
      case 'BOTH':
        return {
          label: 'Combined',
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-700',
          borderColor: 'border-purple-200'
        };
    }
  };

  const config = getProviderTypeConfig();

  return (
    <div className={`inline-flex items-center ${getSizeClasses()} ${config.bgColor} ${config.textColor} ${config.borderColor} border rounded-md font-medium ${className}`}>
      <span>{config.label}</span>
    </div>
  );
};

export default ProviderTypeSelector;
