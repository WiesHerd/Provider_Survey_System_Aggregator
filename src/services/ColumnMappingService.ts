import { LocalStorageService } from './StorageService';
import BackendService from './BackendService';
import { IColumnMapping, IColumnInfo, IAutoMappingConfig } from '../types/column';

export class ColumnMappingService {
  private readonly MAPPINGS_KEY = 'column_mappings';
  private readonly LEARNED_MAPPINGS_KEY = 'learned-column-mappings';
  private storage: LocalStorageService;

  constructor(storage: LocalStorageService) {
    this.storage = storage;
  }

  async createMapping(standardizedName: string, sourceColumns: IColumnInfo[]): Promise<IColumnMapping> {
    const payload = { standardizedName, sourceColumns };
    const res = await fetch('http://localhost:3001/api/mappings/column', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const saved = await res.json();
    return saved as IColumnMapping;
  }

  async getAllMappings(): Promise<IColumnMapping[]> {
    try {
      const res = await fetch('http://localhost:3001/api/mappings/column');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      return data as IColumnMapping[];
    } catch {
      return [];
    }
  }

  async deleteMapping(mappingId: string): Promise<void> {
    await fetch(`http://localhost:3001/api/mappings/column/${mappingId}`, { method: 'DELETE' });
  }

  async clearAllMappings(): Promise<void> {
    console.log('Clearing all column mappings from database...');
    const response = await fetch('http://localhost:3001/api/mappings/column', { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`Failed to clear mappings: ${response.status} ${response.statusText}`);
    }
    const result = await response.json();
    console.log('Clear all mappings result:', result);
  }

  private async saveMappings(_mappings: IColumnMapping[]): Promise<void> {}

  async autoMapColumns(config: IAutoMappingConfig): Promise<Array<{
    standardizedName: string;
    columns: IColumnInfo[];
    confidence: number;
  }>> {
    const unmappedColumns = await this.getUnmappedColumns();
    console.log('Auto-mapping columns:', unmappedColumns.map(c => c.name));
    
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

    console.log('Final auto-mapping suggestions:', suggestions.map(s => ({
      name: s.standardizedName,
      columns: s.columns.map(c => c.name),
      confidence: s.confidence
    })));

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateSimilarity(name1: string, name2: string, type1: string, type2: string, config: IAutoMappingConfig): number {
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

    // Consider data type if enabled
    if (config.includeDataTypeMatching) {
      const typeMatch = type1 === type2;
      similarity = typeMatch ? similarity : similarity * 0.8;
    }

    console.log(`Similarity calculation: "${name1}" vs "${name2}" = ${similarity}`);
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
    console.log('Current mappings count:', mappings.length);
    
    // Create a set of mapped column names by survey source
    const mappedColumns = new Set<string>();
    mappings.forEach(mapping => {
      mapping.sourceColumns.forEach(column => {
        // Use name + surveySource as the unique identifier
        const key = `${column.name}-${column.surveySource}`;
        mappedColumns.add(key);
        console.log('Mapped column key:', key);
      });
    });

    // Prefer backend source of truth so every uploaded survey appears
    const backend = (await import('./BackendService')).default.getInstance();
    const surveys = await backend.getAllSurveys();
    const columns: IColumnInfo[] = [];

    for (const survey of surveys as Array<any>) {
      const meta = await backend.getSurveyMeta(survey.id).catch(() => ({} as any));
      const headers: string[] = Array.isArray(meta?.columns) && meta.columns.length > 0
        ? meta.columns
        : [];
      headers.forEach((header: string, index: number) => {
        const columnName = String(header || '').trim();
        const surveySource = survey.type || survey.name || 'Unknown';
        const uniqueKey = `${columnName}-${surveySource}`;
        
        if (!mappedColumns.has(uniqueKey)) {
          columns.push({
            id: `${surveySource}-${columnName}-${index}`, // Use consistent ID based on source and name
            name: columnName,
            surveySource: surveySource,
            dataType: 'string'
          });
        } else {
          console.log('Column already mapped:', uniqueKey);
        }
      });
    }

    console.log('Total unmapped columns found:', columns.length);
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