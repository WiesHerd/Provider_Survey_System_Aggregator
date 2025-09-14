/**
 * Provider Type Detection Service
 * 
 * Dynamically detects available provider types from IndexedDB data
 * and provides real-time information about data availability.
 */

import { IndexedDBService } from './IndexedDBService';
import { ProviderType } from '../types/provider';

export interface ProviderTypeInfo {
  type: ProviderType | 'OTHER';
  displayName: string;
  hasData: boolean;
  surveyCount: number;
  lastUpdated: Date | null;
  customDescription?: string; // For 'OTHER' types
}

export interface ProviderTypeDetectionResult {
  availableTypes: ProviderTypeInfo[];
  hasAnyData: boolean;
  totalSurveys: number;
  lastScan: Date;
}

/**
 * Provider Type Detection Service
 * 
 * Scans IndexedDB to determine what provider types have data available
 * and provides dynamic provider type information.
 */
export class ProviderTypeDetectionService {
  private indexedDB: IndexedDBService;
  private cache: ProviderTypeDetectionResult | null = null;
  private cacheExpiry: number = 2 * 60 * 1000; // 2 minutes

  constructor() {
    this.indexedDB = new IndexedDBService();
  }

  /**
   * Detect all available provider types with data
   */
  async detectAvailableProviderTypes(): Promise<ProviderTypeDetectionResult> {
    try {
      // Check cache first
      if (this.cache && this.isCacheValid()) {
        return this.cache;
      }

      // Scan all surveys for provider types
      const allSurveys = await this.indexedDB.getAllSurveys();
      const providerTypeMap = new Map<string, ProviderTypeInfo>();

      // Process each survey
      allSurveys.forEach(survey => {
        const providerType = (survey as any).providerType;
        const customDescription = (survey as any).customProviderDescription;
        
        if (providerType) {
          const key = providerType === 'OTHER' ? `OTHER_${customDescription || 'Unknown'}` : providerType;
          
          if (!providerTypeMap.has(key)) {
            providerTypeMap.set(key, {
              type: providerType,
              displayName: this.getDisplayName(providerType, customDescription),
              hasData: true,
              surveyCount: 0,
              lastUpdated: null,
              customDescription: customDescription
            });
          }

          const info = providerTypeMap.get(key)!;
          info.surveyCount++;
          
          // Update last updated date
          const surveyDate = new Date(survey.uploadDate);
          if (!info.lastUpdated || surveyDate > info.lastUpdated) {
            info.lastUpdated = surveyDate;
          }
        }
      });

      // Convert to array and sort by survey count (descending)
      const availableTypes = Array.from(providerTypeMap.values())
        .sort((a, b) => b.surveyCount - a.surveyCount);

      // Calculate totals
      const totalSurveys = availableTypes.reduce((sum, type) => sum + type.surveyCount, 0);
      const hasAnyData = availableTypes.length > 0;

      // Create result
      const result: ProviderTypeDetectionResult = {
        availableTypes,
        hasAnyData,
        totalSurveys,
        lastScan: new Date()
      };

      // Cache the result
      this.cache = result;

      return result;

    } catch (error) {
      console.error('Failed to detect provider types:', error);
      
      // Return empty result on error
      return {
        availableTypes: [],
        hasAnyData: false,
        totalSurveys: 0,
        lastScan: new Date()
      };
    }
  }

  /**
   * Get display name for provider type
   */
  private getDisplayName(providerType: ProviderType | 'OTHER', customDescription?: string): string {
    switch (providerType) {
      case 'PHYSICIAN':
        return 'Physician';
      case 'APP':
        return 'Advanced Practice Provider';
      case 'OTHER':
        return customDescription || 'Other Provider Type';
      default:
        return providerType;
    }
  }

  /**
   * Check if a specific provider type has data
   */
  async hasProviderTypeData(providerType: ProviderType | 'OTHER', customDescription?: string): Promise<boolean> {
    const result = await this.detectAvailableProviderTypes();
    
    if (providerType === 'OTHER') {
      return result.availableTypes.some(type => 
        type.type === 'OTHER' && 
        type.customDescription === customDescription
      );
    }
    
    return result.availableTypes.some(type => type.type === providerType);
  }

  /**
   * Get provider type info for a specific type
   */
  async getProviderTypeInfo(providerType: ProviderType | 'OTHER', customDescription?: string): Promise<ProviderTypeInfo | null> {
    const result = await this.detectAvailableProviderTypes();
    
    if (providerType === 'OTHER') {
      return result.availableTypes.find(type => 
        type.type === 'OTHER' && 
        type.customDescription === customDescription
      ) || null;
    }
    
    return result.availableTypes.find(type => type.type === providerType) || null;
  }

  /**
   * Get all custom provider types
   */
  async getCustomProviderTypes(): Promise<ProviderTypeInfo[]> {
    const result = await this.detectAvailableProviderTypes();
    return result.availableTypes.filter(type => type.type === 'OTHER');
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;
    
    const now = new Date();
    const cacheAge = now.getTime() - this.cache.lastScan.getTime();
    
    return cacheAge < this.cacheExpiry;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Force refresh (clear cache and rescan)
   */
  async forceRefresh(): Promise<ProviderTypeDetectionResult> {
    this.clearCache();
    return await this.detectAvailableProviderTypes();
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { hasCache: boolean; lastScan: Date | null; age: number } {
    if (!this.cache) {
      return { hasCache: false, lastScan: null, age: 0 };
    }

    const now = new Date();
    const age = now.getTime() - this.cache.lastScan.getTime();

    return {
      hasCache: true,
      lastScan: this.cache.lastScan,
      age
    };
  }
}

// Export singleton instance
export const providerTypeDetectionService = new ProviderTypeDetectionService();
