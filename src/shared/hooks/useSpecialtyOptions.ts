/**
 * useSpecialtyOptions Hook
 * 
 * Custom hook for fetching enriched specialty options with mapping transparency metadata.
 * This hook is read-only and only provides display metadata - it doesn't affect filtering logic.
 */

import { useState, useEffect, useCallback } from 'react';
import { SpecialtyOption } from '../types/specialtyOptions';
import { SpecialtyOptionsService } from '../services/specialtyOptionsService';

interface UseSpecialtyOptionsReturn {
  /** Enriched specialty options with mapping metadata */
  specialties: SpecialtyOption[];
  /** Whether options are currently loading */
  loading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Refresh the options (clears cache and refetches) */
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching specialty options with mapping transparency
 * 
 * CRITICAL: This hook is for display purposes only.
 * The `name` field in returned options is the actual value used for filtering.
 * 
 * @returns Object containing specialties array, loading state, error, and refresh function
 */
export const useSpecialtyOptions = (): UseSpecialtyOptionsReturn => {
  const [specialties, setSpecialties] = useState<SpecialtyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const service = SpecialtyOptionsService.getInstance();

  const fetchOptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const options = await service.getSpecialtyOptions();
      setSpecialties(options);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load specialty options';
      console.error('❌ useSpecialtyOptions: Error fetching options', errorMessage);
      setError(errorMessage);
      // On error, return empty array - components will fall back to existing behavior
      setSpecialties([]);
    } finally {
      setLoading(false);
    }
  }, [service]);

  const refresh = useCallback(async () => {
    service.clearCache();
    await fetchOptions();
  }, [service, fetchOptions]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  return {
    specialties,
    loading,
    error,
    refresh
  };
};


