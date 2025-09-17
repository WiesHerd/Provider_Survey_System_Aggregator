import { IndexedDBService } from './IndexedDBService';
import { ISurveyRow } from '../types/survey';
import { ISpecialtyMapping, IUnmappedSpecialty } from '../types/specialty';
import { IColumnMapping } from '../types/column';

export enum StorageMode {
  INDEXED_DB = 'indexeddb'
}

/**
 * Data Service that works exclusively with IndexedDB
 * Optimized for Vercel deployment with client-side storage
 */
export class DataService {
  private indexedDB: IndexedDBService;
  private mode: StorageMode;

  constructor(mode: StorageMode = StorageMode.INDEXED_DB) {
    this.indexedDB = new IndexedDBService();
    this.mode = mode;
  }

  setMode(mode: StorageMode) {
    this.mode = mode;
  }

  getMode(): StorageMode {
    return this.mode;
  }

  // Survey Methods
  async getAllSurveys() {
    return await this.indexedDB.getAllSurveys();
  }

  async createSurvey(survey: any) {
    return await this.indexedDB.createSurvey(survey);
  }

  async deleteSurvey(id: string) {
    return await this.indexedDB.deleteSurvey(id);
  }

  async deleteAllSurveys() {
    return await this.indexedDB.deleteAllSurveys();
  }

  async uploadSurvey(
    file: File,
    surveyName: string,
    surveyYear: number,
    surveyType: string,
    providerType: string,
    onProgress?: (percent: number) => void
  ): Promise<{ surveyId: string; rowCount: number }> {
    return await this.indexedDB.uploadSurvey(file, surveyName, surveyYear, surveyType, providerType, onProgress);
  }

  // Survey Data Methods
  async getSurveyData(surveyId: string, filters: any = {}, pagination: any = {}) {
    return await this.indexedDB.getSurveyData(surveyId, filters, pagination);
  }

  async saveSurveyData(surveyId: string, rows: any[]) {
    return await this.indexedDB.saveSurveyData(surveyId, rows);
  }



  // Specialty Mapping Methods
  async getAllSpecialtyMappings(providerType?: string): Promise<ISpecialtyMapping[]> {
    return await this.indexedDB.getAllSpecialtyMappings(providerType);
  }

  async createSpecialtyMapping(mapping: ISpecialtyMapping): Promise<ISpecialtyMapping> {
    return await this.indexedDB.createSpecialtyMapping(mapping);
  }

  async deleteSpecialtyMapping(id: string): Promise<void> {
    return await this.indexedDB.deleteSpecialtyMapping(id);
  }

  async clearAllSpecialtyMappings(): Promise<void> {
    return await this.indexedDB.clearAllSpecialtyMappings();
  }

  async updateSpecialtyMapping(id: string, updates: Partial<ISpecialtyMapping>): Promise<ISpecialtyMapping> {
    // Fallback implementation - get all mappings, update the one with matching id
    const mappings = await this.indexedDB.getAllSpecialtyMappings();
    const index = mappings.findIndex(m => m.id === id);
    if (index === -1) {
      throw new Error(`Specialty mapping with id ${id} not found`);
    }
    
    const updatedMapping = { ...mappings[index], ...updates, updatedAt: new Date() };
    // For now, just return the updated mapping (IndexedDB doesn't have update method)
    return updatedMapping;
  }


  // Column Mapping Methods
  async getAllColumnMappings(providerType?: string): Promise<IColumnMapping[]> {
    return await this.indexedDB.getAllColumnMappings(providerType);
  }

  async createColumnMapping(mapping: IColumnMapping): Promise<IColumnMapping> {
    return await this.indexedDB.createColumnMapping(mapping);
  }

  async deleteColumnMapping(id: string): Promise<void> {
    return await this.indexedDB.deleteColumnMapping(id);
  }

  async clearAllColumnMappings(): Promise<void> {
    return await this.indexedDB.clearAllColumnMappings();
  }

  async getUnmappedColumns(providerType?: string): Promise<any[]> {
    return await this.indexedDB.getUnmappedColumns(providerType);
  }


  async getUnmappedSpecialties(providerType?: string): Promise<IUnmappedSpecialty[]> {
    return await this.indexedDB.getUnmappedSpecialties(providerType);
  }

  async getLearnedMappings(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', providerType?: string): Promise<Record<string, string>> {
    return await this.indexedDB.getLearnedMappings(type, providerType);
  }

  async saveLearnedMapping(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', original: string, corrected: string, providerType?: string): Promise<void> {
    return await this.indexedDB.saveLearnedMapping(type, original, corrected, providerType);
  }

  async removeLearnedMapping(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', original: string): Promise<void> {
    return await this.indexedDB.removeLearnedMapping(type, original);
  }

  async clearLearnedMappings(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType'): Promise<void> {
    return await this.indexedDB.clearLearnedMappings(type);
  }

  async healthCheck() {
    return await this.indexedDB.healthCheck();
  }

  // Variable Mapping Methods
  async getVariableMappings(providerType?: string) {
    return await this.indexedDB.getVariableMappings(providerType);
  }

  async getUnmappedVariables(providerType?: string) {
    return await this.indexedDB.getUnmappedVariables(providerType);
  }

  async createVariableMapping(mapping: any) {
    return await this.indexedDB.createVariableMapping(mapping);
  }

  async updateVariableMapping(id: string, mapping: any) {
    return await this.indexedDB.updateVariableMapping(id, mapping);
  }

  async deleteVariableMapping(id: string) {
    return await this.indexedDB.deleteVariableMapping(id);
  }

  async clearAllVariableMappings() {
    return await this.indexedDB.clearAllVariableMappings();
  }

  // Provider Type Mapping Methods
  async getProviderTypeMappings(providerType?: string) {
    return await this.indexedDB.getProviderTypeMappings(providerType);
  }

  async getUnmappedProviderTypes(providerType?: string) {
    return await this.indexedDB.getUnmappedProviderTypes(providerType);
  }

  async createProviderTypeMapping(mapping: any) {
    return await this.indexedDB.createProviderTypeMapping(mapping);
  }

  async updateProviderTypeMapping(id: string, mapping: any) {
    return await this.indexedDB.updateProviderTypeMapping(id, mapping);
  }

  async deleteProviderTypeMapping(id: string) {
    return await this.indexedDB.deleteProviderTypeMapping(id);
  }

  async clearAllProviderTypeMappings() {
    return await this.indexedDB.clearAllProviderTypeMappings();
  }

  // Region Mapping Methods
  async getRegionMappings(providerType?: string) {
    return await this.indexedDB.getRegionMappings(providerType);
  }

  async getUnmappedRegions(providerType?: string) {
    return await this.indexedDB.getUnmappedRegions(providerType);
  }

  async createRegionMapping(mapping: any) {
    return await this.indexedDB.createRegionMapping(mapping);
  }

  async updateRegionMapping(id: string, mapping: any) {
    return await this.indexedDB.updateRegionMapping(id, mapping);
  }

  async deleteRegionMapping(id: string) {
    return await this.indexedDB.deleteRegionMapping(id);
  }

  async clearAllRegionMappings() {
    return await this.indexedDB.clearAllRegionMappings();
  }
}

// Singleton instance
let dataServiceInstance: DataService | null = null;

export const getDataService = (mode: StorageMode = StorageMode.INDEXED_DB): DataService => {
  if (!dataServiceInstance) {
    dataServiceInstance = new DataService(mode);
  }
  return dataServiceInstance;
};
