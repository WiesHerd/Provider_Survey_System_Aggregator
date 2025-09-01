import { ISpecialtyMapping, ISourceSpecialty, IUnmappedSpecialty, IAutoMappingConfig, ISurveyData, ISpecialtyGroup, IMappingSuggestion } from '../types/specialty';
import { stringSimilarity } from 'string-similarity-js';
import { LocalStorageService } from './StorageService';
import { getDataService } from './DataService';
import { ISurveyRow } from '../types/survey';

export class SpecialtyMappingService {
  private readonly MAPPINGS_KEY = 'specialty-mappings';
  private readonly storageService: LocalStorageService;
  private readonly GROUPS_KEY = 'specialty_groups';
  private readonly LEARNED_MAPPINGS_KEY = 'learned-specialty-mappings';
  private dataService = getDataService();
  
  // Add caching for performance
  private specialtyCache = new Map<string, Set<string>>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private readonly SYNONYMS: Record<string, string[]> = {
    'cardiology': ['heart', 'cardiac', 'cardiovascular'],
    'orthopedics': ['ortho', 'orthopedic', 'orthopaedic'],
    'pediatrics': ['peds', 'pediatric', 'children'],
    'critical care': [
      'intensivist', 
      'critical care medicine', 
      'critical care/intensivist', 
      'intensive care',
      'critical care medicine',
      'cc medicine',
      'cc/intensivist',
      'icu'
    ],
    'emergency medicine': ['emergency', 'er', 'ed'],
    'internal medicine': ['internist', 'internal med'],
    'obstetrics': ['ob/gyn', 'obgyn', 'obstetrics and gynecology', 'obstetrics & gynecology'],
    'anesthesiology': ['anesthesia', 'anesthetist'],
    'family medicine': ['family practice', 'family physician', 'family med'],
    'neurology': ['neurological', 'neuro'],
    'psychiatry': ['psychiatric', 'mental health'],
    'radiology': ['radiologist', 'imaging', 'diagnostic radiology'],
    'surgery': ['surgeon', 'surgical']
  };

  constructor(storageService: LocalStorageService) {
    this.storageService = storageService;
  }

  async saveMapping(mapping: ISpecialtyMapping): Promise<void> {
    try {
      console.log('💾 Saving mapping:', mapping.standardizedName);
      await this.dataService.createSpecialtyMapping(mapping);
      
      // Save learned mappings for each source specialty
      for (const source of mapping.sourceSpecialties) {
        try {
          await this.dataService.saveLearnedMapping('specialty', source.specialty, mapping.standardizedName);
        } catch (learnedError) {
          console.warn('Failed to save learned mapping for', source.specialty, learnedError);
        }
      }
      
      console.log('✅ Mapping saved successfully');
    } catch (error) {
      console.error('❌ Error saving mapping:', error);
      throw error;
    }
  }

  async getAllMappings(): Promise<ISpecialtyMapping[]> {
    try {
      return await this.dataService.getAllSpecialtyMappings();
    } catch (error) {
      console.error('Error fetching specialty mappings:', error);
      return [];
    }
  }

  async getUnmappedSpecialties(): Promise<IUnmappedSpecialty[]> {
    try {
      return await this.dataService.getUnmappedSpecialties();
    } catch (error) {
      console.error('Error getting unmapped specialties:', error);
      return [];
    }
  }

  async deleteMapping(mappingId: string): Promise<void> {
    try {
      await this.dataService.deleteSpecialtyMapping(mappingId);
    } catch (error) {
      console.error('Error deleting specialty mapping:', error);
      throw error;
    }
  }

  async clearAllMappings(): Promise<void> {
    try {
      await this.dataService.clearAllSpecialtyMappings();
    } catch (error) {
      console.error('Error clearing specialty mappings:', error);
      throw error;
    }
  }

  async getLearnedMappings(): Promise<Record<string, string>> {
    try {
      return await this.dataService.getLearnedMappings('specialty');
    } catch (error) {
      console.error('Error getting learned mappings:', error);
      return {};
    }
  }

  async removeLearnedMapping(originalName: string): Promise<void> {
    try {
      await this.dataService.removeLearnedMapping('specialty', originalName.toLowerCase());
    } catch (error) {
      console.error('Error removing learned mapping:', error);
    }
  }

  async autoMapSpecialties(config: IAutoMappingConfig): Promise<ISpecialtyMapping[]> {
    try {
      return await this.dataService.autoMapSpecialties(config);
    } catch (error) {
      console.error('Error auto-mapping specialties:', error);
      return [];
    }
  }

  async suggestMappings(specialty: IUnmappedSpecialty, config: IAutoMappingConfig): Promise<ISpecialtyMapping[]> {
    try {
      return await this.dataService.suggestSpecialtyMappings(specialty, config);
    } catch (error) {
      console.error('Error suggesting mappings:', error);
      return [];
    }
  }

  async updateMapping(mappingId: string, updates: Partial<ISpecialtyMapping>): Promise<ISpecialtyMapping> {
    try {
      return await this.dataService.updateSpecialtyMapping(mappingId, updates);
    } catch (error) {
      console.error('Error updating mapping:', error);
      throw error;
    }
  }

  async refreshUnmappedSpecialties(): Promise<IUnmappedSpecialty[]> {
    console.log('🔄 Force refreshing unmapped specialties...');
    
    // Clear cache
    this.specialtyCache.clear();
    this.cacheExpiry.clear();
    
    // Fetch fresh data
    return await this.getUnmappedSpecialties();
  }
} 