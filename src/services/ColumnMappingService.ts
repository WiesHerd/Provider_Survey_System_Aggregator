import { LocalStorageService } from './StorageService';
import { IColumnMapping, IColumnInfo } from '../types/column';

export class ColumnMappingService {
  private readonly MAPPINGS_KEY = 'column_mappings';
  private readonly LEARNED_MAPPINGS_KEY = 'learned-column-mappings';
  private storage: LocalStorageService;

  constructor(storage: LocalStorageService) {
    this.storage = storage;
  }

  async createMapping(standardizedName: string, sourceColumns: IColumnInfo[]): Promise<IColumnMapping> {
    const mapping: IColumnMapping = {
      id: crypto.randomUUID(),
      standardizedName,
      sourceColumns,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mappings = await this.getAllMappings();
    await this.saveMappings([...mappings, mapping]);
    return mapping;
  }

  async getAllMappings(): Promise<IColumnMapping[]> {
    try {
      const result = await this.storage.getItem(this.MAPPINGS_KEY);
      return result || [];
    } catch {
      return [];
    }
  }

  async deleteMapping(mappingId: string): Promise<void> {
    const mappings = await this.getAllMappings();
    const filteredMappings = mappings.filter(m => m.id !== mappingId);
    await this.saveMappings(filteredMappings);
  }

  async clearAllMappings(): Promise<void> {
    await this.saveMappings([]);
    await this.storage.setItem(this.LEARNED_MAPPINGS_KEY, {});
  }

  private async saveMappings(mappings: IColumnMapping[]): Promise<void> {
    await this.storage.setItem(this.MAPPINGS_KEY, mappings);
  }

  async autoMapColumns(confidenceThreshold: number = 0.8): Promise<IColumnMapping[]> {
    const unmappedColumns = await this.getUnmappedColumns();
    const existingMappings = await this.getAllMappings();
    const newMappings: IColumnMapping[] = [];

    // Group similar columns by name similarity and data type
    const groups = this.groupSimilarColumns(unmappedColumns);

    for (const group of groups) {
      if (group.length > 1) {
        const standardizedName = this.suggestStandardizedName(group);
        const mapping = await this.createMapping(standardizedName, group);
        newMappings.push(mapping);
      }
    }

    return newMappings;
  }

  private groupSimilarColumns(columns: IColumnInfo[]): IColumnInfo[][] {
    const groups: IColumnInfo[][] = [];
    const used = new Set<string>();

    for (const column of columns) {
      if (used.has(column.id)) continue;

      const group = [column];
      used.add(column.id);

      // Find similar columns
      for (const other of columns) {
        if (used.has(other.id)) continue;
        if (this.calculateColumnSimilarity(column, other) >= 0.8) {
          group.push(other);
          used.add(other.id);
        }
      }

      if (group.length > 0) {
        groups.push(group);
      }
    }

    return groups;
  }

  private calculateColumnSimilarity(col1: IColumnInfo, col2: IColumnInfo): number {
    // Don't match columns with different data types
    if (col1.dataType !== col2.dataType) return 0;

    const name1 = col1.name.toLowerCase();
    const name2 = col2.name.toLowerCase();

    // Exact match
    if (name1 === name2) return 1;

    // Calculate string similarity
    const maxLength = Math.max(name1.length, name2.length);
    let matches = 0;
    
    for (let i = 0; i < Math.min(name1.length, name2.length); i++) {
      if (name1[i] === name2[i]) matches++;
    }

    return matches / maxLength;
  }

  private suggestStandardizedName(columns: IColumnInfo[]): string {
    // Use the shortest name as it's likely to be the most concise
    return columns.reduce((shortest, current) => 
      current.name.length < shortest.length ? current.name : shortest
    , columns[0].name);
  }

  async getUnmappedColumns(): Promise<IColumnInfo[]> {
    const mappings = await this.getAllMappings();
    const mappedColumnIds = new Set(
      mappings.flatMap(m => m.sourceColumns.map(c => c.id))
    );

    const surveys = await this.storage.listSurveys();
    const columns: IColumnInfo[] = [];
    
    for (const survey of surveys) {
      if (!survey.metadata.fileContent) continue;

      const headers = survey.metadata.fileContent.split('\n')[0].split(',');
      headers.forEach((header: string, index: number) => {
        const columnId = `${survey.metadata.surveyType}-${index}`;
        if (!mappedColumnIds.has(columnId)) {
          columns.push({
            id: columnId,
            name: header.trim(),
            surveySource: survey.metadata.surveyType,
            dataType: this.inferDataType(survey.metadata.fileContent, index)
          });
        }
      });
    }

    return columns;
  }

  private inferDataType(fileContent: string, columnIndex: number): string {
    const lines = fileContent.split('\n').slice(1, 6); // Check first 5 rows
    const values = lines.map(line => line.split(',')[columnIndex]?.trim());
    
    // Check if all values are numbers
    if (values.every(v => !isNaN(Number(v)))) {
      return 'number';
    }
    // Check if all values match date format
    if (values.every(v => !isNaN(Date.parse(v)))) {
      return 'date';
    }
    // Default to string
    return 'string';
  }
} 