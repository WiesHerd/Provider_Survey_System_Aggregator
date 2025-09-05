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
    onProgress?: (percent: number) => void
  ): Promise<{ surveyId: string; rowCount: number }> {
    return await this.indexedDB.uploadSurvey(file, surveyName, surveyYear, surveyType, onProgress);
  }

  // Survey Data Methods
  async getSurveyData(surveyId: string, filters: any = {}, pagination: any = {}) {
    return await this.indexedDB.getSurveyData(surveyId, filters, pagination);
  }

  async saveSurveyData(surveyId: string, rows: any[]) {
    return await this.indexedDB.saveSurveyData(surveyId, rows);
  }



  // Specialty Mapping Methods
  async getAllSpecialtyMappings(): Promise<ISpecialtyMapping[]> {
    return await this.indexedDB.getAllSpecialtyMappings();
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

  async autoMapSpecialties(config: any): Promise<ISpecialtyMapping[]> {
    // Fallback implementation - return empty array for now
    console.warn('autoMapSpecialties not implemented in IndexedDBService');
    return [];
  }

  async suggestSpecialtyMappings(specialty: IUnmappedSpecialty, config: any): Promise<ISpecialtyMapping[]> {
    // Fallback implementation - return empty array for now
    console.warn('suggestSpecialtyMappings not implemented in IndexedDBService');
    return [];
  }

  // Column Mapping Methods
  async getAllColumnMappings(): Promise<IColumnMapping[]> {
    return await this.indexedDB.getAllColumnMappings();
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

  async getUnmappedColumns(): Promise<any[]> {
    return await this.indexedDB.getUnmappedColumns();
  }

  async autoMapColumns(config: any): Promise<Array<{
    standardizedName: string;
    columns: any[];
    confidence: number;
  }>> {
    return await this.indexedDB.autoMapColumns(config);
  }

  async getUnmappedSpecialties(): Promise<IUnmappedSpecialty[]> {
    return await this.indexedDB.getUnmappedSpecialties();
  }

  async getLearnedMappings(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType'): Promise<Record<string, string>> {
    return await this.indexedDB.getLearnedMappings(type);
  }

  async saveLearnedMapping(type: 'column' | 'specialty' | 'variable' | 'region' | 'providerType', original: string, corrected: string): Promise<void> {
    return await this.indexedDB.saveLearnedMapping(type, original, corrected);
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
  async getVariableMappings() {
    return await this.indexedDB.getVariableMappings();
  }

  async getUnmappedVariables() {
    return await this.indexedDB.getUnmappedVariables();
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
  async getProviderTypeMappings() {
    return await this.indexedDB.getProviderTypeMappings();
  }

  async getUnmappedProviderTypes() {
    return await this.indexedDB.getUnmappedProviderTypes();
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
  async getRegionMappings() {
    return await this.indexedDB.getRegionMappings();
  }

  async getUnmappedRegions() {
    return await this.indexedDB.getUnmappedRegions();
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
