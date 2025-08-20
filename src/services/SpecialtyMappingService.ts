import { ISpecialtyMapping, ISourceSpecialty, IUnmappedSpecialty, IAutoMappingConfig, ISurveyData, ISpecialtyGroup, IMappingSuggestion } from '../types/specialty';
import { stringSimilarity } from 'string-similarity-js';
import { LocalStorageService } from './StorageService';
import BackendService from './BackendService';
import { ISurveyRow } from '../types/survey';

const API_BASE_URL = 'http://localhost:3001/api';

export class SpecialtyMappingService {
  private readonly MAPPINGS_KEY = 'specialty-mappings';
  private readonly storageService: LocalStorageService;
  private readonly GROUPS_KEY = 'specialty_groups';
  private readonly LEARNED_MAPPINGS_KEY = 'learned-specialty-mappings';
  
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
      
      // Persist to backend API
      const payload = {
        standardizedName: mapping.standardizedName,
        sourceSpecialties: mapping.sourceSpecialties.map(s => ({
          specialty: s.specialty,
          originalName: s.originalName,
          surveySource: s.surveySource
        }))
      };
      
      const response = await fetch(`${API_BASE_URL}/mappings/specialty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      console.log('✅ Mapping saved successfully');
    } catch (error) {
      console.error('❌ Error saving mapping:', error);
      throw error;
    }
  }

  async getAllMappings(): Promise<ISpecialtyMapping[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/mappings/specialty`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      return data as ISpecialtyMapping[];
    } catch (error) {
      console.error('Error fetching specialty mappings:', error);
      return [];
    }
  }

  async getUnmappedSpecialties(): Promise<IUnmappedSpecialty[]> {
    try {
      console.log('🔄 Fetching unmapped specialties with caching...');
      
      // Get all surveys from backend
      const backendService = BackendService.getInstance();
      console.log('📡 Calling backendService.getAllSurveys()...');
      const surveys = await backendService.getAllSurveys();
      console.log('📊 Surveys received:', surveys.length, surveys);
      
      const mappings = await this.getAllMappings();
      console.log('🗺️ Existing mappings:', mappings.length);
      
      const unmappedSpecialties: IUnmappedSpecialty[] = [];
      const mappedNames = new Set<string>();

      // Collect all mapped specialty names (both standardized and original names)
      mappings.forEach(mapping => {
        mappedNames.add(mapping.standardizedName.toLowerCase().trim());
        mapping.sourceSpecialties.forEach((source: ISourceSpecialty) => {
          mappedNames.add(source.specialty.toLowerCase().trim());
        });
      });
      console.log('✅ Mapped names collected:', Array.from(mappedNames));
      console.log('🔍 All existing mappings:', mappings);

      // Process surveys in batches for better performance
      const batchSize = 10;

      for (let i = 0; i < surveys.length; i += batchSize) {
        const batch = surveys.slice(i, i + batchSize);
        console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(surveys.length / batchSize)}`);
        
        const batchPromises = batch.map(async (survey) => {
          try {
            // Fetch from backend
            console.log(`🔍 Fetching data for survey ${survey.id}...`);
            const { rows } = await backendService.getSurveyData(survey.id, {}, { page: 1, limit: 10000 });
            console.log(`📋 Survey ${survey.id} returned ${rows.length} rows`);
            
            // Extract specialties and count per survey
            const counts = new Map<string, number>();
            
            rows.forEach((row: any, index: number) => {
              // Log all column names from first row
              if (index === 0) {
                console.log('📋 All column names in row:', Object.keys(row));
              }
              
              // Check multiple possible specialty column names
              const possibleSpecialtyColumns = [
                'specialty', 'Specialty', 'Provider Type', 'provider_type', 
                'ProviderType', 'specialty_name', 'SpecialtyName', 'specialtyName',
                'PROVIDER_TYPE', 'SPECIALTY', 'Specialty Type', 'specialty_type'
              ];
              
              let specialty = '';
              for (const colName of possibleSpecialtyColumns) {
                if (row[colName] && typeof row[colName] === 'string' && row[colName].trim()) {
                  specialty = row[colName].trim();
                  console.log(`✅ Found specialty in column "${colName}": ${specialty}`);
                  break;
                }
              }
              
              if (specialty) {
                const key = specialty;
                counts.set(key, (counts.get(key) || 0) + 1);
              }
              
              // Log first few rows for debugging
              if (index < 5) {
                console.log(`Row ${index}:`, { specialty, row });
              }
            });

            console.log(`🏥 Found specialties in survey ${survey.id}:`, Array.from(counts.entries()));
            console.log(`🔍 Raw specialty names from survey ${survey.id}:`, Array.from(counts.keys()));

            const surveySource = (survey as any).type || (survey as any).surveyProvider || 'Unknown';
            return { surveySource, counts };
          } catch (error) {
            console.error(`❌ Error processing survey ${survey.id}:`, error);
            return { surveySource: 'Unknown', counts: new Map<string, number>() };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        // Convert per-survey counts into unmapped entries (one per survey source)
        batchResults.forEach(({ surveySource, counts }) => {
          counts.forEach((count, specialty) => {
            const key = specialty.toLowerCase().trim();
            console.log(`🔍 Processing specialty: "${specialty}" (key: "${key}") from ${surveySource}`);
            if (!mappedNames.has(key)) {
              console.log(`➕ Adding to unmapped: "${specialty}" from ${surveySource}`);
              unmappedSpecialties.push({
                id: `${surveySource}-${specialty}`,
                name: specialty,
                surveySource,
                frequency: count
              });
            } else {
              console.log(`✅ Skipping mapped specialty: "${specialty}" (key: "${key}")`);
            }
          });
        });
      }

      console.log(`✅ Found ${unmappedSpecialties.length} unmapped specialties:`, unmappedSpecialties);
      console.log(`🔍 Final unmapped specialty names:`, unmappedSpecialties.map(s => ({ name: s.name, source: s.surveySource })));
      return unmappedSpecialties;
    } catch (error) {
      console.error('❌ Error getting unmapped specialties:', error);
      return [];
    }
  }

  async autoMapSpecialties(config: IAutoMappingConfig): Promise<ISpecialtyMapping[]> {
    console.log('🚀 Starting auto-mapping with retry logic...');
    
    const unmapped = await this.getUnmappedSpecialties();
    const existingMappings = await this.getAllMappings();
    const newMappings: ISpecialtyMapping[] = [];
    const failedMappings: Array<{ specialty: string; error: string }> = [];

    // Process in batches with retry logic
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < unmapped.length; i += batchSize) {
      batches.push(unmapped.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`📦 Processing auto-mapping batch ${batchIndex + 1}/${batches.length}`);
      
      const batchPromises = batch.map(async (specialty) => {
        return this.processSpecialtyWithRetry(specialty, existingMappings, config, 3);
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        const specialty = batch[index];
        if (result.status === 'fulfilled' && result.value) {
          newMappings.push(result.value);
        } else {
          failedMappings.push({
            specialty: specialty.name,
            error: result.status === 'rejected' ? result.reason?.message || 'Unknown error' : 'Failed to process'
          });
        }
      });
    }

    console.log(`✅ Auto-mapping completed: ${newMappings.length} successful, ${failedMappings.length} failed`);
    
    if (failedMappings.length > 0) {
      console.warn('⚠️ Failed mappings:', failedMappings);
    }

    return newMappings;
  }

  private async processSpecialtyWithRetry(
    specialty: IUnmappedSpecialty,
    existingMappings: ISpecialtyMapping[],
    config: IAutoMappingConfig,
    maxRetries: number
  ): Promise<ISpecialtyMapping | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const bestMatch = this.findBestMatch(specialty.name, existingMappings, config);

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
            return mapping;
          }
        }
        return null; // No match found, not an error
      } catch (error) {
        console.error(`Attempt ${attempt} failed for specialty ${specialty.name}:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    return null;
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

    // Update via backend API
    await fetch(`${API_BASE_URL}/mappings/specialty/${mappingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedMapping)
    });

    return updatedMapping;
  }

  async deleteMapping(mappingId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting mapping:', mappingId);
      
      // Delete via backend API
      const response = await fetch(`${API_BASE_URL}/mappings/specialty/${mappingId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // Clear cache to force refresh
      this.specialtyCache.clear();
      this.cacheExpiry.clear();
      
      console.log('✅ Mapping deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting mapping:', error);
      throw error;
    }
  }

  async clearAllMappings(): Promise<void> {
    console.log('🔄 SpecialtyMappingService: Clearing all mappings...');
    try {
      // Clear via DataService (which handles IndexedDB)
      const { getDataService } = await import('../services/DataService');
      const dataService = getDataService();
      await dataService.clearAllSpecialtyMappings();
      
      console.log('✅ IndexedDB mappings cleared successfully');
      
      // Clear learned mappings from local storage
      await this.storageService.setItem(this.LEARNED_MAPPINGS_KEY, {});
      console.log('✅ Local storage cleared successfully');
      
      // Clear cache to force refresh
      this.specialtyCache.clear();
      this.cacheExpiry.clear();
      
    } catch (error) {
      console.error('❌ Error in clearAllMappings:', error);
      throw error;
    }
  }

  // Force refresh unmapped specialties (bypass cache)
  async refreshUnmappedSpecialties(): Promise<IUnmappedSpecialty[]> {
    console.log('🔄 Force refreshing unmapped specialties...');
    
    // Clear cache
    this.specialtyCache.clear();
    this.cacheExpiry.clear();
    
    // Fetch fresh data
    return await this.getUnmappedSpecialties();
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
    console.log('🚀 Starting local AI-based mapping suggestions...');
    
    const unmappedSpecialties = await this.getUnmappedSpecialties();
    const existingMappings = config.useExistingMappings ? await this.getAllMappings() : [];
    const learnedMappings = await this.getLearnedMappings();

    console.log(`📊 Processing ${unmappedSpecialties.length} unmapped specialties`);
    console.log(`📊 Using ${existingMappings.length} existing mappings`);
    console.log(`📊 Using ${Object.keys(learnedMappings).length} learned mappings`);

    try {
      // Import the LLM-based function
      const { generateMappingSuggestions } = await import('../features/mapping/utils/mappingCalculations');
      
      // Convert existingMappings to the correct type
      const convertedExistingMappings = existingMappings.map(mapping => ({
        ...mapping,
        sourceSpecialties: mapping.sourceSpecialties.map(specialty => ({
          id: specialty.id || crypto.randomUUID(),
          specialty: specialty.specialty,
          originalName: specialty.originalName || specialty.specialty,
          surveySource: specialty.surveySource as any,
          frequency: specialty.frequency || 1,
          mappingId: specialty.mappingId || ''
        }))
      }));
      
      const suggestions = await generateMappingSuggestions(
        unmappedSpecialties,
        convertedExistingMappings,
        learnedMappings,
        config
      );

      console.log(`✅ Generated ${suggestions.length} LLM-based suggestions`);
      return suggestions;

    } catch (error) {
      console.error('❌ LLM-based suggestions failed, falling back to original method:', error);
      
      // Fallback to original method
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
              group.push({ name: specialty.name, surveySource: specialty.surveySource as any });
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
                group.push({ name: specialty.name, surveySource: specialty.surveySource as any });
                matched = true;
              }
            }
          });

          if (!matched) {
            // Create new group
            groups.set(specialty.name, [{ name: specialty.name, surveySource: specialty.surveySource as any }]);
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

          if (confidence >= config.confidenceThreshold) {
            suggestions.push({
              standardizedName,
              confidence,
              specialties
            });
          }
        }
      });

      console.log(`✅ Generated ${suggestions.length} fallback suggestions`);
      return suggestions;
    }
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