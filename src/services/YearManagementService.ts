import { IYearConfig, IYearFilter, IYearValidation, IYearData } from '../types/year';
import { ISurveyData } from '../types/survey';
import { ISpecialtyMapping } from '../types/specialty';

/**
 * Service for managing year-based data and configurations
 */
export class YearManagementService {
  private readonly YEAR_CONFIG_KEY = 'year_configs';
  private readonly YEAR_DATA_PREFIX = 'year_data_';

  /**
   * Get all available years
   */
  async getAvailableYears(): Promise<string[]> {
    try {
      const configs = await this.getYearConfigs();
      return configs.map(config => config.year).sort((a, b) => b.localeCompare(a));
    } catch (error) {
      console.error('Error getting available years:', error);
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
      
      // Default configuration for 2025
      const defaultConfig: IYearConfig = {
        id: '2025',
        year: '2025',
        isActive: true,
        isDefault: true,
        description: 'Current survey year',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.saveYearConfigs([defaultConfig]);
      return [defaultConfig];
    } catch (error) {
      console.error('Error getting year configs:', error);
      return [];
    }
  }

  /**
   * Get active year
   */
  async getActiveYear(): Promise<string> {
    const configs = await this.getYearConfigs();
    const activeConfig = configs.find(config => config.isActive);
    return activeConfig?.year || '2025';
  }

  /**
   * Get default year
   */
  async getDefaultYear(): Promise<string> {
    const configs = await this.getYearConfigs();
    const defaultConfig = configs.find(config => config.isDefault);
    return defaultConfig?.year || '2025';
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
   * Get year-specific data
   */
  async getYearData<T>(year: string, dataType: string): Promise<T[]> {
    try {
      const key = `${this.YEAR_DATA_PREFIX}${year}_${dataType}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error(`Error getting ${dataType} data for year ${year}:`, error);
      return [];
    }
  }

  /**
   * Save year-specific data
   */
  async saveYearData<T>(year: string, dataType: string, data: T[]): Promise<void> {
    try {
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
        if (!survey.type || !survey.name) {
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
    localStorage.setItem(this.YEAR_CONFIG_KEY, JSON.stringify(configs));
  }
}
