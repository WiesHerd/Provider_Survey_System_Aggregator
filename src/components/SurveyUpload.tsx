import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, XMarkIcon, ChevronDownIcon, ChevronRightIcon, ArrowUpTrayIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { FormControl, Select, MenuItem, Autocomplete, TextField, Box, Typography, LinearProgress } from '@mui/material';
import DataPreview from './DataPreview';
import { getDataService } from '../services/DataService';
import { ISurveyRow } from '../types/survey';
import { EnterpriseLoadingSpinner } from '../shared/components/EnterpriseLoadingSpinner';
import { useSmoothProgress } from '../shared/hooks/useSmoothProgress';
import { useYear } from '../contexts/YearContext';
import { useProviderContext } from '../contexts/ProviderContext';
import { providerTypeDetectionService } from '../services/ProviderTypeDetectionService';
import { validateColumns } from '../features/upload/utils/uploadCalculations';
import { ColumnValidationDisplay } from '../features/upload';
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

  // Load saved surveys on component mount
  useEffect(() => {
    // Skip loading if we just uploaded a survey to prevent overriding the state
    if (justUploaded) {
      setJustUploaded(false);
      return;
    }

    // Skip if we're currently uploading
    if (isUploading) {
      return;
    }

    const loadSurveys = async () => {
      try {
        setIsLoading(true);
        
        
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Loading timeout')), 10000)
        );
        
        // Load surveys from DataService (which handles year filtering internally)
        const surveys = await Promise.race([
          dataService.getAllSurveys(),
          timeoutPromise
        ]) as any[];
        
        // Filter surveys by current year and provider type
        const surveysAny = surveys as any[];
        const yearFilteredSurveys = surveysAny.filter((survey: any) => {
          const surveyYear = survey.year || survey.surveyYear || '';
          return surveyYear === currentYear;
        });
        
        
        // Filter by provider type based on Data View selection
        // CRITICAL FIX: Also check dataCategory for Call Pay surveys
        let providerFilteredSurveys = yearFilteredSurveys;
        if (selectedProviderType !== 'BOTH') {
          providerFilteredSurveys = yearFilteredSurveys.filter((survey: any) => {
            const surveyProviderType = survey.providerType || 'PHYSICIAN'; // Default to PHYSICIAN for legacy surveys
            const surveyDataCategory = survey.dataCategory;
            
            // Check if this is a Call Pay survey (by dataCategory or name)
            const isCallPay = surveyDataCategory === 'CALL_PAY' || 
                             surveyProviderType === 'CALL' ||
                             (survey.name && survey.name.toLowerCase().includes('call pay')) ||
                             (survey.type && survey.type.toLowerCase().includes('call pay'));
            
            // If filtering for CALL type, show only Call Pay surveys
            if (selectedProviderType === 'CALL') {
              return isCallPay;
            }
            
            // For PHYSICIAN and APP views, exclude Call Pay surveys
            // Only show surveys that match the provider type AND are not Call Pay
            if (selectedProviderType === 'PHYSICIAN' || selectedProviderType === 'APP') {
              return surveyProviderType === selectedProviderType && !isCallPay;
            }
            
            // For other provider types (CUSTOM, etc.), use standard filtering
            return surveyProviderType === selectedProviderType;
          });
        }
        
        
        const allSurveys = providerFilteredSurveys;
        
        // Build lightweight survey list; fetch detailed rows only when a survey is selected
        // Remove duplicates by using a Map with a unique key
        const surveyMap = new Map();
        
        allSurveys.forEach((survey: any) => {
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
      } catch (error) {
        if (error instanceof Error && error.message === 'Loading timeout') {
          setUploadedSurveys([]);
          setSelectedSurvey(null);
        } else {
          handleError('Error loading saved surveys');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadSurveys();
  }, [dataService, currentYear, justUploaded, isUploading, selectedProviderType, selectedSurvey]);

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
    setIsValidating(true);
    
    try {
      // Step 1: Pre-upload validation (< 500ms)
      const structureValidation = await validateFileStructure(file);
      
      // Step 2: Header validation (< 1s)
      const headerValidation = await validateHeaders(file);
      
      // Step 3: Format detection
      let formatDetection;
      if (headerValidation.headers.length > 0) {
        formatDetection = detectFormat(headerValidation.headers);
      }
      
      setPreUploadValidation({
        structure: structureValidation,
        headers: headerValidation,
        formatDetection
      });
      
      // Step 4: Full column validation
      if (headerValidation.headers.length > 0) {
        const fullValidation = validateColumns(headerValidation.headers);
        setColumnValidation(fullValidation);
        
        // Step 5: If file is valid so far, do data validation (async)
        if (fullValidation.isValid && !structureValidation.errors.some((e: ValidationError) => e.severity === 'critical')) {
          // Read file for data validation
          const { text } = await readCSVFile(file);
          const rows = text.split('\n').filter(row => row.trim());
          const headers = parseCSVLine(rows[0]);
          const dataRows = rows.slice(1).filter(row => row.trim()).map(row => {
            const values = parseCSVLine(row);
            const rowData: any = {};
            headers.forEach((header: string, index: number) => {
              rowData[header] = values[index] || '';
            });
            return rowData;
          });
          
          // Validate data types
          const dataTypeValidation = validateDataTypes(headers, dataRows.slice(0, 100), formatDetection?.format); // Limit to first 100 rows for performance
          
          // Validate business rules
          const businessRuleValidation = validateBusinessRules(
            dataRows.slice(0, 100),
            headers,
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

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
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
      
      await dataService.deleteSurvey(surveyToDelete.id);
      setUploadedSurveys(prev => prev.filter(s => s.id !== surveyToDelete.id));
      
      if (selectedSurvey === surveyToDelete.id) {
        setSelectedSurvey(null);
      }
      
      completeProgress(); // Complete progress animation
      
      // Close modal after a delay to show progress
      setTimeout(() => {
        setShowDeleteConfirmation(false);
        setSurveyToDelete(null);
      }, 1000);
    } catch (error) {
      handleError('Error removing survey');
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
    
    const uploadTimeout = setTimeout(() => {
      console.error('⏰ Upload timeout - forcing completion');
      setIsUploading(false);
      completeProgress();
      handleError('Upload timed out. Please try again.');
    }, 60000);

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
      await processUploadedData(parsedRows, file, mappedHeaders);
      
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
    headers: string[]
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
    
    // Generate survey name for display
    const surveyName = `${finalSource} ${categoryDisplay} ${surveyYear}`;
    
    const survey = {
      id: surveyId,
      name: surveyName,
      year: surveyYear,
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
        columnMappings: {}
      }
    };

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

    // Save survey and data to IndexedDB
    console.log('💾 Saving survey to IndexedDB...');
    await dataService.createSurvey(survey);
    console.log('✅ Survey created successfully');
    
    console.log('💾 Saving survey data to IndexedDB...');
    await dataService.saveSurveyData(surveyId, parsedRows);
    console.log('✅ Survey data saved successfully');

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

    // Add timeout wrapper to prevent infinite hanging
    const uploadTimeout = setTimeout(() => {
      console.error('⏰ Upload timeout - forcing completion');
      setIsUploading(false);
      completeProgress();
      handleError('Upload timed out. Please try again.');
    }, 60000); // 60 second timeout (increased from 30)

    try {
      // Read the CSV file with encoding detection and normalization
      const { text, encoding, issues, normalized } = await readCSVFile(file);
      
      if (issues.length > 0) {
        console.warn('Encoding issues detected during upload:', issues);
      }
      if (normalized) {
        console.log('Character normalization applied to uploaded file');
      }
      
      const rows = text.split('\n').filter(row => row.trim());
      const headers = parseCSVLine(rows[0]);
      const dataRows = rows.slice(1).filter(row => row.trim());

      // Validate columns before processing
      const validation = validateColumns(headers);
      setColumnValidation(validation);
      
      // Check if columns need explicit mapping
      const needsMapping = checkIfMappingNeeded(headers, validation);
      
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
      
      if (!validation.isValid) {
        setError('File has missing required columns. Please check the validation details below.');
        setIsUploading(false);
        completeProgress(); // Complete progress even on validation error
        return;
      }

      // Progress is handled by useSmoothProgress hook

      // Parse CSV data
      const parsedRows = dataRows.map(row => {
        const values = parseCSVLine(row);
        const rowData: any = {};
        headers.forEach((header: string, index: number) => {
          rowData[header] = values[index] || '';
        });
        return rowData;
      });

      // Process the uploaded data
      await processUploadedData(parsedRows, file, headers);
      
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
      
      // Additional force refresh after a short delay
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 50);

      // Clear form and validation state
      setFiles([]);
      setColumnValidation(null);
      setPreUploadValidation(null);
      setDataValidation(null);
      setSurveySource('');
      setSurveyYear('');
      setCustomSurveySource('');
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
              )}
            </div>
            
            {!isUploadSectionCollapsed && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 lg:grid-cols-12 gap-4 items-end">
                {/* NEW: Data Category Selection (first dropdown) */}
                <div className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-2">
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
                          borderRadius: '8px',
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
                      className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                        placeholder-gray-400 text-sm transition-colors duration-200"
                      style={{ borderRadius: '8px' }}
                    />
                  )}
                </div>

                {/* Provider Type Selection */}
                <div className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-2">
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
                          borderRadius: '8px',
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
                      className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                        placeholder-gray-400 text-sm transition-colors duration-200"
                      style={{ borderRadius: '8px' }}
                    />
                  )}
                </div>

                {/* CHANGED: Survey Source Selection (simplified - just company names) */}
                <div className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-2">
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
                          borderRadius: '8px',
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
                      className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                        placeholder-gray-400 text-sm transition-colors duration-200"
                      style={{ borderRadius: '8px' }}
                    />
                  )}
                </div>

                {/* Survey Year Selection */}
                <div className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-2">
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
                      '& .MuiAutocomplete-input': {
                        fontSize: '14px'
                      }
                    }}
                  />
                </div>

                {/* Action Buttons - Browse and Upload */}
                <div className="col-span-2 md:col-span-4 flex items-center justify-end space-x-3">
                  <div {...getRootProps()} className="flex-shrink-0">
                    <input {...getInputProps()} />
                    <button
                      type="button"
                      className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center h-10"
                    >
                      <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                      Browse
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleSurveyUpload}
                    disabled={
                      files.length === 0 || 
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
                      // Critical validation errors
                      (preUploadValidation?.structure?.errors?.some((e: ValidationError) => e.severity === 'critical') || false) ||
                      (columnValidation && !columnValidation.isValid)
                    }
                    title={
                      files.length === 0 ? 'Please select a file to upload' :
                      !surveyYear ? 'Please enter a survey year' :
                      !dataCategory ? 'Please select a data category' :
                      (dataCategory === 'CUSTOM' && !customDataCategory.trim()) ? 'Please enter a custom data category' :
                      !surveySource ? 'Please select a survey source' :
                      (surveySource === 'Custom' && !customSurveySource.trim()) ? 'Please enter a custom survey source' :
                      (providerType === 'CUSTOM' && !customProviderType.trim()) ? 'Please enter a custom provider type' :
                      'Ready to upload'
                    }
                    className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-10 w-[140px]"
                  >
                    <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>

                {/* Upload progress is displayed in a modal overlay below */}
              </div>

              {/* Selected File Preview - Modern Design */}
              {files.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
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
                </div>
              )}

              {/* Column Validation Display */}
              {(columnValidation || preUploadValidation) && (
                <ColumnValidationDisplay 
                  validation={columnValidation || { isValid: false, detectedColumns: [], missingColumns: [], suggestions: [], errors: [] }} 
                  fileName={files[0]?.name || ''}
                  formatDetection={preUploadValidation?.formatDetection}
                  expectedFormat={surveySource ? getExpectedFormat(surveySource === 'Custom' ? customSurveySource : surveySource) : undefined}
                  surveySource={surveySource === 'Custom' ? customSurveySource : surveySource}
                  preUploadErrors={preUploadValidation?.structure?.errors || []}
                  preUploadWarnings={preUploadValidation?.structure?.warnings || []}
                  preUploadInfo={preUploadValidation?.structure?.info || []}
                  dataValidationErrors={dataValidation?.dataTypes?.errors || []}
                  dataValidationWarnings={[
                    ...(dataValidation?.dataTypes?.warnings || []),
                    ...(dataValidation?.businessRules || [])
                  ]}
                  onDownloadSample={(format) => {
                    const sampleFile = format === 'normalized' ? 'sample-normalized-format.csv' :
                                      format === 'wide' ? 'sample-wide-format.csv' :
                                      'sample-wide-variable-format.csv';
                    window.open(`/${sampleFile}`, '_blank');
                  }}
                />
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
            </>
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