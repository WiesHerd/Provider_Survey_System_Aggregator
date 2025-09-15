import { openDB, IDBPDatabase } from 'idb';
import { ISurveyData, ISurveyRow, ISurveyMetadata } from '../types/survey';
import { ProviderType, PhysicianSurveyRow, APPSurveyRow } from '../types/provider';
import DatabaseMigrationService from './DatabaseMigrationService';

/**
 * Enhanced Database Service with Provider Type Support
 * This service provides a unified interface for accessing both legacy and provider-specific data
 */
class EnhancedDatabaseService {
  private static instance: EnhancedDatabaseService;
  private db: any = null;
  private migrationService: DatabaseMigrationService;
  private readonly CHUNK_SIZE = 1000;

  private constructor() {
    this.migrationService = DatabaseMigrationService.getInstance();
  }

  public static getInstance(): EnhancedDatabaseService {
    if (!EnhancedDatabaseService.instance) {
      EnhancedDatabaseService.instance = new EnhancedDatabaseService();
    }
    return EnhancedDatabaseService.instance;
  }

  /**
   * Initialize database with migration support
   */
  public async initialize(): Promise<void> {
    if (!this.db) {
      this.db = await this.migrationService.initialize();
    }
  }

  /**
   * Get surveys by provider type
   */
  public async getSurveysByProviderType(providerType: ProviderType): Promise<any[]> {
    await this.initialize();
    
    if (!this.db) throw new Error('Database not initialized');

    switch (providerType) {
      case 'PHYSICIAN':
        return await this.db.getAll('physicianSurveys');
      case 'APP':
        return await this.db.getAll('appSurveys');
      default:
        throw new Error(`Unsupported provider type: ${providerType}`);
    }
  }

  /**
   * Get survey data by provider type
   */
  public async getSurveyDataByProviderType(
    surveyId: string, 
    providerType: ProviderType
  ): Promise<any[]> {
    await this.initialize();
    
    if (!this.db) throw new Error('Database not initialized');

    const storeName = providerType === 'PHYSICIAN' ? 'physicianSurveyData' : 'appSurveyData';
    const index = this.db.transaction(storeName, 'readonly').objectStore(storeName).index('by-survey');
    
    return await index.getAll(surveyId);
  }

  /**
   * Get all survey data for a provider type
   */
  public async getAllSurveyDataByProviderType(providerType: ProviderType): Promise<any[]> {
    await this.initialize();
    
    if (!this.db) throw new Error('Database not initialized');

    const storeName = providerType === 'PHYSICIAN' ? 'physicianSurveyData' : 'appSurveyData';
    return await this.db.getAll(storeName);
  }

  /**
   * Save survey with provider type
   */
  public async saveSurveyWithProviderType(
    survey: any,
    providerType: ProviderType
  ): Promise<void> {
    await this.initialize();
    
    if (!this.db) throw new Error('Database not initialized');

    const enhancedSurvey = {
      ...survey,
      providerType,
      createdAt: survey.createdAt || new Date(),
      updatedAt: new Date(),
    };

    const storeName = providerType === 'PHYSICIAN' ? 'physicianSurveys' : 'appSurveys';
    await this.db.put(storeName, enhancedSurvey);
  }

  /**
   * Save survey data with provider type
   */
  public async saveSurveyDataWithProviderType(
    surveyId: string,
    data: any[],
    providerType: ProviderType
  ): Promise<void> {
    await this.initialize();
    
    if (!this.db) throw new Error('Database not initialized');

    const storeName = providerType === 'PHYSICIAN' ? 'physicianSurveyData' : 'appSurveyData';
    
    // Split data into chunks
    const chunks = this.chunkArray(data, this.CHUNK_SIZE);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkData = {
        surveyId,
        chunkIndex: i,
        data: chunks[i],
        providerType,
      };
      
      await this.db.put(storeName, chunkData);
    }
  }

  /**
   * Get migration status
   */
  public async getMigrationStatus(): Promise<{
    isMigrated: boolean;
    legacyDataCount: number;
    physicianDataCount: number;
    appDataCount: number;
  }> {
    return await this.migrationService.getMigrationStatus();
  }

  /**
   * Check if provider type has data
   */
  public async hasProviderData(providerType: ProviderType): Promise<boolean> {
    const surveys = await this.getSurveysByProviderType(providerType);
    return surveys.length > 0;
  }

  /**
   * Get provider data summary
   */
  public async getProviderDataSummary(providerType: ProviderType): Promise<{
    surveyCount: number;
    totalRows: number;
    specialties: string[];
    regions: string[];
  }> {
    const surveys = await this.getSurveysByProviderType(providerType);
    const allData = await this.getAllSurveyDataByProviderType(providerType);
    
    const totalRows = allData.reduce((sum, chunk) => sum + chunk.data.length, 0);
    
    // Extract unique specialties and regions
    const specialties = new Set<string>();
    const regions = new Set<string>();
    
    allData.forEach(chunk => {
      chunk.data.forEach((row: any) => {
        if (row.specialty) specialties.add(row.specialty);
        if (row.region) regions.add(row.region);
      });
    });

    return {
      surveyCount: surveys.length,
      totalRows,
      specialties: Array.from(specialties),
      regions: Array.from(regions),
    };
  }

  /**
   * Delete survey by provider type
   */
  public async deleteSurveyByProviderType(
    surveyId: string,
    providerType: ProviderType
  ): Promise<void> {
    await this.initialize();
    
    if (!this.db) throw new Error('Database not initialized');

    const surveyStoreName = providerType === 'PHYSICIAN' ? 'physicianSurveys' : 'appSurveys';
    const dataStoreName = providerType === 'PHYSICIAN' ? 'physicianSurveyData' : 'appSurveyData';

    // Delete survey metadata
    await this.db.delete(surveyStoreName, surveyId);

    // Delete all survey data chunks
    const dataStore = this.db.transaction(dataStoreName, 'readwrite').objectStore(dataStoreName);
    const index = dataStore.index('by-survey');
    const dataChunks = await index.getAll(surveyId);
    
    for (const chunk of dataChunks) {
      await dataStore.delete([surveyId, chunk.chunkIndex]);
    }
  }

  /**
   * Clear all data for a provider type
   */
  public async clearProviderData(providerType: ProviderType): Promise<void> {
    await this.initialize();
    
    if (!this.db) throw new Error('Database not initialized');

    const surveyStoreName = providerType === 'PHYSICIAN' ? 'physicianSurveys' : 'appSurveys';
    const dataStoreName = providerType === 'PHYSICIAN' ? 'physicianSurveyData' : 'appSurveyData';

    // Clear surveys
    await this.db.clear(surveyStoreName);
    
    // Clear survey data
    await this.db.clear(dataStoreName);
  }

  /**
   * Get combined data from both provider types
   */
  public async getCombinedData(): Promise<{
    physicianData: any[];
    appData: any[];
    totalSurveys: number;
    totalRows: number;
  }> {
    const [physicianSurveys, appSurveys, physicianData, appData] = await Promise.all([
      this.getSurveysByProviderType('PHYSICIAN'),
      this.getSurveysByProviderType('APP'),
      this.getAllSurveyDataByProviderType('PHYSICIAN'),
      this.getAllSurveyDataByProviderType('APP'),
    ]);

    const totalSurveys = physicianSurveys.length + appSurveys.length;
    const totalRows = physicianData.reduce((sum, chunk) => sum + chunk.data.length, 0) +
                     appData.reduce((sum, chunk) => sum + chunk.data.length, 0);

    return {
      physicianData,
      appData,
      totalSurveys,
      totalRows,
    };
  }

  /**
   * Utility method to chunk arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get database instance (for advanced operations)
   */
  public async getDatabase(): Promise<any> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }
}

export default EnhancedDatabaseService;
