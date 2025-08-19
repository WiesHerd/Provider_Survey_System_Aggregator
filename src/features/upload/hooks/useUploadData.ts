/**
 * Custom hook for managing upload data
 * This hook handles file uploads, survey management, and state management
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getDataService } from '../../../services/DataService';
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
import { SurveySource } from '../../../shared/types';
import { 
  calculateSurveyStats,
  extractUniqueValues,
  filterSurveys,
  validateFileUpload,
  validateSurveyForm,
  calculateUploadSummary,
  sortSurveysByDate,
  formatSurveyMetadata,
  generateSurveyPreview
} from '../utils/uploadCalculations';

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

  // Data service
  const dataService = useMemo(() => getDataService(), []);

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
      formState.isCustom
    );
  }, [formState]);

  const fileValidation = useMemo(() => {
    if (files.length === 0) {
      return { isValid: true, errors: [], warnings: [] };
    }
    
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    
    files.forEach(file => {
      const validation = validateFileUpload(file, files);
      allErrors.push(...validation.errors);
      allWarnings.push(...validation.warnings);
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
      setIsLoading(true);
      setError(null);
      
              const surveys = await dataService.getAllSurveys();
      
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
        columnMappings: {}
      }));

      setUploadedSurveys(processedSurveys);
      
      // Auto-select first survey if none selected
      if (!selectedSurvey && processedSurveys.length > 0) {
        setSelectedSurvey(processedSurveys[0].id);
        onSurveySelect?.(processedSurveys[0].id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load surveys';
      setError(errorMessage);
      console.error('Error loading surveys:', err);
    } finally {
      setIsLoading(false);
    }
  }, [backendService, selectedSurvey, onSurveySelect]);

  // File upload
  const uploadFiles = useCallback(async () => {
    if (files.length === 0) return;
    
    try {
      setIsUploading(true);
      setUploadProgress({
        isUploading: true,
        progress: 0,
        totalFiles: files.length,
        currentFileIndex: 0
      });
      setError(null);

      const uploadedSurveys: UploadedSurvey[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        setUploadProgress(prev => ({
          ...prev,
          currentFile: file.name,
          currentFileIndex: i,
          progress: ((i + 1) / files.length) * 100
        }));

        // Read file content
        const fileContent = await file.text();
        const stats = calculateSurveyStats(fileContent);
        
        // Upload to backend
        const surveyType = formState.isCustom ? formState.customSurveyType : formState.surveyType;
        const surveyYear = parseInt(formState.surveyYear);
        
        const uploadedSurvey = await dataService.uploadSurvey(
          file,
          file.name,
          surveyYear,
          surveyType
        );
        
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
      }

      // Update state
      setUploadedSurveys(prev => [...prev, ...uploadedSurveys]);
      clearFiles();
      
      // Call callback
      onUploadComplete?.(uploadedSurveys);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload files';
      setError(errorMessage);
      console.error('Error uploading files:', err);
    } finally {
      setIsUploading(false);
      setUploadProgress({
        isUploading: false,
        progress: 0,
        totalFiles: 0,
        currentFileIndex: 0
      });
    }
  }, [files, formState, backendService, onUploadComplete, clearFiles]);

  // Survey deletion
  const deleteSurvey = useCallback(async (surveyId: string) => {
    try {
      setIsDeleting(true);
      setDeleteProgress({
        isDeleting: true,
        progress: 50,
        totalFiles: 1,
        currentFileIndex: 0
      });
      setError(null);

              await dataService.deleteSurvey(surveyId);
      
      setUploadedSurveys(prev => prev.filter(survey => survey.id !== surveyId));
      
      // Clear selection if deleted survey was selected
      if (selectedSurvey === surveyId) {
        setSelectedSurvey(null);
        onSurveySelect?.(null);
      }
      
      onSurveyDelete?.(surveyId);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete survey';
      setError(errorMessage);
      console.error('Error deleting survey:', err);
    } finally {
      setIsDeleting(false);
      setDeleteProgress({
        isDeleting: false,
        progress: 0,
        totalFiles: 0,
        currentFileIndex: 0
      });
    }
  }, [selectedSurvey, backendService, onSurveySelect, onSurveyDelete]);

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
    clearError
  };
};
