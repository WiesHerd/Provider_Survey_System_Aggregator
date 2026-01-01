import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useLocation } from 'react-router-dom';
import { CloudArrowUpIcon, XMarkIcon, ChevronDownIcon, ChevronRightIcon, ArrowUpTrayIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { FormControl, Select, MenuItem, Autocomplete, TextField, Box, Typography, LinearProgress } from '@mui/material';
import DataPreview from './DataPreview';
import { getDataService } from '../services/DataService';
import { ISurveyRow } from '../types/survey';
import { EnterpriseLoadingSpinner } from '../shared/components/EnterpriseLoadingSpinner';
import { useSmoothProgress } from '../shared/hooks/useSmoothProgress';
import { useYear } from '../contexts/YearContext';
import { useProviderContext } from '../contexts/ProviderContext';
import { useSurveyListQuery } from '../features/upload/hooks/useSurveyListQuery';
import { providerTypeDetectionService } from '../services/ProviderTypeDetectionService';
import { getPerformanceOptimizedDataService } from '../services/PerformanceOptimizedDataService';
import { validateColumns } from '../features/upload/utils/uploadCalculations';
import { clearStorage } from '../utils/clearStorage';
import { parseCSVLine } from '../shared/utils/csvParser';
import { readCSVFile } from '../shared/utils';
import { validateFileStructure, validateHeaders, ValidationError } from '../features/upload/utils/preUploadValidation';
import { detectFormat, getExpectedFormat } from '../features/upload/utils/formatDetection';
import { validateDataTypes, validateBusinessRules } from '../features/upload/utils/dataValidation';
import { ProviderType, DataCategory } from '../types/provider';
import { EmptyState } from '../features/mapping/components/shared/EmptyState';
import { getShortenedSurveyType as getShortenedSurveyTypeShared } from '../shared/utils/surveyFormatters';
import { BoltIcon } from '@heroicons/react/24/outline';
import { ColumnMappingDialog } from '../features/upload/components/ColumnMappingDialog';
import { downloadGeneratedSample } from '../utils/generateSampleFile';
import { ValidationBanner } from '../features/upload/components/ValidationBanner';
import { SheetSelector } from '../features/upload/components/SheetSelector';
import { ValidationPreviewTable } from '../features/upload/components/ValidationPreviewTable';
import { parseFile } from '../features/upload/utils/fileParser';
import { validateAll, CompleteValidationResult } from '../features/upload/utils/validationEngine';
import { getExcelSheetNames } from '../features/upload/utils/excelParser';
import { isExcelFile } from '../features/upload/utils/fileParser';


// Provider type categories for survey selection
const SURVEY_OPTIONS = {
  PHYSICIAN: {
    label: 'Physician Surveys',
    options: ['SullivanCotter Physician', 'MGMA Physician', 'Gallagher Physician', 'ECG Physician', 'AMGA Physician']
  },
  APP: {
    label: 'Advanced Practice Provider Surveys', 
    options: ['SullivanCotter APP', 'MGMA APP', 'Gallagher APP', 'ECG APP', 'AMGA APP']
  },
  CALL: {
    label: 'Call Pay Surveys',
    options: ['SullivanCotter Call Pay', 'MGMA Call Pay', 'Gallagher Call Pay', 'ECG Call Pay', 'AMGA Call Pay']
  }
};

// Function to shorten survey type display text based on provider type (for compact displays)
// Wrapper around shared formatter to maintain backward compatibility
const getShortenedSurveyType = (surveyType: string, providerType: ProviderType, survey?: any): string => {
  // If full survey object is available, use new display logic
  if (survey) {
    return getShortenedSurveyTypeShared(survey);
  }
  
  // BACKWARD COMPATIBILITY: Old logic for surveys without new structure
  if (surveyType === 'CUSTOM') {
    return 'Custom';
  }
  
  if (surveyType.toLowerCase().includes('custom')) {
    return surveyType.substring(0, 3).toUpperCase();
  }
  
  let shortenedType = surveyType;
  
  if (providerType === 'CALL') {
    if (surveyType.includes('Physician')) {
      shortenedType = surveyType.replace('Physician', 'Call Pay');
    } else if (!surveyType.includes('Call Pay')) {
      shortenedType = `${surveyType} Call Pay`;
    }
  } else if (providerType === 'PHYSICIAN') {
    shortenedType = surveyType.replace('Physician', '').replace('Call Pay', 'Physician').trim();
    if (!shortenedType.toLowerCase().includes('physician')) {
      shortenedType = shortenedType ? `${shortenedType} Physician` : 'Physician';
    }
  } else if (providerType === 'APP') {
    shortenedType = surveyType.replace('APP', ' - APP');
  }
  
  return shortenedType;
};

// Function to validate provider type match between form selection and data
const validateProviderTypeMatch = (formProviderType: string, dataProviderTypes: string[]): {
  isValid: boolean;
  warning?: string;
} => {
  const formIsPhysician = formProviderType === 'PHYSICIAN';
  const formIsApp = formProviderType === 'APP';
  
  const dataHasPhysician = dataProviderTypes.some(t => 
    t.toLowerCase().includes('physician') || 
    t.toLowerCase().includes('md') || 
    t.toLowerCase().includes('do')
  );
  const dataHasApp = dataProviderTypes.some(t =>
    t.toLowerCase().includes('np') || 
    t.toLowerCase().includes('pa') || 
    t.toLowerCase().includes('crna') ||
    t.toLowerCase().includes('nurse practitioner') ||
    t.toLowerCase().includes('physician assistant')
  );
  
  if (formIsPhysician && dataHasApp && !dataHasPhysician) {
    return {
      isValid: false,
      warning: 'Data appears to contain APP provider types, but you selected PHYSICIAN. Please verify your selection.'
    };
  }
  
  if (formIsApp && dataHasPhysician && !dataHasApp) {
    return {
      isValid: false,
      warning: 'Data appears to contain PHYSICIAN provider types, but you selected APP. Please verify your selection.'
    };
  }
  
  return { isValid: true };
};

// Provider type enum - using imported type from types/provider

interface FileWithPreview extends File {
  preview?: string;
  id?: string;
  surveyType?: string;
  surveyYear?: string;
  uploadDate?: Date;
}



interface UploadedSurveyMetadata {
  id: string;
  fileName: string;
  surveyType: string;
  providerType: ProviderType | string; // Allow custom provider types as strings
  surveyYear: string;
  uploadDate: Date;
  stats: {
    totalRows: number;
    uniqueSpecialties: number;
    totalDataPoints: number;
  }
}

interface UploadedSurvey extends UploadedSurveyMetadata {
  fileContent: string;
  rows: ISurveyRow[];
}

// Normalization Note:
// -------------------
// Many survey CSVs use snake_case headers (e.g., provider_type, geographic_region),
// but the application expects camelCase (providerType, geographicRegion) for internal logic and dropdowns.
// To ensure robust mapping regardless of CSV header style, we normalize both required column names and CSV headers to camelCase before mapping.
// This prevents dropdowns (like Provider Type and Region) from being empty due to mismatched field names.
// If you add new required columns, ensure they are included in the normalization logic.
// See mapping logic in handleSurveyUpload for details.

const SurveyUpload: React.FC = () => {
  const dataService = getDataService();
  const { currentYear } = useYear();
  const location = useLocation();
  const hasLoadedOnThisMount = useRef(false);

  // Use smooth progress for dynamic loading
  const { progress, startProgress, completeProgress } = useSmoothProgress({
    duration: 3000,
    maxProgress: 90,
    intervalMs: 100
  });
  const { selectedProviderType, refreshProviderTypeDetection } = useProviderContext();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploadedSurveys, setUploadedSurveys] = useState<UploadedSurvey[]>([]);
  // NEW: Data Category state (first dropdown)
  const [dataCategory, setDataCategory] = useState<'COMPENSATION' | 'CALL_PAY' | 'MOONLIGHTING' | 'CUSTOM'>('COMPENSATION');
  const [customDataCategory, setCustomDataCategory] = useState('');
  const [providerType, setProviderType] = useState<ProviderType>('PHYSICIAN');
  const [customProviderType, setCustomProviderType] = useState('');
  // CHANGED: Survey Source now just company names
  const [surveySource, setSurveySource] = useState('');
  const [customSurveySource, setCustomSurveySource] = useState('');
  const [customSurveyName, setCustomSurveyName] = useState('');
  const [surveyYear, setSurveyYear] = useState(currentYear);
  const [surveyLabel, setSurveyLabel] = useState(''); // Optional label to differentiate surveys (e.g., "Pediatrics", "Adult Medicine")
  
  // Update survey year when currentYear changes
  useEffect(() => {
    setSurveyYear(currentYear);
  }, [currentYear]);
  const [isCustom, setIsCustom] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);
  const [gridApi, setGridApi] = useState<any>(null);
  
  // Reset grid API when survey changes to ensure fresh connection
  useEffect(() => {
    setGridApi(null);
  }, [selectedSurvey]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Confirmation dialog states
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showClearAllConfirmation, setShowClearAllConfirmation] = useState(false);
  const [showForceClose, setShowForceClose] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState<UploadedSurvey | null>(null);
  
  // Add global filter state
  const [globalFilters, setGlobalFilters] = useState({
    specialty: '',
    providerType: '',
    region: '',
    variable: ''
  });

  // Add state for column validation
  const [columnValidation, setColumnValidation] = useState<any>(null);
  
  // Add state for pre-upload validation
  const [preUploadValidation, setPreUploadValidation] = useState<{
    structure: any;
    headers: any;
    formatDetection?: any;
  } | null>(null);
  const [dataValidation, setDataValidation] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Add state for column mapping dialog
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    headers: string[];
    format: 'normalized' | 'wide';
    sampleData: Record<string, any>[];
  } | null>(null);

  // New validation system state
  const [validationResult, setValidationResult] = useState<CompleteValidationResult | null>(null);
  const [excelSheets, setExcelSheets] = useState<Array<{ name: string; rowCount: number; columnCount: number }>>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: any[][] } | null>(null);
  const [cleanedData, setCleanedData] = useState<{ headers: string[]; rows: any[][] } | null>(null);

  // Add state for collapsible sections
  const [isUploadSectionCollapsed, setIsUploadSectionCollapsed] = useState(false);
  const [isUploadedSurveysCollapsed, setIsUploadedSurveysCollapsed] = useState(false);
  
  

  // NEW: Simplified survey sources - just company names
  // Available sources based on data category (some sources may only support certain categories)
  const availableSurveySources = useMemo(() => {
    // All standard sources are available for all data categories
    const standardSources = ['MGMA', 'SullivanCotter', 'Gallagher', 'ECG', 'AMGA', 'Custom'];
    return standardSources;
  }, [dataCategory]); // Could filter by category in future if needed

  // Update surveyYear when currentYear changes
  useEffect(() => {
    setSurveyYear(currentYear);
  }, [currentYear]);

  // Reset survey source when data category or provider type changes
  useEffect(() => {
    setSurveySource('');
    setCustomSurveySource('');
    setIsCustom(false);
  }, [dataCategory, providerType]);









  // Handle global filter changes
  const handleFilterChange = (filterName: string, value: string) => {
    setGlobalFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // ENTERPRISE FIX: Use React Query for intelligent caching
  // This provides instant navigation (cached data) and background refresh, just like Google apps
  // No forced reload on navigation - React Query handles caching intelligently
  const { 
    data: rawSurveys, 
    loading: queryLoading, 
    error: queryError,
    refetch: refetchSurveys 
  } = useSurveyListQuery(
    currentYear, 
    selectedProviderType === 'BOTH' ? undefined : selectedProviderType,
    !isUploading // Only fetch if not currently uploading
  );

  // Process React Query data into component format
  useEffect(() => {
    // Skip processing if we just uploaded (let cache invalidation handle it)
    if (justUploaded) {
      setJustUploaded(false);
      return;
    }

    if (!rawSurveys || rawSurveys.length === 0) {
      setUploadedSurveys([]);
      if (!selectedSurvey) {
        setSelectedSurvey('');
      }
      return;
    }

    // Build lightweight survey list; fetch detailed rows only when a survey is selected
    // Remove duplicates by using a Map with a unique key
    const surveyMap = new Map();
    
    rawSurveys.forEach((survey: any) => {
      // Create a unique key based on name, type, and year to identify duplicates
      const uniqueKey = `${survey.name || ''}-${survey.type || ''}-${survey.year || ''}`;
      
      if (!surveyMap.has(uniqueKey)) {
        surveyMap.set(uniqueKey, {
          id: survey.id,
          fileName: survey.name || '',
          surveyType: survey.type || '',
          surveyYear: survey.year?.toString() || currentYear,
          uploadDate: new Date(survey.uploadDate || new Date()),
          fileContent: '',
          rows: [],
          stats: {
            totalRows: survey.rowCount ?? survey.row_count ?? 0,
            uniqueSpecialties: survey.specialtyCount ?? survey.specialty_count ?? 0,
            totalDataPoints: survey.dataPoints ?? survey.data_points ?? 0
          },
          columnMappings: {}
        });
      }
    });
    
    const processedSurveys = Array.from(surveyMap.values());

    setUploadedSurveys(processedSurveys);
    // Auto-select first survey if none selected, or if current selection is no longer available
    if (processedSurveys.length > 0) {
      const currentSelectionExists = processedSurveys.some(s => s.id === selectedSurvey);
      if (!selectedSurvey || !currentSelectionExists) {
        setSelectedSurvey(processedSurveys[0].id);
      }
    } else {
      // No surveys available, clear selection
      setSelectedSurvey('');
    }
  }, [rawSurveys, currentYear, selectedSurvey, justUploaded]);

  // Update loading state from React Query
  useEffect(() => {
    // Only show loading if query is actually fetching AND we don't have cached data
    setIsLoading(queryLoading && !rawSurveys?.length);
  }, [queryLoading, rawSurveys]);

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      handleError(`Error loading surveys: ${queryError}`);
    }
  }, [queryError]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    const newFiles = [Object.assign(file, {
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substring(7)
    })];
    
    setFiles(newFiles);
    setError('');
    setColumnValidation(null);
    setPreUploadValidation(null);
    setDataValidation(null);
    setValidationResult(null);
    setExcelSheets([]);
    setSelectedSheet('');
    setIsValidating(true);
    
    try {
      // Load Excel sheet info if Excel file
      if (isExcelFile(file)) {
        try {
          const sheets = await getExcelSheetNames(file);
          setExcelSheets(sheets);
          if (sheets.length > 0) {
            setSelectedSheet(sheets[0].name);
          }
        } catch (error) {
          console.error('Error loading Excel sheets:', error);
        }
      }

      // Step 1: Pre-upload validation (< 500ms)
      const structureValidation = await validateFileStructure(file);
      
      // Step 2: Parse file using unified parser
      // For Excel files, use the first sheet if no sheet is selected yet
      const selectedSheetName = isExcelFile(file) 
        ? (selectedSheet || excelSheets[0]?.name || undefined)
        : undefined;
      const parseResult = await parseFile(file, selectedSheetName);
      
      // Store parsed data so ValidationBanner can display errors
      setParsedData({
        headers: parseResult.headers,
        rows: parseResult.rows
      });
      
      // Step 3: Run new three-tier validation
      const newValidationResult = validateAll(parseResult.headers, parseResult.rows);
      setValidationResult(newValidationResult);
      
      // Step 4: Header validation (< 1s) - keep for backward compatibility
      const headerValidation = await validateHeaders(file);
      
      // Step 5: Format detection
      let formatDetection;
      if (headerValidation.headers.length > 0) {
        formatDetection = detectFormat(headerValidation.headers);
      }
      
      setPreUploadValidation({
        structure: structureValidation,
        headers: headerValidation,
        formatDetection
      });
      
      // Step 6: Full column validation - keep for backward compatibility
      if (headerValidation.headers.length > 0) {
        const fullValidation = validateColumns(headerValidation.headers);
        setColumnValidation(fullValidation);
        
        // Step 7: If file is valid so far, do data validation (async)
        if (fullValidation.isValid && !structureValidation.errors.some((e: ValidationError) => e.severity === 'critical')) {
          // Use parsed data for validation
          const dataRows = parseResult.rows.map(row => {
            const rowData: any = {};
            parseResult.headers.forEach((header: string, index: number) => {
              rowData[header] = row[index] || '';
            });
            return rowData;
          });
          
          // Validate data types
          const dataTypeValidation = validateDataTypes(parseResult.headers, dataRows.slice(0, 100), formatDetection?.format);
          
          // Validate business rules
          const businessRuleValidation = validateBusinessRules(
            dataRows.slice(0, 100),
            parseResult.headers,
            providerType,
            dataCategory,
            surveySource === 'Custom' ? customSurveySource : surveySource
          );
          
          setDataValidation({
            dataTypes: dataTypeValidation,
            businessRules: businessRuleValidation
          });
        }
      }
    } catch (error) {
      console.error('Validation error:', error);
      setError(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsValidating(false);
    }
  }, [providerType, dataCategory, surveySource, customSurveySource]);

  // Re-validate when sheet selection changes for Excel files
  useEffect(() => {
    if (files.length > 0 && isExcelFile(files[0]) && selectedSheet && excelSheets.length > 0) {
      const file = files[0];
      const validateFile = async () => {
        try {
          setIsValidating(true);
          const parseResult = await parseFile(file, selectedSheet);
          
          // Store parsed data
          setParsedData({
            headers: parseResult.headers,
            rows: parseResult.rows
          });
          
          const newValidationResult = validateAll(parseResult.headers, parseResult.rows);
          setValidationResult(newValidationResult);
        } catch (error) {
          console.error('Error re-validating file:', error);
        } finally {
          setIsValidating(false);
        }
      };
      validateFile();
    }
  }, [selectedSheet]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false,
    maxFiles: 1
  });

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return [];  // Clear all files since we only handle one at a time
    });
    setSelectedSurvey(null);
    setParsedData(null);
    setCleanedData(null);
    setValidationResult(null);
    setColumnValidation(null);
    setPreUploadValidation(null);
    setDataValidation(null);
  };

  // NEW: Handle data category change
  const handleDataCategoryChange = (e: any) => {
    const newDataCategory = e.target.value as 'COMPENSATION' | 'CALL_PAY' | 'MOONLIGHTING' | 'CUSTOM';
    setDataCategory(newDataCategory);
    setCustomDataCategory(''); // Reset custom data category
    setSurveySource(''); // Reset survey source
    setCustomSurveySource(''); // Reset custom survey source
    setFiles([]); // Clear any selected file
  };

  const handleProviderTypeChange = (e: any) => {
    const newProviderType = e.target.value as ProviderType;
    setProviderType(newProviderType);
    setCustomProviderType(''); // Reset custom provider type
    setFiles([]); // Clear any selected file
  };

  // CHANGED: Handle survey source change (simplified - just company names)
  const handleSurveySourceChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    const value = e.target.value as string;
    setIsCustom(value === 'Custom');
    setSurveySource(value);
    setCustomSurveySource(''); // Reset custom survey source
    setCustomSurveyName(''); // Reset custom survey name
    setFiles([]); // Clear any selected file when survey source changes
  };

  const removeUploadedSurvey = async (surveyId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    // Find the survey to delete
    const survey = uploadedSurveys.find(s => s.id === surveyId);
    if (!survey) return;
    
    // Show confirmation dialog
    setSurveyToDelete(survey);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteSurvey = async () => {
    if (!surveyToDelete || isDeleting) return; // Prevent multiple clicks
    
    try {
      setIsDeleting(true);
      setIsDeletingAll(false);
      startProgress(); // Start smooth progress animation
      
      console.log(`🗑️ Deleting survey: ${surveyToDelete.id}`);
      
      // ENTERPRISE: Use deleteWithVerification for atomic deletion
      const deleteResult = await dataService.deleteWithVerification(surveyToDelete.id);
      
      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Delete verification failed');
      }
      
      // ENTERPRISE: Verify deletion before proceeding with cache invalidation
      const { verifySurveyDeletion, invalidateAllCachesAfterDelete, notifySurveyDeletion } = require('../shared/utils/deleteHelpers');
      const isDeleted = await verifySurveyDeletion(dataService, surveyToDelete.id);
      
      if (!isDeleted) {
        console.warn('⚠️ Survey deletion verification failed - survey may still exist');
        // Continue anyway, but log the warning
      }
      
      // ENTERPRISE: Use unified cache invalidation helpers
      await invalidateAllCachesAfterDelete(surveyToDelete.id);
      
      // Update local state immediately
      setUploadedSurveys(prev => prev.filter(s => s.id !== surveyToDelete.id));
      
      if (selectedSurvey === surveyToDelete.id) {
        setSelectedSurvey(null);
      }
      
      // Force immediate refetch to update UI (now that all caches are cleared)
      try {
        await refetchSurveys();
        console.log('✅ Refetched survey list after deletion');
      } catch (error) {
        console.warn('Failed to refetch survey list:', error);
      }
      
      // Notify other components of deletion
      notifySurveyDeletion(surveyToDelete.id);
      
      console.log(`✅ Survey deleted successfully: ${deleteResult.deletedDataRows} data rows, ${deleteResult.deletedMappings} mappings removed`);
      
      completeProgress(); // Complete progress animation
      
      // Close modal after a delay to show progress
      setTimeout(() => {
        setShowDeleteConfirmation(false);
        setSurveyToDelete(null);
      }, 1000);
    } catch (error) {
      console.error('❌ Error deleting survey:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      handleError(`Error removing survey: ${errorMessage}`);
      completeProgress(); // Complete progress even on error
      
      // Close modal after a delay even on error
      setTimeout(() => {
        setShowDeleteConfirmation(false);
        setSurveyToDelete(null);
      }, 1000);
    } finally {
      setTimeout(() => {
        setIsDeleting(false);
        setIsDeletingAll(false);
      }, 1200);
    }
  };

  // Get expected columns for mapping dialog
  const getExpectedColumns = (format: 'normalized' | 'wide'): Array<{
    name: string;
    required: boolean;
    displayName: string;
  }> => {
    if (format === 'wide') {
      return [
        { name: 'specialty', required: true, displayName: 'Specialty' },
        { name: 'provider_type', required: true, displayName: 'Provider Type' },
        { name: 'geographic_region', required: true, displayName: 'Geographic Region' },
        { name: 'tcc_p25', required: false, displayName: 'TCC P25' },
        { name: 'tcc_p50', required: false, displayName: 'TCC P50' },
        { name: 'tcc_p75', required: false, displayName: 'TCC P75' },
        { name: 'tcc_p90', required: false, displayName: 'TCC P90' },
        { name: 'wrvu_p25', required: false, displayName: 'wRVU P25' },
        { name: 'wrvu_p50', required: false, displayName: 'wRVU P50' },
        { name: 'wrvu_p75', required: false, displayName: 'wRVU P75' },
        { name: 'wrvu_p90', required: false, displayName: 'wRVU P90' },
        { name: 'cf_p25', required: false, displayName: 'CF P25' },
        { name: 'cf_p50', required: false, displayName: 'CF P50' },
        { name: 'cf_p75', required: false, displayName: 'CF P75' },
        { name: 'cf_p90', required: false, displayName: 'CF P90' }
      ];
    }
    
    // Normalized format
    return [
      { name: 'specialty', required: true, displayName: 'Specialty' },
      { name: 'variable', required: true, displayName: 'Variable / Benchmark' },
      { name: 'n_orgs', required: true, displayName: 'Group Count / n_orgs' },
      { name: 'n_incumbents', required: true, displayName: 'Indv Count / n_incumbents' },
      { name: 'p25', required: true, displayName: '25th% / p25' },
      { name: 'p50', required: true, displayName: '50th% / p50' },
      { name: 'p75', required: true, displayName: '75th% / p75' },
      { name: 'p90', required: true, displayName: '90th% / p90' },
      { name: 'geographic_region', required: false, displayName: 'Geographic Region' },
      { name: 'provider_type', required: false, displayName: 'Provider Type' }
    ];
  };

  // Helper function to check if column mapping is needed
  const checkIfMappingNeeded = (headers: string[], validation: any): boolean => {
    // If validation is invalid, we might need mapping
    if (!validation.isValid && validation.missingColumns.length > 0) {
      // Check if we have unmapped columns that could be mapped
      const detectedLower = headers.map(h => h.toLowerCase().trim());
      
      // Check if we have columns that look like they could match
      const hasVariableLike = detectedLower.some(h => 
        h.includes('benchmark') || h.includes('variable')
      );
      const hasCountLike = detectedLower.some(h => 
        h.includes('group count') || h.includes('indv count') || h.includes('organizations') || h.includes('incumbents')
      );
      const hasPercentileLike = detectedLower.some(h => 
        h.includes('25th') || h.includes('50th') || h.includes('75th') || h.includes('90th') ||
        h.includes('p25') || h.includes('p50') || h.includes('p75') || h.includes('p90')
      );
      
      // If we have similar columns but validation failed, show mapping dialog
      if (hasVariableLike || hasCountLike || hasPercentileLike) {
        return true;
      }
    }
    
    // Check if validation detected ambiguous or unknown headers
    if (validation.ambiguousTargets && Object.keys(validation.ambiguousTargets).length > 0) {
      return true;
    }
    
    if (validation.unknownHeaders && validation.unknownHeaders.length > 0) {
      return true;
    }
    
    return false;
  };

  // Continue upload with column mappings applied
  const continueUploadWithMappings = async (mappings: Record<string, string>) => {
    if (!pendingUpload) return;
    
    const { file } = pendingUpload;
    
    setIsUploading(true);
    startProgress();
    
    // Calculate adaptive timeout based on file size
    const fileSizeMB = file.size / (1024 * 1024);
    const estimatedRows = Math.max(1000, fileSizeMB * 500);
    const baseTimeout = Math.max(5 * 60 * 1000, estimatedRows * 10);
    const adaptiveTimeout = Math.min(baseTimeout, 30 * 60 * 1000);
    
    console.log(`⏱️ Upload timeout set to ${Math.round(adaptiveTimeout / 1000)}s (${Math.round(estimatedRows)} estimated rows)`);
    
    let uploadTimeout: NodeJS.Timeout | null = setTimeout(() => {
      console.error('⏰ Upload timeout - forcing completion');
      setIsUploading(false);
      completeProgress();
      handleError('Upload timed out. Please try again. For large files, this may take several minutes. Please try again or contact support.');
      uploadTimeout = null;
    }, adaptiveTimeout);
    
    // Helper to reset timeout on progress
    const resetTimeout = () => {
      if (uploadTimeout) {
        clearTimeout(uploadTimeout);
        uploadTimeout = setTimeout(() => {
          console.error('⏰ Upload timeout - forcing completion');
          setIsUploading(false);
          completeProgress();
          handleError('Upload timed out. Please try again. For large files, this may take several minutes. Please try again or contact support.');
          uploadTimeout = null;
        }, adaptiveTimeout);
      }
    };

    try {
      // Read the CSV file again
      const text = await file.text();
      const rows = text.split('\n').filter(row => row.trim());
      const originalHeaders = parseCSVLine(rows[0]);
      const dataRows = rows.slice(1).filter(row => row.trim());
      
      // Apply column mappings
      const mappedHeaders = originalHeaders.map(h => mappings[h] || h);
      
      // Re-validate with mapped headers
      const validation = validateColumns(mappedHeaders);
      setColumnValidation(validation);
      
      if (!validation.isValid) {
        setError('File still has missing required columns after mapping. Please check the mapping.');
        setIsUploading(false);
        completeProgress();
        clearTimeout(uploadTimeout);
        return;
      }

      // Parse CSV data with mapped headers
      const parsedRows = dataRows.map(row => {
        const values = parseCSVLine(row);
        const rowData: any = {};
        originalHeaders.forEach((header: string, index: number) => {
          const mappedHeader = mappings[header] || header;
          rowData[mappedHeader] = values[index] || '';
        });
        return rowData;
      });

      // Save mappings as learned mappings for future years
      const finalSource = surveySource === 'Custom' ? customSurveySource : surveySource;
      const finalDataCategory = dataCategory === 'CUSTOM' ? customDataCategory : dataCategory;
      const finalProviderType = providerType === 'CUSTOM' ? customProviderType : providerType;
      const categoryDisplay = finalDataCategory === 'CALL_PAY' ? 'Call Pay'
        : finalDataCategory === 'MOONLIGHTING' ? 'Moonlighting'
        : finalDataCategory === 'COMPENSATION' ? (finalProviderType === 'APP' ? 'APP' : 'Physician')
        : finalDataCategory;
      const surveySourceForMapping = finalSource ? `${finalSource} ${categoryDisplay}` : undefined;
      
      if (surveySourceForMapping) {
        try {
          console.log('💾 Saving column mappings as learned mappings for future years:', {
            surveySource: surveySourceForMapping,
            providerType: finalProviderType,
            mappingsCount: Object.keys(mappings).length
          });
          
          // Save each mapping as a learned mapping
          for (const [originalColumn, standardizedColumn] of Object.entries(mappings)) {
            if (originalColumn !== standardizedColumn) {
              await dataService.saveLearnedMapping(
                'column',
                originalColumn,
                standardizedColumn,
                finalProviderType,
                surveySourceForMapping
              );
              console.log(`✅ Saved learned mapping: ${originalColumn} -> ${standardizedColumn} for ${surveySourceForMapping}`);
            }
          }
          
          console.log('✅ All column mappings saved as learned mappings for cross-year persistence');
        } catch (error) {
          console.error('❌ Error saving learned mappings (non-blocking):', error);
          // Don't block upload if learned mapping save fails
        }
      }

      // Continue with normal upload flow...
      await processUploadedData(parsedRows, file, mappedHeaders, resetTimeout);
      
      clearTimeout(uploadTimeout);
      setIsUploading(false);
      completeProgress();
      setPendingUpload(null);
      setShowMappingDialog(false);
      // Clear validation state after successful upload
      setColumnValidation(null);
      setPreUploadValidation(null);
      setDataValidation(null);
    } catch (error: any) {
      clearTimeout(uploadTimeout);
      setIsUploading(false);
      completeProgress();
      handleError(error.message || 'Failed to upload survey with mappings');
      setPendingUpload(null);
      setShowMappingDialog(false);
    }
  };

  // Extract common upload processing logic
  const processUploadedData = async (
    parsedRows: any[],
    file: File,
    headers: string[],
    resetTimeout?: () => void
  ) => {
    // Extract provider types from data for validation
    const uniqueProviderTypes = new Set(
      parsedRows
        .map(row => row.provider_type || row.providerType || row['Provider Type'])
        .filter(Boolean)
    );

    const detectedProviderTypes = Array.from(uniqueProviderTypes);
    console.log('🔍 Detected provider types in data:', detectedProviderTypes);

    // Validate form selection matches data
    const providerTypeValidation = validateProviderTypeMatch(providerType, detectedProviderTypes);
    if (!providerTypeValidation.isValid && providerTypeValidation.warning) {
      console.warn('⚠️ Provider type mismatch:', providerTypeValidation.warning);
    }

    // NEW: Validate required fields
    if (!dataCategory) {
      setError('Please select a Data Category');
      setIsUploading(false);
      return;
    }
    
    if (!surveySource || surveySource === '') {
      setError('Please select a Survey Source');
      setIsUploading(false);
      return;
    }
    
    if (surveySource === 'Custom' && !customSurveySource.trim()) {
      setError('Please enter a custom survey source');
      setIsUploading(false);
      return;
    }
    
    if (dataCategory === 'CUSTOM' && !customDataCategory.trim()) {
      setError('Please enter a custom data category');
      setIsUploading(false);
      return;
    }
    
    // Create survey object with new architecture
    const surveyId = crypto.randomUUID();
    const defaultSurveyName = file.name.replace('.csv', '');
    
    // NEW: Extract source and data category
    const finalSource = surveySource === 'Custom' ? customSurveySource : surveySource;
    const finalDataCategory = dataCategory === 'CUSTOM' ? customDataCategory : dataCategory;
    const finalProviderType = providerType === 'CUSTOM' ? customProviderType : providerType;
    
    // BACKWARD COMPATIBILITY: Derive type field from source + dataCategory + providerType
    const categoryDisplay = finalDataCategory === 'CALL_PAY' ? 'Call Pay'
      : finalDataCategory === 'MOONLIGHTING' ? 'Moonlighting'
      : finalDataCategory === 'COMPENSATION' ? (finalProviderType === 'APP' ? 'APP' : 'Physician')
      : finalDataCategory;
    const surveyTypeName = `${finalSource} ${categoryDisplay}`;
    
    // Generate survey name for display (include label if provided)
    // CRITICAL: Safely handle surveyLabel - ensure it's never undefined
    const safeSurveyLabel = (surveyLabel && typeof surveyLabel === 'string' && surveyLabel.trim()) ? surveyLabel.trim() : '';
    const labelSuffix = safeSurveyLabel ? ` - ${safeSurveyLabel}` : '';
    const surveyName = `${finalSource} ${categoryDisplay} ${surveyYear}${labelSuffix}`;
    
    // Build survey object - CRITICAL: Never include undefined values
    // ENTERPRISE FIX: Ensure year is always stored as string for consistent filtering
    const surveyYearString = String(surveyYear).trim();
    const survey: any = {
      id: surveyId,
      name: surveyName,
      year: surveyYearString, // CRITICAL: Always store as string for consistent filtering
      // NEW FIELDS
      dataCategory: finalDataCategory as 'COMPENSATION' | 'CALL_PAY' | 'MOONLIGHTING' | 'CUSTOM',
      source: finalSource,
      // BACKWARD COMPATIBILITY: Keep type field for existing code
      type: surveyTypeName,
      providerType: finalProviderType,
      uploadDate: new Date(),
      rowCount: parsedRows.length,
      specialtyCount: new Set(parsedRows.map(row => row.specialty || row.Specialty || row['Provider Type']).filter(Boolean)).size,
      dataPoints: parsedRows.length,
      colorAccent: '#6366F1',
      metadata: {
        totalRows: parsedRows.length,
        uniqueSpecialties: new Set(parsedRows.map(row => row.specialty || row.Specialty || row['Provider Type']).filter(Boolean)).size,
        uniqueProviderTypes: new Set(parsedRows.map(row => row.providerType || row['Provider Type']).filter(Boolean)).size,
        uniqueRegions: new Set(parsedRows.map(row => row.region || row.Region || row.geographicRegion).filter(Boolean)).size,
        detectedProviderTypes: detectedProviderTypes,
        columnMappings: {},
        // ENTERPRISE FIX: Store original column order from Excel/CSV file
        originalHeaders: headers.filter(h => h && h.trim())
      }
    };
    
    // CRITICAL DEBUG: Log survey object before saving
    console.log('💾 Survey object to save:', {
      id: survey.id,
      name: survey.name,
      year: survey.year,
      yearType: typeof survey.year,
      providerType: survey.providerType,
      source: survey.source,
      dataCategory: survey.dataCategory
    });
    
    // Only add surveyLabel if it has a value (never add undefined)
    if (safeSurveyLabel) {
      survey.surveyLabel = safeSurveyLabel;
      survey.metadata.surveyLabel = safeSurveyLabel;
    }

    // Add survey to state immediately for visual feedback
    const immediateSurvey = {
      id: surveyId,
      fileName: surveyName,
      surveyType: surveyTypeName,
      providerType: providerType === 'CUSTOM' ? customProviderType : providerType,
      surveyYear,
      uploadDate: new Date(),
      fileContent: '',
      rows: [],
      stats: {
        totalRows: parsedRows.length,
        uniqueSpecialties: survey.specialtyCount,
        totalDataPoints: parsedRows.length
      },
      columnMappings: survey.metadata.columnMappings
    };

    setUploadedSurveys(prev => [...prev, immediateSurvey]);
    setSelectedSurvey(surveyId);
    setRefreshTrigger(prev => prev + 1);

    // Save survey and data to storage (IndexedDB or Firebase)
    const storageMode = dataService.getMode();
    const storageName = storageMode === 'firebase' ? 'Firebase (Cloud)' : 'IndexedDB (Local)';
    
    console.log(`💾 Saving survey to ${storageName}...`);
    await dataService.createSurvey(survey);
    console.log('✅ Survey created successfully');
    
    console.log(`💾 Saving ${parsedRows.length} rows to ${storageName}...`);
    await dataService.saveSurveyData(surveyId, parsedRows, (progress) => {
      // Update progress for user feedback and reset timeout
      if (progress < 100) {
        console.log(`📊 Upload progress: ${progress}%`);
        // Reset timeout on progress to prevent premature timeout during active uploads
        if (resetTimeout) {
          resetTimeout();
        }
      }
    });
    console.log(`✅ All ${parsedRows.length} rows saved successfully to ${storageName}`);

    // Trigger storage event to notify other components (non-blocking)
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'survey-uploaded',
      newValue: surveyId,
      url: window.location.href
    }));
    
    // Also dispatch custom event for immediate same-tab updates
    window.dispatchEvent(new CustomEvent('survey-uploaded', { detail: { surveyId } }));
    
    // Clear validation state after successful upload
    setColumnValidation(null);
    setPreUploadValidation(null);
    setDataValidation(null);
  };

  const handleSurveyUpload = async () => {
    const file = files[0];
    if (!file || !surveySource || !dataCategory || !surveyYear || 
        (providerType === 'CUSTOM' && !customProviderType) ||
        (surveySource === 'Custom' && !customSurveySource.trim()) ||
        (dataCategory === 'CUSTOM' && !customDataCategory.trim())) {
      handleError('Please fill in all required fields');
      return;
    }

    setIsUploading(true);
    startProgress(); // Start progress animation

    // Calculate adaptive timeout based on file size
    // Estimate: ~1 second per 100 rows, minimum 5 minutes, maximum 30 minutes
    const fileSizeMB = file.size / (1024 * 1024);
    const estimatedRows = Math.max(1000, fileSizeMB * 500); // Rough estimate: 500 rows per MB
    const baseTimeout = Math.max(5 * 60 * 1000, estimatedRows * 10); // 10ms per row, min 5 min
    const adaptiveTimeout = Math.min(baseTimeout, 30 * 60 * 1000); // Max 30 minutes
    
    console.log(`⏱️ Upload timeout set to ${Math.round(adaptiveTimeout / 1000)}s (${Math.round(estimatedRows)} estimated rows)`);

    // Add timeout wrapper to prevent infinite hanging
    let uploadTimeout: NodeJS.Timeout | null = setTimeout(() => {
      console.error('⏰ Upload timeout - forcing completion');
      setIsUploading(false);
      completeProgress();
      handleError('Upload timed out. Please try again. For large files, this may take several minutes. Please try again or contact support.');
      uploadTimeout = null;
    }, adaptiveTimeout);
    
    // Helper to reset timeout on progress (keeps timeout from triggering during active uploads)
    const resetTimeout = () => {
      if (uploadTimeout) {
        clearTimeout(uploadTimeout);
        uploadTimeout = setTimeout(() => {
          console.error('⏰ Upload timeout - forcing completion');
          setIsUploading(false);
          completeProgress();
          handleError('Upload timed out. Please try again. For large files, this may take several minutes. Please try again or contact support.');
          uploadTimeout = null;
        }, adaptiveTimeout);
      }
    };

    try {
      // Use cleaned data if available, otherwise parse file
      let headers: string[];
      let dataRows: string[];
      
      if (cleanedData) {
        // Use cleaned data from preview table
        headers = cleanedData.headers;
        // Convert cleaned rows back to CSV format for processing
        dataRows = cleanedData.rows.map(row => {
          // Convert row array back to CSV line
          return row.map(val => {
            const str = String(val || '');
            // Escape commas and quotes
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(',');
        });
        console.log('📤 Using cleaned data from preview table:', {
          rowCount: cleanedData.rows.length,
          headerCount: headers.length
        });
      } else if (parsedData) {
        // Use parsed data (no edits made)
        headers = parsedData.headers;
        dataRows = parsedData.rows.map(row => {
          return row.map(val => {
            const str = String(val || '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(',');
        });
        console.log('📤 Using parsed data');
      } else {
        // Fallback: Read and parse file
        const { text, encoding, issues, normalized } = await readCSVFile(file);
        
        if (issues.length > 0) {
          console.warn('Encoding issues detected during upload:', issues);
        }
        if (normalized) {
          console.log('Character normalization applied to uploaded file');
        }
        
        const rows = text.split('\n').filter(row => row.trim());
        headers = parseCSVLine(rows[0]);
        dataRows = rows.slice(1).filter(row => row.trim());
      }

      // Validate columns before processing (skip if using cleaned data)
      let validation;
      let needsMapping = false;
      
      if (!cleanedData) {
        validation = validateColumns(headers);
        setColumnValidation(validation);
        
        // Check if columns need explicit mapping
        needsMapping = checkIfMappingNeeded(headers, validation);
      } else {
        // For cleaned data, assume validation passed (user already fixed issues)
        validation = { isValid: true, format: 'normalized' } as any;
      }
      
      if (needsMapping) {
        // Show mapping dialog instead of blocking
        clearTimeout(uploadTimeout);
        setIsUploading(false);
        completeProgress();
        
        // Parse sample data for preview
        const sampleData = dataRows.slice(0, 3).map(row => {
          const values = parseCSVLine(row);
          const rowData: any = {};
          headers.forEach((header: string, index: number) => {
            rowData[header] = values[index] || '';
          });
          return rowData;
        });
        
        setPendingUpload({
          file,
          headers,
          format: (validation.format === 'wide_variable' ? 'wide' : validation.format) || 'normalized',
          sampleData
        });
        setShowMappingDialog(true);
        return;
      }
      
      if (!cleanedData && validation && !validation.isValid) {
        setError('File has missing required columns. Please check the validation details below.');
        setIsUploading(false);
        completeProgress(); // Complete progress even on validation error
        return;
      }

      // Progress is handled by useSmoothProgress hook

      // Parse CSV data (or use cleaned data directly)
      let parsedRows: any[];
      
      if (cleanedData) {
        // Use cleaned data directly (already in object format)
        parsedRows = cleanedData.rows.map(row => {
          const rowData: any = {};
          headers.forEach((header: string, index: number) => {
            rowData[header] = row[index] || '';
          });
          return rowData;
        });
      } else {
        // Parse from CSV strings
        parsedRows = dataRows.map(row => {
          const values = parseCSVLine(row);
          const rowData: any = {};
          headers.forEach((header: string, index: number) => {
            rowData[header] = values[index] || '';
          });
          return rowData;
        });
      }

      // Process the uploaded data (pass resetTimeout to prevent premature timeout)
      await processUploadedData(parsedRows, file, headers, resetTimeout);
      
      // Clear provider type detection cache and refresh in background (non-blocking)
      setTimeout(async () => {
        try {
          providerTypeDetectionService.clearCache();
          await refreshProviderTypeDetection();
          console.log('✅ Provider type detection refreshed after upload');
        } catch (error) {
          console.error('Failed to refresh provider type detection:', error);
        }
      }, 1000); // 1 second delay to ensure data is fully persisted

      // State already updated above, just set the flag to prevent useEffect override
      setJustUploaded(true);
      
      // CRITICAL FIX: Clear performance cache BEFORE invalidating React Query cache
      // The performance cache stores survey list data with keys like "all_surveys_2025_PHYSICIAN"
      // If we don't clear it, refetchSurveys() will return stale cached data
      try {
        const { getPerformanceOptimizedDataService } = require('../services/PerformanceOptimizedDataService');
        const performanceService = getPerformanceOptimizedDataService();
        // Clear all survey list cache entries (pattern matches "all_surveys_*")
        performanceService.clearCache('all_surveys');
        console.log('✅ Cleared performance cache for survey list');
      } catch (error) {
        console.warn('Failed to clear performance cache:', error);
      }
      
      // ENTERPRISE FIX: Invalidate React Query cache to trigger automatic refetch
      // This ensures the survey list is updated immediately with the new survey
      try {
        const { queryClient } = require('../shared/services/queryClient');
        
        // CRITICAL FIX: Add delay to ensure database transaction is fully committed
        // Database operations (IndexedDB/Firestore) are asynchronous and may not be immediately visible
        // Firestore has eventual consistency, so a small delay ensures data is queryable
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Invalidate all survey list queries (for all year/providerType combinations)
        queryClient.queryClient.invalidateQueries({ 
          queryKey: ['surveys', 'list'],
          exact: false // Invalidate all queries that start with ['surveys', 'list']
        });
        console.log('✅ Invalidated survey list cache after upload - React Query will refetch automatically');
        
        // ENTERPRISE FIX: Explicitly refetch to ensure immediate update
        // This ensures survey pills appear immediately without page refresh
        await refetchSurveys();
        console.log('✅ Refetched survey list after upload');
        
        // CRITICAL DEBUG: Verify survey was saved by checking database directly
        // Find survey by name and year since surveyId is not in scope here
        console.log('🔍 Verifying survey was saved...');
        const savedSurveys = await dataService.getAllSurveys();
        
        // Build expected survey name to find it
        const finalSource = surveySource === 'Custom' ? customSurveySource : surveySource;
        const finalDataCategory = dataCategory === 'CUSTOM' ? customDataCategory : dataCategory;
        const finalProviderType = providerType === 'CUSTOM' ? customProviderType : providerType;
        const categoryDisplay = finalDataCategory === 'CALL_PAY' ? 'Call Pay'
          : finalDataCategory === 'MOONLIGHTING' ? 'Moonlighting'
          : finalDataCategory === 'COMPENSATION' ? (finalProviderType === 'APP' ? 'APP' : 'Physician')
          : finalDataCategory;
        const safeSurveyLabel = (surveyLabel && typeof surveyLabel === 'string' && surveyLabel.trim()) ? surveyLabel.trim() : '';
        const labelSuffix = safeSurveyLabel ? ` - ${safeSurveyLabel}` : '';
        const expectedSurveyName = `${finalSource} ${categoryDisplay} ${surveyYear}${labelSuffix}`;
        const surveyYearString = String(surveyYear).trim();
        
        const savedSurvey = savedSurveys.find(s => 
          s.name === expectedSurveyName && 
          String(s.year || '').trim() === surveyYearString
        );
        
        if (savedSurvey) {
          console.log('✅ Survey verified in database:', {
            id: savedSurvey.id,
            name: savedSurvey.name,
            year: savedSurvey.year,
            providerType: savedSurvey.providerType,
            source: savedSurvey.source
          });
        } else {
          console.error('❌ Survey NOT found in database after upload!', {
            expectedName: expectedSurveyName,
            expectedYear: surveyYearString,
            totalSurveys: savedSurveys.length,
            allSurveyNames: savedSurveys.map(s => ({ name: s.name, year: s.year }))
          });
        }
      } catch (error) {
        console.warn('Failed to invalidate/refetch query cache:', error);
      }

      // Clear form and validation state
      setFiles([]);
      setColumnValidation(null);
      setPreUploadValidation(null);
      setDataValidation(null);
      setSurveySource('');
      setSurveyYear('');
      setCustomSurveySource('');
      setSurveyLabel(''); // Clear survey label
      setIsCustom(false);

      // Show success message
      completeProgress(); // Complete progress animation
      setTimeout(() => {
        setIsUploading(false);
      }, 1000);

    } catch (error) {
      console.error('❌ Upload error:', error);
      handleError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsUploading(false);
      completeProgress(); // Complete progress animation
    } finally {
      // Clear the timeout
      clearTimeout(uploadTimeout);
    }
  };

  const handleClearAll = () => {
    setShowClearAllConfirmation(true);
  };

  const forceCloseModal = () => {
    console.log('🛑 Force closing clear all modal');
    setShowClearAllConfirmation(false);
    setIsDeleting(false);
    setIsDeletingAll(false);
    setShowForceClose(false);
    completeProgress();
  };



  const confirmClearAll = async () => {
    let forceCloseTimeout: NodeJS.Timeout | null = null;
    
    try {
      setIsDeleting(true);
      setIsDeletingAll(true);
      startProgress(); // Start smooth progress animation
      
      console.log('🧹 Starting clear all operation...');
      
      // Set up force close timeout (30 seconds)
      forceCloseTimeout = setTimeout(() => {
        console.warn('⚠️ Clear all operation taking too long, showing force close option');
        setShowForceClose(true);
      }, 30000);
      
      // Add timeout wrapper for each operation
      const withTimeout = (promise: Promise<any>, timeoutMs: number, operation: string) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
          )
        ]);
      };
      
      // Clear all surveys first with timeout (now includes cache clearing)
      console.log('🗑️ Deleting all surveys...');
      try {
        await withTimeout(dataService.deleteAllSurveys(), 10000, 'Delete all surveys');
        console.log('✅ All surveys deleted successfully');
      } catch (deleteError) {
        console.warn('⚠️ Regular delete failed, trying force clear:', deleteError);
        try {
          await withTimeout(dataService.forceClearDatabase(), 5000, 'Force clear database');
          console.log('✅ Database force cleared successfully');
        } catch (forceError) {
          console.error('❌ Both delete methods failed:', forceError);
          throw new Error(`Failed to clear data: ${forceError instanceof Error ? forceError.message : 'Unknown error'}`);
        }
      }
      
      // Clear localStorage as well
      console.log('🗑️ Clearing localStorage...');
      clearStorage.clearLocalStorage();
      
      setUploadedSurveys([]);
      setSelectedSurvey(null);
      setGridApi(null); // Clear grid API reference
      
      // CRITICAL FIX: Clear performance cache BEFORE invalidating React Query cache
      // The performance cache stores survey list data with keys like "all_surveys_2025_PHYSICIAN"
      // If we don't clear it, refetchSurveys() will return stale cached data
      try {
        const performanceService = getPerformanceOptimizedDataService();
        // Clear all survey list cache entries (pattern matches "all_surveys_*")
        performanceService.clearCache('all_surveys');
        console.log('✅ Cleared performance cache for survey list');
      } catch (error) {
        console.warn('Failed to clear performance cache:', error);
      }
      
      // Invalidate React Query cache to ensure UI refreshes
      try {
        const { queryClient } = require('../shared/services/queryClient');
        // Invalidate all survey list queries (matches queryKeys.surveyList pattern)
        queryClient.queryClient.invalidateQueries({ 
          queryKey: ['surveys', 'list'],
          exact: false // Invalidate all queries that start with ['surveys', 'list']
        });
        // Invalidate all survey data queries
        queryClient.queryClient.invalidateQueries({ 
          queryKey: ['surveyData'],
          exact: false
        });
        console.log('✅ Invalidated React Query cache after clear all');
        
        // Force immediate refetch to update UI
        await refetchSurveys();
        console.log('✅ Refetched survey list after clear all');
      } catch (error) {
        console.warn('Failed to invalidate/refetch query cache:', error);
      }
      
      // Invalidate analytics cache since all data was removed
      try {
        const { AnalyticsDataService } = require('../services/AnalyticsDataService');
        const analyticsService = new AnalyticsDataService();
        analyticsService.invalidateCache();
        console.log('✅ Invalidated analytics cache after clear all');
      } catch (error) {
        console.warn('Failed to invalidate analytics cache:', error);
      }
      
      // Trigger storage event to notify other components
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'survey-deleted',
        newValue: 'all',
        url: window.location.href
      }));
      
      // Also dispatch custom events for immediate refresh
      window.dispatchEvent(new CustomEvent('survey-deleted', { detail: { type: 'all' } }));
      
      console.log('✅ Clear all operation completed successfully!');
      
      // Complete progress and show success message
      completeProgress();
      
      // Reset states immediately
      setIsDeleting(false);
      setIsDeletingAll(false);
      
      // Close modal after showing progress
      setTimeout(() => {
        console.log('🔄 Closing modal and reloading page...');
        setShowClearAllConfirmation(false);
        alert('✅ All data cleared successfully! The page will reload to ensure a clean state.');
        window.location.reload();
      }, 1500);
      
      // Backup timeout to force close modal if something goes wrong
      setTimeout(() => {
        console.log('🛑 Backup timeout: Force closing modal');
        setShowClearAllConfirmation(false);
        setIsDeleting(false);
        setIsDeletingAll(false);
        setShowForceClose(false);
      }, 10000); // 10 seconds backup timeout
      
    } catch (error) {
      console.error('❌ Error during clear all operation:', error);
      handleError(`Error clearing data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      completeProgress(); // Complete progress even on error
      
      // Reset states immediately on error
      setIsDeleting(false);
      setIsDeletingAll(false);
      
      // Close modal after showing progress even on error
      setTimeout(() => {
        console.log('🔄 Closing modal after error...');
        setShowClearAllConfirmation(false);
        setShowForceClose(false);
      }, 1500);
    } finally {
      // Clear the force close timeout
      if (forceCloseTimeout) {
        clearTimeout(forceCloseTimeout);
      }
      
      // Ensure states are reset even if there's an error
      setTimeout(() => {
        setIsDeleting(false);
        setIsDeletingAll(false);
        setShowForceClose(false);
      }, 2000);
    }
  };



  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(''), 5000);
  };

  // Add helper function to calculate survey statistics
  const calculateSurveyStats = (rows: ISurveyRow[] | undefined) => {
    if (!rows || rows.length === 0) {
      return {
        totalRows: 0,
        uniqueSpecialties: 0,
        totalDataPoints: 0
      };
    }
    // Only call toLowerCase on string values
    const uniqueSpecialtiesSet = new Set(
      rows
        .map(r => typeof r.specialty === 'string' ? r.specialty.toLowerCase() : undefined)
        .filter(Boolean)
    );
    return {
      totalRows: rows.length,
      uniqueSpecialties: uniqueSpecialtiesSet.size,
      totalDataPoints: rows.length * Object.keys(rows[0] || {}).length
    };
  };

  return (
    <>
      <div className="w-full min-h-screen">
        <div className="w-full flex flex-col gap-4">
          
          {/* Error Display */}
          {error && (
            <div className="w-full bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    onClick={() => setError('')}
                    className="text-red-400 hover:text-red-600"
                    aria-label="Close error message"
                    title="Dismiss error"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Upload Form Section */}
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6" data-upload-section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsUploadSectionCollapsed(!isUploadSectionCollapsed)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  aria-label={isUploadSectionCollapsed ? "Expand upload section" : "Collapse upload section"}
                >
                  {isUploadSectionCollapsed ? (
                    <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                <h3 className="text-lg font-semibold text-gray-900">Upload New Survey</h3>
              </div>
              {!isUploadSectionCollapsed && (
                <div className="flex items-center gap-3">
                  {/* Upload Button - Matches mapping screen button style (minimal, white/grey) */}
                  {files.length === 0 ? (
                    // File selection button (matches "Select" button style)
                    <div {...getRootProps()} className="relative">
                      <input {...getInputProps()} />
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-500"
                        disabled={isUploading || isValidating}
                      >
                        <CloudArrowUpIcon className="h-4 w-4" />
                        <span>Select File</span>
                      </button>
                    </div>
                  ) : (
                    // Upload button (matches mapping screen style - white with border, or indigo when active)
                    <button
                      type="button"
                      onClick={handleSurveyUpload}
                      disabled={
                        !surveyYear || 
                        isUploading ||
                        isValidating ||
                        // Data category validation
                        !dataCategory ||
                        (dataCategory === 'CUSTOM' && !customDataCategory.trim()) ||
                        // Survey source validation
                        !surveySource ||
                        (surveySource === 'Custom' && !customSurveySource.trim()) ||
                        // Provider type validation  
                        (providerType === 'CUSTOM' && !customProviderType.trim()) ||
                        // Critical validation errors (check both old and new validation)
                        (preUploadValidation?.structure?.errors?.some((e: ValidationError) => e.severity === 'critical') || false) ||
                        (columnValidation && !columnValidation.isValid) ||
                        (validationResult && !validationResult.canProceed)
                      }
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isUploading
                          ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-500'
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 rounded-full animate-spin border-2 border-white border-t-transparent"></div>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpTrayIcon className="h-4 w-4" />
                          <span>Upload</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  {/* Download Template Button - Secondary action (icon-only is fine) */}
                  <div className="relative group">
                    <button
                      onClick={() => {
                        // Validate required fields for sample generation
                        if (!dataCategory || (dataCategory === 'CUSTOM' && !customDataCategory.trim())) {
                          setError('Please select Data Category first');
                          return;
                        }
                        if (!providerType || (providerType === 'CUSTOM' && !customProviderType.trim())) {
                          setError('Please select Provider Type first');
                          return;
                        }
                        try {
                          // Generate sample based on selected Data Category and Provider Type
                          // For Google-style UX: Sample matches the exact structure user selected
                          const sampleProviderType = dataCategory === 'CALL_PAY' ? 'CALL' 
                            : dataCategory === 'MOONLIGHTING' ? 'CALL' // Moonlighting uses similar structure to Call Pay
                            : (providerType === 'CUSTOM' ? undefined : providerType);
                          
                          const surveySourceName = surveySource === 'Custom' && customSurveySource 
                            ? customSurveySource 
                            : surveySource || 'Sample';
                          
                          const dataCategoryDisplay = dataCategory === 'CALL_PAY' ? 'Call Pay' 
                            : dataCategory === 'MOONLIGHTING' ? 'Moonlighting'
                            : dataCategory === 'CUSTOM' ? customDataCategory
                            : 'Compensation';
                          
                          downloadGeneratedSample(sampleProviderType, `${surveySourceName} ${dataCategoryDisplay}`);
                        } catch (error) {
                          console.error('Download failed:', error);
                          setError('Failed to generate sample file. Please try again.');
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full border border-gray-200 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200"
                      aria-label="Download sample CSV template"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </button>
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                      <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                        Download Template
                        <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {!isUploadSectionCollapsed && (
              <>
                <div className="flex flex-wrap gap-4 items-end">
                {/* Survey Year Selection */}
                <div className="flex-1 min-w-[200px]">
                  <label htmlFor="surveyYear" className="block text-sm font-medium text-gray-700 mb-2">
                    Survey Year
                  </label>
                  <Autocomplete
                    value={surveyYear}
                    onChange={(event: any, newValue: any) => {
                      if (newValue) {
                        setSurveyYear(newValue);
                      }
                    }}
                    onInputChange={(event: any, newInputValue: any) => {
                      // Allow typing any year
                      if (newInputValue && /^\d{4}$/.test(newInputValue)) {
                        setSurveyYear(newInputValue);
                      }
                    }}
                    freeSolo
                    options={['2024', '2025', '2026', '2027', '2028', '2029', '2030']}
                    renderInput={(params: any) => (
                      <TextField
                        {...params}
                        size="small"
                        placeholder="Enter year (e.g., 2026)"
                        inputProps={{
                          ...params.inputProps,
                          maxLength: 4,
                          pattern: '[0-9]{4}'
                        }}
                      />
                    )}
                    sx={{
                      backgroundColor: 'white',
                      '& .MuiAutocomplete-inputRoot': {
                        height: '40px',
                        fontSize: '0.875rem',
                        borderRadius: '4px',
                      },
                      '& .MuiAutocomplete-input': {
                        fontSize: '0.875rem',
                        paddingTop: '8px',
                        paddingBottom: '8px',
                      }
                    }}
                  />
                </div>

                {/* NEW: Data Category Selection (first dropdown) */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Category
                  </label>
                  <FormControl fullWidth>
                    <Select
                      value={dataCategory}
                      onChange={handleDataCategoryChange}
                      sx={{
                        backgroundColor: 'white',
                        height: '40px',
                        '& .MuiOutlinedInput-root': {
                          fontSize: '0.875rem',
                          height: '40px',
                          borderRadius: '4px',
                        },
                        '& .MuiSelect-select': {
                          paddingTop: '8px',
                          paddingBottom: '8px',
                          textAlign: 'left',
                        }
                      }}
                    >
                      <MenuItem value="COMPENSATION">Compensation</MenuItem>
                      <MenuItem value="CALL_PAY">Call Pay</MenuItem>
                      <MenuItem value="MOONLIGHTING">Moonlighting</MenuItem>
                      <MenuItem value="CUSTOM">Custom</MenuItem>
                    </Select>
                  </FormControl>
                  {dataCategory === 'CUSTOM' && (
                    <input
                      type="text"
                      value={customDataCategory}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomDataCategory(e.target.value)}
                      placeholder="Enter custom data category"
                      className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                        placeholder-gray-400 text-sm transition-colors duration-200"
                      style={{ borderRadius: '4px' }}
                    />
                  )}
                </div>

                {/* Provider Type Selection */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider Type
                  </label>
                  <FormControl fullWidth>
                    <Select
                      value={providerType}
                      onChange={handleProviderTypeChange}
                      sx={{
                        backgroundColor: 'white',
                        height: '40px',
                        '& .MuiOutlinedInput-root': {
                          fontSize: '0.875rem',
                          height: '40px',
                          borderRadius: '4px',
                        },
                        '& .MuiSelect-select': {
                          paddingTop: '8px',
                          paddingBottom: '8px',
                          textAlign: 'left',
                        }
                      }}
                    >
                      <MenuItem value="PHYSICIAN">Physician</MenuItem>
                      <MenuItem value="APP">Advanced Practice Provider</MenuItem>
                      <MenuItem value="CUSTOM">Custom</MenuItem>
                    </Select>
                  </FormControl>
                  {providerType === 'CUSTOM' && (
                    <input
                      type="text"
                      value={customProviderType}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomProviderType(e.target.value)}
                      placeholder="Enter custom provider type"
                      className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                        placeholder-gray-400 text-sm transition-colors duration-200"
                      style={{ borderRadius: '4px' }}
                    />
                  )}
                </div>

                {/* CHANGED: Survey Source Selection (simplified - just company names) */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Survey Source
                  </label>
                  <FormControl fullWidth>
                    <Select
                      value={surveySource}
                      onChange={handleSurveySourceChange}
                      displayEmpty
                      disabled={false}
                      sx={{
                        backgroundColor: 'white',
                        height: '40px',
                        '& .MuiOutlinedInput-root': {
                          fontSize: '0.875rem',
                          height: '40px',
                          borderRadius: '4px',
                        },
                        '& .MuiSelect-select': {
                          paddingTop: '8px',
                          paddingBottom: '8px',
                          textAlign: 'left',
                        }
                      }}
                    >
                      <MenuItem value="" disabled>
                        Select a survey source
                      </MenuItem>
                      {availableSurveySources.map((source: string) => (
                        <MenuItem key={source} value={source}>
                          {source}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {surveySource === 'Custom' && (
                    <input
                      type="text"
                      value={customSurveySource}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomSurveySource(e.target.value)}
                      placeholder="Enter custom survey source"
                      className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                        placeholder-gray-400 text-sm transition-colors duration-200"
                      style={{ borderRadius: '4px' }}
                    />
                  )}
                </div>

                {/* Optional Survey Label - to differentiate surveys with same source/category/provider/year */}
                <div className="flex-1 min-w-[200px]">
                  <label htmlFor="surveyLabel" className="block text-sm font-medium text-gray-700 mb-2">
                    Survey Label
                  </label>
                  <TextField
                    id="surveyLabel"
                    size="small"
                    fullWidth
                    value={surveyLabel}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSurveyLabel(e.target.value)}
                    placeholder="e.g., Pediatrics, Adult Medicine"
                    sx={{
                      backgroundColor: 'white',
                      '& .MuiOutlinedInput-root': {
                        fontSize: '0.875rem',
                        height: '40px',
                        borderRadius: '4px',
                      }
                    }}
                  />
                </div>
                </div>

                {/* Validation blocking message */}
                {files.length > 0 && 
                 surveyYear && 
                 dataCategory && 
                 surveySource && 
                 !isUploading && 
                 !isValidating &&
                 (validationResult && !validationResult.canProceed || 
                  (preUploadValidation?.structure?.errors?.some((e: ValidationError) => e.severity === 'critical')) ||
                  (columnValidation && !columnValidation.isValid)) && (
                  <div className="text-xs text-red-600 text-center mt-2">
                    Fix validation errors below to upload
                  </div>
                )}

                {/* Upload progress is displayed in a modal overlay below */}
              </>
            )}

              {/* Selected File Preview - Modern Design */}
              {files.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    {/* File Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {files[0].name}
                        </p>
                        {dataCategory && surveySource && surveyYear && (
                          <span className="flex-shrink-0 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {(files[0].size / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </div>
                      {dataCategory && surveySource && surveyYear ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-600">
                            {surveySource === 'Custom' ? customSurveySource : surveySource}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-600">
                            {dataCategory === 'CUSTOM' ? customDataCategory : (dataCategory === 'CALL_PAY' ? 'Call Pay' : dataCategory === 'MOONLIGHTING' ? 'Moonlighting' : 'Compensation')}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-600">{surveyYear}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-600">
                          Complete the form above to continue
                        </p>
                      )}
                    </div>
                    
                    {/* Remove Button */}
                    <button
                      onClick={() => files[0].id && removeFile(files[0].id)}
                      className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Remove file"
                      aria-label="Remove selected file"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Sheet Selector for Excel files */}
                  {isExcelFile(files[0]) && excelSheets.length > 1 && (
                    <div className="mt-3">
                      <SheetSelector
                        sheets={excelSheets}
                        selectedSheet={selectedSheet || excelSheets[0]?.name || ''}
                        onSheetSelect={setSelectedSheet}
                        disabled={isValidating || isUploading}
                      />
                    </div>
                  )}

                  {/* Data Validation Section */}
                  {validationResult && validationResult.totalIssues > 0 && (
                    <div className="mt-6">
                      <div className="mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">Data Validation</h3>
                        <p className="text-sm text-gray-600 mt-0.5">
                          Review and resolve the following issues before uploading
                        </p>
                      </div>
                      <ValidationBanner
                        validationResult={validationResult}
                        headers={parsedData?.headers || []}
                        rows={parsedData?.rows || []}
                        collapsible={true}
                      />
                    </div>
                  )}

                  {/* Validation Preview Table - Only show when there's data AND validation issues */}
                  {parsedData && parsedData.rows.length > 0 && validationResult && validationResult.totalIssues > 0 && (
                    <div className="mt-4">
                      <ValidationPreviewTable
                        headers={parsedData.headers}
                        rows={parsedData.rows}
                        validationResult={validationResult}
                        onDataChange={(cleaned) => {
                          setCleanedData(cleaned);
                          // Re-validate cleaned data
                          const newValidation = validateAll(cleaned.headers, cleaned.rows);
                          setValidationResult(newValidation);
                          // Update parsed data to cleaned data
                          setParsedData(cleaned);
                        }}
                        onValidationChange={(newValidation) => {
                          setValidationResult(newValidation);
                        }}
                        maxPreviewRows={20}
                        disabled={isValidating || isUploading}
                      />
                    </div>
                  )}

                  {/* Validation Progress */}
                  {isValidating && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Validating file...
                      </Typography>
                      <LinearProgress />
                    </Box>
                  )}
                </div>
              )}
          </div>

          {/* Column Mapping Dialog */}
          {pendingUpload && (
            <ColumnMappingDialog
              open={showMappingDialog}
              onClose={() => {
                setShowMappingDialog(false);
                setPendingUpload(null);
              }}
              onConfirm={continueUploadWithMappings}
              detectedColumns={pendingUpload.headers}
              expectedColumns={getExpectedColumns(pendingUpload.format)}
              format={pendingUpload.format}
              sampleData={pendingUpload.sampleData}
              surveyType={surveySource === 'Custom' ? customSurveySource : surveySource}
              surveySource={(() => {
                // Construct survey source from source + dataCategory + providerType
                const finalSource = surveySource === 'Custom' ? customSurveySource : surveySource;
                const finalDataCategory = dataCategory === 'CUSTOM' ? customDataCategory : dataCategory;
                const finalProviderType = providerType === 'CUSTOM' ? customProviderType : providerType;
                const categoryDisplay = finalDataCategory === 'CALL_PAY' ? 'Call Pay'
                  : finalDataCategory === 'MOONLIGHTING' ? 'Moonlighting'
                  : finalDataCategory === 'COMPENSATION' ? (finalProviderType === 'APP' ? 'APP' : 'Physician')
                  : finalDataCategory;
                return finalSource ? `${finalSource} ${categoryDisplay}` : undefined;
              })()}
              providerType={providerType === 'CUSTOM' ? customProviderType : providerType}
            />
          )}
          {/* Uploaded Surveys Section (compact tabs) */}
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-visible">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsUploadedSurveysCollapsed(!isUploadedSurveysCollapsed)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  aria-label={isUploadedSurveysCollapsed ? "Expand uploaded surveys section" : "Collapse uploaded surveys section"}
                >
                  {isUploadedSurveysCollapsed ? (
                    <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                <h2 className="text-lg font-semibold text-gray-900">Uploaded Surveys</h2>
              </div>
              {uploadedSurveys.length > 0 && (
                <div className="relative group">
                  <button
                    onClick={handleClearAll}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full border border-gray-200 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200"
                    aria-label="Clear all surveys"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap shadow-lg">
                      Clear All Surveys
                      <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!isUploadedSurveysCollapsed && (
              <>
                
                {isLoading ? (
                  <EnterpriseLoadingSpinner
                    message="Loading surveys..."
                    recordCount={uploadedSurveys.length}
                    data={uploadedSurveys}
                    progress={progress}
                    variant="overlay"
                    loading={isLoading}
                  />
                ) : uploadedSurveys.length === 0 ? (
                  <EmptyState
                    icon={<BoltIcon className="h-6 w-6 text-gray-500" />}
                    title="No Surveys Uploaded Yet"
                    message="Upload your first survey to get started with data analysis and mapping."
                  />
                ) : (
                  <>
        
                  <div key={`surveys-${refreshTrigger}`} className="relative z-10 flex items-center gap-2 overflow-x-auto overflow-y-visible whitespace-nowrap pb-1">
                    {uploadedSurveys.map((survey) => {
                      const isActive = selectedSurvey === survey.id;
                      const stats = calculateSurveyStats(survey.rows);
                      const accent = survey.surveyType === 'SullivanCotter' ? '#818CF8' :
                                      survey.surveyType === 'MGMA' ? '#34D399' :
                                      survey.surveyType === 'Gallagher' ? '#F472B6' :
                                      survey.surveyType === 'ECG' ? '#FBBF24' :
                                      survey.surveyType === 'AMGA' ? '#60A5FA' : '#9CA3AF';
                      return (
                        <div key={survey.id} className="relative group inline-flex items-center">
                          <button
                            onClick={() => {
                              setSelectedSurvey(survey.id);
                              // Trigger Google-style intelligent sizing after survey selection
                              const triggerIntelligentSizing = () => {
                                if (gridApi) {
                                  try {
                                    // Step 1: Auto-size based on content
                                    if (gridApi.autoSizeAllColumns) {
                                      gridApi.autoSizeAllColumns();
                                    }
                                    // Step 2: Size to fit container intelligently
                                    if (gridApi.sizeColumnsToFit) {
                                      gridApi.sizeColumnsToFit();
                                    }
                                    console.log('Intelligent sizing triggered for survey:', survey.surveyType);
                                  } catch (error) {
                                    console.log('Intelligent sizing on survey selection failed:', error);
                                  }
                                } else {
                                  console.log('Grid API not available for intelligent sizing');
                                }
                              };
                              
                              // Multiple attempts with progressive delays to ensure it works for all surveys
                              setTimeout(triggerIntelligentSizing, 100);
                              setTimeout(triggerIntelligentSizing, 300);
                              setTimeout(triggerIntelligentSizing, 600);
                              setTimeout(triggerIntelligentSizing, 1000);
                            }}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-full border transition-colors duration-200 ${isActive ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                            title={`${survey.surveyType} • ${survey.surveyYear}`}
                          >
                            <span className="font-medium">{getShortenedSurveyType(survey.surveyType, survey.providerType as ProviderType, survey)}</span>
                            <span className={`text-xs ${isActive ? 'text-indigo-100' : 'text-gray-500'}`}>{survey.surveyYear}</span>
                          </button>
                          <button
                            onClick={(e) => removeUploadedSurvey(survey.id, e)}
                            className="ml-1 text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100"
                            title="Remove survey"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>

                          {/* Hover stats tooltip */}
                          <div className="pointer-events-none absolute z-50 -top-32 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 w-64">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-medium text-gray-900">{survey.surveyType} • {survey.surveyYear}</div>
                                <div className="text-[10px] text-gray-500">{new Date(survey.uploadDate).toLocaleDateString()}</div>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-center">
                                <div>
                                  <div className="text-base font-semibold text-gray-900">{stats.totalRows.toLocaleString()}</div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">Rows</div>
                                </div>
                                <div>
                                  <div className="text-base font-semibold text-gray-900">{stats.uniqueSpecialties.toLocaleString()}</div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">Specialties</div>
                                </div>
                                <div>
                                  <div className="text-base font-semibold text-gray-900">{stats.totalDataPoints.toLocaleString()}</div>
                                  <div className="text-[10px] text-gray-500 mt-0.5">Data Points</div>
                                </div>
                              </div>
                              <div className="mt-2 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </>
                )}
              </>
            )}
          </div>

        {/* Data Preview */}
        {selectedSurvey && uploadedSurveys.length > 0 && (() => {
          const selectedSurveyData = uploadedSurveys.find(s => s.id === selectedSurvey);
          return selectedSurveyData ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="w-full overflow-x-auto">
                <DataPreview
                  file={selectedSurveyData}
                  onError={handleError}
                  globalFilters={globalFilters}
                  onFilterChange={handleFilterChange}
                  {...({ onGridReady: (api: any) => setGridApi(api) } as any)}
                />
              </div>
            </div>
          ) : null;
        })()}
      </div>
    </div>
      {/* Upload Progress Modal - Fixed Position Overlay */}
      {isUploading && (
        <EnterpriseLoadingSpinner
          message="Uploading survey..."
          progress={progress}
          variant="overlay"
          loading={isUploading}
        />
      )}
      {/* Deleting Progress Modal - Fixed Position Overlay */}
      {isDeleting && (
        <EnterpriseLoadingSpinner
          message={isDeletingAll ? "Clearing all surveys..." : "Deleting survey..."}
          progress={progress}
          variant="overlay"
          loading={isDeleting}
        />
      )}

      {/* Individual Survey Delete Confirmation Modal */}
      {showDeleteConfirmation && surveyToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-lg border border-green-400 w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Confirmation</h3>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to delete this item?
            </p>
            
            {/* Progress indicator when deleting */}
            {isDeleting && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600 mr-3"></div>
                  <span className="text-sm font-medium text-red-800">Deleting survey...</span>
                </div>
                <div className="mt-2 w-full bg-red-200 rounded-full h-1.5">
                  <div className="bg-red-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setSurveyToDelete(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSurvey}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Surveys Confirmation Modal */}
      {showClearAllConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-lg border border-red-400 w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Clear All Surveys</h3>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to delete <strong>all surveys</strong>? This action cannot be undone.
            </p>
            
            {/* Progress indicator when deleting */}
            {isDeleting && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600 mr-3"></div>
                  <span className="text-sm font-medium text-red-800">Clearing all surveys...</span>
                </div>
                <div className="mt-2 w-full bg-red-200 rounded-full h-1.5">
                  <div className="bg-red-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
                {showForceClose && (
                  <div className="mt-2 text-xs text-orange-600 text-center">
                    Operation taking longer than expected. You can force close if needed.
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              {showForceClose ? (
                <button
                  type="button"
                  onClick={forceCloseModal}
                  className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                  Force Close
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowClearAllConfirmation(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={confirmClearAll}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Clearing...
                  </>
                ) : (
                  'Clear All'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SurveyUpload; 