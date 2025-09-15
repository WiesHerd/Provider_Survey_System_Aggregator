import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ISurveyData, ISurveyRow, ISurveyMetadata } from '../types/survey';
import { ProviderType, PhysicianSurveyRow, APPSurveyRow } from '../types/provider';

/**
 * Enhanced Database Schema with Provider Type Support
 * This extends the existing schema to support APP data separation
 */
interface EnhancedSurveyDBSchema extends DBSchema {
  // Enhanced surveys table with provider type support
  surveys: {
    key: string;
    value: {
      id: string;
      surveyProvider: string;
      surveyYear: string;
      uploadDate: Date;
      metadata: ISurveyMetadata;
      // New provider-specific fields
      providerType?: ProviderType;
      source?: string;
      createdAt?: Date;
      updatedAt?: Date;
    };
    indexes: {
      'by-provider': string;
      'by-year': string;
      'by-provider-type': ProviderType; // New index for provider type
    };
  };
  
  // Enhanced survey data with provider type support
  surveyData: {
    key: [string, number]; // [surveyId, chunkIndex]
    value: {
      surveyId: string;
      chunkIndex: number;
      data: ISurveyRow[];
      // New provider-specific fields
      providerType?: ProviderType;
    };
    indexes: {
      'by-survey': string;
      'by-provider-type': ProviderType; // New index for provider type
    };
  };

  // New provider-specific tables
  physicianSurveys: {
    key: string;
    value: {
      id: string;
      surveyProvider: string;
      surveyYear: string;
      uploadDate: Date;
      metadata: ISurveyMetadata;
      providerType: 'PHYSICIAN';
      source?: string;
      createdAt?: Date;
      updatedAt?: Date;
    };
    indexes: {
      'by-provider': string;
      'by-year': string;
    };
  };

  physicianSurveyData: {
    key: [string, number]; // [surveyId, chunkIndex]
    value: {
      surveyId: string;
      chunkIndex: number;
      data: PhysicianSurveyRow[];
      providerType: 'PHYSICIAN';
    };
    indexes: {
      'by-survey': string;
    };
  };

  appSurveys: {
    key: string;
    value: {
      id: string;
      surveyProvider: string;
      surveyYear: string;
      uploadDate: Date;
      metadata: ISurveyMetadata;
      providerType: 'APP';
      source?: string;
      createdAt?: Date;
      updatedAt?: Date;
    };
    indexes: {
      'by-provider': string;
      'by-year': string;
    };
  };

  appSurveyData: {
    key: [string, number]; // [surveyId, chunkIndex]
    value: {
      surveyId: string;
      chunkIndex: number;
      data: APPSurveyRow[];
      providerType: 'APP';
    };
    indexes: {
      'by-survey': string;
    };
  };
}

/**
 * Database Migration Service
 * Handles migration from legacy schema to provider-specific schema
 */
class DatabaseMigrationService {
  private static instance: DatabaseMigrationService;
  private readonly DB_NAME = 'SurveyAggregatorDB';
  private readonly CURRENT_VERSION = 2; // Increment for schema changes
  private readonly LEGACY_VERSION = 1;

  private constructor() {}

  public static getInstance(): DatabaseMigrationService {
    if (!DatabaseMigrationService.instance) {
      DatabaseMigrationService.instance = new DatabaseMigrationService();
    }
    return DatabaseMigrationService.instance;
  }

  /**
   * Initialize database with migration support
   */
  public async initialize(): Promise<IDBPDatabase<EnhancedSurveyDBSchema>> {
    return openDB<EnhancedSurveyDBSchema>(this.DB_NAME, this.CURRENT_VERSION, {
      upgrade: async (db, oldVersion, newVersion, transaction) => {
        console.log(`Database upgrade from version ${oldVersion} to ${newVersion}`);
        
        // Handle migration from legacy version
        if (oldVersion < 2) {
          await this.migrateFromLegacySchema(db, transaction);
        }
      },
    });
  }

  /**
   * Migrate from legacy schema to provider-specific schema
   */
  private async migrateFromLegacySchema(
    db: IDBPDatabase<EnhancedSurveyDBSchema>,
    transaction: any
  ): Promise<void> {
    console.log('Starting migration from legacy schema...');

    try {
      // Check if legacy tables exist
      const legacySurveysExist = db.objectStoreNames.contains('surveys');
      const legacySurveyDataExist = db.objectStoreNames.contains('surveyData');

      if (legacySurveysExist && legacySurveyDataExist) {
        // Migrate existing data
        await this.migrateExistingData(db, transaction);
      }

      // Create new provider-specific tables
      await this.createProviderSpecificTables(db, transaction);

      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Create provider-specific tables
   */
  private async createProviderSpecificTables(
    db: IDBPDatabase<EnhancedSurveyDBSchema>,
    transaction: any
  ): Promise<void> {
    // Create physician surveys table
    if (!db.objectStoreNames.contains('physicianSurveys')) {
      const physicianSurveysStore = db.createObjectStore('physicianSurveys', {
        keyPath: 'id',
      });
      physicianSurveysStore.createIndex('by-provider', 'surveyProvider');
      physicianSurveysStore.createIndex('by-year', 'surveyYear');
    }

    // Create physician survey data table
    if (!db.objectStoreNames.contains('physicianSurveyData')) {
      const physicianSurveyDataStore = db.createObjectStore('physicianSurveyData', {
        keyPath: ['surveyId', 'chunkIndex'],
      });
      physicianSurveyDataStore.createIndex('by-survey', 'surveyId');
    }

    // Create APP surveys table
    if (!db.objectStoreNames.contains('appSurveys')) {
      const appSurveysStore = db.createObjectStore('appSurveys', {
        keyPath: 'id',
      });
      appSurveysStore.createIndex('by-provider', 'surveyProvider');
      appSurveysStore.createIndex('by-year', 'surveyYear');
    }

    // Create APP survey data table
    if (!db.objectStoreNames.contains('appSurveyData')) {
      const appSurveyDataStore = db.createObjectStore('appSurveyData', {
        keyPath: ['surveyId', 'chunkIndex'],
      });
      appSurveyDataStore.createIndex('by-survey', 'surveyId');
    }
  }

  /**
   * Migrate existing data to provider-specific tables
   */
  private async migrateExistingData(
    db: IDBPDatabase<EnhancedSurveyDBSchema>,
    transaction: any
  ): Promise<void> {
    console.log('Migrating existing survey data...');

    // Get legacy data
    const legacySurveys = await transaction.objectStore('surveys').getAll();
    const legacySurveyData = await transaction.objectStore('surveyData').getAll();

    // Process each survey
    for (const survey of legacySurveys) {
      const surveyData = legacySurveyData.filter((data: any) => data.surveyId === survey.id);
      
      // Detect provider type from data
      const providerType = await this.detectProviderTypeFromData(surveyData);
      
      // Add provider type to survey metadata
      const enhancedSurvey = {
        ...survey,
        providerType,
        createdAt: survey.uploadDate,
        updatedAt: new Date(),
      };

      // Store in appropriate provider-specific table
      if (providerType === 'PHYSICIAN') {
        await transaction.objectStore('physicianSurveys').put(enhancedSurvey);
        
        // Migrate survey data
        for (const data of surveyData) {
          const enhancedData = {
            ...data,
            providerType: 'PHYSICIAN' as const,
            data: data.data.map((row: any) => this.convertToPhysicianRow(row)),
          };
          await transaction.objectStore('physicianSurveyData').put(enhancedData);
        }
      } else if (providerType === 'APP') {
        await transaction.objectStore('appSurveys').put(enhancedSurvey);
        
        // Migrate survey data
        for (const data of surveyData) {
          const enhancedData = {
            ...data,
            providerType: 'APP' as const,
            data: data.data.map((row: any) => this.convertToAPPRow(row)),
          };
          await transaction.objectStore('appSurveyData').put(enhancedData);
        }
      } else {
        // Unknown provider type - keep in legacy tables for now
        console.warn(`Unknown provider type for survey ${survey.id}, keeping in legacy tables`);
      }
    }

    console.log(`Migrated ${legacySurveys.length} surveys to provider-specific tables`);
  }

  /**
   * Detect provider type from survey data
   */
  private async detectProviderTypeFromData(surveyData: any[]): Promise<ProviderType> {
    // Sample data to detect provider type
    const sampleSize = Math.min(100, surveyData.length);
    const sampleData = surveyData.slice(0, sampleSize).flatMap(data => data.data);

    // Check for APP-specific provider types
    const appProviderTypes = ['NP', 'PA', 'CRNA', 'CNS', 'CNM', 'Advanced Practice Provider'];
    const hasAPPData = sampleData.some(row => 
      appProviderTypes.some(appType => 
        row.providerType?.toLowerCase().includes(appType.toLowerCase())
      )
    );

    if (hasAPPData) {
      return 'APP';
    }

    // Check for Physician-specific provider types
    const physicianProviderTypes = ['MD', 'DO', 'Physician', 'Resident', 'Fellow'];
    const hasPhysicianData = sampleData.some(row => 
      physicianProviderTypes.some(physType => 
        row.providerType?.toLowerCase().includes(physType.toLowerCase())
      )
    );

    if (hasPhysicianData) {
      return 'PHYSICIAN';
    }

    // Default to PHYSICIAN if unclear
    return 'PHYSICIAN';
  }

  /**
   * Convert legacy survey row to physician row
   */
  private convertToPhysicianRow(row: any): PhysicianSurveyRow {
    return {
      id: String(row.id || this.generateId()),
      surveyId: String(row.surveyId || ''),
      providerType: this.detectPhysicianProviderType(String(row.providerType || '')),
      specialty: String(row.normalizedSpecialty || row.specialty || ''),
      region: String(row.geographicRegion || row.region || ''),
      n_orgs: Number(row.n_orgs || 0),
      n_incumbents: Number(row.n_incumbents || 0),
      tcc_p25: Number(row.tcc_p25 || 0),
      tcc_p50: Number(row.tcc_p50 || 0),
      tcc_p75: Number(row.tcc_p75 || 0),
      tcc_p90: Number(row.tcc_p90 || 0),
      wrvu_p25: Number(row.wrvu_p25 || 0),
      wrvu_p50: Number(row.wrvu_p50 || 0),
      wrvu_p75: Number(row.wrvu_p75 || 0),
      wrvu_p90: Number(row.wrvu_p90 || 0),
      cf_p25: Number(row.cf_p25 || 0),
      cf_p50: Number(row.cf_p50 || 0),
      cf_p75: Number(row.cf_p75 || 0),
      cf_p90: Number(row.cf_p90 || 0),
      // Physician-specific fields
      subspecialty: row.subspecialty ? String(row.subspecialty) : undefined,
      boardCertification: row.boardCertification ? String(row.boardCertification) : undefined,
      fellowship: row.fellowship ? String(row.fellowship) : undefined,
    };
  }

  /**
   * Convert legacy survey row to APP row
   */
  private convertToAPPRow(row: any): APPSurveyRow {
    return {
      id: String(row.id || this.generateId()),
      surveyId: String(row.surveyId || ''),
      providerType: this.detectAPPProviderType(String(row.providerType || '')),
      specialty: String(row.normalizedSpecialty || row.specialty || ''),
      certification: this.detectAPPCertification(String(row.providerType || '')),
      practiceSetting: this.detectPracticeSetting(String(row.practiceSetting || '')),
      supervisionLevel: this.detectSupervisionLevel(String(row.supervisionLevel || '')),
      region: String(row.geographicRegion || row.region || ''),
      n_orgs: Number(row.n_orgs || 0),
      n_incumbents: Number(row.n_incumbents || 0),
      tcc_p25: Number(row.tcc_p25 || 0),
      tcc_p50: Number(row.tcc_p50 || 0),
      tcc_p75: Number(row.tcc_p75 || 0),
      tcc_p90: Number(row.tcc_p90 || 0),
      wrvu_p25: Number(row.wrvu_p25 || 0),
      wrvu_p50: Number(row.wrvu_p50 || 0),
      wrvu_p75: Number(row.wrvu_p75 || 0),
      wrvu_p90: Number(row.wrvu_p90 || 0),
      cf_p25: Number(row.cf_p25 || 0),
      cf_p50: Number(row.cf_p50 || 0),
      cf_p75: Number(row.cf_p75 || 0),
      cf_p90: Number(row.cf_p90 || 0),
      // APP-specific fields
      billingLevel: this.detectBillingLevel(String(row.billingLevel || '')),
      patientVolume: row.patientVolume ? Number(row.patientVolume) : undefined,
    };
  }

  /**
   * Helper methods for data conversion
   */
  private detectPhysicianProviderType(providerType: string): 'MD' | 'DO' | 'Resident' | 'Fellow' {
    const type = providerType?.toLowerCase() || '';
    if (type.includes('md')) return 'MD';
    if (type.includes('do')) return 'DO';
    if (type.includes('resident')) return 'Resident';
    if (type.includes('fellow')) return 'Fellow';
    return 'MD'; // Default
  }

  private detectAPPProviderType(providerType: string): 'NP' | 'PA' | 'CRNA' | 'CNS' | 'CNM' | 'Other APP' {
    const type = providerType?.toLowerCase() || '';
    if (type.includes('np') || type.includes('nurse practitioner')) return 'NP';
    if (type.includes('pa') || type.includes('physician assistant')) return 'PA';
    if (type.includes('crna')) return 'CRNA';
    if (type.includes('cns')) return 'CNS';
    if (type.includes('cnm')) return 'CNM';
    return 'Other APP'; // Default
  }

  private detectAPPCertification(providerType: string): string {
    const type = providerType?.toLowerCase() || '';
    if (type.includes('np')) return 'NP';
    if (type.includes('pa')) return 'PA';
    if (type.includes('crna')) return 'CRNA';
    if (type.includes('cns')) return 'CNS';
    if (type.includes('cnm')) return 'CNM';
    return 'Other';
  }

  private detectPracticeSetting(practiceSetting: string): 'Hospital' | 'Clinic' | 'Private Practice' | 'Academic' {
    const setting = practiceSetting?.toLowerCase() || '';
    if (setting.includes('hospital')) return 'Hospital';
    if (setting.includes('clinic')) return 'Clinic';
    if (setting.includes('private')) return 'Private Practice';
    if (setting.includes('academic')) return 'Academic';
    return 'Hospital'; // Default
  }

  private detectSupervisionLevel(supervisionLevel: string): 'Independent' | 'Supervised' | 'Collaborative' {
    const level = supervisionLevel?.toLowerCase() || '';
    if (level.includes('independent')) return 'Independent';
    if (level.includes('supervised')) return 'Supervised';
    if (level.includes('collaborative')) return 'Collaborative';
    return 'Supervised'; // Default
  }

  private detectBillingLevel(billingLevel: string): 'Incident-to' | 'Independent' | 'Split' {
    const level = billingLevel?.toLowerCase() || '';
    if (level.includes('incident')) return 'Incident-to';
    if (level.includes('independent')) return 'Independent';
    if (level.includes('split')) return 'Split';
    return 'Incident-to'; // Default
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
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
    const db = await this.initialize();
    
    const legacySurveys = await db.getAll('surveys');
    const physicianSurveys = await db.getAll('physicianSurveys');
    const appSurveys = await db.getAll('appSurveys');

    return {
      isMigrated: physicianSurveys.length > 0 || appSurveys.length > 0,
      legacyDataCount: legacySurveys.length,
      physicianDataCount: physicianSurveys.length,
      appDataCount: appSurveys.length,
    };
  }
}

export default DatabaseMigrationService;
