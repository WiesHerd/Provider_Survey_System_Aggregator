import { useState, useEffect, useMemo, useCallback } from 'react';
import { getDataService } from '../../services/DataService';

interface UseSurveyCountReturn {
  hasSurveys: boolean;
  loading: boolean;
  error: string | null;
  surveyCount: number;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to check if surveys exist in IndexedDB
 * Automatically refetches on survey upload/deletion events and window focus
 * 
 * @returns Object containing hasSurveys, loading state, error, survey count, and refetch function
 */
export const useSurveyCount = (): UseSurveyCountReturn => {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSurveys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const dataService = getDataService();
      const allSurveys = await dataService.getAllSurveys();
      setSurveys(allSurveys || []);
    } catch (err) {
      console.error('🔍 Error fetching surveys:', err);
      setError(err instanceof Error ? err.message : 'Failed to load surveys');
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  // Listen for survey upload/deletion events
  useEffect(() => {
    const handleSurveyChange = () => {
      console.log('🔄 Survey change detected, refreshing survey count...');
      fetchSurveys();
    };

    // Listen for custom events
    window.addEventListener('survey-uploaded', handleSurveyChange);
    window.addEventListener('survey-deleted', handleSurveyChange);
    
    // Listen for storage events (for cross-tab communication)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'survey-uploaded' || e.key === 'survey-deleted') {
        handleSurveyChange();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Refetch on window focus (user might have uploaded in another tab)
    const handleFocus = () => {
      fetchSurveys();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('survey-uploaded', handleSurveyChange);
      window.removeEventListener('survey-deleted', handleSurveyChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchSurveys]);

  const hasSurveys = useMemo(() => {
    return surveys.length > 0;
  }, [surveys]);

  const surveyCount = useMemo(() => {
    return surveys.length;
  }, [surveys]);

  return {
    hasSurveys,
    loading,
    error,
    surveyCount,
    refetch: fetchSurveys
  };
};

