/**
 * Custom hook for managing upload data
 * This hook handles file uploads, survey management, and state management
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getDataService } from '../../../services/DataService';
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
  calculateUploadSummary
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
import { AutoDetectionInfo } from '../types/upload';
import { applyLearnedMappingsToSurvey, MappingApplicationResult } from '../utils/mappingApplication';

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
  const { currentYear: contextYear } = useYear();
  const { selectedProviderType: contextProviderType } = useProviderContext();
  const currentYear = overrideYear ?? contextYear;
  const selectedProviderType = overrideProviderType ?? contextProviderType;
  const toast = useToast();

  // State declarations
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploadedSurveys, setUploadedSurveys] = useState<UploadedSurvey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);
  
  // ENTERPRISE FIX: Use ref to track selectedSurvey to avoid dependency issues
  const selectedSurveyRef = useRef<string | null>(null);
  
  // ENTERPRISE FIX: Track last processed survey IDs string to prevent unnecessary updates
  const lastSurveyIdsStringRef = useRef<string>('');
  
  // Keep ref in sync with state
  useEffect(() => {
    selectedSurveyRef.current = selectedSurvey;
  }, [selectedSurvey]);
  
  // Form state - initialize with smart defaults if available
  const [formState, setFormState] = useState<UploadFormState>(() => {
    const defaults = getSmartDefaults();
    return {
      surveyType: defaults.surveySource || '',
      customSurveyType: '',
      surveyYear: defaults.surveyYear || currentYear || '',
      providerType: defaults.providerType || selectedProviderType || '',
      isCustom: false
    };
  });
  
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
  const updateFormState = useCallback((field: keyof UploadFormState, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleCustom = useCallback(() => {
    setFormState(prev => ({ 
      ...prev, 
      isCustom: !prev.isCustom,
      surveyType: prev.isCustom ? prev.surveyType : '',
      customSurveyType: prev.isCustom ? '' : prev.customSurveyType
    }));
  }, []);

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
      setUploadState(prev => ({
        ...prev,
        progress: { ...prev.progress, step: 'validating', message: 'Validating files...' }
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
      setUploadState(prev => ({
        ...prev,
        progress: { ...prev.progress, step: 'parsing', message: 'Checking for duplicates...' }
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
      
      // Step 3: Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const transactionId = crypto.randomUUID();
        
        const transaction: UploadTransaction = {
          id: transactionId,
          fileName: file.name,
          step: 'parsing',
          startTime: Date.now()
        };
        
        setUploadState(prev => ({
          ...prev,
          currentTransaction: transaction,
          progress: {
            ...prev.progress,
            currentFile: file.name,
            currentFileIndex: i,
            progress: (i / files.length) * 100,
            step: 'parsing',
            message: `Processing ${file.name}...`
          }
        }));
        
        try {
          // Parse file (CSV or Excel) using unified parser
          const selectedSheet = selectedSheets.get(file.id || '');
          const parseResult = await parseFile(file, selectedSheet);
          
          // Convert parsed rows to CSV-like format for stats calculation
          // (calculateSurveyStats expects CSV text, but we can work with rows)
          const headers = parseResult.headers;
          const rows = parseResult.rows;
          
          // Calculate stats from parsed data
          const stats = {
            totalRows: rows.length,
            uniqueSpecialties: new Set(rows.map((row: any) => 
              row.specialty || row.Specialty || row['Provider Type'] || ''
            ).filter(Boolean)).size,
            totalDataPoints: rows.length * headers.length
          };
          
          console.log('📊 useUploadData: Calculated stats from parsed file:', stats);
          
          // Upload to database
          setUploadState(prev => ({
            ...prev,
            progress: { ...prev.progress, step: 'saving', message: `Saving ${file.name}...` }
          }));
          
          const surveyType = formState.isCustom ? formState.customSurveyType : formState.surveyType;
          const surveyYear = parseInt(formState.surveyYear);
          const providerType = formState.providerType;
          
          console.log('📤 useUploadData: Starting survey upload:', {
            fileName: file.name,
            surveyYear,
            surveyType,
            providerType,
            fileSize: file.size
          });

          // CRITICAL: Wrap upload in try-catch to catch and log any errors
          let uploadedSurvey;
          try {
            uploadedSurvey = await dataService.uploadSurvey(
              file,
              file.name,
              surveyYear,
              surveyType,
              providerType
            );
          } catch (uploadError) {
            console.error('❌ useUploadData: Survey upload failed:', uploadError);
            const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown upload error';
            throw new Error(`Failed to upload survey "${file.name}": ${errorMessage}`);
          }

          console.log('✅ useUploadData: Survey upload completed:', {
            surveyId: uploadedSurvey.surveyId,
            rowCount: uploadedSurvey.rowCount,
            surveyYear,
            surveyType,
            providerType,
            note: 'Survey will appear in list if year/providerType match current filters',
            currentYearFilter: currentYear,
            currentProviderTypeFilter: selectedProviderType,
            yearMatches: String(surveyYear) === String(currentYear),
            providerTypeMatches: providerType === selectedProviderType
          });
          
          // Verify upload
          setUploadState(prev => ({
            ...prev,
            progress: { ...prev.progress, step: 'verifying', message: `Verifying ${file.name}...` }
          }));
          
          const verification = await validateUploadTransaction(
            uploadedSurvey.surveyId,
            stats.totalRows,
            (id) => {
              const dbService = getDatabaseService();
              if (!dbService) {
                // If using Firebase, use dataService instead
                return dataService.getSurveyById?.(id) || Promise.resolve(null);
              }
              return dbService.getSurveyById(id);
            },
            (id) => dataService.getSurveyData(id)
          );
          
          if (!verification.isValid) {
            throw new Error(`Verification failed: ${verification.errors.join(', ')}`);
          }
          
          // CRITICAL: Verify the survey was actually saved and get its actual year/providerType
          let actualSurveyYear = formState.surveyYear;
          let actualProviderType = providerType;
          try {
            const savedSurvey = await dataService.getSurveyById(uploadedSurvey.surveyId);
            if (savedSurvey) {
              actualSurveyYear = String(savedSurvey.year || savedSurvey.surveyYear || formState.surveyYear);
              actualProviderType = savedSurvey.providerType || providerType;
              console.log('✅ Verified survey in database:', {
                id: savedSurvey.id,
                name: savedSurvey.name,
                actualYear: actualSurveyYear,
                actualProviderType: actualProviderType,
                formYear: formState.surveyYear,
                formProviderType: providerType,
                currentYearFilter: currentYear,
                currentProviderTypeFilter: selectedProviderType,
                willShowInList: String(actualSurveyYear) === String(currentYear) && actualProviderType === selectedProviderType
              });
              
              // Show user-friendly notification if survey is filtered out
              const yearMismatch = String(actualSurveyYear) !== String(currentYear);
              const providerTypeMismatch = actualProviderType !== selectedProviderType;
              
              if (yearMismatch || providerTypeMismatch) {
                // Store mismatch info for UI display
                setFilterMismatch({
                  yearMismatch,
                  providerTypeMismatch,
                  surveyYear: actualSurveyYear,
                  surveyProviderType: actualProviderType
                });
                
                // Build user-friendly message
                const issues: string[] = [];
                if (yearMismatch) {
                  issues.push(`Year filter is set to ${currentYear}, but survey is ${actualSurveyYear}`);
                }
                if (providerTypeMismatch) {
                  issues.push(`Provider type filter is set to ${selectedProviderType}, but survey is ${actualProviderType}`);
                }
                
                const message = `Survey uploaded successfully!\n\nHowever, it won't appear in the list because:\n${issues.join('\n')}\n\nChange the filters above to see this survey.`;
                
                toast.warning(
                  'Survey Uploaded but Not Visible',
                  message,
                  10000 // Show for 10 seconds
                );
                
                console.warn(`⚠️ Survey uploaded with year ${actualSurveyYear} but current filter is ${currentYear}. Survey will not appear until you change the year filter.`);
                if (providerTypeMismatch) {
                  console.warn(`⚠️ Survey uploaded with providerType ${actualProviderType} but current filter is ${selectedProviderType}. Survey will not appear until you change the provider type filter.`);
                }
              } else {
                // Clear mismatch if survey matches filters
                setFilterMismatch(null);
              }
            } else {
              console.error('❌ Survey was not found in database after upload!', uploadedSurvey.surveyId);
            }
          } catch (verifyError) {
            console.error('❌ Failed to verify survey in database:', verifyError);
            // Continue anyway
          }
          
          const processedSurvey: UploadedSurvey = {
            id: uploadedSurvey.surveyId,
            fileName: file.name,
            surveyType: surveyType as SurveySource,
            surveyYear: actualSurveyYear,
            uploadDate: new Date(),
            fileContent: '', // File content is stored in database, not needed here
            rows: [],
            stats,
            columnMappings: {}
          };
          
          uploadedSurveys.push(processedSurvey);
          
          // Track last uploaded survey for success summary
          setLastUploadedSurvey({
            id: uploadedSurvey.surveyId,
            name: file.name,
            rowCount: uploadedSurvey.rowCount
          });
          
          // Auto-apply learned mappings after upload
          try {
            setUploadState(prev => ({
              ...prev,
              progress: { 
                ...prev.progress, 
                step: 'mapping', 
                message: 'Applying learned mappings...' 
              }
            }));
            
            const mappingResult = await applyLearnedMappingsToSurvey(
              uploadedSurvey.surveyId,
              providerType,
              surveyType
            );
            
            setMappingCoverage(mappingResult);
            
            console.log('✅ Learned mappings applied:', {
              surveyId: uploadedSurvey.surveyId,
              coverage: mappingResult.coverage,
              applied: mappingResult.appliedCounts
            });
          } catch (mappingError) {
            console.warn('Failed to apply learned mappings (non-blocking):', mappingError);
            // Don't fail the upload if mapping application fails
          }
          
          // Mark transaction as completed
          transaction.surveyId = uploadedSurvey.surveyId;
          transaction.step = 'completed';
          transaction.endTime = Date.now();
          transactions.push(transaction);
          
        } catch (fileError) {
          // Mark transaction as failed
          transaction.step = 'error';
          transaction.endTime = Date.now();
          transaction.error = {
            type: 'database',
            message: fileError instanceof Error ? fileError.message : 'Unknown error',
            recoverable: true,
            retryCount: 0,
            maxRetries: uploadState.maxRetries
          };
          transactions.push(transaction);
          
          // Rollback this file if possible
          if (transaction.surveyId) {
            try {
              await dataService.deleteSurvey(transaction.surveyId);
            } catch (rollbackError) {
              console.error('Failed to rollback survey:', rollbackError);
            }
          }
          
          throw fileError;
        }
      }

      // ENTERPRISE FIX: Don't manually update state - let React Query handle it
      // Cache invalidation will trigger a refetch and update the state automatically
      clearFiles();
      
      // Update upload state
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
        completedTransactions: [...prev.completedTransactions, ...transactions],
        currentTransaction: undefined
      }));
      
      // Invalidate analytics cache
      const { cacheInvalidation } = await import('../../analytics/utils/cacheInvalidation');
      cacheInvalidation.onNewSurvey();
      
      // ENTERPRISE FIX: Invalidate React Query cache to trigger automatic refetch
      // This ensures the survey list is updated immediately with the new survey
      // Using ['surveys', 'list'] invalidates all survey list queries (all year/providerType combinations)
      try {
        // CRITICAL: Clear performance cache first to ensure fresh data
        // ENTERPRISE FIX: Clear ALL survey list cache entries (including the "all_all" key used by upload screen)
        const { getPerformanceOptimizedDataService } = require('../../../services/PerformanceOptimizedDataService');
        const performanceService = getPerformanceOptimizedDataService();
        // Clear all survey list cache entries - use pattern matching to clear all variations
        performanceService.clearCache('all_surveys'); // Clears all keys starting with "all_surveys"
        console.log('✅ Cleared ALL performance cache entries for survey lists');
        
        const { queryClient } = require('../../../shared/services/queryClient');
        // CRITICAL FIX: Invalidate and refetch with force to bypass stale cache
        // This ensures surveys appear immediately after upload
        queryClient.queryClient.invalidateQueries({ 
          queryKey: ['surveys', 'list'],
          refetchType: 'active' // Force refetch of active queries
        });
        console.log('✅ Invalidated survey list cache after upload - React Query will refetch automatically');
        
        // ENTERPRISE FIX: Explicitly refetch with force to bypass any stale cache
        // This ensures survey pills appear immediately without page refresh
        const refetchResult = await refetchSurveys();
        console.log('✅ Refetched survey list after upload:', {
          surveyCount: refetchResult.data?.length || 0,
          currentYear,
          selectedProviderType,
          uploadedSurveys: uploadedSurveys.map(s => ({ id: s.id, name: s.fileName, year: s.surveyYear }))
        });
        
        // CRITICAL: If refetch returned 0 surveys but we just uploaded, force another refetch
        // This handles race conditions where cache hasn't updated yet
        if (refetchResult.data?.length === 0 && uploadedSurveys.length > 0) {
          console.warn('⚠️ Refetch returned 0 surveys after upload - forcing another refetch...');
          await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
          const secondRefetch = await refetchSurveys();
          console.log('✅ Second refetch result:', {
            surveyCount: secondRefetch.data?.length || 0
          });
        }
      } catch (error) {
        console.error('❌ Failed to invalidate/refetch query cache:', error);
      }
      
      // Call callback
      // Save smart defaults for next upload
      if (uploadedSurveys.length > 0) {
        const lastSurvey = uploadedSurveys[uploadedSurveys.length - 1];
        const surveyType = formState.isCustom ? formState.customSurveyType : formState.surveyType;
        saveSmartDefaults(
          surveyType,
          formState.surveyYear,
          formState.providerType as any,
          'COMPENSATION' as any // Default data category
        );
      }
      
      onUploadCompleteRef.current?.(uploadedSurveys);
      
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
      
      // Invalidate TanStack Query cache for benchmarking queries after successful upload
      try {
        const { queryClient } = require('../../../shared/services/queryClient');
        const { invalidateBenchmarkingQueries } = require('../../../features/analytics/hooks/useBenchmarkingQuery');
        invalidateBenchmarkingQueries(queryClient.queryClient);
        // Also invalidate survey list queries (for SurveyUpload/DataPreview screens)
        // Using ['surveys', 'list'] invalidates all survey list queries (all year/providerType combinations)
        queryClient.queryClient.invalidateQueries({ queryKey: ['surveys', 'list'] });
        console.log('✅ Invalidated benchmarking queries and survey list queries after survey upload');
      } catch (error) {
        console.warn('Failed to invalidate query cache:', error);
      }
      
    } finally {
      setIsUploading(false);
    }
  }, [files, formState, dataService, onUploadComplete, clearFiles, isDatabaseReady, getDatabaseService, uploadState.maxRetries]);

  // Enhanced survey deletion with verification
  // ENTERPRISE: Uses unified delete helpers for consistent cache invalidation
  const deleteSurvey = useCallback(async (surveyId: string) => {
    try {
      setIsDeleting(true);
      setDeleteProgress({
        isDeleting: true,
        progress: 25,
        totalFiles: 1,
        currentFileIndex: 0
      });
      setError(null);

      console.log(`🗑️ Starting enhanced delete for survey: ${surveyId}`);

      // Use enhanced delete with verification
      const deleteResult = await dataService.deleteWithVerification(surveyId);
      
      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Delete verification failed');
      }

      setDeleteProgress({
        isDeleting: true,
        progress: 50,
        totalFiles: 1,
        currentFileIndex: 0
      });

      // ENTERPRISE: Verify deletion before proceeding with cache invalidation
      const { verifySurveyDeletion } = require('../../../shared/utils/deleteHelpers');
      const isDeleted = await verifySurveyDeletion(dataService, surveyId);
      
      if (!isDeleted) {
        console.warn('⚠️ Survey deletion verification failed - survey may still exist');
        // Continue anyway, but log the warning
      }

      setDeleteProgress({
        isDeleting: true,
        progress: 75,
        totalFiles: 1,
        currentFileIndex: 0
      });

      // CRITICAL: Update local state FIRST to immediately update UI
      // This ensures surveys disappear from UI even if refetch brings them back
      setUploadedSurveys(prev => prev.filter(survey => survey.id !== surveyId));
      
      // Clear selection if deleted survey was selected
      if (selectedSurvey === surveyId) {
        setSelectedSurvey(null);
        onSurveySelectRef.current?.(null);
      }
      
      // Clear mapping coverage and last uploaded survey if they were for the deleted survey
      if (lastUploadedSurvey?.id === surveyId) {
        setLastUploadedSurvey(null);
        setMappingCoverage(null);
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

      setDeleteProgress({
        isDeleting: true,
        progress: 100,
        totalFiles: 1,
        currentFileIndex: 0
      });

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
      
      console.log(`✅ Survey deleted successfully: ${deleteResult.deletedDataRows} data rows, ${deleteResult.deletedMappings} mappings removed`);
      
      onSurveyDeleteRef.current?.(surveyId);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete survey';
      console.error(`❌ Survey deletion failed:`, errorMessage);
      setError(errorMessage);
      
      // Show user-friendly error message
      setError(`Failed to delete survey: ${errorMessage}. Please try again or refresh the page.`);
    } finally {
      // Always clear delete state, even on error
      setIsDeleting(false);
      setDeleteProgress({
        isDeleting: false,
        progress: 0,
        totalFiles: 0,
        currentFileIndex: 0
      });
      
      // Clear any upload-related state that might be stuck
      setMappingCoverage(null);
      if (lastUploadedSurvey?.id === surveyId) {
        setLastUploadedSurvey(null);
      }
    }
  }, [selectedSurvey, dataService, onSurveySelect, onSurveyDelete]);

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

  // Validate files when they change or sheet selection changes
  useEffect(() => {
    const validateFiles = async () => {
      for (const file of files) {
        if (!file.id) continue;
        
        try {
          const selectedSheet = selectedSheets.get(file.id);
          const parseResult = await parseFile(file, selectedSheet);
          
          // Run validation
          const validationResult = validateAll(parseResult.headers, parseResult.rows);
          
          setValidationResults(prev => {
            const newMap = new Map(prev);
            newMap.set(file.id!, validationResult);
            return newMap;
          });
        } catch (error) {
          console.error(`Error validating file ${file.name}:`, error);
          // Set invalid validation result
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

    if (files.length > 0) {
      validateFiles();
    } else {
      setValidationResults(new Map());
    }
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
