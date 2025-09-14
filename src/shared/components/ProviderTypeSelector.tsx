/**
 * Provider Type Selector Component
 * 
 * A reusable component for selecting between Physician, APP, and Combined views
 * across different contexts in the application.
 */

import React, { useState } from 'react';
import { 
  HeartIcon, 
  UserIcon, 
  ChartBarIcon,
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

  // Get the display text and icon for the current value
  const getCurrentDisplay = () => {
    switch (value) {
      case 'PHYSICIAN':
        return {
          icon: HeartIcon,
          text: 'Physician',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200'
        };
      case 'APP':
        return {
          icon: UserIcon,
          text: 'APP',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      case 'BOTH':
        return {
          icon: ChartBarIcon,
          text: 'Combined',
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-200'
        };
      default:
        return {
          icon: ChartBarIcon,
          text: 'Select Provider Type',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-200'
        };
    }
  };

  const currentDisplay = getCurrentDisplay();
  const CurrentIcon = currentDisplay.icon;

  // Get dropdown options
  const getOptions = () => {
    const options: Array<{
      value: 'PHYSICIAN' | 'APP' | 'BOTH';
      icon: typeof HeartIcon;
      text: string;
      description: string;
    }> = [
      {
        value: 'PHYSICIAN',
        icon: HeartIcon,
        text: 'Physician',
        description: 'Physician compensation data'
      },
      {
        value: 'APP',
        icon: UserIcon,
        text: 'APP',
        description: 'Advanced Practice Provider data'
      }
    ];

    if (showBothOption) {
      options.push({
        value: 'BOTH',
        icon: ChartBarIcon,
        text: 'Combined',
        description: 'Both provider types combined'
      });
    }

    return options;
  };

  const options = getOptions();

  return (
    <div className={`relative ${className}`}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${currentDisplay.bgColor} ${currentDisplay.textColor} ${currentDisplay.borderColor} hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1`}
        aria-label="Select provider type"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2">
          <CurrentIcon className="w-4 h-4" />
          <span>{currentDisplay.text}</span>
        </div>
        <ChevronDownIcon 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
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
          
          {/* Menu */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
            {options.map((option) => {
              const OptionIcon = option.icon;
              const isSelected = value === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors duration-200 ${
                    isSelected 
                      ? 'bg-blue-50 text-blue-800' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <OptionIcon className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">{option.text}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
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

  // Get the display icon for the current value
  const getCurrentIcon = () => {
    switch (value) {
      case 'PHYSICIAN':
        return HeartIcon;
      case 'APP':
        return UserIcon;
      case 'BOTH':
        return ChartBarIcon;
      default:
        return ChartBarIcon;
    }
  };

  const CurrentIcon = getCurrentIcon();

  // Get dropdown options
  const getOptions = () => {
    const options: Array<{
      value: 'PHYSICIAN' | 'APP' | 'BOTH';
      icon: typeof HeartIcon;
      text: string;
      title: string;
    }> = [
      {
        value: 'PHYSICIAN',
        icon: HeartIcon,
        text: 'Physician',
        title: 'Physician Data'
      },
      {
        value: 'APP',
        icon: UserIcon,
        text: 'APP',
        title: 'APP Data'
      }
    ];

    if (showBothOption) {
      options.push({
        value: 'BOTH',
        icon: ChartBarIcon,
        text: 'Combined',
        title: 'Combined View'
      });
    }

    return options;
  };

  const options = getOptions();

  return (
    <div className={`relative ${className}`}>
      {/* Compact Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200 bg-blue-100 text-blue-800 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        aria-label="Select provider type"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <CurrentIcon className="w-3 h-3" />
        <ChevronDownIcon 
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
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
          
          {/* Menu */}
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden min-w-[120px]">
            {options.map((option) => {
              const OptionIcon = option.icon;
              const isSelected = value === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors duration-200 ${
                    isSelected 
                      ? 'bg-blue-50 text-blue-800' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                  title={option.title}
                >
                  <OptionIcon className="w-3 h-3 flex-shrink-0" />
                  <span className="font-medium">{option.text}</span>
                  {isSelected && (
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0 ml-auto" />
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
          icon: HeartIcon,
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
