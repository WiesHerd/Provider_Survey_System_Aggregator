import { APPSpecialtyMapping, APPSourceSpecialty } from '../types/provider';

/**
 * APP Specialty Mapping Service
 * Handles specialty mapping operations specific to Advanced Practice Provider (APP) data
 */
class APPSpecialtyMappingService {
  private static instance: APPSpecialtyMappingService;
  private mappings: APPSpecialtyMapping[] = [];
  private readonly STORAGE_KEY = 'app_specialty_mappings';

  private constructor() {
    this.loadMappings();
  }

  public static getInstance(): APPSpecialtyMappingService {
    if (!APPSpecialtyMappingService.instance) {
      APPSpecialtyMappingService.instance = new APPSpecialtyMappingService();
    }
    return APPSpecialtyMappingService.instance;
  }

  /**
   * Load mappings from localStorage
   */
  private loadMappings(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.mappings = JSON.parse(stored);
      } else {
        this.initializeDefaultMappings();
      }
    } catch (error) {
      console.error('Error loading APP specialty mappings:', error);
      this.initializeDefaultMappings();
    }
  }

  /**
   * Save mappings to localStorage
   */
  private saveMappings(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.mappings));
    } catch (error) {
      console.error('Error saving APP specialty mappings:', error);
    }
  }

  /**
   * Initialize default APP specialty mappings
   */
  private initializeDefaultMappings(): void {
    this.mappings = [
      {
        id: 'app-cardiology',
        standardizedName: 'Cardiology',
        sourceSpecialties: [
          {
            id: 'app-card-1',
            specialty: 'Cardiology',
            originalName: 'Cardiology',
            surveySource: 'MGMA',
            certification: 'NP',
            practiceSetting: 'Hospital',
            mappingId: 'app-cardiology',
          },
          {
            id: 'app-card-2',
            specialty: 'Cardiovascular',
            originalName: 'Cardiovascular',
            surveySource: 'SullivanCotter',
            certification: 'PA',
            practiceSetting: 'Clinic',
            mappingId: 'app-cardiology',
          },
        ],
        providerType: 'APP',
        certification: 'NP',
        practiceSetting: 'Hospital',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'app-emergency',
        standardizedName: 'Emergency Medicine',
        sourceSpecialties: [
          {
            id: 'app-em-1',
            specialty: 'Emergency Medicine',
            originalName: 'Emergency Medicine',
            surveySource: 'MGMA',
            certification: 'PA',
            practiceSetting: 'Hospital',
            mappingId: 'app-emergency',
          },
          {
            id: 'app-em-2',
            specialty: 'ER',
            originalName: 'ER',
            surveySource: 'Gallagher',
            certification: 'NP',
            practiceSetting: 'Hospital',
            mappingId: 'app-emergency',
          },
        ],
        providerType: 'APP',
        certification: 'PA',
        practiceSetting: 'Hospital',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'app-family-medicine',
        standardizedName: 'Family Medicine',
        sourceSpecialties: [
          {
            id: 'app-fm-1',
            specialty: 'Family Medicine',
            originalName: 'Family Medicine',
            surveySource: 'MGMA',
            certification: 'NP',
            practiceSetting: 'Clinic',
            mappingId: 'app-family-medicine',
          },
          {
            id: 'app-fm-2',
            specialty: 'Family Practice',
            originalName: 'Family Practice',
            surveySource: 'SullivanCotter',
            certification: 'PA',
            practiceSetting: 'Private Practice',
            mappingId: 'app-family-medicine',
          },
        ],
        providerType: 'APP',
        certification: 'NP',
        practiceSetting: 'Clinic',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'app-internal-medicine',
        standardizedName: 'Internal Medicine',
        sourceSpecialties: [
          {
            id: 'app-im-1',
            specialty: 'Internal Medicine',
            originalName: 'Internal Medicine',
            surveySource: 'MGMA',
            certification: 'NP',
            practiceSetting: 'Hospital',
            mappingId: 'app-internal-medicine',
          },
          {
            id: 'app-im-2',
            specialty: 'General Internal Medicine',
            originalName: 'General Internal Medicine',
            surveySource: 'Gallagher',
            certification: 'PA',
            practiceSetting: 'Clinic',
            mappingId: 'app-internal-medicine',
          },
        ],
        providerType: 'APP',
        certification: 'NP',
        practiceSetting: 'Hospital',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'app-pediatrics',
        standardizedName: 'Pediatrics',
        sourceSpecialties: [
          {
            id: 'app-peds-1',
            specialty: 'Pediatrics',
            originalName: 'Pediatrics',
            surveySource: 'MGMA',
            certification: 'NP',
            practiceSetting: 'Clinic',
            mappingId: 'app-pediatrics',
          },
          {
            id: 'app-peds-2',
            specialty: 'Pediatric Care',
            originalName: 'Pediatric Care',
            surveySource: 'SullivanCotter',
            certification: 'PA',
            practiceSetting: 'Hospital',
            mappingId: 'app-pediatrics',
          },
        ],
        providerType: 'APP',
        certification: 'NP',
        practiceSetting: 'Clinic',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'app-orthopedics',
        standardizedName: 'Orthopedics',
        sourceSpecialties: [
          {
            id: 'app-ortho-1',
            specialty: 'Orthopedics',
            originalName: 'Orthopedics',
            surveySource: 'MGMA',
            certification: 'PA',
            practiceSetting: 'Hospital',
            mappingId: 'app-orthopedics',
          },
          {
            id: 'app-ortho-2',
            specialty: 'Orthopedic Surgery',
            originalName: 'Orthopedic Surgery',
            surveySource: 'Gallagher',
            certification: 'NP',
            practiceSetting: 'Clinic',
            mappingId: 'app-orthopedics',
          },
        ],
        providerType: 'APP',
        certification: 'PA',
        practiceSetting: 'Hospital',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    this.saveMappings();
  }

  /**
   * Get all APP specialty mappings
   */
  public getAllMappings(): APPSpecialtyMapping[] {
    return [...this.mappings];
  }

  /**
   * Get mapping by ID
   */
  public getMappingById(id: string): APPSpecialtyMapping | null {
    return this.mappings.find(mapping => mapping.id === id) || null;
  }

  /**
   * Get mappings by certification
   */
  public getMappingsByCertification(certification: string): APPSpecialtyMapping[] {
    return this.mappings.filter(mapping => mapping.certification === certification);
  }

  /**
   * Get mappings by practice setting
   */
  public getMappingsByPracticeSetting(practiceSetting: string): APPSpecialtyMapping[] {
    return this.mappings.filter(mapping => mapping.practiceSetting === practiceSetting);
  }

  /**
   * Create new mapping
   */
  public createMapping(mapping: Omit<APPSpecialtyMapping, 'id' | 'createdAt' | 'updatedAt'>): APPSpecialtyMapping {
    const newMapping: APPSpecialtyMapping = {
      ...mapping,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.mappings.push(newMapping);
    this.saveMappings();
    return newMapping;
  }

  /**
   * Update existing mapping
   */
  public updateMapping(id: string, updates: Partial<APPSpecialtyMapping>): APPSpecialtyMapping | null {
    const index = this.mappings.findIndex(mapping => mapping.id === id);
    if (index === -1) return null;

    this.mappings[index] = {
      ...this.mappings[index],
      ...updates,
      updatedAt: new Date(),
    };

    this.saveMappings();
    return this.mappings[index];
  }

  /**
   * Delete mapping
   */
  public deleteMapping(id: string): boolean {
    const index = this.mappings.findIndex(mapping => mapping.id === id);
    if (index === -1) return false;

    this.mappings.splice(index, 1);
    this.saveMappings();
    return true;
  }

  /**
   * Add source specialty to mapping
   */
  public addSourceSpecialty(mappingId: string, sourceSpecialty: Omit<APPSourceSpecialty, 'id' | 'mappingId'>): boolean {
    const mapping = this.getMappingById(mappingId);
    if (!mapping) return false;

    const newSourceSpecialty: APPSourceSpecialty = {
      ...sourceSpecialty,
      id: this.generateId(),
      mappingId,
    };

    mapping.sourceSpecialties.push(newSourceSpecialty);
    mapping.updatedAt = new Date();
    this.saveMappings();
    return true;
  }

  /**
   * Remove source specialty from mapping
   */
  public removeSourceSpecialty(mappingId: string, sourceSpecialtyId: string): boolean {
    const mapping = this.getMappingById(mappingId);
    if (!mapping) return false;

    const index = mapping.sourceSpecialties.findIndex(source => source.id === sourceSpecialtyId);
    if (index === -1) return false;

    mapping.sourceSpecialties.splice(index, 1);
    mapping.updatedAt = new Date();
    this.saveMappings();
    return true;
  }

  /**
   * Find standardized specialty for a source specialty
   */
  public findStandardizedSpecialty(
    sourceSpecialty: string,
    certification?: string,
    practiceSetting?: string
  ): string | null {
    for (const mapping of this.mappings) {
      // Check if certification matches (if provided)
      if (certification && mapping.certification !== certification) continue;
      
      // Check if practice setting matches (if provided)
      if (practiceSetting && mapping.practiceSetting !== practiceSetting) continue;

      // Check if any source specialty matches
      const matchingSource = mapping.sourceSpecialties.find(source => 
        source.originalName.toLowerCase() === sourceSpecialty.toLowerCase() ||
        source.specialty.toLowerCase() === sourceSpecialty.toLowerCase()
      );

      if (matchingSource) {
        return mapping.standardizedName;
      }
    }

    return null;
  }

  /**
   * Get unmapped specialties
   */
  public getUnmappedSpecialties(surveyData: any[]): string[] {
    const allSpecialties = new Set<string>();
    const mappedSpecialties = new Set<string>();

    // Collect all specialties from survey data
    surveyData.forEach(row => {
      if (row.specialty) {
        allSpecialties.add(row.specialty);
      }
    });

    // Check which specialties are mapped
    allSpecialties.forEach(specialty => {
      const standardized = this.findStandardizedSpecialty(
        specialty,
        surveyData.find(row => row.specialty === specialty)?.certification,
        surveyData.find(row => row.specialty === specialty)?.practiceSetting
      );
      if (standardized) {
        mappedSpecialties.add(specialty);
      }
    });

    // Return unmapped specialties
    return Array.from(allSpecialties).filter(specialty => !mappedSpecialties.has(specialty));
  }

  /**
   * Auto-map specialties using similarity matching
   */
  public autoMapSpecialties(surveyData: any[]): Array<{
    sourceSpecialty: string;
    suggestedMapping: string;
    confidence: number;
  }> {
    const unmappedSpecialties = this.getUnmappedSpecialties(surveyData);
    const suggestions: Array<{
      sourceSpecialty: string;
      suggestedMapping: string;
      confidence: number;
    }> = [];

    unmappedSpecialties.forEach(specialty => {
      const bestMatch = this.findBestMatch(specialty);
      if (bestMatch) {
        suggestions.push({
          sourceSpecialty: specialty,
          suggestedMapping: bestMatch.standardizedName,
          confidence: bestMatch.confidence,
        });
      }
    });

    return suggestions;
  }

  /**
   * Find best match for a specialty using similarity
   */
  private findBestMatch(specialty: string): { standardizedName: string; confidence: number } | null {
    let bestMatch: { standardizedName: string; confidence: number } | null = null;
    let bestScore = 0;

    this.mappings.forEach(mapping => {
      const score = this.calculateSimilarity(specialty.toLowerCase(), mapping.standardizedName.toLowerCase());
      if (score > bestScore && score > 0.6) { // Minimum 60% similarity
        bestScore = score;
        bestMatch = {
          standardizedName: mapping.standardizedName,
          confidence: score,
        };
      }
    });

    return bestMatch;
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return 'app-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Export mappings
   */
  public exportMappings(): string {
    return JSON.stringify(this.mappings, null, 2);
  }

  /**
   * Import mappings
   */
  public importMappings(jsonData: string): boolean {
    try {
      const importedMappings = JSON.parse(jsonData);
      if (Array.isArray(importedMappings)) {
        this.mappings = importedMappings;
        this.saveMappings();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error importing APP specialty mappings:', error);
      return false;
    }
  }

  /**
   * Reset to default mappings
   */
  public resetToDefaults(): void {
    this.initializeDefaultMappings();
  }
}

export default APPSpecialtyMappingService;
