import { ISurveyData, ISurveyRow } from '../types/survey';

/**
 * Interface for storage implementations
 * This will make it easy to swap local storage with AWS later
 */
export interface IStorageService {
  storeSurveyData<T = ISurveyRow>(data: Partial<ISurveyData> & { id: string; rows: T[]; metadata: any }): Promise<void>;
  getSurveyData<T = ISurveyRow>(id: string, page?: number, pageSize?: number): Promise<{
    metadata: any;
    rows: T[];
    totalPages: number;
  }>;
  deleteSurveyData(id: string): Promise<void>;
  listSurveys(): Promise<Array<{ id: string; metadata: any }>>;
  getStorageStats(): Promise<{ usedSpace: number; quota: number }>;
  clearAllData(): Promise<void>;
  getItem(key: string): Promise<any>;
  setItem(key: string, value: any): Promise<void>;
  getSurvey(id: string): Promise<any>;
  getSurveyMetadata(id: string): Promise<any>;
  getChunks(id: string): Promise<string[]>;
}

/**
 * Local storage implementation using IndexedDB for efficient data handling
 */
export class LocalStorageService implements IStorageService {
  private readonly DB_NAME = 'survey-data';
  private readonly METADATA_STORE = 'metadata';
  private readonly CHUNKS_STORE = 'chunks';
  private readonly CHUNK_SIZE = 1000; // Adjust based on data size
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initializeDB().catch(console.error);
  }

  private async initializeDB(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onerror = () => {
        console.error('Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        
        // Handle connection errors
        this.db.onerror = (event) => {
          console.error('Database error:', event);
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create metadata store with indexes
        if (!db.objectStoreNames.contains(this.METADATA_STORE)) {
          const metadataStore = db.createObjectStore(this.METADATA_STORE, { keyPath: 'id' });
          metadataStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create chunks store with indexes
        if (!db.objectStoreNames.contains(this.CHUNKS_STORE)) {
          const chunksStore = db.createObjectStore(this.CHUNKS_STORE, { keyPath: 'id' });
          chunksStore.createIndex('surveyId', 'surveyId', { unique: false });
          chunksStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async storeSurveyData<T = ISurveyRow>(data: Partial<ISurveyData> & { id: string; rows: T[]; metadata: any }): Promise<void> {
    await this.initPromise;
    if (!this.db) throw new Error('Database not initialized');

    console.log('Storing survey data:', { id: data.id, rowCount: data.rows.length }); // Debug log

    const transaction = this.db.transaction([this.METADATA_STORE, this.CHUNKS_STORE], 'readwrite');
    
    transaction.onerror = () => {
      console.error('Transaction failed:', transaction.error);
      throw transaction.error;
    };

    const metadataStore = transaction.objectStore(this.METADATA_STORE);
    const chunksStore = transaction.objectStore(this.CHUNKS_STORE);

    const timestamp = new Date().toISOString();
    const enhancedMetadata = {
      ...data.metadata,
      totalRows: data.rows.length,
      specialties: Array.from(new Set(data.rows.map((row: any) => row.normalizedSpecialty))).filter(Boolean),
      dataPoints: data.rows.length * Object.keys(data.rows[0] || {}).length,
      lastUpdated: timestamp
    };

    // Store metadata
    await new Promise<void>((resolve, reject) => {
      const request = metadataStore.put({
        id: data.id,
        metadata: enhancedMetadata,
        timestamp
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });

    // Store chunks
    if (data.rows && data.rows.length > 0) {
      const chunks = this.chunkArray(data.rows, this.CHUNK_SIZE);
      console.log(`Storing ${chunks.length} chunks for survey ${data.id}`); // Debug log

      await Promise.all(chunks.map((chunk, index) => 
        new Promise<void>((resolve, reject) => {
          const request = chunksStore.put({
            id: `${data.id}_${index}`,
            surveyId: data.id,
            data: chunk,
            timestamp,
            chunkIndex: index
          });

          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        })
      ));
    }

    console.log('Survey data stored successfully:', data.id); // Debug log
  }

  async getSurveyData<T = ISurveyRow>(id: string, page: number = 1, pageSize: number = 1000000): Promise<{
    metadata: any;
    rows: T[];
    totalPages: number;
  }> {
    await this.initPromise;
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([this.METADATA_STORE, this.CHUNKS_STORE], 'readonly');
    const metadataStore = transaction.objectStore(this.METADATA_STORE);
    const chunksStore = transaction.objectStore(this.CHUNKS_STORE);

    // Get metadata
    const metadata = await new Promise<any>((resolve, reject) => {
      const request = metadataStore.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.metadata);
    });

    if (!metadata) {
      throw new Error('Survey not found');
    }

    // Get all chunks for this survey
    const chunks = await new Promise<T[][]>((resolve, reject) => {
      const chunks: T[][] = [];
      const range = IDBKeyRange.bound(`${id}_`, `${id}_\uffff`);
      const request = chunksStore.openCursor(range);

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          chunks.push(cursor.value.data);
          cursor.continue();
        } else {
          resolve(chunks);
        }
      };
    });

    // Combine all chunks
    const allRows = chunks.flat() as T[];

    console.log(`Loaded ${allRows.length} total rows for survey ${id}`);

    return {
      metadata,
      rows: allRows,
      totalPages: 1
    };
  }

  async getStorageStats(): Promise<{ usedSpace: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usedSpace: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
    return { usedSpace: 0, quota: 0 };
  }

  async deleteSurveyData(id: string): Promise<void> {
    await this.initPromise;
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([this.METADATA_STORE, this.CHUNKS_STORE], 'readwrite');
    const metadataStore = transaction.objectStore(this.METADATA_STORE);
    const chunksStore = transaction.objectStore(this.CHUNKS_STORE);

    // Delete metadata
    await new Promise<void>((resolve, reject) => {
      const request = metadataStore.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });

    // Delete all chunks
    const range = IDBKeyRange.bound(`${id}_0`, `${id}_${Number.MAX_SAFE_INTEGER}`);
    await new Promise<void>((resolve, reject) => {
      const request = chunksStore.delete(range);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async listSurveys(): Promise<Array<{ id: string; metadata: any }>> {
    await this.initPromise;
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([this.METADATA_STORE], 'readonly');
    const metadataStore = transaction.objectStore(this.METADATA_STORE);

    return new Promise((resolve, reject) => {
      const request = metadataStore.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const surveys = request.result
          .filter(item => item && item.metadata) // Filter out any corrupted entries
          .map(item => ({
            id: item.id,
            metadata: {
              ...item.metadata,
              // Ensure required fields exist
              totalRows: item.metadata.totalRows || 0,
              specialties: item.metadata.specialties || [],
              dataPoints: item.metadata.dataPoints || 0,
              lastUpdated: item.metadata.lastUpdated || new Date().toISOString()
            }
          }));
        console.log('Listed surveys:', surveys); // Debug log
        resolve(surveys);
      };
    });
  }

  async clearAllData(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.DB_NAME);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('Database successfully deleted');
        this.db = null;
        this.initPromise = this.initializeDB();
        resolve();
      };
    });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, index) =>
      array.slice(index * size, (index + 1) * size)
    );
  }

  async getItem(key: string): Promise<any> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      const transaction = this.db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.value);
    });
  }

  async setItem(key: string, value: any): Promise<void> {
    await this.initPromise;
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      const transaction = this.db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      const request = store.put({
        id: key,
        value: value,
        timestamp: new Date().toISOString()
      });

      request.onerror = () => {
        console.error('Error in setItem:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => resolve();
    });
  }

  async getSurveyMetadata(id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      const transaction = this.db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(`survey:${id}`);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getChunks(id: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      const transaction = this.db.transaction(['chunks'], 'readonly');
      const store = transaction.objectStore('chunks');
      const request = store.getAll(IDBKeyRange.bound(`${id}:0`, `${id}:z`));

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const chunks = request.result
          .sort((a, b) => a.index - b.index)
          .map(chunk => chunk.data);
        resolve(chunks);
      };
    });
  }

  async getSurvey(id: string): Promise<any> {
    const metadata = await this.getSurveyMetadata(id);
    if (!metadata) {
      throw new Error(`Survey with id ${id} not found`);
    }

    const chunks = await this.getChunks(id);
    return {
      ...metadata,
      fileContent: chunks.join('')
    };
  }
}

/**
 * Factory function to create a storage service instance
 */
export const createStorageService = (): IStorageService => {
  return new LocalStorageService();
}; 