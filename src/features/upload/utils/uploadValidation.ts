/**
 * Upload Validation Utilities
 * Comprehensive validation for CSV uploads including structure, data types, and business rules
 */

import { FileWithPreview } from '../types/upload';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    rowCount: number;
    columnCount: number;
    detectedColumns: string[];
    dataTypes: Record<string, string>;
    sampleData: any[];
  };
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarSurveys: Array<{
    id: string;
    name: string;
    type: string;
    year: string;
    similarity: number;
  }>;
}

/**
 * Validate CSV file structure and format
 */
export const validateCSVStructure = (file: File): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Basic file validation
  if (!file.name.toLowerCase().endsWith('.csv')) {
    errors.push('File must be a CSV file');
  }
  
  if (file.size === 0) {
    errors.push('File is empty');
  }
  
  if (file.size > 50 * 1024 * 1024) { // 50MB limit
    errors.push('File is too large (maximum 50MB)');
  }
  
  if (file.size > 10 * 1024 * 1024) { // 10MB warning
    warnings.push('Large file detected - upload may take longer');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    details: {
      rowCount: 0,
      columnCount: 0,
      detectedColumns: [],
      dataTypes: {},
      sampleData: []
    }
  };
};

/**
 * Parse and validate CSV content
 */
export const validateCSVContent = async (file: File): Promise<ValidationResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      errors.push('File contains no data');
      return {
        isValid: false,
        errors,
        warnings,
        details: {
          rowCount: 0,
          columnCount: 0,
          detectedColumns: [],
          dataTypes: {},
          sampleData: []
        }
      };
    }
    
    // Parse header row
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    
    if (headers.length === 0) {
      errors.push('No column headers found');
    }
    
    // Check for required columns
    const requiredColumns = ['specialty', 'provider_type', 'geographic_region'];
    const missingRequired = requiredColumns.filter(col => 
      !headers.some(header => header.toLowerCase().includes(col.toLowerCase()))
    );
    
    if (missingRequired.length > 0) {
      warnings.push(`Missing recommended columns: ${missingRequired.join(', ')}`);
    }
    
    // Parse data rows
    const dataRows: Record<string, any>[] = [];
    for (let i = 1; i < Math.min(lines.length, 1001); i++) { // Limit to 1000 rows for validation
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
        continue;
      }
      
      const row: Record<string, any> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      dataRows.push(row);
    }
    
    // Analyze data types
    const dataTypes: Record<string, string> = {};
    headers.forEach(header => {
      const values = dataRows.map(row => row[header]).filter(val => val !== '');
      dataTypes[header] = detectDataType(values);
    });
    
    // Check for empty rows
    const emptyRows = dataRows.filter(row => 
      Object.values(row).every(val => !val || val.toString().trim() === '')
    );
    
    if (emptyRows.length > 0) {
      warnings.push(`${emptyRows.length} empty rows detected`);
    }
    
    // Check for duplicate rows
    const rowHashes = dataRows.map(row => JSON.stringify(row));
    const uniqueHashes = new Set(rowHashes);
    if (rowHashes.length !== uniqueHashes.size) {
      warnings.push(`${rowHashes.length - uniqueHashes.size} duplicate rows detected`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      details: {
        rowCount: dataRows.length,
        columnCount: headers.length,
        detectedColumns: headers,
        dataTypes,
        sampleData: dataRows.slice(0, 5) // First 5 rows as sample
      }
    };
    
  } catch (error) {
    errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      isValid: false,
      errors,
      warnings,
      details: {
        rowCount: 0,
        columnCount: 0,
        detectedColumns: [],
        dataTypes: {},
        sampleData: []
      }
    };
  }
};

/**
 * Validate data types and business rules
 */
export const validateDataTypes = (validationResult: ValidationResult): ValidationResult => {
  const errors = [...validationResult.errors];
  const warnings = [...validationResult.warnings];
  
  const { detectedColumns, dataTypes, sampleData } = validationResult.details;
  
  // Check for numeric columns that should contain numbers
  const numericColumns = detectedColumns.filter(col => 
    col.toLowerCase().includes('p25') || 
    col.toLowerCase().includes('p50') || 
    col.toLowerCase().includes('p75') || 
    col.toLowerCase().includes('p90') ||
    col.toLowerCase().includes('tcc') ||
    col.toLowerCase().includes('wrvu') ||
    col.toLowerCase().includes('cf') ||
    col.toLowerCase().includes('n_orgs') ||
    col.toLowerCase().includes('n_incumbents')
  );
  
  numericColumns.forEach(column => {
    const values = sampleData.map(row => row[column]).filter(val => val !== '');
    const nonNumericValues = values.filter(val => isNaN(Number(val)));
    
    if (nonNumericValues.length > 0) {
      warnings.push(`Column "${column}" contains non-numeric values: ${nonNumericValues.slice(0, 3).join(', ')}`);
    }
  });
  
  // Check for required fields
  const specialtyColumn = detectedColumns.find(col => 
    col.toLowerCase().includes('specialty') || col.toLowerCase().includes('provider_type')
  );
  
  if (specialtyColumn) {
    const specialtyValues = sampleData.map(row => row[specialtyColumn]).filter(val => val !== '');
    if (specialtyValues.length === 0) {
      warnings.push('No specialty/provider type values found');
    }
  }
  
  return {
    ...validationResult,
    errors,
    warnings
  };
};

/**
 * Detect potential duplicate surveys
 */
export const detectDuplicates = async (
  fileName: string,
  surveyType: string,
  surveyYear: string,
  getExistingSurveys: () => Promise<any[]>
): Promise<DuplicateCheckResult> => {
  try {
    const existingSurveys = await getExistingSurveys();
    const similarSurveys = existingSurveys
      .map(survey => ({
        id: survey.id,
        name: survey.name,
        type: survey.type,
        year: survey.year,
        similarity: calculateSimilarity(fileName, survey.name, surveyType, survey.type, surveyYear, survey.year)
      }))
      .filter(survey => survey.similarity > 0.7)
      .sort((a, b) => b.similarity - a.similarity);
    
    return {
      isDuplicate: similarSurveys.length > 0,
      similarSurveys
    };
  } catch (error) {
    console.error('Error detecting duplicates:', error);
    return {
      isDuplicate: false,
      similarSurveys: []
    };
  }
};

/**
 * Validate upload transaction (post-upload verification)
 */
export const validateUploadTransaction = async (
  surveyId: string,
  expectedRowCount: number,
  getSurveyById: (id: string) => Promise<any | null>,
  getSurveyData: (id: string) => Promise<{ rows: any[] }>
): Promise<ValidationResult> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Verify survey exists
    const survey = await getSurveyById(surveyId);
    if (!survey) {
      errors.push('Survey was not created successfully');
      return {
        isValid: false,
        errors,
        warnings,
        details: {
          rowCount: 0,
          columnCount: 0,
          detectedColumns: [],
          dataTypes: {},
          sampleData: []
        }
      };
    }
    
    // Verify data was saved
    const { rows } = await getSurveyData(surveyId);
    if (rows.length !== expectedRowCount) {
      errors.push(`Row count mismatch: expected ${expectedRowCount}, got ${rows.length}`);
    }
    
    if (rows.length === 0) {
      errors.push('No data was saved to the database');
    }
    
    // Check data integrity
    const hasValidData = rows.some(row => 
      Object.values(row).some(val => val !== null && val !== undefined && val !== '')
    );
    
    if (!hasValidData) {
      errors.push('All saved data appears to be empty');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      details: {
        rowCount: rows.length,
        columnCount: rows.length > 0 ? Object.keys(rows[0]).length : 0,
        detectedColumns: rows.length > 0 ? Object.keys(rows[0]) : [],
        dataTypes: {},
        sampleData: rows.slice(0, 5)
      }
    };
    
  } catch (error) {
    errors.push(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      isValid: false,
      errors,
      warnings,
      details: {
        rowCount: 0,
        columnCount: 0,
        detectedColumns: [],
        dataTypes: {},
        sampleData: []
      }
    };
  }
};

/**
 * Comprehensive file validation
 */
export const validateFileUpload = async (
  file: File,
  allFiles: FileWithPreview[],
  getExistingSurveys?: () => Promise<any[]>
): Promise<ValidationResult> => {
  // Basic structure validation
  let result = validateCSVStructure(file);
  if (!result.isValid) {
    return result;
  }
  
  // Content validation
  result = await validateCSVContent(file);
  if (!result.isValid) {
    return result;
  }
  
  // Data type validation
  result = validateDataTypes(result);
  
  // Check for duplicate files in current upload
  const duplicateFiles = allFiles.filter(f => 
    f.name === file.name && f.size === file.size && f !== file
  );
  
  if (duplicateFiles.length > 0) {
    result.warnings.push('Duplicate file detected in current upload');
  }
  
  return result;
};

// Helper functions

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
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

function detectDataType(values: any[]): string {
  if (values.length === 0) return 'string';
  
  const sample = values.slice(0, 10); // Check first 10 values
  
  // Check if all are numbers
  if (sample.every(val => !isNaN(Number(val)) && val !== '')) {
    return 'number';
  }
  
  // Check if all are dates
  if (sample.every(val => !isNaN(Date.parse(val)) && val !== '')) {
    return 'date';
  }
  
  // Check if all are booleans
  if (sample.every(val => 
    val === 'true' || val === 'false' || val === '1' || val === '0' || val === 'yes' || val === 'no'
  )) {
    return 'boolean';
  }
  
  return 'string';
}

function calculateSimilarity(
  fileName1: string,
  fileName2: string,
  type1: string,
  type2: string,
  year1: string,
  year2: string
): number {
  let similarity = 0;
  
  // File name similarity (40% weight)
  const nameSim = levenshteinSimilarity(fileName1.toLowerCase(), fileName2.toLowerCase());
  similarity += nameSim * 0.4;
  
  // Type similarity (30% weight)
  const typeSim = levenshteinSimilarity(type1.toLowerCase(), type2.toLowerCase());
  similarity += typeSim * 0.3;
  
  // Year similarity (30% weight)
  const yearSim = year1 === year2 ? 1 : 0;
  similarity += yearSim * 0.3;
  
  return similarity;
}

function levenshteinSimilarity(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  const distance = matrix[str2.length][str1.length];
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}
