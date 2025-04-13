import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ISurveyData, ISurveyRow, ISurveyMetadata } from '../types/survey';

interface SurveyDBSchema extends DBSchema {
  surveys: {
    key: string;
    value: {
      id: string;
      surveyProvider: string;
      surveyYear: string;
      uploadDate: Date;
      metadata: ISurveyMetadata;
    };
    indexes: {
      'by-provider': string;
      'by-year': string;
    };
  };
  surveyData: {
    key: [string, number]; // [surveyId, chunkIndex]
    value: {
      surveyId: string;
      chunkIndex: number;
      data: ISurveyRow[];
    };
    indexes: {
      'by-survey': string;
    };
  };
}

class DatabaseService {
  private static instance: DatabaseService;
  private db: IDBPDatabase<SurveyDBSchema> | null = null;
  private readonly DB_NAME = 'SurveyDB';
  private readonly DB_VERSION = 1;
  private readonly CHUNK_SIZE = 1000;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    // Initialize immediately upon construction
    this.initializationPromise = this.initialize();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.db) return;

    try {
      console.log('Initializing IndexedDB...');
      this.db = await openDB<SurveyDBSchema>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          console.log('Upgrading database...');
          // Create surveys store
          if (!db.objectStoreNames.contains('surveys')) {
            const surveyStore = db.createObjectStore('surveys', { keyPath: 'id' });
            surveyStore.createIndex('by-provider', 'surveyProvider');
            surveyStore.createIndex('by-year', 'surveyYear');
          }

          // Create surveyData store
          if (!db.objectStoreNames.contains('surveyData')) {
            const dataStore = db.createObjectStore('surveyData', {
              keyPath: ['surveyId', 'chunkIndex']
            });
            dataStore.createIndex('by-survey', 'surveyId');
          }
          console.log('Database upgrade complete');
        }
      });
      console.log('Database initialization complete');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
  }

  public async storeDataChunk(surveyId: string, chunkIndex: number, data: ISurveyRow[]): Promise<void> {
    await this.ensureInitialized();
    await this.db!.put('surveyData', {
      surveyId,
      chunkIndex,
      data
    });
  }

  public async storeSurveyMetadata(metadata: {
    id: string;
    surveyProvider: string;
    surveyYear: string;
    uploadDate: Date;
    metadata: ISurveyMetadata;
  }): Promise<void> {
    await this.ensureInitialized();
    await this.db!.put('surveys', metadata);
  }

  public async storeSurvey(surveyData: ISurveyData): Promise<void> {
    await this.ensureInitialized();
    
    // Store metadata
    await this.storeSurveyMetadata({
      id: surveyData.id,
      surveyProvider: surveyData.surveyProvider,
      surveyYear: surveyData.surveyYear,
      uploadDate: surveyData.uploadDate,
      metadata: surveyData.metadata
    });

    // Store data in chunks
    for (let i = 0; i < surveyData.data.length; i += this.CHUNK_SIZE) {
      const chunk = surveyData.data.slice(i, i + this.CHUNK_SIZE);
      await this.storeDataChunk(
        surveyData.id,
        Math.floor(i / this.CHUNK_SIZE),
        chunk
      );
    }
  }

  public async getSurveyMetadata(id: string) {
    await this.ensureInitialized();
    return await this.db!.get('surveys', id);
  }

  public async getAllSurveyMetadata() {
    await this.ensureInitialized();
    return await this.db!.getAll('surveys');
  }

  public async getSurveyData(id: string): Promise<ISurveyRow[]> {
    await this.ensureInitialized();
    const chunks = await this.db!.getAllFromIndex('surveyData', 'by-survey', id);
    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
    return chunks.flatMap(chunk => chunk.data);
  }

  public async deleteSurvey(id: string): Promise<void> {
    await this.ensureInitialized();
    const tx = this.db!.transaction(['surveys', 'surveyData'], 'readwrite');

    // Delete survey metadata
    await tx.objectStore('surveys').delete(id);

    // Delete all chunks
    const chunks = await this.db!.getAllFromIndex('surveyData', 'by-survey', id);
    const dataStore = tx.objectStore('surveyData');
    
    for (const chunk of chunks) {
      await dataStore.delete([id, chunk.chunkIndex]);
    }

    await tx.done;
  }
}

export default DatabaseService; 