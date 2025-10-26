import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, XMarkIcon, ChevronDownIcon, ChevronRightIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { FormControl, Select, MenuItem, Autocomplete, TextField } from '@mui/material';
import DataPreview from './DataPreview';
import { getDataService } from '../services/DataService';
import { ISurveyRow } from '../types/survey';
import { UnifiedLoadingSpinner } from '../shared/components/UnifiedLoadingSpinner';
import { useSmoothProgress } from '../shared/hooks/useSmoothProgress';
import { useYear } from '../contexts/YearContext';
import { useProviderContext } from '../contexts/ProviderContext';
import { validateColumns } from '../features/upload/utils/uploadCalculations';
import { ColumnValidationDisplay } from '../features/upload';
import { downloadSampleFile } from '../utils/downloadUtils';
import { clearStorage } from '../utils/clearStorage';
import { parseCSVLine } from '../shared/utils/csvParser';
import { EmptyState } from '../features/mapping/components/shared/EmptyState';
import { BoltIcon } from '@heroicons/react/24/outline';


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

// Function to shorten survey type display text based on provider type
const getShortenedSurveyType = (surveyType: string, providerType: ProviderType): string => {
  if (surveyType === 'CUSTOM') {
    return 'Custom Survey Type';
  }
  
  // Handle custom survey types by taking first 3 letters
  if (surveyType.toLowerCase().includes('custom')) {
    return surveyType.substring(0, 3).toUpperCase();
  }
  
  // Replace provider type text with shortened versions and add hyphen with spaces
  let shortenedType = surveyType;
  
  if (providerType === 'PHYSICIAN') {
    shortenedType = surveyType.replace('Physician', ' - PHYS');
  } else if (providerType === 'APP') {
    shortenedType = surveyType.replace('APP', ' - APP'); // Add hyphen with spaces before APP
  } else if (providerType === 'CALL') {
    shortenedType = surveyType.replace('Call Pay', ' - CALL');
  }
  
  return shortenedType;
};

// Provider type enum for type safety
type ProviderType = 'PHYSICIAN' | 'APP' | 'CALL' | 'CUSTOM';

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
  const [providerType, setProviderType] = useState<ProviderType>('PHYSICIAN');
  const [customProviderType, setCustomProviderType] = useState('');
  const [surveyType, setSurveyType] = useState('');
  const [customSurveyType, setCustomSurveyType] = useState('');
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

  // Add state for collapsible sections
  const [isUploadSectionCollapsed, setIsUploadSectionCollapsed] = useState(false);
  const [isUploadedSurveysCollapsed, setIsUploadedSurveysCollapsed] = useState(false);
  

  // Filter survey options based on selected provider type
  const availableSurveyTypes = useMemo(() => {
    if (providerType === 'CUSTOM') {
      // For custom provider types, show all available survey types
      return [
        'SullivanCotter Physician', 'MGMA Physician', 'Gallagher Physician', 'ECG Physician', 'AMGA Physician',
        'SullivanCotter APP', 'MGMA APP', 'Gallagher APP', 'ECG APP', 'AMGA APP',
        'SullivanCotter Call Pay', 'MGMA Call Pay', 'Gallagher Call Pay', 'ECG Call Pay', 'AMGA Call Pay'
      ];
    }
    return SURVEY_OPTIONS[providerType]?.options || [];
  }, [providerType]);

  // Update surveyYear when currentYear changes
  useEffect(() => {
    setSurveyYear(currentYear);
  }, [currentYear]);

  // Reset survey type when provider type changes
  useEffect(() => {
    setSurveyType('');
    setIsCustom(false);
  }, [providerType]);









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
        let providerFilteredSurveys = yearFilteredSurveys;
        if (selectedProviderType !== 'BOTH') {
          providerFilteredSurveys = yearFilteredSurveys.filter((survey: any) => {
            const surveyProviderType = survey.providerType || 'PHYSICIAN'; // Default to PHYSICIAN for legacy surveys
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substring(7)
    }));
    setFiles(prev => [...prev, ...newFiles]);
    setError('');
    setColumnValidation(null); // Clear previous validation
  }, []);

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

  const handleProviderTypeChange = (e: any) => {
    const newProviderType = e.target.value as ProviderType;
    setProviderType(newProviderType);
    setCustomProviderType(''); // Reset custom provider type
    setSurveyType(''); // Reset survey type
    setCustomSurveyType(''); // Reset custom survey type
    setCustomSurveyName(''); // Reset custom survey name
    setIsCustom(false); // Reset custom flag
    setFiles([]); // Clear any selected file
  };

  const handleSurveyTypeChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    const value = e.target.value as string;
    setIsCustom(value === 'CUSTOM');
    setSurveyType(value);
    setCustomSurveyName(''); // Reset custom survey name
    // Clear any selected file when survey type changes
    setFiles([]);
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

  const handleSurveyUpload = async () => {
    const file = files[0];
    if (!file || !surveyType || !surveyYear || 
        (providerType === 'CUSTOM' && !customProviderType) ||
        (surveyType === 'CUSTOM' && !customSurveyType.trim())) {
      handleError('Please fill in all required fields');
      return;
    }

    setIsUploading(true);
    startProgress(); // Start progress animation

    try {
      // Read the CSV file
      const text = await file.text();
      
      const rows = text.split('\n').filter(row => row.trim());
      const headers = parseCSVLine(rows[0]);
      const dataRows = rows.slice(1).filter(row => row.trim());

      // Validate columns before processing
      const validation = validateColumns(headers);
      setColumnValidation(validation);
      
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

      // Progress is handled by useSmoothProgress hook

      // Create survey object
      const surveyId = crypto.randomUUID();
      const defaultSurveyName = file.name.replace('.csv', '');
      const surveyName = (surveyType === 'CUSTOM' && customSurveyType.trim()) ? customSurveyType.trim() : defaultSurveyName;
      const surveyTypeName = isCustom ? customSurveyType : surveyType;
      
      const survey = {
        id: surveyId,
        name: surveyName,
        year: surveyYear,
        type: surveyTypeName,
        providerType: providerType === 'CUSTOM' ? customProviderType : providerType,
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
        columnMappings: {}
      };

      setUploadedSurveys(prev => [...prev, immediateSurvey]);
      setSelectedSurvey(surveyId);
      setRefreshTrigger(prev => prev + 1);

      // Progress is handled by useSmoothProgress hook

      // Save survey and data to IndexedDB
      await dataService.createSurvey(survey);
      await dataService.saveSurveyData(surveyId, parsedRows);

      // Progress is handled by useSmoothProgress hook

      // Refresh provider type detection to auto-switch to the uploaded data type
      try {
        await refreshProviderTypeDetection();
      } catch (error) {
      }

      // State already updated above, just set the flag to prevent useEffect override
      setJustUploaded(true);
      
      // Additional force refresh after a short delay
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 50);

      // Clear form
      setFiles([]);
      setSurveyType('');
      setSurveyYear('');
      setCustomSurveyType('');
      setIsCustom(false);

      // Show success message
      completeProgress(); // Complete progress animation
      setTimeout(() => {
        setIsUploading(false);
      }, 1000);

    } catch (error) {
      handleError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsUploading(false);
      completeProgress(); // Complete progress animation
    }
  };

  const handleClearAll = () => {
    setShowClearAllConfirmation(true);
  };



  const confirmClearAll = async () => {
    try {
      setIsDeleting(true);
      setIsDeletingAll(true);
      startProgress(); // Start smooth progress animation
      
      // Clear all surveys first
      await dataService.deleteAllSurveys();
      
      // Clear both possible IndexedDB databases
      await clearStorage.clearIndexedDB(); // SurveyAggregatorDB
      
      // Also clear the old survey-data database if it exists
      try {
        const oldDbRequest = indexedDB.deleteDatabase('survey-data');
        await new Promise((resolve, reject) => {
          oldDbRequest.onsuccess = () => {
            resolve(true);
          };
          oldDbRequest.onerror = () => {
            resolve(true); // Not an error if it doesn't exist
          };
        });
      } catch (error) {
      }
      
      // Clear localStorage as well
      clearStorage.clearLocalStorage();
      
      setUploadedSurveys([]);
      setSelectedSurvey(null);
      
      
      // Complete progress and show success message
      completeProgress();
      
      // Close modal after showing progress
      setTimeout(() => {
        setShowClearAllConfirmation(false);
        alert('✅ All data cleared successfully! The page will reload to ensure a clean state.');
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      handleError('Error clearing data');
      completeProgress(); // Complete progress even on error
      
      // Close modal after showing progress even on error
      setTimeout(() => {
        setShowClearAllConfirmation(false);
      }, 1500);
    } finally {
      setTimeout(() => {
        setIsDeleting(false);
        setIsDeletingAll(false);
      }, 1800);
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
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      await downloadSampleFile();
                    } catch (error) {
                    }
                  }}
                  className="inline-flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-all duration-200 border border-gray-300"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Sample
                </button>
              </div>
            </div>
            
            {!isUploadSectionCollapsed && (
              <>
                <div className="grid grid-cols-12 gap-4">
                {/* Provider Type Selection */}
                <div className="col-span-3">
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

                {/* Survey Type Selection */}
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Survey Type
                  </label>
                  <FormControl fullWidth>
                    <Select
                      value={surveyType}
                      onChange={handleSurveyTypeChange}
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
                        {providerType === 'CUSTOM' ? 'Enter custom type below' : 'Select a survey type'}
                      </MenuItem>
                      {availableSurveyTypes.map((option: string) => (
                        <MenuItem key={option} value={option}>
                          {getShortenedSurveyType(option, providerType)}
                        </MenuItem>
                      ))}
                      <MenuItem value="CUSTOM">{getShortenedSurveyType('CUSTOM', providerType)}</MenuItem>
                    </Select>
                  </FormControl>
                  {surveyType === 'CUSTOM' && (
                    <input
                      type="text"
                      value={customSurveyType}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomSurveyType(e.target.value)}
                      placeholder="Enter custom survey type name"
                      className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                        placeholder-gray-400 text-sm transition-colors duration-200"
                      style={{ borderRadius: '8px' }}
                    />
                  )}
                </div>

                {/* Survey Year Selection */}
                <div className="col-span-3">
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

                {/* Action Buttons */}
                <div className="col-span-3 flex items-end justify-end space-x-3">
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
                      // Survey type validation
                      (surveyType === 'CUSTOM' && !customSurveyType.trim()) ||
                      (surveyType !== 'CUSTOM' && !surveyType) ||
                      // Provider type validation  
                      (providerType === 'CUSTOM' && !customProviderType.trim())
                    }
                    title={
                      files.length === 0 ? 'Please select a file to upload' :
                      !surveyYear ? 'Please enter a survey year' :
                      (surveyType === 'CUSTOM' && !customSurveyType.trim()) ? 'Please enter a custom survey type' :
                      (surveyType !== 'CUSTOM' && !surveyType) ? 'Please select a survey type' :
                      (providerType === 'CUSTOM' && !customProviderType.trim()) ? 'Please enter a custom provider type' :
                      'Ready to upload'
                    }
                    className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-10"
                  >
                    <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>

                {/* Upload progress is displayed in a modal overlay below */}
              </div>

              {/* Selected File Preview */}
              {files.length > 0 && (
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Selected File</h3>
                  <div className="bg-gray-50 px-3 py-2 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-gray-500">
                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm font-medium">{files[0].name}</span>
                      </div>
                      {surveyType && surveyYear ? (
                        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {surveyType === 'CUSTOM' ? customSurveyType : surveyType} • {surveyYear}
                        </span>
                      ) : (
                        <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                          ⚠️ Select Provider Type and Survey Type to continue
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => files[0].id && removeFile(files[0].id)}
                      className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
                      title="Remove file"
                      aria-label="Remove selected file"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

                             {/* Column Validation Display */}
               {columnValidation && (
                 <ColumnValidationDisplay 
                   validation={columnValidation} 
                   fileName={files[0]?.name || ''} 
                 />
               )}
            </>
            )}
          </div>
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
                <button
                  onClick={handleClearAll}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <XMarkIcon className="h-4 w-4 mr-1.5" />
                  Clear All
                </button>
              )}
            </div>

            {!isUploadedSurveysCollapsed && (
              <>
                
                {isLoading ? (
                  <UnifiedLoadingSpinner
                    message="Loading surveys..."
                    recordCount={uploadedSurveys.length}
                    progress={progress}
                    showProgress={uploadedSurveys.length > 0}
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
                            <span className="font-medium">{getShortenedSurveyType(survey.surveyType, survey.providerType as ProviderType)}</span>
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
        {selectedSurvey && (() => {
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
      {/* Upload Progress Modal - Use Unified Spinner */}
      {isUploading && (
        <UnifiedLoadingSpinner
          message="Uploading survey..."
          recordCount={0}
          progress={progress}
          showProgress={true}
        />
      )}
      {/* Deleting Progress Modal - Use Unified Spinner */}
      {isDeleting && (
        <UnifiedLoadingSpinner
          message={isDeletingAll ? "Clearing all surveys..." : "Deleting survey..."}
          recordCount={0}
          progress={progress}
          showProgress={true}
        />
      )}

      {/* Individual Survey Delete Confirmation Modal */}
      {showDeleteConfirmation && surveyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
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
                  <span className="text-sm font-medium text-red-800">Clearing all surveys...</span>
                </div>
                <div className="mt-2 w-full bg-red-200 rounded-full h-1.5">
                  <div className="bg-red-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowClearAllConfirmation(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
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
                  'Delete'
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