import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { YearManagementService } from '../services/YearManagementService';
import { IYearConfig, IYearFilter } from '../types/year';

interface YearContextType {
  // Current year state
  currentYear: string;
  availableYears: string[];
  yearConfigs: IYearConfig[];
  
  // Year management
  setCurrentYear: (year: string) => Promise<void>;
  createYear: (year: string, description?: string) => Promise<IYearConfig>;
  activateYear: (year: string) => Promise<void>;
  setDefaultYear: (year: string) => Promise<void>;
  
  // Year filtering
  yearFilter: IYearFilter;
  setYearFilter: (filter: IYearFilter) => void;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Refresh data
  refreshYears: () => Promise<void>;
  
  // Reset configuration
  resetYearConfiguration: () => Promise<void>;
}

const YearContext = createContext<YearContextType | undefined>(undefined);

interface YearProviderProps {
  children: ReactNode;
}

export const YearProvider: React.FC<YearProviderProps> = ({ children }) => {
  const [currentYear, setCurrentYearState] = useState<string>('2025');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [yearConfigs, setYearConfigs] = useState<IYearConfig[]>([]);
  const [yearFilter, setYearFilterState] = useState<IYearFilter>({
    selectedYear: '2025',
    includeAllYears: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const yearService = new YearManagementService();

  const initializeYears = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 YearContext: Starting year initialization...');

      // Get available years and configs
      const years = await yearService.getAvailableYears();
      const configs = await yearService.getYearConfigs();
      
      // FIX: Prioritize detected year over stored configs
      const detectedYear = await yearService.detectActualYear();
      const activeYear = detectedYear || await yearService.getActiveYear();

      console.log('🔍 YearContext: Year initialization results:', {
        availableYears: years,
        configs: configs.map((c: IYearConfig) => ({ year: c.year, isActive: c.isActive })),
        detectedYear: detectedYear,
        activeYear: activeYear
      });

      setAvailableYears(years);
      setYearConfigs(configs);
      setCurrentYearState(activeYear);
      
      // Set default year filter
      setYearFilterState({
        selectedYear: activeYear,
        includeAllYears: false
      });

      console.log('🔍 YearContext: Year context initialized with currentYear:', activeYear);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize years');
      console.error('Error initializing years:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize year data
  useEffect(() => {
    initializeYears();
  }, [initializeYears]);

  const setCurrentYear = async (year: string) => {
    try {
      setError(null);
      await yearService.activateYear(year);
      setCurrentYearState(year);
      
      // Update year filter
      setYearFilterState(prev => ({
        ...prev,
        selectedYear: year
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set current year');
      console.error('Error setting current year:', err);
    }
  };

  const createYear = async (year: string, description?: string): Promise<IYearConfig> => {
    try {
      setError(null);
      const newConfig = await yearService.createYear(year, description);
      
      // Refresh year data
      await refreshYears();
      
      return newConfig;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create year';
      setError(errorMessage);
      console.error('Error creating year:', err);
      throw new Error(errorMessage);
    }
  };

  const activateYear = async (year: string) => {
    try {
      setError(null);
      await yearService.activateYear(year);
      setCurrentYearState(year);
      
      // Update year filter
      setYearFilterState(prev => ({
        ...prev,
        selectedYear: year
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate year');
      console.error('Error activating year:', err);
    }
  };

  const setDefaultYear = async (year: string) => {
    try {
      setError(null);
      await yearService.setDefaultYear(year);
      
      // Refresh year data
      await refreshYears();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default year');
      console.error('Error setting default year:', err);
    }
  };

  const setYearFilter = (filter: IYearFilter) => {
    setYearFilterState(filter);
  };

  const refreshYears = async () => {
    await initializeYears();
  };

  const resetYearConfiguration = async () => {
    try {
      setError(null);
      await yearService.resetYearConfiguration();
      
      // Force set to 2025 since that's what the user has
      setCurrentYearState('2025');
      setYearFilterState({
        selectedYear: '2025',
        includeAllYears: false
      });
      
      await initializeYears();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset year configuration');
      console.error('Error resetting year configuration:', err);
    }
  };

  const value: YearContextType = {
    currentYear,
    availableYears,
    yearConfigs,
    setCurrentYear,
    createYear,
    activateYear,
    setDefaultYear,
    yearFilter,
    setYearFilter,
    loading,
    error,
    refreshYears,
    resetYearConfiguration
  };

  return (
    <YearContext.Provider value={value}>
      {children}
    </YearContext.Provider>
  );
};

export const useYear = (): YearContextType => {
  const context = useContext(YearContext);
  if (context === undefined) {
    throw new Error('useYear must be used within a YearProvider');
  }
  return context;
};
