/**
 * Data Validation System
 * 
 * Validates data types, ranges, business rules, and data quality
 */

import { ProviderType, DataCategory } from '../../../types/provider';
import { SURVEY_SOURCES } from '../../../shared/constants';

export interface DataValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
  rowCount: number;
  validRowCount: number;
  dataQualityScore: number; // 0-100
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

/**
 * Check if a value is a valid missing data indicator (asterisks, ISD, empty, etc.)
 * This is used to handle survey data where various indicators show suppressed/missing data:
 * - Asterisks (*, **, ***) - common suppression indicator
 * - ISD (Insufficient Sample Data) - used by Sullivan-Cotter and other survey providers
 * - Other common missing data indicators
 */
export function isMissingDataIndicator(value: any): boolean {
  if (value === undefined || value === null || value === '') return true;
  const str = String(value).trim().toUpperCase();
  return str === '*' || 
         str === '**' || 
         str === '***' || 
         str === 'ISD' || 
         str === 'N/A' || 
         str === 'NA' ||
         str === 'NULL' || 
         str === 'UNDEFINED' ||
         str === '-' ||
         str === '--' ||
         str === '---';
}

/**
 * Normalize a numeric value by removing currency formatting
 * Handles: $321,645 -> 321645, $1,234.56 -> 1234.56, etc.
 */
function normalizeNumericValue(value: any): { normalized: string; isNumeric: boolean } {
  if (value === undefined || value === null || value === '') {
    return { normalized: '', isNumeric: false };
  }

  const str = String(value).trim();
  
  // Check if it's a missing data indicator first
  if (isMissingDataIndicator(str)) {
    return { normalized: str, isNumeric: false };
  }

  // Remove currency symbols, commas, and spaces
  // Handles: $321,645, $1,234.56, 321,645, etc.
  // First remove dollar signs and spaces
  let cleaned = str.replace(/[$,\s]/g, '');
  
  // Handle negative numbers (parentheses or minus sign)
  const isNegative = cleaned.startsWith('-') || cleaned.startsWith('(');
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = cleaned.slice(1, -1); // Remove parentheses
    cleaned = '-' + cleaned;
  }
  
  // Keep only digits, dots, and minus signs
  cleaned = cleaned.replace(/[^\d.-]/g, '');
  
  // Remove any extra dots (keep only the first one for decimals)
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }

  // Check if it's a valid number
  const num = parseFloat(cleaned);
  const isNumeric = !isNaN(num) && cleaned.length > 0 && cleaned !== '.' && cleaned !== '-';

  return { normalized: cleaned, isNumeric };
}

/**
 * Validate data types and values in CSV rows
 */
export function validateDataTypes(
  headers: string[],
  rows: Record<string, any>[],
  format?: 'normalized'
): DataValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const info: ValidationError[] = [];
  
  const rowErrors: Map<number, ValidationError[]> = new Map();
  let validRowCount = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because row 1 is header, rows are 0-indexed
    const rowErrorsList: ValidationError[] = [];
    let rowIsValid = true;

    // Validate normalized format
    const normalizedErrors = validateNormalizedRow(row, headers, rowNumber);
    rowErrorsList.push(...normalizedErrors);
    if (normalizedErrors.some(e => e.severity === 'critical')) {
      rowIsValid = false;
    }

    if (rowErrorsList.length > 0) {
      rowErrors.set(rowNumber, rowErrorsList);
    }

    if (rowIsValid) {
      validRowCount++;
    }
  });

  // Aggregate errors by severity
  rowErrors.forEach((rowErrorList) => {
    rowErrorList.forEach(error => {
      if (error.severity === 'critical') {
        errors.push(error);
      } else if (error.severity === 'warning') {
        warnings.push(error);
      } else {
        info.push(error);
      }
    });
  });

  // Calculate data quality score
  const dataQualityScore = rows.length > 0 
    ? Math.round((validRowCount / rows.length) * 100)
    : 0;

  // Add summary warnings
  if (dataQualityScore < 50) {
    warnings.push({
      severity: 'warning',
      category: 'data',
      message: `Low data quality: Only ${dataQualityScore}% of rows are valid`,
      fixInstructions: [
        'Review and fix data errors',
        'Check for missing or invalid values',
        'Ensure all required fields are populated'
      ]
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
    rowCount: rows.length,
    validRowCount,
    dataQualityScore
  };
}

/**
 * Validate normalized format row
 */
function validateNormalizedRow(
  row: Record<string, any>,
  headers: string[],
  rowNumber: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate required fields (only specialty and variable are truly required - numeric fields can have asterisks)
  const trulyRequiredFields = ['specialty', 'variable'];
  trulyRequiredFields.forEach(field => {
    const header = headers.find(h => h.toLowerCase().includes(field.toLowerCase()));
    if (header) {
      const value = row[header];
      if (value === undefined || value === null || value === '' || isMissingDataIndicator(value)) {
        errors.push({
          severity: 'critical',
          category: 'data',
          message: `Row ${rowNumber}: Missing required field "${field}"`,
          fixInstructions: [
            `Add value for "${field}" column`,
            'Ensure all required fields are populated'
          ],
          affectedRows: [rowNumber],
          affectedColumns: [header]
        });
      }
    }
  });

  // Validate numeric fields (allow asterisks and empty values as missing data indicators)
  const numericFields = ['n_orgs', 'n_incumbents', 'p25', 'p50', 'p75', 'p90'];
  numericFields.forEach(field => {
    const header = headers.find(h => h.toLowerCase().includes(field.toLowerCase()));
    if (header && row[header] !== undefined && row[header] !== null && row[header] !== '') {
      const rawValue = row[header];
      
      // Skip validation if it's a missing data indicator (asterisks, ISD, etc.)
      if (isMissingDataIndicator(rawValue)) {
        return; // Continue to next field - missing data indicators are valid
      }
      
      // Normalize the value (strip currency formatting, commas, etc.)
      const { normalized, isNumeric } = normalizeNumericValue(rawValue);
      
      if (!isNumeric) {
        // Only error if it's not a recognized missing data indicator and not a formatted number
        errors.push({
          severity: 'critical',
          category: 'data',
          message: `Row ${rowNumber}, Column "${header}": Invalid value "${rawValue}" - must be a number or missing data indicator (*, ISD, N/A)`,
          fixInstructions: [
            `Found value: "${rawValue}"`,
            `Expected: numeric value (e.g., ${field.includes('p') ? '567345' : '108'}) or missing data indicator (*, ISD, N/A)`,
            `Fix: Replace "${rawValue}" with a valid number or use *, ISD, or N/A for missing data`
          ],
          affectedRows: [rowNumber],
          affectedColumns: [header],
          example: field.includes('p') ? '567345 or ISD' : '108 or *'
        });
        return; // Skip range validation for invalid values
      }
      
      // Parse the normalized value
      const value = parseFloat(normalized);
      
      // Validate ranges
      if (field === 'n_orgs' || field === 'n_incumbents') {
          if (value < 0) {
            errors.push({
              severity: 'critical',
              category: 'data',
              message: `Row ${rowNumber}: "${field}" cannot be negative`,
              fixInstructions: [
                `Ensure "${field}" is a positive number`,
                'Count values should be >= 0'
              ],
              affectedRows: [rowNumber],
              affectedColumns: [header]
            });
          }
          if (value === 0) {
            errors.push({
              severity: 'warning',
              category: 'data',
              message: `Row ${rowNumber}: "${field}" is zero (may indicate missing data)`,
              fixInstructions: [
                'Verify this is intentional',
                'Consider removing rows with zero counts'
              ],
              affectedRows: [rowNumber],
              affectedColumns: [header]
            });
          }
        } else if (field.startsWith('p')) {
          // Percentile validation
          if (value < 0) {
            errors.push({
              severity: 'critical',
              category: 'data',
              message: `Row ${rowNumber}: "${field}" cannot be negative`,
              fixInstructions: [
                `Ensure "${field}" is a positive number`,
                'Compensation values should be >= 0'
              ],
              affectedRows: [rowNumber],
              affectedColumns: [header]
            });
          }
          if (value > 10000000) {
            errors.push({
              severity: 'warning',
              category: 'data',
              message: `Row ${rowNumber}: "${field}" value seems unusually high (${value.toLocaleString()})`,
              fixInstructions: [
                'Verify this value is correct',
                'Check for unit errors (e.g., cents vs dollars)'
              ],
              affectedRows: [rowNumber],
              affectedColumns: [header]
            });
          }
        }
      }
  });

  // Validate variable field (only if this is truly normalized format)
  // Skip validation if file has wide format columns (Base Salary, Net Collections, etc.)
  const hasWideFormatColumns = headers.some(h => {
    const lower = h.toLowerCase();
    return lower.includes('base salary') || 
           lower.includes('net collections') || 
           lower.includes('total encounters') ||
           lower.includes('panel size') ||
           lower.includes('total cost of benefits');
  });
  
  // Only validate variable if this is truly normalized format (no wide format columns)
  if (!hasWideFormatColumns) {
    const variableHeader = headers.find(h => h.toLowerCase().includes('variable'));
    if (variableHeader && row[variableHeader]) {
      const variable = String(row[variableHeader]).toUpperCase();
      const validVariables = ['TCC', 'WRVU', 'CF', 'CFS', 'WORK RVUS', 'WORK RVU'];
      if (!validVariables.some(v => variable.includes(v))) {
        errors.push({
          severity: 'warning',
          category: 'data',
          message: `Row ${rowNumber}: Unrecognized variable "${row[variableHeader]}"`,
          fixInstructions: [
            'Use standard variable names: TCC, Work RVUs, or CFs',
            'Check spelling and capitalization'
          ],
          affectedRows: [rowNumber],
          affectedColumns: [variableHeader],
          example: 'TCC, Work RVUs, or CFs'
        });
      }
    }
  }

  return errors;
}

/**
 * Validate wide_variable format row
 */
function validateWideVariableRow(
  row: Record<string, any>,
  headers: string[],
  rowNumber: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate required base fields
  const requiredBaseFields = ['specialty', 'provider_type', 'geographic_region', 'n_orgs', 'n_incumbents'];
  requiredBaseFields.forEach(field => {
    const header = headers.find(h => h.toLowerCase().includes(field.toLowerCase()));
    if (header) {
      const value = row[header];
      if (value === undefined || value === null || value === '') {
        errors.push({
          severity: 'critical',
          category: 'data',
          message: `Row ${rowNumber}: Missing required field "${field}"`,
          fixInstructions: [
            `Add value for "${field}" column`,
            'Ensure all required fields are populated'
          ],
          affectedRows: [rowNumber],
          affectedColumns: [header]
        });
      }
    }
  });

  // Validate numeric fields (n_orgs, n_incumbents, and all percentile columns)
  headers.forEach(header => {
    const lowerHeader = header.toLowerCase();
    
    // Check if it's a numeric field
    if (lowerHeader.includes('n_org') || lowerHeader.includes('n_incumbent') ||
        lowerHeader.includes('tcc_p') || lowerHeader.includes('wrvu_p') || lowerHeader.includes('cf_p')) {
      if (row[header] !== undefined && row[header] !== null && row[header] !== '') {
        const rawValue = row[header];
        
        // Skip validation if it's a missing data indicator (asterisks, ISD, etc.)
        if (isMissingDataIndicator(rawValue)) {
          return; // Skip to next header - missing data indicators are valid
        }
        
        // Normalize the value (strip currency formatting, commas, etc.)
        const { normalized, isNumeric } = normalizeNumericValue(rawValue);
        
        if (!isNumeric) {
          // Only error if it's not a recognized missing data indicator and not a formatted number
          errors.push({
            severity: 'critical',
            category: 'data',
            message: `Row ${rowNumber}, Column "${header}": Invalid value "${rawValue}" - must be a number or missing data indicator (*, ISD, N/A)`,
            fixInstructions: [
              `Found value: "${rawValue}"`,
              `Expected: numeric value or missing data indicator (*, ISD, N/A)`,
              `Fix: Replace "${rawValue}" with a valid number or use *, ISD, or N/A for missing data`
            ],
            affectedRows: [rowNumber],
            affectedColumns: [header]
          });
          return; // Skip range validation for invalid values
        }
        
        // Parse the normalized value
        const value = parseFloat(normalized);
        
        // Validate ranges
        if (lowerHeader.includes('n_org') || lowerHeader.includes('n_incumbent')) {
            if (value < 0) {
              errors.push({
                severity: 'critical',
                category: 'data',
                message: `Row ${rowNumber}: "${header}" cannot be negative`,
                fixInstructions: [
                  `Ensure "${header}" is a positive number`,
                  'Count values should be >= 0'
                ],
                affectedRows: [rowNumber],
                affectedColumns: [header]
              });
            }
          } else if (lowerHeader.includes('_p')) {
            // Percentile validation
            if (value < 0) {
              errors.push({
                severity: 'critical',
                category: 'data',
                message: `Row ${rowNumber}: "${header}" cannot be negative`,
                fixInstructions: [
                  `Ensure "${header}" is a positive number`,
                  'Compensation values should be >= 0'
                ],
                affectedRows: [rowNumber],
                affectedColumns: [header]
              });
            }
            if (value > 10000000) {
              errors.push({
                severity: 'warning',
                category: 'data',
                message: `Row ${rowNumber}: "${header}" value seems unusually high`,
                fixInstructions: [
                  'Verify this value is correct',
                  'Check for unit errors'
                ],
                affectedRows: [rowNumber],
                affectedColumns: [header]
              });
            }
          }
        }
      }
  });

  return errors;
}

/**
 * Validate wide format row
 */
function validateWideRow(
  row: Record<string, any>,
  headers: string[],
  rowNumber: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate required fields
  const requiredFields = ['Provider Name', 'Specialty', 'Geographic Region', 'Provider Type', 'Compensation'];
  requiredFields.forEach(field => {
    const header = headers.find(h => 
      h.toLowerCase().includes(field.toLowerCase()) ||
      field.toLowerCase().includes(h.toLowerCase())
    );
    if (header) {
      const value = row[header];
      if (value === undefined || value === null || value === '') {
        errors.push({
          severity: 'critical',
          category: 'data',
          message: `Row ${rowNumber}: Missing required field "${field}"`,
          fixInstructions: [
            `Add value for "${field}" column`,
            'Ensure all required fields are populated'
          ],
          affectedRows: [rowNumber],
          affectedColumns: [header]
        });
      }
    }
  });

  // Validate compensation and other common numeric fields (allow asterisks for missing data)
  // Common numeric field patterns in wide format files
  const numericFieldPatterns = [
    'compensation', 'salary', 'pay', 'wage', 'income', 'earnings',
    'benefits', 'cost', 'collections', 'revenue', 'encounters', 'panel',
    'count', 'number', 'total', 'amount', 'value', 'fee', 'charge'
  ];
  
  headers.forEach(header => {
    const lowerHeader = header.toLowerCase();
    
    // Check if this looks like a numeric field
    const isNumericField = numericFieldPatterns.some(pattern => lowerHeader.includes(pattern));
    
    // Skip if it's clearly a text field
    const isTextField = lowerHeader.includes('name') || 
                        lowerHeader.includes('specialty') || 
                        lowerHeader.includes('type') || 
                        lowerHeader.includes('region') ||
                        lowerHeader.includes('description') ||
                        lowerHeader.includes('note') ||
                        lowerHeader.includes('comment');
    
    if (isNumericField && !isTextField && row[header] !== undefined && row[header] !== null && row[header] !== '') {
      const rawValue = row[header];
      
      // Skip validation if it's a missing data indicator (asterisks, ISD, etc.)
      if (isMissingDataIndicator(rawValue)) {
        return; // Skip to next header - missing data indicators are valid
      }
      
      // Normalize the value (strip currency formatting, commas, etc.)
      const { normalized, isNumeric } = normalizeNumericValue(rawValue);
      
      if (!isNumeric) {
        // Only error if it's not a recognized missing data indicator and not a formatted number
        errors.push({
          severity: 'critical',
          category: 'data',
          message: `Row ${rowNumber}, Column "${header}": Invalid value "${rawValue}" - must be a number or missing data indicator (*, ISD, N/A)`,
          fixInstructions: [
            `Found value: "${rawValue}"`,
            `Expected: numeric value or missing data indicator (*, ISD, N/A)`,
            `Fix: Replace "${rawValue}" with a valid number or use *, ISD, or N/A for missing data`
          ],
          affectedRows: [rowNumber],
          affectedColumns: [header]
        });
        return; // Skip range validation for invalid values
      }
      
      // Parse the normalized value
      const value = parseFloat(normalized);
      
      // Validate ranges (only for compensation-related fields)
      if (lowerHeader.includes('compensation') || lowerHeader.includes('salary') || lowerHeader.includes('pay')) {
        if (value < 0) {
          errors.push({
            severity: 'critical',
            category: 'data',
            message: `Row ${rowNumber}: "${header}" cannot be negative`,
            fixInstructions: [
              'Ensure compensation values are positive numbers',
              'Compensation values should be >= 0'
            ],
            affectedRows: [rowNumber],
            affectedColumns: [header]
          });
        }
        if (value > 10000000) {
          errors.push({
            severity: 'warning',
            category: 'data',
            message: `Row ${rowNumber}: "${header}" value seems unusually high`,
            fixInstructions: [
              'Verify this value is correct',
              'Check for unit errors (e.g., cents vs dollars)'
            ],
            affectedRows: [rowNumber],
            affectedColumns: [header]
          });
        }
      } else if (lowerHeader.includes('count') || lowerHeader.includes('encounters') || lowerHeader.includes('panel')) {
        // Count fields should be non-negative integers
        if (value < 0) {
          errors.push({
            severity: 'critical',
            category: 'data',
            message: `Row ${rowNumber}: "${header}" cannot be negative`,
            fixInstructions: [
              'Ensure count values are positive numbers',
              'Count values should be >= 0'
            ],
            affectedRows: [rowNumber],
            affectedColumns: [header]
          });
        }
      }
    }
  });

  return errors;
}

/**
 * Validate business rules (provider types, data categories, survey sources)
 */
export function validateBusinessRules(
  rows: Record<string, any>[],
  headers: string[],
  selectedProviderType?: ProviderType,
  selectedDataCategory?: DataCategory,
  selectedSurveySource?: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate provider types in data
  const providerTypeHeader = headers.find(h => 
    h.toLowerCase().includes('provider_type') || 
    h.toLowerCase().includes('provider type')
  );
  
  if (providerTypeHeader) {
    const providerTypesInData = new Set<string>();
    rows.forEach((row, index) => {
      const value = row[providerTypeHeader];
      if (value) {
        providerTypesInData.add(String(value).trim());
      }
    });

    // Check if provider types match expected values
    // Expanded list of legitimate provider types including academic/administrative roles
    const validProviderTypes = [
      // Standard types
      'PHYSICIAN', 'APP', 'CALL', 'CUSTOM',
      // Common variations
      'Staff Physician', 'Advanced Practice Provider', 'Nurse Practitioner', 'Physician Assistant', 'CRNA',
      // Academic/Administrative roles (common in surveys)
      'Program Director', 'Department Chair', 'Division Chief', 'Medical Director', 'Chief Medical Officer',
      'Associate Program Director', 'Assistant Program Director', 'Vice Chair', 'Section Chief',
      'Department Head', 'Division Director', 'Clinical Director', 'Service Chief',
      // Other common types
      'Resident', 'Fellow', 'Attending', 'Hospitalist', 'Specialist', 'Primary Care'
    ];
    
    const unrecognizedTypes = new Set<string>();
    
    providerTypesInData.forEach(pt => {
      const normalizedPt = pt.toUpperCase().trim();
      
      // Check for exact match or if the provider type contains any valid type
      const isRecognized = validProviderTypes.some(vpt => {
        const normalizedVpt = vpt.toUpperCase();
        // Check for exact match or if the value contains the valid type (e.g., "Program Director" matches "Program Director")
        return normalizedPt === normalizedVpt || 
               normalizedPt.includes(normalizedVpt) || 
               normalizedVpt.includes(normalizedPt);
      });
      
      // Also check for common keywords that indicate legitimate provider types
      const hasLegitimateKeywords = [
        'PHYSICIAN', 'DOCTOR', 'MD', 'DO', 'PROVIDER', 'PRACTITIONER', 'ASSISTANT',
        'DIRECTOR', 'CHAIR', 'CHIEF', 'HEAD', 'RESIDENT', 'FELLOW', 'ATTENDING',
        'HOSPITALIST', 'SPECIALIST', 'NURSE', 'CRNA', 'PA', 'NP'
      ].some(keyword => normalizedPt.includes(keyword));
      
      if (!isRecognized && !hasLegitimateKeywords) {
        unrecognizedTypes.add(pt);
      }
    });

    // Only warn if we find truly unrecognized types (not common legitimate ones)
    if (unrecognizedTypes.size > 0) {
      const unrecognizedList = Array.from(unrecognizedTypes).join(', ');
      errors.push({
        severity: 'info', // Changed to info since these might be valid custom types
        category: 'business',
        message: `Found provider type(s): ${unrecognizedList}`,
        fixInstructions: [
          `Your file contains: ${unrecognizedList}`,
          'These will be accepted, but ensure they match your selected provider type',
          'Common types: PHYSICIAN, APP, Program Director, Department Chair, etc.'
        ],
        affectedRows: undefined,
        affectedColumns: [providerTypeHeader],
        example: 'PHYSICIAN, APP, Program Director, or Department Chair'
      });
    }

    // Check if selected provider type matches data
    if (selectedProviderType && providerTypesInData.size > 0) {
      const normalizedSelected = selectedProviderType.toUpperCase();
      const dataMatches = Array.from(providerTypesInData).some(pt => 
        pt.toUpperCase().includes(normalizedSelected) || normalizedSelected.includes(pt.toUpperCase())
      );
      if (!dataMatches) {
        errors.push({
          severity: 'warning',
          category: 'business',
          message: `Selected provider type "${selectedProviderType}" may not match data provider types`,
          fixInstructions: [
            `Data contains: ${Array.from(providerTypesInData).join(', ')}`,
            'Verify provider type selection matches your data',
            'Or update data to match selected provider type'
          ]
        });
      }
    }
  }

  // Validate survey source
  if (selectedSurveySource && SURVEY_SOURCES.includes(selectedSurveySource as any)) {
    // Survey source is valid
  } else if (selectedSurveySource) {
    errors.push({
      severity: 'warning',
      category: 'business',
      message: `Unrecognized survey source: "${selectedSurveySource}"`,
      fixInstructions: [
        `Use standard survey sources: ${SURVEY_SOURCES.join(', ')}`,
        'Or select "Custom" and enter custom source name'
      ],
      example: SURVEY_SOURCES.join(', ')
    });
  }

  // Validate data category combinations
  if (selectedDataCategory === 'CALL_PAY' && selectedProviderType === 'APP') {
    errors.push({
      severity: 'warning',
      category: 'business',
      message: 'Call Pay data category is typically used with PHYSICIAN provider type, not APP',
      fixInstructions: [
        'Verify this combination is correct for your data',
        'Call Pay surveys are usually for physicians, not APPs'
      ]
    });
  }

  return errors;
}

