/**
 * Provider Context
 * 
 * Global state management for provider type selection and provider-specific data
 * across the entire application. This context enables the dual-provider workflow.
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { ProviderType } from '../types/provider';
import { providerDataService } from '../services/ProviderDataService';
import { providerTypeDetectionService } from '../services/ProviderTypeDetectionService';

// Provider Context State
interface ProviderContextState {
  selectedProviderType: ProviderType | 'BOTH';
  availableProviderTypes: ProviderType[];
  isProviderDetectionEnabled: boolean;
  lastDetectionResult: any;
  providerTypeHistory: Array<{
    providerType: ProviderType | 'BOTH';
    timestamp: Date;
    context: string;
  }>;
}

// Provider Context Actions
type ProviderContextAction =
  | { type: 'SET_PROVIDER_TYPE'; payload: { providerType: ProviderType | 'BOTH'; context?: string } }
  | { type: 'SET_AVAILABLE_PROVIDER_TYPES'; payload: ProviderType[] }
  | { type: 'TOGGLE_PROVIDER_DETECTION'; payload: boolean }
  | { type: 'SET_DETECTION_RESULT'; payload: any }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'RESET_TO_DEFAULT' };

// Initial State
const initialState: ProviderContextState = {
  selectedProviderType: 'PHYSICIAN', // Default to PHYSICIAN instead of BOTH
  availableProviderTypes: ['PHYSICIAN', 'APP'],
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
  selectedProviderType: ProviderType | 'BOTH';
  availableProviderTypes: ProviderType[];
  isProviderDetectionEnabled: boolean;
  lastDetectionResult: any;
  providerTypeHistory: Array<{
    providerType: ProviderType | 'BOTH';
    timestamp: Date;
    context: string;
  }>;

  // Actions
  setProviderType: (providerType: ProviderType | 'BOTH', context?: string) => void;
  setAvailableProviderTypes: (providerTypes: ProviderType[]) => void;
  toggleProviderDetection: (enabled: boolean) => void;
  setDetectionResult: (result: any) => void;
  clearHistory: () => void;
  resetToDefault: () => void;

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
  initialProviderType?: ProviderType | 'BOTH';
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
      const savedState = localStorage.getItem('provider-context-state');
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState);
          if (parsedState.selectedProviderType) {
            dispatch({
              type: 'SET_PROVIDER_TYPE',
              payload: { 
                providerType: parsedState.selectedProviderType,
                context: 'persistence'
              }
            });
          }
        } catch (error) {
          console.warn('Failed to parse saved provider context state:', error);
        }
      } else {
        // No saved state - auto-detect available provider types
        const autoDetectProviderType = async () => {
          try {
            const result = await providerTypeDetectionService.detectAvailableProviderTypes();
            
            if (result.availableTypes.length > 0) {
              // Default to the first available provider type (only PHYSICIAN or APP)
              const firstProviderType = result.availableTypes[0].type;
              if (firstProviderType === 'PHYSICIAN' || firstProviderType === 'APP') {
                dispatch({
                  type: 'SET_PROVIDER_TYPE',
                  payload: { 
                    providerType: firstProviderType,
                    context: 'auto_detection'
                  }
                });
              }
            }
            // If no data available, keep the default (PHYSICIAN)
          } catch (error) {
            console.error('Failed to auto-detect provider types:', error);
            // Keep the default (PHYSICIAN)
          }
        };
        
        autoDetectProviderType();
      }
    }
  }, [enablePersistence]);

  useEffect(() => {
    if (enablePersistence) {
      localStorage.setItem('provider-context-state', JSON.stringify({
        selectedProviderType: state.selectedProviderType,
        isProviderDetectionEnabled: state.isProviderDetectionEnabled
      }));
    }
  }, [state.selectedProviderType, state.isProviderDetectionEnabled, enablePersistence]);

  // Action Handlers
  const setProviderType = useCallback((providerType: ProviderType | 'BOTH', context?: string) => {
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

    // Computed Properties
    isPhysicianSelected,
    isAPPSelected,
    isBothSelected,
    canSwitchToProviderType
  };

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
        context.setProviderType(result.providerType as ProviderType, 'auto-detection');
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
