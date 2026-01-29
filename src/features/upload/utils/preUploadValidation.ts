/**
 * Pre-Upload Validation System
 * 
 * Fast validation that runs immediately on file selection (< 500ms)
 * Validates file structure, encoding, and basic format before full parse
 */

import { readCSVFile } from '../../../shared/utils';
import { parseCSVLine } from '../../../shared/utils/csvParser';

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

  // Validate file extension (CSV or Excel supported)
  const lowerName = file.name.toLowerCase();
  const isCsv = lowerName.endsWith('.csv');
  const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');

  if (!isCsv && !isExcel) {
    errors.push({
      severity: 'critical',
      category: 'format',
      message: `File must be a CSV or Excel file. Found: ${file.name.split('.').pop()?.toUpperCase() || 'unknown'}`,
      fixInstructions: [
        'Save your file as a CSV or Excel file',
        'In Excel: File → Save As → CSV (Comma delimited) or Excel Workbook',
        'In Google Sheets: File → Download → CSV or Microsoft Excel (.xlsx)'
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
  format?: 'normalized';
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
 * Simplified to normalized format only
 */
function detectFormat(headers: string[]): {
  format: 'normalized' | undefined;
  confidence: number;
} {
  // Use simplified format detection from formatDetection.ts
  const { detectFormat: detectNormalizedFormat } = require('./formatDetection');
  const result = detectNormalizedFormat(headers);
  
  return {
    format: result.format,
    confidence: result.confidence
  };
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}




