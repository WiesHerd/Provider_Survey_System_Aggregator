import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useLocation } from 'react-router-dom';
import { CloudArrowUpIcon, XMarkIcon, ChevronDownIcon, ChevronRightIcon, ArrowUpTrayIcon, TrashIcon, ArrowDownTrayIcon, ExclamationTriangleIcon, ArrowPathIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import { FormControl, Select, MenuItem, Autocomplete, TextField, Box, Typography, LinearProgress, Button, Tooltip } from '@mui/material';
import DataPreview from './DataPreview';
import { getDataService } from '../services/DataService';
import { ISurveyRow } from '../types/survey';
import { EnterpriseLoadingSpinner } from '../shared/components/EnterpriseLoadingSpinner';
import { useSmoothProgress } from '../shared/hooks/useSmoothProgress';
import { useYear } from '../contexts/YearContext';
import { useProviderContext } from '../contexts/ProviderContext';
import { useAuth } from '../contexts/AuthContext';
import { useSurveyListQuery } from '../features/upload/hooks/useSurveyListQuery';
import { filterSurveysByProviderType } from '../features/upload/utils/surveyListFilters';
import { providerTypeDetectionService } from '../services/ProviderTypeDetectionService';
import { getPerformanceOptimizedDataService } from '../services/PerformanceOptimizedDataService';
import { validateColumns } from '../features/upload/utils/uploadCalculations';
import { parseCSVLine } from '../shared/utils/csvParser';
import { readCSVFile } from '../shared/utils';
import { getFirebaseAuth, isFirebaseAvailable } from '../config/firebase';
import { FirestoreService } from '../services/FirestoreService';
import { validateFileStructure, validateHeaders, ValidationError } from '../features/upload/utils/preUploadValidation';
import { detectFormat, getExpectedFormat, getExpectedFormats, getFormatRequirements } from '../features/upload/utils/formatDetection';
import { validateDataTypes, validateBusinessRules } from '../features/upload/utils/dataValidation';
import type { ProviderType, DataCategory, UIProviderType } from '../types/provider';
import { EmptyState } from '../features/mapping/components/shared/EmptyState';
import { getShortenedSurveyType as getShortenedSurveyTypeShared } from '../shared/utils/surveyFormatters';
import { BoltIcon } from '@heroicons/react/24/outline';
import { ColumnMappingDialog } from '../features/upload/components/ColumnMappingDialog';
import { downloadUploadTemplate, UploadTemplateFormat } from '../utils/downloadUtils';
import { UploadValidationWizard } from '../features/upload/components/UploadValidationWizard';
import { SheetSelector } from '../features/upload/components/SheetSelector';
import { ValidationPreviewTable } from '../features/upload/components/ValidationPreviewTable';
import { parseFile } from '../features/upload/utils/fileParser';
import { validateAll, CompleteValidationResult } from '../features/upload/utils/validationEngine';
import { getExcelSheetNames } from '../features/upload/utils/excelParser';
import { isExcelFile } from '../features/upload/utils/fileParser';
import { duplicateDetectionService } from '../services/DuplicateDetectionService';
import { DuplicateSurveyDialog, DuplicateResolutionAction } from '../features/upload/components/DuplicateSurveyDialog';
import { AuditLogService } from '../services/AuditLogService';
import { calculateFileHash } from '../features/upload/utils/fileHash';
import { getUploadQueueService } from '../services/UploadQueueService';
import { queryClient, queryKeys } from '../shared/services/queryClient';
import { getFileValidationService, FileValidationResult } from '../services/FileValidationService';
import { UploadErrorDisplay } from './upload/UploadErrorDisplay';
import { markJobSuccessToastShown } from './upload/UploadQueueToast';
import { useToast } from '../contexts/ToastContext';


class UploadVerificationError extends Error {
  public persist = true;

  constructor(message: string) {
    super(message);
    this.name = 'UploadVerificationError';
  }
}

const isUploadDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('bp_upload_debug') === 'true';
};

const logUploadDebug = (message: string, details?: Record<string, unknown>): void => {
  if (!isUploadDebugEnabled()) return;
  if (details) {
    console.log('🧪 UploadDebug:', message, details);
    return;
  }
  console.log('🧪 UploadDebug:', message);
};

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
    // Match APP pill standard: "Source - Phys" (hyphenated, abbreviated)
    shortenedType = surveyType.replace(/\s*Physician\s*/gi, ' - Phys ').replace(/\s+/g, ' ').trim();
    if (!shortenedType.toLowerCase().includes('phys') && !shortenedType.toLowerCase().includes('physician')) {
      shortenedType = shortenedType ? `${shortenedType} - Phys` : 'Phys';
    }
  } else if (providerType === 'APP') {
    shortenedType = surveyType.replace(/\s*APP\s*/gi, ' - APP ').replace(/\s+/g, ' ').trim();
  }
  
  return shortenedType;
};

const detectSurveyMetadataFromFileName = (fileName: string) => {
  const lower = fileName.toLowerCase();
  const yearMatches = lower.match(/20\d{2}/g) || [];
  const detectedYear = yearMatches.length > 0
    ? Math.max(...yearMatches.map(match => Number(match))).toString()
    : undefined;

  let detectedSource: string | undefined;
  // Enhanced detection - check for variations and partial matches
  if (lower.includes('sullivancotter') || lower.includes('sullivan cotter') || lower.includes('sullivan-cotter') || lower.includes('sullivancotter')) {
    detectedSource = 'SullivanCotter';
  } else if (lower.includes('mgma')) {
    detectedSource = 'MGMA';
  } else if (lower.includes('gallagher')) {
    detectedSource = 'Gallagher';
  } else if (lower.includes('ecg')) {
    detectedSource = 'ECG';
  } else if (lower.includes('amga')) {
    detectedSource = 'AMGA';
  }
  
  // Log detection for debugging
  if (detectedSource) {
    console.log(`✅ Auto-detected survey source: ${detectedSource} from filename "${fileName}"`);
  } else {
    console.log(`⚠️ Could not auto-detect survey source from filename "${fileName}"`);
  }

  let detectedDataCategory: 'COMPENSATION' | 'CALL_PAY' | 'MOONLIGHTING' | undefined;
  if (lower.includes('call pay') || lower.includes('call_pay') || lower.includes('call-pay') || /\bcall\b/.test(lower)) {
    detectedDataCategory = 'CALL_PAY';
  } else if (lower.includes('moonlight')) {
    detectedDataCategory = 'MOONLIGHTING';
  }

  let detectedProviderType: ProviderType | undefined;
  if (/\bapp\b/.test(lower) || lower.includes('advanced practice') || /\bnp\b/.test(lower) || /\bpa\b/.test(lower) || /\bcrna\b/.test(lower)) {
    detectedProviderType = 'APP';
  } else if (lower.includes('physician') || /\bmd\b/.test(lower) || /\bdo\b/.test(lower)) {
    detectedProviderType = 'PHYSICIAN';
  }

  return {
    detectedYear,
    detectedSource,
    detectedDataCategory,
    detectedProviderType
  };
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
  dataCategory?: 'COMPENSATION' | 'CALL_PAY' | 'MOONLIGHTING' | 'CUSTOM' | string;
  stats: {
    totalRows: number;
    uniqueSpecialties: number;
    totalDataPoints: number;
  }
  metadata?: {
    fileType?: 'csv' | 'excel';
    fileSize?: number;
    sheetName?: string;
    sheetCount?: number;
    [key: string]: any;
  };
}

interface UploadedSurvey extends UploadedSurveyMetadata {
  fileContent: string;
  rows: ISurveyRow[];
  isDuplicate?: boolean; // Flag to indicate if this survey is a potential duplicate
  duplicateKey?: string; // Key used to identify duplicate groups
  isOrphaned?: boolean; // Flag to indicate if this survey has metadata but no data rows
  orphanedInfo?: {
    expectedRowCount: number;
    actualRowCount: number;
  };
  _uploadStatus?: 'uploading' | 'completed' | 'failed'; // Internal status for background uploads
}

// Normalization Note:
// -------------------
// Many survey CSVs use snake_case headers (e.g., provider_type, geographic_region),
// but the application expects camelCase (providerType, geographicRegion) for internal logic and dropdowns.
// To ensure robust mapping regardless of CSV header style, we normalize both required column names and CSV headers to camelCase before mapping.
// This prevents dropdowns (like Provider Type and Region) from being empty due to mismatched field names.
// If you add new required columns, ensure they are included in the normalization logic.
// See mapping logic in handleSurveyUpload for details.

function SurveyUpload(): JSX.Element {

  const dataService = getDataService();
  const toast = useToast();
  const { currentYear, setCurrentYear, refreshYears } = useYear();
  const location = useLocation();
  const hasLoadedOnThisMount = useRef(false);

  // Use smooth progress for dynamic loading
  const { progress, startProgress, completeProgress } = useSmoothProgress({
    duration: 3000,
    maxProgress: 90,
    intervalMs: 100
  });
  const { selectedProviderType, refreshProviderTypeDetection, setProviderType: setProviderTypeContext } = useProviderContext();
  const { user: authUser, isAvailable: authAvailable } = useAuth();
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
  const requestResizeRef = useRef<(() => void) | null>(null);

  // Reset grid API when survey changes to ensure fresh connection
  useEffect(() => {
    setGridApi(null);
  }, [selectedSurvey]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Confirmation dialog states
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showClearAllConfirmation, setShowClearAllConfirmation] = useState(false);
  const [showForceClose, setShowForceClose] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState<UploadedSurvey | null>(null);
  const [isDeletingSingleSurvey, setIsDeletingSingleSurvey] = useState(false);
  
  // Duplicate detection states
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [isResolvingDuplicate, setIsResolvingDuplicate] = useState(false);
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<any>(null);
  const [pendingUploadData, setPendingUploadData] = useState<{
    parsedRows: any[];
    file: File;
    headers: string[];
    resetTimeout?: () => void;
  } | null>(null);
  const auditLog = AuditLogService.getInstance();
  
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
  const [fileValidationResult, setFileValidationResult] = useState<FileValidationResult | null>(null);
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

  // Survey list filtered by Select Year so Uploaded Surveys only shows the selected year
  const { 
    data: rawSurveys, 
    loading: queryLoading, 
    error: queryError,
    refetch: refetchSurveys 
  } = useSurveyListQuery(
    currentYear, // Filter by year dropdown - only show surveys for the selected year
    undefined, // No provider filter here - we filter by selectedProviderType in the component
    true // Always enabled - React Query caching prevents excessive reads
  );
  
  // When DATA VIEW changes, clear selection so we don't show a survey that's not in the current view
  const prevProviderTypeRef = useRef(selectedProviderType);
  useEffect(() => {
    if (prevProviderTypeRef.current !== selectedProviderType) {
      prevProviderTypeRef.current = selectedProviderType;
      if (selectedSurvey) setSelectedSurvey('');
    }
  }, [selectedProviderType, selectedSurvey]);
  
  // DIAGNOSTIC: Log what surveys are being returned after filtering
  // ENTERPRISE FIX: Removed excessive logging and infinite loops
  // Only log in debug mode to prevent thousands of console messages
  const debugMode = typeof window !== 'undefined' && window.localStorage.getItem('bp_upload_debug') === 'true';
  
  useEffect(() => {
    // Only log in debug mode - prevent console spam
    if (debugMode && rawSurveys) {
      if (rawSurveys.length > 0) {
        console.log('📊 Surveys loaded:', rawSurveys.length);
      } else if (!queryLoading) {
        console.log('⚠️ No surveys found');
      }
    }
  }, [rawSurveys, queryLoading, debugMode]);

  // Process React Query data into component format (filter by DATA VIEW client-side)
  // ENTERPRISE FIX: Removed excessive logging - only log in debug mode
  useEffect(() => {
    // Only log in debug mode to prevent console spam
    if (debugMode && rawSurveys) {
      console.log('📊 Processing surveys:', { count: rawSurveys.length, filter: selectedProviderType });
    }
    
    if (!rawSurveys || rawSurveys.length === 0) {
      setUploadedSurveys([]);
      if (!selectedSurvey) {
        setSelectedSurvey('');
      }
      return;
    }

    // Filter by DATA VIEW (BOTH / Physician / APP) client-side - single Firestore cache for all views
    const byProviderType = filterSurveysByProviderType(rawSurveys, selectedProviderType);
    // Filter out deleted surveys so they never reappear in the UI
    const filteredSurveys = byProviderType.filter((survey: any) => 
      !deletedSurveyIdsRef.current.has(survey.id)
    );
    
    // Build lightweight survey list; show all surveys (use ID as unique key)
    // Detect potential duplicates but don't hide them - let user decide
    const surveyMap = new Map();
    const duplicateKeys = new Set<string>();
    
    // First pass: identify potential duplicates
    const duplicateCheckMap = new Map<string, number>();
    filteredSurveys.forEach((survey: any) => {
      // Create a key based on source, provider type, year, and data category to detect duplicates
      const duplicateKey = `${survey.source || survey.type || ''}-${survey.providerType || ''}-${survey.year || ''}-${survey.dataCategory || ''}`;
      const count = duplicateCheckMap.get(duplicateKey) || 0;
      duplicateCheckMap.set(duplicateKey, count + 1);
    });
    
    // Mark all keys that have more than 1 survey as duplicates (fix: mark ALL surveys in duplicate groups, not just the second+)
    duplicateCheckMap.forEach((count, duplicateKey) => {
      if (count > 1) {
        duplicateKeys.add(duplicateKey);
      }
    });
    
    // Second pass: build survey list with duplicate flags (using already filtered surveys)
    filteredSurveys.forEach((survey: any) => {
      // Use survey ID as unique key to ensure all surveys are shown
      const uniqueKey = survey.id;
      const duplicateKey = `${survey.source || survey.type || ''}-${survey.providerType || ''}-${survey.year || ''}-${survey.dataCategory || ''}`;
      const isDuplicate = duplicateKeys.has(duplicateKey);

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
        columnMappings: {},
        providerType: survey.providerType || 'PHYSICIAN',
        dataCategory: survey.dataCategory,
        metadata: survey.metadata || {},
        // Add duplicate flag for UI display
        isDuplicate: isDuplicate,
        duplicateKey: duplicateKey
      });
    });
    
    const processedSurveys = Array.from(surveyMap.values());
    setUploadedSurveys(processedSurveys);
    
    // ENTERPRISE FIX: Smart auto-selection - prefer surveys with data over empty ones
    // This prevents selecting a survey that was created but never finished uploading
    if (processedSurveys.length > 0) {
      const currentSelectionExists = processedSurveys.some(s => s.id === selectedSurvey);
      if (!selectedSurvey || !currentSelectionExists) {
        // Smart selection: Prefer surveys with data (rowCount > 0)
        // If multiple have data, prefer the most recently uploaded one
        const surveysWithData = processedSurveys.filter(s => 
          s.stats?.totalRows > 0 || (s as any).rowCount > 0
        );
        
        let surveyToSelect;
        if (surveysWithData.length > 0) {
          // Prefer surveys with data - sort by upload date (most recent first)
          surveyToSelect = surveysWithData.sort((a, b) => {
            const dateA = a.uploadDate?.getTime() || 0;
            const dateB = b.uploadDate?.getTime() || 0;
            return dateB - dateA; // Most recent first
          })[0];
          console.log('✅ Auto-selected survey with data:', {
            surveyId: surveyToSelect.id,
            rowCount: surveyToSelect.stats?.totalRows || (surveyToSelect as any).rowCount,
            uploadDate: surveyToSelect.uploadDate
          });
        } else {
          // No surveys with data - fall back to most recently uploaded
          surveyToSelect = processedSurveys.sort((a, b) => {
            const dateA = a.uploadDate?.getTime() || 0;
            const dateB = b.uploadDate?.getTime() || 0;
            return dateB - dateA; // Most recent first
          })[0];
          console.warn('⚠️ No surveys with data found - selected most recent survey (may be empty):', {
            surveyId: surveyToSelect.id,
            rowCount: surveyToSelect.stats?.totalRows || (surveyToSelect as any).rowCount
          });
        }
        
        setSelectedSurvey(surveyToSelect.id);
      }
    } else {
      // No surveys available, clear selection
      setSelectedSurvey('');
    }
  }, [rawSurveys, selectedProviderType, currentYear, selectedSurvey]);

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

    const { detectedYear, detectedSource, detectedDataCategory, detectedProviderType } = detectSurveyMetadataFromFileName(file.name);
    // CRITICAL FIX: Always set detected source if found, even if surveySource already has a value
    // This ensures auto-detection works even if user previously selected something
    if (detectedSource) {
      setSurveySource(detectedSource);
      console.log(`✅ Auto-filled Survey Source: ${detectedSource} from filename "${file.name}"`);
    } else {
      console.warn(`⚠️ Could not auto-detect survey source from filename "${file.name}" - please select manually`);
    }
    if (detectedDataCategory && dataCategory === 'COMPENSATION') {
      setDataCategory(detectedDataCategory);
    }
    if (detectedProviderType && providerType === 'PHYSICIAN') {
      setProviderType(detectedProviderType);
    }
    if (detectedYear && String(surveyYear) === String(currentYear)) {
      setSurveyYear(detectedYear);
    }
    setColumnValidation(null);
    setPreUploadValidation(null);
    setDataValidation(null);
    setValidationResult(null);
    setFileValidationResult(null);
    setExcelSheets([]);
    setSelectedSheet('');
    setIsValidating(true);
    
    try {
      // IMMEDIATE VALIDATION: Run fast validation (< 500ms) for instant feedback
      const fileValidationService = getFileValidationService();
      const immediateValidation = await fileValidationService.validateOnSelection(file);
      setFileValidationResult(immediateValidation);
      
      // If immediate validation shows critical errors, stop here
      if (!immediateValidation.canProceed) {
        setIsValidating(false);
        return;
      }
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
      
      // Store parsed data for validation review and preview
      setParsedData({
        headers: parseResult.headers,
        rows: parseResult.rows
      });
      
      // Step 3: Run new three-tier validation
      const newValidationResult = validateAll(parseResult.headers, parseResult.rows);
      setValidationResult(newValidationResult);
      
      // DIAGNOSTIC: Log validation results for debugging
      console.log('🔍 VALIDATION DIAGNOSTICS:', {
        isValid: newValidationResult.isValid,
        canProceed: newValidationResult.canProceed,
        totalIssues: newValidationResult.totalIssues,
        errorCount: newValidationResult.errorCount,
        warningCount: newValidationResult.warningCount,
        tier1Errors: newValidationResult.tier1.errors.map(e => e.message),
        tier2Warnings: newValidationResult.tier2.warnings.map(w => w.message),
        headers: parseResult.headers,
        rowCount: parseResult.rows.length
      });
      
      // Step 4: Header validation (< 1s) - keep for backward compatibility
      // For Excel files, use parsed headers to avoid binary header issues.
      const headerValidation = isExcelFile(file)
        ? {
            isValid: parseResult.headers.length > 0,
            headers: parseResult.headers,
            format: undefined,
            formatConfidence: undefined,
            errors: parseResult.headers.length > 0 ? [] : [{
              severity: 'critical',
              category: 'structure',
              message: 'File header row is empty',
              fixInstructions: ['Ensure first row contains column headers']
            }],
            warnings: []
          }
        : await validateHeaders(file);
      
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
              const trimmedHeader = String(header || '').trim();
              if (!trimmedHeader) {
                return;
              }
              rowData[trimmedHeader] = row[index] || '';
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

  const handleDownloadTemplate = async (format?: UploadTemplateFormat) => {
    try {
      if (!format) {
        // Validate required fields for scenario-specific template
        if (!dataCategory || (dataCategory === 'CUSTOM' && !customDataCategory.trim())) {
          setError('Please select Data Category first');
          return;
        }
        if (!providerType || (providerType === 'CUSTOM' && !customProviderType.trim())) {
          setError('Please select Provider Type first');
          return;
        }
      }

      await downloadUploadTemplate({
        dataCategory,
        providerType,
        format,
        expectedFormat: expectedFormatForTemplate
      });
    } catch (error) {
      console.error('Download failed:', error);
      setError('Failed to download template. Please try again.');
    }
  };

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

          if (parseResult.headers.length > 0) {
            const fullValidation = validateColumns(parseResult.headers);
            setColumnValidation(fullValidation);

            setPreUploadValidation(prev => ({
              ...(prev || { structure: { isValid: true, errors: [], warnings: [], info: [], fileSize: file.size } }),
              headers: {
                isValid: true,
                headers: parseResult.headers,
                format: undefined,
                formatConfidence: undefined,
                errors: [],
                warnings: []
              },
              formatDetection: detectFormat(parseResult.headers)
            }));
          }
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
    // ENTERPRISE FIX: Don't clear files - user may have already selected a file
    // setFiles([]); // Clear any selected file
  };

  const handleProviderTypeChange = (e: any) => {
    const newProviderType = e.target.value as ProviderType;
    setProviderType(newProviderType);
    setCustomProviderType(''); // Reset custom provider type
    // ENTERPRISE FIX: Don't clear files - user may have already selected a file
    // setFiles([]); // Clear any selected file
  };

  // CHANGED: Handle survey source change (simplified - just company names)
  // ENTERPRISE FIX: Don't clear files when survey source changes - this is frustrating UX
  const handleSurveySourceChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    const value = e.target.value as string;
    setIsCustom(value === 'Custom');
    setSurveySource(value);
    setCustomSurveySource(''); // Reset custom survey source
    setCustomSurveyName(''); // Reset custom survey name
    // ENTERPRISE FIX: Keep the file - user shouldn't have to re-select it
    // setFiles([]); // Clear any selected file when survey source changes
  };

  const removeUploadedSurvey = async (surveyId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (isDeleting || isDeletingSingleSurvey) {
      return;
    }
    
    // Find the survey to delete
    const survey = uploadedSurveys.find(s => s.id === surveyId);
    if (!survey) return;
    
    // Show confirmation dialog
    setSurveyToDelete(survey);
    setShowDeleteConfirmation(true);
  };

  // ENTERPRISE: Track deleted survey IDs to prevent them from reappearing
  const deletedSurveyIdsRef = useRef<Set<string>>(new Set());
  
  const confirmDeleteSurvey = async () => {
    if (!surveyToDelete || isDeletingSingleSurvey) return;

    const surveyIdToDelete = surveyToDelete.id;
    const surveyName = surveyToDelete.fileName || 'survey';

    // Apple-style: show "Deleting..." in modal until delete completes
    setIsDeletingSingleSurvey(true);

    try {
      console.log(`🗑️ Deleting survey: ${surveyIdToDelete}`);
      const deleteResult = await dataService.deleteSurveyEverywhere(surveyIdToDelete);

      if (!deleteResult.success) {
        handleError(`Failed to delete ${surveyName}. Please try again.`);
        return;
      }

      console.log(`✅ Deletion completed: ${deleteResult.counts?.indexedDbDataRows ?? 0} rows deleted`);

      // Close modal and update UI only after delete succeeds
      setShowDeleteConfirmation(false);
      setSurveyToDelete(null);
      setIsDeletingSingleSurvey(false);

      deletedSurveyIdsRef.current.add(surveyIdToDelete);

      queryClient.setQueryData(queryKeys.surveyList(currentYear, undefined), (oldData: any) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.filter((s: any) => s.id !== surveyIdToDelete);
      });

      if (selectedSurvey === surveyIdToDelete) {
        setSelectedSurvey(null);
      }
      setUploadedSurveys(prev => prev.filter(s => s.id !== surveyIdToDelete));

      const { notifySurveyDeletion } = require('../shared/utils/deleteHelpers');
      notifySurveyDeletion(surveyIdToDelete);

      const { invalidateAllCachesAfterDelete } = require('../shared/utils/deleteHelpers');
      invalidateAllCachesAfterDelete(surveyIdToDelete).catch((err: Error) => {
        console.warn('Cache invalidation failed (non-critical):', err);
      });

      refreshYears().catch(() => { /* non-blocking */ });

      const { getPerformanceOptimizedDataService } = require('../services/PerformanceOptimizedDataService');
      getPerformanceOptimizedDataService().clearCache('all_surveys');

      duplicateDetectionService.clearCache();

      // Refetch and refresh in background so list/empty state stays correct
      const { providerTypeDetectionService } = require('../services/ProviderTypeDetectionService');
      providerTypeDetectionService.clearCache();
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      queryClient.invalidateQueries({ queryKey: ['surveyData'] });
      refetchSurveys().then(async () => {
        const result = await providerTypeDetectionService.detectAvailableProviderTypes();
        window.dispatchEvent(new CustomEvent('provider-types-refreshed', {
          detail: { availableTypes: result.availableTypes.map((t: any) => t.type) }
        }));
        window.dispatchEvent(new CustomEvent('survey-deleted', {
          detail: { surveyId: surveyIdToDelete, refreshComplete: true }
        }));
      }).catch((err) => console.warn('Post-delete refetch failed:', err));
    } catch (error) {
      console.error('❌ Error deleting survey:', error);
      handleError(`Error removing ${surveyName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsDeletingSingleSurvey(false);
      setShowDeleteConfirmation(false);
      setSurveyToDelete(null);
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
  const sanitizeHeaders = (rawHeaders: string[]) => {
    const headerIndexPairs = rawHeaders.map((header, index) => ({
      header: String(header || '').trim(),
      index
    }));
    const validPairs = headerIndexPairs.filter(pair => pair.header.length > 0);
    return {
      headers: validPairs.map(pair => pair.header),
      indexes: validPairs.map(pair => pair.index),
      removedCount: headerIndexPairs.length - validPairs.length
    };
  };

  const sanitizeRowsByHeaderIndexes = (rows: any[][], indexes: number[]) => {
    return rows.map(row => indexes.map(index => row[index] ?? ''));
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
    // Close mapping dialog immediately so users can see upload progress
    setShowMappingDialog(false);
    
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
      // Read with encoding detection and normalization (same path as FirestoreService)
      const { text, issues, normalized } = await readCSVFile(file);
      if (issues.length > 0) {
        console.warn('Encoding issues detected during column-mapping upload:', issues);
      }
      if (normalized) {
        console.log('Character normalization applied to uploaded file');
      }
      const rows = text.split(/\r?\n/).filter(row => row.trim());
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

      // ENTERPRISE FIX: Parse CSV data preserving original header names as keys
      // CRITICAL: Use original headers as keys (not mapped headers) to preserve column order
      // The column mappings are for standardization, but we keep original keys for display
      const parsedRows = dataRows.map(row => {
        const values = parseCSVLine(row);
        const rowData: any = {};
        originalHeaders.forEach((header: string, index: number) => {
          // ENTERPRISE FIX: Use original header as key to preserve column order
          // Store both original and mapped for flexibility
          const trimmedHeader = String(header || '').trim();
          if (trimmedHeader) {
            rowData[trimmedHeader] = values[index] || '';
            // Also store mapped version if different (for standardization)
            const mappedHeader = mappings[header] || header;
            if (mappedHeader !== trimmedHeader) {
              rowData[mappedHeader] = values[index] || '';
            }
          }
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

      // ENTERPRISE FIX: Pass original headers to preserve column order in metadata
      // The data rows use mapped headers for standardization, but we store originalHeaders for display
      await processUploadedData(parsedRows, file, originalHeaders, resetTimeout);
      
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
      handleError(error.message || 'Failed to upload survey with mappings', {
        persist: isPersistentError(error)
      });
      setPendingUpload(null);
      setShowMappingDialog(false);
    }
  };

  // Extract common upload processing logic
  const processUploadedData = async (
    parsedRows: any[],
    file: File,
    headers: string[],
    resetTimeout?: () => void,
    skipDuplicateCheck: boolean = false
  ) => {
    let surveyIdForCleanup: string | null = null;
    let createdSurvey = false;
    let addedImmediateSurvey = false;

    try {
      // Comprehensive diagnostic logging at upload start
      console.log('🚀 Starting upload process', {
        fileName: file.name,
        fileSize: file.size,
        rowCount: parsedRows.length,
        headerCount: headers.length,
        formState: {
          surveySource,
          customSurveySource,
          dataCategory,
          customDataCategory,
          providerType,
          customProviderType,
          surveyYear,
          surveyLabel
        },
        skipDuplicateCheck
      });

      // ENTERPRISE FIX: Check Firebase authentication BEFORE upload
      // This prevents wasted processing if user is not signed in
      if (isFirebaseAvailable()) {
        const auth = getFirebaseAuth();
        const authUser = auth?.currentUser;
        
        if (!authUser?.uid) {
          // User is not signed in - show clear error and stop
          const errorMsg = 
            'You must be signed in to upload surveys to Firebase.\n\n' +
            'Please:\n' +
            '1. Click the user menu in the top-right corner\n' +
            '2. Sign in with your email\n' +
            '3. Try uploading again\n\n' +
            'If you want to upload without signing in, the survey will be saved to local storage (IndexedDB) only.';
          
          console.error('❌ Authentication required for Firebase upload');
          handleError(errorMsg, { persist: true });
          setIsUploading(false);
          return;
        }
        
        // CRITICAL: Test Firebase write permissions before proceeding
        try {
          const { testFirebaseWritePermissions } = await import('../utils/testFirebasePermissions');
          const permissionTest = await testFirebaseWritePermissions();
          if (!permissionTest.success) {
            // Run full diagnostics to provide better error message
            const { diagnoseFirebasePermissions } = await import('../utils/diagnoseFirebasePermissions');
            const diagnostics = await diagnoseFirebasePermissions();
            
            let errorMsg = `Firebase permission error: ${permissionTest.error}\n\n`;
            errorMsg += `DIAGNOSTICS:\n`;
            errorMsg += `- Firebase Available: ${diagnostics.diagnostics.firebaseAvailable ? 'Yes' : 'No'}\n`;
            errorMsg += `- Authenticated: ${diagnostics.diagnostics.authenticated ? 'Yes' : 'No'}\n`;
            if (diagnostics.diagnostics.email) {
              errorMsg += `- Email: ${diagnostics.diagnostics.email}\n`;
            }
            errorMsg += `- Rules Deployed: ${diagnostics.diagnostics.rulesDeployed ? 'Yes' : 'No'}\n\n`;
            
            errorMsg += `SOLUTION:\n`;
            if (!diagnostics.diagnostics.authenticated) {
              errorMsg += `1. Sign in: Click the user menu (top-right) → Sign in\n`;
            }
            if (!diagnostics.diagnostics.rulesDeployed) {
              errorMsg += `2. Deploy security rules: Open terminal and run:\n`;
              errorMsg += `   firebase deploy --only firestore:rules\n\n`;
              errorMsg += `   This is REQUIRED for Firebase uploads to work.\n`;
            }
            errorMsg += `3. Sign out and sign back in to refresh your auth token\n`;
            errorMsg += `4. Try uploading again\n\n`;
            errorMsg += `The survey will be saved to local storage (IndexedDB) only until permissions are fixed.`;
            
            console.error('❌ Firebase permission test failed');
            console.error('📊 Full diagnostics:', diagnostics);
            handleError(errorMsg, { persist: true });
            // Continue with upload - it will fall back to IndexedDB
          }
        } catch (testError) {
          // Permission test failed - log but continue (will fall back to IndexedDB)
          console.warn('⚠️ Firebase permission test error (will fall back to IndexedDB):', testError);
        }
      }
      if (!parsedRows || parsedRows.length === 0) {
        console.error('❌ No rows parsed from upload. Aborting save.');
        throw new UploadVerificationError('No rows were parsed from this file. Please verify the file contains data rows.');
      }
      logUploadDebug('Parsed rows ready for upload', { rowCount: parsedRows.length });
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

    // NEW: Validate required fields with detailed logging
    if (!dataCategory) {
      console.error('❌ Validation failed: Data Category is required', {
        dataCategory,
        surveySource,
        providerType,
        surveyYear
      });
      setError('Please select a Data Category');
      setIsUploading(false);
      return;
    }
    
    if (!surveySource || surveySource === '') {
      console.error('❌ Validation failed: Survey Source is required', {
        surveySource,
        dataCategory,
        providerType,
        surveyYear
      });
      setError('Please select a Survey Source');
      setIsUploading(false);
      return;
    }
    
    if (surveySource === 'Custom' && !customSurveySource.trim()) {
      console.error('❌ Validation failed: Custom survey source is required', {
        surveySource,
        customSurveySource,
        dataCategory,
        providerType,
        surveyYear,
        message: 'User selected "Custom" but did not enter a custom survey source name'
      });
      setError('Please enter a custom survey source (e.g., "Solvam Carter") in the custom survey source field');
      setIsUploading(false);
      return;
    }
    
    if (dataCategory === 'CUSTOM' && !customDataCategory.trim()) {
      setError('Please enter a custom data category');
      setIsUploading(false);
      return;
    }
    
    // NEW: Extract source and data category
    const finalSource = surveySource === 'Custom' ? customSurveySource : surveySource;
    const finalDataCategory = dataCategory === 'CUSTOM' ? customDataCategory : dataCategory;
    // Normalize provider type to ensure it matches schema validation
    // The schema accepts: PHYSICIAN, APP, CALL, CUSTOM (case-insensitive)
    let finalProviderType: string;
    if (providerType === 'CUSTOM') {
      finalProviderType = customProviderType.trim();
    } else {
      finalProviderType = providerType.trim();
    }
    // Normalize to uppercase for consistency with schema
    finalProviderType = finalProviderType.toUpperCase();
    
    // CRITICAL FIX: Ensure "PHYSICIAN" form selection is preserved, not overwritten by data detection
    // If user selected "Physician" in form, always use "PHYSICIAN" regardless of what's in the data
    // The data rows can contain "Staff Physician", but the survey metadata must use the form selection
    if (providerType === 'PHYSICIAN' || finalProviderType === 'PHYSICIAN') {
      finalProviderType = 'PHYSICIAN'; // Force to PHYSICIAN, never "Staff Physician"
    }
    
    const safeSurveyLabel = (surveyLabel && typeof surveyLabel === 'string' && surveyLabel.trim()) ? surveyLabel.trim() : '';
    const surveyYearString = String(surveyYear).trim();
    
    // ENTERPRISE: Check for duplicates before proceeding
    // Calculate file hash for content comparison (declare outside if block for later use)
    let fileHash: string | undefined;
    
    // Always calculate hash for storage (even if skipping duplicate check)
    try {
      console.log('🔍 Calculating file hash for duplicate detection...');
      fileHash = await calculateFileHash(file);
      console.log('✅ File hash calculated:', fileHash.substring(0, 16) + '...');
    } catch (hashError) {
      console.warn('⚠️ Failed to calculate file hash:', hashError);
      // Continue without hash - exact match will still work
    }
    
    if (!skipDuplicateCheck) {
      try {
        // Ensure duplicate detection uses fresh survey list after deletions
        // ENTERPRISE FIX: Clear duplicate detection cache and wait a moment for any pending deletions
        // This ensures deleted surveys don't appear as duplicates
        duplicateDetectionService.clearCache();
        
        // CRITICAL: Wait a moment to ensure any background deletions have completed
        // This prevents the issue where a survey is deleted but duplicate detection runs before deletion finishes
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay for deletion to complete
        
        console.log('🔍 Checking for duplicate surveys...', {
          metadata: {
            source: finalSource,
            dataCategory: finalDataCategory,
            providerType: finalProviderType,
            year: surveyYearString,
            surveyLabel: safeSurveyLabel
          },
          rowCount: parsedRows.length
        });
        
        // DEBUG: Show all existing surveys in IndexedDB
        const debugSurveys = await duplicateDetectionService.debugGetAllSurveysWithKeys();
        console.log(`🔍 DEBUG: Found ${debugSurveys.length} surveys in IndexedDB:`);
        debugSurveys.forEach(({ survey, compositeKey, details }) => {
          console.log(`  - Survey ID: ${survey.id}`);
          console.log(`    Name: ${survey.name || 'N/A'}`);
          console.log(`    Composite Key: "${compositeKey}"`);
          console.log(`    Details:`, details);
          console.log(`    Upload Date: ${survey.uploadDate || 'N/A'}`);
        });
        
        const duplicateCheck = await duplicateDetectionService.checkForDuplicates({
          metadata: {
            source: finalSource,
            dataCategory: finalDataCategory,
            providerType: finalProviderType,
            year: surveyYearString,
            surveyLabel: safeSurveyLabel
          },
          file: file,
          fileHash: fileHash,
          rowCount: parsedRows.length
        });
        
        // DIAGNOSTIC: Log duplicate check details
        console.log('🔍 DUPLICATE CHECK DIAGNOSTICS:', {
          hasDuplicate: duplicateCheck.hasDuplicate,
          matchType: duplicateCheck.matchType,
          compositeKey: duplicateCheck.compositeKey,
          newSurveyMetadata: {
            source: finalSource,
            dataCategory: finalDataCategory,
            providerType: finalProviderType,
            year: surveyYearString,
            surveyLabel: safeSurveyLabel
          },
          existingSurvey: duplicateCheck.exactMatch?.survey || duplicateCheck.contentMatch?.survey || duplicateCheck.similarSurveys[0]?.survey
        });
        
        if (duplicateCheck.hasDuplicate) {
          console.log('⚠️ Duplicate survey detected:', duplicateCheck.matchType);
          
          // Log duplicate detection
          const existingSurvey = duplicateCheck.exactMatch?.survey || 
                                 duplicateCheck.contentMatch?.survey || 
                                 duplicateCheck.similarSurveys[0]?.survey;
          
          if (existingSurvey) {
            await auditLog.logDuplicateDetection(
              {
                source: finalSource,
                dataCategory: finalDataCategory,
                providerType: finalProviderType,
                year: surveyYearString,
                surveyLabel: safeSurveyLabel
              },
              existingSurvey.id,
              duplicateCheck.matchType,
              fileHash
            );
          }
          
          // Store pending upload data and show dialog
          setPendingUploadData({ parsedRows, file, headers, resetTimeout });
          setDuplicateCheckResult(duplicateCheck);
          setShowDuplicateDialog(true);
          setIsUploading(false);
          return; // Stop here, wait for user decision
        }
      } catch (duplicateError) {
        console.error('❌ Error checking for duplicates:', duplicateError);
        // Continue with upload if duplicate check fails (graceful degradation)
        console.warn('⚠️ Continuing with upload despite duplicate check failure');
      }
    }
    
    // Create survey object with new architecture
    const surveyId = crypto.randomUUID();
    surveyIdForCleanup = surveyId;
    surveyIdForCleanup = surveyId;
    const defaultSurveyName = file.name.replace('.csv', '');
    
    // BACKWARD COMPATIBILITY: Derive type field from source + dataCategory + providerType
    const categoryDisplay = finalDataCategory === 'CALL_PAY' ? 'Call Pay'
      : finalDataCategory === 'MOONLIGHTING' ? 'Moonlighting'
      : finalDataCategory === 'COMPENSATION' ? (finalProviderType === 'APP' ? 'APP' : 'Physician')
      : finalDataCategory;
    const surveyTypeName = `${finalSource} ${categoryDisplay}`;
    
    // Generate survey name for display (include label if provided)
    // CRITICAL: Safely handle surveyLabel - ensure it's never undefined
    const labelSuffix = safeSurveyLabel ? ` - ${safeSurveyLabel}` : '';
    const surveyName = `${finalSource} ${categoryDisplay} ${surveyYear}${labelSuffix}`;
    
    // Build survey object - CRITICAL: Never include undefined values
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

    // Add basic file metadata (useful for auditing and troubleshooting)
    const isExcelUpload = isExcelFile(file);
    const sheetName = isExcelUpload ? (selectedSheet || excelSheets[0]?.name) : undefined;
    const sheetCount = isExcelUpload ? (excelSheets.length || undefined) : undefined;
    survey.metadata.fileType = isExcelUpload ? 'excel' : 'csv';
    survey.metadata.fileSize = file.size;
    if (isExcelUpload) {
      survey.metadata.sheetName = sheetName;
      survey.metadata.sheetCount = sheetCount;
    }
    
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
    
    // Store file hash in metadata for future duplicate detection
    if (fileHash) {
      survey.metadata.fileHash = fileHash;
    }

    // Add survey to state immediately for visual feedback (optimistic UI)
    const immediateSurvey = {
      id: surveyId,
      fileName: surveyName,
      surveyType: surveyTypeName,
      providerType: providerType === 'CUSTOM' ? customProviderType : providerType,
      dataCategory: finalDataCategory,
      surveyYear,
      uploadDate: new Date(),
      fileContent: '',
      rows: [],
      stats: {
        totalRows: parsedRows.length,
        uniqueSpecialties: survey.specialtyCount,
        totalDataPoints: parsedRows.length
      },
      columnMappings: survey.metadata.columnMappings,
      metadata: {
        fileType: survey.metadata.fileType,
        fileSize: survey.metadata.fileSize,
        sheetName: survey.metadata.sheetName,
        sheetCount: survey.metadata.sheetCount
      },
      // Mark as uploading for UI feedback
      _uploadStatus: 'uploading' as const
    };

    setUploadedSurveys(prev => [...prev, immediateSurvey]);
    addedImmediateSurvey = true;
    setSelectedSurvey(surveyId);
    setRefreshTrigger(prev => prev + 1);

    // BACKGROUND UPLOAD: Add to queue for non-blocking upload
    // The queue will handle the actual database writes via dataService.uploadSurvey()
    const uploadQueue = getUploadQueueService();
    
    console.log('📤 Adding file to background upload queue...');
    const jobIds = await uploadQueue.addToQueue([file], {
      surveyYear: parseInt(surveyYearString),
      surveyType: surveyTypeName,
      providerType: finalProviderType,
      surveyName: surveyName // Pass the actual survey name
    });
    
    console.log(`✅ File added to upload queue (job IDs: ${jobIds.join(', ')})`);
    
    // Clear uploading state - upload is now in background
    setIsUploading(false);
    if (resetTimeout) {
      resetTimeout();
    }
    
    // Subscribe to queue updates to update UI when upload completes
    const unsubscribe = uploadQueue.subscribe((job) => {
      if (jobIds.includes(job.id)) {
        if (job.status === 'completed') {
          console.log('✅ Upload completed, invalidating cache and refreshing survey list');
          
          // CRITICAL: Verify the survey actually exists in Firebase before showing success
          const verifyUpload = async () => {
            try {
              // Wait a moment for Firebase to commit
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Verify survey exists in database
              const allSurveys = await dataService.getAllSurveys();
              // CRITICAL FIX: When searching for uploaded survey, treat "PHYSICIAN" and "Staff Physician" as equivalent
              // This handles the case where data contains "Staff Physician" but form selected "Physician"
              const uploadedSurvey = job.surveyId 
                ? allSurveys.find(s => s.id === job.surveyId)
                : allSurveys.find(s => {
                    const nameMatch = s.name === surveyName;
                    const yearMatch = s.year === surveyYearString;
                    // Treat PHYSICIAN and Staff Physician as equivalent for matching
                    const providerTypeMatch = s.providerType === finalProviderType ||
                      (finalProviderType === 'PHYSICIAN' && (s.providerType === 'PHYSICIAN' || s.providerType === 'Staff Physician' || (s.providerType as string)?.toUpperCase() === 'STAFF PHYSICIAN')) ||
                      (finalProviderType === 'STAFF PHYSICIAN' && (s.providerType === 'PHYSICIAN' || s.providerType === 'Staff Physician'));
                    return nameMatch && yearMatch && providerTypeMatch;
                  });
              
              // CRITICAL: Check which storage mode is active
              const { getCurrentStorageMode, StorageMode } = await import('../config/storage');
              const storageMode = getCurrentStorageMode();
              const isFirebaseMode = storageMode === StorageMode.FIREBASE;
              
              // Check if survey is in Firebase or IndexedDB
              if (isFirebaseMode) {
                // Try to verify survey exists in Firebase specifically
                try {
                  const { getFirebaseDb } = await import('../config/firebase');
                  const { getFirebaseAuth } = await import('../config/firebase');
                  const { doc, getDoc } = await import('firebase/firestore');
                  const db = getFirebaseDb();
                  const auth = getFirebaseAuth();
                  const userId = auth?.currentUser?.uid;
                  
                  if (db && userId && job.surveyId) {
                    const surveyRef = doc(db, `users/${userId}/surveys/${job.surveyId}`);
                    const surveySnap = await getDoc(surveyRef);
                    
                    if (!surveySnap.exists()) {
                      console.error('❌ CRITICAL: Survey NOT found in Firebase!', {
                        surveyId: job.surveyId,
                        surveyName,
                        note: 'Survey may have been saved to IndexedDB instead of Firebase'
                      });
                      handleError(
                        `Upload completed but survey NOT saved to Firebase. ` +
                        `The survey may have been saved to local storage (IndexedDB) instead. ` +
                        `Check the browser console for details.`,
                        { persist: true }
                      );
                      setUploadedSurveys(prev => prev.filter(s => s.id !== surveyId));
                      return;
                    } else {
                      console.log('✅ Survey verified in Firebase:', job.surveyId);
                    }
                  }
                } catch (firebaseCheckError) {
                  console.error('❌ Error checking Firebase for survey:', firebaseCheckError);
                }
              }
              
              if (!uploadedSurvey) {
                console.error('❌ CRITICAL: Upload reported success but survey not found in database');
                console.error('🔍 Survey details:', {
                  surveyId: job.surveyId,
                  surveyName,
                  surveyYear: surveyYearString,
                  providerType: finalProviderType,
                  totalSurveysInDB: allSurveys.length,
                  storageMode: isFirebaseMode ? 'Firebase' : 'IndexedDB'
                });
                
                // Check if survey exists but is filtered out
                const allSurveysUnfiltered = await dataService.getAllSurveys();
                const matchingSurvey = allSurveysUnfiltered.find(s => 
                  s.name === surveyName && 
                  s.year === surveyYearString
                );
                
                if (matchingSurvey) {
                  const filterIssues = [];
                  // CRITICAL FIX: Treat "PHYSICIAN" and "Staff Physician" as equivalent
                  const providerTypeMatches = matchingSurvey.providerType === finalProviderType ||
                    (finalProviderType === 'PHYSICIAN' && (matchingSurvey.providerType === 'PHYSICIAN' || matchingSurvey.providerType === 'Staff Physician' || (matchingSurvey.providerType as string)?.toUpperCase() === 'STAFF PHYSICIAN')) ||
                    (finalProviderType === 'STAFF PHYSICIAN' && (matchingSurvey.providerType === 'PHYSICIAN' || matchingSurvey.providerType === 'Staff Physician'));
                  
                  if (!providerTypeMatches) {
                    filterIssues.push(`Provider type mismatch: uploaded as "${finalProviderType}" but saved as "${matchingSurvey.providerType}"`);
                  }
                  if (matchingSurvey.year !== surveyYearString) {
                    filterIssues.push(`Year mismatch: uploaded as "${surveyYearString}" but saved as "${matchingSurvey.year}"`);
                  }
                  
                  if (filterIssues.length > 0) {
                    handleError(
                      `Upload completed but survey not visible. ${filterIssues.join(' ')} ` +
                      `The survey exists in the database but may be filtered out. ` +
                      `Try adjusting your filters or check the survey list without filters.`,
                      { persist: true }
                    );
                  } else {
                    // Provider type matches (PHYSICIAN = Staff Physician), survey should be visible
                    console.log('✅ Survey found with matching provider type (PHYSICIAN = Staff Physician)');
                  }
                } else {
                  const storageLocation = isFirebaseMode ? 'Firebase' : 'IndexedDB';
                  handleError(
                    `Upload reported success but survey not found in ${storageLocation}. ` +
                    `Please check the browser console for details and try uploading again.`,
                    { persist: true }
                  );
                }
                
                // Remove optimistic survey
                setUploadedSurveys(prev => prev.filter(s => s.id !== surveyId));
                return;
              }
              
              console.log('✅ Verified: Survey exists in database:', {
                id: uploadedSurvey.id,
                name: uploadedSurvey.name,
                year: uploadedSurvey.year,
                providerType: uploadedSurvey.providerType
              });
              
              // CRITICAL: Use the same query key as useSurveyListQuery so the pill list updates
              // (hook uses currentYear; writing to wrong key left pills stale until manual refresh)
              const surveyListKey = queryKeys.surveyList(currentYear, undefined);
              queryClient.setQueryData(surveyListKey, (oldData: any) => {
                if (!oldData || !Array.isArray(oldData)) {
                  return [uploadedSurvey];
                }
                // Remove any optimistic/placeholder surveys and add real survey
                const withoutOptimistic = oldData.filter((s: any) => 
                  s.id !== surveyId && 
                  !(s.name === surveyName && String(s.year || '').trim() === surveyYearString)
                );
                const exists = withoutOptimistic.some((s: any) => s.id === uploadedSurvey.id);
                if (exists) {
                  return withoutOptimistic;
                }
                // Add real survey to the beginning
                return [uploadedSurvey, ...withoutOptimistic];
              });
              
              // ENTERPRISE FIX: Update local state with real survey (replace any optimistic placeholders)
              setUploadedSurveys(prev => {
                // Remove optimistic/placeholder surveys and add real one
                const withoutOptimistic = prev.filter(s => 
                  s.id !== surveyId && 
                  !(s.fileName === surveyName && s.surveyYear === surveyYearString)
                );
                const exists = withoutOptimistic.some(s => s.id === uploadedSurvey.id);
                if (exists) {
                  return withoutOptimistic;
                }
                // Add real survey
                const realUploadedSurvey = {
                  id: uploadedSurvey.id,
                  fileName: uploadedSurvey.name,
                  surveyType: uploadedSurvey.type || finalSource,
                  surveyYear: String(uploadedSurvey.year || surveyYearString),
                  uploadDate: new Date(uploadedSurvey.uploadDate || new Date()),
                  fileContent: '',
                  rows: [],
                  stats: {
                    totalRows: uploadedSurvey.rowCount || 0,
                    uniqueSpecialties: uploadedSurvey.specialtyCount || 0,
                    totalDataPoints: uploadedSurvey.dataPoints || 0
                  },
                  columnMappings: {},
                  providerType: finalProviderType,
                  source: finalSource,
                  dataCategory: finalDataCategory
                };
                return [realUploadedSurvey, ...withoutOptimistic];
              });
              
              console.log('✅ Survey added to UI after upload completion - should be visible immediately');
              
              // Step 1: Update selected survey to use real ID so the new pill is selected
              const realSurveyId = uploadedSurvey.id;
              setSelectedSurvey(realSurveyId);
              
              // Step 2: Show toast only after pills are updated (confirmed upload, UI refreshed first)
              toast.success(
                'Upload Complete',
                `${uploadedSurvey.name} uploaded successfully (${(uploadedSurvey.rowCount ?? 0).toLocaleString()} rows)`,
                5000
              );
              markJobSuccessToastShown(job.id); // Prevent UploadQueueToast from showing duplicate when user stayed on page
              
              // Step 3: Invalidate survey queries (do NOT remove - that would wipe optimistic update)
              queryClient.invalidateQueries({ queryKey: ['surveys'], exact: false });
              // Immediate refetch so the list (and pill) update from backend without waiting for delayed refetch
              refetchSurveys().catch((err) => console.warn('Immediate post-upload refetch failed (non-critical):', err));
              
              // ENTERPRISE FIX: Invalidate benchmarking/analytics queries so new survey appears in Benchmarking screen
              // This ensures the Survey Source dropdown on Benchmarking screen shows the newly uploaded survey
              queryClient.invalidateQueries({ 
                queryKey: ['benchmarking'],
                exact: false
              });
              console.log('✅ Invalidated benchmarking queries - new survey should appear in Benchmarking screen');
              
              // Also invalidate analytics cache to ensure fresh data
              try {
                const { cacheInvalidation } = await import('../features/analytics/utils/cacheInvalidation');
                cacheInvalidation.onNewSurvey();
                console.log('✅ Invalidated analytics cache - new survey data will be processed');
              } catch (cacheError) {
                console.warn('⚠️ Failed to invalidate analytics cache (non-critical):', cacheError);
              }
              
              // Step 4: Delayed refetch (2.5s) so Firebase has time to commit; merge if new survey missing
              // Immediate refetch was overwriting optimistic update before Firebase was consistent
              const FIREBASE_REFETCH_DELAY_MS = 2500;
              setTimeout(() => {
                refetchSurveys().then((refetchResult) => {
                  const data = refetchResult.data ?? [];
                  const includesNewSurvey = data.some((s: any) => s.id === uploadedSurvey.id);
                  console.log('✅ Delayed refetch completed after upload:', {
                    surveyCount: data.length,
                    includesNewSurvey,
                    newSurveyProviderType: finalProviderType,
                    currentFilter: selectedProviderType
                  });
                  // Merge: if Firebase didn't return the new survey yet, keep it in cache
                  if (!includesNewSurvey && data.length >= 0) {
                    queryClient.setQueryData(surveyListKey, (current: any) => {
                      if (!current || !Array.isArray(current)) return [uploadedSurvey];
                      const hasIt = current.some((s: any) => s.id === uploadedSurvey.id);
                      if (hasIt) return current;
                      return [uploadedSurvey, ...current];
                    });
                    console.log('✅ Merged new survey into cache (Firebase not yet consistent)');
                  }
                }).catch((err) => {
                  console.warn('⚠️ Delayed refetch failed (non-critical):', err);
                });
              }, FIREBASE_REFETCH_DELAY_MS);
              
              // ENTERPRISE FIX: Dispatch survey-uploaded event AFTER upload completes and is verified
              // This ensures provider type detection refreshes at the right time
              // The event was previously dispatched too early (when queued, not when completed)
              console.log('📢 Dispatching survey-uploaded event after successful upload verification');
              window.dispatchEvent(new CustomEvent('survey-uploaded', { 
                detail: { 
                  surveyId: realSurveyId,
                  providerType: finalProviderType,
                  surveyName: surveyName
                } 
              }));
              
              // Also dispatch storage event for cross-tab communication
              try {
                window.dispatchEvent(new StorageEvent('storage', {
                  key: 'survey-uploaded',
                  newValue: realSurveyId,
                  url: window.location.href
                }));
              } catch (storageError) {
                // StorageEvent might not be available in all contexts
                console.debug('StorageEvent not available for cross-tab communication');
              }
              
              console.log('✅ Survey upload event dispatched - Data View dropdown should update with new provider type');
              
            } catch (verifyError) {
              console.error('❌ Error verifying upload:', verifyError);
              handleError(
                `Upload completed but verification failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}. ` +
                `Please check if the survey appears in your survey list.`,
                { persist: true }
              );
            }
          };
          
          verifyUpload();
          unsubscribe();
        } else if (job.status === 'failed') {
          // Remove optimistic survey on failure
          setUploadedSurveys(prev => prev.filter(s => s.id !== surveyId));
          setSelectedSurvey(prev => (prev === surveyId ? '' : prev));
          
          // Show detailed error message with user-friendly formatting
          const errorMessage = job.error || 'Unknown error';
          console.error('❌ Upload failed:', errorMessage);
          
          // Format error message based on error type
          let formattedError = errorMessage;
          
          // Authentication errors - make them very clear and actionable
          if (errorMessage.includes('not authenticated') || errorMessage.includes('sign in') || errorMessage.includes('must be signed in')) {
            formattedError = `You must be signed in to upload surveys to Firebase. Please click the user menu in the top-right corner to sign in, then try uploading again.`;
          }
          // Permission denied errors - most common issue
          else if (errorMessage.includes('Missing or insufficient permissions') || errorMessage.includes('permission-denied') || errorMessage.includes('Permission denied')) {
            // Check if it mentions security rules deployment
            if (errorMessage.includes('firebase deploy') || errorMessage.includes('security rules')) {
              formattedError = errorMessage; // Use the detailed message from FirestoreService
            } else {
              formattedError = `Missing or insufficient permissions. This usually means:\n` +
                `1. You are not signed in - Please sign in using the user menu (top-right corner)\n` +
                `2. Firestore security rules haven't been deployed - Run: firebase deploy --only firestore:rules\n\n` +
                `Check the browser console (F12) for detailed diagnostic information.`;
            }
          }
          // Firebase configuration errors
          else if (errorMessage.includes('Firebase') && (errorMessage.includes('not available') || errorMessage.includes('not configured'))) {
            formattedError = `Firebase is not configured. Please check your .env.local file and ensure all Firebase credentials are set correctly.`;
          }
          // Pre-flight check errors - extract the actual error
          else if (errorMessage.includes('Pre-flight check failed')) {
            const actualError = errorMessage.replace('Pre-flight check failed: ', '');
            formattedError = actualError || 'Upload cannot proceed. Please check the browser console for details.';
          }
          // Firestore initialization errors
          else if (errorMessage.includes('Firestore') && (errorMessage.includes('not initialized') || errorMessage.includes('database not initialized'))) {
            formattedError = `Firebase Firestore is not initialized. Please check your Firebase configuration in .env.local file.`;
          }
          
          handleError(
            formattedError,
            { persist: true }
          );
          unsubscribe();
        }
      }
    });

    // NOTE: survey-uploaded event is now dispatched AFTER upload completes and is verified
    // (see verifyUpload function above) to ensure provider type detection refreshes at the right time
    // This prevents the Data View dropdown from updating before the survey is actually saved
    
    // Clear validation state after adding to queue
    setColumnValidation(null);
    setPreUploadValidation(null);
    setDataValidation(null);
    
    // Clear duplicate detection cache
    duplicateDetectionService.clearCache();
    } catch (error) {
      // Clear uploading state on error
      setIsUploading(false);
      
      if (surveyIdForCleanup) {
        if (addedImmediateSurvey) {
          setUploadedSurveys(prev => prev.filter(s => s.id !== surveyIdForCleanup));
          setSelectedSurvey(prev => (prev === surveyIdForCleanup ? '' : prev));
        }
        if (createdSurvey) {
          try {
            await dataService.deleteSurveyEverywhere(surveyIdForCleanup);
          } catch (cleanupError) {
            console.warn('⚠️ Failed to cleanup survey after upload error:', cleanupError);
          }
        }
      }
      throw error;
    }
  };

  // Handle duplicate resolution
  const handleDuplicateResolution = async (
    action: DuplicateResolutionAction,
    newLabel?: string
  ) => {
    if (!pendingUploadData || !duplicateCheckResult) {
      setShowDuplicateDialog(false);
      setIsUploading(false);
      return;
    }

    const existingSurvey = duplicateCheckResult.exactMatch?.survey || 
                           duplicateCheckResult.contentMatch?.survey || 
                           duplicateCheckResult.similarSurveys[0]?.survey;

    if (!existingSurvey) {
      setShowDuplicateDialog(false);
      setIsUploading(false);
      return;
    }

    setIsResolvingDuplicate(true);
    try {
      setIsUploading(true);
      
      switch (action) {
        case 'cancel':
          // Log cancellation
          await auditLog.logDuplicateResolution('cancel', existingSurvey.id);
          setShowDuplicateDialog(false);
          setIsUploading(false);
          setPendingUploadData(null);
          setDuplicateCheckResult(null);
          break;

        case 'replace':
          // Delete existing survey and proceed with upload
          console.log('🔄 Replacing existing survey:', existingSurvey.id);
          await auditLog.logDuplicateResolution('replace', existingSurvey.id);
          await dataService.deleteWithVerification(existingSurvey.id);
          console.log('✅ Existing survey deleted, proceeding with upload');
          
          // Clear cache and proceed with upload
          duplicateDetectionService.clearCache();
          setShowDuplicateDialog(false);
          setPendingUploadData(null);
          setDuplicateCheckResult(null);
          
          // Proceed with upload (skip duplicate check)
          await processUploadedData(
            pendingUploadData.parsedRows,
            pendingUploadData.file,
            pendingUploadData.headers,
            pendingUploadData.resetTimeout,
            true // skip duplicate check
          );
          break;

        case 'rename':
          // Update survey label and proceed with upload
          if (newLabel && newLabel.trim()) {
            console.log('🏷️ Renaming survey with label:', newLabel);
            await auditLog.logDuplicateResolution('rename', existingSurvey.id, undefined, newLabel);
            
            // Update the survey label in state
            setSurveyLabel(newLabel.trim());
            
            // Clear cache and proceed with upload
            duplicateDetectionService.clearCache();
            setShowDuplicateDialog(false);
            setPendingUploadData(null);
            setDuplicateCheckResult(null);
            
            // Proceed with upload (skip duplicate check, new label makes it unique)
            await processUploadedData(
              pendingUploadData.parsedRows,
              pendingUploadData.file,
              pendingUploadData.headers,
              pendingUploadData.resetTimeout,
              true // skip duplicate check
            );
          } else {
            setError('Please enter a label to differentiate this survey');
            setIsUploading(false);
          }
          break;

        case 'upload-anyway':
          // Proceed despite duplicate
          console.log('⚠️ Uploading anyway despite duplicate');
          await auditLog.logDuplicateResolution('upload-anyway', existingSurvey.id);
          
          // Clear cache and proceed with upload
          duplicateDetectionService.clearCache();
          setShowDuplicateDialog(false);
          setPendingUploadData(null);
          setDuplicateCheckResult(null);
          
          // Proceed with upload (skip duplicate check)
          await processUploadedData(
            pendingUploadData.parsedRows,
            pendingUploadData.file,
            pendingUploadData.headers,
            pendingUploadData.resetTimeout,
            true // skip duplicate check
          );
          break;
      }
    } catch (error) {
      console.error('❌ Error handling duplicate resolution:', error);
      setError(`Failed to ${action} survey: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsUploading(false);
      setShowDuplicateDialog(false);
    } finally {
      setIsResolvingDuplicate(false);
    }
  };

  const handleSurveyUpload = async () => {
    const file = files[0];
    
    // Enhanced validation with specific error messages
    const missingFields: string[] = [];
    if (!file) missingFields.push('File');
    if (!surveySource) missingFields.push('Survey Source');
    if (surveySource === 'Custom' && !customSurveySource.trim()) {
      missingFields.push('Custom Survey Source (enter name like "Solvam Carter")');
    }
    if (!dataCategory) missingFields.push('Data Category');
    if (dataCategory === 'CUSTOM' && !customDataCategory.trim()) {
      missingFields.push('Custom Data Category');
    }
    if (providerType === 'CUSTOM' && !customProviderType) {
      missingFields.push('Custom Provider Type');
    }
    if (!surveyYear) missingFields.push('Survey Year');
    
    if (missingFields.length > 0) {
      console.error('❌ Validation failed: Missing required fields', {
        missingFields,
        formState: {
          surveySource,
          customSurveySource,
          dataCategory,
          customDataCategory,
          providerType,
          customProviderType,
          surveyYear,
          hasFile: !!file
        }
      });
      handleError(`Please fill in all required fields: ${missingFields.join(', ')}`);
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

      // Sanitize headers to remove blank column names (prevents invalid empty-field writes)
      const {
        headers: sanitizedHeaders,
        indexes: sanitizedHeaderIndexes,
        removedCount
      } = sanitizeHeaders(headers);
      if (removedCount > 0) {
        console.warn(`⚠️ Dropping ${removedCount} blank header column(s) before upload.`);
      }
      headers = sanitizedHeaders;

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
            const sourceIndex = sanitizedHeaderIndexes[index];
            rowData[header] = values[sourceIndex] || '';
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
        // Do not block upload for non-fatal validation issues.
        // Users can proceed and resolve mismatches in mapping or downstream.
        console.warn('⚠️ Proceeding with upload despite validation issues:', validation);
      }

      // Progress is handled by useSmoothProgress hook

      // Parse CSV data (or use cleaned data directly)
      let parsedRows: any[];
      
      if (cleanedData) {
        // Use cleaned data directly (already in array format)
        parsedRows = cleanedData.rows.map(row => {
          const rowData: any = {};
          headers.forEach((header: string, index: number) => {
            const sourceIndex = sanitizedHeaderIndexes[index];
            rowData[header] = row[sourceIndex] || '';
          });
          return rowData;
        });
      } else {
        // Parse from CSV strings
        parsedRows = dataRows.map(row => {
          const values = parseCSVLine(row);
          const rowData: any = {};
          headers.forEach((header: string, index: number) => {
            const sourceIndex = sanitizedHeaderIndexes[index];
            rowData[header] = values[sourceIndex] || '';
          });
          return rowData;
        });
      }

      // Process the uploaded data (pass resetTimeout to prevent premature timeout)
      await processUploadedData(parsedRows, file, headers, resetTimeout);
      
      // Post-queue add: file is only queued here; survey is not in DB yet.
      // Real verification happens in the queue subscription (verifyUpload) when job completes.
      
      // CRITICAL FIX: Set isUploading to false (upload is now in background queue)
      // This allows the query to refetch when cache is invalidated
      setIsUploading(false);
      console.log('✅ Upload complete, isUploading set to false - query can now refetch');
      
      // PERFORMANCE OPTIMIZATION: Skip provider type detection refresh after upload
      // The detection service now has a 10-minute cache, which is sufficient
      // Provider types will be detected on-demand when needed (e.g., when opening selector)
      // This saves 1-2 seconds per upload, especially with many surveys
      // The cache will be cleared naturally when it expires or when user changes filters
      console.log('✅ Skipping provider type detection refresh (using cached data for performance)');
      
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
      
      // ENTERPRISE FIX: Don't do optimistic update here - wait for upload queue to complete
      // The upload happens in the background queue, and the subscription handler (line 1618)
      // will update the UI when the upload actually completes. This prevents:
      // 1. Optimistic update showing survey that doesn't exist yet
      // 2. Refetch overwriting optimistic update with empty data
      // 3. User having to manually refresh to see the survey
      // 
      // The subscription handler at line 1618 handles the UI update after upload completes
      console.log('📤 Survey queued for upload - UI will update automatically when upload completes');
      
      // ENTERPRISE FIX: Don't invalidate/refetch here - wait for upload to complete
      // The subscription handler will invalidate and refetch when the upload finishes
      // This ensures the refetch happens AFTER the survey is actually saved to the database
      console.log('⏳ Waiting for upload to complete - cache will be invalidated automatically');

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
      // Note: isUploading was already set to false before cache invalidation

    } catch (error) {
      console.error('❌ Upload error:', error);
      handleError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        persist: isPersistentError(error)
      });
      setIsUploading(false);
      completeProgress(); // Complete progress animation
    } finally {
      // Clear the timeout
      clearTimeout(uploadTimeout);
    }
  };

  const [confirmAllText, setConfirmAllText] = useState('');

  const handleClearAll = () => {
    setConfirmAllText('');
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



  const clearSurveysByIds = async (surveyIds: string[]) => {
    for (let i = 0; i < surveyIds.length; i += 1) {
      const surveyId = surveyIds[i];
      const result = await dataService.deleteSurveyEverywhere(surveyId);
      if (!result.success) {
        throw new Error(result.errors.join(' | ') || 'Delete failed');
      }
    }
  };

  const confirmClearCurrentView = () => {
    const surveyIds = rawSurveys?.map((survey: any) => survey.id) || [];
    if (surveyIds.length === 0) {
      setShowClearAllConfirmation(false);
      return;
    }
    setShowClearAllConfirmation(false);
    setShowForceClose(false);
    toast.info('Clearing current view...', 'Surveys are being removed in the background. You can keep working.');
    (async () => {
      try {
        await clearSurveysByIds(surveyIds);
        duplicateDetectionService.clearCache();
        try {
          getPerformanceOptimizedDataService().clearCache('all_surveys');
        } catch {
          /* non-critical */
        }
        await refetchSurveys();
        toast.success('Current view cleared', 'Surveys have been removed.');
      } catch (error) {
        console.error('❌ Failed to clear current view:', error);
        toast.error('Clear failed', error instanceof Error ? error.message : 'Failed to clear current view.');
        handleError(`Failed to clear current view: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    })();
  };

  const confirmClearAll = () => {
    setShowClearAllConfirmation(false);
    setShowForceClose(false);
    toast.info('Clearing all surveys...', 'This runs in the background. You can keep working.');
    const withTimeout = (promise: Promise<any>, timeoutMs: number, operation: string) =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
    (async () => {
      try {
        console.log('🗑️ Deleting all surveys...');
        try {
        const deleteAllResult = await withTimeout(
          dataService.deleteAllSurveysEverywhere(),
          15000,
          'Delete all surveys everywhere'
        );
        if (!deleteAllResult.success) {
          throw new Error(deleteAllResult.errors.join(' | ') || 'Delete all surveys failed');
        }
        console.log('✅ All surveys deleted successfully (local and cloud)');
        duplicateDetectionService.clearCache();

        const { firestoreSurveyCount, indexedDbSurveyCount } = deleteAllResult.verification;
        if ((firestoreSurveyCount ?? 0) > 0 || (indexedDbSurveyCount ?? 0) > 0) {
          console.warn('⚠️ Delete verification: surveys still present after delete', {
            firestoreSurveyCount,
            indexedDbSurveyCount
          });
        }
      } catch (deleteError) {
        console.warn('⚠️ Regular delete failed, trying force clear:', deleteError);
        try {
          // Force clear IndexedDB
          await withTimeout(dataService.forceClearDatabase(), 5000, 'Force clear local database');

          // Force clear Firestore if available (ensure cloud wipe)
          if (isFirebaseAvailable()) {
            try {
              const firestoreService = new FirestoreService();
              await withTimeout(firestoreService.forceClearDatabase(), 10000, 'Force clear Firestore');
            } catch (firestoreError) {
              console.warn('⚠️ Firestore force clear failed:', firestoreError);
            }
          }

          console.log('✅ Database force cleared successfully');
        } catch (forceError) {
          console.error('❌ Both delete methods failed:', forceError);
          throw new Error(`Failed to clear data: ${forceError instanceof Error ? forceError.message : 'Unknown error'}`);
        }
      }
      
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
        queryClient.invalidateQueries({ 
          queryKey: ['surveys', 'list'],
          exact: false // Invalidate all queries that start with ['surveys', 'list']
        });
        // Invalidate all survey data queries
        queryClient.invalidateQueries({ 
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
        // NOTE: AnalyticsDataService lives under features/analytics (case-sensitive path)
        const { AnalyticsDataService } = require('../features/analytics/services/analyticsDataService');
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
        toast.success('All surveys cleared', 'The page will reload to ensure a clean state.');
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        console.error('❌ Error during clear all operation:', error);
        toast.error('Clear failed', error instanceof Error ? error.message : 'Error clearing data.');
        handleError(`Error clearing data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    })();
  };



  const handleError = useCallback(
    (errorMessage: string, options?: { persist?: boolean }) => {
      setError(errorMessage);
      if (!options?.persist) {
        setTimeout(() => setError(''), 5000);
      }
    },
    []
  );

  const isPersistentError = (error: unknown): boolean => {
    return Boolean((error as { persist?: boolean })?.persist);
  };

  useEffect(() => {
    if (!isUploadDebugEnabled()) {
      return;
    }
    const auth = getFirebaseAuth();
    const authUser = auth?.currentUser;
    logUploadDebug('Auth context on page load', {
      uid: authUser?.uid,
      email: authUser?.email
    });
  }, []);

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

  const activeSurveySource = surveySource === 'Custom' ? customSurveySource : surveySource;
  const expectedFormats = activeSurveySource ? getExpectedFormats(activeSurveySource) : [];
  const expectedFormat = activeSurveySource ? getExpectedFormat(activeSurveySource) : undefined;
  const detectedFormat = preUploadValidation?.formatDetection?.format;
  const expectedFormatForTemplate = detectedFormat && expectedFormats.includes(detectedFormat)
    ? detectedFormat
    : expectedFormat;
  const acceptedFormat = detectedFormat && expectedFormats.includes(detectedFormat)
    ? detectedFormat
    : detectedFormat;
  const formatRequirements = acceptedFormat
    ? getFormatRequirements(acceptedFormat)
    : expectedFormats.length > 0
      ? getFormatRequirements(expectedFormats[0])
      : undefined;

  const hasFatalValidation =
    files.length > 0 &&
    (
      preUploadValidation?.structure?.errors?.some((e: ValidationError) => e.severity === 'critical') ||
      validationResult?.tier1?.errors?.some(error =>
        error.message.toLowerCase().includes('no column headers') ||
        error.message.toLowerCase().includes('no data rows')
      )
    );
  
  // DIAGNOSTIC: Log fatal validation state
  if (files.length > 0) {
    console.log('🔍 FATAL VALIDATION CHECK:', {
      hasFatalValidation,
      structureErrors: preUploadValidation?.structure?.errors?.filter((e: ValidationError) => e.severity === 'critical').map((e: ValidationError) => e.message),
      tier1Errors: validationResult?.tier1?.errors?.map(e => e.message),
      canProceed: validationResult?.canProceed
    });
  }

  return (
    <>
      <div className="w-full min-h-screen">
        <div className="w-full flex flex-col gap-4">
          
          {/* ENTERPRISE FIX: Authentication Status Banner */}
          {isFirebaseAvailable() && !authUser && (
            <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-900 mb-1">
                    Not Signed In - Surveys Will Save Locally Only
                  </h3>
                  <p className="text-sm text-amber-800 mb-2">
                    You are not signed in to Firebase. Surveys will be saved to local storage (IndexedDB) only and will <strong>NOT</strong> be saved to Firebase cloud storage.
                  </p>
                  <p className="text-xs text-amber-700">
                    <strong>To enable Firebase cloud storage:</strong> Click the user menu in the top-right corner → Sign in → Then upload your survey.
                  </p>
                </div>
              </div>
            </div>
          )}

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
                    (() => {
                      const isUploadDisabled =
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
                        // Only block on fatal structural errors
                        (hasFatalValidation || false);

                      // "Ready" means the next step is available and actionable
                      const isUploadReady = !isUploadDisabled;
                      
                      // DIAGNOSTIC: Calculate why upload might be disabled
                      const disabledReasons: string[] = [];
                      if (!surveyYear) disabledReasons.push('Survey Year is required');
                      if (!dataCategory) disabledReasons.push('Data Category is required');
                      if (dataCategory === 'CUSTOM' && !customDataCategory.trim()) disabledReasons.push('Custom Data Category is required');
                      if (!surveySource) disabledReasons.push('Survey Source is required');
                      if (surveySource === 'Custom' && !customSurveySource.trim()) {
                        disabledReasons.push('Custom Survey Source is required (e.g., enter "Solvam Carter")');
                      }
                      if (providerType === 'CUSTOM' && !customProviderType.trim()) disabledReasons.push('Custom Provider Type is required');
                      if (hasFatalValidation) disabledReasons.push('File has fatal validation errors');
                      
                      // Log diagnostic info when button is disabled
                      if (isUploadDisabled && files.length > 0) {
                        console.log('🔍 UPLOAD BUTTON DISABLED - Reasons:', {
                          reasons: disabledReasons,
                          noSurveyYear: !surveyYear,
                          isUploading,
                          isValidating,
                          noDataCategory: !dataCategory,
                          customDataCategoryMissing: dataCategory === 'CUSTOM' && !customDataCategory.trim(),
                          noSurveySource: !surveySource,
                          customSurveySourceMissing: surveySource === 'Custom' && !customSurveySource.trim(),
                          customProviderTypeMissing: providerType === 'CUSTOM' && !customProviderType.trim(),
                          hasFatalValidation,
                          validationCanProceed: validationResult?.canProceed,
                          validationErrors: validationResult?.tier1?.errors?.map(e => e.message)
                        });
                      }

                      return (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={handleSurveyUpload}
                            disabled={isUploadDisabled}
                            title={isUploadDisabled && disabledReasons.length > 0 ? disabledReasons.join('. ') : undefined}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                              isUploading
                                ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                                : `bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-500 ${
                                    // Tailwind-only "ready" cue (reliable, no custom CSS dependency)
                                    isUploadReady
                                      ? 'upload-cta-ready'
                                      : ''
                                  }`
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
                          {isUploadDisabled && disabledReasons.length > 0 && files.length > 0 && (
                            <p className="text-xs text-amber-600 text-right max-w-[200px]">
                              {disabledReasons[0]}
                              {disabledReasons.length > 1 && ` (+${disabledReasons.length - 1} more)`}
                            </p>
                          )}
                        </div>
                      );
                    })()
                  )}
                  
                  {/* Download Template Button - Secondary action (icon-only is fine) */}
                  <div className="relative group">
                    <button
                      onClick={() => handleDownloadTemplate()}
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
                 hasFatalValidation && (
                  <div className="text-xs text-red-600 text-center mt-2">
                    Fix the critical file errors below to upload
                  </div>
                )}

                {/* Upload progress is displayed in a modal overlay below */}
              </>
            )}

              {/* Selected File Preview - Apple-style Design */}
              {files.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    {/* File Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
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

                  {/* Immediate Validation Feedback */}
                  {fileValidationResult && (
                    <div className="mt-4">
                      <UploadErrorDisplay
                        validationResult={fileValidationResult}
                        isUploading={isUploading}
                        uploadProgress={progress}
                        currentStep={isValidating ? 'Validating file...' : isUploading ? 'Uploading...' : undefined}
                        onDismiss={() => setFileValidationResult(null)}
                      />
                    </div>
                  )}

                  {(hasFatalValidation || (validationResult && validationResult.totalIssues > 0)) && (
                    <div className="mt-6">
                      <UploadValidationWizard
                        isVisible={true}
                        missingColumns={columnValidation?.missingColumns}
                        unknownHeaders={columnValidation?.unknownHeaders}
                        requiredColumns={formatRequirements?.requiredColumns}
                        optionalColumns={formatRequirements?.optionalColumns}
                        detectedFormat={detectedFormat}
                        expectedFormats={expectedFormats}
                        validationResult={validationResult}
                        onDownloadRecommended={() => handleDownloadTemplate()}
                        onDownloadFormat={(format) => handleDownloadTemplate(format)}
                        onContinueUpload={!hasFatalValidation && validationResult?.canProceed ? handleSurveyUpload : undefined}
                        reviewContent={
                          parsedData &&
                          parsedData.rows.length > 0 &&
                          validationResult &&
                          validationResult.totalIssues > 0 ? (
                            <ValidationPreviewTable
                              headers={parsedData.headers}
                              rows={parsedData.rows}
                              validationResult={validationResult}
                              onDataChange={(cleaned) => {
                                setCleanedData(cleaned);
                                const newValidation = validateAll(cleaned.headers, cleaned.rows);
                                setValidationResult(newValidation);
                                setParsedData(cleaned);
                              }}
                              onValidationChange={(newValidation) => {
                                setValidationResult(newValidation);
                              }}
                              maxPreviewRows={20}
                              disabled={isValidating || isUploading}
                            />
                          ) : null
                        }
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
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-x-hidden overflow-y-visible">
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
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['surveys', 'list'] });
                    refetchSurveys();
                  }}
                  disabled={queryLoading}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full border border-gray-200 hover:border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                  aria-label="Refresh survey list"
                  title="Refresh list to see newly uploaded surveys"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${queryLoading ? 'animate-spin' : ''}`} />
                </button>
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
            </div>

            {!isUploadedSurveysCollapsed && (
              <>
                {isLoading ? (
                  <EnterpriseLoadingSpinner
                    message="Loading surveys..."
                    recordCount={uploadedSurveys.length}
                    data={uploadedSurveys}
                    progress={progress}
                    variant="inline"
                    loading={isLoading}
                  />
                ) : uploadedSurveys.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                      <ArrowUpTrayIcon className="h-8 w-8 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {selectedProviderType && selectedProviderType !== 'BOTH' 
                        ? `No ${selectedProviderType === 'PHYSICIAN' ? 'Physician' : selectedProviderType} Surveys Yet`
                        : 'Ready to Upload Your First Survey'
                      }
                    </h3>
                    <p className="text-sm text-gray-600 mb-6 text-center max-w-md">
                      {selectedProviderType && selectedProviderType !== 'BOTH' ? (
                        <>
                          You're currently viewing the <strong className="text-indigo-600">{selectedProviderType === 'PHYSICIAN' ? 'Physician' : selectedProviderType}</strong> data view.
                          <br /><br />
                          {selectedProviderType === 'PHYSICIAN' 
                            ? 'Upload a Physician survey or switch to view all surveys to see your data.'
                            : 'Upload an APP survey or switch to view all surveys to see your data.'
                          }
                        </>
                      ) : (
                        'Upload your first survey to get started with data analysis, mapping, and benchmarking.'
                      )}
                    </p>
                    {selectedProviderType && selectedProviderType !== 'BOTH' ? (
                      <div className="flex gap-3">
                        <button
                          onClick={async () => {
                            setProviderTypeContext('BOTH', 'show-all-surveys');
                            await queryClient.invalidateQueries({ queryKey: ['surveys'] });
                            setTimeout(() => refetchSurveys(), 100);
                          }}
                          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 border border-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all shadow-sm"
                        >
                          <ArrowPathIcon className="h-4 w-4" />
                          View All Surveys
                        </button>
                      </div>
                    ) : null}
                    {queryLoading && (
                      <p className="text-xs text-gray-500 mt-2">Loading surveys...</p>
                    )}
                  </div>
                ) : (
                  <>
        
                  <div
                    key={`surveys-${refreshTrigger}`}
                    className="relative z-10 flex flex-wrap items-center gap-2 overflow-x-hidden overflow-y-visible whitespace-normal pb-1"
                  >
                    {uploadedSurveys.map((survey) => {
                      const isActive = selectedSurvey === survey.id;
                      const fullLabel = getShortenedSurveyType(survey.surveyType, survey.providerType as ProviderType, survey);
                      const rowCount = survey.stats?.totalRows ?? (survey as any).rowCount ?? 0;
                      // When Data View matches survey (e.g. Physician selected), omit " - Phys" from pill; same for APP. Year omitted when it matches Select Year.
                      const providerMatchesView = (selectedProviderType === 'PHYSICIAN' && (survey.providerType === 'PHYSICIAN' || survey.providerType === 'Staff Physician')) ||
                        (selectedProviderType === 'APP' && survey.providerType === 'APP');
                      const yearMatchesView = String(survey.surveyYear || '') === String(currentYear || '');
                      const pillLabel = providerMatchesView
                        ? fullLabel.replace(/\s*-\s*Phys\s*$/i, '').replace(/\s*-\s*APP\s*$/i, '').trim() || fullLabel
                        : fullLabel;
                      const showYearInPill = !yearMatchesView;
                      const tooltipTitle = (
                        <span className="block text-center py-0.5">
                          <span className="font-medium">{fullLabel}</span>
                          <span className="text-gray-400 mx-1">·</span>
                          <span>{survey.surveyYear}</span>
                          <br />
                          <span className="text-gray-400 text-xs">
                            {(typeof rowCount === 'number' ? rowCount : 0).toLocaleString()} rows
                          </span>
                        </span>
                      );

                      return (
                        <div
                          key={survey.id}
                          className="relative inline-flex items-center"
                        >
                            <Tooltip title={tooltipTitle} placement="top" arrow enterDelay={400} leaveDelay={100}>
                            <button
                            onClick={() => {
                              if (survey.id === selectedSurvey) {
                                requestResizeRef.current?.();
                              } else {
                                setSelectedSurvey(survey.id);
                              }
                            }}
                            className={`group inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-full border-2 shadow-none outline-none transition-all duration-200 hover:shadow-none hover:outline-none hover:ring-0 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:shadow-none focus-visible:outline-none focus-visible:ring-0 max-w-[200px] min-w-0 ${
                              isActive 
                                ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 hover:border-indigo-700'
                                : survey.isOrphaned
                                  ? 'bg-red-50 text-red-900 border-red-300 hover:bg-red-100'
                                  : survey.isDuplicate
                                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                                    : 'bg-white text-indigo-600 border-indigo-300 hover:border-indigo-400 hover:bg-indigo-50'
                            }`}
                            style={{
                              boxShadow: 'none',
                              outline: 'none',
                              borderStyle: 'solid',
                              ...(isActive 
                                ? {
                                    backgroundColor: '#4f46e5',
                                    borderColor: '#4f46e5',
                                  }
                                : survey.isOrphaned
                                  ? {
                                      backgroundColor: '#fef2f2',
                                      borderColor: '#fca5a5',
                                      color: '#991b1b',
                                    }
                                  : survey.isDuplicate
                                    ? {
                                        backgroundColor: '#fffbeb',
                                        borderColor: '#fcd34d',
                                      }
                                    : {
                                        backgroundColor: '#ffffff',
                                        borderColor: '#a5b4fc',
                                        color: '#4f46e5',
                                      }
                              )
                            }}
                            onMouseEnter={(e) => {
                              const btn = e.currentTarget;
                              // Force no shadow, outline, or visual changes
                              btn.style.boxShadow = 'none';
                              btn.style.outline = 'none';
                              btn.style.borderStyle = 'solid';
                              
                              // Keep border color matching background exactly
                              if (isActive) {
                                btn.style.backgroundColor = '#4f46e5';
                                btn.style.borderColor = '#4f46e5';
                                btn.style.color = '#ffffff';
                              } else if (survey.isOrphaned) {
                                btn.style.backgroundColor = '#fee2e2';
                                btn.style.borderColor = '#f87171';
                                btn.style.color = '#7f1d1d';
                              } else if (survey.isDuplicate) {
                                btn.style.backgroundColor = '#fffbeb';
                                btn.style.borderColor = '#fcd34d';
                                btn.style.color = '#92400e';
                              } else {
                                btn.style.backgroundColor = '#eef2ff';
                                btn.style.borderColor = '#818cf8';
                                btn.style.color = '#4f46e5';
                              }
                            }}
                            onMouseLeave={(e) => {
                              const btn = e.currentTarget;
                              btn.style.boxShadow = 'none';
                              btn.style.outline = 'none';
                              btn.style.borderStyle = 'solid';
                              
                              // Reset to original colors
                              if (isActive) {
                                btn.style.backgroundColor = '#4f46e5';
                                btn.style.borderColor = '#4f46e5';
                                btn.style.color = '#ffffff';
                              } else if (survey.isOrphaned) {
                                btn.style.backgroundColor = '#fef2f2';
                                btn.style.borderColor = '#fca5a5';
                                btn.style.color = '#991b1b';
                              } else if (survey.isDuplicate) {
                                btn.style.backgroundColor = '#fffbeb';
                                btn.style.borderColor = '#fcd34d';
                                btn.style.color = '#92400e';
                              } else {
                                btn.style.backgroundColor = '#ffffff';
                                btn.style.borderColor = '#a5b4fc';
                                btn.style.color = '#4f46e5';
                              }
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.boxShadow = 'none';
                              e.currentTarget.style.outline = 'none';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.boxShadow = 'none';
                              e.currentTarget.style.outline = 'none';
                            }}
                          >
                            {survey.isOrphaned && (
                              <ExclamationTriangleIcon className="h-4 w-4 text-red-600 flex-shrink-0" title={`Orphaned survey: Expected ${survey.orphanedInfo?.expectedRowCount || 0} rows but has no data. Delete and re-upload.`} />
                            )}
                            {survey.isDuplicate && !survey.isOrphaned && (
                              <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 flex-shrink-0" title="Possible duplicate survey" />
                            )}
                            {/* ENTERPRISE FIX: Show warning icon for surveys with no data (but not orphaned) */}
                            {!survey.isOrphaned && !survey.isDuplicate && (survey.stats?.totalRows === 0 || (survey as any).rowCount === 0) && (survey as any)._uploadStatus !== 'uploading' && (
                              <ExclamationTriangleIcon className="h-4 w-4 text-gray-400 flex-shrink-0" title="This survey has no data rows. It may still be uploading or the upload may have failed." />
                            )}
                            {(survey as any)._uploadStatus === 'uploading' && (
                              <div className="flex items-center gap-1">
                                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" title="Uploading..." />
                                <span className="text-xs text-blue-600 font-medium">Uploading...</span>
                              </div>
                            )}
                            <span className="font-medium min-w-0 max-w-[140px] truncate block" title={fullLabel}>
                              {pillLabel}
                            </span>
                            {showYearInPill && (
                              <span className={`text-xs flex-shrink-0 ${isActive ? 'text-indigo-100' : survey.isDuplicate ? 'text-amber-700' : 'text-indigo-500'}`}>{survey.surveyYear}</span>
                            )}
                            <span className="flex items-center opacity-0 group-hover:opacity-60 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto flex-shrink-0 ml-1" title="Select survey and auto-resize table columns">
                              <TableCellsIcon className="h-3.5 w-3.5 text-current" strokeWidth={1.8} aria-hidden />
                            </span>
                          </button>
                          </Tooltip>
                          <button
                            onClick={(e) => removeUploadedSurvey(survey.id, e)}
                            className="ml-1 text-gray-400 hover:text-red-500 p-1 rounded-full"
                            title="Remove survey"
                            aria-label="Remove survey"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>

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
          // ENTERPRISE FIX: Only render DataPreview if survey data exists and is valid
          // This prevents infinite spinner when survey is deleted
          if (!selectedSurveyData || !selectedSurveyData.id) {
            return null;
          }
          return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="w-full overflow-x-auto">
                <DataPreview
                  file={selectedSurveyData}
                  onError={handleError}
                  globalFilters={globalFilters}
                  onFilterChange={handleFilterChange}
                  onGridReady={(api: any) => setGridApi(api)}
                  onResizeReady={(requestResize) => { requestResizeRef.current = requestResize; }}
                />
              </div>
            </div>
          );
        })()}
      </div>
    </div>
      {/* Upload progress shown only by bottom-right UploadProgressIndicator (no center overlay) */}
      {/* OPTIMIZED: Removed blocking deletion modal - deletion now happens in background */}
      {/* User can continue working while deletion processes */}

      {/* Individual Survey Delete Confirmation Modal */}
      {/* ENTERPRISE FIX: Confirmation modal closes immediately when deletion starts to avoid visual overlap with progress modal */}
      {/* Duplicate Survey Dialog */}
      {showDuplicateDialog && duplicateCheckResult && pendingUploadData && (
        <DuplicateSurveyDialog
          open={showDuplicateDialog}
          onClose={() => {
            setShowDuplicateDialog(false);
            setIsUploading(false);
            setPendingUploadData(null);
            setDuplicateCheckResult(null);
          }}
          onResolve={handleDuplicateResolution}
          isResolving={isResolvingDuplicate}
          duplicateResult={duplicateCheckResult}
          onShowExisting={async (survey) => {
            const year = survey.year ? String(survey.year).trim() : '';
            const surveyTypeLabel = (survey.name || survey.type || '').toLowerCase();
            const isCallPay = survey.dataCategory === 'CALL_PAY' || surveyTypeLabel.includes('call pay');
            const targetProviderType: UIProviderType = isCallPay ? 'CALL' : ((survey.providerType as UIProviderType) || 'PHYSICIAN');

            if (year) {
              await setCurrentYear(year);
            }
            setProviderTypeContext(targetProviderType, 'duplicate-survey');
            setShowDuplicateDialog(false);
          }}
          newSurveyMetadata={{
            name: `${surveySource === 'Custom' ? customSurveySource : surveySource} ${dataCategory === 'CALL_PAY' ? 'Call Pay' : dataCategory === 'MOONLIGHTING' ? 'Moonlighting' : dataCategory === 'COMPENSATION' ? (providerType === 'APP' ? 'APP' : 'Physician') : dataCategory} ${surveyYear}${surveyLabel ? ` - ${surveyLabel}` : ''}`,
            source: surveySource === 'Custom' ? customSurveySource : surveySource,
            dataCategory: dataCategory === 'CUSTOM' ? customDataCategory : dataCategory,
            providerType: providerType === 'CUSTOM' ? customProviderType : providerType,
            year: String(surveyYear),
            surveyLabel: surveyLabel || undefined,
            rowCount: pendingUploadData.parsedRows.length
          }}
        />
      )}

      {showDeleteConfirmation && surveyToDelete && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-busy={isDeletingSingleSurvey}>
          <div className="bg-white rounded-xl shadow-lg border border-red-200 w-full max-w-sm p-6">
            {isDeletingSingleSurvey ? (
              <>
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-red-600 border-t-transparent mb-4" aria-hidden />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Deleting survey</h3>
                  <p className="text-sm text-gray-600">
                    Removing <strong>{surveyToDelete.fileName || 'this survey'}</strong>…
                  </p>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove survey</h3>
                <p className="text-sm text-gray-700 mb-6">
                  Remove <strong>{surveyToDelete.fileName || 'this survey'}</strong> from your database? This cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirmation(false);
                      setSurveyToDelete(null);
                    }}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteSurvey}
                    className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Clear All Surveys Confirmation Modal */}
      {/* ENTERPRISE FIX: Confirmation modal closes immediately when deletion starts to avoid visual overlap with progress modal */}
      {showClearAllConfirmation && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-lg border border-red-400 w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Clear Surveys</h3>
            <p className="text-sm text-gray-700 mb-4">
              Current view: <strong>{currentYear}</strong> • <strong>{selectedProviderType}</strong>
            </p>
            
            {/* Progress indicator when deleting */}
            {isDeleting && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600 mr-3"></div>
                  <span className="text-sm font-medium text-red-800">
                    {isDeletingAll ? 'Clearing all surveys...' : 'Clearing current view...'}
                  </span>
                </div>
                <div className="mt-2 w-full bg-red-200 rounded-full h-1.5">
                  <div className="bg-red-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
                {showForceClose && (
                  <div className="mt-2 text-xs text-orange-600 text-center">
                    Operation taking longer than expected. You can close the modal if needed.
                  </div>
                )}
              </div>
            )}

            {!isDeleting && (
              <div className="mb-4 space-y-3">
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <p className="text-sm text-gray-700">
                    <strong>Clear current view</strong> removes surveys shown in the current year and Data View only.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                  <p className="text-sm text-red-700">
                    <strong>Clear all years</strong> permanently deletes every survey across all years and views.
                  </p>
                  <div className="mt-2">
                    <label className="block text-xs text-red-700 mb-1">Type CLEAR ALL to confirm</label>
                    <input
                      type="text"
                      value={confirmAllText}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmAllText(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="CLEAR ALL"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              {showForceClose ? (
                <button
                  type="button"
                  onClick={forceCloseModal}
                  className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                  Close modal
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
                onClick={confirmClearCurrentView}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isDeleting && !isDeletingAll ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Clearing view...
                  </>
                ) : (
                  'Clear current view'
                )}
              </button>
              <button
                type="button"
                onClick={() => confirmClearAll()}
                disabled={isDeleting || confirmAllText.trim().toUpperCase() !== 'CLEAR ALL'}
                className="px-4 py-2 text-sm font-semibold text-red-700 bg-white border border-red-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear all years
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { SurveyUpload };