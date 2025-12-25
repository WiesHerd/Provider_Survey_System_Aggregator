/**
 * Data Schema Validation Tests
 * 
 * Tests for Zod schema validation
 */

import {
  validateSurvey,
  validateSurveyData,
  validateSpecialtyMapping,
  safeValidateSurvey,
  safeValidateSurveyData
} from '../dataSchemas';

describe('Data Schemas', () => {
  describe('Survey Schema', () => {
    it('should validate correct survey data', () => {
      const survey = {
        id: 'test-id',
        name: 'Test Survey',
        year: '2024',
        type: 'MGMA',
        uploadDate: new Date(),
        rowCount: 100,
        specialtyCount: 10,
        dataPoints: 1000,
        colorAccent: '#FF5733'
      };

      const result = validateSurvey(survey);
      expect(result.id).toBe('test-id');
      expect(result.name).toBe('Test Survey');
    });

    it('should reject invalid survey data', () => {
      const invalidSurvey = {
        id: '',
        name: '',
        year: 'invalid',
        type: 'MGMA',
        uploadDate: new Date(),
        rowCount: -1,
        specialtyCount: 10,
        dataPoints: 1000,
        colorAccent: 'invalid-color'
      };

      expect(() => validateSurvey(invalidSurvey)).toThrow();
    });

    it('should use safe validation for error handling', () => {
      const invalidSurvey = {
        id: '',
        name: ''
      };

      const result = safeValidateSurvey(invalidSurvey);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Survey Data Schema', () => {
    it('should validate correct survey data', () => {
      const surveyData = {
        id: 'test-id',
        surveyId: 'survey-1',
        data: {},
        tcc_p25: 100000,
        tcc_p50: 150000,
        tcc_p75: 200000,
        tcc_p90: 250000
      };

      const result = validateSurveyData(surveyData);
      expect(result.id).toBe('test-id');
    });

    it('should reject negative percentile values', () => {
      const invalidData = {
        id: 'test-id',
        surveyId: 'survey-1',
        data: {},
        tcc_p25: -1000
      };

      expect(() => validateSurveyData(invalidData)).toThrow();
    });
  });

  describe('Specialty Mapping Schema', () => {
    it('should validate correct specialty mapping', () => {
      const mapping = {
        id: 'mapping-1',
        standardizedName: 'Cardiology',
        sourceSpecialties: [
          {
            id: 'source-1',
            specialty: 'Cardiology',
            surveySource: 'MGMA',
            frequency: 10
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = validateSpecialtyMapping(mapping);
      expect(result.standardizedName).toBe('Cardiology');
    });

    it('should reject mapping without source specialties', () => {
      const invalidMapping = {
        id: 'mapping-1',
        standardizedName: 'Cardiology',
        sourceSpecialties: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(() => validateSpecialtyMapping(invalidMapping)).toThrow();
    });
  });
});



