import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, XMarkIcon, CalendarIcon } from '@heroicons/react/24/outline';
import DataPreview from './DataPreview';

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
}

const SurveyUpload: React.FC = () => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploadedSurveys, setUploadedSurveys] = useState<UploadedSurvey[]>([]);
  const [surveyType, setSurveyType] = useState('');
  const [customSurveyType, setCustomSurveyType] = useState('');
  const [surveyYear, setSurveyYear] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);

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

  const handleSurveyTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setIsCustom(value === 'custom');
    setSurveyType(value);
    // Clear any selected file when survey type changes
    setFiles([]);
  };

  const removeUploadedSurvey = (surveyId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setUploadedSurveys(prev => prev.filter(s => s.id !== surveyId));
    if (selectedSurvey === surveyId) {
      setSelectedSurvey(null);
    }
  };

  const handleSurveyUpload = () => {
    if (!surveyType || !surveyYear || files.length === 0) {
      handleError('Please select survey type, year and upload a file');
      return;
    }

    // Check for duplicate survey type and year combination
    const isDuplicate = uploadedSurveys.some(
      survey => survey.surveyType === (isCustom ? customSurveyType : surveyType) 
        && survey.surveyYear === surveyYear
    );

    if (isDuplicate) {
      handleError('A survey with this type and year already exists. Please remove it first.');
      return;
    }

    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const fileContent = e.target?.result as string;
      if (!fileContent) {
        handleError('Error reading file content');
        return;
      }

      // Validate CSV format and calculate stats
      try {
        const stats = calculateSurveyStats(fileContent);
        if (stats.totalRows === 0) {
          handleError('Invalid CSV file: No valid data found');
          return;
        }

        const surveyMetadata: UploadedSurveyMetadata = {
          id: file.id!,
          fileName: file.name,
          surveyType: isCustom ? customSurveyType : surveyType,
          surveyYear,
          uploadDate: new Date(),
          stats
        };

        // Store only metadata in localStorage
        try {
          const savedMetadata = JSON.parse(localStorage.getItem('surveyMetadata') || '[]');
          savedMetadata.push(surveyMetadata);
          localStorage.setItem('surveyMetadata', JSON.stringify(savedMetadata));
        } catch (error) {
          console.error('Error storing survey metadata:', error);
          handleError('Error saving survey information');
          return;
        }

        // Create full survey object with content for current session
        const newSurvey: UploadedSurvey = {
          ...surveyMetadata,
          fileContent
        };

        setUploadedSurveys(prev => [...prev, newSurvey]);
        setFiles([]);
        setSurveyType('');
        setSurveyYear('');
        setCustomSurveyType('');
        setIsCustom(false);
      } catch (error) {
        console.error('Error processing CSV:', error);
        handleError('Invalid CSV file format');
      }
    };

    reader.onerror = () => {
      handleError('Error processing file');
    };

    reader.readAsText(file);
  };

  // Load saved survey metadata on component mount
  React.useEffect(() => {
    try {
      const savedMetadataString = localStorage.getItem('surveyMetadata');
      if (!savedMetadataString) return;

      const savedMetadata = JSON.parse(savedMetadataString);
      if (!Array.isArray(savedMetadata)) {
        console.error('Invalid saved metadata format');
        return;
      }

      // Validate metadata structure
      const validMetadata = savedMetadata.filter((metadata): metadata is UploadedSurveyMetadata => {
        return metadata && 
               typeof metadata === 'object' &&
               typeof metadata.id === 'string' &&
               typeof metadata.fileName === 'string' &&
               typeof metadata.surveyType === 'string' &&
               typeof metadata.surveyYear === 'string' &&
               typeof metadata.stats === 'object';
      });

      // Create survey objects with empty content for display
      const surveys: UploadedSurvey[] = validMetadata.map(metadata => ({
        ...metadata,
        fileContent: '' // Content will be loaded on demand when viewing preview
      }));

      setUploadedSurveys(surveys);
    } catch (error) {
      console.error('Error loading saved survey metadata:', error);
      localStorage.removeItem('surveyMetadata');
    }
  }, []);

  // Generate years from 1990 to current year + 5
  const currentYear = new Date().getFullYear();
  const startYear = 1990;
  const years = Array.from(
    { length: currentYear - startYear + 6 },
    (_, i) => currentYear + 5 - i
  );

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(''), 5000);
  };

  // Add helper function to calculate survey statistics
  const calculateSurveyStats = (content: string | undefined) => {
    if (!content) {
      return {
        totalRows: 0,
        uniqueSpecialties: 0,
        totalDataPoints: 0
      };
    }

    try {
      const lines = content.split('\n');
      if (lines.length === 0) {
        return {
          totalRows: 0,
          uniqueSpecialties: 0,
          totalDataPoints: 0
        };
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const data = lines.slice(1).filter(line => line.trim());
      
      // Calculate unique specialties - case insensitive
      const specialtyIndex = headers.findIndex(h => h.toLowerCase() === 'specialty');
      const uniqueSpecialties = new Set(
        specialtyIndex >= 0 
          ? data.map(line => line.split(',')[specialtyIndex]?.trim().toLowerCase())
              .filter(Boolean)
          : []
      );

      return {
        totalRows: data.length,
        uniqueSpecialties: uniqueSpecialties.size,
        totalDataPoints: data.length * headers.length
      };
    } catch (error) {
      console.error('Error calculating survey stats:', error);
      return {
        totalRows: 0,
        uniqueSpecialties: 0,
        totalDataPoints: 0
      };
    }
  };

  return (
    <div className="w-full bg-gray-50">
      {error && (
        <div className="fixed top-4 right-4 w-96 p-4 bg-red-50 border border-red-200 rounded-lg shadow-lg z-50">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="w-full">
        {/* Form Controls */}
        <div className="w-full mb-8">
          <div className="bg-white shadow-sm px-8 py-6 rounded-lg">
            <div className="grid grid-cols-12 gap-6">
              {/* Survey Type Selection */}
              <div className="col-span-4">
                <label htmlFor="surveyType" className="block text-sm font-medium text-gray-700 mb-2">
                  Survey Type
                </label>
                <div className="relative">
                  <select
                    id="surveyType"
                    value={surveyType}
                    onChange={handleSurveyTypeChange}
                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                      bg-white text-base transition-colors duration-200"
                  >
                    <option value="">Select a survey type</option>
                    {SURVEY_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                    <option value="custom">Custom Survey Type</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                {isCustom && (
                  <input
                    type="text"
                    value={customSurveyType}
                    onChange={(e) => setCustomSurveyType(e.target.value)}
                    placeholder="Enter custom survey type"
                    className="mt-2 block w-full px-4 py-3 border border-gray-300 rounded-lg
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                      placeholder-gray-400 text-base transition-colors duration-200"
                  />
                )}
              </div>

              {/* Survey Year Selection */}
              <div className="col-span-4">
                <label htmlFor="surveyYear" className="block text-sm font-medium text-gray-700 mb-2">
                  Survey Year
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="surveyYear"
                    value={surveyYear}
                    onClick={() => setIsYearPickerOpen(true)}
                    readOnly
                    placeholder="Select year"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                      bg-white text-base cursor-pointer transition-colors duration-200"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <CalendarIcon className="h-5 w-5" />
                  </div>

                  {/* Year Picker Dropdown */}
                  {isYearPickerOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                      <div className="py-1">
                        {years.map(year => (
                          <button
                            key={year}
                            onClick={() => {
                              setSurveyYear(year.toString());
                              setIsYearPickerOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-base transition-colors duration-200
                              ${surveyYear === year.toString() 
                                ? 'bg-indigo-50 text-indigo-600 font-medium' 
                                : 'text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            {year}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="col-span-4 flex items-end space-x-3">
                <div {...getRootProps()} className="flex-1">
                  <input {...getInputProps()} />
                  <button
                    type="button"
                    className="w-full h-[46px] rounded-lg text-base font-medium bg-indigo-600 
                      hover:bg-indigo-700 text-white transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <span className="flex items-center justify-center">
                      <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                      Select File
                    </span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSurveyUpload}
                  disabled={files.length === 0 || !surveyType || !surveyYear}
                  className="flex-1 h-[46px] rounded-lg text-base font-medium
                    bg-green-600 hover:bg-green-700 text-white transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center justify-center">
                    Upload Survey
                  </span>
                </button>
              </div>
            </div>

            {/* Selected File Preview */}
            {files.length > 0 && (
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Selected File</h3>
                <div className="bg-gray-50 px-4 py-3 rounded-lg flex items-center justify-between">
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
          </div>
        </div>

        {/* Uploaded Surveys Grid */}
        {uploadedSurveys.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Uploaded Surveys</h2>
              <button
                onClick={() => {
                  localStorage.removeItem('surveyMetadata');
                  setUploadedSurveys([]);
                  setSelectedSurvey(null);
                }}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 
                  transition-colors duration-200 rounded-md hover:bg-red-50"
              >
                <XMarkIcon className="h-4 w-4 mr-1.5" />
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {uploadedSurveys.map((survey) => {
                const stats = calculateSurveyStats(survey.fileContent);
                return (
                  <div
                    key={survey.id}
                    className={`relative group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 
                      overflow-hidden cursor-pointer border border-gray-200
                      ${selectedSurvey === survey.id ? 'ring-2 ring-indigo-500' : ''}`}
                    onClick={() => setSelectedSurvey(survey.id)}
                  >
                    {/* Card Header */}
                    <div className="px-6 py-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-indigo-50 rounded-lg">
                            <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900 truncate max-w-[180px]">
                              {survey.surveyType}
                            </h3>
                            <span className="text-xs text-gray-500">
                              {new Date(survey.uploadDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          bg-indigo-50 text-indigo-700">
                          {survey.surveyYear}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500 truncate">
                        {survey.fileName}
                      </div>
                    </div>

                    {/* Card Stats */}
                    <div className="px-6 py-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-semibold text-gray-900">
                            {stats.totalRows.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Rows</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-semibold text-gray-900">
                            {stats.uniqueSpecialties.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Specialties</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-semibold text-gray-900">
                            {stats.totalDataPoints.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Data Points</div>
                        </div>
                      </div>
                    </div>

                    {/* Survey Type Badge */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => removeUploadedSurvey(survey.id, e)}
                        className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-100"
                        title="Delete survey"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Survey Type Badge */}
                    <div className="absolute bottom-0 inset-x-0 h-1.5" style={{
                      backgroundColor: survey.surveyType === 'SullivanCotter' ? '#818CF8' :
                                     survey.surveyType === 'MGMA' ? '#34D399' :
                                     survey.surveyType === 'Gallagher' ? '#F472B6' :
                                     survey.surveyType === 'ECG' ? '#FBBF24' :
                                     survey.surveyType === 'AMGA' ? '#60A5FA' : '#9CA3AF'
                    }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Data Preview */}
        {selectedSurvey && (
          <div className="bg-white shadow-sm rounded-xl overflow-hidden">
            <div className="px-8 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Survey Preview</h2>
            </div>
            <div className="w-full overflow-x-auto">
              <DataPreview
                file={uploadedSurveys.find(s => s.id === selectedSurvey)!}
                onError={handleError}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyUpload; 