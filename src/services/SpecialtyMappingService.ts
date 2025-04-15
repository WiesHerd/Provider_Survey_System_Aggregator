import { ISpecialtyMapping, ISourceSpecialty, IUnmappedSpecialty, IAutoMappingConfig, ISurveyData, ISpecialtyGroup } from '../types/specialty';
import { stringSimilarity } from 'string-similarity-js';
import { LocalStorageService } from './StorageService';
import { ISurveyRow } from '../types/survey';

export class SpecialtyMappingService {
  private readonly MAPPINGS_KEY = 'specialty-mappings';
  private readonly storageService: LocalStorageService;
  private readonly GROUPS_KEY = 'specialty_groups';
  private readonly SYNONYMS: Record<string, string[]> = {
    'cardiology': ['heart', 'cardiac', 'cardiovascular'],
    'orthopedics': ['ortho', 'orthopedic', 'orthopaedic'],
    'pediatrics': ['peds', 'pediatric', 'children'],
    // Add more synonyms as needed
  };

  constructor(storageService: LocalStorageService) {
    this.storageService = storageService;
  }

  async saveMapping(mapping: ISpecialtyMapping): Promise<void> {
    const mappings = await this.getAllMappings();
    const existingIndex = mappings.findIndex(m => m.id === mapping.id);
    
    if (existingIndex >= 0) {
      mappings[existingIndex] = {
        ...mapping,
        updatedAt: new Date()
      };
    } else {
      mappings.push({
        ...mapping,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await this.storageService.setItem(this.MAPPINGS_KEY, mappings);
  }

  async getAllMappings(): Promise<ISpecialtyMapping[]> {
    try {
      const mappings = await this.storageService.getItem(this.MAPPINGS_KEY) as ISpecialtyMapping[];
      return mappings || [];
    } catch (error) {
      console.error('Error fetching specialty mappings:', error);
      return [];
    }
  }

  async getUnmappedSpecialties(): Promise<IUnmappedSpecialty[]> {
    try {
      const surveys = await this.storageService.listSurveys();
      const specialties: IUnmappedSpecialty[] = [];

      for (const survey of surveys) {
        const metadata = survey.metadata;
        if (metadata && metadata.uniqueSpecialties) {
          metadata.uniqueSpecialties.forEach((specialty: string) => {
            specialties.push({
              id: `${specialty}-${survey.id}`.toLowerCase().replace(/\s+/g, '-'),
              name: specialty,
              surveySource: metadata.surveyProvider || metadata.surveyType || 'Unknown Survey',
              frequency: 1
            });
          });
        }
      }

      return specialties;
    } catch (error) {
      console.error('Error getting unmapped specialties:', error);
      return [];
    }
  }

  async autoMapSpecialties(config: IAutoMappingConfig): Promise<ISpecialtyMapping[]> {
    const unmapped = await this.getUnmappedSpecialties();
    const existingMappings = await this.getAllMappings();
    const newMappings: ISpecialtyMapping[] = [];

    for (const specialty of unmapped) {
      const bestMatch = this.findBestMatch(
        specialty.name,
        existingMappings,
        config
      );

      if (bestMatch && bestMatch.confidence >= config.similarityThreshold) {
        const mapping = existingMappings.find(m => m.standardizedName === bestMatch.standardizedName);
        if (mapping) {
          mapping.sourceSpecialties.push({
            id: crypto.randomUUID(),
            originalName: specialty.name,
            surveySource: specialty.surveySource,
            mappingId: mapping.id
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
  ): Array<{ standardizedName: string; confidence: number }> {
    return existingMappings
      .map(mapping => ({
        standardizedName: mapping.standardizedName,
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
  ): { standardizedName: string; confidence: number } | null {
    const matches = existingMappings
      .map(mapping => ({
        standardizedName: mapping.standardizedName,
        confidence: this.calculateConfidence(
          specialty,
          mapping,
          config.enableFuzzyMatching,
          true
        )
      }))
      .filter(match => match.confidence >= config.similarityThreshold)
      .sort((a, b) => b.confidence - a.confidence);

    return matches[0] || null;
  }

  private calculateConfidence(
    specialty: string,
    mapping: ISpecialtyMapping,
    enableFuzzyMatching: boolean = true,
    useSynonyms: boolean = true
  ): number {
    let maxConfidence = 0;

    // String similarity check
    if (enableFuzzyMatching) {
      const similarity = stringSimilarity(
        specialty.toLowerCase(),
        mapping.standardizedName.toLowerCase()
      );
      maxConfidence = Math.max(maxConfidence, similarity);

      // Check against all source names
      for (const source of mapping.sourceSpecialties) {
        const sourceSimilarity = stringSimilarity(
          specialty.toLowerCase(),
          source.originalName.toLowerCase()
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
        updatedAt: new Date()
      };
    } else {
      const now = new Date();
      groups.push({
        ...group,
        createdAt: now,
        updatedAt: now
      });
    }

    await this.storageService.storeSurveyData<ISpecialtyGroup>({
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
      const result = await this.storageService.getSurveyData<ISpecialtyGroup>(this.GROUPS_KEY);
      return result.rows;
    } catch {
      return [];
    }
  }

  async deleteGroup(groupId: string): Promise<void> {
    const groups = await this.getAllGroups();
    const filteredGroups = groups.filter(g => g.id !== groupId);
    
    await this.storageService.storeSurveyData<ISpecialtyGroup>({
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

  async getMappings(): Promise<ISpecialtyMapping[]> {
    try {
      const mappings = await this.storageService.getItem(this.MAPPINGS_KEY) as ISpecialtyMapping[];
      return mappings || [];
    } catch (error) {
      console.error('Error fetching specialty mappings:', error);
      return [];
    }
  }

  async createMapping(standardizedName: string, sourceSpecialties: ISourceSpecialty[]): Promise<ISpecialtyMapping> {
    const mapping: ISpecialtyMapping = {
      id: crypto.randomUUID(),
      standardizedName,
      sourceSpecialties: sourceSpecialties.map(s => ({
        ...s,
        mappingId: crypto.randomUUID()
      })),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.saveMapping(mapping);
    return mapping;
  }

  async updateMapping(mappingId: string, updates: Partial<ISpecialtyMapping>): Promise<ISpecialtyMapping> {
    const mappings = await this.getMappings();
    const index = mappings.findIndex(m => m.id === mappingId);
    
    if (index === -1) {
      throw new Error(`Mapping with id ${mappingId} not found`);
    }

    const updatedMapping = {
      ...mappings[index],
      ...updates,
      updatedAt: new Date()
    };

    mappings[index] = updatedMapping;
    await this.storageService.setItem(this.MAPPINGS_KEY, mappings);
    return updatedMapping;
  }

  async deleteMapping(mappingId: string): Promise<void> {
    const mappings = await this.getMappings();
    const filteredMappings = mappings.filter(m => m.id !== mappingId);
    await this.storageService.setItem(this.MAPPINGS_KEY, filteredMappings);
  }

  async suggestMappings(specialty: IUnmappedSpecialty, config: IAutoMappingConfig): Promise<ISpecialtyMapping[]> {
    const mappings = await this.getMappings();
    const suggestions: Array<{ mapping: ISpecialtyMapping; similarity: number }> = [];

    for (const mapping of mappings) {
      let maxSimilarity = 0;

      // Compare with standardized name
      const standardizedSimilarity = this.calculateSimilarity(
        specialty.name,
        mapping.standardizedName,
        config
      );
      maxSimilarity = Math.max(maxSimilarity, standardizedSimilarity);

      // Compare with source specialties
      for (const source of mapping.sourceSpecialties) {
        const sourceSimilarity = this.calculateSimilarity(
          specialty.name,
          source.originalName,
          config
        );
        maxSimilarity = Math.max(maxSimilarity, sourceSimilarity);
      }

      if (maxSimilarity >= config.similarityThreshold) {
        suggestions.push({ mapping, similarity: maxSimilarity });
      }
    }

    return suggestions
      .sort((a, b) => b.similarity - a.similarity)
      .map(suggestion => suggestion.mapping);
  }

  private calculateSimilarity(str1: string, str2: string, config: IAutoMappingConfig): number {
    if (!config.caseSensitive) {
      str1 = str1.toLowerCase();
      str2 = str2.toLowerCase();
    }

    if (str1 === str2) return 1;
    if (!config.enableFuzzyMatching) return 0;

    return stringSimilarity(str1, str2);
  }

  async createGroup(standardizedName: string, selectedSpecialties: IUnmappedSpecialty[]): Promise<ISpecialtyGroup> {
    const now = new Date();
    const group: ISpecialtyGroup = {
      id: `${standardizedName}`.toLowerCase().replace(/\s+/g, '-'),
      standardizedName,
      selectedSpecialties,
      createdAt: now,
      updatedAt: now
    };
    
    await this.saveGroup(group);
    return group;
  }
} 