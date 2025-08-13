import { SpecialtyMappingService } from '../SpecialtyMappingService';
import { LocalStorageService } from '../StorageService';
import { ISpecialtyMapping, IUnmappedSpecialty, IAutoMappingConfig } from '../../types/specialty';

// Mock dependencies
jest.mock('../StorageService');
jest.mock('../BackendService');

describe('SpecialtyMappingService', () => {
  let service: SpecialtyMappingService;
  let mockStorageService: jest.Mocked<LocalStorageService>;

  beforeEach(() => {
    mockStorageService = new LocalStorageService() as jest.Mocked<LocalStorageService>;
    service = new SpecialtyMappingService(mockStorageService);
  });

  describe('calculateConfidence', () => {
    const mockMapping: ISpecialtyMapping = {
      id: '1',
      standardizedName: 'Cardiology',
      sourceSpecialties: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should return 1.0 for exact matches', () => {
      const confidence = service['calculateConfidence']('Cardiology', mockMapping);
      expect(confidence).toBe(1.0);
    });

    it('should return high confidence for synonym matches', () => {
      const confidence = service['calculateConfidence']('Cardiovascular Disease', mockMapping);
      expect(confidence).toBeGreaterThan(0.8);
    });

    it('should return lower confidence for fuzzy matches', () => {
      const confidence = service['calculateConfidence']('Cardiolgy', mockMapping, true, false);
      expect(confidence).toBeGreaterThan(0.5);
      expect(confidence).toBeLessThan(1.0);
    });

    it('should return 0 for no matches when fuzzy matching disabled', () => {
      const confidence = service['calculateConfidence']('Orthopedics', mockMapping, false, false);
      expect(confidence).toBe(0);
    });
  });

  describe('findBestMatch', () => {
    const mockMappings: ISpecialtyMapping[] = [
      {
        id: '1',
        standardizedName: 'Cardiology',
        sourceSpecialties: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        standardizedName: 'Family Medicine',
        sourceSpecialties: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const config: IAutoMappingConfig = {
      confidenceThreshold: 0.8,
      useExistingMappings: true,
      useFuzzyMatching: true
    };

    it('should find exact match', () => {
      const result = service['findBestMatch']('Cardiology', mockMappings, config);
      expect(result).toEqual({
        standardizedName: 'Cardiology',
        confidence: 1.0
      });
    });

    it('should find synonym match', () => {
      const result = service['findBestMatch']('Cardiovascular Disease', mockMappings, config);
      expect(result?.standardizedName).toBe('Cardiology');
      expect(result?.confidence).toBeGreaterThan(0.8);
    });

    it('should return null for no matches', () => {
      const result = service['findBestMatch']('Unknown Specialty', mockMappings, config);
      expect(result).toBeNull();
    });

    it('should respect confidence threshold', () => {
      const highThresholdConfig = { ...config, confidenceThreshold: 0.95 };
      const result = service['findBestMatch']('Cardiolgy', mockMappings, highThresholdConfig);
      expect(result).toBeNull();
    });
  });

  describe('autoMapSpecialties', () => {
    const mockUnmapped: IUnmappedSpecialty[] = [
      {
        id: '1',
        name: 'Cardiovascular Disease',
        surveySource: 'MGMA',
        frequency: 1
      },
      {
        id: '2',
        name: 'Family Practice',
        surveySource: 'SullivanCotter',
        frequency: 1
      }
    ];

    const mockMappings: ISpecialtyMapping[] = [
      {
        id: '1',
        standardizedName: 'Cardiology',
        sourceSpecialties: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        standardizedName: 'Family Medicine',
        sourceSpecialties: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    beforeEach(() => {
      jest.spyOn(service, 'getUnmappedSpecialties').mockResolvedValue(mockUnmapped);
      jest.spyOn(service, 'getAllMappings').mockResolvedValue(mockMappings);
      jest.spyOn(service, 'saveMapping').mockResolvedValue();
    });

    it('should auto-map specialties with high confidence', async () => {
      const config: IAutoMappingConfig = {
        confidenceThreshold: 0.8,
        useExistingMappings: true,
        useFuzzyMatching: true
      };

      const result = await service.autoMapSpecialties(config);

      expect(result.length).toBeGreaterThan(0);
      expect(service.saveMapping).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(service, 'saveMapping').mockRejectedValue(new Error('Database error'));

      const config: IAutoMappingConfig = {
        confidenceThreshold: 0.8,
        useExistingMappings: true,
        useFuzzyMatching: true
      };

      const result = await service.autoMapSpecialties(config);

      expect(result.length).toBe(0);
    });
  });

  describe('generateMappingSuggestions', () => {
    const mockUnmapped: IUnmappedSpecialty[] = [
      {
        id: '1',
        name: 'Cardiovascular Disease',
        surveySource: 'MGMA',
        frequency: 1
      }
    ];

    const mockMappings: ISpecialtyMapping[] = [
      {
        id: '1',
        standardizedName: 'Cardiology',
        sourceSpecialties: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    it('should generate suggestions for unmapped specialties', async () => {
      const config: IAutoMappingConfig = {
        confidenceThreshold: 0.8,
        useExistingMappings: true,
        useFuzzyMatching: true
      };

      const suggestions = await service.generateMappingSuggestions(config);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('standardizedName');
      expect(suggestions[0]).toHaveProperty('confidence');
      expect(suggestions[0]).toHaveProperty('specialties');
    });
  });

  describe('createMapping', () => {
    it('should create new mapping and learn from it', async () => {
      const standardizedName = 'Cardiology';
      const sourceSpecialties = [
        {
          id: '1',
          specialty: 'Cardiovascular Disease',
          originalName: 'Cardiovascular Disease',
          surveySource: 'MGMA',
          mappingId: ''
        }
      ];

      jest.spyOn(service, 'saveMapping').mockResolvedValue();
      jest.spyOn(service, 'saveLearningData').mockResolvedValue();

      const result = await service.createMapping(standardizedName, sourceSpecialties);

      expect(result.standardizedName).toBe(standardizedName);
      expect(result.sourceSpecialties).toHaveLength(1);
      expect(service.saveMapping).toHaveBeenCalled();
      expect(service.saveLearningData).toHaveBeenCalled();
    });
  });

  describe('getUnmappedSpecialties', () => {
    it('should return unmapped specialties with caching', async () => {
      const mockSurveys = [
        { id: '1', type: 'MGMA' },
        { id: '2', type: 'SullivanCotter' }
      ];

      const mockSurveyData = {
        rows: [
          { specialty: 'Cardiovascular Disease' },
          { specialty: 'Family Practice' }
        ]
      };

      // Mock BackendService
      const mockBackendService = {
        getAllSurveys: jest.fn().mockResolvedValue(mockSurveys),
        getSurveyData: jest.fn().mockResolvedValue(mockSurveyData)
      };

      jest.spyOn(service, 'getAllMappings').mockResolvedValue([]);
      
      // Mock the BackendService.getInstance()
      jest.doMock('../BackendService', () => ({
        getInstance: () => mockBackendService
      }));

      const result = await service.getUnmappedSpecialties();

      expect(result.length).toBeGreaterThan(0);
      expect(mockBackendService.getAllSurveys).toHaveBeenCalled();
      expect(mockBackendService.getSurveyData).toHaveBeenCalledTimes(2);
    });
  });
});
