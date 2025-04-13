import { ISurveyData, ISurveyRow } from '../types/survey';

/**
 * Interface for storage implementations
 * This will make it easy to swap local storage with AWS later
 */
export interface IStorageService {
  storeSurveyData(data: ISurveyData): Promise<void>;
  getSurveyData(id: string, page?: number, pageSize?: number): Promise<{
    metadata: any;
    rows: ISurveyRow[];
    totalPages: number;
  }>;
  deleteSurveyData(id: string): Promise<void>;
  listSurveys(): Promise<Array<{ id: string; metadata: any }>>;
}

/**
 * Local storage implementation using IndexedDB for efficient data handling
 */
export class LocalStorageService implements IStorageService {
  private readonly DB_NAME = 'survey-data';
  private readonly METADATA_STORE = 'metadata';
  private readonly CHUNKS_STORE = 'chunks';
  private readonly CHUNK_SIZE = 1000;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initializeDB();
  }

  private async initializeDB(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store for survey metadata
        if (!db.objectStoreNames.contains(this.METADATA_STORE)) {
          db.createObjectStore(this.METADATA_STORE, { keyPath: 'id' });
        }

        // Store for data chunks
        if (!db.objectStoreNames.contains(this.CHUNKS_STORE)) {
          const chunkStore = db.createObjectStore(this.CHUNKS_STORE, { keyPath: 'key' });
          chunkStore.createIndex('surveyId', 'surveyId', { unique: false });
        }
      };
    });
  }

  async storeSurveyData(data: ISurveyData): Promise<void> {
    await this.initializeDB();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([this.METADATA_STORE, this.CHUNKS_STORE], 'readwrite');
    const metadataStore = transaction.objectStore(this.METADATA_STORE);
    const chunksStore = transaction.objectStore(this.CHUNKS_STORE);

    // Store metadata
    await new Promise<void>((resolve, reject) => {
      const request = metadataStore.put({
        id: data.id,
        ...data.metadata,
        status: 'PROCESSING',
        createdAt: new Date().toISOString()
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });

    // Store chunks
    if (data.rows) {
      const chunks = this.chunkArray(data.rows, this.CHUNK_SIZE);
      await Promise.all(chunks.map((chunk, index) => 
        new Promise<void>((resolve, reject) => {
          const request = chunksStore.put({
            key: `${data.id}_${index}`,
            surveyId: data.id,
            chunkIndex: index,
            data: chunk
          });

          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        })
      ));
    }

    // Update status to completed
    await new Promise<void>((resolve, reject) => {
      const request = metadataStore.put({
        id: data.id,
        ...data.metadata,
        status: 'COMPLETED',
        createdAt: new Date().toISOString()
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getSurveyData(id: string, page: number = 1, pageSize: number = 100): Promise<{
    metadata: any;
    rows: ISurveyRow[];
    totalPages: number;
  }> {
    await this.initializeDB();
    if (!this.db) throw new Error('Database not initialized');

    // Get metadata
    const metadata = await new Promise<any>((resolve, reject) => {
      const transaction = this.db!.transaction([this.METADATA_STORE], 'readonly');
      const request = transaction.objectStore(this.METADATA_STORE).get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    if (!metadata) {
      throw new Error('Survey not found');
    }

    // Calculate which chunk contains our page
    const startChunk = Math.floor((page - 1) * pageSize / this.CHUNK_SIZE);
    
    // Get chunk
    const chunk = await new Promise<ISurveyRow[]>((resolve, reject) => {
      const transaction = this.db!.transaction([this.CHUNKS_STORE], 'readonly');
      const request = transaction.objectStore(this.CHUNKS_STORE).get(`${id}_${startChunk}`);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.data || []);
    });

    const startIndex = ((page - 1) * pageSize) % this.CHUNK_SIZE;
    const rows = chunk.slice(startIndex, startIndex + pageSize);

    return {
      metadata,
      rows,
      totalPages: Math.ceil(metadata.totalRows / pageSize)
    };
  }

  async deleteSurveyData(id: string): Promise<void> {
    await this.initializeDB();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction([this.METADATA_STORE, this.CHUNKS_STORE], 'readwrite');
    const metadataStore = transaction.objectStore(this.METADATA_STORE);
    const chunksStore = transaction.objectStore(this.CHUNKS_STORE);
    const chunkIndex = chunksStore.index('surveyId');

    // Delete metadata
    await new Promise<void>((resolve, reject) => {
      const request = metadataStore.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });

    // Delete all chunks
    const chunkKeys = await new Promise<string[]>((resolve, reject) => {
      const request = chunkIndex.getAllKeys(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as string[]);
    });

    await Promise.all(chunkKeys.map(key => 
      new Promise<void>((resolve, reject) => {
        const request = chunksStore.delete(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      })
    ));
  }

  async listSurveys(): Promise<Array<{ id: string; metadata: any }>> {
    await this.initializeDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.METADATA_STORE], 'readonly');
      const request = transaction.objectStore(this.METADATA_STORE).getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
} 