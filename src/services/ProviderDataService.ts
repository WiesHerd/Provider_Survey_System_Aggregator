/**
 * Provider Data Service
 * 
 * Enterprise-grade service for managing provider-specific data loading,
 * validation, and state management. Ensures data integrity and proper
 * isolation between provider types.
 */

import { IndexedDBService } from './IndexedDBService';
import { ProviderType } from '../types/provider';
import { Survey, BaseSpecialtyMapping } from '../types/provider';

// Data loading states
export type DataLoadingStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

// Provider data result types
export interface ProviderDataResult {
  status: DataLoadingStatus;
  data?: any;
  error?: string;
  message?: string;
  actions?: EmptyStateAction[];
  metadata?: {
    surveyCount: number;
    specialtyCount: number;
    lastUpdated: Date;
  };
}

export interface EmptyStateAction {
  label: string;
  action: string;
  variant: 'primary' | 'secondary';
  icon?: string;
}

export interface ProviderDataState {
  status: DataLoadingStatus;
  surveys: Survey[];
  specialtyMappings: BaseSpecialtyMapping[];
  analytics: any;
  fmvData: any;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Provider Data Service
 * 
 * Handles all provider-specific data operations with proper validation,
 * error handling, and state management.
 */
export class ProviderDataService {
  private indexedDB: IndexedDBService;
  private cache: Map<ProviderType, ProviderDataState> = new Map();

  constructor() {
    this.indexedDB = new IndexedDBService();
  }

  /**
   * Load provider-specific data with validation and error handling
   */
  async loadProviderData(providerType: ProviderType): Promise<ProviderDataResult> {
    try {
      // Check cache first
      const cached = this.cache.get(providerType);
      if (cached && this.isCacheValid(cached)) {
        return {
          status: 'success',
          data: cached,
          metadata: {
            surveyCount: cached.surveys.length,
            specialtyCount: cached.specialtyMappings.length,
            lastUpdated: cached.lastUpdated || new Date()
          }
        };
      }

      // Load fresh data
      const [surveys, specialtyMappings] = await Promise.all([
        this.loadSurveysByProviderType(providerType),
        this.loadSpecialtyMappingsByProviderType(providerType)
      ]);

      // Validate data integrity
      this.validateProviderData(surveys, providerType);

      // Check if data exists
      if (surveys.length === 0) {
        return {
          status: 'empty',
          message: this.getEmptyStateMessage(providerType),
          actions: this.getEmptyStateActions(providerType),
          metadata: {
            surveyCount: 0,
            specialtyCount: specialtyMappings.length,
            lastUpdated: new Date()
          }
        };
      }

      // Generate analytics and FMV data
      const [analytics, fmvData] = await Promise.all([
        this.generateAnalytics(surveys, providerType),
        this.generateFMVData(surveys, providerType)
      ]);

      // Create data state
      const dataState: ProviderDataState = {
        status: 'success',
        surveys,
        specialtyMappings,
        analytics,
        fmvData,
        error: null,
        lastUpdated: new Date()
      };

      // Cache the result
      this.cache.set(providerType, dataState);

      return {
        status: 'success',
        data: dataState,
        metadata: {
          surveyCount: surveys.length,
          specialtyCount: specialtyMappings.length,
          lastUpdated: new Date()
        }
      };

    } catch (error) {
      console.error(`Failed to load ${providerType} data:`, error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        message: `Failed to load ${providerType} data. Please try again.`,
        actions: [
          {
            label: 'Retry',
            action: 'retry',
            variant: 'primary'
          },
          {
            label: 'Switch Provider',
            action: 'switch',
            variant: 'secondary'
          }
        ]
      };
    }
  }

  /**
   * Load surveys filtered by provider type
   */
  private async loadSurveysByProviderType(providerType: ProviderType): Promise<Survey[]> {
    const allSurveys = await this.indexedDB.getAllSurveys();
    
    return allSurveys.filter(survey => {
      // Check if survey has provider type metadata
      const surveyProviderType = (survey as any).providerType;
      return surveyProviderType === providerType;
    });
  }

  /**
   * Load specialty mappings filtered by provider type
   */
  private async loadSpecialtyMappingsByProviderType(providerType: ProviderType): Promise<BaseSpecialtyMapping[]> {
    const allMappings = await this.indexedDB.getAllSpecialtyMappings();
    
    return allMappings.filter(mapping => {
      const mappingProviderType = (mapping as any).providerType;
      return mappingProviderType === providerType;
    });
  }

  /**
   * Validate provider data integrity
   */
  private validateProviderData(surveys: Survey[], providerType: ProviderType): void {
    // Check for data integrity violations
    const invalidSurveys = surveys.filter(survey => {
      const surveyProviderType = (survey as any).providerType;
      return surveyProviderType !== providerType;
    });

    if (invalidSurveys.length > 0) {
      throw new Error(`Data integrity violation: Found ${invalidSurveys.length} surveys with incorrect provider type`);
    }

    // Check for required fields
    const incompleteSurveys = surveys.filter(survey => 
      !survey.name || !survey.year || !survey.type
    );

    if (incompleteSurveys.length > 0) {
      console.warn(`Found ${incompleteSurveys.length} surveys with incomplete metadata`);
    }
  }

  /**
   * Generate analytics data for provider type
   */
  private async generateAnalytics(surveys: Survey[], providerType: ProviderType): Promise<any> {
    // This would integrate with your existing analytics service
    // For now, return a basic structure
    return {
      providerType,
      surveyCount: surveys.length,
      specialties: this.extractSpecialties(surveys),
      regions: this.extractRegions(surveys),
      compensationMetrics: this.extractCompensationMetrics(surveys),
      generatedAt: new Date()
    };
  }

  /**
   * Generate FMV data for provider type
   */
  private async generateFMVData(surveys: Survey[], providerType: ProviderType): Promise<any> {
    // This would integrate with your existing FMV service
    return {
      providerType,
      surveyCount: surveys.length,
      specialties: this.extractSpecialties(surveys),
      regions: this.extractRegions(surveys),
      generatedAt: new Date()
    };
  }

  /**
   * Extract unique specialties from surveys
   */
  private extractSpecialties(surveys: Survey[]): string[] {
    const specialties = new Set<string>();
    
    surveys.forEach(survey => {
      // This would need to be adapted based on your survey data structure
      if ((survey as any).data) {
        (survey as any).data.forEach((row: any) => {
          if (row.specialty) {
            specialties.add(row.specialty);
          }
        });
      }
    });

    return Array.from(specialties);
  }

  /**
   * Extract unique regions from surveys
   */
  private extractRegions(surveys: Survey[]): string[] {
    const regions = new Set<string>();
    
    surveys.forEach(survey => {
      if ((survey as any).data) {
        (survey as any).data.forEach((row: any) => {
          if (row.region) {
            regions.add(row.region);
          }
        });
      }
    });

    return Array.from(regions);
  }

  /**
   * Extract compensation metrics from surveys
   */
  private extractCompensationMetrics(surveys: Survey[]): string[] {
    const metrics = new Set<string>();
    
    surveys.forEach(survey => {
      if ((survey as any).data) {
        (survey as any).data.forEach((row: any) => {
          // Add common compensation metrics
          if (row.tcc) metrics.add('TCC');
          if (row.wrvu) metrics.add('wRVU');
          if (row.cf) metrics.add('CF');
        });
      }
    });

    return Array.from(metrics);
  }

  /**
   * Get empty state message for provider type
   */
  private getEmptyStateMessage(providerType: ProviderType): string {
    switch (providerType) {
      case 'PHYSICIAN':
        return 'No physician data is currently available. Upload physician survey data to view analytics and perform fair market value calculations.';
      case 'APP':
        return 'No Advanced Practice Provider (APP) data is currently available. Upload APP survey data to view analytics and perform fair market value calculations.';
      default:
        return 'No data is currently available for the selected provider type.';
    }
  }

  /**
   * Get empty state actions for provider type
   */
  private getEmptyStateActions(providerType: ProviderType): EmptyStateAction[] {
    const actions: EmptyStateAction[] = [
      {
        label: `Upload ${providerType} Data`,
        action: 'upload',
        variant: 'primary',
        icon: 'upload'
      }
    ];

    // Add switch action if other provider types have data
    if (providerType === 'PHYSICIAN') {
      actions.push({
        label: 'Switch to APP Data',
        action: 'switch_to_app',
        variant: 'secondary',
        icon: 'switch'
      });
    } else if (providerType === 'APP') {
      actions.push({
        label: 'Switch to Physician Data',
        action: 'switch_to_physician',
        variant: 'secondary',
        icon: 'switch'
      });
    }

    return actions;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cached: ProviderDataState): boolean {
    if (!cached.lastUpdated) return false;
    
    const now = new Date();
    const cacheAge = now.getTime() - cached.lastUpdated.getTime();
    const maxCacheAge = 5 * 60 * 1000; // 5 minutes
    
    return cacheAge < maxCacheAge;
  }

  /**
   * Clear cache for provider type
   */
  clearCache(providerType?: ProviderType): void {
    if (providerType) {
      this.cache.delete(providerType);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache status
   */
  getCacheStatus(): Record<ProviderType, boolean> {
    return {
      PHYSICIAN: this.cache.has('PHYSICIAN'),
      APP: this.cache.has('APP')
    };
  }
}

// Export singleton instance
export const providerDataService = new ProviderDataService();
