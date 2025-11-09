/**
 * Format Detection System
 * 
 * Detects CSV format with confidence scoring and maps to survey sources
 */

export type CSVFormat = 'normalized' | 'wide' | 'wide_variable';

export interface FormatDetectionResult {
  format: CSVFormat | undefined;
  confidence: number; // 0-100
  detectedColumns: string[];
  expectedFormat?: CSVFormat;
  formatMismatch?: boolean;
  suggestions: string[];
}

/**
 * Survey source to format mapping
 */
export const SURVEY_FORMAT_MAP: Record<string, CSVFormat> = {
  'MGMA': 'wide_variable',
  'SullivanCotter': 'wide_variable',
  'Sullivan Cotter': 'wide_variable',
  'Gallagher': 'normalized',
  'ECG': 'wide',
  'AMGA': 'normalized'
};

/**
 * Detect CSV format from headers with confidence scoring
 */
export function detectFormat(headers: string[]): FormatDetectionResult {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  const detectedColumns = headers;
  
  // Check for wide_variable format (tcc_p25, wrvu_p25, cf_p25, etc.) - highest priority
  const wideVariableResult = detectWideVariableFormat(lowerHeaders);
  if (wideVariableResult.confidence > 50) {
    return {
      ...wideVariableResult,
      detectedColumns
    };
  }

  // Check for wide format SECOND (before normalized) to catch files with wide format columns
  // This prevents misclassification of wide format files that happen to have a "variable" column
  const wideResult = detectWideFormat(lowerHeaders);
  if (wideResult.confidence > 50) {
    return {
      ...wideResult,
      detectedColumns
    };
  }

  // Check for normalized format LAST (variable, p25, p50, p75, p90, n_orgs, n_incumbents)
  // Only if it doesn't match wide format patterns
  const normalizedResult = detectNormalizedFormat(lowerHeaders);
  if (normalizedResult.confidence > 50) {
    return {
      ...normalizedResult,
      detectedColumns
    };
  }

  // No format detected with sufficient confidence
  return {
    format: undefined,
    confidence: 0,
    detectedColumns,
    suggestions: [
      'Could not detect file format',
      'Ensure file has required columns for one of the supported formats',
      'Check sample files for correct format examples'
    ]
  };
}

/**
 * Detect wide_variable format (Sullivan Cotter, MGMA style)
 */
function detectWideVariableFormat(lowerHeaders: string[]): FormatDetectionResult {
  const requiredBase = ['specialty', 'provider_type'];
  const hasBaseColumns = requiredBase.every(col => 
    lowerHeaders.some(h => h === col || h.includes(col))
  );

  if (!hasBaseColumns) {
    return { format: undefined, confidence: 0, detectedColumns: [], suggestions: [] };
  }

  // Check for variable-specific percentile columns
  const variablePatterns = [
    { prefix: 'tcc_p', name: 'TCC' },
    { prefix: 'wrvu_p', name: 'wRVU' },
    { prefix: 'cf_p', name: 'CF' }
  ];

  const foundVariables: string[] = [];
  const percentileColumns = ['p25', 'p50', 'p75', 'p90'];
  
  variablePatterns.forEach(({ prefix, name }) => {
    const foundPercentiles = percentileColumns.filter(p => 
      lowerHeaders.some(h => h === `${prefix}${p}` || h.includes(`${prefix}${p}`))
    );
    if (foundPercentiles.length > 0) {
      foundVariables.push(name);
    }
  });

  if (foundVariables.length === 0) {
    return { format: undefined, confidence: 0, detectedColumns: [], suggestions: [] };
  }

  // Calculate confidence based on how many variable columns are found
  const expectedVariableColumns = variablePatterns.length * percentileColumns.length; // 12 total
  const foundVariableColumns = foundVariables.length * percentileColumns.length;
  const confidence = Math.min(100, (foundVariableColumns / expectedVariableColumns) * 100);

  // Check for n_orgs and n_incumbents (optional but common)
  const hasCounts = lowerHeaders.some(h => 
    h === 'n_orgs' || h.includes('n_org') || h.includes('group count')
  ) && lowerHeaders.some(h => 
    h === 'n_incumbents' || h.includes('n_incumbent') || h.includes('indv count')
  );

  const suggestions: string[] = [];
  if (!hasCounts) {
    suggestions.push('Consider adding n_orgs and n_incumbents columns for better data quality');
  }

  return {
    format: 'wide_variable',
    confidence: Math.round(confidence),
    detectedColumns: [],
    suggestions
  };
}

/**
 * Detect normalized format (Gallagher, AMGA style)
 */
function detectNormalizedFormat(lowerHeaders: string[]): FormatDetectionResult {
  const requiredColumns = [
    { name: 'variable', aliases: ['variable', 'benchmark'] },
    { name: 'specialty', aliases: ['specialty'] },
    { name: 'n_orgs', aliases: ['n_orgs', 'n_org', 'group count', 'organizations'] },
    { name: 'n_incumbents', aliases: ['n_incumbents', 'n_incumbent', 'indv count', 'incumbents'] },
    { name: 'p25', aliases: ['p25', '25th%', '25th'] },
    { name: 'p50', aliases: ['p50', '50th%', '50th'] },
    { name: 'p75', aliases: ['p75', '75th%', '75th'] },
    { name: 'p90', aliases: ['p90', '90th%', '90th'] }
  ];

  const foundColumns: string[] = [];
  const missingColumns: string[] = [];

  requiredColumns.forEach(({ name, aliases }) => {
    const found = aliases.some(alias => 
      lowerHeaders.some(h => h === alias || h.includes(alias))
    );
    if (found) {
      foundColumns.push(name);
    } else {
      missingColumns.push(name);
    }
  });

  if (foundColumns.length === 0) {
    return { format: undefined, confidence: 0, detectedColumns: [], suggestions: [] };
  }

  const confidence = (foundColumns.length / requiredColumns.length) * 100;

  const suggestions: string[] = [];
  if (missingColumns.length > 0) {
    suggestions.push(`Missing columns: ${missingColumns.join(', ')}`);
    suggestions.push('Ensure all required columns are present for normalized format');
  }

  return {
    format: 'normalized',
    confidence: Math.round(confidence),
    detectedColumns: [],
    suggestions
  };
}

/**
 * Detect wide format (ECG style)
 */
function detectWideFormat(lowerHeaders: string[]): FormatDetectionResult {
  // Check for specific wide format column patterns first (high confidence indicators)
  const wideFormatIndicators = [
    'base salary', 'net collections', 'total encounters', 'panel size',
    'total cost of benefits', 'total compensation', 'bonus', 'incentive'
  ];
  
  const hasWideFormatIndicators = wideFormatIndicators.some(indicator =>
    lowerHeaders.some(h => h.includes(indicator))
  );
  
  // If we have these specific columns, it's definitely wide format
  if (hasWideFormatIndicators) {
    return {
      format: 'wide',
      confidence: 95,
      detectedColumns: [],
      suggestions: []
    };
  }
  
  // Otherwise, check for standard wide format columns
  const requiredColumns = [
    { name: 'Provider Name', aliases: ['provider name', 'physician name', 'name', 'provider'] },
    { name: 'Specialty', aliases: ['specialty'] },
    { name: 'Geographic Region', aliases: ['geographic region', 'region', 'location'] },
    { name: 'Provider Type', aliases: ['provider type', 'type', 'role'] },
    { name: 'Compensation', aliases: ['compensation', 'salary', 'pay', 'tcc', 'wrvu', 'cf'] }
  ];

  const foundColumns: string[] = [];
  const missingColumns: string[] = [];

  requiredColumns.forEach(({ name, aliases }) => {
    const found = aliases.some(alias => 
      lowerHeaders.some(h => h === alias || h.includes(alias))
    );
    if (found) {
      foundColumns.push(name);
    } else {
      missingColumns.push(name);
    }
  });

  if (foundColumns.length === 0) {
    return { format: undefined, confidence: 0, detectedColumns: [], suggestions: [] };
  }

  const confidence = (foundColumns.length / requiredColumns.length) * 100;

  const suggestions: string[] = [];
  if (missingColumns.length > 0) {
    suggestions.push(`Missing columns: ${missingColumns.join(', ')}`);
    suggestions.push('Ensure all required columns are present for wide format');
  }

  return {
    format: 'wide',
    confidence: Math.round(confidence),
    detectedColumns: [],
    suggestions
  };
}

/**
 * Get expected format for a survey source
 */
export function getExpectedFormat(surveySource: string): CSVFormat | undefined {
  return SURVEY_FORMAT_MAP[surveySource] || SURVEY_FORMAT_MAP[surveySource.replace(/\s+/g, '')];
}

/**
 * Compare detected format with expected format
 */
export function compareFormats(
  detected: FormatDetectionResult,
  expectedFormat?: CSVFormat
): {
  matches: boolean;
  mismatchMessage?: string;
  suggestions: string[];
} {
  if (!expectedFormat) {
    return {
      matches: true,
      suggestions: []
    };
  }

  if (!detected.format) {
    return {
      matches: false,
      mismatchMessage: `Expected ${expectedFormat} format but could not detect format`,
      suggestions: [
        `Ensure file matches ${expectedFormat} format`,
        `Download sample file for ${expectedFormat} format`,
        'Check required columns for the expected format'
      ]
    };
  }

  if (detected.format !== expectedFormat) {
    return {
      matches: false,
      mismatchMessage: `Detected ${detected.format} format but expected ${expectedFormat} format`,
      suggestions: [
        `Convert file to ${expectedFormat} format`,
        `Download sample file for ${expectedFormat} format`,
        `Or change survey source to match ${detected.format} format`
      ]
    };
  }

  return {
    matches: true,
    suggestions: []
  };
}

/**
 * Get format requirements for display
 */
export function getFormatRequirements(format: CSVFormat): {
  requiredColumns: string[];
  optionalColumns: string[];
  description: string;
  example: string;
} {
  switch (format) {
    case 'normalized':
      return {
        requiredColumns: [
          'specialty',
          'variable',
          'n_orgs',
          'n_incumbents',
          'p25',
          'p50',
          'p75',
          'p90'
        ],
        optionalColumns: [
          'geographic_region',
          'provider_type'
        ],
        description: 'Each variable (TCC, wRVU, CF) gets its own row with percentile values',
        example: 'specialty,provider_type,geographic_region,variable,n_orgs,n_incumbents,p25,p50,p75,p90'
      };
    
    case 'wide_variable':
      return {
        requiredColumns: [
          'specialty',
          'provider_type',
          'geographic_region',
          'n_orgs',
          'n_incumbents'
        ],
        optionalColumns: [
          'tcc_p25', 'tcc_p50', 'tcc_p75', 'tcc_p90',
          'wrvu_p25', 'wrvu_p50', 'wrvu_p75', 'wrvu_p90',
          'cf_p25', 'cf_p50', 'cf_p75', 'cf_p90'
        ],
        description: 'All variables in one row with variable-specific percentile columns',
        example: 'specialty,provider_type,geographic_region,n_orgs,n_incumbents,tcc_p25,tcc_p50,tcc_p75,tcc_p90,wrvu_p25,wrvu_p50,wrvu_p75,wrvu_p90,cf_p25,cf_p50,cf_p75,cf_p90'
      };
    
    case 'wide':
      return {
        requiredColumns: [
          'Provider Name',
          'Specialty',
          'Geographic Region',
          'Provider Type',
          'Compensation'
        ],
        optionalColumns: [],
        description: 'Simple wide format with one compensation value per row',
        example: 'Provider Name,Specialty,Geographic Region,Provider Type,Compensation'
      };
    
    default:
      return {
        requiredColumns: [],
        optionalColumns: [],
        description: 'Unknown format',
        example: ''
      };
  }
}

