/**
 * Custom hook for managing upload data
 * This hook handles file uploads, survey management, and state management
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getDataService } from '../../../services/DataService';
import { getCurrentStorageMode, StorageMode } from '../../../config/storage';
import { AnalyticsDataService } from '../../analytics/services/analyticsDataService';
import { 
  FileWithPreview,
  UploadedSurvey,
  UploadFormState,
  UploadProgress,
  DeleteProgress,
  UploadGlobalFilters,
  UniqueValues,
  UploadSectionState,
  UploadValidationResult
} from '../types/upload';
import { 
  UploadTransaction, 
  UploadState,
  UploadValidationSummary,
  UPLOAD_STEP_MESSAGES,
  DEFAULT_UPLOAD_SETTINGS
} from '../types/uploadStates';
import { 
  validateFileUpload, 
  detectDuplicates,
  validateUploadTransaction
} from '../utils/uploadValidation';
import { useDatabase } from '../../../contexts/DatabaseContext';
import { SurveySource } from '../../../shared/types';
import { 
  calculateSurveyStats,
  extractUniqueValues,
  filterSurveys,
  validateSurveyForm,
  calculateUploadSummary,
  validateColumns,
  checkIfMappingNeeded
} from '../utils/uploadCalculations';
import { readCSVFile } from '../../../shared/utils';
import { parseFile } from '../utils/fileParser';
import { validateAll, CompleteValidationResult } from '../utils/validationEngine';
import { getExcelSheetNames } from '../utils/excelParser';
import { isExcelFile } from '../utils/fileParser';
import { useSurveyListQuery } from './useSurveyListQuery';
import { useYear } from '../../../contexts/YearContext';
import { useProviderContext } from '../../../contexts/ProviderContext';
import { useToast } from '../../../contexts/ToastContext';
import { autoDetectSurveyMetadata, saveSmartDefaults, getSmartDefaults } from '../utils/autoDetection';
import { useUploadFormState } from './useUploadFormState';
import { AutoDetectionInfo } from '../types/upload';
import { applyLearnedMappingsToSurvey, MappingApplicationResult } from '../utils/mappingApplication';
import { getUploadQueueService } from '../../../services/UploadQueueService';
import { queryClient } from '../../../shared/services/queryClient';
import { duplicateDetectionService } from '../../../services/DuplicateDetectionService';
import { calculateFileHash } from '../utils/fileHash';

interface UseUploadDataReturn {
  // File state
  files: FileWithPreview[];
  setFiles: (files: FileWithPreview[]) => void;
  addFiles: (newFiles: File[]) => void;
  removeFile: (file: FileWithPreview) => void;
  clearFiles: () => void;
  
  // Survey state
  uploadedSurveys: UploadedSurvey[];
  selectedSurvey: string | null;
  setSelectedSurvey: (surveyId: string | null) => void;
  
  // Form state
  formState: UploadFormState;
  updateFormState: (field: keyof UploadFormState, value: any) => void;
  toggleCustom: () => void;
  autoDetection?: AutoDetectionInfo;
  mappingCoverage?: MappingApplicationResult | null;
  lastUploadedSurvey?: { id: string; name: string; rowCount: number } | null;
  filterMismatch?: { yearMismatch: boolean; providerTypeMismatch: boolean; surveyYear: string; surveyProviderType: string } | null;
  
  // Progress state
  uploadProgress: UploadProgress;
  deleteProgress: DeleteProgress;
  
  // Enhanced upload state
  uploadState: UploadState;
  
  // Filter state
  globalFilters: UploadGlobalFilters;
  updateGlobalFilters: (filterName: keyof UploadGlobalFilters, value: string) => void;
  
  // Section state
  sectionState: UploadSectionState;
  toggleSection: (section: keyof UploadSectionState) => void;
  
  // Computed values
  uniqueValues: UniqueValues;
  filteredSurveys: UploadedSurvey[];
  summary: ReturnType<typeof calculateUploadSummary>;
  
  // Validation
  formValidation: UploadValidationResult;
  fileValidation: UploadValidationResult;
  validationResults: Map<string, CompleteValidationResult>;
  excelSheetInfo: Map<string, Array<{ name: string; rowCount: number; columnCount: number }>>;
  selectedSheets: Map<string, string>;
  setSelectedSheet: (fileId: string, sheetName: string) => void;
  
  // Actions
  uploadFiles: () => Promise<void>;
  deleteSurvey: (surveyId: string) => Promise<void>;
  loadSurveys: () => Promise<void>;
  refreshData: () => Promise<void>;
  clearPendingColumnMapping: () => void;
  uploadWithColumnMapping: (mappings: Record<string, string>) => Promise<void>;
  
  // Column mapping (when validation indicates mapping needed)
  pendingColumnMapping: {
    file: FileWithPreview;
    headers: string[];
    format: 'normalized' | 'wide';
    sampleData: Record<string, unknown>[];
  } | null;
  
  // Duplicate resolution (when duplicate detected before queue add)
  pendingDuplicate: {
    file: FileWithPreview;
    duplicateResult: import('../../../services/DuplicateDetectionService').DuplicateCheckResult;
    newSurveyMetadata: { name: string; source: string; dataCategory: string; providerType: string; year: string; surveyLabel?: string; rowCount?: number };
  } | null;
  clearPendingDuplicate: () => void;
  resolveDuplicate: (action: 'cancel' | 'replace' | 'rename' | 'upload-anyway', newLabel?: string) => Promise<void>;
  
  // Loading states
  isLoading: boolean;
  isUploading: boolean;
  isDeleting: boolean;
  error: string | null;
  clearError: () => void;
  
  // Database state
  isDatabaseReady: boolean;
}

interface UseUploadDataOptions {
  initialFilters?: UploadGlobalFilters;
  autoLoad?: boolean;
  onUploadComplete?: (surveys: UploadedSurvey[]) => void;
  onSurveySelect?: (surveyId: string | null) => void;
  onSurveyDelete?: (surveyId: string) => void;
  // Optional: Override year and providerType for filtering
  // If not provided, will use context values
  year?: string;
  providerType?: string;
}

/**
 * Custom hook for managing upload data
 * 
 * @param options - Configuration options for the hook
 * @returns Object containing state, actions, and computed values
 */
export const useUploadData = (
  options: UseUploadDataOptions = {}
): UseUploadDataReturn => {
  const {
    initialFilters = { specialty: '', providerType: '', region: '' },
    autoLoad = true,
    onUploadComplete,
    onSurveySelect,
    onSurveyDelete,
    year: overrideYear,
    providerType: overrideProviderType
  } = options;

  // Get year and providerType from context (or use overrides)
  const { currentYear: contextYear, refreshYears } = useYear();
  const { selectedProviderType: contextProviderType } = useProviderContext();
  const currentYear = overrideYear ?? contextYear;
  const selectedProviderType = overrideProviderType ?? contextProviderType;
  const toast = useToast();

  const { formState, setFormState, updateFormState, toggleCustom } = useUploadFormState({
    currentYear,
    selectedProviderType
  });

  // State declarations
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploadedSurveys, setUploadedSurveys] = useState<UploadedSurvey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);
  
  const selectedSurveyRef = useRef<string | null>(null);
  const lastSurveyIdsStringRef = useRef<string>('');
  
  useEffect(() => {
    selectedSurveyRef.current = selectedSurvey;
  }, [selectedSurvey]);
  
  // Progress state
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isUploading: false,
    progress: 0,
    totalFiles: 0,
    currentFileIndex: 0
  });
  
  const [deleteProgress, setDeleteProgress] = useState<DeleteProgress>({
    isDeleting: false,
    progress: 0,
    totalFiles: 0,
    currentFileIndex: 0
  });
  
  // Filter and section state
  const [globalFilters, setGlobalFilters] = useState<UploadGlobalFilters>(initialFilters);
  const [sectionState, setSectionState] = useState<UploadSectionState>({
    isUploadSectionCollapsed: false,
    isUploadedSurveysCollapsed: false
  });
  
  // Loading and error state
  // ENTERPRISE FIX: Use query loading state (handles caching intelligently)
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation state
  const [validationResults, setValidationResults] = useState<Map<string, CompleteValidationResult>>(new Map());
  const [selectedSheets, setSelectedSheets] = useState<Map<string, string>>(new Map()); // fileId -> sheetName
  const [excelSheetInfo, setExcelSheetInfo] = useState<Map<string, Array<{ name: string; rowCount: number; columnCount: number }>>>(new Map());
  
  // Auto-detection state
  const [autoDetection, setAutoDetection] = useState<AutoDetectionInfo | undefined>(undefined);
  
  // Mapping coverage state (for last uploaded survey)
  const [mappingCoverage, setMappingCoverage] = useState<MappingApplicationResult | null>(null);
  const [lastUploadedSurvey, setLastUploadedSurvey] = useState<{ id: string; name: string; rowCount: number } | null>(null);
  const [filterMismatch, setFilterMismatch] = useState<{ yearMismatch: boolean; providerTypeMismatch: boolean; surveyYear: string; surveyProviderType: string } | null>(null);
  
  // Column mapping: when validation indicates mapping needed, show dialog before queue add
  const [pendingColumnMapping, setPendingColumnMapping] = useState<{
    file: FileWithPreview;
    headers: string[];
    format: 'normalized' | 'wide';
    sampleData: Record<string, unknown>[];
  } | null>(null);
  
  // Duplicate: when duplicate detected before queue add, show dialog
  const [pendingDuplicate, setPendingDuplicate] = useState<{
    file: FileWithPreview;
    duplicateResult: import('../../../services/DuplicateDetectionService').DuplicateCheckResult;
    newSurveyMetadata: { name: string; source: string; dataCategory: string; providerType: string; year: string; surveyLabel?: string; rowCount?: number };
  } | null>(null);

  // Enhanced upload state
  const [uploadState, setUploadState] = useState<UploadState>({
    progress: {
      isUploading: false,
      step: 'idle',
      progress: 0,
      currentFileIndex: 0,
      totalFiles: 0,
      message: UPLOAD_STEP_MESSAGES.idle
    },
    completedTransactions: [],
    failedTransactions: [],
    autoRetry: DEFAULT_UPLOAD_SETTINGS.autoRetry,
    maxRetries: DEFAULT_UPLOAD_SETTINGS.maxRetries,
    retryDelay: DEFAULT_UPLOAD_SETTINGS.retryDelay
  });

  // Data service and database context
  const dataService = useMemo(() => getDataService(), []);
  const { isReady: isDatabaseReady, getService: getDatabaseService } = useDatabase();

  // ENTERPRISE FIX: Store callbacks in refs to prevent infinite loops
  // Callbacks may not be memoized in parent components, causing re-renders
  const onSurveySelectRef = useRef(onSurveySelect);
  const onUploadCompleteRef = useRef(onUploadComplete);
  const onSurveyDeleteRef = useRef(onSurveyDelete);

  // Update refs when callbacks change
  useEffect(() => {
    onSurveySelectRef.current = onSurveySelect;
    onUploadCompleteRef.current = onUploadComplete;
    onSurveyDeleteRef.current = onSurveyDelete;
  }, [onSurveySelect, onUploadComplete, onSurveyDelete]);

  // ENTERPRISE FIX: Use React Query for intelligent caching
  // CRITICAL: Fetch ALL surveys (no filters) for upload screen
  // Users need to see all uploaded surveys regardless of year/provider type filters
  // Filtering should only happen in display/analytics components, not in upload management
  const { 
    data: rawSurveys, 
    loading: queryLoading, 
    error: queryError,
    refetch: refetchSurveys 
  } = useSurveyListQuery(
    undefined, // No year filter - show all surveys
    undefined, // No provider type filter - show all surveys
    autoLoad && isDatabaseReady
  );

  // Memoized computed values
  const uniqueValues = useMemo(() => {
    return extractUniqueValues(uploadedSurveys);
  }, [uploadedSurveys]);

  const filteredSurveys = useMemo(() => {
    return filterSurveys(uploadedSurveys, globalFilters);
  }, [uploadedSurveys, globalFilters]);

  const summary = useMemo(() => {
    return calculateUploadSummary(uploadedSurveys);
  }, [uploadedSurveys]);

  const formValidation = useMemo(() => {
    return validateSurveyForm(
      formState.surveyType,
      formState.customSurveyType,
      formState.surveyYear,
      formState.providerType,
      formState.isCustom
    );
  }, [formState]);

  const fileValidation = useMemo(() => {
    if (files.length === 0) {
      return { isValid: true, errors: [], warnings: [] };
    }
    
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    
    // Basic file type and size validation
    files.forEach(file => {
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        allErrors.push(`${file.name} is not a supported file type (CSV or Excel)`);
      }
      if (file.size === 0) {
        allErrors.push(`${file.name} is empty`);
      }
      if (file.size > 50 * 1024 * 1024) {
        allErrors.push(`${file.name} is too large (max 50MB)`);
      }
    });
    
    return {
      isValid: allErrors.length === 0,
      errors: [...new Set(allErrors)],
      warnings: [...new Set(allWarnings)]
    };
  }, [files]);

  // Sheet selection handler
  const setSelectedSheet = useCallback((fileId: string, sheetName: string) => {
    setSelectedSheets(prev => {
      const newMap = new Map(prev);
      newMap.set(fileId, sheetName);
      return newMap;
    });
  }, []);

  // File management actions
  const addFiles = useCallback(async (newFiles: File[]) => {
    const filesWithPreview = newFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file),
      id: `${file.name}-${file.size}-${Date.now()}`
    }));
    
    setFiles(prev => [...prev, ...filesWithPreview]);

    // Auto-detect metadata from first file (run detection even if parsing fails)
    if (filesWithPreview.length > 0) {
      const firstFile = filesWithPreview[0];
      
      // Run detection in background - don't block file addition
      (async () => {
        try {
          // Try to parse file to get headers and sample rows for better detection
          let headers: string[] = [];
          let sampleRows: any[] = [];
          
          try {
            const parsed = await parseFile(firstFile);
            if (parsed.headers && parsed.rows) {
              headers = parsed.headers;
              sampleRows = parsed.rows.slice(0, 10); // Sample first 10 rows
            }
          } catch (parseError) {
            console.warn('Could not parse file for auto-detection, using filename only:', parseError);
          }

          console.log('🔍 Starting auto-detection for file:', firstFile.name);
          const detectionResult = await autoDetectSurveyMetadata(firstFile, headers, sampleRows);
          console.log('🔍 Auto-detection result:', detectionResult);
        
        // Convert detection result to AutoDetectionInfo format
        const detectionInfo: AutoDetectionInfo = {
          surveyType: detectionResult.surveySource ? {
            value: detectionResult.surveySource,
            confidence: detectionResult.confidence.source,
            method: detectionResult.detectionMethod.source
          } : undefined,
          surveyYear: detectionResult.surveyYear ? {
            value: detectionResult.surveyYear,
            confidence: detectionResult.confidence.year,
            method: detectionResult.detectionMethod.year
          } : undefined,
          providerType: detectionResult.providerType ? {
            value: detectionResult.providerType,
            confidence: detectionResult.confidence.providerType,
            method: detectionResult.detectionMethod.providerType
          } : undefined,
          dataCategory: detectionResult.dataCategory ? {
            value: detectionResult.dataCategory,
            confidence: detectionResult.confidence.dataCategory,
            method: detectionResult.detectionMethod.dataCategory
          } : undefined
        };
        
        setAutoDetection(detectionInfo);
        
        // Auto-fill form with detected values (only if confidence is high enough)
        setFormState(prev => {
          const newState = { ...prev };
          let changed = false;
          
          if (detectionResult.surveySource && detectionResult.confidence.source > 0.7) {
            newState.surveyType = detectionResult.surveySource;
            newState.isCustom = false;
            changed = true;
            console.log(`✅ Auto-filled Survey Type: ${detectionResult.surveySource} (confidence: ${detectionResult.confidence.source})`);
          }
          
          if (detectionResult.surveyYear && detectionResult.confidence.year > 0.7) {
            newState.surveyYear = detectionResult.surveyYear;
            changed = true;
            console.log(`✅ Auto-filled Survey Year: ${detectionResult.surveyYear} (confidence: ${detectionResult.confidence.year})`);
          }
          
          if (detectionResult.providerType && detectionResult.confidence.providerType > 0.7) {
            newState.providerType = detectionResult.providerType;
            changed = true;
            console.log(`✅ Auto-filled Provider Type: ${detectionResult.providerType} (confidence: ${detectionResult.confidence.providerType})`);
          }
          
          if (!changed) {
            console.log('⚠️ No form fields auto-filled - confidence thresholds not met');
          }
          
          return newState;
        });
        
          console.log('✅ Auto-detection completed and form updated');
        } catch (error) {
          console.error('❌ Auto-detection failed, continuing with manual entry:', error);
          // Still set empty detection info so UI knows detection was attempted
          setAutoDetection({});
        }
      })();
    }

    // Load Excel sheet info for Excel files
    filesWithPreview.forEach(async (file) => {
      if (isExcelFile(file)) {
        try {
          const sheets = await getExcelSheetNames(file);
          setExcelSheetInfo(prev => {
            const newMap = new Map(prev);
            newMap.set(file.id!, sheets);
            return newMap;
          });
          // Set first sheet as default selection
          if (sheets.length > 0) {
            setSelectedSheets(prev => {
              const newMap = new Map(prev);
              newMap.set(file.id!, sheets[0].name);
              return newMap;
            });
          }
        } catch (error) {
          console.error('Error loading Excel sheet info:', error);
        }
      }
    });
  }, []);

  const removeFile = useCallback((file: FileWithPreview) => {
    setFiles(prev => prev.filter(f => f.id !== file.id));
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }
    // Clean up validation results and sheet info
    setValidationResults(prev => {
      const newMap = new Map(prev);
      newMap.delete(file.id!);
      return newMap;
    });
    setSelectedSheets(prev => {
      const newMap = new Map(prev);
      newMap.delete(file.id!);
      return newMap;
    });
    setExcelSheetInfo(prev => {
      const newMap = new Map(prev);
      newMap.delete(file.id!);
      return newMap;
    });
  }, []);

  const clearFiles = useCallback(() => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    setValidationResults(new Map());
    setSelectedSheets(new Map());
    setExcelSheetInfo(new Map());
    setAutoDetection(undefined);
    // Clear mapping coverage when starting a new upload
    setMappingCoverage(null);
    setLastUploadedSurvey(null);
  }, [files]);

  // Form state actions

  // Filter actions
  const updateGlobalFilters = useCallback((filterName: keyof UploadGlobalFilters, value: string) => {
    setGlobalFilters(prev => ({ ...prev, [filterName]: value }));
  }, []);

  // Section actions
  const toggleSection = useCallback((section: keyof UploadSectionState) => {
    setSectionState(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // ENTERPRISE FIX: Create stable string representation of survey IDs using useMemo
  // This prevents the effect from running when rawSurveys is a new array reference with same data
  const surveyIdsString = useMemo(() => {
    if (!rawSurveys || rawSurveys.length === 0) return '';
    return rawSurveys.map((s: any) => s.id).sort().join(',');
  }, [rawSurveys]);

  // ENTERPRISE FIX: Process React Query data into component format
  // This runs only when survey IDs actually change (not just array reference)
  useEffect(() => {
    // Only process if survey IDs actually changed
    if (surveyIdsString === lastSurveyIdsStringRef.current) {
      return;
    }

    // Update ref immediately to prevent duplicate processing
    lastSurveyIdsStringRef.current = surveyIdsString;

    if (!rawSurveys || rawSurveys.length === 0) {
      setUploadedSurveys([]);
      return;
    }

    // Process surveys from query result
    const processedSurveys = rawSurveys.map((survey: any) => ({
      id: survey.id,
      fileName: survey.name || '',
      surveyType: survey.type || '',
      surveyYear: survey.year?.toString() || '',
      uploadDate: new Date(survey.uploadDate || new Date()),
      fileContent: '',
      rows: [],
      stats: {
        totalRows: survey.rowCount ?? survey.row_count ?? 0,
        uniqueSpecialties: survey.specialtyCount ?? survey.specialty_count ?? 0,
        totalDataPoints: survey.dataPoints ?? survey.data_points ?? 0
      },
      columnMappings: {},
      // Include full survey object for display formatting
      providerType: survey.providerType,
      source: (survey as any).source,
      dataCategory: (survey as any).dataCategory,
      customDataCategory: (survey as any).customDataCategory,
      customProviderType: (survey as any).customProviderType,
      surveyLabel: (survey as any).surveyLabel || (survey as any).metadata?.surveyLabel
    }));

    setUploadedSurveys(processedSurveys);
    
    // ENTERPRISE FIX: Auto-select first survey if none selected
    // Use ref to read current value without including in dependency array
    // This prevents infinite loops when we update selectedSurvey
    // Only auto-select once when surveys first load
    const currentSelectedSurvey = selectedSurveyRef.current;
    if (!currentSelectedSurvey && processedSurveys.length > 0) {
      const firstSurveyId = processedSurveys[0].id;
      // Update ref immediately to prevent duplicate auto-selection
      selectedSurveyRef.current = firstSurveyId;
      setSelectedSurvey(firstSurveyId);
      onSurveySelectRef.current?.(firstSurveyId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyIdsString]); // ENTERPRISE FIX: Only depend on stable surveyIdsString - rawSurveys is accessed from closure

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      setError(queryError);
    }
  }, [queryError]);

  // ENTERPRISE FIX: Manual refresh function (for explicit refresh button)
  // React Query handles automatic caching, but we expose this for manual refresh
  const loadSurveys = useCallback(async () => {
    await refetchSurveys();
  }, [refetchSurveys]);

  const clearPendingColumnMapping = useCallback(() => {
    setPendingColumnMapping(null);
  }, []);

  const uploadWithColumnMapping = useCallback(async (mappings: Record<string, string>) => {
    const pending = pendingColumnMapping;
    if (!pending) return;
    setIsUploading(true);
    setError(null);
    setPendingColumnMapping(null);
    try {
      const parseResult = await parseFile(pending.file, selectedSheets.get(pending.file.id || ''));
      const mappedHeaders = parseResult.headers.map((h: string) => mappings[h] ?? h);
      const escape = (val: unknown): string => {
        const s = String(val ?? '');
        if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const csvLines = [
        mappedHeaders.join(','),
        ...parseResult.rows.map((row: unknown[]) => row.map(escape).join(','))
      ];
      const csvContent = csvLines.join('\n');
      const mappedFile = new File([csvContent], pending.file.name, { type: 'text/csv' });
      const surveyType = formState.isCustom ? formState.customSurveyType : formState.surveyType;
      const surveyYear = parseInt(formState.surveyYear, 10);
      const providerType = formState.providerType;
      const uploadQueue = getUploadQueueService();
      const jobIds = await uploadQueue.addToQueue([mappedFile], { surveyYear, surveyType, providerType });
      const completedJobIds = new Set<string>();
      const unsubscribe = uploadQueue.subscribe((job: { id: string; status: string; surveyId?: string; fileName: string; rowCount?: number }) => {
        if (!jobIds.includes(job.id)) return;
        if (job.status === 'completed' || job.status === 'failed') {
          completedJobIds.add(job.id);
          if (job.status === 'completed' && job.surveyId) {
            (async () => {
              try {
                const { getPerformanceOptimizedDataService } = await import('../../../services/PerformanceOptimizedDataService');
                getPerformanceOptimizedDataService().clearCache('all_surveys');
                getPerformanceOptimizedDataService().clearCache('provider_type_mapping');
                queryClient.invalidateQueries({ queryKey: ['surveys', 'list'], refetchType: 'active' });
                refreshYears().catch(() => { /* non-blocking */ });
                setLastUploadedSurvey({ id: job.surveyId!, name: job.fileName ?? '', rowCount: job.rowCount ?? 0 });
                setTimeout(async () => {
                  try {
                    const mappingResult = await applyLearnedMappingsToSurvey(job.surveyId!, providerType ?? '', surveyType ?? '');
                    setMappingCoverage(mappingResult);
                  } catch { /* non-blocking */ }
                }, 100);
              } catch { /* non-critical */ }
            })();
          }
          if (completedJobIds.size === jobIds.length) unsubscribe();
        }
      });
      clearFiles();
      const { cacheInvalidation } = await import('../../analytics/utils/cacheInvalidation');
      cacheInvalidation.onNewSurvey();
      try {
        const { getPerformanceOptimizedDataService } = await import('../../../services/PerformanceOptimizedDataService');
        getPerformanceOptimizedDataService().clearCache('all_surveys');
        getPerformanceOptimizedDataService().clearCache('provider_type_mapping');
        queryClient.invalidateQueries({ queryKey: ['surveys', 'list'], refetchType: 'active' });
        refreshYears().catch(() => { /* non-blocking */ });
      } catch { /* non-critical */ }
      saveSmartDefaults(surveyType ?? '', formState.surveyYear, formState.providerType as any, 'COMPENSATION' as any);
      onUploadCompleteRef.current?.([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  }, [pendingColumnMapping, formState, selectedSheets, clearFiles, refreshYears]);

  const clearPendingDuplicate = useCallback(() => {
    setPendingDuplicate(null);
  }, []);

  const resolveDuplicate = useCallback(async (action: 'cancel' | 'replace' | 'rename' | 'upload-anyway', newLabel?: string) => {
    const pending = pendingDuplicate;
    if (!pending) return;
    if (action === 'cancel') {
      setPendingDuplicate(null);
      setUploadState(prev => ({ ...prev, progress: { isUploading: false, step: 'idle', progress: 0, currentFileIndex: 0, totalFiles: 0, message: UPLOAD_STEP_MESSAGES.idle } }));
      return;
    }
    setPendingDuplicate(null);
    setIsUploading(true);
    setError(null);
    try {
      if (action === 'replace') {
        const existing = pending.duplicateResult.exactMatch?.survey || pending.duplicateResult.contentMatch?.survey || pending.duplicateResult.similarSurveys[0]?.survey;
        if (existing?.id) {
          await dataService.deleteSurveyEverywhere(existing.id);
        }
      }
      const surveyType = formState.isCustom ? formState.customSurveyType : formState.surveyType;
      const surveyYear = parseInt(formState.surveyYear, 10);
      const providerType = formState.providerType;
      const surveyName = action === 'rename' && newLabel ? newLabel : pending.file.name;
      const uploadQueue = getUploadQueueService();
      const jobIds = await uploadQueue.addToQueue([pending.file], { surveyYear, surveyType, providerType, surveyName });
      const completedJobIds = new Set<string>();
      const unsubscribe = uploadQueue.subscribe((job: { id: string; status: string; surveyId?: string; fileName: string; rowCount?: number }) => {
        if (!jobIds.includes(job.id)) return;
        if (job.status === 'completed' || job.status === 'failed') {
          completedJobIds.add(job.id);
          if (job.status === 'completed' && job.surveyId) {
            (async () => {
              try {
                const { getPerformanceOptimizedDataService } = await import('../../../services/PerformanceOptimizedDataService');
                getPerformanceOptimizedDataService().clearCache('all_surveys');
                getPerformanceOptimizedDataService().clearCache('provider_type_mapping');
                queryClient.invalidateQueries({ queryKey: ['surveys', 'list'], refetchType: 'active' });
                refreshYears().catch(() => { /* non-blocking */ });
                setLastUploadedSurvey({ id: job.surveyId!, name: job.fileName ?? '', rowCount: job.rowCount ?? 0 });
                setTimeout(async () => {
                  try {
                    const mappingResult = await applyLearnedMappingsToSurvey(job.surveyId!, providerType ?? '', surveyType ?? '');
                    setMappingCoverage(mappingResult);
                  } catch { /* non-blocking */ }
                }, 100);
              } catch { /* non-critical */ }
            })();
          }
          if (completedJobIds.size === jobIds.length) unsubscribe();
        }
      });
      clearFiles();
      const { cacheInvalidation } = await import('../../analytics/utils/cacheInvalidation');
      cacheInvalidation.onNewSurvey();
      try {
        const { getPerformanceOptimizedDataService } = await import('../../../services/PerformanceOptimizedDataService');
        getPerformanceOptimizedDataService().clearCache('all_surveys');
        getPerformanceOptimizedDataService().clearCache('provider_type_mapping');
        queryClient.invalidateQueries({ queryKey: ['surveys', 'list'], refetchType: 'active' });
        refreshYears().catch(() => { /* non-blocking */ });
      } catch { /* non-critical */ }
      saveSmartDefaults(surveyType ?? '', formState.surveyYear, formState.providerType as any, 'COMPENSATION' as any);
      onUploadCompleteRef.current?.([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  }, [pendingDuplicate, formState, dataService, clearFiles, refreshYears]);

  // Enhanced file upload with transaction support
  const uploadFiles = useCallback(async () => {
    if (files.length === 0 || !isDatabaseReady) return;
    
    try {
      setIsUploading(true);
      setError(null);
      
      // Initialize upload state
      setUploadState(prev => ({
        ...prev,
        progress: {
          isUploading: true,
          step: 'validating',
          progress: 0,
          currentFileIndex: 0,
          totalFiles: files.length,
          message: UPLOAD_STEP_MESSAGES.validating
        }
      }));

      const uploadedSurveys: UploadedSurvey[] = [];
      const transactions: UploadTransaction[] = [];
      
      // Step 1: Validate all files
      const uploadStartTime = Date.now();
      setUploadState(prev => ({
        ...prev,
        progress: { 
          ...prev.progress, 
          step: 'validating', 
          message: `Validating ${files.length} file${files.length > 1 ? 's' : ''}...`,
          details: 'Checking file format, structure, and content'
        }
      }));
      
      const validationResults: UploadValidationSummary[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validation = await validateFileUpload(file, files);
        
        validationResults.push({
          fileName: file.name,
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          rowCount: validation.details.rowCount,
          columnCount: validation.details.columnCount,
          detectedColumns: validation.details.detectedColumns,
          sampleData: validation.details.sampleData
        });
        
        if (!validation.isValid) {
          throw new Error(`Validation failed for ${file.name}: ${validation.errors.join(', ')}`);
        }
      }
      
      // Step 2: Check for duplicates
      const validationTime = Date.now() - uploadStartTime;
      setUploadState(prev => ({
        ...prev,
        progress: { 
          ...prev.progress, 
          step: 'parsing', 
          message: `Checking for duplicate surveys...`,
          details: `Validation completed in ${(validationTime / 1000).toFixed(1)}s`
        }
      }));
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const surveyType = formState.isCustom ? formState.customSurveyType : formState.surveyType;
        const surveyYear = formState.surveyYear;
        
        const duplicateCheck = await detectDuplicates(
          file.name,
          surveyType,
          surveyYear,
          () => dataService.getAllSurveys()
        );
        
        validationResults[i].duplicateCheck = duplicateCheck;
        
        if (duplicateCheck.isDuplicate) {
          console.warn(`Potential duplicate detected for ${file.name}`);
        }
      }
      
      // Step 2a: If first file has duplicate per service, show duplicate dialog before queue add
      const firstFileForDup = files[0];
      const surveyTypeForDup = formState.isCustom ? formState.customSurveyType : formState.surveyType;
      const surveyYearForDup = formState.surveyYear;
      duplicateDetectionService.clearCache();
      let fileHashForDup: string | undefined;
      try {
        fileHashForDup = await calculateFileHash(firstFileForDup);
      } catch { /* non-blocking */ }
      const duplicateResult = await duplicateDetectionService.checkForDuplicates({
        metadata: {
          source: surveyTypeForDup,
          dataCategory: 'COMPENSATION',
          providerType: formState.providerType,
          year: surveyYearForDup
        },
        file: firstFileForDup,
        fileHash: fileHashForDup
      });
      if (duplicateResult.hasDuplicate) {
        setPendingDuplicate({
          file: firstFileForDup,
          duplicateResult,
          newSurveyMetadata: {
            name: firstFileForDup.name,
            source: surveyTypeForDup,
            dataCategory: 'COMPENSATION',
            providerType: formState.providerType,
            year: surveyYearForDup
          }
        });
        setUploadState(prev => ({
          ...prev,
          progress: { isUploading: false, step: 'idle', progress: 0, currentFileIndex: 0, totalFiles: 0, message: UPLOAD_STEP_MESSAGES.idle }
        }));
        return;
      }
      
      // Step 2b: Check if first file needs column mapping before queue add
      const firstFile = files[0];
      const selectedSheet = selectedSheets.get(firstFile.id || '');
      const parseResult = await parseFile(firstFile, selectedSheet);
      const columnValidation = validateColumns(parseResult.headers);
      if (checkIfMappingNeeded(parseResult.headers, columnValidation)) {
        const format = columnValidation.format === 'wide_variable' || columnValidation.format === 'wide'
          ? 'wide'
          : 'normalized';
        const sampleData = parseResult.rows.slice(0, 3).map((row: unknown[]) => {
          const obj: Record<string, unknown> = {};
          parseResult.headers.forEach((h: string, i: number) => {
            obj[h] = row[i];
          });
          return obj;
        });
        setPendingColumnMapping({
          file: firstFile,
          headers: parseResult.headers,
          format,
          sampleData
        });
        setUploadState(prev => ({
          ...prev,
          progress: { isUploading: false, step: 'idle', progress: 0, currentFileIndex: 0, totalFiles: 0, message: UPLOAD_STEP_MESSAGES.idle }
        }));
        return;
      }
      
      // Step 3: Add files to background upload queue (non-blocking)
      const surveyType = formState.isCustom ? formState.customSurveyType : formState.surveyType;
      const surveyYear = parseInt(formState.surveyYear, 10);
      const providerType = formState.providerType;

      const uploadQueue = getUploadQueueService();
      const jobIds = await uploadQueue.addToQueue(files, {
        surveyYear,
        surveyType,
        providerType,
      });

      console.log('📤 useUploadData: Added files to upload queue', { jobIds, fileCount: files.length });

      // Subscribe to queue: on each job completion invalidate cache and apply learned mappings; unsubscribe when all jobs done
      const completedJobIds = new Set<string>();
      const unsubscribe = uploadQueue.subscribe((job) => {
        if (!jobIds.includes(job.id)) return;
        if (job.status === 'completed' || job.status === 'failed') {
          completedJobIds.add(job.id);
          if (job.status === 'completed' && job.surveyId) {
            const sid = job.surveyId;
            (async () => {
              try {
                const { getPerformanceOptimizedDataService } = await import('../../../services/PerformanceOptimizedDataService');
                getPerformanceOptimizedDataService().clearCache('all_surveys');
                getPerformanceOptimizedDataService().clearCache('provider_type_mapping');
                queryClient.invalidateQueries({ queryKey: ['surveys', 'list'], refetchType: 'active' });
                refreshYears().catch(() => { /* non-blocking */ });
                setLastUploadedSurvey({ id: sid, name: job.fileName, rowCount: job.rowCount ?? 0 });
                setTimeout(async () => {
                  try {
                    const mappingResult = await applyLearnedMappingsToSurvey(sid, providerType ?? '', surveyType ?? '');
                    setMappingCoverage(mappingResult);
                  } catch {
                    // Non-blocking
                  }
                }, 100);
              } catch {
                // Non-critical
              }
            })();
          }
          if (completedJobIds.size === jobIds.length) {
            unsubscribe();
          }
        }
      });

      clearFiles();
      setUploadState(prev => ({
        ...prev,
        progress: {
          isUploading: false,
          step: 'completed',
          progress: 100,
          currentFileIndex: 0,
          totalFiles: 0,
          message: UPLOAD_STEP_MESSAGES.completed
        },
        completedTransactions: prev.completedTransactions,
        currentTransaction: undefined
      }));

      const { cacheInvalidation } = await import('../../analytics/utils/cacheInvalidation');
      cacheInvalidation.onNewSurvey();

      try {
        const { getPerformanceOptimizedDataService } = await import('../../../services/PerformanceOptimizedDataService');
        const perf = getPerformanceOptimizedDataService();
        perf.clearCache('all_surveys');
        perf.clearCache('provider_type_mapping');
        queryClient.invalidateQueries({ queryKey: ['surveys', 'list'], refetchType: 'active' });
        refreshYears().catch(() => { /* non-blocking */ });
      } catch (error) {
        console.warn('Failed to clear cache after queue add:', error);
      }

      saveSmartDefaults(surveyType, formState.surveyYear, formState.providerType as any, 'COMPENSATION' as any);
      onUploadCompleteRef.current?.([]);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload files';
      setError(errorMessage);
      
      setUploadState(prev => ({
        ...prev,
        progress: {
          isUploading: false,
          step: 'error',
          progress: 0,
          currentFileIndex: 0,
          totalFiles: 0,
          message: UPLOAD_STEP_MESSAGES.error
        },
        error: {
          type: 'unknown',
          message: errorMessage,
          recoverable: true,
          retryCount: 0,
          maxRetries: uploadState.maxRetries
        }
      }));
      
      // Invalidate TanStack Query caches so Analysis Tools and Data Management show new data after upload
      try {
        const { queryClient } = require('../../../shared/services/queryClient');
        const qc = queryClient.queryClient;
        const { invalidateBenchmarkingQueries } = require('../../../features/analytics/hooks/useBenchmarkingQuery');
        invalidateBenchmarkingQueries(qc);
        qc.invalidateQueries({ queryKey: ['surveys', 'list'] });
        // Data Management (Specialties, Provider Types, Regions, Comp Metrics) read unmapped from IndexedDB; invalidate so they refetch
        qc.invalidateQueries({ queryKey: ['mappings'] });
        console.log('✅ Invalidated benchmarking, survey list, and mapping caches after survey upload');
      } catch (error) {
        console.warn('Failed to invalidate query cache:', error);
      }
      
    } finally {
      setIsUploading(false);
    }
  }, [files, formState, dataService, onUploadComplete, clearFiles, isDatabaseReady, getDatabaseService, uploadState.maxRetries, refreshYears]);

  // Enhanced survey deletion with verification
  // ENTERPRISE: Uses unified delete helpers for consistent cache invalidation
  const deleteSurvey = useCallback((surveyId: string) => {
    setError(null);
    const removed = uploadedSurveys.find(s => s.id === surveyId);
    const surveyName = removed?.fileName ?? 'Survey';

    // Optimistic update: remove from UI immediately so user can keep working
    setUploadedSurveys(prev => prev.filter(s => s.id !== surveyId));
    if (selectedSurvey === surveyId) {
      setSelectedSurvey(null);
      onSurveySelectRef.current?.(null);
    }
    if (lastUploadedSurvey?.id === surveyId) {
      setLastUploadedSurvey(null);
      setMappingCoverage(null);
    }
    toast.info('Deleting survey...', `${surveyName} is being removed in the background. You can keep working.`);
    return dataService.deleteSurveyEverywhere(surveyId).then(async (deleteResult) => {
      if (!deleteResult.success) {
        throw new Error(deleteResult.errors.join(' | ') || 'Delete failed');
      }
      // ENTERPRISE: Use unified cache invalidation helpers
      const { invalidateAllCachesAfterDelete, notifySurveyDeletion } = require('../../../shared/utils/deleteHelpers');
      
      // CRITICAL: Clear performance cache BEFORE invalidating queries
      // This prevents fetchSurveyList from returning cached data
      const { getPerformanceOptimizedDataService } = require('../../../services/PerformanceOptimizedDataService');
      const performanceService = getPerformanceOptimizedDataService();
      performanceService.clearCache('all_surveys'); // Clear all survey list cache entries
      
      // Invalidate React Query cache
      await invalidateAllCachesAfterDelete(surveyId);

      // Refresh year dropdown so it reflects current Firebase surveys
      refreshYears().catch(() => { /* non-blocking */ });

      // Notify other components of deletion
      notifySurveyDeletion(surveyId);
      
      // CRITICAL: Force refetch with cache bypass to ensure we get fresh data from IndexedDB
      // Add small delay to ensure cache clearing completes
      try {
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
        const { queryClient } = require('../../../shared/services/queryClient');
        queryClient.invalidateQueries({ queryKey: ['surveys', 'list'] });
        
        // Add timeout to prevent hanging
        const refetchPromise = refetchSurveys();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Refetch timeout')), 5000)
        );
        
        await Promise.race([refetchPromise, timeoutPromise]);
        console.log('✅ Refetched survey list after deletion');
      } catch (error) {
        console.warn('⚠️ Failed to refetch survey list after deletion:', error);
        // Don't throw - local state is already updated, so UI should be correct
        // The query will eventually refetch on its own
      }
      
      console.log('✅ Survey deleted successfully across stores:', {
        surveyId,
        firestoreDataRows: deleteResult.counts.firestoreDataRows,
        indexedDbDataRows: deleteResult.counts.indexedDbDataRows
      });
      
      onSurveyDeleteRef.current?.(surveyId);
      toast.success('Survey deleted', `${surveyName} has been removed.`);
    }).catch((err) => {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete survey';
      console.error('❌ Survey deletion failed:', errorMessage);
      setError(`Failed to delete ${surveyName}. Please try again or refresh.`);
      toast.error('Delete failed', errorMessage);
    });
  }, [uploadedSurveys, selectedSurvey, lastUploadedSurvey, dataService, refetchSurveys, toast, refreshYears]);

  // Refresh data
  const refreshData = useCallback(async () => {
    await loadSurveys();
  }, [loadSurveys]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ENTERPRISE FIX: No manual loading effect needed
  // React Query handles loading automatically based on:
  // - staleTime (2 minutes) - data is fresh for 2 minutes
  // - refetchOnMount: false - uses cache if data is fresh
  // - refetchOnWindowFocus: true - refreshes in background on focus
  // This provides instant navigation with cached data, just like Google apps

  // Validate files when they change or sheet selection changes (debounced for UI responsiveness)
  const VALIDATION_DEBOUNCE_MS = 400;
  useEffect(() => {
    if (files.length === 0) {
      setValidationResults(new Map());
      return;
    }

    const validateFiles = async () => {
      for (const file of files) {
        if (!file.id) continue;
        
        try {
          const selectedSheet = selectedSheets.get(file.id);
          const parseResult = await parseFile(file, selectedSheet);
          
          const validationResult = validateAll(parseResult.headers, parseResult.rows);
          
          setValidationResults(prev => {
            const newMap = new Map(prev);
            newMap.set(file.id!, validationResult);
            return newMap;
          });
        } catch (error) {
          console.error(`Error validating file ${file.name}:`, error);
          setValidationResults(prev => {
            const newMap = new Map(prev);
            newMap.set(file.id!, {
              tier1: {
                isValid: false,
                errors: [{
                  severity: 'critical',
                  tier: 'tier1' as any,
                  category: 'structure',
                  message: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  fixInstructions: ['Check file format and try again']
                }],
                blocked: true
              },
              tier2: { isValid: true, warnings: [], blocked: false },
              tier3: { isValid: true, info: [], blocked: false },
              isValid: false,
              canProceed: false,
              totalIssues: 1,
              errorCount: 1,
              warningCount: 0,
              infoCount: 0
            });
            return newMap;
          });
        }
      }
    };

    const timeoutId = setTimeout(() => {
      validateFiles();
    }, VALIDATION_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [files, selectedSheets]);

  // Cleanup file previews on unmount
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);

  // Return object
  return {
    // File state
    files,
    setFiles,
    addFiles,
    removeFile,
    clearFiles,
    
    // Survey state
    uploadedSurveys,
    selectedSurvey,
    setSelectedSurvey,
    
    // Form state
    formState,
    updateFormState,
    toggleCustom,
    autoDetection,
    mappingCoverage,
    lastUploadedSurvey,
    filterMismatch,
    
    // Progress state
    uploadProgress,
    deleteProgress,
    
    // Enhanced upload state
    uploadState,
    
    // Filter state
    globalFilters,
    updateGlobalFilters,
    
    // Section state
    sectionState,
    toggleSection,
    
    // Computed values
    uniqueValues,
    filteredSurveys,
    summary,
    
    // Validation
    formValidation,
    fileValidation,
    validationResults,
    excelSheetInfo,
    selectedSheets,
    setSelectedSheet,
    
    // Actions
    uploadFiles,
    deleteSurvey,
    loadSurveys,
    refreshData,
    clearPendingColumnMapping,
    uploadWithColumnMapping,
    pendingColumnMapping,
    pendingDuplicate,
    clearPendingDuplicate,
    resolveDuplicate,
    
    // Loading states
    // ENTERPRISE FIX: Show spinner for initial load (isLoading) or when no cached data
    // This provides consistent UX - always show spinner on first load
    isLoading: queryLoading,
    isUploading,
    isDeleting,
    error: error || queryError,
    clearError,
    
    // Database state
    isDatabaseReady
  };
};
