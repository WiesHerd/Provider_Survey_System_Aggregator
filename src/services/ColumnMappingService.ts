import { LocalStorageService } from './StorageService';
import { IColumnMapping, IColumnInfo, IAutoMappingConfig } from '../types/column';

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

  async autoMapColumns(config: IAutoMappingConfig): Promise<Array<{
    standardizedName: string;
    columns: IColumnInfo[];
    confidence: number;
  }>> {
    const unmappedColumns = await this.getUnmappedColumns();
    const suggestions: Array<{
      standardizedName: string;
      columns: IColumnInfo[];
      confidence: number;
    }> = [];

    // Group columns by similarity
    const processedColumns = new Set<string>();
    
    for (const column of unmappedColumns) {
      if (processedColumns.has(column.id)) continue;

      const matches = unmappedColumns
        .filter((c: IColumnInfo) => !processedColumns.has(c.id))
        .map((c: IColumnInfo) => ({
          column: c,
          similarity: this.calculateSimilarity(column.name, c.name, c.dataType, column.dataType, config)
        }))
        .filter(match => match.similarity >= config.confidenceThreshold)
        .sort((a, b) => b.similarity - a.similarity);

      if (matches.length > 0) {
        const matchedColumns = matches.map(m => m.column);
        matchedColumns.forEach(c => processedColumns.add(c.id));

        suggestions.push({
          standardizedName: this.generateStandardizedName(matchedColumns),
          columns: matchedColumns,
          confidence: matches[0].similarity
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateSimilarity(name1: string, name2: string, type1: string, type2: string, config: IAutoMappingConfig): number {
    // Normalize names
    const normalized1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalized2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    let similarity = 1 - distance / maxLength;

    // Consider data type if enabled
    if (config.includeDataTypeMatching) {
      const typeMatch = type1 === type2;
      similarity = typeMatch ? similarity : similarity * 0.8;
    }

    return similarity;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // deletion
            dp[i][j - 1],     // insertion
            dp[i - 1][j - 1]  // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  private generateStandardizedName(columns: IColumnInfo[]): string {
    // Use the shortest name as the base for standardization
    const shortestName = columns
      .map(c => c.name)
      .reduce((a, b) => a.length <= b.length ? a : b);

    // Clean up the name
    return shortestName
      .replace(/[^a-zA-Z0-9\s]/g, ' ')  // Replace special chars with space
      .replace(/\s+/g, ' ')             // Replace multiple spaces with single space
      .trim();
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