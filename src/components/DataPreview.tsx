import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FormControl,
  MenuItem,
  Select,
  Box,
  Autocomplete,
  TextField
} from '@mui/material';
import { getDataService } from '../services/DataService';
import { formatSpecialtyForDisplay, formatNormalizedValue } from '../shared/utils/formatters';
import { filterSpecialtyOptions } from '../shared/utils/specialtyMatching';
import { EnterpriseLoadingSpinner } from '../shared/components/EnterpriseLoadingSpinner';
import { useSmoothProgress } from '../shared/hooks/useSmoothProgress';
import { useColumnSizing } from '../shared/hooks/useColumnSizing';
import AgGridWrapper from './AgGridWrapper';
import { useDatabaseReady } from '../contexts/DatabaseContext';
import { getUserId } from '../shared/utils/userScoping';

// Custom header component for pinning columns
const CustomHeader = (props: any) => {
  const { displayName, onPinColumn, colId, isSpecialty, isNumeric } = props;
  const [isPinned, setIsPinned] = useState(false);
  
  const handlePinClick = () => {
    setIsPinned(!isPinned);
    onPinColumn(colId);
  };

  return (
    <div className={`flex items-center w-full ${isNumeric ? 'justify-end' : 'justify-between'}`}>
      <span className={`truncate ${isSpecialty ? 'font-semibold' : ''} ${isNumeric ? 'text-right' : ''}`}>{displayName}</span>
      <button
        onClick={handlePinClick}
        className={`ml-2 p-1 rounded hover:bg-gray-100 transition-colors ${
          isPinned ? 'text-indigo-600' : 'text-gray-400'
        }`}
        title={isPinned ? 'Unfreeze column' : 'Freeze column'}
      >
        {isPinned ? (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
        )}
      </button>
    </div>
  );
};

interface DataPreviewProps {
  file: {
    id: string;
    fileName: string;
    surveyType: string;
    surveyYear: string;
    uploadDate: Date;
    fileContent?: string;
  };
  onError: (message: string) => void;
  globalFilters: {
    specialty: string;
    providerType: string;
    region: string;
    variable: string;
  };
  onFilterChange: (filterName: string, value: string) => void;
  onGridReady?: (api: any) => void;
}

interface FileStats {
  columnNames: string[];
  totalRows: number;
  uniqueSpecialties: number;
  totalDataPoints: number;
}

const DataPreview: React.FC<DataPreviewProps> = ({ file, onError, globalFilters, onFilterChange, onGridReady }) => {
  const dataService = getDataService();
  const isDatabaseReady = useDatabaseReady();
  const hasLoadedRef = useRef(false);
  const resolvedSurveyId = useMemo(() => {
    const userId = getUserId();
    const userPrefix = `${userId}_`;
    if (file?.id && file.id.startsWith(userPrefix)) {
      return file.id.slice(userPrefix.length);
    }
    return file?.id || '';
  }, [file?.id]);
  
  // Use smooth progress for dynamic loading
  const { progress } = useSmoothProgress({
    duration: 3000,
    maxProgress: 90,
    intervalMs: 100
  });
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [originalData, setOriginalData] = useState<any[]>([]);
  // Stats removed - was unused

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ENTERPRISE FIX: Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear all loading states on unmount
      setIsLoading(false);
      setIsRefreshing(false);
    };
  }, []);

  const [gridApi, setGridApi] = useState<any | null>(null);
  const [columnApi, setColumnApi] = useState<any | null>(null);
  // Removed table-level quick search to rely on existing dropdown filters
  // Removed unused selectableHeaders, pinColumnId

  const [serverSpecialties, setServerSpecialties] = useState<string[]>([]);
  const [serverProviderTypes, setServerProviderTypes] = useState<string[]>([]);
  const [serverRegions, setServerRegions] = useState<string[]>([]);
  const [serverVariables, setServerVariables] = useState<string[]>([]);
  
  // ENTERPRISE: Cache survey data to prevent excessive Firebase reads
  // Only refetch if filters changed AND data is stale (older than 5 minutes)
  const surveyDataCacheRef = useRef<{
    surveyId: string;
    filters: string;
    data: any[];
    timestamp: number;
  } | null>(null);
  
  const CACHE_TTL = 1000 * 60 * 5; // 5 minutes cache - industry standard for survey data

  const handleFilterChange = (
    event: React.ChangeEvent<{ name?: string; value: unknown }> | any
  ) => {
    // Filter change logging removed for performance
    
    // Simple filter change - no cascading reset for now
    // This ensures basic filtering works without interference
    onFilterChange(event.target.name, event.target.value);
  };



  // Listen for data changes (like when all surveys are cleared or deleted)
  useEffect(() => {
    const handleDataChange = (event: CustomEvent) => {
      const deletedSurveyId = event.detail?.surveyId;
      
      // ENTERPRISE FIX: If the deleted survey is the one being displayed, clear everything IMMEDIATELY
      if (deletedSurveyId === file.id) {
        console.log('🔄 Current survey deleted, clearing DataPreview IMMEDIATELY...');
        // CRITICAL: Clear refreshing state FIRST to stop the modal immediately
        if (isMountedRef.current) {
          setIsRefreshing(false); // STOP THE MODAL FIRST
          setIsLoading(false);
          setOriginalData([]);
          setPreviewData([]);
          setPreviewHeaders([]);
        }
        return;
      }
      
      console.log('🔄 Data change detected in DataPreview, refreshing...');
      setIsRefreshing(true);
      // Clear current data for refresh
      setOriginalData([]);
      setPreviewData([]);
      setPreviewHeaders([]);
    };

    window.addEventListener('survey-deleted', handleDataChange as EventListener);
    return () => window.removeEventListener('survey-deleted', handleDataChange as EventListener);
  }, [file.id]);

  // Reset load tracking when switching surveys
  useEffect(() => {
    hasLoadedRef.current = false;
  }, [file.id]);

  // Consolidated data loading effect to prevent race conditions
  useEffect(() => {
    let isCancelled = false;
    let timeoutId: NodeJS.Timeout;
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 500;
    const MAX_LOAD_TIME = 30000; // 30 seconds max load time

    // Wait until IndexedDB is ready before attempting to load survey data
    if (!isDatabaseReady) {
      if (!hasLoadedRef.current) {
        setIsLoading(true);
        setIsRefreshing(false);
      }
      return;
    }
    
    // ENTERPRISE FIX: Add timeout to prevent infinite loading
    const loadTimeoutId = setTimeout(() => {
      if (!isCancelled) {
        console.warn('Data loading timeout - stopping spinner');
        setIsLoading(false);
        setIsRefreshing(false);
        isCancelled = true;
      }
    }, MAX_LOAD_TIME);
    
    console.log('Data loading effect triggered:', {
      fileId: file.id,
      resolvedSurveyId,
      specialty: globalFilters.specialty,
      providerType: globalFilters.providerType,
      region: globalFilters.region,
      variable: globalFilters.variable
    });
    
    const loadSurveyData = async (attempt: number = 0): Promise<void> => {
      try {
        // ENTERPRISE FIX: Check if cancelled before proceeding
        if (isCancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
        
        // Check if file exists and has valid data
        if (!file || !file.id) {
          console.log('No file or file ID provided, skipping data load');
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }

        // ENTERPRISE FIX: Check if cancelled before setting loading state
        if (isCancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
        
        // Show loading only on initial load or when switching surveys
        if (!hasLoadedRef.current) {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }
        
        // ENTERPRISE FIX: Double-check cancelled after setting state
        if (isCancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
        
        // ENTERPRISE FIX: Don't filter by providerType at row level in DataPreview
        // The survey itself is already filtered by providerType in the survey list
        // Row-level filtering by providerType causes issues when data has "Staff Physician" 
        // but filter is "Physician" - it filters out all data
        // Only filter by specialty, region, and variable (user-selected filters)
        const filters = {
          specialty: globalFilters.specialty || undefined,
          // CRITICAL: Don't filter by providerType - show ALL rows for the selected survey
          // providerType filtering is handled at the survey level, not row level
          providerType: undefined, // Always show all provider types for the selected survey
          region: globalFilters.region || undefined,
          variable: globalFilters.variable || undefined
        };
        
        console.log(`Loading survey data (attempt ${attempt + 1}) with filters:`, filters);
        
        // ENTERPRISE FIX: Check if cancelled before checking survey existence
        if (isCancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
        
        // ENTERPRISE FIX: Check if survey still exists before trying to load data
        let survey: any = null;
        try {
          console.log('🔍 DataPreview: Looking up survey with ID:', {
            resolvedSurveyId,
            originalFileId: file.id,
            userId: getUserId(),
            storageMode: dataService.getMode()
          });
          survey = await dataService.getSurveyById(resolvedSurveyId);
          console.log('🔍 DataPreview: Survey lookup result:', {
            found: !!survey,
            surveyId: survey?.id,
            surveyName: survey?.name,
            rowCount: survey?.rowCount,
            providerType: survey?.providerType,
            uploadDate: survey?.uploadDate,
            storageMode: dataService.getMode(),
            hasUploadStatus: !!(survey as any)?._uploadStatus
          });
          
          // ENTERPRISE DIAGNOSTIC: If survey found but no rowCount, check if data exists
          if (survey && (!survey.rowCount || survey.rowCount === 0)) {
            console.warn('⚠️ DataPreview: Survey found but rowCount is 0 or missing', {
              surveyId: survey.id,
              surveyName: survey.name,
              note: 'This might indicate data is still uploading or upload failed'
            });
          }
        } catch (error) {
          console.error('❌ DataPreview: Survey lookup failed:', error);
          // ENTERPRISE FIX: Don't immediately give up - try with original file ID as fallback
          if (file.id && file.id !== resolvedSurveyId) {
            console.log('🔄 DataPreview: Retrying with original file ID:', file.id);
            try {
              survey = await dataService.getSurveyById(file.id);
              console.log('🔍 DataPreview: Fallback lookup result:', {
                found: !!survey,
                surveyId: survey?.id,
                surveyName: survey?.name
              });
            } catch (fallbackError) {
              console.error('❌ DataPreview: Fallback lookup also failed:', fallbackError);
            }
          }
        }
        
        // ENTERPRISE FIX: Check if cancelled again after async operation
        if (isCancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
        
        if (!survey) {
          console.warn('⚠️ DataPreview: Survey not found - this may be a timing issue or ID mismatch', {
            resolvedSurveyId,
            originalFileId: file.id,
            userId: getUserId()
          });
          // ENTERPRISE FIX: Don't clear immediately - retry once more in case of timing issue
          if (attempt < MAX_RETRIES && isMountedRef.current) {
            console.log(`🔄 DataPreview: Retrying survey lookup (attempt ${attempt + 1}/${MAX_RETRIES})...`);
            setTimeout(() => {
              if (!isCancelled && isMountedRef.current) {
                loadSurveyData(attempt + 1);
              }
            }, RETRY_DELAY);
            return;
          }
          console.log('❌ DataPreview: Survey no longer exists after retries, clearing DataPreview');
          setOriginalData([]);
          setPreviewData([]);
          setPreviewHeaders([]);
          setIsLoading(false);
          setIsRefreshing(false); // CRITICAL: Clear refreshing state
          return;
        }
        
        // ENTERPRISE FIX: Check if survey is still uploading (has metadata but no data yet)
        // Also check if rowCount is 0 but survey was just uploaded (might be timing issue)
        const isUploading = (survey as any)?._uploadStatus === 'uploading';
        const hasMetadataButNoData = survey && (survey.rowCount === 0 || !survey.rowCount);
        const uploadDate = survey?.uploadDate ? new Date(survey.uploadDate) : null;
        const isRecentUpload = uploadDate && (Date.now() - uploadDate.getTime()) < 30000; // Uploaded in last 30 seconds
        
        if (isUploading || (hasMetadataButNoData && isRecentUpload)) {
          console.log('⏳ Survey is still uploading or data not yet available, waiting...', {
            isUploading,
            hasMetadataButNoData,
            isRecentUpload,
            uploadDate: uploadDate?.toISOString(),
            rowCount: survey?.rowCount
          });
          // Retry after a delay to allow upload to complete
          if (attempt < MAX_RETRIES * 3 && isMountedRef.current) { // More retries for upload completion
            setTimeout(() => {
              if (!isCancelled && isMountedRef.current) {
                loadSurveyData(attempt + 1);
              }
            }, RETRY_DELAY * 2); // Wait longer for upload to complete
            return;
          }
        }
        
        // ENTERPRISE FIX: Check if cancelled before fetching data
        if (isCancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
        
        // INDUSTRY STANDARD: Check cache before making Firebase read
        // Google/Amazon/Apple all use stale-while-revalidate - show cached data immediately
        const filtersKey = JSON.stringify(filters);
        const cached = surveyDataCacheRef.current;
        const now = Date.now();
        let surveyData: any[] = [];
        let fromCache = false;
        
        // Use cached data if it matches and is fresh (less than 5 minutes old)
        if (cached && cached.surveyId === resolvedSurveyId && cached.filters === filtersKey) {
          const cacheAge = now - cached.timestamp;
          if (cacheAge < CACHE_TTL) {
            console.log(`✅ Using cached survey data (age: ${Math.round(cacheAge / 1000)}s) - skipping Firebase read`);
            surveyData = cached.data;
            fromCache = true;
          }
        }
        
        // Cache miss or stale - fetch from database
        if (!fromCache) {
          console.log('📥 Fetching survey data from database (cache miss or stale)', {
            surveyId: resolvedSurveyId,
            originalFileId: file.id,
            filters: filters,
            storageMode: dataService.getMode()
          });
          // ENTERPRISE FIX: Try multiple ID formats to ensure we find the data
          // The survey ID might be stored with or without user prefix
          let result = await dataService.getSurveyData(
            resolvedSurveyId,
            filters,
            { limit: 10000 } // Fetch all data (up to 10,000 rows)
          );
          
          // If no data found, try with original file ID (might be different format)
          if (result.rows.length === 0 && file.id && file.id !== resolvedSurveyId) {
            console.log('🔄 No data found with resolvedSurveyId, trying original file ID:', file.id);
            const fallbackResult = await dataService.getSurveyData(
              file.id,
              filters,
              { limit: 10000 }
            );
            if (fallbackResult.rows.length > 0) {
              console.log('✅ Found data using original file ID');
              result = fallbackResult;
            }
          }
          
          surveyData = result.rows;
          console.log('📥 Survey data fetch result:', {
            rowCount: surveyData.length,
            hasRows: surveyData.length > 0,
            resolvedSurveyId,
            originalFileId: file.id,
            firstRowSample: surveyData[0] || null,
            storageMode: dataService.getMode(),
            firstRowKeys: surveyData.length > 0 ? Object.keys(surveyData[0]) : []
          });
          
          // Update cache
          surveyDataCacheRef.current = {
            surveyId: resolvedSurveyId,
            filters: filtersKey,
            data: surveyData,
            timestamp: now
          };
        }
        
        // ENTERPRISE FIX: Check if cancelled after async data fetch
        if (isCancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
        
        console.log('✅ Survey data returned:', {
          rowCount: surveyData.length,
          surveyId: resolvedSurveyId,
          originalFileId: file.id,
          fromCache,
          expectedRowCount: survey?.rowCount || 0,
          sampleRows: surveyData.slice(0, 3),
          sampleSpecialties: [...new Set(surveyData.map((row: any) => row.specialty))].slice(0, 5),
          filters: filters,
          storageMode: dataService.getMode(),
          firstRowKeys: surveyData.length > 0 ? Object.keys(surveyData[0]) : [],
          firstRowSample: surveyData.length > 0 ? Object.entries(surveyData[0]).slice(0, 5).map(([k, v]) => ({ key: k, value: String(v).substring(0, 50) })) : [],
          warning: surveyData.length === 0 && survey?.rowCount > 0 ? `⚠️ CRITICAL: Survey metadata shows ${survey.rowCount} rows but getSurveyData returned 0 rows. This indicates a data retrieval issue.` : undefined
        });
        
        // ENTERPRISE DIAGNOSTIC: If survey has rowCount but no data returned, log detailed diagnostic
        if (surveyData.length === 0 && survey && survey.rowCount > 0) {
          console.error('❌ CRITICAL DATA RETRIEVAL ISSUE:', {
            surveyId: resolvedSurveyId,
            originalFileId: file.id,
            surveyRowCount: survey.rowCount,
            surveyName: survey.name,
            surveyProviderType: survey.providerType,
            storageMode: dataService.getMode(),
            filters: filters,
            note: 'Survey metadata indicates data exists, but getSurveyData returned 0 rows. This could indicate: 1) Data not yet saved to database, 2) ID mismatch, 3) Data in different storage location'
          });
        }
        
        // ENTERPRISE FIX: Check if cancelled or unmounted before processing
        if (isCancelled || !isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
        
        // Check if survey data is empty (survey might have been deleted or data not synced yet)
        if (surveyData.length === 0) {
          const expectedRowCount = survey?.rowCount || 0;
          
          // ENTERPRISE FIX: If survey has rowCount > 0, it means data should exist
          // Retry more aggressively for surveys that should have data
          if (expectedRowCount > 0) {
            if (attempt < MAX_RETRIES * 2 && isMountedRef.current) {
              console.log(`⚠️ Survey has ${expectedRowCount} rows but data not loaded yet. Retrying in ${RETRY_DELAY}ms (attempt ${attempt + 1}/${MAX_RETRIES * 2})...`);
              setTimeout(() => {
                if (!isCancelled && isMountedRef.current) {
                  loadSurveyData(attempt + 1);
                }
              }, RETRY_DELAY);
              return;
            }
            
            // After all retries, show error
            console.error(`❌ Survey metadata indicates ${expectedRowCount} rows, but no data found after ${MAX_RETRIES * 2} attempts. Upload may have failed or data is in wrong storage.`);
            if (isMountedRef.current) {
              setIsRefreshing(false);
              setIsLoading(false);
              setOriginalData([]);
              setPreviewData([]);
              setPreviewHeaders([]);
              hasLoadedRef.current = true;
              onError(`Survey metadata exists (${expectedRowCount} rows expected) but data rows are missing. The upload may have failed or data may be in a different storage location. Please try refreshing the page or re-uploading the file.`);
            }
          } else {
            // Survey has no expected rows - might be empty or still uploading
            if (attempt < MAX_RETRIES && !hasLoadedRef.current && isMountedRef.current) {
              console.log(`No data returned, retrying in ${RETRY_DELAY}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`);
              setTimeout(() => {
                if (!isCancelled && isMountedRef.current) {
                  loadSurveyData(attempt + 1);
                }
              }, RETRY_DELAY);
              return;
            }
            
            console.log('No survey data found - survey may have been deleted or upload incomplete');
            if (isMountedRef.current) {
              setIsRefreshing(false); // CRITICAL: Stop modal FIRST
              setIsLoading(false);
              setOriginalData([]);
              setPreviewData([]);
              setPreviewHeaders([]);
              hasLoadedRef.current = true;
              onError('No survey data found for this upload. The upload may still be in progress or may have failed. Please check the upload queue or re-upload the file.');
            }
          }
          return;
        }
        
        // Store original data for filtering
        setOriginalData(surveyData);
        
        // ENTERPRISE FIX: Check if cancelled before fetching metadata
        if (isCancelled || !isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
        
        // ENTERPRISE FIX: Get headers in original Excel/CSV order
        // First, try to get original headers from survey metadata
        let headers: string[] = [];
        try {
          const survey = await dataService.getSurveyById(resolvedSurveyId);
          
          // ENTERPRISE FIX: Check if cancelled or unmounted after metadata fetch
          if (isCancelled || !isMountedRef.current) {
            setIsLoading(false);
            setIsRefreshing(false);
            return;
          }
          if (survey?.metadata?.originalHeaders && Array.isArray(survey.metadata.originalHeaders)) {
            // Use stored original column order from Excel/CSV file
            const storedHeaders = survey.metadata.originalHeaders.filter((h: string) => 
              h && h.trim() && h.toLowerCase() !== 'id' && h.toLowerCase() !== 'surveyid'
            );
            
            // ENTERPRISE FIX: Preserve original column order with case-insensitive matching
            // CRITICAL: JavaScript objects don't guarantee key order, so we MUST use originalHeaders
            // to reconstruct the correct column sequence from the uploaded file
            if (surveyData.length > 0) {
              const availableKeys = Object.keys(surveyData[0]);
              const availableKeysLower = new Map(availableKeys.map(k => [k.toLowerCase(), k]));
              
              // ENTERPRISE FIX: Build headers array preserving original order
              // Match stored headers to available keys with multiple matching strategies
              const orderedHeaders: string[] = [];
              const matchedKeys = new Set<string>();
              
              // Helper to normalize strings for comparison
              const normalizeForMatch = (s: string) => s.toLowerCase().trim().replace(/[\s_\-]/g, '');
              
              // CRITICAL: Process storedHeaders in their original order to preserve file sequence
              for (const storedHeader of storedHeaders) {
                const storedLower = storedHeader.toLowerCase().trim();
                let matched = false;
                
                // Strategy 1: Try exact match first (preserves case)
                if (availableKeys.includes(storedHeader)) {
                  orderedHeaders.push(storedHeader);
                  matchedKeys.add(storedHeader);
                  matched = true;
                } 
                // Strategy 2: Try case-insensitive match
                else if (availableKeysLower.has(storedLower)) {
                  const actualKey = availableKeysLower.get(storedLower)!;
                  orderedHeaders.push(actualKey);
                  matchedKeys.add(actualKey);
                  matched = true;
                }
                // Strategy 3: Try normalized match (handles "provider_type" vs "Provider Type" vs "providerType")
                else {
                  const storedNormalized = normalizeForMatch(storedHeader);
                  
                  const partialMatch = availableKeys.find(k => {
                    if (matchedKeys.has(k)) return false; // Already matched
                    const keyNormalized = normalizeForMatch(k);
                    // Exact normalized match
                    if (keyNormalized === storedNormalized) return true;
                    // One contains the other (for partial matches)
                    if (keyNormalized.length > 0 && storedNormalized.length > 0) {
                      return keyNormalized.includes(storedNormalized) || storedNormalized.includes(keyNormalized);
                    }
                    return false;
                  });
                  
                  if (partialMatch) {
                    orderedHeaders.push(partialMatch);
                    matchedKeys.add(partialMatch);
                    matched = true;
                  }
                }
                
                // ENTERPRISE FIX: If still no match, try reverse mapping (mapped header -> original)
                // The data might be saved with mapped headers, so we need to check if storedHeader
                // is a mapped version of an available key
                if (!matched) {
                  // Check if any available key is a mapped version of storedHeader
                  // This handles cases where data was saved with standardized column names
                  const reverseMatch = availableKeys.find(k => {
                    if (matchedKeys.has(k)) return false;
                    // Try various normalization strategies
                    const kNormalized = normalizeForMatch(k);
                    const storedNormalized = normalizeForMatch(storedHeader);
                    // Check if they're similar enough (fuzzy match)
                    if (kNormalized === storedNormalized) return true;
                    // Check if one is a substring of the other (handles abbreviations)
                    if (kNormalized.length > 3 && storedNormalized.length > 3) {
                      const longer = kNormalized.length > storedNormalized.length ? kNormalized : storedNormalized;
                      const shorter = kNormalized.length > storedNormalized.length ? storedNormalized : kNormalized;
                      if (longer.includes(shorter) || shorter.includes(longer)) return true;
                    }
                    return false;
                  });
                  
                  if (reverseMatch) {
                    orderedHeaders.push(reverseMatch);
                    matchedKeys.add(reverseMatch);
                    matched = true;
                    console.log(`  ✅ Matched "${storedHeader}" to "${reverseMatch}" using reverse mapping`);
                  }
                }
                
                if (!matched) {
                  console.warn(`  ⚠️ Could not match stored header "${storedHeader}" - will be skipped`);
                }
              }
              
              // Add any missing headers from data (new columns added after upload)
              const missingHeaders = availableKeys.filter((k: string) => 
                !matchedKeys.has(k) && 
                k.toLowerCase() !== 'id' && 
                k.toLowerCase() !== 'surveyid'
              );
              headers = [...orderedHeaders, ...missingHeaders];
              
              // ENTERPRISE FIX: Log full order comparison to debug column ordering issues
              const orderMatches = JSON.stringify(storedHeaders) === JSON.stringify(orderedHeaders);
              console.log('✅ Using original column order from metadata:', {
                storedHeadersCount: storedHeaders.length,
                storedHeadersList: storedHeaders, // Show ALL headers for debugging
                availableKeysCount: availableKeys.length,
                availableKeysList: availableKeys, // Show ALL keys for debugging
                matchedHeadersCount: orderedHeaders.length,
                matchedHeadersList: orderedHeaders, // Show ALL matched headers
                missingHeadersCount: missingHeaders.length,
                missingHeadersList: missingHeaders,
                finalOrderCount: headers.length,
                finalOrder: headers, // Show ALL headers in final order
                orderPreserved: orderMatches,
                warning: !orderMatches ? '⚠️ Column order may have changed - some headers could not be matched' : undefined
              });
              
              // ENTERPRISE FIX: If order doesn't match, log detailed mismatch
              if (!orderMatches && storedHeaders.length > 0) {
                console.warn('⚠️ Column order mismatch detected:', {
                  expectedOrder: storedHeaders,
                  actualOrder: orderedHeaders,
                  unmatchedStored: storedHeaders.filter((h: string) => !orderedHeaders.includes(h)),
                  unmatchedAvailable: availableKeys.filter((k: string) => !orderedHeaders.includes(k))
                });
              }
            } else {
              headers = storedHeaders;
            }
          } else {
            // Fallback: Extract from data (may not preserve order)
            if (surveyData.length > 0) {
              headers = Object.keys(surveyData[0]);
            }
            console.log('⚠️ Original headers not found in metadata, using Object.keys()');
          }
        } catch (error) {
          // Fallback if survey metadata fetch fails
          console.warn('Could not fetch survey metadata, using Object.keys():', error);
          if (surveyData.length > 0) {
            headers = Object.keys(surveyData[0]);
          }
        }
        
        // ENTERPRISE FIX: Final safety check - ensure headers array is populated
        // If headers are still empty but we have data, use data keys as fallback
        if (headers.length === 0 && surveyData.length > 0) {
          console.warn('⚠️ Headers array is empty after all processing - using data keys as final fallback');
          headers = Object.keys(surveyData[0]).filter(h => h.toLowerCase() !== 'id' && h.toLowerCase() !== 'surveyid');
          console.log('✅ Final fallback headers from data keys:', headers.slice(0, 10));
        }
        
        // ENTERPRISE FIX: Log final header state for debugging
        if (headers.length === 0) {
          console.error('❌ CRITICAL: Headers array is STILL empty after all fallbacks!', {
            surveyDataLength: surveyData.length,
            surveyId: resolvedSurveyId,
            hasSurveyMetadata: !!survey,
            surveyMetadataOriginalHeaders: survey?.metadata?.originalHeaders?.length || 0
          });
        }
        
        // ENTERPRISE FIX: Check if cancelled or unmounted before setting state
        if (isCancelled || !isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
        
        // Hide db identifiers from preview (if not already filtered)
        headers = headers.filter(h => h.toLowerCase() !== 'id' && h.toLowerCase() !== 'surveyid');
        
        // ENTERPRISE FIX: Ensure headers array is not empty - fallback to data keys if needed
        if (headers.length === 0 && surveyData.length > 0) {
          console.warn('⚠️ Headers array is empty after processing - falling back to data keys');
          headers = Object.keys(surveyData[0]).filter(h => h.toLowerCase() !== 'id' && h.toLowerCase() !== 'surveyid');
          console.log('✅ Using fallback headers from data keys:', headers);
        }
        
        // ENTERPRISE FIX: Log header and data state for debugging
        console.log('🔍 DataPreview: Building rows with headers:', {
          headerCount: headers.length,
          headers: headers.slice(0, 10), // Show first 10 headers
          dataRowCount: surveyData.length,
          firstDataRowKeys: surveyData.length > 0 ? Object.keys(surveyData[0]).slice(0, 10) : [],
          headerMatchCheck: surveyData.length > 0 ? headers.map(h => ({
            header: h,
            hasExactMatch: surveyData[0][h as keyof typeof surveyData[0]] !== undefined,
            hasCaseInsensitiveMatch: Object.keys(surveyData[0]).some(k => k.toLowerCase().trim() === h.toLowerCase().trim())
          })).slice(0, 5) : []
        });
        
        // ENTERPRISE FIX: Build rows using headers in correct order
        // CRITICAL: Use case-insensitive matching to find values in data objects
        // This handles cases where headers might be "Provider Type" but keys are "provider_type" or "providerType"
        const rows = surveyData.map(row => {
          return headers.map(header => {
            // Try exact match first
            if (row[header as keyof typeof row] !== undefined) {
              return String(row[header as keyof typeof row] || '');
            }
            // Try case-insensitive match
            const headerLower = header.toLowerCase().trim();
            const matchingKey = Object.keys(row).find(k => k.toLowerCase().trim() === headerLower);
            if (matchingKey) {
              return String(row[matchingKey as keyof typeof row] || '');
            }
            // Try normalized match (handles spaces, underscores, hyphens)
            const normalizedHeader = headerLower.replace(/[\s_\-]/g, '');
            const normalizedMatch = Object.keys(row).find(k => 
              k.toLowerCase().trim().replace(/[\s_\-]/g, '') === normalizedHeader
            );
            if (normalizedMatch) {
              return String(row[normalizedMatch as keyof typeof row] || '');
            }
            // No match found - return empty string
            return '';
          });
        });
        
        console.log('✅ DataPreview: Rows built successfully:', {
          rowCount: rows.length,
          headerCount: headers.length,
          firstRowSample: rows.length > 0 ? rows[0].slice(0, 5) : []
        });

        setPreviewHeaders(headers);
        setPreviewData(rows);
        hasLoadedRef.current = true;
        
        // Force a small delay to ensure state updates propagate
        await new Promise(resolve => setTimeout(resolve, 50));

        // ENTERPRISE FIX: Only update state if component is still mounted
        if (!isCancelled && isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      } catch (error) {
        console.error('Error loading survey data:', error);
        
        // ENTERPRISE FIX: Check if cancelled or unmounted FIRST
        if (isCancelled || !isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
        
        // ENTERPRISE FIX: Check if error is due to survey being deleted
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('not found') || errorMessage.includes('deleted') || errorMessage.includes('does not exist')) {
          console.log('Survey appears to have been deleted, clearing DataPreview');
          if (isMountedRef.current) {
            setIsRefreshing(false); // CRITICAL: Stop modal FIRST
            setIsLoading(false);
            setOriginalData([]);
            setPreviewData([]);
            setPreviewHeaders([]);
          }
          return;
        }
        
        // Retry on error if we haven't exceeded max retries
        if (attempt < MAX_RETRIES && !hasLoadedRef.current && !isCancelled && isMountedRef.current) {
          console.log(`Error occurred, retrying in ${RETRY_DELAY}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`);
          setTimeout(() => {
            if (!isCancelled && isMountedRef.current) {
              loadSurveyData(attempt + 1);
            }
          }, RETRY_DELAY);
          return;
        }
        
        onError('Error loading survey data from backend');
        // ENTERPRISE FIX: Only update state if component is still mounted
        if (!isCancelled && isMountedRef.current) {
          setIsRefreshing(false); // CRITICAL: Stop modal FIRST
          setIsLoading(false);
        }
      }
    };

    // Initial delay to allow Firebase/auth to initialize, then load data
    // Use a longer delay on first mount to ensure Firebase is ready
    const initialDelay = !hasLoadedRef.current ? 300 : 100;
    
    timeoutId = setTimeout(() => {
      if (resolvedSurveyId) {
        loadSurveyData(0);
      }
    }, initialDelay);

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (loadTimeoutId) {
        clearTimeout(loadTimeoutId);
      }
      // ENTERPRISE FIX: Clear all loading states on unmount
      setIsLoading(false);
      setIsRefreshing(false);
    };
  }, [file.id, resolvedSurveyId, globalFilters.specialty, globalFilters.region, globalFilters.variable, dataService, onError, isDatabaseReady]);
  // NOTE: globalFilters.providerType removed from dependencies - we don't filter by providerType at row level

  // Load global filter options from server (not paginated)
  // OPTIMIZED: Use cached data if available to avoid duplicate Firebase reads
  useEffect(() => {
    let cancelled = false;
    const loadFilters = async () => {
      try {
        console.log('Loading filter options for file:', file.id);
        
        // INDUSTRY STANDARD: Use cached data if available (avoid duplicate Firebase read)
        let rows: any[] = [];
        const cached = surveyDataCacheRef.current;
        if (cached && cached.surveyId === resolvedSurveyId) {
          console.log('✅ Using cached data for filter extraction (avoiding Firebase read)');
          rows = cached.data;
        } else {
          // Cache miss - fetch from Firebase (no filters, just need data for filter options)
          const { rows: fetchedRows } = await dataService.getSurveyData(resolvedSurveyId, {}, { limit: 1000 }); // Only need sample for filter extraction
          rows = fetchedRows;
        }
        if (cancelled) return;
        
        console.log('Raw data for filter extraction:', rows.slice(0, 3));
        console.log('Available field names:', Object.keys(rows[0] || {}));
        
        // More robust field name detection
        const firstRow = rows[0] || {};
        const fieldNames = Object.keys(firstRow);
        
        // Find specialty field
        const specialtyField = fieldNames.find(field => 
          field.toLowerCase().includes('specialty') || 
          field.toLowerCase().includes('speciality')
        ) || 'specialty';
        
        // Find provider type field
        const providerTypeField = fieldNames.find(field => 
          field.toLowerCase().includes('provider') || 
          field.toLowerCase().includes('type')
        ) || 'providerType';
        
        // Find region field
        const regionField = fieldNames.find(field => 
          field.toLowerCase().includes('region') || 
          field.toLowerCase().includes('geographic')
        ) || 'geographicRegion';
        
        // Find variable field
        const variableField = fieldNames.find(field => 
          field.toLowerCase().includes('variable') || 
          field.toLowerCase().includes('metric') ||
          field.toLowerCase().includes('compensation')
        ) || 'variable';
        
        console.log('Detected field names:', {
          specialtyField,
          providerTypeField,
          regionField,
          variableField
        });
        
        const specialties = [...new Set(rows.map(row => String(row[specialtyField] || '')).filter(Boolean))].sort();
        const providerTypes = [...new Set(rows.map(row => String(row[providerTypeField] || '')).filter(Boolean))].sort();
        const regions = [...new Set(rows.map(row => String(row[regionField] || '')).filter(Boolean))].sort();
        const variables = [...new Set(rows.map(row => String(row[variableField] || '')).filter(Boolean))].sort();
        
        console.log('Extracted filter options:', {
          specialties: specialties.slice(0, 10),
          providerTypes: providerTypes.slice(0, 10),
          regions: regions.slice(0, 10),
          variables: variables.slice(0, 10),
          totalSpecialties: specialties.length,
          totalProviderTypes: providerTypes.length,
          totalRegions: regions.length,
          totalVariables: variables.length
        });
        
        setServerSpecialties(specialties);
        setServerProviderTypes(providerTypes);
        setServerRegions(regions);
        setServerVariables(variables);
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };
    if (resolvedSurveyId && isDatabaseReady) loadFilters();
    return () => { cancelled = true; };
  }, [file.id, resolvedSurveyId, dataService, isDatabaseReady]);

  // Simple filter options - disable cascading for now to fix basic filtering
  const cascadingFilterOptions = useMemo(() => {
    // Use server-side filter options which have access to the full dataset
    // Only apply cascading logic if we have server options
    if (!serverSpecialties.length && !serverProviderTypes.length && !serverRegions.length && !serverVariables.length) {
      return {
        specialties: [],
        providerTypes: [],
        regions: [],
        variables: []
      };
    }

    // For now, return all server options to ensure basic filtering works
    // TODO: Implement proper cascading logic once basic filtering is stable
    return {
      specialties: serverSpecialties,
      providerTypes: serverProviderTypes,
      regions: serverRegions,
      variables: serverVariables
    };
  }, [serverSpecialties, serverProviderTypes, serverRegions, serverVariables]);

  // Since we now have server-side filtering, we don't need client-side filtering
  // The filteredData will just be the previewData from the server
  const filteredData = useMemo(() => {
    if (!previewData[0]) return [];
    
    console.log('Using server-filtered data:', previewData.length - 1, 'rows');
    return previewData;
  }, [previewData]);



  // Formatting helpers
  const formatCurrency = (value: any, decimals: number) => {
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(num)) return value ?? '';
    return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };
  const formatNumber = (value: any, decimals: number) => {
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(num)) return value ?? '';
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  // Enterprise-grade column sizing with ResizeObserver support
  useColumnSizing({
    gridApi,
    enabled: !!gridApi && filteredData.length > 0
  });

  const createColumnDefs = () => {
    // Use the stored headers
    const headers = previewHeaders;
    console.log('Creating column defs for headers:', headers);
    
    // Check if this is normalized format data
    // Recognize normalized format by presence of variable/benchmark column AND percentile columns
    const hasVariableColumn = headers.some(header => {
      const lower = header.toLowerCase();
      return lower === 'variable' || lower === 'benchmark' || 
             lower.includes('variable') || lower.includes('benchmark');
    });
    const hasPercentileColumns = headers.some(header => {
      const lower = header.toLowerCase();
      return ['p25', 'p50', 'p75', 'p90'].includes(lower) ||
             lower.includes('25th') || lower.includes('50th') || 
             lower.includes('75th') || lower.includes('90th');
    });
    const isNormalizedFormat = hasVariableColumn && hasPercentileColumns;
    
    return headers
      .filter((header: string) => {
        const lower = String(header).toLowerCase();
        return lower !== 'id' && lower !== 'surveyid';
      })
      .map((header: string) => {
      const key = header;
      const lower = header.toLowerCase();
      
      // Handle both wide and normalized formats
      const isTcc = lower.startsWith('tcc_') || lower.includes('total_cash') || lower.includes('tcc');
      const isCf = lower.startsWith('cf_') || lower.includes('conversion');
      const isWrvu = lower.includes('wrvu');
      // Count columns - handle variations like "Group Count", "Indv Count", "n_orgs", "n_incumbents"
      const isCount = lower === 'n_orgs' || lower === 'n_incumbents' || 
                      lower.includes('group count') || lower.includes('indv count') ||
                      lower.includes('organizations') || lower.includes('incumbents');
      
      // For normalized format, check if this is a percentile column
      // Handle variations: "p25", "25th%", "25th", "50th%", etc.
      const isPercentile = isNormalizedFormat && (
        ['p25', 'p50', 'p75', 'p90'].includes(lower) ||
        lower.includes('25th') || lower.includes('50th') || 
        lower.includes('75th') || lower.includes('90th')
      );
      
      // Variable column - handle "variable", "benchmark", "Variable", "Benchmark"
      const isVariable = isNormalizedFormat && (
        lower === 'variable' || lower === 'benchmark' ||
        lower.includes('variable') || lower.includes('benchmark')
      );
      
      const isNumeric = isTcc || isCf || isWrvu || isCount || isPercentile;
      const isSpecialty = lower.includes('specialty');

      return {
        headerName: header,
        field: key,
        sortable: true,
        filter: isNumeric ? 'agNumberColumnFilter' : 'agTextColumnFilter',
        resizable: true,
        // Enterprise column sizing: minWidth for readability, flex for distribution
        // No maxWidth - let flex handle proportional distribution
        minWidth: isSpecialty ? 250 : isVariable ? 180 : isNumeric ? 90 : 130,
        // Smart flex ratios based on content importance and typical length
        flex: isSpecialty ? 3 : isVariable ? 2 : isNumeric ? 1 : 1.5,
        // Disable wrapping - use truncation instead for better control
        wrapText: false,
        autoHeight: false,
        // Apply CSS for text truncation on variable/benchmark columns (visual only, not sizing)
        cellStyle: isVariable ? {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        } : undefined,
        tooltipValueGetter: isVariable ? (params: any) => params.value || '' : undefined, // Show full text on hover
        cellClass: isNumeric ? 'ag-right-aligned-cell' : (isSpecialty ? 'font-semibold' : undefined),
        headerClass: isNumeric ? 'ag-right-aligned-header' : undefined,
        headerComponent: 'CustomHeader',
        headerComponentParams: {
          onPinColumn: (colId: string) => {
            if (!columnApi) return;
            const column = columnApi.getColumn(colId);
            const isPinned = column?.getColDef().pinned === 'left';
            columnApi.applyColumnState({
              state: [{ colId, pinned: isPinned ? null : 'left' }]
            });
          },
          isSpecialty: isSpecialty,
          isNumeric: isNumeric
        },
        valueGetter: (params: any) => {
          const raw = params.data[key];
          if (isNumeric) {
            const num = parseFloat(String(raw).replace(/[^0-9.-]/g, ''));
            return Number.isNaN(num) ? null : num;
          }
          return raw;
        },
        valueFormatter: (params: any) => {
          const raw = params.value ?? params.data?.[key];
          if (raw === undefined || raw === null) return '';
          
          // Handle normalized format percentiles
          if (isNormalizedFormat && isPercentile) {
            const variable = params.data?.variable;
            if (variable) {
              return formatNormalizedValue(parseFloat(raw), variable);
            }
          }
          
          // Handle wide format (numeric values - no sanitization needed)
          if (isTcc) return formatCurrency(raw, 0);
          if (isCf) return formatCurrency(raw, 2);
          if (isWrvu || isCount) return formatNumber(raw, 0);
          
          // AG Grid automatically escapes text content for XSS protection
          return String(raw);
        },
      } as any;
    });
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white shadow-sm">
        {/* Keep the filter controls visible during loading */}
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider'
        }}>
          {/* Header with Clear Filter Button */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-normal text-gray-600">Survey Preview</h3>
            <div className="relative group">
              <button
                disabled
                className="p-2 text-gray-300 cursor-not-allowed rounded-lg"
                aria-label="Clear all filters"
              >
                <div className="relative w-5 h-5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" />
                  </svg>
                </div>
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                  Clear Filters
                  <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Dropdowns - Disabled during loading */}
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-10 bg-gray-200 rounded-md"></div>
              </div>
            ))}
          </div>
        </Box>

        {/* Data Table Loading State */}
        <div className="ag-theme-alpine" style={{ height: 520, width: '100%' }}>
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 mb-2"></div>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 mb-1"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Early return if file is undefined or null
  if (!file || !file.id) {
    return (
      <div className="p-4 text-center text-gray-500">
        No survey selected or survey data not available.
      </div>
    );
  }

  return (
    <div className="w-full bg-white shadow-sm">
      {/* Filter Controls */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider'
      }}>
        {/* Header with Clear Filter Button */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-normal text-gray-600">Survey Preview</h3>
          <div className="relative group">
            <button
              onClick={() => {
                onFilterChange('specialty', '');
                onFilterChange('providerType', '');
                onFilterChange('region', '');
                onFilterChange('variable', '');
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full border border-gray-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
              aria-label="Clear all filters"
            >
              <div className="relative w-4 h-4">
                {/* Funnel Icon */}
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" />
                </svg>
                {/* X Overlay - Only show when filters are active */}
                {(globalFilters.specialty || globalFilters.providerType || globalFilters.region || globalFilters.variable) && (
                  <svg className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-red-500 bg-white rounded-full" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
            {/* Tooltip */}
            <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
              <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                Clear Filters
                <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Dropdowns - Perfectly Aligned */}
        <div className="grid grid-cols-4 gap-4">
          <FormControl fullWidth size="small">
            <Autocomplete
              value={globalFilters.specialty}
              onChange={(event: any, newValue: string | null) => {
                const syntheticEvent = {
                  target: {
                    name: 'specialty',
                    value: newValue || ''
                  }
                };
                handleFilterChange(syntheticEvent);
              }}
              options={cascadingFilterOptions.specialties}
              getOptionLabel={(option: string) => option ? formatSpecialtyForDisplay(option) : ''}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  placeholder="All Specialties"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      height: '40px',
                      border: '1px solid #d1d5db !important',
                      '&:hover': { 
                        borderColor: '#9ca3af !important',
                        borderWidth: '1px !important'
                      },
                      '&.Mui-focused': { 
                        boxShadow: 'none', 
                        borderColor: '#3b82f6 !important',
                        borderWidth: '1px !important'
                      },
                      '& fieldset': {
                        border: 'none !important'
                      }
                    }
                  }}
                />
              )}
              filterOptions={(options: string[], { inputValue }: { inputValue: string }) => filterSpecialtyOptions(options, inputValue, 100)}
              clearOnBlur={false}
              blurOnSelect={true}
            />
          </FormControl>

          <FormControl fullWidth size="small">
            <Select
              value={globalFilters.providerType}
              onChange={(event: any) => {
                const syntheticEvent = {
                  target: {
                    name: 'providerType',
                    value: event.target.value
                  }
                };
                handleFilterChange(syntheticEvent);
              }}
              displayEmpty
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  height: '40px',
                  border: '1px solid #d1d5db !important',
                  '&:hover': { 
                    borderColor: '#9ca3af !important',
                    borderWidth: '1px !important'
                  },
                  '&.Mui-focused': { 
                    boxShadow: 'none', 
                    borderColor: '#3b82f6 !important',
                    borderWidth: '1px !important'
                  },
                  '& fieldset': {
                    border: 'none !important'
                  }
                }
              }}
            >
              <MenuItem value="" sx={{ color: '#6b7280' }}>
                All Provider Types
              </MenuItem>
              {cascadingFilterOptions.providerTypes.map((providerType) => (
                <MenuItem key={providerType} value={providerType}>
                  {providerType}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <Select
              value={globalFilters.region}
              onChange={(event: any) => {
                const syntheticEvent = {
                  target: {
                    name: 'region',
                    value: event.target.value
                  }
                };
                handleFilterChange(syntheticEvent);
              }}
              displayEmpty
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  height: '40px',
                  border: '1px solid #d1d5db !important',
                  '&:hover': { 
                    borderColor: '#9ca3af !important',
                    borderWidth: '1px !important'
                  },
                  '&.Mui-focused': { 
                    boxShadow: 'none', 
                    borderColor: '#3b82f6 !important',
                    borderWidth: '1px !important'
                  },
                  '& fieldset': {
                    border: 'none !important'
                  }
                }
              }}
            >
              <MenuItem value="" sx={{ color: '#6b7280' }}>
                All Regions
              </MenuItem>
              {cascadingFilterOptions.regions.map((region) => (
                <MenuItem key={region} value={region}>
                  {region}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <Select
              value={globalFilters.variable}
              onChange={(event: any) => {
                const syntheticEvent = {
                  target: {
                    name: 'variable',
                    value: event.target.value
                  }
                };
                handleFilterChange(syntheticEvent);
              }}
              displayEmpty
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  height: '40px',
                  border: '1px solid #d1d5db !important',
                  '&:hover': { 
                    borderColor: '#9ca3af !important',
                    borderWidth: '1px !important'
                  },
                  '&.Mui-focused': { 
                    boxShadow: 'none', 
                    borderColor: '#3b82f6 !important',
                    borderWidth: '1px !important'
                  },
                  '& fieldset': {
                    border: 'none !important'
                  }
                }
              }}
            >
              <MenuItem value="" sx={{ color: '#6b7280' }}>
                All Variables
              </MenuItem>
              {cascadingFilterOptions.variables.map((variable) => (
                <MenuItem key={variable} value={variable}>
                  {variable}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </Box>

      {/* Data Table - AG Grid as primary */}
      <div className="relative mt-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm" style={{ width: '100%', height: '600px' }}>
        {/* Subtle refreshing overlay - positioned above the grid */}
        {isRefreshing && (
          <div className="absolute top-0 left-0 right-0 bg-white bg-opacity-90 flex items-center justify-center z-10 py-4">
            <EnterpriseLoadingSpinner
              message="Updating data..."
              recordCount="auto"
              data={previewData}
              progress={progress}
              variant="inline"
              loading={isRefreshing}
            />
          </div>
        )}
        {previewHeaders.length === 0 || previewData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">
            {isLoading ? 'Loading survey data...' : previewHeaders.length === 0 ? 'No columns found for this survey. Please check the browser console for details.' : 'No rows available for this survey.'}
          </div>
        ) : (
          <AgGridWrapper
              key={`grid-${file.id}-${previewData.length}-${previewHeaders.length}`}
              onGridReady={(params: any) => {
                setGridApi(params.api);
                setColumnApi(params.columnApi);
                
                // Pass grid API to parent component immediately
                if (onGridReady) {
                  onGridReady(params.api);
                  console.log('Grid API passed to parent component');
                }
                // Column sizing is handled by useColumnSizing hook
              }}
              rowData={filteredData.map((row) => {
                const obj: Record<string, string> = {};
                previewHeaders.forEach((header, idx) => {
                  obj[header] = row[idx];
                });
                return obj;
              })}
              columnDefs={createColumnDefs()}
              pagination={filteredData.length > 0}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
              suppressRowClickSelection={true}
              components={{
                CustomHeader: CustomHeader
              }}
              domLayout="normal"
              suppressRowHoverHighlight={true}
              rowHeight={36}
              suppressColumnVirtualisation={false}
              suppressHorizontalScroll={false}
            />
        )}
      </div>
    </div>
  );
};

export default DataPreview; 