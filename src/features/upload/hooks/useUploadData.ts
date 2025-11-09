/**
 * Custom hook for managing upload data
 * This hook handles file uploads, survey management, and state management
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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
    onSurveyDelete
  } = options;

  // State declarations
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploadedSurveys, setUploadedSurveys] = useState<UploadedSurvey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);
  
  // Form state
  const [formState, setFormState] = useState<UploadFormState>({
    surveyType: '',
    customSurveyType: '',
    surveyYear: '',
    providerType: '',
    isCustom: false
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
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    
    // Note: validateFileUpload is async, so we'll do basic validation here
    // and full validation will happen during upload
    files.forEach(file => {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        allErrors.push(`${file.name} is not a CSV file`);
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

  // File management actions
  const addFiles = useCallback((newFiles: File[]) => {
    const filesWithPreview = newFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file),
      id: `${file.name}-${file.size}-${Date.now()}`
    }));
    
    setFiles(prev => [...prev, ...filesWithPreview]);
  }, []);

  const removeFile = useCallback((file: FileWithPreview) => {
    setFiles(prev => prev.filter(f => f.id !== file.id));
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }
  }, []);

  const clearFiles = useCallback(() => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
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

  // Data loading
  const loadSurveys = useCallback(async () => {
    try {
      console.log('📥 useUploadData: Loading surveys from IndexedDB...');
      setIsLoading(true);
      setError(null);
      
      const surveys = await dataService.getAllSurveys();
      console.log('📊 useUploadData: Loaded surveys from IndexedDB:', {
        surveyCount: surveys.length,
        surveys: surveys.map(s => ({
          id: s.id,
          name: s.name,
          type: s.type,
          year: s.year,
          rowCount: s.rowCount,
          specialtyCount: s.specialtyCount
        }))
      });
      
      const processedSurveys = surveys.map((survey: any) => ({
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
        // NEW: Include full survey object for new display formatting
        providerType: survey.providerType,
        source: (survey as any).source,
        dataCategory: (survey as any).dataCategory,
        customDataCategory: (survey as any).customDataCategory,
        customProviderType: (survey as any).customProviderType
      }));

      console.log('✅ useUploadData: Processed surveys:', {
        processedCount: processedSurveys.length,
        processedSurveys: processedSurveys.map(s => ({
          id: s.id,
          fileName: s.fileName,
          surveyType: s.surveyType,
          surveyYear: s.surveyYear,
          stats: s.stats
        }))
      });

      setUploadedSurveys(processedSurveys);
      
      // Auto-select first survey if none selected
      if (!selectedSurvey && processedSurveys.length > 0) {
        setSelectedSurvey(processedSurveys[0].id);
        onSurveySelect?.(processedSurveys[0].id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load surveys';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [dataService, selectedSurvey, onSurveySelect]);

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
          // Parse file content with encoding detection and normalization
          const { text: fileContent, encoding, issues, normalized } = await readCSVFile(file);
          
          if (issues.length > 0) {
            console.warn('📤 useUploadData: Encoding issues detected:', issues);
          }
          if (normalized) {
            console.log('📤 useUploadData: Character normalization applied');
          }
          
          const stats = calculateSurveyStats(fileContent);
          
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

          const uploadedSurvey = await dataService.uploadSurvey(
            file,
            file.name,
            surveyYear,
            surveyType,
            providerType
          );

          console.log('✅ useUploadData: Survey upload completed:', {
            surveyId: uploadedSurvey.surveyId,
            rowCount: uploadedSurvey.rowCount
          });
          
          // Verify upload
          setUploadState(prev => ({
            ...prev,
            progress: { ...prev.progress, step: 'verifying', message: `Verifying ${file.name}...` }
          }));
          
          const verification = await validateUploadTransaction(
            uploadedSurvey.surveyId,
            stats.totalRows,
            (id) => getDatabaseService().getSurveyById(id),
            (id) => dataService.getSurveyData(id)
          );
          
          if (!verification.isValid) {
            throw new Error(`Verification failed: ${verification.errors.join(', ')}`);
          }
          
          const processedSurvey: UploadedSurvey = {
            id: uploadedSurvey.surveyId,
            fileName: file.name,
            surveyType: surveyType as SurveySource,
            surveyYear: formState.surveyYear,
            uploadDate: new Date(),
            fileContent,
            rows: [],
            stats,
            columnMappings: {}
          };
          
          uploadedSurveys.push(processedSurvey);
          
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

      // Update state
      setUploadedSurveys(prev => [...prev, ...uploadedSurveys]);
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
      
      // Call callback
      onUploadComplete?.(uploadedSurveys);
      
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
        queryClient.queryClient.invalidateQueries({ queryKey: ['surveys'] });
        console.log('✅ Invalidated benchmarking queries and survey list queries after survey upload');
      } catch (error) {
        console.warn('Failed to invalidate query cache:', error);
      }
      
    } finally {
      setIsUploading(false);
    }
  }, [files, formState, dataService, onUploadComplete, clearFiles, isDatabaseReady, getDatabaseService, uploadState.maxRetries]);

  // Enhanced survey deletion with verification
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
        progress: 75,
        totalFiles: 1,
        currentFileIndex: 0
      });

      // Update local state
      setUploadedSurveys(prev => prev.filter(survey => survey.id !== surveyId));
      
      // Clear selection if deleted survey was selected
      if (selectedSurvey === surveyId) {
        setSelectedSurvey(null);
        onSurveySelect?.(null);
      }

      setDeleteProgress({
        isDeleting: true,
        progress: 100,
        totalFiles: 1,
        currentFileIndex: 0
      });

      // Verify deletion was successful
      const verification = await dataService.getSurveyById?.(surveyId);
      if (verification) {
        console.warn('⚠️ Survey still exists after deletion - this may indicate a problem');
      }

      // Invalidate analytics cache since data was removed
      const analyticsService = new AnalyticsDataService();
      analyticsService.invalidateCache();
      
      // Invalidate TanStack Query cache for benchmarking queries
      try {
        const { queryClient } = require('../../../shared/services/queryClient');
        const { invalidateBenchmarkingQueries } = require('../../../features/analytics/hooks/useBenchmarkingQuery');
        invalidateBenchmarkingQueries(queryClient.queryClient);
        // Also invalidate survey list queries (for SurveyUpload/DataPreview screens)
        queryClient.queryClient.invalidateQueries({ queryKey: ['surveys'] });
        // Invalidate all survey data queries for this survey
        queryClient.queryClient.invalidateQueries({ queryKey: ['surveyData', surveyId] });
        console.log('✅ Invalidated benchmarking queries and survey list queries after survey deletion');
      } catch (error) {
        console.warn('Failed to invalidate query cache:', error);
      }
      
      console.log(`✅ Survey deleted successfully: ${deleteResult.deletedDataRows} data rows removed`);
      
      onSurveyDelete?.(surveyId);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete survey';
      console.error(`❌ Survey deletion failed:`, errorMessage);
      setError(errorMessage);
      
      // Show user-friendly error message
      setError(`Failed to delete survey: ${errorMessage}. Please try again or refresh the page.`);
    } finally {
      setIsDeleting(false);
      setDeleteProgress({
        isDeleting: false,
        progress: 0,
        totalFiles: 0,
        currentFileIndex: 0
      });
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

  // Effects
  useEffect(() => {
    if (autoLoad) {
      loadSurveys();
    }
  }, [autoLoad, loadSurveys]);

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
    
    // Actions
    uploadFiles,
    deleteSurvey,
    loadSurveys,
    refreshData,
    
    // Loading states
    isLoading,
    isUploading,
    isDeleting,
    error,
    clearError,
    
    // Database state
    isDatabaseReady
  };
};
