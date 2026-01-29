/**
 * File Validation Service
 * 
 * Provides immediate file validation on selection (< 500ms)
 * Combines structure validation, header parsing, and format detection
 * for instant user feedback before upload begins.
 */

import { validateFileStructure, validateHeaders, PreUploadValidationResult } from '../features/upload/utils/preUploadValidation';
import { detectFormat, FormatDetectionResult } from '../features/upload/utils/formatDetection';
import { isExcelFile, parseFile } from '../features/upload/utils/fileParser';
import { getExcelSheetNames } from '../features/upload/utils/excelParser';

export interface FileValidationResult {
  isValid: boolean;
  canProceed: boolean; // True if file can be uploaded (may have warnings)
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
  structure: PreUploadValidationResult;
  headers: string[];
  formatDetection?: FormatDetectionResult;
  estimatedRowCount?: number;
  encoding?: string;
  validationTime: number; // Time taken in milliseconds
}

export interface ValidationError {
  severity: 'critical' | 'warning' | 'info';
  category: 'format' | 'structure' | 'data' | 'connectivity' | 'encoding';
  message: string;
  fixInstructions: string[];
  code: string; // For programmatic handling
  affectedRows?: number[];
  affectedColumns?: string[];
  example?: string;
}

/**
 * File Validation Service
 * Provides fast validation (< 500ms) for immediate user feedback
 */
export class FileValidationService {
  private readonly MAX_VALIDATION_TIME = 500; // Target: < 500ms

  /**
   * Validate file immediately on selection
   * Returns validation results within 500ms for instant feedback
   */
  async validateOnSelection(file: File): Promise<FileValidationResult> {
    const startTime = performance.now();
    
    try {
      // Step 1: Structure validation (< 100ms)
      const structure = await validateFileStructure(file);
      
      // If structure validation fails, return early
      if (!structure.isValid) {
        return this.buildResult(
          structure,
          [],
          undefined,
          startTime,
          false,
          false
        );
      }

      // Step 2: Header parsing (< 300ms)
      // For Excel files, we need to parse to get headers
      let headers: string[] = [];
      let formatDetection: FormatDetectionResult | undefined;
      
      if (isExcelFile(file)) {
        // For Excel, parse first sheet to get headers quickly
        try {
          const sheets = await getExcelSheetNames(file);
          if (sheets.length > 0) {
            const parseResult = await parseFile(file, sheets[0].name);
            headers = parseResult.headers;
            
            // Format detection
            formatDetection = detectFormat(headers);
          }
        } catch (error) {
          console.warn('Error parsing Excel headers:', error);
          // Fall back to header validation
          const headerValidation = await validateHeaders(file);
          headers = headerValidation.headers;
          if (headers.length > 0) {
            formatDetection = detectFormat(headers);
          }
        }
      } else {
        // For CSV, use fast header validation
        const headerValidation = await validateHeaders(file);
        headers = headerValidation.headers;
        
        if (headers.length > 0) {
          formatDetection = detectFormat(headers);
        }
      }

      // Step 3: Combine results
      const validationTime = performance.now() - startTime;
      
      // Convert validation errors to our format
      const errors = this.convertValidationErrors(structure.errors, 'critical');
      const warnings = [
        ...this.convertValidationErrors(structure.warnings, 'warning'),
        ...this.convertValidationErrors(structure.info, 'info')
      ];
      
      // Add format detection warnings
      if (formatDetection && formatDetection.confidence < 100) {
        if (formatDetection.missingRequired.length > 0) {
          errors.push({
            severity: 'critical',
            category: 'format',
            message: `Missing required columns: ${formatDetection.missingRequired.join(', ')}`,
            fixInstructions: formatDetection.suggestions,
            code: 'MISSING_REQUIRED_COLUMNS'
          });
        }
      }

      const canProceed = errors.filter(e => e.severity === 'critical').length === 0;

      return {
        isValid: structure.isValid && canProceed,
        canProceed,
        errors,
        warnings,
        info: this.convertValidationErrors(structure.info, 'info'),
        structure,
        headers,
        formatDetection,
        estimatedRowCount: structure.estimatedRowCount,
        encoding: structure.encoding,
        validationTime
      };
    } catch (error) {
      const validationTime = performance.now() - startTime;
      console.error('File validation error:', error);
      
      return {
        isValid: false,
        canProceed: false,
        errors: [{
          severity: 'critical',
          category: 'structure',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          fixInstructions: [
            'Ensure file is a valid CSV or Excel file',
            'Try re-saving the file',
            'Check file permissions'
          ],
          code: 'VALIDATION_ERROR'
        }],
        warnings: [],
        info: [],
        structure: {
          isValid: false,
          errors: [],
          warnings: [],
          info: [],
          fileSize: file.size
        },
        headers: [],
        validationTime
      };
    }
  }

  /**
   * Build validation result from components
   */
  private buildResult(
    structure: PreUploadValidationResult,
    headers: string[],
    formatDetection: FormatDetectionResult | undefined,
    startTime: number,
    isValid: boolean,
    canProceed: boolean
  ): FileValidationResult {
    const validationTime = performance.now() - startTime;
    
    return {
      isValid,
      canProceed,
      errors: this.convertValidationErrors(structure.errors, 'critical'),
      warnings: this.convertValidationErrors(structure.warnings, 'warning'),
      info: this.convertValidationErrors(structure.info, 'info'),
      structure,
      headers,
      formatDetection,
      estimatedRowCount: structure.estimatedRowCount,
      encoding: structure.encoding,
      validationTime
    };
  }

  /**
   * Convert validation errors to our format
   */
  private convertValidationErrors(
    errors: Array<{
      severity: 'critical' | 'warning' | 'info';
      category: string;
      message: string;
      fixInstructions: string[];
      affectedRows?: number[];
      affectedColumns?: string[];
      example?: string;
    }>,
    defaultSeverity: 'critical' | 'warning' | 'info'
  ): ValidationError[] {
    return errors.map((error, index) => ({
      severity: error.severity || defaultSeverity,
      category: this.mapCategory(error.category),
      message: error.message,
      fixInstructions: error.fixInstructions || [],
      code: this.generateErrorCode(error.category, error.message, index),
      affectedRows: error.affectedRows,
      affectedColumns: error.affectedColumns,
      example: error.example
    }));
  }

  /**
   * Map category to our standard categories
   */
  private mapCategory(category: string): ValidationError['category'] {
    const categoryMap: Record<string, ValidationError['category']> = {
      'format': 'format',
      'structure': 'structure',
      'data': 'data',
      'business': 'data',
      'encoding': 'encoding',
      'connectivity': 'connectivity'
    };
    
    return categoryMap[category] || 'structure';
  }

  /**
   * Generate error code for programmatic handling
   */
  private generateErrorCode(category: string, message: string, index: number): string {
    const categoryCode = category.toUpperCase().replace(/[^A-Z]/g, '_');
    const messageCode = message
      .substring(0, 20)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_');
    
    return `${categoryCode}_${messageCode}_${index}`;
  }
}

// Singleton instance
let fileValidationServiceInstance: FileValidationService | null = null;

/**
 * Get FileValidationService instance
 */
export function getFileValidationService(): FileValidationService {
  if (!fileValidationServiceInstance) {
    fileValidationServiceInstance = new FileValidationService();
  }
  return fileValidationServiceInstance;
}
