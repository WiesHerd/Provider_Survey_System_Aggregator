/**
 * Upload feature utility functions
 * This file contains calculations, validation, and data processing for the upload feature
 */

import { 
  UploadedSurvey, 
  UploadValidationResult, 
  UniqueValues,
  UploadGlobalFilters,
  FileWithPreview 
} from '../types/upload';
import { formatFileSize, formatDate } from '../../../shared/utils';

/**
 * Calculate survey statistics from file content
 * 
 * @param fileContent - Raw CSV file content
 * @returns Object containing total rows, unique specialties, and total data points
 */
export const calculateSurveyStats = (fileContent: string) => {
  if (!fileContent) {
    return {
      totalRows: 0,
      uniqueSpecialties: 0,
      totalDataPoints: 0
    };
  }

  const lines = fileContent.split('\n').filter(line => line.trim());
  const headers = lines[0]?.split(',').map(h => h.trim().toLowerCase()) || [];
  
  // Find specialty column index
  const specialtyIdx = headers.findIndex(h => h.includes('specialty'));
  
  // Calculate statistics
  const totalRows = Math.max(0, lines.length - 1); // Exclude header row
  const specialties = new Set<string>();
  
  if (specialtyIdx >= 0) {
    lines.slice(1).forEach(line => {
      const values = line.split(',').map(v => v.trim());
      if (values[specialtyIdx]) {
        specialties.add(values[specialtyIdx]);
      }
    });
  }
  
  const totalDataPoints = totalRows * headers.length;
  
  return {
    totalRows,
    uniqueSpecialties: specialties.size,
    totalDataPoints
  };
};

/**
 * Extract unique values from uploaded surveys
 * 
 * @param surveys - Array of uploaded surveys
 * @returns Object containing sets of unique values
 */
export const extractUniqueValues = (surveys: UploadedSurvey[]): UniqueValues => {
  const uniqueValues: UniqueValues = {
    specialties: new Set<string>(),
    providerTypes: new Set<string>(),
    regions: new Set<string>()
  };

  surveys.forEach(survey => {
    if (!survey.fileContent) return;
    
    const lines = survey.fileContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const specialtyIdx = headers.findIndex(h => h.includes('specialty'));
    const providerTypeIdx = headers.findIndex(h => h.includes('provider') || h.includes('type'));
    const regionIdx = headers.findIndex(h => h.includes('region') || h.includes('geography'));

    lines.slice(1).forEach(line => {
      const values = line.split(',').map(v => v.trim());
      if (specialtyIdx >= 0 && values[specialtyIdx]) {
        uniqueValues.specialties.add(values[specialtyIdx]);
      }
      if (providerTypeIdx >= 0 && values[providerTypeIdx]) {
        uniqueValues.providerTypes.add(values[providerTypeIdx]);
      }
      if (regionIdx >= 0 && values[regionIdx]) {
        uniqueValues.regions.add(values[regionIdx]);
      }
    });
  });

  return uniqueValues;
};

/**
 * Filter surveys based on global filters
 * 
 * @param surveys - Array of surveys to filter
 * @param filters - Global filters to apply
 * @returns Filtered array of surveys
 */
export const filterSurveys = (surveys: UploadedSurvey[], filters: UploadGlobalFilters): UploadedSurvey[] => {
  if (!filters.specialty && !filters.providerType && !filters.region) {
    return surveys;
  }

  return surveys.filter(survey => {
    if (!survey.fileContent) return false;
    
    const lines = survey.fileContent.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const specialtyIdx = headers.findIndex(h => h.includes('specialty'));
    const providerTypeIdx = headers.findIndex(h => h.includes('provider') || h.includes('type'));
    const regionIdx = headers.findIndex(h => h.includes('region') || h.includes('geography'));

    // Check if any row matches the filters
    return lines.slice(1).some(line => {
      const values = line.split(',').map(v => v.trim());
      
      const specialtyMatch = !filters.specialty || 
        (specialtyIdx >= 0 && values[specialtyIdx] === filters.specialty);
      
      const providerTypeMatch = !filters.providerType || 
        (providerTypeIdx >= 0 && values[providerTypeIdx] === filters.providerType);
      
      const regionMatch = !filters.region || 
        (regionIdx >= 0 && values[regionIdx] === filters.region);
      
      return specialtyMatch && providerTypeMatch && regionMatch;
    });
  });
};

/**
 * Required columns for survey data files
 * These are the standard columns that must be present for proper processing
 * Note: We support multiple formats (Title Case, snake_case, camelCase)
 */
export const REQUIRED_COLUMNS = [
  'Provider Name',
  'Specialty', 
  'Geographic Region',
  'Provider Type',
  'Compensation'
] as const;

/**
 * Common column aliases for fuzzy matching
 * Maps alternative column names to their standard required column names
 */
export const COLUMN_ALIASES: Record<string, string> = {
  // Provider Name variations
  'Physician Name': 'Provider Name',
  'Doctor Name': 'Provider Name',
  'Name': 'Provider Name',
  'Provider': 'Provider Name',
  'Physician': 'Provider Name',
  
  // Specialty variations
  'Specialty Type': 'Specialty',
  'Medical Specialty': 'Specialty',
  'Department': 'Specialty',
  'Service Line': 'Specialty',
  'specialty': 'Specialty',
  
  // Geographic Region variations
  'Region': 'Geographic Region',
  'Location': 'Geographic Region',
  'State': 'Geographic Region',
  'Area': 'Geographic Region',
  'Market': 'Geographic Region',
  'geographic_region': 'Geographic Region',
  'geographicRegion': 'Geographic Region',
  
  // Provider Type variations
  'Type': 'Provider Type',
  'Provider Category': 'Provider Type',
  'Physician Type': 'Provider Type',
  'Role': 'Provider Type',
  'provider_type': 'Provider Type',
  'providerType': 'Provider Type',
  
  // Compensation variations
  'Salary': 'Compensation',
  'Total Compensation': 'Compensation',
  'Annual Compensation': 'Compensation',
  'Pay': 'Compensation',
  'Income': 'Compensation'
};

/**
 * Column validation result interface
 */
export interface ColumnValidationResult {
  isValid: boolean;
  detectedColumns: string[];
  missingColumns: string[];
  mappedColumns: Record<string, string>;
  suggestions: string[];
  errors: string[];
}

/**
 * Validate CSV columns against required columns
 * 
 * @param headers - Array of column headers from CSV
 * @returns Column validation result with detailed feedback
 */
export const validateColumns = (headers: string[]): ColumnValidationResult => {
  const detectedColumns = headers.map(h => h.trim());
  const missingColumns: string[] = [];
  const mappedColumns: Record<string, string> = {};
  const suggestions: string[] = [];
  const errors: string[] = [];

  // Check each required column
  REQUIRED_COLUMNS.forEach(requiredColumn => {
    // Try exact match first
    if (detectedColumns.includes(requiredColumn)) {
      mappedColumns[requiredColumn] = requiredColumn;
      return;
    }

    // Try case-insensitive match
    const caseInsensitiveMatch = detectedColumns.find(
      col => col.toLowerCase() === requiredColumn.toLowerCase()
    );
    if (caseInsensitiveMatch) {
      mappedColumns[requiredColumn] = caseInsensitiveMatch;
      return;
    }

    // Try alias matching
    const aliasMatch = detectedColumns.find(col => 
      COLUMN_ALIASES[col] === requiredColumn
    );
    if (aliasMatch) {
      mappedColumns[requiredColumn] = aliasMatch;
      return;
    }

    // Special handling for Provider Name - optional for current functionality
    if (requiredColumn === 'Provider Name') {
      // Provider Name is optional for current survey processing
      return;
    }

    // Special handling for Compensation - check if any compensation-related columns exist
    if (requiredColumn === 'Compensation') {
      const compensationColumns = detectedColumns.filter(col => 
        col.toLowerCase().includes('comp') || 
        col.toLowerCase().includes('salary') || 
        col.toLowerCase().includes('pay') ||
        col.toLowerCase().includes('tcc') ||
        col.toLowerCase().includes('wrvu') ||
        col.toLowerCase().includes('cf')
      );
      
      if (compensationColumns.length > 0) {
        mappedColumns[requiredColumn] = compensationColumns[0]; // Use first compensation column
        return;
      }
    }

    // Column is missing - add to missing list
    missingColumns.push(requiredColumn);
    
    // Find potential matches for suggestions
    const potentialMatches = detectedColumns.filter(col => 
      col.toLowerCase().includes(requiredColumn.toLowerCase().split(' ')[0]) ||
      requiredColumn.toLowerCase().includes(col.toLowerCase().split(' ')[0])
    );
    
    if (potentialMatches.length > 0) {
      suggestions.push(`Missing "${requiredColumn}". Did you mean: ${potentialMatches.join(', ')}?`);
    } else {
      errors.push(`Required column "${requiredColumn}" not found`);
    }
  });

  return {
    isValid: missingColumns.length === 0,
    detectedColumns,
    missingColumns,
    mappedColumns,
    suggestions,
    errors
  };
};

/**
 * Enhanced file validation with column checking
 * 
 * @param file - File to validate
 * @param existingFiles - Array of existing files
 * @returns Enhanced validation result
 */
export const validateFileUpload = (
  file: File, 
  existingFiles: FileWithPreview[]
): UploadValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file type
  if (!file.name.toLowerCase().endsWith('.csv')) {
    errors.push('Only CSV files are allowed');
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${formatFileSize(maxSize)}`);
  }

  // Check for duplicate files
  const isDuplicate = existingFiles.some(existingFile => 
    existingFile.name === file.name && existingFile.size === file.size
  );
  if (isDuplicate) {
    errors.push('File already exists in the upload list');
  }

  // Check total number of files
  if (existingFiles.length >= 10) {
    errors.push('Maximum 10 files can be uploaded at once');
  }

  // Check file name length
  if (file.name.length > 100) {
    warnings.push('File name is very long and may cause display issues');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate survey form data
 * 
 * @param surveyType - Selected survey type
 * @param customSurveyType - Custom survey type if applicable
 * @param surveyYear - Selected survey year
 * @param isCustom - Whether custom survey type is selected
 * @returns Validation result
 */
export const validateSurveyForm = (
  surveyType: string,
  customSurveyType: string,
  surveyYear: string,
  isCustom: boolean
): UploadValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate survey type
  if (isCustom) {
    if (!customSurveyType.trim()) {
      errors.push('Custom survey type is required');
    } else if (customSurveyType.length > 50) {
      errors.push('Custom survey type must be less than 50 characters');
    }
  } else {
    if (!surveyType) {
      errors.push('Survey type is required');
    }
  }

  // Validate survey year
  if (!surveyYear) {
    errors.push('Survey year is required');
  } else {
    const year = parseInt(surveyYear);
    const currentYear = new Date().getFullYear();
    
    if (isNaN(year)) {
      errors.push('Survey year must be a valid number');
    } else if (year < 2000 || year > currentYear + 1) {
      warnings.push(`Survey year should be between 2000 and ${currentYear + 1}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Calculate upload summary statistics
 * 
 * @param surveys - Array of uploaded surveys
 * @returns Summary statistics
 */
export const calculateUploadSummary = (surveys: UploadedSurvey[]) => {
  const totalFiles = surveys.length;
  const totalRows = surveys.reduce((sum, survey) => sum + survey.stats.totalRows, 0);
  const totalSpecialties = surveys.reduce((sum, survey) => sum + survey.stats.uniqueSpecialties, 0);
  const totalDataPoints = surveys.reduce((sum, survey) => sum + survey.stats.totalDataPoints, 0);

  return {
    totalFiles,
    totalRows,
    totalSpecialties,
    totalDataPoints
  };
};

/**
 * Sort surveys by upload date
 * 
 * @param surveys - Array of surveys to sort
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Sorted array of surveys
 */
export const sortSurveysByDate = (surveys: UploadedSurvey[], direction: 'asc' | 'desc' = 'desc') => {
  return [...surveys].sort((a, b) => {
    const dateA = new Date(a.uploadDate).getTime();
    const dateB = new Date(b.uploadDate).getTime();
    
    return direction === 'asc' ? dateA - dateB : dateB - dateA;
  });
};

/**
 * Format survey metadata for display
 * 
 * @param survey - Survey to format
 * @returns Formatted survey metadata
 */
export const formatSurveyMetadata = (survey: UploadedSurvey) => {
  return {
    fileName: survey.fileName,
    surveyType: survey.surveyType,
    surveyYear: survey.surveyYear,
    uploadDate: formatDate(survey.uploadDate),
    stats: {
      totalRows: survey.stats.totalRows.toLocaleString(),
      uniqueSpecialties: survey.stats.uniqueSpecialties.toLocaleString(),
      totalDataPoints: survey.stats.totalDataPoints.toLocaleString()
    }
  };
};

/**
 * Generate survey preview data
 * 
 * @param fileContent - Raw CSV file content
 * @param maxRows - Maximum number of preview rows
 * @returns Preview data with headers and sample rows
 */
export const generateSurveyPreview = (fileContent: string, maxRows: number = 5) => {
  if (!fileContent) {
    return { headers: [], rows: [] };
  }

  const lines = fileContent.split('\n').filter(line => line.trim());
  const headers = lines[0]?.split(',').map(h => h.trim()) || [];
  const previewRows = lines.slice(1, maxRows + 1).map(line => 
    line.split(',').map(cell => cell.trim())
  );

  return {
    headers,
    rows: previewRows
  };
};
