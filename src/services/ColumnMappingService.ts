import { IColumnMapping, IColumnInfo } from '../types/column';
import { getDataService } from './DataService';

/**
 * Service for managing column mappings
 * Uses IndexedDB for data storage
 */
export class ColumnMappingService {
  private dataService = getDataService();

  async createMapping(standardizedName: string, sourceColumns: IColumnInfo[]): Promise<IColumnMapping> {
    try {
      const mapping: IColumnMapping = {
        id: crypto.randomUUID(),
        standardizedName,
        sourceColumns: sourceColumns.map(col => ({
          id: crypto.randomUUID(),
          name: col.name,
          column: col.name,
          originalName: col.name,
          surveySource: col.surveySource,
          mappingId: '',
          dataType: col.dataType
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return await this.dataService.createColumnMapping(mapping);
    } catch (error) {
      console.error('Error creating mapping:', error);
      throw error;
    }
  }

  async getAllMappings(): Promise<IColumnMapping[]> {
    try {
      return await this.dataService.getAllColumnMappings();
    } catch (error) {
      console.warn('Error fetching mappings, falling back to empty array:', error);
      return [];
    }
  }

  async deleteMapping(mappingId: string): Promise<void> {
    try {
      await this.dataService.deleteColumnMapping(mappingId);
    } catch (error) {
      console.error('Error deleting mapping:', error);
      throw error;
    }
  }

  async clearAllMappings(): Promise<void> {
    try {
      console.log('Clearing all column mappings from IndexedDB...');
      await this.dataService.clearAllColumnMappings();
      console.log('All column mappings cleared successfully');
    } catch (error) {
      console.error('Error clearing mappings:', error);
      throw error;
    }
  }


  async getUnmappedColumns(): Promise<IColumnInfo[]> {
    try {
      return await this.dataService.getUnmappedColumns();
    } catch (error) {
      console.error('Error getting unmapped columns:', error);
      return [];
    }
  }
} 