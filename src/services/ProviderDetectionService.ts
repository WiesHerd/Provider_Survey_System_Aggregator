/**
 * Provider Detection Service
 * 
 * This service handles automatic detection of provider types (Physician vs APP)
 * during data upload and processing.
 */

import { 
  ProviderDetectionResult, 
  ProviderValidationResult, 
  RawSurveyData, 
  ProviderType
} from '../types/provider';

export class ProviderDetectionService {
  // Provider type patterns for detection
  private static readonly PHYSICIAN_PATTERNS = {
    providerTypes: ['MD', 'DO', 'Resident', 'Fellow', 'Physician', 'Doctor'],
    specialties: [
      'Cardiology', 'Orthopedic Surgery', 'Neurosurgery', 'Plastic Surgery',
      'Cardiothoracic Surgery', 'Vascular Surgery', 'Urology', 'Ophthalmology',
      'Otolaryngology', 'Dermatology', 'Radiology', 'Pathology', 'Anesthesiology',
      'Emergency Medicine', 'Internal Medicine', 'Pediatrics', 'Obstetrics',
      'Gynecology', 'Psychiatry', 'Neurology', 'Oncology', 'Hematology'
    ],
    compensationRanges: {
      min: 200000, // Minimum physician compensation
      max: 2000000 // Maximum physician compensation
    }
  };

  private static readonly APP_PATTERNS = {
    providerTypes: ['NP', 'PA', 'CRNA', 'CNS', 'CNM', 'Nurse Practitioner', 'Physician Assistant'],
    specialties: [
      'Family Practice NP', 'Adult-Gerontology NP', 'Pediatric NP', 'Psychiatric NP',
      'Emergency NP', 'Acute Care NP', 'Primary Care PA', 'Surgical PA',
      'Emergency PA', 'Dermatology PA', 'Orthopedic PA', 'Cardiology PA'
    ],
    certifications: [
      'FNP', 'AGNP', 'PNP', 'PMHNP', 'ACNP', 'ENP', 'PA-C', 'CRNA', 'CNS', 'CNM'
    ],
    compensationRanges: {
      min: 80000, // Minimum APP compensation
      max: 200000 // Maximum APP compensation
    }
  };

  /**
   * Detect provider type from raw survey data
   */
  public static detectProviderType(data: RawSurveyData): ProviderDetectionResult {
    const evidence: string[] = [];
    const warnings: string[] = [];
    let confidence = 0;
    let detectionMethod: ProviderDetectionResult['detectionMethod'] = 'COLUMN_NAMES';

    // Method 1: Check column names
    const columnEvidence = this.detectFromColumnNames(data.columns);
    if (columnEvidence.providerType !== 'UNKNOWN') {
      evidence.push(...columnEvidence.evidence);
      confidence += 0.4;
      detectionMethod = 'COLUMN_NAMES';
    }

    // Method 2: Check provider type values
    const providerTypeEvidence = this.detectFromProviderTypeValues(data);
    if (providerTypeEvidence.providerType !== 'UNKNOWN') {
      evidence.push(...providerTypeEvidence.evidence);
      confidence += 0.3;
      detectionMethod = 'PROVIDER_VALUES';
    }

    // Method 3: Check specialty names
    const specialtyEvidence = this.detectFromSpecialtyNames(data);
    if (specialtyEvidence.providerType !== 'UNKNOWN') {
      evidence.push(...specialtyEvidence.evidence);
      confidence += 0.2;
      detectionMethod = 'SPECIALTY_NAMES';
    }

    // Method 4: Check data patterns (compensation ranges)
    const patternEvidence = this.detectFromDataPatterns(data);
    if (patternEvidence.providerType !== 'UNKNOWN') {
      evidence.push(...patternEvidence.evidence);
      confidence += 0.1;
      detectionMethod = 'DATA_PATTERNS';
    }

    // Determine final provider type
    let providerType: ProviderType | 'UNKNOWN' = 'UNKNOWN';
    if (confidence >= 0.5) {
      // Count evidence for each provider type
      const physicianEvidence = evidence.filter(e => e.includes('Physician') || e.includes('MD') || e.includes('DO')).length;
      const appEvidence = evidence.filter(e => e.includes('APP') || e.includes('NP') || e.includes('PA')).length;
      
      if (physicianEvidence > appEvidence) {
        providerType = 'PHYSICIAN';
      } else if (appEvidence > physicianEvidence) {
        providerType = 'APP';
      }
    }

    // Add warnings for low confidence
    if (confidence < 0.7) {
      warnings.push('Low confidence detection - manual verification recommended');
    }

    if (evidence.length === 0) {
      warnings.push('No clear provider type indicators found');
    }

    return {
      providerType,
      confidence,
      detectionMethod,
      evidence,
      warnings
    };
  }

  /**
   * Detect provider type from column names
   */
  private static detectFromColumnNames(columns: string[]): { providerType: ProviderType | 'UNKNOWN'; evidence: string[] } {
    const evidence: string[] = [];
    const lowerColumns = columns.map(col => col.toLowerCase());

    // Check for physician-specific columns
    const physicianColumns = lowerColumns.filter(col => 
      col.includes('md') || col.includes('do') || col.includes('physician') || 
      col.includes('doctor') || col.includes('resident') || col.includes('fellow')
    );

    // Check for APP-specific columns
    const appColumns = lowerColumns.filter(col => 
      col.includes('np') || col.includes('pa') || col.includes('crna') || 
      col.includes('cns') || col.includes('cnm') || col.includes('nurse practitioner') ||
      col.includes('physician assistant')
    );

    if (physicianColumns.length > 0) {
      evidence.push(`Found physician-specific columns: ${physicianColumns.join(', ')}`);
      return { providerType: 'PHYSICIAN', evidence };
    }

    if (appColumns.length > 0) {
      evidence.push(`Found APP-specific columns: ${appColumns.join(', ')}`);
      return { providerType: 'APP', evidence };
    }

    return { providerType: 'UNKNOWN', evidence };
  }

  /**
   * Detect provider type from provider type values in data
   */
  private static detectFromProviderTypeValues(data: RawSurveyData): { providerType: ProviderType | 'UNKNOWN'; evidence: string[] } {
    const evidence: string[] = [];
    
    // Find provider type column
    const providerTypeColumn = data.columns.find(col => 
      col.toLowerCase().includes('provider') || 
      col.toLowerCase().includes('type') ||
      col.toLowerCase().includes('role')
    );

    if (!providerTypeColumn) {
      return { providerType: 'UNKNOWN', evidence };
    }

    // Get unique values from provider type column
    const values = data.rows
      .map(row => row[providerTypeColumn])
      .filter(value => value && typeof value === 'string')
      .map(value => value.trim().toUpperCase());

    const uniqueValues = [...new Set(values)];

    // Check for physician types
    const physicianValues = uniqueValues.filter(val => 
      this.PHYSICIAN_PATTERNS.providerTypes.some(pattern => 
        val.includes(pattern.toUpperCase())
      )
    );

    // Check for APP types
    const appValues = uniqueValues.filter(val => 
      this.APP_PATTERNS.providerTypes.some(pattern => 
        val.includes(pattern.toUpperCase())
      )
    );

    if (physicianValues.length > 0) {
      evidence.push(`Found physician provider types: ${physicianValues.join(', ')}`);
      return { providerType: 'PHYSICIAN', evidence };
    }

    if (appValues.length > 0) {
      evidence.push(`Found APP provider types: ${appValues.join(', ')}`);
      return { providerType: 'APP', evidence };
    }

    return { providerType: 'UNKNOWN', evidence };
  }

  /**
   * Detect provider type from specialty names
   */
  private static detectFromSpecialtyNames(data: RawSurveyData): { providerType: ProviderType | 'UNKNOWN'; evidence: string[] } {
    const evidence: string[] = [];
    
    // Find specialty column
    const specialtyColumn = data.columns.find(col => 
      col.toLowerCase().includes('specialty') || 
      col.toLowerCase().includes('speciality')
    );

    if (!specialtyColumn) {
      return { providerType: 'UNKNOWN', evidence };
    }

    // Get unique specialty values
    const specialties = data.rows
      .map(row => row[specialtyColumn])
      .filter(value => value && typeof value === 'string')
      .map(value => value.trim());

    const uniqueSpecialties = [...new Set(specialties)];

    // Check for physician-specific specialties
    const physicianSpecialties = uniqueSpecialties.filter(specialty => 
      this.PHYSICIAN_PATTERNS.specialties.some(pattern => 
        specialty.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    // Check for APP-specific specialties
    const appSpecialties = uniqueSpecialties.filter(specialty => 
      this.APP_PATTERNS.specialties.some(pattern => 
        specialty.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    if (physicianSpecialties.length > appSpecialties.length) {
      evidence.push(`Found physician-specific specialties: ${physicianSpecialties.slice(0, 3).join(', ')}`);
      return { providerType: 'PHYSICIAN', evidence };
    }

    if (appSpecialties.length > physicianSpecialties.length) {
      evidence.push(`Found APP-specific specialties: ${appSpecialties.slice(0, 3).join(', ')}`);
      return { providerType: 'APP', evidence };
    }

    return { providerType: 'UNKNOWN', evidence };
  }

  /**
   * Detect provider type from data patterns (compensation ranges)
   */
  private static detectFromDataPatterns(data: RawSurveyData): { providerType: ProviderType | 'UNKNOWN'; evidence: string[] } {
    const evidence: string[] = [];
    
    // Find compensation columns
    const compensationColumns = data.columns.filter(col => 
      col.toLowerCase().includes('tcc') || 
      col.toLowerCase().includes('compensation') ||
      col.toLowerCase().includes('salary')
    );

    if (compensationColumns.length === 0) {
      return { providerType: 'UNKNOWN', evidence };
    }

    // Analyze compensation values
    const compensationValues: number[] = [];
    
    for (const column of compensationColumns) {
      for (const row of data.rows) {
        const value = row[column];
        if (typeof value === 'number' && value > 0) {
          compensationValues.push(value);
        }
      }
    }

    if (compensationValues.length === 0) {
      return { providerType: 'UNKNOWN', evidence };
    }

    // Calculate statistics
    const avgCompensation = compensationValues.reduce((sum, val) => sum + val, 0) / compensationValues.length;

    // Check against known ranges
    const isPhysicianRange = avgCompensation >= this.PHYSICIAN_PATTERNS.compensationRanges.min &&
                           avgCompensation <= this.PHYSICIAN_PATTERNS.compensationRanges.max;

    const isAPPRange = avgCompensation >= this.APP_PATTERNS.compensationRanges.min &&
                      avgCompensation <= this.APP_PATTERNS.compensationRanges.max;

    if (isPhysicianRange && !isAPPRange) {
      evidence.push(`Compensation range suggests physician data (avg: $${avgCompensation.toLocaleString()})`);
      return { providerType: 'PHYSICIAN', evidence };
    }

    if (isAPPRange && !isPhysicianRange) {
      evidence.push(`Compensation range suggests APP data (avg: $${avgCompensation.toLocaleString()})`);
      return { providerType: 'APP', evidence };
    }

    return { providerType: 'UNKNOWN', evidence };
  }

  /**
   * Validate provider data for consistency
   */
  public static validateProviderData(data: RawSurveyData, providerType: ProviderType): ProviderValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check required columns
    const requiredColumns = this.getRequiredColumns(providerType);
    const missingColumns = requiredColumns.filter(col => 
      !data.columns.some(dataCol => dataCol.toLowerCase().includes(col.toLowerCase()))
    );

    if (missingColumns.length > 0) {
      errors.push(`Missing required columns for ${providerType} data: ${missingColumns.join(', ')}`);
    }

    // Check data consistency
    if (providerType === 'PHYSICIAN') {
      this.validatePhysicianData(data, errors, warnings, suggestions);
    } else if (providerType === 'APP') {
      this.validateAPPData(data, errors, warnings, suggestions);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Get required columns for provider type
   */
  private static getRequiredColumns(providerType: ProviderType): string[] {
    const baseColumns = ['specialty', 'region', 'tcc_p50'];
    
    if (providerType === 'PHYSICIAN') {
      return [...baseColumns, 'provider_type'];
    } else if (providerType === 'APP') {
      return [...baseColumns, 'provider_type', 'certification', 'practice_setting'];
    }

    return baseColumns;
  }

  /**
   * Validate physician-specific data
   */
  private static validatePhysicianData(
    data: RawSurveyData, 
    errors: string[], 
    warnings: string[], 
    suggestions: string[]
  ): void {
    // Check for physician provider types
    const providerTypeColumn = data.columns.find(col => 
      col.toLowerCase().includes('provider') || col.toLowerCase().includes('type')
    );

    if (providerTypeColumn) {
      const providerTypes = data.rows
        .map(row => row[providerTypeColumn])
        .filter(value => value && typeof value === 'string')
        .map(value => value.trim().toUpperCase());

      const nonPhysicianTypes = providerTypes.filter(type => 
        !this.PHYSICIAN_PATTERNS.providerTypes.some(pattern => 
          type.includes(pattern.toUpperCase())
        )
      );

      if (nonPhysicianTypes.length > 0) {
        warnings.push(`Found non-physician provider types: ${[...new Set(nonPhysicianTypes)].join(', ')}`);
        suggestions.push('Consider using APP data pipeline for non-physician providers');
      }
    }
  }

  /**
   * Validate APP-specific data
   */
  private static validateAPPData(
    data: RawSurveyData, 
    errors: string[], 
    warnings: string[], 
    suggestions: string[]
  ): void {
    // Check for APP provider types
    const providerTypeColumn = data.columns.find(col => 
      col.toLowerCase().includes('provider') || col.toLowerCase().includes('type')
    );

    if (providerTypeColumn) {
      const providerTypes = data.rows
        .map(row => row[providerTypeColumn])
        .filter(value => value && typeof value === 'string')
        .map(value => value.trim().toUpperCase());

      const nonAPPTypes = providerTypes.filter(type => 
        !this.APP_PATTERNS.providerTypes.some(pattern => 
          type.includes(pattern.toUpperCase())
        )
      );

      if (nonAPPTypes.length > 0) {
        warnings.push(`Found non-APP provider types: ${[...new Set(nonAPPTypes)].join(', ')}`);
        suggestions.push('Consider using Physician data pipeline for non-APP providers');
      }
    }

    // Check for required APP fields
    const certificationColumn = data.columns.find(col => 
      col.toLowerCase().includes('certification')
    );

    if (!certificationColumn) {
      warnings.push('No certification column found - APP data may be incomplete');
      suggestions.push('Add certification column for better APP data analysis');
    }
  }

  /**
   * Get detection confidence threshold
   */
  public static getConfidenceThreshold(): number {
    return 0.6; // 60% confidence threshold
  }

  /**
   * Check if detection result is reliable
   */
  public static isReliableDetection(result: ProviderDetectionResult): boolean {
    return result.confidence >= this.getConfidenceThreshold() && 
           result.providerType !== 'UNKNOWN' &&
           result.warnings.length === 0;
  }
}
