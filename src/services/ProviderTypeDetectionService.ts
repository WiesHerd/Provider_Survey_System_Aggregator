/**
 * Provider Type Detection Service
 * 
 * Dynamically detects available provider types from storage (IndexedDB or Firebase)
 * and provides real-time information about data availability.
 */

import { getDataService } from './DataService';
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
 * Scans storage (IndexedDB or Firebase) to determine what provider types have data available
 * and provides dynamic provider type information.
 */
export class ProviderTypeDetectionService {
  private cache: ProviderTypeDetectionResult | null = null;
  private cacheExpiry: number = 2 * 60 * 1000; // 2 minutes

  constructor() {
    // DataService is accessed via getDataService() which handles both IndexedDB and Firebase
  }

  /**
   * Detect all available provider types with data
   */
  async detectAvailableProviderTypes(): Promise<ProviderTypeDetectionResult> {
    try {
      // Check cache first
      if (this.cache && this.isCacheValid()) {
        console.log('🔍 Using cached provider type detection result');
        return this.cache;
      }

      // Scan all surveys for provider types (works with both IndexedDB and Firebase)
      const dataService = getDataService();
      const storageMode = dataService.getMode();
      console.log(`🔍 Detecting provider types from ${storageMode}...`);
      
      const allSurveys = await dataService.getAllSurveys();
      console.log(`📊 Found ${allSurveys.length} surveys to analyze`);
      
      const providerTypeMap = new Map<string, ProviderTypeInfo>();

      // Process each survey
      allSurveys.forEach((survey, index) => {
        const providerType = (survey as any).providerType;
        const dataCategory = (survey as any).dataCategory;
        const customDescription = (survey as any).customProviderDescription;
        const surveyType = (survey as any).type || '';
        const surveyName = (survey as any).name || '';
        
        // CRITICAL FIX: Also check dataCategory for Call Pay surveys
        // If survey has dataCategory === 'CALL_PAY', treat it as CALL type
        // This handles cases where Call Pay surveys might have providerType !== 'CALL'
        let effectiveProviderType: ProviderType | 'OTHER' | undefined = providerType;
        
        // If no providerType, try to infer from dataCategory
        if (!effectiveProviderType && dataCategory === 'CALL_PAY') {
          effectiveProviderType = 'CALL';
        }
        
        // If still no providerType, try to infer from survey name/type
        if (!effectiveProviderType) {
          const lowerType = surveyType.toLowerCase();
          const lowerName = surveyName.toLowerCase();
          
          if (lowerType.includes('call pay') || lowerName.includes('call pay')) {
            effectiveProviderType = 'CALL';
          } else if (lowerType.includes('app') || lowerName.includes('app') || 
                     lowerType.includes('advanced practice') || lowerName.includes('advanced practice')) {
            effectiveProviderType = 'APP';
          } else if (lowerType.includes('physician') || lowerName.includes('physician') ||
                     lowerType.includes('phys') || lowerName.includes('phys')) {
            effectiveProviderType = 'PHYSICIAN';
          } else {
            // Default to PHYSICIAN if we can't determine (most surveys are physician)
            effectiveProviderType = 'PHYSICIAN';
            console.log(`⚠️ Survey "${surveyName}" has no providerType, defaulting to PHYSICIAN`);
          }
        }
        
        if (effectiveProviderType) {
          const key = effectiveProviderType === 'OTHER' ? `OTHER_${customDescription || 'Unknown'}` : effectiveProviderType;
          
          if (!providerTypeMap.has(key)) {
            providerTypeMap.set(key, {
              type: effectiveProviderType,
              displayName: this.getDisplayName(effectiveProviderType, customDescription),
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
        } else {
          console.warn(`⚠️ Could not determine provider type for survey: ${surveyName || survey.id}`);
        }
      });

      // Convert to array and sort by survey count (descending)
      const availableTypes = Array.from(providerTypeMap.values())
        .sort((a, b) => b.surveyCount - a.surveyCount);

      // Calculate totals
      const totalSurveys = availableTypes.reduce((sum, type) => sum + type.surveyCount, 0);
      const hasAnyData = availableTypes.length > 0;

      // Log detection results
      console.log(`✅ Provider type detection complete:`, {
        storageMode,
        totalSurveys: allSurveys.length,
        detectedTypes: availableTypes.length,
        hasAnyData,
        types: availableTypes.map(t => ({
          type: t.type,
          displayName: t.displayName,
          surveyCount: t.surveyCount
        }))
      });

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
      case 'CALL':
        return 'Call Pay';
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
