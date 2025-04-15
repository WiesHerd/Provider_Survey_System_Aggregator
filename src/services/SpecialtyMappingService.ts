import { ISpecialtyMapping, IUnmappedSpecialty, IAutoMappingConfig, ISpecialtyGroup } from '../types/specialty';
import { stringSimilarity } from 'string-similarity-js';
import { LocalStorageService } from './StorageService';
import { ISurveyRow } from '../types/survey';

export class SpecialtyMappingService {
  private storage: LocalStorageService;
  private readonly MAPPINGS_KEY = 'specialty_mappings';
  private readonly GROUPS_KEY = 'specialty_groups';
  private readonly SYNONYMS: Record<string, string[]> = {
    'cardiology': ['heart', 'cardiac', 'cardiovascular'],
    'orthopedics': ['ortho', 'orthopedic', 'orthopaedic'],
    'pediatrics': ['peds', 'pediatric', 'children'],
    // Add more synonyms as needed
  };

  constructor() {
    this.storage = new LocalStorageService();
  }

  async saveMapping(mapping: ISpecialtyMapping): Promise<void> {
    const mappings = await this.getAllMappings();
    const existingIndex = mappings.findIndex(m => m.id === mapping.id);
    
    if (existingIndex >= 0) {
      mappings[existingIndex] = {
        ...mapping,
        updatedAt: new Date().toISOString()
      };
    } else {
      mappings.push({
        ...mapping,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    await this.storage.storeSurveyData<ISpecialtyMapping>({
      id: this.MAPPINGS_KEY,
      metadata: { 
        type: 'specialty_mappings',
        totalRows: mappings.length,
        uniqueSpecialties: [],
        uniqueProviderTypes: [],
        uniqueRegions: [],
        columnMappings: {}
      },
      rows: mappings
    });
  }

  async getAllMappings(): Promise<ISpecialtyMapping[]> {
    try {
      const result = await this.storage.getSurveyData<ISpecialtyMapping>(this.MAPPINGS_KEY);
      return result.rows;
    } catch {
      return [];
    }
  }

  async getUnmappedSpecialties(provider: string): Promise<IUnmappedSpecialty[]> {
    const mappings = await this.getAllMappings();
    const allSpecialties = await this.storage.getSurveyData('all_specialties');
    
    const mappedNames = new Set(
      mappings.flatMap(m => 
        m.sourceNames
          .filter((sn: { provider: string }) => sn.provider === provider)
          .map((sn: { name: string }) => sn.name.toLowerCase())
      )
    );

    return allSpecialties.rows
      .map((row: ISurveyRow) => row.normalizedSpecialty?.toLowerCase())
      .filter((name: string | undefined): name is string => 
        name !== undefined && !mappedNames.has(name)
      )
      .map((name: string) => ({
        name,
        provider,
        suggestedMatches: this.findSuggestedMatches(name, mappings)
      }));
  }

  async autoMapSpecialties(config: IAutoMappingConfig): Promise<ISpecialtyMapping[]> {
    const unmapped = await this.getUnmappedSpecialties(config.provider);
    const existingMappings = await this.getAllMappings();
    const newMappings: ISpecialtyMapping[] = [];

    for (const specialty of unmapped) {
      const bestMatch = this.findBestMatch(
        specialty.name,
        existingMappings,
        config
      );

      if (bestMatch && bestMatch.confidence >= config.confidenceThreshold) {
        const mapping = existingMappings.find(m => m.standardName === bestMatch.standardName);
        if (mapping) {
          mapping.sourceNames.push({
            name: specialty.name,
            provider: config.provider
          });
          await this.saveMapping(mapping);
        }
      }
    }

    return newMappings;
  }

  private findSuggestedMatches(
    specialty: string,
    existingMappings: ISpecialtyMapping[]
  ): Array<{ standardName: string; confidence: number }> {
    return existingMappings
      .map(mapping => ({
        standardName: mapping.standardName,
        confidence: this.calculateConfidence(specialty, mapping)
      }))
      .filter(match => match.confidence > 0.3)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  private findBestMatch(
    specialty: string,
    existingMappings: ISpecialtyMapping[],
    config: IAutoMappingConfig
  ): { standardName: string; confidence: number } | null {
    const matches = existingMappings
      .map(mapping => ({
        standardName: mapping.standardName,
        confidence: this.calculateConfidence(
          specialty,
          mapping,
          config.useStringMatching,
          config.useSynonyms
        )
      }))
      .filter(match => match.confidence >= config.confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence);

    return matches[0] || null;
  }

  private calculateConfidence(
    specialty: string,
    mapping: ISpecialtyMapping,
    useStringMatching: boolean = true,
    useSynonyms: boolean = true
  ): number {
    let maxConfidence = 0;

    // String similarity check
    if (useStringMatching) {
      const similarity = stringSimilarity(
        specialty.toLowerCase(),
        mapping.standardName.toLowerCase()
      );
      maxConfidence = Math.max(maxConfidence, similarity);

      // Check against all source names
      for (const source of mapping.sourceNames) {
        const sourceSimilarity = stringSimilarity(
          specialty.toLowerCase(),
          source.name.toLowerCase()
        );
        maxConfidence = Math.max(maxConfidence, sourceSimilarity);
      }
    }

    // Synonym check
    if (useSynonyms) {
      const words = specialty.toLowerCase().split(/\W+/);
      for (const [key, synonyms] of Object.entries(this.SYNONYMS)) {
        if (
          words.some(word => 
            synonyms.includes(word) || 
            word.includes(key) || 
            key.includes(word)
          )
        ) {
          maxConfidence = Math.max(maxConfidence, 0.8);
        }
      }
    }

    return maxConfidence;
  }

  // Group management methods
  async saveGroup(group: ISpecialtyGroup): Promise<void> {
    const groups = await this.getAllGroups();
    const existingIndex = groups.findIndex(g => g.id === group.id);
    
    if (existingIndex >= 0) {
      groups[existingIndex] = {
        ...group,
        updatedAt: new Date().toISOString()
      };
    } else {
      groups.push({
        ...group,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    await this.storage.storeSurveyData<ISpecialtyGroup>({
      id: this.GROUPS_KEY,
      metadata: { 
        type: 'specialty_groups',
        totalRows: groups.length,
        uniqueSpecialties: [],
        uniqueProviderTypes: [],
        uniqueRegions: [],
        columnMappings: {}
      },
      rows: groups
    });
  }

  async getAllGroups(): Promise<ISpecialtyGroup[]> {
    try {
      const result = await this.storage.getSurveyData<ISpecialtyGroup>(this.GROUPS_KEY);
      return result.rows;
    } catch {
      return [];
    }
  }

  async deleteGroup(groupId: string): Promise<void> {
    const groups = await this.getAllGroups();
    const filteredGroups = groups.filter(g => g.id !== groupId);
    
    await this.storage.storeSurveyData<ISpecialtyGroup>({
      id: this.GROUPS_KEY,
      metadata: { 
        type: 'specialty_groups',
        totalRows: filteredGroups.length,
        uniqueSpecialties: [],
        uniqueProviderTypes: [],
        uniqueRegions: [],
        columnMappings: {}
      },
      rows: filteredGroups
    });
  }
} 