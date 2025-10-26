import React from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, ChevronDownIcon, ChevronRightIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { FormControl, Select, MenuItem } from '@mui/material';
import { downloadSampleFile } from '../../utils/downloadUtils';
import { validateColumns } from '../../features/upload/utils/uploadCalculations';

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

interface UploadFormProps {
  // Form state
  providerType: ProviderType;
  customProviderType: string;
  surveyType: string;
  customSurveyType: string;
  customSurveyName: string;
  surveyYear: string;
  isCustom: boolean;
  isUploadSectionCollapsed: boolean;
  
  // File handling
  files: File[];
  columnValidation: any;
  
  // Event handlers
  onProviderTypeChange: (event: any) => void;
  onCustomProviderTypeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSurveyTypeChange: (event: any) => void;
  onCustomSurveyTypeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCustomSurveyNameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSurveyYearChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFileDrop: (acceptedFiles: File[]) => void;
  onUpload: () => void;
  onToggleUploadSection: () => void;
}

const UploadForm: React.FC<UploadFormProps> = ({
  providerType,
  customProviderType,
  surveyType,
  customSurveyType,
  customSurveyName,
  surveyYear,
  isCustom,
  isUploadSectionCollapsed,
  files,
  columnValidation,
  onProviderTypeChange,
  onCustomProviderTypeChange,
  onSurveyTypeChange,
  onCustomSurveyTypeChange,
  onCustomSurveyNameChange,
  onSurveyYearChange,
  onFileDrop,
  onUpload,
  onToggleUploadSection
}) => {
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: onFileDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  // Get available survey types based on provider type
  const availableSurveyTypes = React.useMemo(() => {
    if (providerType === 'CUSTOM') {
      return []; // Custom surveys will be handled separately
    }
    return SURVEY_OPTIONS[providerType]?.options || [];
  }, [providerType]);

  const handleDownloadSample = async () => {
    try {
      await downloadSampleFile();
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleUploadSection}
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
        <button
          onClick={handleDownloadSample}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-indigo-600 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
        >
          Download Sample
        </button>
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
                  onChange={onProviderTypeChange}
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
                  <MenuItem value="CALL">Call Pay</MenuItem>
                  <MenuItem value="CUSTOM">Custom</MenuItem>
                </Select>
              </FormControl>
              {providerType === 'CUSTOM' && (
                <input
                  type="text"
                  value={customProviderType}
                  onChange={onCustomProviderTypeChange}
                  placeholder="Enter custom provider type"
                  className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                    placeholder-gray-400 text-sm transition-colors duration-200"
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
                  onChange={onSurveyTypeChange}
                  displayEmpty
                  disabled={providerType === 'CUSTOM' && !isCustom}
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
                  {availableSurveyTypes.map((option: string) => (
                    <MenuItem key={option} value={option}>
                      {getShortenedSurveyType(option, providerType)}
                    </MenuItem>
                  ))}
                  <MenuItem value="CUSTOM">{getShortenedSurveyType('CUSTOM', providerType)}</MenuItem>
                </Select>
              </FormControl>
              {surveyType === 'CUSTOM' && (
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    value={customSurveyType}
                    onChange={onCustomSurveyTypeChange}
                    placeholder="Enter custom survey type"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                      placeholder-gray-400 text-sm transition-colors duration-200"
                  />
                  <input
                    type="text"
                    value={customSurveyName}
                    onChange={onCustomSurveyNameChange}
                    placeholder="Enter custom survey name"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                      placeholder-gray-400 text-sm transition-colors duration-200"
                  />
                </div>
              )}
            </div>

            {/* Survey Year */}
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Survey Year
              </label>
              <input
                type="text"
                value={surveyYear}
                onChange={onSurveyYearChange}
                placeholder="Enter year (e.g., 2026)"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  placeholder-gray-400 text-sm transition-colors duration-200"
              />
            </div>

            {/* File Upload */}
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload File
              </label>
              <div
                {...getRootProps()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-indigo-400 transition-colors duration-200 cursor-pointer"
              >
                <input {...getInputProps()} />
                <CloudArrowUpIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  {files.length > 0 ? files[0].name : 'Click to upload CSV file'}
                </p>
              </div>
            </div>
          </div>

          {/* Column Validation Display */}
          {files.length > 0 && columnValidation && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Column Validation for file</h4>
              {columnValidation.isValid ? (
                <div className="flex items-center text-green-600">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  All required columns are present
                </div>
              ) : (
                <div className="text-red-600">
                  <p className="font-medium">Missing required columns:</p>
                  <ul className="list-disc list-inside mt-1">
                    {columnValidation.missingColumns.map((col: string) => (
                      <li key={col}>{col}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onUpload}
              disabled={!surveyType || !surveyYear || files.length === 0 || (columnValidation && !columnValidation.isValid)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
              Upload Survey
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default UploadForm;
