/**
 * Specialty Options Service
 * 
 * Service for enriching specialty options with mapping transparency metadata.
 * This service is read-only and only provides display metadata - it doesn't affect filtering logic.
 */

import { getDataService } from '../../services/DataService';
import { ISpecialtyMapping, IUnmappedSpecialty } from '../../features/mapping/types/mapping';
import { SpecialtyOption, SourceSpecialtyInfo } from '../types/specialtyOptions';
import { AnalyticsDataService } from '../../features/analytics/services/analyticsDataService';

/**
 * Service for fetching enriched specialty options with mapping metadata
 */
export class SpecialtyOptionsService {
  private static instance: SpecialtyOptionsService;
  private cache: SpecialtyOption[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): SpecialtyOptionsService {
    if (!SpecialtyOptionsService.instance) {
      SpecialtyOptionsService.instance = new SpecialtyOptionsService();
    }
    return SpecialtyOptionsService.instance;
  }

  /**
   * Clear the cache (useful for testing or when mappings change)
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Get all enriched specialty options with mapping metadata
   * 
   * CRITICAL: This is read-only and for display purposes only.
   * The `name` field in returned options is the actual value used for filtering.
   */
  async getSpecialtyOptions(): Promise<SpecialtyOption[]> {
    // Check cache
    const now = Date.now();
    if (this.cache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cache;
    }

    try {
      const dataService = getDataService();
      
      // Fetch all data in parallel
      const [mappings, unmappedSpecialties, analyticsData] = await Promise.all([
        dataService.getAllSpecialtyMappings(),
        dataService.getUnmappedSpecialties(),
        this.getSpecialtiesFromAnalyticsData()
      ]);

      // Build map of standardized names to their mapping info
      const mappedSpecialtiesMap = new Map<string, {
        isMapped: boolean;
        sourceSpecialties: SourceSpecialtyInfo[];
      }>();

      // Process mappings
      mappings.forEach((mapping: ISpecialtyMapping) => {
        const standardizedName = mapping.standardizedName;
        if (!mappedSpecialtiesMap.has(standardizedName)) {
          mappedSpecialtiesMap.set(standardizedName, {
            isMapped: true,
            sourceSpecialties: []
          });
        }
        
        const entry = mappedSpecialtiesMap.get(standardizedName)!;
        // Add all source specialties from this mapping
        mapping.sourceSpecialties.forEach((source: any) => {
          entry.sourceSpecialties.push({
            surveySource: source.surveySource || 'Unknown',
            specialty: source.specialty || source.originalName || '',
            originalName: source.originalName
          });
        });
      });

      // Process unmapped specialties - these are individual specialties that haven't been mapped
      const unmappedSpecialtiesSet = new Set<string>();
      unmappedSpecialties.forEach((unmapped: IUnmappedSpecialty) => {
        unmappedSpecialtiesSet.add(unmapped.name);
      });

      // Combine all unique specialty names from analytics data
      const allSpecialtyNames = new Set<string>();
      analyticsData.forEach(specialty => {
        if (specialty && specialty.trim()) {
          allSpecialtyNames.add(specialty);
        }
      });

      // Build final options list
      const options: SpecialtyOption[] = [];
      
      // Add mapped specialties first
      mappedSpecialtiesMap.forEach((metadata, standardizedName) => {
        // Deduplicate source specialties by surveySource + specialty combination
        const uniqueSources = new Map<string, SourceSpecialtyInfo>();
        metadata.sourceSpecialties.forEach(source => {
          const key = `${source.surveySource}:${source.specialty}`;
          if (!uniqueSources.has(key)) {
            uniqueSources.set(key, source);
          }
        });

        options.push({
          name: standardizedName, // CRITICAL: This is the value used for filtering
          isMapped: true,
          isUnmapped: false,
          sourceSpecialties: Array.from(uniqueSources.values()),
          displayLabel: standardizedName // Will be enhanced in component with icon
        });
      });

      // Add unmapped specialties (those in analytics data but not in mappings)
      allSpecialtyNames.forEach(specialtyName => {
        // Skip if already added as mapped
        if (!mappedSpecialtiesMap.has(specialtyName)) {
          // Check if this is truly unmapped (exists in unmappedSpecialties list)
          const isUnmapped = unmappedSpecialtiesSet.has(specialtyName);
          
          options.push({
            name: specialtyName, // CRITICAL: This is the value used for filtering
            isMapped: false,
            isUnmapped: isUnmapped,
            sourceSpecialties: [],
            displayLabel: specialtyName // Will be enhanced in component with indicator
          });
        }
      });

      // Sort alphabetically
      options.sort((a, b) => a.name.localeCompare(b.name));

      // Cache the result
      this.cache = options;
      this.cacheTimestamp = now;

      console.log('🔍 SpecialtyOptionsService: Generated options', {
        total: options.length,
        mapped: options.filter(o => o.isMapped).length,
        unmapped: options.filter(o => o.isUnmapped).length
      });

      return options;
    } catch (error) {
      console.error('❌ SpecialtyOptionsService: Error fetching options', error);
      // Return empty array on error - components will fall back to existing behavior
      return [];
    }
  }

  /**
   * Get all unique specialty names from analytics data
   * This ensures we include all specialties that are actually in use
   */
  private async getSpecialtiesFromAnalyticsData(): Promise<string[]> {
    try {
      const analyticsService = new AnalyticsDataService();
      // Fetch all data with empty filters to get all specialties
      const data = await analyticsService.getAnalyticsData({
        specialty: '',
        surveySource: '',
        geographicRegion: '',
        providerType: '',
        year: ''
      });

      // Extract unique standardized names
      const specialties = new Set<string>();
      data.forEach(row => {
        if (row.standardizedName && row.standardizedName.trim()) {
          specialties.add(row.standardizedName);
        }
      });

      return Array.from(specialties);
    } catch (error) {
      console.warn('⚠️ SpecialtyOptionsService: Could not fetch analytics data', error);
      return [];
    }
  }

  /**
   * Get mapping metadata for a specific specialty name
   * Useful for tooltips and detailed views
   */
  async getSpecialtyMetadata(specialtyName: string): Promise<SpecialtyOption | null> {
    const options = await this.getSpecialtyOptions();
    return options.find(opt => opt.name === specialtyName) || null;
  }
}


