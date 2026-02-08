import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { YearManagementService } from '../services/YearManagementService';
import { IYearConfig, IYearFilter } from '../types/year';
import { useAuth } from './AuthContext';

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
  const { user } = useAuth();
  const currentYearFallback = String(new Date().getFullYear());
  const [currentYear, setCurrentYearState] = useState<string>(currentYearFallback);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [yearConfigs, setYearConfigs] = useState<IYearConfig[]>([]);
  const [yearFilter, setYearFilterState] = useState<IYearFilter>({
    selectedYear: currentYearFallback,
    includeAllYears: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create service instance once - it's stable across renders
  const yearService = React.useMemo(() => new YearManagementService(), []);

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
      setCurrentYearState((prev) => {
        // Keep user's selection if it's still in the new list; otherwise use detected/active year
        const keep = years.length > 0 && years.includes(prev);
        return keep ? prev : activeYear;
      });
      setYearFilterState((prev) => {
        const current = prev.selectedYear ?? activeYear;
        const nextYear = years.length > 0 && years.includes(current) ? current : activeYear;
        return { ...prev, selectedYear: nextYear };
      });

      console.log('🔍 YearContext: Year context initialized with currentYear:', activeYear);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize years');
      console.error('Error initializing years:', err);
    } finally {
      setLoading(false);
    }
  }, [yearService]);

  // Initialize year data on mount
  useEffect(() => {
    initializeYears();
  }, [initializeYears]);

  const setCurrentYear = useCallback(async (year: string) => {
    setError(null);
    const previousYear = currentYear;
    // Optimistic update: show selected year immediately so dropdown doesn't revert
    setCurrentYearState(year);
    setYearFilterState(prev => ({ ...prev, selectedYear: year }));
    try {
      await yearService.activateYear(year);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set current year');
      console.error('Error setting current year:', err);
      // Revert on failure
      setCurrentYearState(previousYear);
      setYearFilterState(prev => ({ ...prev, selectedYear: previousYear }));
    }
  }, [yearService, currentYear]);

  const refreshYears = useCallback(async () => {
    await initializeYears();
  }, [initializeYears]);

  // Refresh years when auth user becomes available or changes (so dropdown shows Firebase years)
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    refreshYears();
  }, [user?.uid, refreshYears]);

  const createYear = useCallback(async (year: string, description?: string): Promise<IYearConfig> => {
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
  }, [yearService, refreshYears]);

  const activateYear = useCallback(async (year: string) => {
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
  }, [yearService]);

  const setDefaultYear = useCallback(async (year: string) => {
    try {
      setError(null);
      await yearService.setDefaultYear(year);
      
      // Refresh year data
      await refreshYears();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default year');
      console.error('Error setting default year:', err);
    }
  }, [yearService, refreshYears]);

  const setYearFilter = useCallback((filter: IYearFilter) => {
    setYearFilterState(filter);
  }, []);

  const resetYearConfiguration = useCallback(async () => {
    try {
      setError(null);
      await yearService.resetYearConfiguration();

      const fallbackYear = String(new Date().getFullYear());
      setCurrentYearState(fallbackYear);
      setYearFilterState({
        selectedYear: fallbackYear,
        includeAllYears: false
      });

      await initializeYears();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset year configuration');
      console.error('Error resetting year configuration:', err);
    }
  }, [yearService, initializeYears]);

  const value = useMemo<YearContextType>(
    () => ({
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
    }),
    [
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
    ]
  );

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
