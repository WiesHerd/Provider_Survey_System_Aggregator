/**
 * Provider Context
 * 
 * Global state management for provider type selection and provider-specific data
 * across the entire application. This context enables the dual-provider workflow.
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { ProviderType, UIProviderType } from '../types/provider';
import { providerDataService } from '../services/ProviderDataService';
import { providerTypeDetectionService } from '../services/ProviderTypeDetectionService';
import { getDataService } from '../services/DataService';

// Provider Context State
interface ProviderContextState {
  selectedProviderType: UIProviderType;
  availableProviderTypes: ProviderType[];
  isProviderDetectionEnabled: boolean;
  lastDetectionResult: any;
  providerTypeHistory: Array<{
    providerType: UIProviderType;
    timestamp: Date;
    context: string;
  }>;
}

// Provider Context Actions
type ProviderContextAction =
  | { type: 'SET_PROVIDER_TYPE'; payload: { providerType: UIProviderType; context?: string } }
  | { type: 'SET_AVAILABLE_PROVIDER_TYPES'; payload: ProviderType[] }
  | { type: 'TOGGLE_PROVIDER_DETECTION'; payload: boolean }
  | { type: 'SET_DETECTION_RESULT'; payload: any }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'RESET_TO_DEFAULT' };

// Initial State - will be updated by auto-detection
const initialState: ProviderContextState = {
  selectedProviderType: 'PHYSICIAN', // Default fallback, will be overridden by auto-detection
  availableProviderTypes: ['PHYSICIAN', 'APP', 'CALL'],
  isProviderDetectionEnabled: true,
  lastDetectionResult: null,
  providerTypeHistory: []
};

// Provider Context Reducer
const providerContextReducer = (
  state: ProviderContextState,
  action: ProviderContextAction
): ProviderContextState => {
  switch (action.type) {
    case 'SET_PROVIDER_TYPE':
      return {
        ...state,
        selectedProviderType: action.payload.providerType,
        providerTypeHistory: [
          ...state.providerTypeHistory,
          {
            providerType: action.payload.providerType,
            timestamp: new Date(),
            context: action.payload.context || 'manual'
          }
        ].slice(-10) // Keep last 10 entries
      };

    case 'SET_AVAILABLE_PROVIDER_TYPES':
      return {
        ...state,
        availableProviderTypes: action.payload
      };

    case 'TOGGLE_PROVIDER_DETECTION':
      return {
        ...state,
        isProviderDetectionEnabled: action.payload
      };

    case 'SET_DETECTION_RESULT':
      return {
        ...state,
        lastDetectionResult: action.payload
      };

    case 'CLEAR_HISTORY':
      return {
        ...state,
        providerTypeHistory: []
      };

    case 'RESET_TO_DEFAULT':
      return initialState;

    default:
      return state;
  }
};

// Provider Context Interface
interface ProviderContextType {
  // State
  selectedProviderType: UIProviderType;
  availableProviderTypes: ProviderType[];
  isProviderDetectionEnabled: boolean;
  lastDetectionResult: any;
  providerTypeHistory: Array<{
    providerType: UIProviderType;
    timestamp: Date;
    context: string;
  }>;

  // Actions
  setProviderType: (providerType: UIProviderType, context?: string) => void;
  setAvailableProviderTypes: (providerTypes: ProviderType[]) => void;
  toggleProviderDetection: (enabled: boolean) => void;
  setDetectionResult: (result: any) => void;
  clearHistory: () => void;
  resetToDefault: () => void;
  refreshProviderTypeDetection: () => Promise<void>;

  // Computed Properties
  isPhysicianSelected: boolean;
  isAPPSelected: boolean;
  isBothSelected: boolean;
  canSwitchToProviderType: (providerType: ProviderType) => boolean;
}

// Create Context
const ProviderContext = createContext<ProviderContextType | undefined>(undefined);

// Provider Context Provider Component
interface ProviderContextProviderProps {
  children: React.ReactNode;
  initialProviderType?: UIProviderType;
  enablePersistence?: boolean;
}

export const ProviderContextProvider: React.FC<ProviderContextProviderProps> = ({
  children,
  initialProviderType = 'PHYSICIAN', // Default to PHYSICIAN instead of BOTH
  enablePersistence = true
}) => {
  const [state, dispatch] = useReducer(providerContextReducer, {
    ...initialState,
    selectedProviderType: initialProviderType
  });

  // Persistence Logic and Auto-Detection
  useEffect(() => {
    if (enablePersistence) {
      const loadSavedState = async () => {
        try {
          const dataService = getDataService();
          const savedState = await dataService.getUserPreference('provider-context-state');
          
          if (savedState && savedState.selectedProviderType) {
            dispatch({
              type: 'SET_PROVIDER_TYPE',
              payload: { 
                providerType: savedState.selectedProviderType,
                context: 'persistence'
              }
            });
            return; // Exit early if we loaded saved state
          }
          
          // No saved state - auto-detect available provider types
          const autoDetectProviderType = async () => {
            try {
              const result = await providerTypeDetectionService.detectAvailableProviderTypes();
              
              if (result.availableTypes.length > 0) {
                // Sort by most recent data first, then by survey count
                const sortedTypes = result.availableTypes.sort((a, b) => {
                  // First sort by most recent data
                  if (a.lastUpdated && b.lastUpdated) {
                    const dateDiff = b.lastUpdated.getTime() - a.lastUpdated.getTime();
                    if (dateDiff !== 0) return dateDiff;
                  }
                  // Then by survey count
                  return b.surveyCount - a.surveyCount;
                });
                
                // Default to the provider type with most recent data
                const firstProviderType = sortedTypes[0].type;
                if (firstProviderType === 'PHYSICIAN' || firstProviderType === 'APP' || firstProviderType === 'CALL') {
                  console.log(`🔍 Auto-detected provider type: ${firstProviderType} (${sortedTypes[0].surveyCount} surveys, last updated: ${sortedTypes[0].lastUpdated})`);
                  dispatch({
                    type: 'SET_PROVIDER_TYPE',
                    payload: { 
                      providerType: firstProviderType,
                      context: 'auto_detection'
                    }
                  });
                }
              } else {
                // No data available - set to a neutral state that shows "No data available"
                console.log('🔍 No survey data found - Data View will show empty state');
                // Don't change the provider type - let the UI show "No data available"
              }
            } catch (error) {
              console.error('Failed to auto-detect provider types:', error);
              // Keep the default but don't force it
            }
          };
          
          await autoDetectProviderType();
        } catch (error) {
          console.warn('Failed to load saved provider context state:', error);
          // Fallback to auto-detection on error
          try {
            const result = await providerTypeDetectionService.detectAvailableProviderTypes();
            if (result.availableTypes.length > 0) {
              const sortedTypes = result.availableTypes.sort((a, b) => {
                if (a.lastUpdated && b.lastUpdated) {
                  const dateDiff = b.lastUpdated.getTime() - a.lastUpdated.getTime();
                  if (dateDiff !== 0) return dateDiff;
                }
                return b.surveyCount - a.surveyCount;
              });
              const firstProviderType = sortedTypes[0].type;
              if (firstProviderType === 'PHYSICIAN' || firstProviderType === 'APP' || firstProviderType === 'CALL') {
                dispatch({
                  type: 'SET_PROVIDER_TYPE',
                  payload: { 
                    providerType: firstProviderType,
                    context: 'auto_detection'
                  }
                });
              }
            }
          } catch (detectionError) {
            console.error('Failed to auto-detect provider types:', detectionError);
          }
        }
      };
      
      loadSavedState();
    }
  }, [enablePersistence]);

  useEffect(() => {
    if (enablePersistence) {
      const saveState = async () => {
        try {
          const dataService = getDataService();
          await dataService.saveUserPreference('provider-context-state', {
            selectedProviderType: state.selectedProviderType,
            isProviderDetectionEnabled: state.isProviderDetectionEnabled
          });
        } catch (error) {
          console.error('Failed to save provider context state:', error);
        }
      };
      
      saveState();
    }
  }, [state.selectedProviderType, state.isProviderDetectionEnabled, enablePersistence]);

  // Action Handlers
  const setProviderType = useCallback((providerType: UIProviderType, context?: string) => {
    dispatch({
      type: 'SET_PROVIDER_TYPE',
      payload: { providerType, context }
    });
    
    // Clear cache when switching provider types to ensure fresh data
    if (providerType !== 'BOTH') {
      providerDataService.clearCache(providerType as ProviderType);
    }
    
    // Refresh provider type detection to update available types
    providerTypeDetectionService.clearCache();
  }, []);

  const setAvailableProviderTypes = useCallback((providerTypes: ProviderType[]) => {
    dispatch({
      type: 'SET_AVAILABLE_PROVIDER_TYPES',
      payload: providerTypes
    });
  }, []);

  const toggleProviderDetection = useCallback((enabled: boolean) => {
    dispatch({
      type: 'TOGGLE_PROVIDER_DETECTION',
      payload: enabled
    });
  }, []);

  const setDetectionResult = useCallback((result: any) => {
    dispatch({
      type: 'SET_DETECTION_RESULT',
      payload: result
    });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' });
  }, []);

  const resetToDefault = useCallback(() => {
    dispatch({ type: 'RESET_TO_DEFAULT' });
  }, []);

  const refreshProviderTypeDetection = useCallback(async () => {
    try {
      console.log('🔄 Refreshing provider type detection...');
      const result = await providerTypeDetectionService.detectAvailableProviderTypes();
      
      if (result.availableTypes.length > 0) {
        // Sort by most recent data first, then by survey count
        const sortedTypes = result.availableTypes.sort((a, b) => {
          // First sort by most recent data
          if (a.lastUpdated && b.lastUpdated) {
            const dateDiff = b.lastUpdated.getTime() - a.lastUpdated.getTime();
            if (dateDiff !== 0) return dateDiff;
          }
          // Then by survey count
          return b.surveyCount - a.surveyCount;
        });
        
        // Switch to the provider type with most recent data
        const firstProviderType = sortedTypes[0].type;
        if (firstProviderType === 'PHYSICIAN' || firstProviderType === 'APP' || firstProviderType === 'CALL') {
          console.log(`🔄 Auto-switching to provider type: ${firstProviderType} (${sortedTypes[0].surveyCount} surveys, last updated: ${sortedTypes[0].lastUpdated})`);
          dispatch({
            type: 'SET_PROVIDER_TYPE',
            payload: { 
              providerType: firstProviderType,
              context: 'auto_refresh'
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to refresh provider type detection:', error);
    }
  }, []);

  // Computed Properties
  const isPhysicianSelected = state.selectedProviderType === 'PHYSICIAN';
  const isAPPSelected = state.selectedProviderType === 'APP';
  const isBothSelected = state.selectedProviderType === 'BOTH';

  const canSwitchToProviderType = useCallback((providerType: ProviderType) => {
    return state.availableProviderTypes.includes(providerType);
  }, [state.availableProviderTypes]);

  // Context Value
  const contextValue: ProviderContextType = {
    // State
    selectedProviderType: state.selectedProviderType,
    availableProviderTypes: state.availableProviderTypes,
    isProviderDetectionEnabled: state.isProviderDetectionEnabled,
    lastDetectionResult: state.lastDetectionResult,
    providerTypeHistory: state.providerTypeHistory,

    // Actions
    setProviderType,
    setAvailableProviderTypes,
    toggleProviderDetection,
    setDetectionResult,
    clearHistory,
    resetToDefault,
    refreshProviderTypeDetection,

    // Computed Properties
    isPhysicianSelected,
    isAPPSelected,
    isBothSelected,
    canSwitchToProviderType
  };

  // Debug logging
  console.log('🔍 ProviderContext: Current state', {
    selectedProviderType: state.selectedProviderType,
    availableProviderTypes: state.availableProviderTypes,
    isPhysicianSelected,
    isAPPSelected,
    isBothSelected
  });

  return (
    <ProviderContext.Provider value={contextValue}>
      {children}
    </ProviderContext.Provider>
  );
};

// Custom Hook to use Provider Context
export const useProviderContext = (): ProviderContextType => {
  const context = useContext(ProviderContext);
  if (context === undefined) {
    throw new Error('useProviderContext must be used within a ProviderContextProvider');
  }
  return context;
};

// Convenience Hooks for Specific Provider Types
export const usePhysicianContext = () => {
  const context = useProviderContext();
  return {
    ...context,
    isSelected: context.isPhysicianSelected,
    select: () => context.setProviderType('PHYSICIAN', 'physician-context'),
    canSelect: context.canSwitchToProviderType('PHYSICIAN')
  };
};

export const useAPPContext = () => {
  const context = useProviderContext();
  return {
    ...context,
    isSelected: context.isAPPSelected,
    select: () => context.setProviderType('APP', 'app-context'),
    canSelect: context.canSwitchToProviderType('APP')
  };
};

export const useCombinedContext = () => {
  const context = useProviderContext();
  return {
    ...context,
    isSelected: context.isBothSelected,
    select: () => context.setProviderType('BOTH', 'combined-context')
  };
};

// Provider Type Detection Hook
export const useProviderDetection = () => {
  const context = useProviderContext();
  
  const detectAndSetProviderType = useCallback(async (data: any) => {
    if (!context.isProviderDetectionEnabled) {
      return null;
    }

    try {
      // Import the detection service dynamically to avoid circular dependencies
      const { ProviderDetectionService } = await import('../services/ProviderDetectionService');
      const result = ProviderDetectionService.detectProviderType(data);
      
      context.setDetectionResult(result);
      
      if (result.providerType !== 'UNKNOWN' && result.confidence >= 0.6) {
        context.setProviderType(result.providerType as UIProviderType, 'auto-detection');
        return result;
      }
      
      return result;
    } catch (error) {
      console.error('Provider detection failed:', error);
      return null;
    }
  }, [context]);

  return {
    detectAndSetProviderType,
    lastDetectionResult: context.lastDetectionResult,
    isEnabled: context.isProviderDetectionEnabled,
    toggle: context.toggleProviderDetection
  };
};

export default ProviderContext;
