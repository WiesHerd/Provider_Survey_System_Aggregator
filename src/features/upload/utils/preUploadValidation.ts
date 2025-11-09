/**
 * Pre-Upload Validation System
 * 
 * Fast validation that runs immediately on file selection (< 500ms)
 * Validates file structure, encoding, and basic format before full parse
 */

import { readCSVFile } from '../../../shared/utils';

export interface PreUploadValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
  fileSize: number;
  encoding?: string;
  encodingIssues?: Array<{
    description: string;
    position?: number;
  }>;
  estimatedRowCount?: number;
}

export interface ValidationError {
  severity: 'critical' | 'warning' | 'info';
  category: 'format' | 'structure' | 'data' | 'business' | 'encoding';
  message: string;
  fixInstructions: string[];
  affectedRows?: number[];
  affectedColumns?: string[];
  example?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILE_SIZE_WARNING = 10 * 1024 * 1024; // 10MB

/**
 * Validate file structure before upload
 * Fast validation (< 500ms) that checks basic file properties
 */
export async function validateFileStructure(file: File): Promise<PreUploadValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const info: ValidationError[] = [];

  // Validate file extension
  if (!file.name.toLowerCase().endsWith('.csv')) {
    errors.push({
      severity: 'critical',
      category: 'format',
      message: `File must be a CSV file. Found: ${file.name.split('.').pop()?.toUpperCase() || 'unknown'}`,
      fixInstructions: [
        'Save your file as a CSV file',
        'In Excel: File → Save As → CSV (Comma delimited)',
        'In Google Sheets: File → Download → CSV'
      ],
      example: 'survey-data.csv'
    });
  }

  // Validate file size
  if (file.size === 0) {
    errors.push({
      severity: 'critical',
      category: 'structure',
      message: 'File is empty',
      fixInstructions: [
        'Ensure your file contains data',
        'Check that the file was saved correctly'
      ]
    });
  } else if (file.size > MAX_FILE_SIZE) {
    errors.push({
      severity: 'critical',
      category: 'structure',
      message: `File is too large (${formatFileSize(file.size)}). Maximum size: ${formatFileSize(MAX_FILE_SIZE)}`,
      fixInstructions: [
        'Split your file into smaller files',
        'Remove unnecessary columns or rows',
        'Contact support if you need to upload larger files'
      ]
    });
  } else if (file.size > MAX_FILE_SIZE_WARNING) {
    warnings.push({
      severity: 'warning',
      category: 'structure',
      message: `Large file detected (${formatFileSize(file.size)}). Upload may take longer.`,
      fixInstructions: [
        'Consider splitting into smaller files for faster processing',
        'Ensure you have a stable internet connection'
      ]
    });
  }

  // Validate encoding (fast check - only read first chunk)
  try {
    const chunk = await file.slice(0, Math.min(1024, file.size)).text();
    const encodingIssues: Array<{ description: string; position?: number }> = [];
    
    // Check for common encoding issues
    if (chunk.includes('\ufffd')) {
      encodingIssues.push({
        description: 'Invalid UTF-8 characters detected (replacement characters found)'
      });
    }
    
    // Check for BOM
    if (chunk.charCodeAt(0) === 0xFEFF) {
      info.push({
        severity: 'info',
        category: 'encoding',
        message: 'File contains UTF-8 BOM (Byte Order Mark)',
        fixInstructions: [
          'BOM is acceptable but not required',
          'File will be processed correctly'
        ]
      });
    }

    if (encodingIssues.length > 0) {
      warnings.push({
        severity: 'warning',
        category: 'encoding',
        message: 'Potential encoding issues detected',
        fixInstructions: [
          'Re-save your file as UTF-8 CSV',
          'In Excel: File → Save As → CSV UTF-8 (Comma delimited)',
          'In Google Sheets: File → Download → CSV (already UTF-8)'
        ]
      });
    }
  } catch (error) {
    warnings.push({
      severity: 'warning',
      category: 'encoding',
      message: 'Could not verify file encoding',
      fixInstructions: [
        'Ensure file is saved as UTF-8 CSV',
        'If issues occur, re-save the file'
      ]
    });
  }

  // Estimate row count (rough estimate based on file size)
  if (file.size > 0) {
    // Rough estimate: average CSV row is ~200 bytes
    const estimatedRows = Math.floor(file.size / 200);
    if (estimatedRows > 100000) {
      warnings.push({
        severity: 'warning',
        category: 'structure',
        message: `Large file detected (estimated ${estimatedRows.toLocaleString()} rows). Processing may take several minutes.`,
        fixInstructions: [
          'Consider splitting into smaller files',
          'Ensure you have a stable internet connection'
        ]
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
    fileSize: file.size,
    estimatedRowCount: file.size > 0 ? Math.floor(file.size / 200) : undefined
  };
}

/**
 * Fast header-only validation
 * Parses only the first line to detect format and validate headers
 */
export async function validateHeaders(file: File): Promise<{
  isValid: boolean;
  headers: string[];
  format?: 'normalized' | 'wide' | 'wide_variable';
  formatConfidence?: number;
  errors: ValidationError[];
  warnings: ValidationError[];
}> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  try {
    // Read only first 10KB to get header row
    const chunk = await file.slice(0, Math.min(10240, file.size)).text();
    const firstLineEnd = chunk.indexOf('\n');
    
    if (firstLineEnd === -1) {
      errors.push({
        severity: 'critical',
        category: 'structure',
        message: 'File appears to have no line breaks',
        fixInstructions: [
          'Ensure file is a valid CSV file',
          'Check that file was saved correctly'
        ]
      });
      return { isValid: false, headers: [], errors, warnings };
    }

    const headerLine = chunk.substring(0, firstLineEnd).trim();
    if (!headerLine) {
      errors.push({
        severity: 'critical',
        category: 'structure',
        message: 'File header row is empty',
        fixInstructions: [
          'Ensure first row contains column headers',
          'Check that file was saved correctly'
        ]
      });
      return { isValid: false, headers: [], errors, warnings };
    }

    // Parse headers (simple CSV parsing for headers)
    const headers = parseCSVLine(headerLine);
    
    if (headers.length === 0) {
      errors.push({
        severity: 'critical',
        category: 'structure',
        message: 'No column headers detected',
        fixInstructions: [
          'Ensure first row contains column names',
          'Check that columns are separated by commas'
        ]
      });
      return { isValid: false, headers: [], errors, warnings };
    }

    // Check for empty headers
    const emptyHeaders = headers
      .map((h, i) => ({ header: h, index: i }))
      .filter(({ header }) => !header.trim());
    
    if (emptyHeaders.length > 0) {
      warnings.push({
        severity: 'warning',
        category: 'structure',
        message: `Found ${emptyHeaders.length} empty column header${emptyHeaders.length > 1 ? 's' : ''}`,
        fixInstructions: [
          'Add column names for all columns',
          `Empty headers found at positions: ${emptyHeaders.map(h => h.index + 1).join(', ')}`
        ],
        affectedColumns: emptyHeaders.map(h => `Column ${h.index + 1}`)
      });
    }

    // Detect format
    const formatDetection = detectFormat(headers);
    
    return {
      isValid: errors.length === 0,
      headers,
      format: formatDetection.format,
      formatConfidence: formatDetection.confidence,
      errors,
      warnings
    };
  } catch (error) {
    errors.push({
      severity: 'critical',
      category: 'structure',
      message: `Failed to read file headers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      fixInstructions: [
        'Ensure file is a valid CSV file',
        'Try re-saving the file',
        'Check file permissions'
      ]
    });
    return { isValid: false, headers: [], errors, warnings };
  }
}

/**
 * Detect CSV format from headers
 */
function detectFormat(headers: string[]): {
  format: 'normalized' | 'wide' | 'wide_variable' | undefined;
  confidence: number;
} {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Check for wide_variable format (tcc_p25, wrvu_p25, cf_p25, etc.)
  const hasWideVariablePattern = 
    lowerHeaders.some(h => h.includes('tcc_p')) &&
    lowerHeaders.some(h => h.includes('wrvu_p')) &&
    lowerHeaders.some(h => h.includes('cf_p')) &&
    lowerHeaders.some(h => h === 'specialty' || h.includes('specialty')) &&
    lowerHeaders.some(h => h === 'provider_type' || h.includes('provider_type'));
  
  if (hasWideVariablePattern) {
    // Count how many percentile columns match the pattern
    const percentileMatches = lowerHeaders.filter(h => 
      h.match(/^(tcc|wrvu|cf)_p(25|50|75|90)$/)
    ).length;
    const confidence = Math.min(100, (percentileMatches / 12) * 100); // 12 possible percentile columns
    
    return { format: 'wide_variable', confidence };
  }

  // Check for normalized format (variable, p25, p50, p75, p90, n_orgs, n_incumbents)
  const hasVariableField = lowerHeaders.some(h => 
    h === 'variable' || h === 'benchmark' || h.includes('variable')
  );
  const hasPercentiles = lowerHeaders.some(h => 
    h === 'p25' || h === 'p50' || h === 'p75' || h === 'p90' ||
    h.includes('25th') || h.includes('50th') || h.includes('75th') || h.includes('90th')
  );
  const hasCounts = lowerHeaders.some(h => 
    h === 'n_orgs' || h.includes('n_org') || h.includes('group count') ||
    h === 'n_incumbents' || h.includes('n_incumbent') || h.includes('indv count')
  );
  const hasSpecialty = lowerHeaders.some(h => 
    h === 'specialty' || h.includes('specialty')
  );

  if (hasVariableField && hasPercentiles && hasCounts && hasSpecialty) {
    // Count required columns
    const requiredColumns = [
      'variable', 'specialty', 'n_orgs', 'n_incumbents', 'p25', 'p50', 'p75', 'p90'
    ];
    const foundColumns = requiredColumns.filter(col => 
      lowerHeaders.some(h => h === col || h.includes(col))
    ).length;
    const confidence = (foundColumns / requiredColumns.length) * 100;
    
    return { format: 'normalized', confidence };
  }

  // Check for wide format (Provider Name, Specialty, Geographic Region, Provider Type, Compensation)
  const hasProviderName = lowerHeaders.some(h => 
    h.includes('provider name') || h.includes('physician name') || h === 'name'
  );
  const hasGeographicRegion = lowerHeaders.some(h => 
    h.includes('geographic region') || h.includes('region') || h === 'region'
  );
  const hasCompensation = lowerHeaders.some(h => 
    h.includes('compensation') || h.includes('salary') || h.includes('pay') ||
    h.includes('tcc') || h.includes('wrvu') || h.includes('cf')
  );

  if (hasProviderName && hasSpecialty && hasGeographicRegion && hasCompensation) {
    const requiredColumns = ['provider name', 'specialty', 'geographic region', 'provider type', 'compensation'];
    const foundColumns = requiredColumns.filter(col => 
      lowerHeaders.some(h => h.includes(col))
    ).length;
    const confidence = (foundColumns / requiredColumns.length) * 100;
    
    return { format: 'wide', confidence };
  }

  return { format: undefined, confidence: 0 };
}

/**
 * Simple CSV line parser for headers
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

