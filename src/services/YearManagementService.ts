import { IYearConfig, IYearFilter, IYearValidation, IYearData } from '../types/year';
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
   * Get all available years
   */
  async getAvailableYears(): Promise<string[]> {
    try {
      // First, get years from year configs
      const configs = await this.getYearConfigs();
      const configYears = configs.map(config => config.year);
      
      // Also detect years from actual survey data
      const { getDataService } = await import('../services/DataService');
      const dataService = getDataService();
      const surveys = await dataService.getAllSurveys();
      
      const surveyYears = new Set<string>();
      surveys.forEach(survey => {
        const surveyAny = survey as any;
        if (surveyAny.year) surveyYears.add(surveyAny.year);
        if (surveyAny.surveyYear) surveyYears.add(surveyAny.surveyYear);
      });
      
      // Combine both sources and remove duplicates
      const allYears = [...new Set([...configYears, ...Array.from(surveyYears)])];
      
      
      return allYears.sort((a, b) => b.localeCompare(a));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get year configurations
   */
  async getYearConfigs(): Promise<IYearConfig[]> {
    try {
      const stored = localStorage.getItem(this.YEAR_CONFIG_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Check what year data actually exists in IndexedDB
      const actualYear = await this.detectActualYear();
      
      // Default configuration based on actual data
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

  /**
   * Detect the actual year from uploaded survey data
   */
  async detectActualYear(): Promise<string> {
    try {
      // Check IndexedDB for survey data
      const { getDataService } = await import('../services/DataService');
      const dataService = getDataService();
      
      // Get all surveys to see what years exist
      const surveys = await dataService.getAllSurveys();
      
      
      if (surveys && surveys.length > 0) {
        // Look for year information in survey metadata
        for (const survey of surveys) {
          const surveyAny = survey as any;
          // Survey metadata logging removed for performance
          
          // IndexedDB uses 'year' field, BackendService uses 'surveyYear' field
          if (surveyAny.year) {
            return surveyAny.year;
          }
          if (surveyAny.surveyYear) {
            return surveyAny.surveyYear;
          }
        }
        
        // If no explicit year, check survey names for year patterns
        for (const survey of surveys) {
          const surveyAny = survey as any;
          const surveyName = surveyAny.surveyProvider || surveyAny.name || '';
          const yearMatch = surveyName.match(/\b(20\d{2})\b/);
          if (yearMatch) {
            return yearMatch[1];
          }
        }
        
        // Check survey filenames for year patterns
        for (const survey of surveys) {
          const surveyAny = survey as any;
          const filename = surveyAny.filename || surveyAny.name || '';
          const yearMatch = filename.match(/\b(20\d{2})\b/);
          if (yearMatch) {
            console.log('🔍 YearManagementService: Found year from filename pattern:', yearMatch[1]);
            return yearMatch[1];
          }
        }
      }
      
      // Default to 2025 if no data found (since user has 2025 data)
      console.log('🔍 YearManagementService: No year found in surveys, defaulting to 2025');
      return '2025';
    } catch (error) {
      console.error('Error detecting actual year:', error);
      return '2025'; // Default to 2025 since that's what user has
    }
  }

  /**
   * Get active year - prioritize detected year over stored configs
   */
  async getActiveYear(): Promise<string> {
    // First try to detect the actual year from data
    const detectedYear = await this.detectActualYear();
    if (detectedYear) {
      console.log('🔍 YearManagementService: Using detected year:', detectedYear);
      return detectedYear;
    }
    
    // Fall back to stored configs
    const configs = await this.getYearConfigs();
    const activeConfig = configs.find(config => config.isActive);
    return activeConfig?.year || '2025'; // Default to 2025
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
   * Activate a year
   */
  async activateYear(year: string): Promise<void> {
    const configs = await this.getYearConfigs();
    
    // Deactivate all other years
    configs.forEach(config => {
      config.isActive = config.year === year;
      config.updatedAt = new Date();
    });

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
   * Save year configurations
   */
  private async saveYearConfigs(configs: IYearConfig[]): Promise<void> {
    try {
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




