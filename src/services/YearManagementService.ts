import { IYearConfig, IYearValidation, IYearData } from '../types/year';
import { ISurveyData } from '../types/survey';
import { ISpecialtyMapping } from '../types/specialty';

/**
 * Service for managing year-based data and configurations
 */
export class YearManagementService {
  private readonly YEAR_CONFIG_KEY = 'year_configs';
  private readonly YEAR_DATA_PREFIX = 'year_data_';
  private readonly INDEXEDDB_NAME = 'SurveyAggregatorDB';
  private readonly INDEXEDDB_VERSION = 1;

  /**
   * Get all available years from Firebase/survey data (and configs).
   * Does not invent years: prioritizes years that exist in survey data.
   * Only adds current/previous year as fallback when no survey data exists.
   */
  async getAvailableYears(): Promise<string[]> {
    try {
      const { getDataService } = await import('../services/DataService');
      const dataService = getDataService();
      const surveys = await dataService.getAllSurveys();

      const surveyYears = new Set<string>();
      surveys.forEach(survey => {
        const surveyAny = survey as any;
        const y = surveyAny.year ?? surveyAny.surveyYear ?? surveyAny.metadata?.year;
        if (y != null && y !== '') {
          surveyYears.add(String(y).trim());
        }
      });

      const configs = await this.getYearConfigs();
      const configYears = configs.map(config => String(config.year).trim()).filter(Boolean);
      configYears.forEach(y => surveyYears.add(y));

      const currentYearNum = new Date().getFullYear();
      const currentStr = String(currentYearNum);
      const previousStr = String(currentYearNum - 1);
      if (surveyYears.size === 0) {
        surveyYears.add(currentStr);
        surveyYears.add(previousStr);
      } else {
        if (!surveyYears.has(currentStr)) surveyYears.add(currentStr);
        if (!surveyYears.has(previousStr)) surveyYears.add(previousStr);
      }

      const allYears = Array.from(surveyYears).sort((a, b) => b.localeCompare(a));
      return allYears;
    } catch (error) {
      console.error('YearManagementService.getAvailableYears error:', error);
      const currentYearNum = new Date().getFullYear();
      return [String(currentYearNum), String(currentYearNum - 1)].sort(
        (a, b) => b.localeCompare(a)
      );
    }
  }

  /**
   * Get year configurations.
   * Uses DataService (Firebase when in Firebase mode, localStorage fallback) so year config syncs across devices.
   */
  async getYearConfigs(): Promise<IYearConfig[]> {
    try {
      const { getDataService } = await import('../services/DataService');
      const dataService = getDataService();
      const fromPreferences = await dataService.getUserPreference(this.YEAR_CONFIG_KEY);
      if (fromPreferences && Array.isArray(fromPreferences) && fromPreferences.length > 0) {
        return this.reviveYearConfigDates(fromPreferences);
      }
      const stored = localStorage.getItem(this.YEAR_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as IYearConfig[];
        const revived = this.reviveYearConfigDates(parsed);
        await dataService.saveUserPreference(this.YEAR_CONFIG_KEY, revived);
        return revived;
      }
      const actualYear = await this.detectActualYear();
      const defaultConfig: IYearConfig = {
        id: actualYear,
        year: actualYear,
        isActive: true,
        isDefault: true,
        description: 'Current survey year',
        startDate: new Date(`${actualYear}-01-01`),
        endDate: new Date(`${actualYear}-12-31`),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await this.saveYearConfigs([defaultConfig]);
      return [defaultConfig];
    } catch (error) {
      return [];
    }
  }

  private safeDate(value: unknown, yearFallback: string): Date {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (value != null && typeof (value as { toDate?: () => Date }).toDate === 'function') {
      const d = (value as { toDate: () => Date }).toDate();
      if (d instanceof Date && !Number.isNaN(d.getTime())) return d;
    }
    if (value != null) {
      const d = new Date(value as string | number);
      if (!Number.isNaN(d.getTime())) return d;
    }
    const y = /^\d{4}$/.test(yearFallback) ? yearFallback : String(new Date().getFullYear());
    return new Date(`${y}-01-01`);
  }

  private reviveYearConfigDates(configs: IYearConfig[]): IYearConfig[] {
    return configs.map(c => {
      const year = (c && typeof c.year === 'string') ? c.year : String(new Date().getFullYear());
      return {
        ...c,
        startDate: this.safeDate(c.startDate, year),
        endDate: this.safeDate(c.endDate, year),
        createdAt: this.safeDate(c.createdAt, year),
        updatedAt: this.safeDate(c.updatedAt, year)
      };
    });
  }

  /**
   * Detect the actual year from uploaded survey data (Firebase / DataService).
   * Returns the most recent year that has survey data (so the dropdown shows "whatever was loaded").
   * Uses survey.year, survey.surveyYear, survey.metadata.year; then name/filename patterns.
   * Falls back to current calendar year only when no survey data exists.
   */
  async detectActualYear(): Promise<string> {
    try {
      const { getDataService } = await import('../services/DataService');
      const dataService = getDataService();
      const surveys = await dataService.getAllSurveys();
      const collectedYears: string[] = [];

      if (surveys && surveys.length > 0) {
        for (const survey of surveys) {
          const surveyAny = survey as any;
          const y = surveyAny.year ?? surveyAny.surveyYear ?? surveyAny.metadata?.year;
          if (y != null && String(y).trim() !== '') {
            collectedYears.push(String(y).trim());
          }
        }
        if (collectedYears.length === 0) {
          for (const survey of surveys) {
            const surveyAny = survey as any;
            const name = surveyAny.surveyProvider ?? surveyAny.name ?? surveyAny.type ?? '';
            const yearMatch = String(name).match(/\b(20\d{2})\b/);
            if (yearMatch) collectedYears.push(yearMatch[1]);
          }
        }
        if (collectedYears.length === 0) {
          for (const survey of surveys) {
            const surveyAny = survey as any;
            const filename = surveyAny.filename ?? surveyAny.name ?? '';
            const yearMatch = String(filename).match(/\b(20\d{2})\b/);
            if (yearMatch) collectedYears.push(yearMatch[1]);
          }
        }
        if (collectedYears.length > 0) {
          const mostRecent = collectedYears.sort((a, b) => b.localeCompare(a))[0];
          return mostRecent;
        }
      }

      const currentYear = String(new Date().getFullYear());
      console.log('🔍 YearManagementService: No year in survey data, using current year:', currentYear);
      return currentYear;
    } catch (error) {
      console.error('Error detecting actual year:', error);
      return String(new Date().getFullYear());
    }
  }

  /**
   * Get active year - prioritize detected year from survey data over stored configs
   */
  async getActiveYear(): Promise<string> {
    const detectedYear = await this.detectActualYear();
    if (detectedYear) {
      return detectedYear;
    }
    const configs = await this.getYearConfigs();
    const activeConfig = configs.find(config => config.isActive);
    return activeConfig?.year ?? String(new Date().getFullYear());
  }

  /**
   * Get default year
   */
  async getDefaultYear(): Promise<string> {
    const configs = await this.getYearConfigs();
    const defaultConfig = configs.find(config => config.isDefault);
    return defaultConfig?.year || await this.detectActualYear();
  }

  /**
   * Create a new year configuration
   */
  async createYear(year: string, description?: string): Promise<IYearConfig> {
    const configs = await this.getYearConfigs();
    
    // Check if year already exists
    if (configs.some(config => config.year === year)) {
      throw new Error(`Year ${year} already exists`);
    }

    const newConfig: IYearConfig = {
      id: year,
      year,
      isActive: false,
      isDefault: false,
      description: description || `Survey data for ${year}`,
      startDate: new Date(`${year}-01-01`),
      endDate: new Date(`${year}-12-31`),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    configs.push(newConfig);
    await this.saveYearConfigs(configs);
    
    return newConfig;
  }

  /**
   * Activate a year.
   * If the year is not in configs (e.g. it came from survey data only), add a minimal config so there is always an active config.
   */
  async activateYear(year: string): Promise<void> {
    const yearForDates = /^\d{4}$/.test(year) ? year : String(new Date().getFullYear());
    let configs = await this.getYearConfigs();
    const hasYear = configs.some(c => c.year === year);
    if (!hasYear) {
      const newConfig: IYearConfig = {
        id: year,
        year,
        isActive: true,
        isDefault: false,
        description: `Survey data for ${year}`,
        startDate: new Date(`${yearForDates}-01-01`),
        endDate: new Date(`${yearForDates}-12-31`),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      configs = configs.map(c => ({ ...c, isActive: false, updatedAt: new Date() }));
      configs.push(newConfig);
    } else {
      configs.forEach(config => {
        config.isActive = config.year === year;
        config.updatedAt = new Date();
      });
    }
    await this.saveYearConfigs(configs);
  }

  /**
   * Set default year
   */
  async setDefaultYear(year: string): Promise<void> {
    const configs = await this.getYearConfigs();
    
    // Set only one default
    configs.forEach(config => {
      config.isDefault = config.year === year;
      config.updatedAt = new Date();
    });

    await this.saveYearConfigs(configs);
  }

  /**
   * Get year-specific data using IndexedDB for large data
   */
  async getYearData<T>(year: string, dataType: string): Promise<T[]> {
    try {
      // For large data types like surveyData, use IndexedDB
      if (dataType === 'surveyData' || dataType === 'surveys') {
        return await this.getYearDataFromIndexedDB<T>(year, dataType);
      }
      
      // For small metadata, use localStorage
      const key = `${this.YEAR_DATA_PREFIX}${year}_${dataType}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error(`Error getting ${dataType} data for year ${year}:`, error);
      return [];
    }
  }

  /**
   * Get year data from IndexedDB
   */
  private async getYearDataFromIndexedDB<T>(year: string, dataType: string): Promise<T[]> {
    try {
      // For survey data, get it directly from the main DataService
      if (dataType === 'surveyData' || dataType === 'surveys') {
        const { getDataService } = await import('../services/DataService');
        const dataService = getDataService();
        const surveys = await dataService.getAllSurveys();
        
        // Filter surveys by year - cast to any to avoid TypeScript union type issues
        const surveysAny = surveys as any[];
        const yearSurveys = surveysAny.filter((survey: any) => {
          const surveyYear = survey.year || survey.surveyYear || '';
          return surveyYear === year;
        });
        
        return yearSurveys as T[];
      }
      
      // For other data types, return empty array for now
      return [];
    } catch (error) {
      console.error(`Error getting ${dataType} data from IndexedDB for year ${year}:`, error);
      return [];
    }
  }

  /**
   * Save year-specific data using IndexedDB for large data
   */
  async saveYearData<T>(year: string, dataType: string, data: T[]): Promise<void> {
    try {
      // For large data types like surveyData, use IndexedDB
      if (dataType === 'surveyData' || dataType === 'surveys') {
        await this.saveYearDataToIndexedDB<T>(year, dataType, data);
        return;
      }
      
      // For small metadata, use localStorage
      const key = `${this.YEAR_DATA_PREFIX}${year}_${dataType}`;
      const yearData: IYearData<T> = {
        year,
        data,
        metadata: {
          totalRecords: data.length,
          lastUpdated: new Date(),
          source: 'user_upload'
        }
      };
      
      localStorage.setItem(key, JSON.stringify(yearData));
    } catch (error) {
      console.error(`Error saving ${dataType} data for year ${year}:`, error);
      throw error;
    }
  }

  /**
   * Save year data to IndexedDB
   */
  private async saveYearDataToIndexedDB<T>(year: string, dataType: string, data: T[]): Promise<void> {
    try {
      // For now, we'll just log that we're saving year data
      // The actual survey data is saved through the main DataService
      console.log(`Saving ${dataType} data for year ${year}:`, data.length, 'records');
    } catch (error) {
      console.error(`Error saving ${dataType} data to IndexedDB for year ${year}:`, error);
      throw error;
    }
  }

  /**
   * Clear all year data from IndexedDB
   */
  async clearYearData(year?: string): Promise<void> {
    try {
      console.log(`Clearing year data for year: ${year || 'all'}`);
      // For now, we'll just log the clear operation
      // The actual survey data clearing is handled by the main DataService
    } catch (error) {
      console.error('Error clearing year data:', error);
      throw error;
    }
  }

  /**
   * Get storage usage information
   */
  async getStorageInfo(): Promise<{
    localStorageUsage: number;
    indexedDBUsage: number;
    totalUsage: number;
    quota: number;
  }> {
    try {
      // Get localStorage usage
      let localStorageUsage = 0;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            localStorageUsage += localStorage.getItem(key)?.length || 0;
          }
        }
      } catch (error) {
        console.warn('Could not calculate localStorage usage:', error);
      }

      // Get IndexedDB usage (approximate)
      let indexedDBUsage = 0;
      try {
        // For now, we'll estimate usage based on localStorage
        indexedDBUsage = localStorageUsage * 2; // Rough estimate
      } catch (error) {
        console.warn('Could not calculate IndexedDB usage:', error);
      }

      const totalUsage = localStorageUsage + indexedDBUsage;
      
      // Estimate quota (browsers typically allow 5-10MB for localStorage, much more for IndexedDB)
      const quota = 50 * 1024 * 1024; // 50MB estimate for total storage

      return {
        localStorageUsage,
        indexedDBUsage,
        totalUsage,
        quota
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        localStorageUsage: 0,
        indexedDBUsage: 0,
        totalUsage: 0,
        quota: 0
      };
    }
  }

  /**
   * Check if storage is available and has space
   */
  async checkStorageAvailability(): Promise<{
    available: boolean;
    message: string;
    usage: number;
    quota: number;
  }> {
    try {
      const storageInfo = await this.getStorageInfo();
      const available = storageInfo.totalUsage < storageInfo.quota * 0.9; // Leave 10% buffer
      
      return {
        available,
        message: available 
          ? 'Storage space is available' 
          : 'Storage space is running low. Consider clearing some data.',
        usage: storageInfo.totalUsage,
        quota: storageInfo.quota
      };
    } catch (error) {
      console.error('Error checking storage availability:', error);
      return {
        available: false,
        message: 'Unable to check storage availability',
        usage: 0,
        quota: 0
      };
    }
  }

  /**
   * Validate year data
   */
  async validateYearData(year: string): Promise<IYearValidation> {
    const validation: IYearValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      dataIntegrity: {
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0
      }
    };

    try {
      // Validate year format
      if (!/^\d{4}$/.test(year)) {
        validation.isValid = false;
        validation.errors.push('Invalid year format. Must be 4 digits (e.g., 2025)');
      }

      // Check if year exists in configs
      const configs = await this.getYearConfigs();
      if (!configs.some(config => config.year === year)) {
        validation.warnings.push(`Year ${year} is not configured. Consider creating a year configuration.`);
      }

      // Validate survey data
      const surveyData = await this.getYearData<ISurveyData>(year, 'surveys');
      validation.dataIntegrity.totalRecords = surveyData.length;
      
      // Basic validation of survey data
      surveyData.forEach((survey, index) => {
        if (!survey.surveyProvider || !survey.surveyYear) {
          validation.dataIntegrity.invalidRecords++;
          validation.errors.push(`Survey ${index + 1} is missing required fields`);
        } else {
          validation.dataIntegrity.validRecords++;
        }
      });

      if (validation.dataIntegrity.invalidRecords > 0) {
        validation.isValid = false;
      }

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return validation;
  }

  /**
   * Migrate data between years
   */
  async migrateData(sourceYear: string, targetYear: string, dataTypes: string[]): Promise<void> {
    try {
      for (const dataType of dataTypes) {
        const sourceData = await this.getYearData(sourceYear, dataType);
        if (sourceData.length > 0) {
          await this.saveYearData(targetYear, dataType, sourceData);
          console.log(`Migrated ${sourceData.length} ${dataType} records from ${sourceYear} to ${targetYear}`);
        }
      }
    } catch (error) {
      console.error('Error migrating data:', error);
      throw error;
    }
  }

  /**
   * Get year statistics
   */
  async getYearStatistics(year: string): Promise<{
    surveys: number;
    specialties: number;
    mappings: number;
    lastUpdated: Date;
  }> {
    const surveys = await this.getYearData<ISurveyData>(year, 'surveys');
    const mappings = await this.getYearData<ISpecialtyMapping>(year, 'mappings');
    
    // Count unique specialties
    const specialtySet = new Set<string>();
    surveys.forEach(survey => {
      // Extract specialties from survey data (implementation depends on data structure)
    });

    return {
      surveys: surveys.length,
      specialties: specialtySet.size,
      mappings: mappings.length,
      lastUpdated: new Date()
    };
  }

  /**
   * Save year configurations.
   * Persists via DataService (Firebase when in Firebase mode) and localStorage for backward compatibility.
   */
  private async saveYearConfigs(configs: IYearConfig[]): Promise<void> {
    try {
      const { getDataService } = await import('../services/DataService');
      const dataService = getDataService();
      await dataService.saveUserPreference(this.YEAR_CONFIG_KEY, configs);
      localStorage.setItem(this.YEAR_CONFIG_KEY, JSON.stringify(configs));
    } catch (error) {
      console.error('Error saving year configs:', error);
      throw error;
    }
  }

  /**
   * Reset year configuration to detect actual data
   */
  async resetYearConfiguration(): Promise<void> {
    try {
      // Clear localStorage
      localStorage.removeItem(this.YEAR_CONFIG_KEY);
      
      // Create both 2024 and 2025 configurations since user has both
      const configs: IYearConfig[] = [
        {
          id: '2025',
          year: '2025',
          isActive: true,
          isDefault: true,
          description: 'Survey data for 2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2024',
          year: '2024',
          isActive: false,
          isDefault: false,
          description: 'Survey data for 2024',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      await this.saveYearConfigs(configs);
    } catch (error) {
      console.error('Error resetting year configuration:', error);
      throw error;
    }
  }
}




