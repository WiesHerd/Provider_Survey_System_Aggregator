import { v4 as uuidv4 } from 'uuid';
import { 
  ISurveyData, 
  ISurveyRow, 
  ISurveyMetadata,
  ISpecialtyNormalization 
} from '../types/survey';
import { 
  COLUMN_MAPPINGS, 
  SPECIALTY_MAPPINGS, 
  SURVEY_PROVIDERS,
  STANDARD_COLUMN_NAMES 
} from '../config/surveyMappings';
import DatabaseService from './DatabaseService';

class SurveyDataService {
  private static instance: SurveyDataService;
  private worker: Worker | null = null;
  private dbService: DatabaseService;
  private processingPromises: Map<string, { 
    resolve: (value: void) => void;
    reject: (reason?: any) => void;
  }> = new Map();

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.initializeServices();
  }

  private async initializeServices() {
    await this.dbService.initialize();
    this.initializeWorker();
  }

  public static getInstance(): SurveyDataService {
    if (!SurveyDataService.instance) {
      SurveyDataService.instance = new SurveyDataService();
    }
    return SurveyDataService.instance;
  }

  private initializeWorker() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../workers/dataProcessing.worker.ts', import.meta.url));
      
      this.worker.onmessage = async (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'STORE_CHUNK':
            try {
              await this.dbService.storeDataChunk(
                data.id,
                data.chunkIndex,
                data.chunk
              );
            } catch (error) {
              console.error('Error storing data chunk:', error);
              const promise = this.processingPromises.get(data.id);
              if (promise) {
                promise.reject(error);
                this.processingPromises.delete(data.id);
              }
            }
            break;

          case 'PROCESSING_COMPLETE':
            try {
              await this.dbService.storeSurveyMetadata(data.metadata);
              // Resolve the processing promise
              const promise = this.processingPromises.get(data.id);
              if (promise) {
                promise.resolve();
                this.processingPromises.delete(data.id);
              }
            } catch (error) {
              console.error('Error storing survey metadata:', error);
              const promise = this.processingPromises.get(data.id);
              if (promise) {
                promise.reject(error);
                this.processingPromises.delete(data.id);
              }
            }
            break;
          
          case 'PROCESSING_ERROR':
            console.error('Processing error:', data.error);
            const promise = this.processingPromises.get(data.id);
            if (promise) {
              promise.reject(new Error(data.error));
              this.processingPromises.delete(data.id);
            }
            break;
        }
      };
    }
  }

  public async processSurveyFile(
    file: File,
    surveyProvider: string,
    year: string
  ): Promise<string> {
    const id = uuidv4();
    
    if (this.worker) {
      // Create a promise that will resolve when processing is complete
      const processingPromise = new Promise<void>((resolve, reject) => {
        this.processingPromises.set(id, { resolve, reject });
      });

      this.worker.postMessage({
        type: 'PROCESS_SURVEY',
        data: {
          file,
          surveyProvider,
          year,
          id,
          columnMappings: COLUMN_MAPPINGS[surveyProvider],
          specialtyMappings: SPECIALTY_MAPPINGS
        }
      });

      // Wait for processing to complete
      await processingPromise;
    } else {
      // Fallback to main thread processing
      const surveyData = await this.processDataInMainThread(file, surveyProvider, year, id);
      await this.dbService.storeSurvey(surveyData);
    }

    return id;
  }

  public async getSurveyData(id: string): Promise<ISurveyData | undefined> {
    const metadata = await this.dbService.getSurveyMetadata(id);
    if (!metadata) return undefined;

    const data = await this.dbService.getSurveyData(id);
    
    return {
      ...metadata,
      data
    };
  }

  public async getAllSurveys(): Promise<ISurveyData[]> {
    const metadataList = await this.dbService.getAllSurveyMetadata();
    return Promise.all(
      metadataList.map(async (metadata) => {
        const data = await this.dbService.getSurveyData(metadata.id);
        return {
          ...metadata,
          data
        };
      })
    );
  }

  public async deleteSurvey(id: string): Promise<void> {
    await this.dbService.deleteSurvey(id);
  }

  private async processDataInMainThread(
    file: File,
    surveyProvider: string,
    year: string,
    id: string
  ): Promise<ISurveyData> {
    // Implementation for main thread processing
    // This is a fallback when Web Workers aren't available
    return {
      id,
      surveyProvider,
      surveyYear: year,
      uploadDate: new Date(),
      data: [],
      metadata: {
        totalRows: 0,
        uniqueSpecialties: [],
        uniqueProviderTypes: [],
        uniqueRegions: [],
        columnMappings: {}
      }
    };
  }

  public normalizeSpecialty(specialty: string): string {
    for (const [normalizedName, variants] of Object.entries(SPECIALTY_MAPPINGS)) {
      if (variants.some(variant => 
        variant.toLowerCase() === specialty.toLowerCase() ||
        specialty.toLowerCase().includes(variant.toLowerCase())
      )) {
        return normalizedName;
      }
    }
    return specialty;
  }

  public async compareSurveys(
    surveyId1: string,
    surveyId2: string,
    options: {
      matchBy: string[];
      compareColumns: string[];
    }
  ): Promise<any> {
    const survey1 = await this.getSurveyData(surveyId1);
    const survey2 = await this.getSurveyData(surveyId2);

    if (!survey1 || !survey2) {
      throw new Error('Survey not found');
    }

    // Implement survey comparison logic
    // This should be moved to a worker for large datasets
    return {};
  }

  public cleanup() {
    if (this.worker) {
      this.worker.terminate();
    }
  }
}

export default SurveyDataService; 