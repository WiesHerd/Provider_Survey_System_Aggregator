import { ISpecialtyMapping, ISourceSpecialty, IUnmappedSpecialty, IAutoMappingConfig, ISurveyData, ISpecialtyGroup, IMappingSuggestion } from '../types/specialty';
import { stringSimilarity } from 'string-similarity-js';
import { LocalStorageService } from './StorageService';
import { ISurveyRow } from '../types/survey';

export class SpecialtyMappingService {
  private readonly MAPPINGS_KEY = 'specialty-mappings';
  private readonly storageService: LocalStorageService;
  private readonly GROUPS_KEY = 'specialty_groups';
  private readonly LEARNED_MAPPINGS_KEY = 'learned-specialty-mappings';
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
      // Get all surveys
      const surveys = await this.storageService.listSurveys();
      const mappings = await this.getAllMappings();
      const unmappedSpecialties: IUnmappedSpecialty[] = [];
      const mappedNames = new Set<string>();

      // Collect all mapped specialty names (both standardized and original names)
      mappings.forEach(mapping => {
        mappedNames.add(mapping.standardizedName.toLowerCase());
        mapping.sourceSpecialties.forEach((source: ISourceSpecialty) => {
          mappedNames.add(source.specialty.toLowerCase());
        });
      });

      // Process each survey
      for (const survey of surveys) {
        if (!survey.metadata.fileContent) continue;

        const lines = survey.metadata.fileContent.split('\n');
        const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
        const specialtyIdx = headers.findIndex((h: string) => h.includes('specialty'));

        if (specialtyIdx >= 0) {
          // Process each line and extract specialties
          lines.slice(1).forEach((line: string) => {
            const values = line.split(',').map((v: string) => v.trim());
            const specialty = values[specialtyIdx];
            
            // Only add if not already mapped
            if (specialty && !mappedNames.has(specialty.toLowerCase())) {
              unmappedSpecialties.push({
                id: crypto.randomUUID(),
                name: specialty,
                surveySource: survey.metadata.surveyType,
                frequency: 1
              });
            }
          });
        }
      }

      // Combine duplicates and count frequencies
      const specialtyMap = new Map<string, IUnmappedSpecialty>();
      unmappedSpecialties.forEach(specialty => {
        const key = `${specialty.name.toLowerCase()}-${specialty.surveySource}`;
        if (specialtyMap.has(key)) {
          const existing = specialtyMap.get(key)!;
          existing.frequency += 1;
        } else {
          specialtyMap.set(key, { ...specialty });
        }
      });

      return Array.from(specialtyMap.values());
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

      if (bestMatch && bestMatch.confidence >= config.confidenceThreshold) {
        const mapping = existingMappings.find(m => m.standardizedName === bestMatch.standardizedName);
        if (mapping) {
          mapping.sourceSpecialties.push({
            id: crypto.randomUUID(),
            specialty: specialty.name,
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
          config.useFuzzyMatching,
          true
        )
      }))
      .filter(match => match.confidence >= config.confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence);

    return matches[0] || null;
  }

  private calculateConfidence(
    specialty: string,
    mapping: ISpecialtyMapping,
    useFuzzyMatching: boolean = true,
    useSynonyms: boolean = true
  ): number {
    let maxConfidence = 0;
    const specialtyLower = specialty.toLowerCase();
    const standardizedLower = mapping.standardizedName.toLowerCase();

    // Check learned mappings first
    this.getLearnedMapping(specialty).then(learnedMapping => {
      if (learnedMapping && learnedMapping === mapping.standardizedName) {
        return 1.0;
      }
    });

    // Direct match check
    if (specialtyLower === standardizedLower) {
      return 1.0;
    }

    // Critical Care specific matching
    if (specialtyLower.includes('critical care') || 
        specialtyLower.includes('intensivist') || 
        standardizedLower.includes('critical care') || 
        standardizedLower.includes('intensivist')) {
      // If both terms are related to critical care, give very high confidence
      if ((specialtyLower.includes('critical care') || specialtyLower.includes('intensivist')) &&
          (standardizedLower.includes('critical care') || standardizedLower.includes('intensivist'))) {
        return 0.95; // Very high confidence for critical care variations
      }
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

    // String similarity check
    if (useFuzzyMatching) {
      const similarity = stringSimilarity(specialtyLower, standardizedLower);
      maxConfidence = Math.max(maxConfidence, similarity);

      // Check against all source names
      for (const source of mapping.sourceSpecialties) {
        const sourceLower = source.specialty.toLowerCase();
        
        // Direct match with source
        if (specialtyLower === sourceLower) {
          return 1.0;
        }
        
        const sourceSimilarity = stringSimilarity(specialtyLower, sourceLower);
        maxConfidence = Math.max(maxConfidence, sourceSimilarity);

        // Additional check for partial matches
        if (specialtyLower.includes(sourceLower) || sourceLower.includes(specialtyLower)) {
          maxConfidence = Math.max(maxConfidence, 0.85);
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

    // Learn from new mappings
    for (const specialty of sourceSpecialties) {
      if (specialty.specialty !== standardizedName) {
        await this.saveLearningData(specialty.specialty, standardizedName);
      }
    }

    await this.saveMapping(mapping);
    return mapping;
  }

  async updateMapping(mappingId: string, updates: Partial<ISpecialtyMapping>): Promise<ISpecialtyMapping> {
    const mappings = await this.getMappings();
    const index = mappings.findIndex(m => m.id === mappingId);
    
    if (index === -1) {
      throw new Error(`Mapping with id ${mappingId} not found`);
    }

    // Learn from this correction
    if (updates.standardizedName && updates.standardizedName !== mappings[index].standardizedName) {
      await this.saveLearningData(mappings[index].standardizedName, updates.standardizedName);
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

  async clearAllMappings(): Promise<void> {
    await this.storageService.setItem(this.MAPPINGS_KEY, []);
    await this.storageService.setItem(this.LEARNED_MAPPINGS_KEY, {});
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
          source.specialty,
          config
        );
        maxSimilarity = Math.max(maxSimilarity, sourceSimilarity);
      }

      if (maxSimilarity >= config.confidenceThreshold) {
        suggestions.push({ mapping, similarity: maxSimilarity });
      }
    }

    return suggestions
      .sort((a, b) => b.similarity - a.similarity)
      .map(suggestion => suggestion.mapping);
  }

  private calculateSimilarity(str1: string, str2: string, config: IAutoMappingConfig): number {
    // Always case-insensitive comparison
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();

    if (str1 === str2) return 1;
    if (!config.useFuzzyMatching) return 0;

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

  async generateMappingSuggestions(config: IAutoMappingConfig): Promise<IMappingSuggestion[]> {
    const unmappedSpecialties = await this.getUnmappedSpecialties();
    const existingMappings = config.useExistingMappings ? await this.getAllMappings() : [];
    const suggestions: IMappingSuggestion[] = [];

    // Group specialties by similar names
    const groups = new Map<string, Array<{ name: string; surveySource: string }>>();

    // Helper function to normalize strings for comparison
    const normalizeString = (str: string): string => {
      let normalized = str.toLowerCase();
      if (!config.useFuzzyMatching) {
        // Only basic normalization if fuzzy matching is disabled
        return normalized.trim();
      }
      // More aggressive normalization for fuzzy matching
      normalized = normalized
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      return normalized;
    };

    // Function to calculate similarity between two strings
    const calculateSimilarity = (str1: string, str2: string): number => {
      const normalized1 = normalizeString(str1);
      const normalized2 = normalizeString(str2);
      
      if (!config.useFuzzyMatching) {
        // Exact match when fuzzy matching is disabled
        return normalized1 === normalized2 ? 1 : 0;
      }
      
      return stringSimilarity(normalized1, normalized2);
    };

    // First pass: group by exact matches
    unmappedSpecialties.forEach(specialty => {
      let foundMatch = false;
      
      // Check against existing mappings first
      if (config.useExistingMappings) {
        for (const mapping of existingMappings) {
          const similarity = calculateSimilarity(specialty.name, mapping.standardizedName);
          if (similarity >= config.confidenceThreshold) {
            const key = mapping.standardizedName;
            const group = groups.get(key) || [];
            group.push({ name: specialty.name, surveySource: specialty.surveySource });
            groups.set(key, group);
            foundMatch = true;
            break;
          }
        }
      }

      if (!foundMatch) {
        // Try to match with other unmapped specialties
        let matched = false;
        // Convert Map.entries() to Array to avoid iterator issues
        Array.from(groups.entries()).forEach(([key, group]) => {
          if (!matched) {
            const similarity = calculateSimilarity(specialty.name, key);
            if (similarity >= config.confidenceThreshold) {
              group.push({ name: specialty.name, surveySource: specialty.surveySource });
              matched = true;
            }
          }
        });

        if (!matched) {
          // Create new group
          groups.set(specialty.name, [{ name: specialty.name, surveySource: specialty.surveySource }]);
        }
      }
    });

    // Convert groups to suggestions
    // Convert Map.entries() to Array to avoid iterator issues
    Array.from(groups.entries()).forEach(([standardizedName, specialties]) => {
      if (specialties.length > 0) {
        // Calculate average confidence for the group
        let totalConfidence = 0;
        let comparisons = 0;

        for (let i = 0; i < specialties.length; i++) {
          for (let j = i + 1; j < specialties.length; j++) {
            totalConfidence += calculateSimilarity(specialties[i].name, specialties[j].name);
            comparisons++;
          }
        }

        const confidence = comparisons > 0 
          ? totalConfidence / comparisons 
          : (specialties.length === 1 ? 1 : 0);

        suggestions.push({
          standardizedName,
          confidence,
          specialties
        });
      }
    });

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private async saveLearningData(originalName: string, correctedName: string): Promise<void> {
    try {
      const learnedMappings = await this.storageService.getItem(this.LEARNED_MAPPINGS_KEY) || {};
      learnedMappings[originalName.toLowerCase()] = correctedName;
      await this.storageService.setItem(this.LEARNED_MAPPINGS_KEY, learnedMappings);
    } catch (error) {
      console.error('Error saving learning data:', error);
    }
  }

  private async getLearnedMapping(specialty: string): Promise<string | null> {
    try {
      const learnedMappings = await this.storageService.getItem(this.LEARNED_MAPPINGS_KEY) || {};
      return learnedMappings[specialty.toLowerCase()] || null;
    } catch (error) {
      console.error('Error getting learned mapping:', error);
      return null;
    }
  }

  async getLearnedMappings(): Promise<Record<string, string>> {
    try {
      return await this.storageService.getItem(this.LEARNED_MAPPINGS_KEY) || {};
    } catch (error) {
      console.error('Error getting learned mappings:', error);
      return {};
    }
  }

  async removeLearnedMapping(originalName: string): Promise<void> {
    try {
      const learnedMappings = await this.getLearnedMappings();
      delete learnedMappings[originalName.toLowerCase()];
      await this.storageService.setItem(this.LEARNED_MAPPINGS_KEY, learnedMappings);
    } catch (error) {
      console.error('Error removing learned mapping:', error);
    }
  }
} 