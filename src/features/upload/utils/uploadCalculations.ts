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
    
    // More specific region detection - avoid practice setting columns
    const regionIdx = headers.findIndex(h => {
      const lower = h.toLowerCase();
      // Look for geographical region indicators
      const isGeographicRegion = (
        lower.includes('geographic') && lower.includes('region') ||
        lower === 'region' ||
        lower === 'geographic_region' ||
        lower === 'geographicregion' ||
        lower.includes('location') ||
        lower.includes('area') ||
        lower.includes('market') ||
        lower.includes('state')
      );
      
      // Exclude practice setting columns
      const isPracticeSetting = (
        lower.includes('practice') ||
        lower.includes('setting') ||
        lower.includes('inpatient') ||
        lower.includes('outpatient') ||
        lower.includes('hospital') ||
        lower.includes('medical group')
      );
      
      return isGeographicRegion && !isPracticeSetting;
    });

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
    
    // More specific region detection - avoid practice setting columns
    const regionIdx = headers.findIndex(h => {
      const lower = h.toLowerCase();
      // Look for geographical region indicators
      const isGeographicRegion = (
        lower.includes('geographic') && lower.includes('region') ||
        lower === 'region' ||
        lower === 'geographic_region' ||
        lower === 'geographicregion' ||
        lower.includes('location') ||
        lower.includes('area') ||
        lower.includes('market') ||
        lower.includes('state')
      );
      
      // Exclude practice setting columns
      const isPracticeSetting = (
        lower.includes('practice') ||
        lower.includes('setting') ||
        lower.includes('inpatient') ||
        lower.includes('outpatient') ||
        lower.includes('hospital') ||
        lower.includes('medical group')
      );
      
      return isGeographicRegion && !isPracticeSetting;
    });

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
 * Required columns for normalized data format
 * This is the new structure where each variable (TCC, wRVU, CF) gets its own row
 */
export const NORMALIZED_REQUIRED_COLUMNS = [
  'specialty',
  'provider_type',
  'geographic_region',
  'variable',
  'n_orgs',
  'n_incumbents',
  'p25',
  'p50',
  'p75',
  'p90'
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
  format?: 'normalized' | 'wide' | 'wide_variable';
  // Exception-gating diagnostics
  ambiguousTargets?: Record<string, string[]>;
  duplicateTargets?: string[];
  unknownHeaders?: string[];
  unitWarnings?: string[];
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
  const ambiguousTargets: Record<string, string[]> = {};
  const duplicateTargets: string[] = [];
  const unitWarnings: string[] = [];

  // Heuristic: flag headers with currency/unit hints that may need confirmation
  detectedColumns.forEach(col => {
    const lower = col.toLowerCase();
    if (col.includes('$') || lower.includes(' usd') || lower.includes('(usd)') || lower.includes('/wrvu')) {
      unitWarnings.push(col);
    }
  });

  // First, detect if this is a normalized format file
  // Check if it has the core normalized format structure (variable, percentiles, counts)
  const hasVariableField = detectedColumns.some(col => 
    col.toLowerCase() === 'variable' || 
    col.toLowerCase() === 'benchmark' || 
    col.toLowerCase().includes('variable') ||
    col.toLowerCase().includes('benchmark')
  );
  
  const hasPercentiles = detectedColumns.some(col => 
    col.toLowerCase().includes('p25') || 
    col.toLowerCase().includes('p50') || 
    col.toLowerCase().includes('p75') || 
    col.toLowerCase().includes('p90') ||
    col.toLowerCase().includes('25th') ||
    col.toLowerCase().includes('50th') ||
    col.toLowerCase().includes('75th') ||
    col.toLowerCase().includes('90th') ||
    col.toLowerCase() === '25th%' ||
    col.toLowerCase() === '50th%' ||
    col.toLowerCase() === '75th%' ||
    col.toLowerCase() === '90th%'
  );
  
  const hasCounts = detectedColumns.some(col => 
    col.toLowerCase().includes('n_org') || 
    col.toLowerCase().includes('n_incumbent') ||
    col.toLowerCase().includes('group count') ||
    col.toLowerCase().includes('indv count') ||
    col.toLowerCase().includes('organizations') ||
    col.toLowerCase().includes('incumbents')
  );
  
  const hasSpecialty = detectedColumns.some(col => 
    col.toLowerCase() === 'specialty' || 
    col.toLowerCase().includes('specialty')
  );
  
  // Normalized format detection: needs variable/benchmark, percentiles, counts, and specialty
  const isNormalizedFormat = hasVariableField && hasPercentiles && hasCounts && hasSpecialty && 
    // Check if key normalized columns exist (allowing for variations)
    (detectedColumns.some(col => col.toLowerCase() === 'variable' || col.toLowerCase() === 'benchmark') ||
     detectedColumns.some(col => col.toLowerCase() === 'n_orgs' || col.toLowerCase().includes('group count')) ||
     detectedColumns.some(col => col.toLowerCase() === 'n_incumbents' || col.toLowerCase().includes('indv count'))) &&
    // Has at least one percentile column
    (detectedColumns.some(col => 
      col.toLowerCase().includes('p25') || 
      col.toLowerCase().includes('p50') || 
      col.toLowerCase().includes('p75') || 
      col.toLowerCase().includes('p90') ||
      col.toLowerCase().includes('25th') ||
      col.toLowerCase().includes('50th') ||
      col.toLowerCase().includes('75th') ||
      col.toLowerCase().includes('90th')
    ));

  // Detect if this is a wide format with variable-specific columns (like Sullivan Cotter)
  const isWideVariableFormat = detectedColumns.some(col => 
    col.includes('tcc_p') || col.includes('wrvu_p') || col.includes('cf_p')
  ) && detectedColumns.includes('specialty') && detectedColumns.includes('provider_type');

  if (isNormalizedFormat) {
    // This is a normalized format file - validate against normalized columns
    // Map detected columns to normalized column names (handle variations like "Benchmark", "25th%", etc.)
    
    // Map variable/benchmark column
    const variableCol = detectedColumns.find(col => 
      col.toLowerCase() === 'variable' || 
      col.toLowerCase() === 'benchmark' ||
      col.toLowerCase().includes('variable')
    );
    if (variableCol) {
      mappedColumns['variable'] = variableCol;
    } else {
      missingColumns.push('variable');
    }
    
    // Map specialty column (required)
    const specialtyCol = detectedColumns.find(col => 
      col.toLowerCase() === 'specialty' || 
      col.toLowerCase().includes('specialty')
    );
    if (specialtyCol) {
      mappedColumns['specialty'] = specialtyCol;
    } else {
      missingColumns.push('specialty');
    }
    
    // Map geographic_region (optional for on-call compensation)
    const regionCol = detectedColumns.find(col => 
      col.toLowerCase() === 'geographic_region' || 
      col.toLowerCase() === 'geographic region' ||
      col.toLowerCase() === 'region' ||
      col.toLowerCase().includes('region')
    );
    if (regionCol) {
      mappedColumns['geographic_region'] = regionCol;
    }
    // Don't require geographic_region for normalized format
    
    // Map provider_type (optional for on-call compensation)
    const providerTypeCol = detectedColumns.find(col => 
      col.toLowerCase() === 'provider_type' || 
      col.toLowerCase() === 'provider type' ||
      col.toLowerCase() === 'providerType' ||
      col.toLowerCase().includes('provider type')
    );
    if (providerTypeCol) {
      mappedColumns['provider_type'] = providerTypeCol;
    }
    // Don't require provider_type for normalized format
    
    // Map n_orgs / Group Count
    const nOrgsCol = detectedColumns.find(col => 
      col.toLowerCase() === 'n_orgs' || 
      col.toLowerCase() === 'n_org' ||
      col.toLowerCase().includes('group count') ||
      col.toLowerCase().includes('organizations')
    );
    if (nOrgsCol) {
      mappedColumns['n_orgs'] = nOrgsCol;
    } else {
      missingColumns.push('n_orgs');
    }
    
    // Map n_incumbents / Indv Count
    const nIncumbentsCol = detectedColumns.find(col => 
      col.toLowerCase() === 'n_incumbents' || 
      col.toLowerCase() === 'n_incumbent' ||
      col.toLowerCase().includes('indv count') ||
      col.toLowerCase().includes('incumbents')
    );
    if (nIncumbentsCol) {
      mappedColumns['n_incumbents'] = nIncumbentsCol;
    } else {
      missingColumns.push('n_incumbents');
    }
    
    // Map percentile columns (p25, p50, p75, p90 or 25th%, 50th%, etc.)
    const percentileMappings: Record<string, string> = {
      'p25': 'p25',
      'p50': 'p50',
      'p75': 'p75',
      'p90': 'p90',
      '25th%': 'p25',
      '50th%': 'p50',
      '75th%': 'p75',
      '90th%': 'p90',
      '25th': 'p25',
      '50th': 'p50',
      '75th': 'p75',
      '90th': 'p90'
    };
    
    ['p25', 'p50', 'p75', 'p90'].forEach(percentile => {
      const found = detectedColumns.find(col => {
        const lower = col.toLowerCase().trim();
        return lower === percentile || 
               lower === percentileMappings[lower] ||
               (percentile === 'p25' && (lower.includes('25th') || lower === '25th%')) ||
               (percentile === 'p50' && (lower.includes('50th') || lower === '50th%')) ||
               (percentile === 'p75' && (lower.includes('75th') || lower === '75th%')) ||
               (percentile === 'p90' && (lower.includes('90th') || lower === '90th%'));
      });
      
      if (found) {
        mappedColumns[percentile] = found;
      } else {
        missingColumns.push(percentile);
      }
    });

    // Unknown headers = those not part of normalized schema
    const normalizedSet = new Set<string>([...NORMALIZED_REQUIRED_COLUMNS]);
    const unknownHeaders = detectedColumns.filter(h => {
      const lower = h.toLowerCase().trim();
      // Exclude mapped columns from unknown headers
      const isMapped = Object.values(mappedColumns).some(mapped => mapped.toLowerCase().trim() === lower);
      return !isMapped && !normalizedSet.has(h);
    });

    // Only fail validation if truly required columns are missing (not geographic_region or provider_type)
    const trulyRequired = ['variable', 'specialty', 'n_orgs', 'n_incumbents', 'p25', 'p50', 'p75', 'p90'];
    const missingRequired = missingColumns.filter(col => trulyRequired.includes(col));

    return {
      isValid: missingRequired.length === 0,
      detectedColumns,
      missingColumns: missingRequired, // Only show truly missing required columns
      mappedColumns,
      suggestions,
      errors: missingRequired.length > 0 ? [`Missing required columns: ${missingRequired.join(', ')}`] : [],
      format: 'normalized',
      ambiguousTargets,
      duplicateTargets,
      unknownHeaders,
      unitWarnings
    };
  }

  if (isWideVariableFormat) {
    // This is a wide format with variable-specific columns (Sullivan Cotter style)
    // Check for required base columns
    const requiredBaseColumns = ['specialty', 'provider_type', 'geographic_region'];
    const missingBaseColumns = requiredBaseColumns.filter(col => 
      !detectedColumns.some(header => header.toLowerCase().includes(col.toLowerCase()))
    );

    if (missingBaseColumns.length > 0) {
      missingColumns.push(...missingBaseColumns);
      errors.push(`Missing required columns: ${missingBaseColumns.join(', ')}`);
    }

    // Check for at least one variable column set
    const hasTccColumns = detectedColumns.some(col => col.includes('tcc_p'));
    const hasWrvuColumns = detectedColumns.some(col => col.includes('wrvu_p'));
    const hasCfColumns = detectedColumns.some(col => col.includes('cf_p'));

    if (!hasTccColumns && !hasWrvuColumns && !hasCfColumns) {
      errors.push('No variable columns found (expected tcc_p*, wrvu_p*, or cf_p* columns)');
    }

    // Identify unknown headers for wide-variable pattern (permit variable families)
    const knownPrefixes = ['tcc_p', 'wrvu_p', 'cf_p'];
    const knownBase = new Set<string>(['specialty','provider_type','geographic_region']);
    const unknownHeaders = detectedColumns.filter(h => {
      const lower = h.toLowerCase();
      return !knownBase.has(lower) && !knownPrefixes.some(p => lower.startsWith(p));
    });

    return {
      isValid: missingColumns.length === 0 && errors.length === 0,
      detectedColumns,
      missingColumns,
      mappedColumns,
      suggestions,
      errors,
      format: 'wide_variable',
      ambiguousTargets,
      duplicateTargets,
      unknownHeaders,
      unitWarnings
    };
  }

  // Legacy wide format validation
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
        if (compensationColumns.length > 1) {
          ambiguousTargets[requiredColumn] = compensationColumns;
        }
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

  // Derive duplicateTargets if multiple required keys resolve to same source (defensive)
  const reverseMap: Record<string, string[]> = {};
  Object.entries(mappedColumns).forEach(([target, source]) => {
    const key = source.toLowerCase();
    if (!reverseMap[key]) reverseMap[key] = [];
    reverseMap[key].push(target);
  });
  Object.entries(reverseMap).forEach(([, targets]) => {
    if (targets.length > 1) {
      duplicateTargets.push(...targets);
    }
  });

  // Unknown headers = those that didn't map to required or alias
  const knownRequired = new Set<string>(REQUIRED_COLUMNS as unknown as string[]);
  const knownAliasKeys = new Set<string>(Object.keys(COLUMN_ALIASES));
  const unknownHeaders = detectedColumns.filter(h => 
    !knownRequired.has(h) && !knownAliasKeys.has(h)
  );

  return {
    isValid: missingColumns.length === 0,
    detectedColumns,
    missingColumns,
    mappedColumns,
    suggestions,
    errors,
    format: 'wide',
    ambiguousTargets,
    duplicateTargets,
    unknownHeaders,
    unitWarnings
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

  // Check file type - support CSV and Excel files
  const fileName = file.name.toLowerCase();
  const isCSV = fileName.endsWith('.csv');
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
  
  if (!isCSV && !isExcel) {
    errors.push('File must be a CSV or Excel file (.csv, .xlsx, .xls)');
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
  providerType: string,
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

  // Validate provider type
  if (!providerType) {
    errors.push('Provider type is required');
  } else if (!['PHYSICIAN', 'APP'].includes(providerType)) {
    errors.push('Provider type must be either PHYSICIAN or APP');
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
