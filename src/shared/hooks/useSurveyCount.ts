import { useState, useEffect, useMemo } from 'react';
import { getDataService } from '../../services/DataService';

interface UseSurveyCountReturn {
  hasSurveys: boolean;
  loading: boolean;
  error: string | null;
  surveyCount: number;
}

/**
 * Custom hook to check if surveys exist in IndexedDB
 * 
 * @returns Object containing hasSurveys, loading state, error, and survey count
 */
export const useSurveyCount = (): UseSurveyCountReturn => {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSurveys = async () => {
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
    };

    fetchSurveys();
  }, []);

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
    surveyCount
  };
};

