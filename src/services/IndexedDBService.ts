import { ISurveyRow } from '../types/survey';
import { ISpecialtyMapping, IUnmappedSpecialty } from '../types/specialty';
import { IColumnMapping } from '../types/column';
import { IUnmappedVariable } from '../features/mapping/types/mapping';
import { parseCSVLine } from '../shared/utils/csvParser';

interface Survey {
  id: string;
  name: string;
  year: string;
  type: string;
  uploadDate: Date;
  rowCount: number;
  specialtyCount: number;
  dataPoints: number;
  colorAccent: string;
  metadata: any;
}

interface SurveyData {
  id: string;
  surveyId: string;
  data: any;
  specialty?: string;
  providerType?: string;
  region?: string;
  variable?: string;
  tcc?: number;
  cf?: number;
  wrvu?: number;
  count?: number;
}

/**
 * IndexedDB Service for browser-based data storage
 * Mimics the backend API structure for easy migration later
 */
export class IndexedDBService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'SurveyAggregatorDB';
  private readonly DB_VERSION = 4;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create surveys store
        if (!db.objectStoreNames.contains('surveys')) {
          const surveyStore = db.createObjectStore('surveys', { keyPath: 'id' });
          surveyStore.createIndex('name', 'name', { unique: false });
          surveyStore.createIndex('type', 'type', { unique: false });
          surveyStore.createIndex('year', 'year', { unique: false });
        }

        // Create survey data store
        if (!db.objectStoreNames.contains('surveyData')) {
          const dataStore = db.createObjectStore('surveyData', { keyPath: 'id' });
          dataStore.createIndex('surveyId', 'surveyId', { unique: false });
          dataStore.createIndex('specialty', 'specialty', { unique: false });
        }

        // Create specialty mappings store
        if (!db.objectStoreNames.contains('specialtyMappings')) {
          const mappingStore = db.createObjectStore('specialtyMappings', { keyPath: 'id' });
          mappingStore.createIndex('standardizedName', 'standardizedName', { unique: false });
        }

        // Create specialty mapping sources store
        if (!db.objectStoreNames.contains('specialtyMappingSources')) {
          const sourceStore = db.createObjectStore('specialtyMappingSources', { keyPath: 'id' });
          sourceStore.createIndex('mappingId', 'mappingId', { unique: false });
          sourceStore.createIndex('specialty', 'specialty', { unique: false });
        }

        // Create column mappings store
        if (!db.objectStoreNames.contains('columnMappings')) {
          const columnStore = db.createObjectStore('columnMappings', { keyPath: 'id' });
          columnStore.createIndex('surveyId', 'surveyId', { unique: false });
          columnStore.createIndex('originalName', 'originalName', { unique: false });
        }

        // Create variable mappings store
        if (!db.objectStoreNames.contains('variableMappings')) {
          const variableStore = db.createObjectStore('variableMappings', { keyPath: 'id' });
          variableStore.createIndex('standardizedName', 'standardizedName', { unique: false });
          variableStore.createIndex('variableType', 'variableType', { unique: false });
        }

        // Create region mappings store
        if (!db.objectStoreNames.contains('regionMappings')) {
          const regionStore = db.createObjectStore('regionMappings', { keyPath: 'id' });
          regionStore.createIndex('standardizedName', 'standardizedName', { unique: false });
        }

        // Create provider type mappings store
        if (!db.objectStoreNames.contains('providerTypeMappings')) {
          const providerTypeStore = db.createObjectStore('providerTypeMappings', { keyPath: 'id' });
          providerTypeStore.createIndex('standardizedName', 'standardizedName', { unique: false });
        }

        // Create learned mappings stores
        if (!db.objectStoreNames.contains('learnedSpecialtyMappings')) {
          const learnedSpecialtyStore = db.createObjectStore('learnedSpecialtyMappings', { keyPath: 'original' });
          learnedSpecialtyStore.createIndex('corrected', 'corrected', { unique: false });
        }

        if (!db.objectStoreNames.contains('learnedColumnMappings')) {
          const learnedColumnStore = db.createObjectStore('learnedColumnMappings', { keyPath: 'original' });
          learnedColumnStore.createIndex('corrected', 'corrected', { unique: false });
        }

        if (!db.objectStoreNames.contains('learnedVariableMappings')) {
          const learnedVariableStore = db.createObjectStore('learnedVariableMappings', { keyPath: 'original' });
          learnedVariableStore.createIndex('corrected', 'corrected', { unique: false });
        }

        if (!db.objectStoreNames.contains('learnedRegionMappings')) {
          const learnedRegionStore = db.createObjectStore('learnedRegionMappings', { keyPath: 'original' });
          learnedRegionStore.createIndex('corrected', 'corrected', { unique: false });
        }

        if (!db.objectStoreNames.contains('learnedProviderTypeMappings')) {
          const learnedProviderTypeStore = db.createObjectStore('learnedProviderTypeMappings', { keyPath: 'original' });
          learnedProviderTypeStore.createIndex('corrected', 'corrected', { unique: false });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    return this.db!;
  }

  // Survey Methods
  async getAllSurveys(): Promise<Survey[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['surveys'], 'readonly');
      const store = transaction.objectStore('surveys');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async createSurvey(survey: Survey): Promise<Survey> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['surveys'], 'readwrite');
      const store = transaction.objectStore('surveys');
      const request = store.add(survey);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(survey);
    });
  }

  async deleteSurvey(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['surveys', 'surveyData'], 'readwrite');
      
      // Delete survey
      const surveyStore = transaction.objectStore('surveys');
      const surveyRequest = surveyStore.delete(id);

      // Delete associated data
      const dataStore = transaction.objectStore('surveyData');
      const dataIndex = dataStore.index('surveyId');
      const dataRequest = dataIndex.openCursor(IDBKeyRange.only(id));

      dataRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          dataStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteAllSurveys(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['surveys', 'surveyData'], 'readwrite');
      
      const surveyStore = transaction.objectStore('surveys');
      const dataStore = transaction.objectStore('surveyData');
      
      surveyStore.clear();
      dataStore.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async uploadSurvey(
    file: File,
    surveyName: string,
    surveyYear: number,
    surveyType: string,
    onProgress?: (percent: number) => void
  ): Promise<{ surveyId: string; rowCount: number }> {
    try {
      // Parse CSV file
      const text = await file.text();
              const rows = this.parseCSV(text);
      

      
              // Create survey record
        const surveyId = crypto.randomUUID();
        const survey = {
          id: surveyId,
          name: surveyName,
          year: surveyYear.toString(),
          type: surveyType,
          uploadDate: new Date(),
          rowCount: rows.length,
          specialtyCount: 0, // Will be calculated
          dataPoints: rows.length,
          colorAccent: '#6366F1',
          metadata: {}
        };

        // Save survey
        await this.createSurvey(survey);
        
        // Save survey data
        await this.saveSurveyData(surveyId, rows);
        
        // Calculate specialty count
        const uniqueSpecialties = new Set<string>();
        rows.forEach((row: any) => {
          const specialty = row.specialty || row.Specialty || row['Provider Type'];
          if (specialty) uniqueSpecialties.add(specialty);
          });
        
        // Update survey with specialty count
        const updatedSurvey = { ...survey, specialtyCount: uniqueSpecialties.size };
        await this.updateSurvey(updatedSurvey);

        return { surveyId, rowCount: rows.length };
    } catch (error) {
      console.error('Error uploading survey to IndexedDB:', error);
      throw error;
    }
  }

  private parseCSV(text: string): any[] {
    const lines = text.split('\n').filter(line => line.trim()); // Remove empty lines
    if (lines.length === 0) return [];
    
    console.log('Total CSV lines:', lines.length);
    console.log('First 3 lines:', lines.slice(0, 3));
    
    // Parse headers from first line using proper CSV parsing
    const headers = parseCSVLine(lines[0]);
    console.log('CSV Headers:', headers);
    
    // Parse data rows - start from index 1 (skip header row)
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row);
    }
    
    console.log('CSV Parsed Rows:', rows.length, 'rows');
    if (rows.length > 0) {
      console.log('First parsed row:', rows[0]);
      console.log('Last parsed row:', rows[rows.length - 1]);
    }
    
    return rows;
  }

  private async updateSurvey(survey: any): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['surveys'], 'readwrite');
      const store = transaction.objectStore('surveys');
      const request = store.put(survey);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Survey Data Methods
  async getSurveyData(surveyId: string, filters: any = {}, pagination: any = {}): Promise<{ rows: ISurveyRow[] }> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['surveyData'], 'readonly');
      const store = transaction.objectStore('surveyData');
      const index = store.index('surveyId');
      const request = index.getAll(IDBKeyRange.only(surveyId));

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const data = request.result || [];
        
        // Apply filters to the data
        let filteredData = data;
        
        if (filters && Object.keys(filters).length > 0) {
          console.log('Filtering data with filters:', filters);
          console.log('Total data items before filtering:', data.length);
          
          filteredData = data.filter((item: SurveyData) => {
            // Filter by specialty - EXACT MATCH ONLY
            if (filters.specialty && filters.specialty.trim() !== '') {
              const itemSpecialty = item.specialty || item.data?.specialty || item.data?.Specialty || '';
              console.log('Checking specialty:', { 
                filterSpecialty: filters.specialty, 
                itemSpecialty, 
                matches: itemSpecialty.toLowerCase() === filters.specialty.toLowerCase() 
              });
              if (itemSpecialty.toLowerCase() !== filters.specialty.toLowerCase()) {
                return false;
              }
            }
            
            // Filter by provider type - EXACT MATCH ONLY
            if (filters.providerType && filters.providerType.trim() !== '') {
              const itemProviderType = item.providerType || item.data?.providerType || item.data?.['Provider Type'] || item.data?.provider_type || '';
              console.log('Checking provider type:', { 
                filterProviderType: filters.providerType, 
                itemProviderType, 
                matches: itemProviderType.toLowerCase() === filters.providerType.toLowerCase() 
              });
              if (itemProviderType.toLowerCase() !== filters.providerType.toLowerCase()) {
                return false;
              }
            }
            
            // Filter by region - EXACT MATCH ONLY
            if (filters.region && filters.region.trim() !== '') {
              const itemRegion = item.region || item.data?.region || item.data?.Region || item.data?.geographic_region || '';
              if (itemRegion.toLowerCase() !== filters.region.toLowerCase()) {
                return false;
              }
            }
            
            // Filter by variable - EXACT MATCH ONLY
            if (filters.variable && filters.variable.trim() !== '') {
              const itemVariable = item.variable || item.data?.variable || '';
              console.log('Checking variable:', { 
                filterVariable: filters.variable, 
                itemVariable, 
                matches: itemVariable.toLowerCase() === filters.variable.toLowerCase() 
              });
              if (itemVariable.toLowerCase() !== filters.variable.toLowerCase()) {
                return false;
              }
            }
            
            return true;
          });
          
          console.log('Filtered data items after filtering:', filteredData.length);
          
          // Debug: Show what specialties actually exist in the data
          if (data.length > 0) {
            const actualSpecialties = [...new Set(data.map(item => 
              item.specialty || item.data?.specialty || item.data?.Specialty || ''
            ))].filter(Boolean).sort();
            console.log('Actual specialties in data:', actualSpecialties);
            
            const actualProviderTypes = [...new Set(data.map(item => 
              item.providerType || item.data?.providerType || item.data?.['Provider Type'] || item.data?.provider_type || ''
            ))].filter(Boolean).sort();
            console.log('Actual provider types in data:', actualProviderTypes);
            
            // Debug: Show the actual data structure
            if (data.length > 0) {
              console.log('Sample data item structure:', data[0]);
              console.log('Sample data item keys:', Object.keys(data[0]));
              if (data[0].data) {
                console.log('Sample data.data keys:', Object.keys(data[0].data));
              }
            }
          }
        }
        
        const rows = filteredData.map((item: SurveyData) => {
          const rowData = { ...item.data };
          return {
            ...rowData,
            id: item.id,
            surveyId: item.surveyId
          } as ISurveyRow;
        });
        
        console.log('Raw rows from IndexedDB:', rows.length);
        if (rows.length > 0) {
          console.log('First row from IndexedDB:', rows[0]);
          console.log('First row values:', Object.values(rows[0]));
        }
        
        // Filter out any rows that look like headers
        const filteredRows = rows.filter(row => {
          const values = Object.values(row).filter(val => val !== row.id && val !== row.surveyId);
          
          // Check if this row contains header-like values
          const headerKeywords = [
            'specialty', 'provider_type', 'geographic_region', 'variable', 
            'n_orgs', 'n_incumbents', 'p25', 'p50', 'p75', 'p90',
            'tcc', 'wrvu', 'cf', 'providerType', 'geographicRegion'
          ];
          
          // For normalized format data, be more careful about filtering
          // Only filter out rows where ALL values are header keywords (exact matches)
          const headerMatches = values.filter(val => 
            typeof val === 'string' && 
            headerKeywords.some(keyword => 
              val.toLowerCase() === keyword.toLowerCase()
            )
          ).length;
          
          // Only filter out if ALL values are exact header matches
          // This prevents filtering out legitimate data like "Work RVUs" in the variable column
          const isHeaderRow = headerMatches === values.length && values.length > 0;
          
          if (isHeaderRow) {
            console.log('Filtering out header row:', values);
          }
          
          return !isHeaderRow;
        });
        
        console.log('Filtered rows after header removal:', filteredRows.length);
        if (filteredRows.length > 0) {
          console.log('First filtered row:', filteredRows[0]);
        }
        
        resolve({ rows: filteredRows });
      };
    });
  }

  async saveSurveyData(surveyId: string, rows: any[]): Promise<void> {
    const db = await this.ensureDB();
    console.log('Saving survey data:', surveyId, 'with', rows.length, 'rows');
    console.log('First row to save:', rows[0]);
    console.log('Last row to save:', rows[rows.length - 1]);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['surveyData'], 'readwrite');
      const store = transaction.objectStore('surveyData');

      rows.forEach((row, index) => {
        const surveyData: SurveyData = {
          id: `${surveyId}_${index}`,
          surveyId,
          data: row,
          specialty: row.specialty || row.Specialty || row['Provider Type'],
          providerType: row.providerType || row['Provider Type'],
          region: row.region || row.Region,
          tcc: row.tcc || row.TCC,
          cf: row.cf || row.CF,
          wrvu: row.wrvu || row.wRVU
        };
        store.add(surveyData);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Specialty Mapping Methods
  async getAllSpecialtyMappings(): Promise<ISpecialtyMapping[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['specialtyMappings', 'specialtyMappingSources'], 'readonly');
      const mappingStore = transaction.objectStore('specialtyMappings');
      const sourceStore = transaction.objectStore('specialtyMappingSources');
      
      const mappingRequest = mappingStore.getAll();
      
      mappingRequest.onerror = () => reject(mappingRequest.error);
      mappingRequest.onsuccess = () => {
        const mappings = mappingRequest.result || [];
        
        // Get sources for each mapping
        const mappingPromises = mappings.map(async (mapping) => {
          const sources = await new Promise<any[]>((resolve, reject) => {
            const sourceIndex = sourceStore.index('mappingId');
            const sourceRequest = sourceIndex.getAll(IDBKeyRange.only(mapping.id));
            sourceRequest.onerror = () => reject(sourceRequest.error);
            sourceRequest.onsuccess = () => resolve(sourceRequest.result || []);
          });

          return {
            ...mapping,
            sourceSpecialties: sources
          };
        });

        Promise.all(mappingPromises).then(resolve).catch(reject);
      };
    });
  }

  async createSpecialtyMapping(mapping: ISpecialtyMapping): Promise<ISpecialtyMapping> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['specialtyMappings', 'specialtyMappingSources'], 'readwrite');
      const mappingStore = transaction.objectStore('specialtyMappings');
      const sourceStore = transaction.objectStore('specialtyMappingSources');

      // Save mapping
      const mappingRequest = mappingStore.add(mapping);
      
      // Save sources
      mapping.sourceSpecialties.forEach((source: any) => {
        sourceStore.add({
          ...source,
          mappingId: mapping.id
        });
      });

      transaction.oncomplete = () => resolve(mapping);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteSpecialtyMapping(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['specialtyMappings', 'specialtyMappingSources'], 'readwrite');
      const mappingStore = transaction.objectStore('specialtyMappings');
      const sourceStore = transaction.objectStore('specialtyMappingSources');

      // Delete mapping
      mappingStore.delete(id);

      // Delete sources
      const sourceIndex = sourceStore.index('mappingId');
      const sourceRequest = sourceIndex.openCursor(IDBKeyRange.only(id));

      sourceRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          sourceStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearAllSpecialtyMappings(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['specialtyMappings', 'specialtyMappingSources'], 'readwrite');
      const mappingStore = transaction.objectStore('specialtyMappings');
      const sourceStore = transaction.objectStore('specialtyMappingSources');

      mappingStore.clear();
      sourceStore.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Column Mapping Methods
  async getAllColumnMappings(): Promise<IColumnMapping[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['columnMappings'], 'readonly');
      const store = transaction.objectStore('columnMappings');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async createColumnMapping(mapping: IColumnMapping): Promise<IColumnMapping> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['columnMappings'], 'readwrite');
      const store = transaction.objectStore('columnMappings');
      const request = store.add(mapping);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(mapping);
    });
  }

  async deleteColumnMapping(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['columnMappings'], 'readwrite');
      const store = transaction.objectStore('columnMappings');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearAllColumnMappings(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['columnMappings'], 'readwrite');
      const store = transaction.objectStore('columnMappings');
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getUnmappedColumns(): Promise<any[]> {
    const surveys = await this.getAllSurveys();
    const mappings = await this.getAllColumnMappings();
    
    const mappedNames = new Set<string>();
    mappings.forEach(mapping => {
      mappedNames.add(mapping.standardizedName.toLowerCase());
      mapping.sourceColumns.forEach((source: any) => {
        mappedNames.add(source.column.toLowerCase());
      });
    });

    const unmapped: any[] = [];
    const columnCounts = new Map<string, { count: number; sources: Set<string>; dataType: string }>();

    for (const survey of surveys) {
      const { rows } = await this.getSurveyData(survey.id);
      
      if (rows.length > 0) {
        const firstRow = rows[0];
        const surveySource = survey.type || survey.name || 'Unknown';
        
        // Debug: Log all columns in the first row
        console.log(`🔍 Survey ${surveySource} columns:`, Object.keys(firstRow));
        
        // Check top-level columns
        Object.keys(firstRow).forEach(columnName => {
          // Debug: Check each column against compensation patterns
          const isCompensation = this.isCompensationOrTechnicalColumn(columnName);
          console.log(`🔍 Column "${columnName}" - isCompensation: ${isCompensation}`);
          
          // Include compensation and technical columns, including percentile columns
          if (isCompensation) {
            const key = columnName.toLowerCase();
            const current = columnCounts.get(key) || { count: 0, sources: new Set(), dataType: typeof firstRow[columnName] };
            current.count++;
            current.sources.add(surveySource);
            columnCounts.set(key, current);
            
            // Debug: Log compensation columns found
            console.log(`✅ Found compensation column: ${columnName} in ${surveySource}`);
          }
        });
        
        // ALSO check nested data object for columns
        if (firstRow.data && typeof firstRow.data === 'object') {
          console.log(`🔍 Checking nested data object for survey: ${surveySource}`);
          Object.keys(firstRow.data).forEach(columnName => {
            // Debug: Check each nested column against compensation patterns
            const isCompensation = this.isCompensationOrTechnicalColumn(columnName);
            console.log(`🔍 Nested column "${columnName}" - isCompensation: ${isCompensation}`);
            
            // Include compensation and technical columns, including percentile columns
            if (isCompensation) {
              const key = columnName.toLowerCase();
              const current = columnCounts.get(key) || { count: 0, sources: new Set(), dataType: 'string' };
              current.count++;
              current.sources.add(surveySource);
              columnCounts.set(key, current);
              
              // Debug: Log compensation columns found
              console.log(`✅ Found nested compensation column: ${columnName} in ${surveySource}`);
            }
          });
        }
      }
    }



    // Create separate entries for each survey source, but ONLY if not already mapped
    columnCounts.forEach((value, key) => {
      Array.from(value.sources).forEach(surveySource => {
        // Check if this column is already mapped
        if (!mappedNames.has(key)) {
          unmapped.push({
            id: crypto.randomUUID(),
            name: key,
            dataType: value.dataType,
            surveySource: surveySource,
            frequency: value.count,
            category: this.categorizeColumn(key)
          });
        } else {
          console.log(`🚫 Skipping mapped column: ${key} from ${surveySource}`);
        }
      });
    });

    console.log(`📊 Total unmapped columns found: ${unmapped.length}`);
    console.log(`📋 Unmapped columns:`, unmapped.map(c => `${c.name} (${c.surveySource})`));

    return unmapped;
  }

  /**
   * Determines if a column is compensation or technical data that should be handled by Column Mapping
   * Excludes specialty, provider type, region, and variable name columns (handled by dedicated mappers)
   */
  private isCompensationOrTechnicalColumn(columnName: string): boolean {
    const name = columnName.toLowerCase();
    
    // Exclude columns handled by dedicated mappers
    const excludePatterns = [
      /^specialty$/i,
      /^provider.*type$/i, /^providertype$/i,
      /^geographic.*region$/i, /^region$/i, /^geographicregion$/i,
      /^variable$/i, /^variable.*name$/i
    ];
    
    for (const pattern of excludePatterns) {
      if (pattern.test(name)) {
        return false;
      }
    }
    
    // Include compensation percentile patterns
    const includePatterns = [
      // TCC patterns
      /tcc.*p\d+/i, /p\d+.*tcc/i, /total.*cash.*\d+/i, /\d+.*total.*cash/i,
      /total.*comp.*\d+/i, /\d+.*total.*comp/i,
      
      // wRVU patterns  
      /wrvu.*p\d+/i, /p\d+.*wrvu/i, /work.*rvu.*\d+/i, /\d+.*work.*rvu/i,
      /rvu.*\d+/i, /\d+.*rvu/i,
      
      // CF patterns
      /cf.*p\d+/i, /p\d+.*cf/i, /conversion.*factor.*\d+/i, /\d+.*conversion.*factor/i,
      
      // Technical fields
      /n_orgs?$/i, /n_incumbents?$/i, /number.*org/i, /number.*incumbent/i,
      /organization.*count/i, /incumbent.*count/i,
      
      // Direct percentile matches
      /^tcc_p\d+$/i, /^wrvu_p\d+$/i, /^cf_p\d+$/i,
      
      // Basic percentile patterns (p25, p50, p75, p90)
      /^p\d+$/i, /^p25$/i, /^p50$/i, /^p75$/i, /^p90$/i,
      
      // Common survey percentile variations
      /median/i, /25th/i, /75th/i, /90th/i, /percentile/i
    ];
    
    return includePatterns.some(pattern => pattern.test(name));
  }

  /**
   * Categorizes compensation columns for better organization
   */
  private categorizeColumn(columnName: string): string {
    const name = columnName.toLowerCase();
    
    if (/tcc|total.*cash|total.*comp/i.test(name)) return 'Total Cash Compensation';
    if (/wrvu|work.*rvu|rvu/i.test(name)) return 'Work RVUs'; 
    if (/cf|conversion.*factor/i.test(name)) return 'Conversion Factor';
    if (/n_orgs?|organization|number.*org/i.test(name)) return 'Organization Count';
    if (/n_incumbents?|incumbent|number.*incumbent/i.test(name)) return 'Incumbent Count';
    
    return 'Other Compensation';
  }

  // Utility Methods
  async getUnmappedSpecialties(): Promise<IUnmappedSpecialty[]> {
    const surveys = await this.getAllSurveys();
    const mappings = await this.getAllSpecialtyMappings();
    
    const mappedNames = new Set<string>();
    mappings.forEach(mapping => {
      mappedNames.add(mapping.standardizedName.toLowerCase());
      mapping.sourceSpecialties.forEach((source: any) => {
        mappedNames.add(source.specialty.toLowerCase());
      });
    });

    const unmapped: IUnmappedSpecialty[] = [];
    const specialtyCounts = new Map<string, { count: number; sources: Set<string> }>();

    for (const survey of surveys) {
      const { rows } = await this.getSurveyData(survey.id);
      
      // Get survey source with proper fallbacks
      const surveySource = survey.type || survey.name || 'Unknown';
      
      rows.forEach(row => {
        const specialty = row.specialty || row.Specialty || row['Provider Type'];
        if (specialty && typeof specialty === 'string' && !mappedNames.has(specialty.toLowerCase())) {
          const key = specialty.toLowerCase();
          const current = specialtyCounts.get(key) || { count: 0, sources: new Set() };
          current.count++;
          current.sources.add(surveySource);
          specialtyCounts.set(key, current);
        }
      });
    }

    // Create separate entries for each survey source instead of combining them
    specialtyCounts.forEach((value, key) => {
      // Create a separate entry for each survey source
      Array.from(value.sources).forEach(surveySource => {
        unmapped.push({
          id: crypto.randomUUID(),
          name: key,
          frequency: value.count,
          surveySource: surveySource
        });
      });
    });

    return unmapped;
  }

  async getUnmappedVariables(): Promise<IUnmappedVariable[]> {
    try {
      const surveys = await this.getAllSurveys();
      const mappings = await this.getVariableMappings();
    
    const mappedNames = new Set<string>();
    mappings.forEach(mapping => {
      mappedNames.add(mapping.standardizedName.toLowerCase());
      mapping.sourceVariables.forEach((source: any) => {
        mappedNames.add(source.originalVariableName.toLowerCase());
      });
    });

    const unmapped: IUnmappedVariable[] = [];
    const variableCounts = new Map<string, { count: number; sources: Set<string> }>();

    for (const survey of surveys) {
      const { rows } = await this.getSurveyData(survey.id);
      
      // Get survey source with proper fallbacks
      const surveySource = survey.type || survey.name || 'Unknown';
      
      rows.forEach(row => {
        const variable = row.variable || row.Variable || row['Variable Name'];
        if (variable && typeof variable === 'string' && !mappedNames.has(variable.toLowerCase())) {
          const key = variable.toLowerCase();
          const current = variableCounts.get(key) || { count: 0, sources: new Set() };
          current.count++;
          current.sources.add(surveySource);
          variableCounts.set(key, current);
        }
      });
    }

    // Create separate entries for each survey source instead of combining them
    variableCounts.forEach((value, key) => {
      // Create a separate entry for each survey source
      Array.from(value.sources).forEach(surveySource => {
        const variableType = this.detectVariableType(key);
        unmapped.push({
          id: crypto.randomUUID(),
          name: key,
          frequency: value.count,
          surveySource: surveySource as any,
          variableType: variableType.type,
          variableSubType: variableType.subType,
          confidence: variableType.confidence,
          suggestions: variableType.suggestions
        });
      });
    });

      return unmapped;
    } catch (error) {
      console.error('Error getting unmapped variables:', error);
      return [];
    }
  }

  async autoMapColumns(config: any): Promise<Array<{
    standardizedName: string;
    columns: any[];
    confidence: number;
  }>> {
    try {
      const unmappedColumns = await this.getUnmappedColumns();
      console.log('Auto-mapping columns:', unmappedColumns.map(c => c.name));
      
      const suggestions: Array<{
        standardizedName: string;
        columns: any[];
        confidence: number;
      }> = [];

      // Group columns by similarity
      const processedColumns = new Set<string>();
      
      for (const column of unmappedColumns) {
        if (processedColumns.has(column.id)) continue;

        const matches = unmappedColumns
          .filter((c: any) => !processedColumns.has(c.id))
          .map((c: any) => ({
            column: c,
            similarity: this.calculateSimilarity(column.name, c.name, c.dataType, column.dataType, config)
          }))
          .filter(match => {
            console.log(`Similarity between "${column.name}" and "${match.column.name}": ${match.similarity}`);
            return match.similarity >= config.confidenceThreshold;
          })
          .sort((a, b) => b.similarity - a.similarity);

        if (matches.length > 0) {
          const matchedColumns = matches.map(m => m.column);
          matchedColumns.forEach(c => processedColumns.add(c.id));

          console.log(`Creating mapping for "${column.name}" with ${matchedColumns.length} columns:`, 
            matchedColumns.map(c => c.name));

          suggestions.push({
            standardizedName: this.generateStandardizedName(matchedColumns),
            columns: matchedColumns,
            confidence: matches[0].similarity
          });
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Error in auto-mapping columns:', error);
      return [];
    }
  }

  private calculateSimilarity(name1: string, name2: string, type1: string, type2: string, config: any): number {
    // Normalize names
    const normalized1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalized2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Exact match gets highest score
    if (normalized1 === normalized2) {
      return 1.0;
    }

    // Check for exact prefix match (e.g., "wrvu_p50" vs "wrvu_p90" should NOT match)
    const prefix1 = normalized1.replace(/[0-9]/g, '');
    const prefix2 = normalized2.replace(/[0-9]/g, '');
    
    // If prefixes don't match, return very low similarity
    if (prefix1 !== prefix2) {
      return 0.1;
    }

    // For same prefix, check if numbers are different (e.g., p50 vs p90)
    const numbers1 = normalized1.match(/[0-9]+/g) || [];
    const numbers2 = normalized2.match(/[0-9]+/g) || [];
    
    // If numbers are different, this is likely a different metric (p50 vs p90, p25 vs p75, etc.)
    if (numbers1.length > 0 && numbers2.length > 0) {
      const hasDifferentNumbers = numbers1.some(n1 => 
        numbers2.some(n2 => n1 !== n2)
      );
      if (hasDifferentNumbers) {
        console.log(`Different numbers detected: "${name1}" vs "${name2}" - returning 0.2 similarity`);
        return 0.2; // Very low similarity for different percentiles/metrics
      }
    }

    // Calculate Levenshtein distance for remaining cases
    const distance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    let similarity = 1 - distance / maxLength;

    // Boost similarity for same data type
    if (type1 === type2) {
      similarity += 0.1;
    }

    return Math.min(similarity, 1.0);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    return matrix[str2.length][str1.length];
  }

  private generateStandardizedName(columns: any[]): string {
    // Use the most common name pattern
    const names = columns.map(c => c.name.toLowerCase());
    
    // Check for common patterns
    if (names.some(n => n.includes('specialty'))) return 'specialty';
    if (names.some(n => n.includes('provider'))) return 'providerType';
    if (names.some(n => n.includes('region'))) return 'region';
    if (names.some(n => n.includes('tcc'))) return 'tcc';
    if (names.some(n => n.includes('cf'))) return 'cf';
    if (names.some(n => n.includes('wrvu'))) return 'wrvu';
    
    // Default to the first column name
    return columns[0].name;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    await this.ensureDB();
    return {
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  }



  // Variable Mapping Methods
  async getVariableMappings(): Promise<any[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['variableMappings'], 'readonly');
      const store = transaction.objectStore('variableMappings');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async createVariableMapping(mapping: any): Promise<any> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['variableMappings'], 'readwrite');
      const store = transaction.objectStore('variableMappings');
      const request = store.add(mapping);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(mapping);
    });
  }

  async updateVariableMapping(id: string, mapping: any): Promise<any> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['variableMappings'], 'readwrite');
      const store = transaction.objectStore('variableMappings');
      const request = store.put({ ...mapping, id });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(mapping);
    });
  }

  async deleteVariableMapping(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['variableMappings'], 'readwrite');
      const store = transaction.objectStore('variableMappings');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearAllVariableMappings(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['variableMappings'], 'readwrite');
      const store = transaction.objectStore('variableMappings');
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getUnmappedProviderTypes(): Promise<any[]> {
    try {
      const surveys = await this.getAllSurveys();
      const mappings = await this.getProviderTypeMappings();
    
      const mappedNames = new Set<string>();
      mappings.forEach(mapping => {
        mappedNames.add(mapping.standardizedName.toLowerCase());
        mapping.sourceProviderTypes.forEach((source: any) => {
          mappedNames.add(source.providerType.toLowerCase());
        });
      });

      const unmapped: any[] = [];
      const providerTypeCounts = new Map<string, { count: number; sources: Set<string> }>();

      for (const survey of surveys) {
        const { rows } = await this.getSurveyData(survey.id);
        
        // Get survey source with proper fallbacks
        const surveySource = survey.type || survey.name || 'Unknown';
        
        rows.forEach(row => {
          // Look for provider type in different possible column names
          const providerType = row.providerType || row['Provider Type'] || row.provider_type || row['provider_type'];
          if (providerType && typeof providerType === 'string' && !mappedNames.has(providerType.toLowerCase())) {
            const key = providerType.toLowerCase();
            const current = providerTypeCounts.get(key) || { count: 0, sources: new Set() };
            current.count++;
            current.sources.add(surveySource);
            providerTypeCounts.set(key, current);
          }
        });
      }

      // Create separate entries for each survey source
      providerTypeCounts.forEach((value, key) => {
        Array.from(value.sources).forEach(surveySource => {
          unmapped.push({
            id: crypto.randomUUID(),
            name: key,
            frequency: value.count,
            surveySource: surveySource as any
          });
        });
      });

      return unmapped;
    } catch (error) {
      console.error('Error getting unmapped provider types:', error);
      return [];
    }
  }

  async getUnmappedRegions(): Promise<any[]> {
    try {
      const surveys = await this.getAllSurveys();
      const mappings = await this.getRegionMappings();
    
      const mappedNames = new Set<string>();
      mappings.forEach(mapping => {
        mappedNames.add(mapping.standardizedName.toLowerCase());
        mapping.sourceRegions.forEach((source: any) => {
          mappedNames.add(source.region.toLowerCase());
        });
      });

      const unmapped: any[] = [];
      const regionCounts = new Map<string, { count: number; sources: Set<string> }>();

      for (const survey of surveys) {
        const { rows } = await this.getSurveyData(survey.id);
        
        // Get survey source with proper fallbacks
        const surveySource = survey.type || survey.name || 'Unknown';
        
        rows.forEach(row => {
          // Look for region in different possible column names
          const region = row.geographicRegion || row['Geographic Region'] || row.geographic_region || row.region || row.Region;
          if (region && typeof region === 'string' && !mappedNames.has(region.toLowerCase())) {
            const key = region.toLowerCase();
            const current = regionCounts.get(key) || { count: 0, sources: new Set() };
            current.count++;
            current.sources.add(surveySource);
            regionCounts.set(key, current);
          }
        });
      }

      // Create separate entries for each survey source
      regionCounts.forEach((value, key) => {
        Array.from(value.sources).forEach(surveySource => {
          unmapped.push({
            id: crypto.randomUUID(),
            name: key,
            frequency: value.count,
            surveySource: surveySource as any
          });
        });
      });

      return unmapped;
    } catch (error) {
      console.error('Error getting unmapped regions:', error);
      return [];
    }
  }

  // Provider Type Mapping Methods
  async getProviderTypeMappings(): Promise<any[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['providerTypeMappings'], 'readonly');
      const store = transaction.objectStore('providerTypeMappings');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async createProviderTypeMapping(mapping: any): Promise<any> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['providerTypeMappings'], 'readwrite');
      const store = transaction.objectStore('providerTypeMappings');
      const request = store.add(mapping);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(mapping);
    });
  }

  async updateProviderTypeMapping(id: string, mapping: any): Promise<any> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['providerTypeMappings'], 'readwrite');
      const store = transaction.objectStore('providerTypeMappings');
      const request = store.put({ ...mapping, id });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(mapping);
    });
  }

  async deleteProviderTypeMapping(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['providerTypeMappings'], 'readwrite');
      const store = transaction.objectStore('providerTypeMappings');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearAllProviderTypeMappings(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['providerTypeMappings'], 'readwrite');
      const store = transaction.objectStore('providerTypeMappings');
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // Region Mapping Methods
  async getRegionMappings(): Promise<any[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['regionMappings'], 'readonly');
      const store = transaction.objectStore('regionMappings');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async createRegionMapping(mapping: any): Promise<any> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['regionMappings'], 'readwrite');
      const store = transaction.objectStore('regionMappings');
      const request = store.add(mapping);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(mapping);
    });
  }

  async updateRegionMapping(id: string, mapping: any): Promise<any> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['regionMappings'], 'readwrite');
      const store = transaction.objectStore('regionMappings');
      const request = store.put({ ...mapping, id });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(mapping);
    });
  }

  async deleteRegionMapping(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['regionMappings'], 'readwrite');
      const store = transaction.objectStore('regionMappings');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearAllRegionMappings(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['regionMappings'], 'readwrite');
      const store = transaction.objectStore('regionMappings');
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private detectVariableType(variableName: string): {
    type: 'compensation' | 'categorical';
    subType: string;
    confidence: number;
    suggestions: string[];
  } {
    const name = variableName.toLowerCase();
    
    // Compensation variables
    if (name.includes('tcc') || name.includes('total cash') || name.includes('compensation')) {
      return {
        type: 'compensation',
        subType: 'tcc',
        confidence: 0.9,
        suggestions: ['tcc', 'total_cash_compensation']
      };
    }
    
    if (name.includes('wrvu') || name.includes('work rvu') || name.includes('rvu')) {
      return {
        type: 'compensation',
        subType: 'wrvu',
        confidence: 0.9,
        suggestions: ['wrvu', 'work_rvu']
      };
    }
    
    if (name.includes('cf') || name.includes('conversion') || name.includes('factor')) {
      return {
        type: 'compensation',
        subType: 'cf',
        confidence: 0.9,
        suggestions: ['cf', 'conversion_factor']
      };
    }
    
    if (name.includes('base') || name.includes('salary')) {
      return {
        type: 'compensation',
        subType: 'base_pay',
        confidence: 0.8,
        suggestions: ['base_pay', 'salary']
      };
    }
    
    // Categorical variables
    if (name.includes('region') || name.includes('geographic')) {
      return {
        type: 'categorical',
        subType: 'region',
        confidence: 0.8,
        suggestions: ['region', 'geographic_region']
      };
    }
    
    if (name.includes('provider') || name.includes('type')) {
      return {
        type: 'categorical',
        subType: 'provider_type',
        confidence: 0.7,
        suggestions: ['provider_type', 'type']
      };
    }
    
    // Default to compensation if we can't determine
    return {
      type: 'compensation',
      subType: 'unknown',
      confidence: 0.5,
      suggestions: [variableName.toLowerCase().replace(/\s+/g, '_')]
    };
  }

  // ==================== LEARNED MAPPINGS METHODS ====================

  /**
   * Get learned mappings for a specific type
   */
  async getLearnedMappings(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType'): Promise<Record<string, string>> {
    const db = await this.ensureDB();
    const storeName = `learned${type.charAt(0).toUpperCase() + type.slice(1)}Mappings`;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const mappings: Record<string, string> = {};
        request.result.forEach((item: any) => {
          mappings[item.original] = item.corrected;
        });
        resolve(mappings);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save a learned mapping
   */
  async saveLearnedMapping(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', original: string, corrected: string): Promise<void> {
    const db = await this.ensureDB();
    const storeName = `learned${type.charAt(0).toUpperCase() + type.slice(1)}Mappings`;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put({
        original: original.toLowerCase(),
        corrected,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove a learned mapping
   */
  async removeLearnedMapping(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', original: string): Promise<void> {
    const db = await this.ensureDB();
    const storeName = `learned${type.charAt(0).toUpperCase() + type.slice(1)}Mappings`;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(original.toLowerCase());

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all learned mappings of a specific type
   */
  async clearLearnedMappings(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType'): Promise<void> {
    const db = await this.ensureDB();
    const storeName = `learned${type.charAt(0).toUpperCase() + type.slice(1)}Mappings`;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
