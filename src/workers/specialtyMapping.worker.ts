// Specialty Mapping Web Worker for background processing
import { ISpecialtyMapping, IUnmappedSpecialty, IAutoMappingConfig } from '../types/specialty';
import { stringSimilarity } from 'string-similarity-js';

interface WorkerMessage {
  action: 'autoMap' | 'generateSuggestions' | 'calculateConfidence';
  data: any;
  config?: IAutoMappingConfig;
}

interface WorkerResponse {
  success: boolean;
  data?: any;
  error?: string;
  progress?: number;
}

// Mock storage service for worker context
class WorkerStorageService {
  private cache = new Map<string, any>();

  async get(key: string): Promise<any> {
    return this.cache.get(key);
  }

  async set(key: string, value: any): Promise<void> {
    this.cache.set(key, value);
  }
}

// Specialty mapping logic optimized for worker
class WorkerSpecialtyMappingService {
  private readonly SYNONYMS: Record<string, string[]> = {
    'cardiology': ['heart', 'cardiac', 'cardiovascular'],
    'orthopedics': ['ortho', 'orthopedic', 'orthopaedic'],
    'pediatrics': ['peds', 'pediatric', 'children'],
    'critical care': ['intensivist', 'critical care medicine', 'icu'],
    'emergency medicine': ['emergency', 'er', 'ed'],
    'internal medicine': ['internist', 'internal med'],
    'obstetrics': ['ob/gyn', 'obgyn', 'obstetrics and gynecology'],
    'anesthesiology': ['anesthesia', 'anesthetist'],
    'family medicine': ['family practice', 'family physician', 'family med'],
    'neurology': ['neurological', 'neuro'],
    'psychiatry': ['psychiatric', 'mental health'],
    'radiology': ['radiologist', 'imaging', 'diagnostic radiology'],
    'surgery': ['surgeon', 'surgical']
  };

  calculateConfidence(
    specialty: string,
    mapping: ISpecialtyMapping,
    useFuzzyMatching: boolean = true,
    useSynonyms: boolean = true
  ): number {
    let maxConfidence = 0;
    const specialtyLower = specialty.toLowerCase();
    const standardizedLower = mapping.standardizedName.toLowerCase();

    // Direct match check
    if (specialtyLower === standardizedLower) {
      return 1.0;
    }

    // Synonym check
    if (useSynonyms) {
      for (const [key, synonyms] of Object.entries(this.SYNONYMS)) {
        const isSpecialtyMatch = specialtyLower.includes(key) || 
          synonyms.some(syn => specialtyLower.includes(syn));
        const isStandardizedMatch = standardizedLower.includes(key) || 
          synonyms.some(syn => standardizedLower.includes(syn));
        
        if (isSpecialtyMatch && isStandardizedMatch) {
          maxConfidence = Math.max(maxConfidence, 0.9);
        }
      }
    }

    // Fuzzy matching
    if (useFuzzyMatching) {
      const fuzzyConfidence = stringSimilarity(specialtyLower, standardizedLower);
      maxConfidence = Math.max(maxConfidence, fuzzyConfidence);
    }

    return maxConfidence;
  }

  findBestMatch(
    specialty: string,
    existingMappings: ISpecialtyMapping[],
    config: IAutoMappingConfig
  ): { standardizedName: string; confidence: number } | null {
    const matches = existingMappings
      .map(mapping => ({
        standardizedName: mapping.standardizedName,
        confidence: this.calculateConfidence(
          specialty,
          mapping,
          config.useFuzzyMatching,
          true
        )
      }))
      .filter(match => match.confidence >= config.confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence);

    return matches[0] || null;
  }

  async generateMappingSuggestions(
    unmappedSpecialties: IUnmappedSpecialty[],
    existingMappings: ISpecialtyMapping[],
    config: IAutoMappingConfig,
    progressCallback?: (progress: number) => void
  ) {
    const suggestions: Array<{
      standardizedName: string;
      confidence: number;
      specialties: Array<{ name: string; surveySource: string }>;
    }> = [];

    const total = unmappedSpecialties.length;
    
    for (let i = 0; i < unmappedSpecialties.length; i++) {
      const specialty = unmappedSpecialties[i];
      
      // Report progress
      if (progressCallback && i % 10 === 0) {
        progressCallback((i / total) * 100);
      }

      const bestMatch = this.findBestMatch(specialty.name, existingMappings, config);
      
      if (bestMatch && bestMatch.confidence >= config.confidenceThreshold) {
        const existingSuggestion = suggestions.find(s => s.standardizedName === bestMatch.standardizedName);
        
        if (existingSuggestion) {
          existingSuggestion.specialties.push({
            name: specialty.name,
            surveySource: specialty.surveySource
          });
        } else {
          suggestions.push({
            standardizedName: bestMatch.standardizedName,
            confidence: bestMatch.confidence,
            specialties: [{
              name: specialty.name,
              surveySource: specialty.surveySource
            }]
          });
        }
      }
    }

    if (progressCallback) {
      progressCallback(100);
    }

    return suggestions;
  }
}

// Worker message handler
const workerService = new WorkerSpecialtyMappingService();

self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { action, data, config } = event.data;
  
  try {
    let response: WorkerResponse = { success: true };

    switch (action) {
      case 'autoMap':
        const { unmappedSpecialties, existingMappings } = data;
        const suggestions = await workerService.generateMappingSuggestions(
          unmappedSpecialties,
          existingMappings,
          config!,
          (progress) => {
            self.postMessage({ type: 'progress', progress });
          }
        );
        response.data = suggestions;
        break;

      case 'generateSuggestions':
        const result = await workerService.generateMappingSuggestions(
          data.unmappedSpecialties,
          data.existingMappings,
          config!
        );
        response.data = result;
        break;

      case 'calculateConfidence':
        const confidence = workerService.calculateConfidence(
          data.specialty,
          data.mapping,
          data.useFuzzyMatching,
          data.useSynonyms
        );
        response.data = confidence;
        break;

      default:
        response = { success: false, error: 'Unknown action' };
    }

    self.postMessage(response);
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export {};
