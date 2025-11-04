/**
 * Provider Detection Service Tests
 * 
 * Tests for the provider detection functionality
 */

import { ProviderDetectionService } from '../ProviderDetectionService';
import { RawSurveyData } from '../../types/provider';

describe('ProviderDetectionService', () => {
  describe('detectProviderType', () => {
    it('should detect physician data from provider type values', () => {
      const rawData: RawSurveyData = {
        columns: ['specialty', 'provider_type', 'tcc_p50'],
        rows: [
          { specialty: 'Cardiology', provider_type: 'MD', tcc_p50: '450000' },
          { specialty: 'Orthopedic Surgery', provider_type: 'DO', tcc_p50: '500000' },
          { specialty: 'Internal Medicine', provider_type: 'MD', tcc_p50: '300000' }
        ],
        surveyId: 'test-survey-1',
        surveyName: 'Test Physician Survey',
        surveySource: 'Test Source'
      };

      const result = ProviderDetectionService.detectProviderType(rawData);

      expect(result.providerType).toBe('PHYSICIAN');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.detectionMethod).toBe('PROVIDER_VALUES');
      expect(result.evidence.length).toBeGreaterThan(0);
    });

    it('should detect APP data from provider type values', () => {
      const rawData: RawSurveyData = {
        columns: ['specialty', 'provider_type', 'certification', 'tcc_p50'],
        rows: [
          { specialty: 'Family Practice NP', provider_type: 'NP', certification: 'FNP', tcc_p50: '120000' },
          { specialty: 'Emergency PA', provider_type: 'PA', certification: 'PA-C', tcc_p50: '110000' },
          { specialty: 'Cardiology NP', provider_type: 'NP', certification: 'AGNP', tcc_p50: '130000' }
        ],
        surveyId: 'test-survey-2',
        surveyName: 'Test APP Survey',
        surveySource: 'Test Source'
      };

      const result = ProviderDetectionService.detectProviderType(rawData);

      expect(result.providerType).toBe('APP');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.detectionMethod).toBe('PROVIDER_VALUES');
      expect(result.evidence.length).toBeGreaterThan(0);
    });

    it('should detect physician data from specialty names', () => {
      const rawData: RawSurveyData = {
        columns: ['specialty', 'tcc_p50'],
        rows: [
          { specialty: 'Cardiology', tcc_p50: '450000' },
          { specialty: 'Orthopedic Surgery', tcc_p50: '500000' },
          { specialty: 'Neurosurgery', tcc_p50: '600000' }
        ],
        surveyId: 'test-survey-3',
        surveyName: 'Test Physician Survey by Specialty',
        surveySource: 'Test Source'
      };

      const result = ProviderDetectionService.detectProviderType(rawData);

      expect(result.providerType).toBe('PHYSICIAN');
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.detectionMethod).toBe('SPECIALTY_NAMES');
    });

    it('should detect APP data from specialty names', () => {
      const rawData: RawSurveyData = {
        columns: ['specialty', 'tcc_p50'],
        rows: [
          { specialty: 'Family Practice NP', tcc_p50: '120000' },
          { specialty: 'Emergency PA', tcc_p50: '110000' },
          { specialty: 'Cardiology NP', tcc_p50: '130000' }
        ],
        surveyId: 'test-survey-4',
        surveyName: 'Test APP Survey by Specialty',
        surveySource: 'Test Source'
      };

      const result = ProviderDetectionService.detectProviderType(rawData);

      expect(result.providerType).toBe('APP');
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.detectionMethod).toBe('SPECIALTY_NAMES');
    });

    it('should detect physician data from compensation ranges', () => {
      const rawData: RawSurveyData = {
        columns: ['specialty', 'tcc_p50'],
        rows: [
          { specialty: 'Unknown Specialty 1', tcc_p50: '450000' },
          { specialty: 'Unknown Specialty 2', tcc_p50: '500000' },
          { specialty: 'Unknown Specialty 3', tcc_p50: '600000' }
        ],
        surveyId: 'test-survey-5',
        surveyName: 'Test Physician Survey by Compensation',
        surveySource: 'Test Source'
      };

      const result = ProviderDetectionService.detectProviderType(rawData);

      expect(result.providerType).toBe('PHYSICIAN');
      expect(result.confidence).toBeGreaterThan(0.1);
      expect(result.detectionMethod).toBe('DATA_PATTERNS');
    });

    it('should detect APP data from compensation ranges', () => {
      const rawData: RawSurveyData = {
        columns: ['specialty', 'tcc_p50'],
        rows: [
          { specialty: 'Unknown Specialty 1', tcc_p50: '120000' },
          { specialty: 'Unknown Specialty 2', tcc_p50: '110000' },
          { specialty: 'Unknown Specialty 3', tcc_p50: '130000' }
        ],
        surveyId: 'test-survey-6',
        surveyName: 'Test APP Survey by Compensation',
        surveySource: 'Test Source'
      };

      const result = ProviderDetectionService.detectProviderType(rawData);

      expect(result.providerType).toBe('APP');
      expect(result.confidence).toBeGreaterThan(0.1);
      expect(result.detectionMethod).toBe('DATA_PATTERNS');
    });

    it('should return UNKNOWN for ambiguous data', () => {
      const rawData: RawSurveyData = {
        columns: ['specialty', 'tcc_p50'],
        rows: [
          { specialty: 'Unknown Specialty', tcc_p50: '250000' },
          { specialty: 'Another Unknown', tcc_p50: '300000' }
        ],
        surveyId: 'test-survey-7',
        surveyName: 'Test Ambiguous Survey',
        surveySource: 'Test Source'
      };

      const result = ProviderDetectionService.detectProviderType(rawData);

      expect(result.providerType).toBe('UNKNOWN');
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateProviderData', () => {
    it('should validate physician data successfully', () => {
      const rawData: RawSurveyData = {
        columns: ['specialty', 'provider_type', 'region', 'tcc_p50'],
        rows: [
          { specialty: 'Cardiology', provider_type: 'MD', region: 'Northeast', tcc_p50: '450000' }
        ],
        surveyId: 'test-survey-8',
        surveyName: 'Test Physician Survey',
        surveySource: 'Test Source'
      };

      const result = ProviderDetectionService.validateProviderData(rawData, 'PHYSICIAN');

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should validate APP data successfully', () => {
      const rawData: RawSurveyData = {
        columns: ['specialty', 'provider_type', 'certification', 'practice_setting', 'region', 'tcc_p50'],
        rows: [
          { 
            specialty: 'Family Practice NP', 
            provider_type: 'NP', 
            certification: 'FNP',
            practice_setting: 'Clinic',
            region: 'Northeast', 
            tcc_p50: '120000' 
          }
        ],
        surveyId: 'test-survey-9',
        surveyName: 'Test APP Survey',
        surveySource: 'Test Source'
      };

      const result = ProviderDetectionService.validateProviderData(rawData, 'APP');

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should return errors for missing required columns', () => {
      const rawData: RawSurveyData = {
        columns: ['specialty', 'tcc_p50'],
        rows: [
          { specialty: 'Cardiology', tcc_p50: '450000' }
        ],
        surveyId: 'test-survey-10',
        surveyName: 'Test Incomplete Survey',
        surveySource: 'Test Source'
      };

      const result = ProviderDetectionService.validateProviderData(rawData, 'PHYSICIAN');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('Missing required columns'))).toBe(true);
    });
  });

  describe('isReliableDetection', () => {
    it('should return true for reliable detection', () => {
      const result = {
        providerType: 'PHYSICIAN' as const,
        confidence: 0.8,
        detectionMethod: 'PROVIDER_VALUES' as const,
        evidence: ['Found physician provider types: MD, DO'],
        warnings: []
      };

      expect(ProviderDetectionService.isReliableDetection(result)).toBe(true);
    });

    it('should return false for unreliable detection', () => {
      const result = {
        providerType: 'UNKNOWN' as const,
        confidence: 0.3,
        detectionMethod: 'DATA_PATTERNS' as const,
        evidence: [],
        warnings: ['Low confidence detection']
      };

      expect(ProviderDetectionService.isReliableDetection(result)).toBe(false);
    });
  });
});
