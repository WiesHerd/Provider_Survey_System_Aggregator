/**
 * TanStack Query hook for fetching survey list (for SurveyUpload component)
 * 
 * Provides caching for survey list to enable instant navigation.
 * Matches the interface expected by SurveyUpload component.
 */

import { useQuery } from '@tanstack/react-query';
import { getDataService } from '../../../services/DataService';
import { queryKeys } from '../../../shared/services/queryClient';
import { createQueryFn } from '../../../shared/services/queryFetcher';
import { trackFetch } from '../../../shared/hooks/useQueryTelemetry';

async function fetchSurveyList(year?: string, providerType?: string, signal?: AbortSignal): Promise<any[]> {
  const startTime = performance.now();
  const dataService = getDataService();
  
  if (signal?.aborted) {
    throw new Error('Query was aborted');
  }
  
  const allSurveys = await dataService.getAllSurveys();
  
  // Filter by year if provided
  let filteredSurveys = allSurveys;
  if (year) {
    filteredSurveys = filteredSurveys.filter((survey: any) => {
      const surveyYear = survey.year || survey.surveyYear || '';
      return surveyYear === year;
    });
  }
  
  // Filter by provider type if provided
  if (providerType && providerType !== 'BOTH') {
    filteredSurveys = filteredSurveys.filter((survey: any) => {
      const surveyProviderType = survey.providerType || 'PHYSICIAN'; // Default to PHYSICIAN for legacy surveys
      const surveyDataCategory = survey.dataCategory;
      
      // Check if this is a Call Pay survey (by dataCategory or name)
      const isCallPay = surveyDataCategory === 'CALL_PAY' || 
                       surveyProviderType === 'CALL' ||
                       (survey.name && survey.name.toLowerCase().includes('call pay')) ||
                       (survey.type && survey.type.toLowerCase().includes('call pay'));
      
      // If filtering for CALL type, show only Call Pay surveys
      if (providerType === 'CALL') {
        return isCallPay;
      }
      
      // For PHYSICIAN and APP views, exclude Call Pay surveys
      // Only show surveys that match the provider type AND are not Call Pay
      if (providerType === 'PHYSICIAN' || providerType === 'APP') {
        return surveyProviderType === providerType && !isCallPay;
      }
      
      // For other provider types (CUSTOM, etc.), use standard filtering
      return surveyProviderType === providerType;
    });
  }
  
  const fetchTime = performance.now() - startTime;
  trackFetch(fetchTime);
  
  return filteredSurveys;
}

/**
 * Hook for fetching survey list with TanStack Query caching
 * 
 * @param year - Year to filter by (optional)
 * @param providerType - Provider type to filter by (optional, 'BOTH' means no filter)
 * @param enabled - Whether the query should run (default: true)
 */
export const useSurveyListQuery = (
  year?: string,
  providerType?: string,
  enabled: boolean = true
) => {
  const queryKey = queryKeys.surveyList(year, providerType);
  
  const query = useQuery<any[]>({
    queryKey,
    queryFn: createQueryFn((signal) => fetchSurveyList(year, providerType, signal)),
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes - survey list changes on upload/delete
    gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache for 10 minutes
    refetchOnWindowFocus: true, // Refetch on focus (new surveys might be uploaded)
    refetchOnMount: false, // Use cached data if available
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
  
  return {
    data: query.data || [],
    loading: query.isLoading || query.isFetching,
    error: query.error ? (query.error instanceof Error ? query.error.message : String(query.error)) : null,
    refetch: query.refetch,
  };
};

