/**
 * Dynamic Provider Type Selector Component
 * 
 * A smart, dynamic component that only shows provider types that have data available.
 * Automatically detects available provider types from IndexedDB and provides
 * real-time feedback about data availability.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronDownIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ProviderTypeSelectorProps } from '../../types/provider';
import { useProviderTypeDetection } from '../../hooks/useProviderTypeDetection';
import LoadingSpinner from './LoadingSpinner';
import { ProviderTypeInfo } from '../../services/ProviderTypeDetectionService';
import { useToast } from '../../contexts/ToastContext';

/**
 * Dynamic Provider Type Selector component
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
  const [highlightAnimation, setHighlightAnimation] = useState(false);
  const previousTypesRef = useRef<ProviderTypeInfo[]>([]);
  const hasInitializedRef = useRef(false); // Track if we've done initial load
  const toast = useToast();
  
  // Use dynamic provider type detection
  const {
    availableTypes,
    hasAnyData,
    isLoading,
    error,
    refresh
  } = useProviderTypeDetection(true, 120000); // Auto-refresh every 2 minutes (reduced frequency)

  // Add a manual refresh trigger for immediate updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'survey-uploaded' || e.key === 'survey-deleted') {
        console.log('🔄 Survey change detected via storage event, refreshing provider type detection...');
        refresh();
      }
    };

    const handleCustomEvent = () => {
      console.log('🔄 Survey change detected via custom event, refreshing provider type detection...');
      refresh();
    };

    const handleProviderTypesRefreshed = () => {
      console.log('🔄 Provider types refreshed event received, refreshing provider type detection...');
      refresh();
    };

    // Listen for both storage events (cross-tab) and custom events (same-tab)
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('survey-uploaded', handleCustomEvent);
    window.addEventListener('survey-deleted', handleCustomEvent);
    window.addEventListener('provider-types-refreshed', handleProviderTypesRefreshed);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('survey-uploaded', handleCustomEvent);
      window.removeEventListener('survey-deleted', handleCustomEvent);
      window.removeEventListener('provider-types-refreshed', handleProviderTypesRefreshed);
    };
  }, [refresh]);

  // Get the display text for the current value
  const getCurrentDisplay = () => {
    if (isLoading) {
      return { text: 'Loading...', hasData: false };
    }

    if (error) {
      return { text: 'Error loading data', hasData: false };
    }

    if (!hasAnyData) {
      return { text: 'No data available', hasData: false };
    }

    // Check if current selection has data, if not, show first available type
    const currentTypeInfo = availableTypes.find(t => t.type === value);
    if (!currentTypeInfo && availableTypes.length > 0) {
      // Current selection has no data, show first available type
      const firstAvailable = availableTypes[0];
      return {
         text: firstAvailable.type === 'PHYSICIAN' ? 'Physician' : 
               firstAvailable.type === 'APP' ? 'APP' : 
               firstAvailable.type === 'CALL' ? 'Call Pay' :
               firstAvailable.displayName,
        hasData: true,
        surveyCount: firstAvailable.surveyCount
      };
    }

    switch (value) {
       case 'PHYSICIAN':
         const physicianInfo = availableTypes.find(t => t.type === 'PHYSICIAN');
         return {
           text: 'Physician',
           hasData: !!physicianInfo,
           surveyCount: physicianInfo?.surveyCount || 0
         };
       case 'APP':
         const appInfo = availableTypes.find(t => t.type === 'APP');
         return {
           text: 'APP',
           hasData: !!appInfo,
           surveyCount: appInfo?.surveyCount || 0
         };
       case 'CALL':
         const callInfo = availableTypes.find(t => t.type === 'CALL');
         return {
           text: 'Call Pay',
           hasData: !!callInfo,
           surveyCount: callInfo?.surveyCount || 0
         };
      case 'BOTH':
        return {
          text: 'Combined View',
          hasData: hasAnyData,
          surveyCount: availableTypes.reduce((sum, t) => sum + t.surveyCount, 0)
        };
      default:
        return { text: 'Select Provider Type', hasData: false };
    }
  };

  const currentDisplay = getCurrentDisplay();

  // ENTERPRISE FIX: Detect new provider types and show visual feedback
  // CRITICAL: Only show toast when provider types are actually added (not on initial page load)
  useEffect(() => {
    if (!isLoading && !error && availableTypes.length > 0) {
      // ENTERPRISE FIX: Skip toast on initial load - only show when types are actually added
      if (!hasInitializedRef.current) {
        // First load - just initialize the previous types, don't show toast
        console.log('🔍 Initial provider type detection - skipping toast (not a new upload)');
        previousTypesRef.current = [...availableTypes];
        hasInitializedRef.current = true;
        return;
      }
      
      const previousTypes = previousTypesRef.current;
      const currentTypeKeys = new Set(availableTypes.map(t => t.type));
      const previousTypeKeys = new Set(previousTypes.map(t => t.type));
      
      // Find newly added provider types (only if they weren't there before)
      const newTypes = availableTypes.filter(t => !previousTypeKeys.has(t.type));
      
      if (newTypes.length > 0) {
        // New provider type(s) detected - show visual feedback
        console.log('🎉 New provider type(s) detected:', newTypes.map(t => t.type));
        
        // Trigger highlight animation
        setHighlightAnimation(true);
        setTimeout(() => setHighlightAnimation(false), 2000);
        
        // Show success toast notification
        const newType = newTypes[0]; // Show notification for first new type
        const displayName = newType.type === 'PHYSICIAN' ? 'Physician' : 
                           newType.type === 'APP' ? 'APP' : 
                           newType.type === 'CALL' ? 'Call Pay' : newType.displayName;
        toast.success(
          `${displayName} surveys available`,
          `Your ${displayName.toLowerCase()} survey has been uploaded and is now available in the Data View.`,
          6000 // Show for 6 seconds
        );
      }
      
      // Update previous types for next comparison
      previousTypesRef.current = [...availableTypes];
    }
  }, [availableTypes, isLoading, error, toast]);

  // Auto-switch to available provider type if current selection has no data
  // ENTERPRISE FIX: Also auto-switch to newly uploaded provider type if it's more recent
  // CRITICAL: This handles the case where user deletes the last survey of a provider type
  useEffect(() => {
    if (!isLoading && !error) {
      // ENTERPRISE FIX: If no data at all, don't auto-switch (let user see empty state)
      if (!hasAnyData || availableTypes.length === 0) {
        // If current selection has no data and there's no data at all, keep current selection
        // The empty state message will guide the user
        return;
      }
      
      const currentTypeInfo = availableTypes.find(t => t.type === value);
      if (!currentTypeInfo) {
        // Current selection has no data, switch to first available type
        // Sort by most recent first to prioritize newly uploaded surveys
        const sortedTypes = [...availableTypes].sort((a, b) => {
          if (a.lastUpdated && b.lastUpdated) {
            return b.lastUpdated.getTime() - a.lastUpdated.getTime();
          }
          return b.surveyCount - a.surveyCount;
        });
        const firstAvailable = sortedTypes[0];
        if (firstAvailable.type !== value && (firstAvailable.type === 'PHYSICIAN' || firstAvailable.type === 'APP' || firstAvailable.type === 'CALL')) {
          console.log(`🔄 Auto-switching from "${value}" (no data) to "${firstAvailable.type}" (${firstAvailable.surveyCount} surveys)`);
          onChange(firstAvailable.type as 'PHYSICIAN' | 'APP' | 'CALL');
        }
      }
    }
  }, [availableTypes, value, hasAnyData, isLoading, error, onChange]);

  // Get dropdown options ONLY from Firebase: only show provider types that have survey data in Firestore
  // availableTypes is built by ProviderTypeDetectionService from dataService.getAllSurveys() (Firebase)
  const getOptions = () => {
    const options: Array<{
      value: 'PHYSICIAN' | 'APP' | 'CALL' | 'BOTH';
      label: string;
      count: number;
    }> = [];

    const physicianInfo = availableTypes.find(t => t.type === 'PHYSICIAN');
    if (physicianInfo) {
      options.push({ value: 'PHYSICIAN', label: 'Physician', count: physicianInfo.surveyCount });
    }

    const appInfo = availableTypes.find(t => t.type === 'APP');
    if (appInfo) {
      options.push({ value: 'APP', label: 'APP', count: appInfo.surveyCount });
    }

    const callInfo = availableTypes.find(t => t.type === 'CALL');
    if (callInfo) {
      options.push({ value: 'CALL', label: 'Call Pay', count: callInfo.surveyCount });
    }

    if (showBothOption && hasAnyData && availableTypes.length >= 1) {
      const total = availableTypes.reduce((sum, t) => sum + t.surveyCount, 0);
      options.push({ value: 'BOTH', label: 'Combined View', count: total });
    }

    return options;
  };

  const options = getOptions();

  // Handle option selection
  const handleOptionSelect = (optionValue: 'PHYSICIAN' | 'APP' | 'CALL' | 'BOTH') => {
    onChange(optionValue);
    setIsOpen(false);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        <div className="w-full flex items-center justify-center px-3 py-2.5 text-sm font-normal bg-gray-50 border border-gray-300 rounded-md">
          <LoadingSpinner 
            message="Loading provider types..."
            size="sm"
            showMessage={true}
            className="py-2"
          />
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`relative ${className}`}>
        <div className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-normal bg-red-50 border border-red-300 rounded-md">
          <span className="text-red-600">Error loading data</span>
          <button
            onClick={refresh}
            className="text-red-600 hover:text-red-700"
            title="Retry"
          >
            <ExclamationTriangleIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Always show the dropdown; when no data, show hint below it
  return (
    <div className={`relative ${className}`}>
      {/* Dropdown Button - Google Style with Data Indicator */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-normal bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50/50 focus:outline-none focus:ring-1 focus:ring-blue-400/80 focus:border-blue-400 transition-all duration-150 h-10 ${
          highlightAnimation ? 'ring-2 ring-indigo-500 ring-offset-2 shadow-lg border-indigo-400' : ''
        }`}
        aria-label="Select provider type"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-gray-900">{currentDisplay.text}</span>
        <ChevronDownIcon 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Hint when no data - dropdown still usable */}
      {!hasAnyData && (
        <div className="mt-1.5 flex items-center gap-1.5 px-1 text-xs text-yellow-700">
          <ExclamationTriangleIcon className="h-3.5 w-3.5 flex-shrink-0" />
          <span>No provider data available</span>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu - Apple-style hierarchy: label primary, count secondary */}
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200/90 rounded-xl shadow-lg shadow-black/5 z-20 overflow-hidden">
            {options.length === 0 ? (
              <div className="px-3.5 py-3 text-sm text-gray-500 text-center">
                No provider data available
              </div>
            ) : (
              options.map((option, index) => {
                const isSelected = value === option.value;
                
                return (
                  <button
                    key={`${option.value}-${index}`}
                    onClick={() => handleOptionSelect(option.value)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left transition-colors duration-150 ${
                      isSelected 
                        ? 'bg-gray-100/80 text-gray-900' 
                        : 'text-gray-700 hover:bg-gray-50/80'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="font-medium text-gray-900">{option.label}</span>
                    <span className="text-gray-500 font-normal tabular-nums text-[13px]">
                      ({option.count})
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Compact version of Dynamic Provider Type Selector
 */
export const CompactProviderTypeSelector: React.FC<ProviderTypeSelectorProps> = ({
  value,
  onChange,
  showBothOption = false,
  context = 'navigation',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Use dynamic provider type detection
  const {
    availableTypes,
    hasAnyData,
    isLoading,
    error
  } = useProviderTypeDetection(true, 30000);

  // Get the display text for the current value
  const getCurrentText = () => {
    if (isLoading) return 'Loading...';
    if (error) return 'Error';
    if (!hasAnyData) return 'No Data';

     switch (value) {
       case 'PHYSICIAN':
         return 'Physician';
       case 'APP':
         return 'APP';
       case 'CALL':
         return 'Call Pay';
       case 'BOTH':
         return 'Combined';
       default:
         return 'Select';
     }
  };

  // Get dropdown options
  const getOptions = () => {
  const options: Array<{
    value: 'PHYSICIAN' | 'APP' | 'CALL' | 'BOTH';
    text: string;
  }> = [];

     // Add available provider types
     const physicianInfo = availableTypes.find(t => t.type === 'PHYSICIAN');
     if (physicianInfo) {
       options.push({
         value: 'PHYSICIAN',
         text: 'Physician'
       });
     }

     const appInfo = availableTypes.find(t => t.type === 'APP');
     if (appInfo) {
       options.push({
         value: 'APP',
         text: 'APP'
       });
     }

     const callInfo = availableTypes.find(t => t.type === 'CALL');
     if (callInfo) {
       options.push({
         value: 'CALL',
         text: 'Call Pay'
       });
     }

     if (showBothOption && availableTypes.length > 1) {
      options.push({
        value: 'BOTH',
        text: 'Combined'
      });
    }

    return options;
  };

  const options = getOptions();

  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-normal bg-gray-50 border border-gray-300 rounded">
          <span className="text-gray-500">Loading...</span>
          <div className="w-3 h-3 border border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!hasAnyData) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-normal bg-yellow-50 border border-yellow-300 rounded">
          <span className="text-yellow-700">No Data</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Compact Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1.5 text-xs font-normal bg-white border border-gray-300 rounded-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
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
          
          {/* Menu */}
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-sm shadow-lg z-20 overflow-hidden min-w-[100px]">
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
                       ? 'bg-gray-100 text-gray-900' 
                       : 'text-gray-700 hover:bg-gray-50'
                   }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="font-medium">{option.text}</span>
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
 * Provider Type Badge for displaying current selection with data indicator
 */
export const ProviderTypeBadge: React.FC<{
  providerType: 'PHYSICIAN' | 'APP' | 'BOTH' | 'CALL';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showDataIndicator?: boolean;
  surveyCount?: number;
}> = ({ 
  providerType, 
  size = 'md', 
  className = '',
  showDataIndicator = false,
  surveyCount = 0
}) => {
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
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200'
        };
      case 'CALL':
        return {
          label: 'Call Pay',
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-700',
          borderColor: 'border-orange-200'
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
    <div className={`inline-flex items-center gap-1 ${getSizeClasses()} ${config.bgColor} ${config.textColor} ${config.borderColor} border rounded-md font-medium ${className}`}>
      <span>{config.label}</span>
      {showDataIndicator && surveyCount > 0 && (
        <div className="flex items-center justify-center w-4 h-4 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
          {surveyCount}
        </div>
      )}
    </div>
  );
};

export default ProviderTypeSelector;