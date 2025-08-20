import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, XMarkIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { FormControl, InputLabel, Select, MenuItem, Autocomplete, TextField } from '@mui/material';
import DataPreview from './DataPreview';
import { getDataService } from '../services/DataService';
import { ISurveyData, ISurveyRow, ISurveyMetadata } from '../types/survey';
import { TableFilters } from './TableFilters';
import LoadingSpinner from './ui/loading-spinner';
import { useYear } from '../contexts/YearContext';


const SURVEY_OPTIONS = [
  'SullivanCotter',
  'MGMA',
  'Gallagher',
  'ECG',
  'AMGA'
];

interface FileWithPreview extends File {
  preview?: string;
  id?: string;
  surveyType?: string;
  surveyYear?: string;
  uploadDate?: Date;
}

interface StorageSurvey {
  id: string;
  metadata: ISurveyMetadata & {
    surveyType: string;
    fileContent: string;
  };
}

interface UploadedSurveyMetadata {
  id: string;
  fileName: string;
  surveyType: string;
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
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploadedSurveys, setUploadedSurveys] = useState<UploadedSurvey[]>([]);
  const [surveyType, setSurveyType] = useState('');
  const [customSurveyType, setCustomSurveyType] = useState('');
  const [surveyYear, setSurveyYear] = useState(currentYear);
  const [isCustom, setIsCustom] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  
  // Add global filter state
  const [globalFilters, setGlobalFilters] = useState({
    specialty: '',
    providerType: '',
    region: ''
  });

  // Add state for unique values across all surveys
  const [uniqueValues, setUniqueValues] = useState<{
    specialties: Set<string>;
    providerTypes: Set<string>;
    regions: Set<string>;
  }>({
    specialties: new Set(),
    providerTypes: new Set(),
    regions: new Set()
  });

  // Add state for collapsible sections
  const [isUploadSectionCollapsed, setIsUploadSectionCollapsed] = useState(false);
  const [isUploadedSurveysCollapsed, setIsUploadedSurveysCollapsed] = useState(false);

  // Update surveyYear when currentYear changes
  useEffect(() => {
    setSurveyYear(currentYear);
  }, [currentYear]);







  // Update unique values when surveys change
  useEffect(() => {
    const newValues = {
      specialties: new Set<string>(),
      providerTypes: new Set<string>(),
      regions: new Set<string>()
    };

    uploadedSurveys.forEach(survey => {
      if (!survey.fileContent) return;  // Skip if no file content
      
      const lines = survey.fileContent.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const specialtyIdx = headers.findIndex(h => h.includes('specialty'));
      const providerTypeIdx = headers.findIndex(h => h.includes('provider') || h.includes('type'));
      const regionIdx = headers.findIndex(h => h.includes('region') || h.includes('geography'));

      lines.slice(1).forEach(line => {
        const values = line.split(',').map(v => v.trim());
        if (specialtyIdx >= 0) newValues.specialties.add(values[specialtyIdx]);
        if (providerTypeIdx >= 0) newValues.providerTypes.add(values[providerTypeIdx]);
        if (regionIdx >= 0) newValues.regions.add(values[regionIdx]);
      });
    });

    setUniqueValues(newValues);
  }, [uploadedSurveys]);

  // Handle global filter changes
  const handleFilterChange = (filterName: string, value: string) => {
    setGlobalFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Load saved surveys on component mount
  useEffect(() => {
    const loadSurveys = async () => {
      try {
        setIsLoading(true);
        
        console.log('Loading surveys for year:', currentYear);
        
        // Load from both regular storage and year-specific storage
        const surveys = await dataService.getAllSurveys();
        console.log('Loaded surveys from regular storage:', surveys);
        
        // Also load year-specific surveys
        const yearService = new (await import('../services/YearManagementService')).YearManagementService();
        const yearSurveys = await yearService.getYearData(currentYear, 'surveys');
        console.log(`Loaded surveys from year ${currentYear}:`, yearSurveys);
        console.log('Year surveys type:', typeof yearSurveys);
        console.log('Year surveys is array:', Array.isArray(yearSurveys));
        if (yearSurveys && typeof yearSurveys === 'object') {
          console.log('Year surveys keys:', Object.keys(yearSurveys));
        }
        
        // Handle case where yearSurveys might not be an array
        const yearSurveysArray = Array.isArray(yearSurveys) ? yearSurveys : [];
        console.log('Year surveys array:', yearSurveysArray);
        
        // Combine surveys from both sources
        const allSurveys = [...surveys, ...yearSurveysArray];
        console.log('Combined surveys:', allSurveys);
        
        // Build lightweight survey list; fetch detailed rows only when a survey is selected
        const processedSurveys = allSurveys.map((survey: any) => ({
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
        }));

        console.log('Processed surveys:', processedSurveys);
        setUploadedSurveys(processedSurveys);
        // Auto-select first survey if none selected
        if (!selectedSurvey && processedSurveys.length > 0) {
          setSelectedSurvey(processedSurveys[0].id);
        }
      } catch (error) {
        console.error('Error loading surveys:', error);
        handleError('Error loading saved surveys');
      } finally {
        setIsLoading(false);
      }
    };

    loadSurveys();
  }, [dataService, currentYear]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => Object.assign(file, {
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substring(7)
    }));
    setFiles(prev => [...prev, ...newFiles]);
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

  const handleSurveyTypeChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    const value = e.target.value as string;
    setIsCustom(value === 'custom');
    setSurveyType(value);
    // Clear any selected file when survey type changes
    setFiles([]);
  };

  const removeUploadedSurvey = async (surveyId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await dataService.deleteSurvey(surveyId);
      setUploadedSurveys(prev => prev.filter(s => s.id !== surveyId));
      if (selectedSurvey === surveyId) {
        setSelectedSurvey(null);
      }
    } catch (error) {
      console.error('Error removing survey:', error);
      handleError('Error removing survey');
    }
  };

  const handleSurveyUpload = async () => {
    const file = files[0];
    if (!file || !surveyType || !surveyYear) {
      handleError('Please fill in all required fields');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Read the CSV file
      const text = await file.text();
      const rows = text.split('\n').filter(row => row.trim());
      const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const dataRows = rows.slice(1).filter(row => row.trim());

      setUploadProgress(30);

      // Parse CSV data
      const parsedRows = dataRows.map(row => {
        const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
        const rowData: any = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });
        return rowData;
      });

      setUploadProgress(60);

      // Create survey object
      const surveyId = crypto.randomUUID();
      const surveyName = file.name.replace('.csv', '');
      const surveyTypeName = isCustom ? customSurveyType : surveyType;
      
      const survey = {
        id: surveyId,
        name: surveyName,
        year: surveyYear,
        type: surveyTypeName,
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

      setUploadProgress(80);

      // Save survey and data to IndexedDB with year-specific storage
      console.log('Saving survey to data service:', survey);
      await dataService.createSurvey(survey);
      console.log('Saving survey data to data service:', surveyId);
      await dataService.saveSurveyData(surveyId, parsedRows);
      
      // Also save to year-specific storage
      console.log('Saving to year-specific storage:', surveyYear);
      const yearService = new (await import('../services/YearManagementService')).YearManagementService();
      await yearService.saveYearData(surveyYear, 'surveys', [survey]);
      await yearService.saveYearData(surveyYear, 'surveyData', parsedRows);

      setUploadProgress(100);

      console.log('Survey uploaded successfully:', {
        surveyId: surveyId,
        rowCount: parsedRows.length
      });

      // Update local state and select the new survey
      setUploadedSurveys(prev => {
        const updated = [
          ...prev,
          {
            id: surveyId,
            fileName: surveyName,
            surveyType: surveyTypeName,
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
          }
        ];
        return updated;
      });
      
      setSelectedSurvey(surveyId);

      // Clear form
      setFiles([]);
      setSurveyType('');
      setSurveyYear('');
      setCustomSurveyType('');
      setIsCustom(false);

      // Show success message
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 1000);

    } catch (error) {
      console.error('Error uploading survey:', error);
      handleError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClearAll = async () => {
    try {
      // Confirm destructive action
      const confirmDelete = window.confirm('This will delete ALL surveys from Azure. Type OK to proceed.');
      if (!confirmDelete) return;
      setIsDeleting(true);
      setDeleteProgress(10);
      await dataService.deleteAllSurveys();
      setDeleteProgress(90);
      setUploadedSurveys([]);
      setSelectedSurvey(null);
    } catch (error) {
      console.error('Error clearing all surveys:', error);
      handleError('Error clearing surveys');
    } finally {
      setDeleteProgress(100);
      setTimeout(() => {
        setIsDeleting(false);
        setDeleteProgress(0);
      }, 600);
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
          


          {/* Upload Form Section */}
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
              <a
                href={process.env.PUBLIC_URL + '/sample-survey.csv'}
                download="sample-survey.csv"
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-indigo-600 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              >
                Download Sample
              </a>
            </div>
            
            {!isUploadSectionCollapsed && (
              <>
                <div className="grid grid-cols-12 gap-4">
                {/* Survey Type Selection */}
                <div className="col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Survey Type
                  </label>
                  <FormControl fullWidth>
                    <Select
                      value={surveyType}
                      onChange={handleSurveyTypeChange}
                      displayEmpty
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
                        Select a survey type
                      </MenuItem>
                      {SURVEY_OPTIONS.map(option => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                      <MenuItem value="custom">Custom Survey Type</MenuItem>
                    </Select>
                  </FormControl>
                  {isCustom && (
                    <input
                      type="text"
                      value={customSurveyType}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomSurveyType(e.target.value)}
                      placeholder="Enter custom survey type"
                      className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                        placeholder-gray-400 text-sm transition-colors duration-200"
                    />
                  )}
                </div>

                {/* Survey Year Selection */}
                <div className="col-span-4">
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
                <div className="col-span-4 flex items-end space-x-3">
                  <div {...getRootProps()} className="flex-1">
                    <input {...getInputProps()} />
                    <button
                      type="button"
                      className="w-full px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 flex items-center justify-center h-10"
                    >
                      <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                      Select File
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleSurveyUpload}
                    disabled={files.length === 0 || !surveyType || !surveyYear || isUploading}
                    className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-10"
                  >
                    {isUploading ? 'Uploading...' : 'Upload Survey'}
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
                      {surveyType && surveyYear && (
                        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {isCustom ? customSurveyType : surveyType} • {surveyYear}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => files[0].id && removeFile(files[0].id)}
                      className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
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
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 transition-colors duration-200 rounded-lg hover:bg-red-50"
                >
                  <XMarkIcon className="h-4 w-4 mr-1.5" />
                  Clear All
                </button>
              )}
            </div>

            {!isUploadedSurveysCollapsed && (
              <>
                {isLoading ? (
                  <LoadingSpinner message="Loading surveys..." size="lg" variant="primary" />
                ) : uploadedSurveys.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <p className="text-gray-500">No surveys uploaded yet</p>
                  </div>
                ) : (
                  <div className="relative z-10 flex items-center gap-2 overflow-x-auto overflow-y-visible whitespace-nowrap pb-1">
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
                            onClick={() => setSelectedSurvey(survey.id)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-full border transition-colors duration-200 ${isActive ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                            title={`${survey.surveyType} • ${survey.surveyYear}`}
                          >
                            <span className="font-medium">{survey.surveyType}</span>
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
                )}
              </>
            )}
          </div>

        {/* Data Preview */}
        {selectedSurvey && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="w-full overflow-x-auto">
              <DataPreview
                file={uploadedSurveys.find(s => s.id === selectedSurvey)!}
                onError={handleError}
                globalFilters={globalFilters}
                onFilterChange={handleFilterChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
      {/* Upload Progress Modal */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="upload-modal-title">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 w-full max-w-md p-6">
            <div>
              <h3 id="upload-modal-title" className="text-lg font-semibold text-gray-900">Uploading survey…</h3>
              <p className="mt-1 text-sm text-gray-500">Please keep this tab open while we process your file.</p>
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm text-gray-500">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="h-2.5 rounded-full transition-all duration-300 ease-out bg-emerald-600" style={{ width: `${uploadProgress}%` }} />
              </div>
              <div className="mt-3 text-xs text-gray-500">
                {uploadProgress < 100 ? 'Processing survey data…' : 'Upload complete! Finalizing…'}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Deleting Progress Modal */}
      {isDeleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 w-full max-w-md p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 id="delete-modal-title" className="text-lg font-semibold text-gray-900">Clearing surveys…</h3>
                <p className="mt-1 text-sm text-gray-500">Deleting all surveys from Azure. This can take a few seconds.</p>
              </div>
              <LoadingSpinner size="sm" variant="primary" />
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm text-gray-500">{deleteProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="h-2.5 rounded-full transition-all duration-300 ease-out bg-red-600" style={{ width: `${deleteProgress}%` }} />
              </div>
              <div className="mt-3 text-xs text-gray-500">
                {deleteProgress < 100 ? 'Removing survey data…' : 'All surveys cleared.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SurveyUpload; 