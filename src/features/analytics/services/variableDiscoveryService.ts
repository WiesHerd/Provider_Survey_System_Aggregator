/**
 * Analytics Feature - Variable Discovery Service
 * 
 * Enterprise service for automatically discovering all compensation variables
 * across all surveys. Pattern-based detection with NO hardcoded variable names.
 * Fully dynamic and future-proof for any survey structure.
 */

import { getDataService } from '../../../services/DataService';
import { 
  DiscoveredVariable, 
  VariableDiscoveryResult, 
  VariableCategory 
} from '../types/variables';
import { 
  normalizeVariableName, 
  detectVariableCategory 
} from '../utils/variableFormatters';

/**
 * Enterprise Variable Discovery Service
 * Automatically discovers all compensation variables across all surveys
 * Pattern-based detection - NO hardcoded variable names
 */
export class VariableDiscoveryService {
  private static instance: VariableDiscoveryService;
  private dataService = getDataService();
  private cache: DiscoveredVariable[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  
  static getInstance(): VariableDiscoveryService {
    if (!VariableDiscoveryService.instance) {
      VariableDiscoveryService.instance = new VariableDiscoveryService();
    }
    return VariableDiscoveryService.instance;
  }
  
  /**
   * Discover all variables across all surveys
   * Cached for performance with automatic refresh
   */
  async discoverAllVariables(): Promise<DiscoveredVariable[]> {
    const now = Date.now();
    
    // Return cached data if still fresh
    if (this.cache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cache;
    }
    
    console.log('🔍 VariableDiscoveryService: Starting variable discovery...');
    const startTime = performance.now();
    
    try {
      const surveys = await this.dataService.getAllSurveys();
      const variableMap = new Map<string, DiscoveredVariable>();
      
      // Process surveys in parallel for better performance
      const surveyPromises = surveys.map(survey => 
        this.processSurveyForVariables(survey, variableMap)
      );
      
      await Promise.all(surveyPromises);
      
      // Convert map to array and sort by category, then name
      this.cache = Array.from(variableMap.values()).sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
      });
      
      this.cacheTimestamp = now;
      
      const duration = performance.now() - startTime;
      console.log(`✅ VariableDiscoveryService: Discovered ${this.cache.length} variables in ${duration.toFixed(2)}ms`);
      
      return this.cache;
      
    } catch (error) {
      console.error('❌ VariableDiscoveryService: Error discovering variables:', error);
      throw error;
    }
  }
  
  /**
   * Process a single survey for variable discovery
   */
  private async processSurveyForVariables(
    survey: any, 
    variableMap: Map<string, DiscoveredVariable>
  ): Promise<void> {
    try {
      const surveyData = await this.dataService.getSurveyData(survey.id, {}, { limit: 100 });
      
      if (surveyData.rows.length === 0) {
        return;
      }
      
      // Extract from LONG format (variable field)
      this.extractLongFormatVariables(surveyData.rows, survey, variableMap);
      
      // Extract from WIDE format (column patterns: *_p25, *_p50, etc.)
      this.extractWideFormatVariables(surveyData.rows, survey, variableMap);
      
    } catch (error) {
      console.warn(`⚠️ VariableDiscoveryService: Failed to process survey ${survey.id}:`, error);
    }
  }
  
  /**
   * Extract variables from LONG format (variable field)
   */
  private extractLongFormatVariables(
    rows: any[], 
    survey: any, 
    variableMap: Map<string, DiscoveredVariable>
  ): void {
    const variableSet = new Set<string>();
    
    rows.forEach(row => {
      const actualRowData = row.data || row;
      const variable = actualRowData.variable || actualRowData.Variable || actualRowData['Variable Name'];
      if (variable && typeof variable === 'string') {
        variableSet.add(variable.trim());
      }
    });
    
    variableSet.forEach(varName => {
      const normalized = normalizeVariableName(varName);
      const recordCount = rows.filter(r => {
        const data = r.data || r;
        return data.variable === varName;
      }).length;
      
      if (!variableMap.has(normalized)) {
        variableMap.set(normalized, {
          name: varName,
          normalizedName: normalized,
          category: detectVariableCategory(varName),
          availableSources: [survey.type],
          recordCount,
          firstSeen: new Date(),
          dataQuality: this.calculateDataQuality(rows, varName),
          format: 'long'
        });
      } else {
        // Merge with existing
        const existing = variableMap.get(normalized)!;
        if (!existing.availableSources.includes(survey.type)) {
          existing.availableSources.push(survey.type);
        }
        existing.recordCount += recordCount;
      }
    });
  }
  
  /**
   * Extract variables from WIDE format (column patterns: *_p25, *_p50, etc.)
   */
  private extractWideFormatVariables(
    rows: any[], 
    survey: any, 
    variableMap: Map<string, DiscoveredVariable>
  ): void {
    if (rows.length === 0) return;
    
    const firstRow = rows[0];
    const actualRowData = firstRow.data || firstRow;
    const columns = Object.keys(actualRowData);
    const pattern = /^(.+)_p(25|50|75|90)$/i;
    const baseNames = new Set<string>();
    
    columns.forEach(col => {
      const match = col.match(pattern);
      if (match) {
        baseNames.add(match[1].toLowerCase());
      }
    });
    
    baseNames.forEach(baseName => {
      if (!variableMap.has(baseName)) {
        variableMap.set(baseName, {
          name: this.formatDisplayName(baseName),
          normalizedName: baseName,
          category: detectVariableCategory(baseName),
          availableSources: [survey.type],
          recordCount: rows.length,
          firstSeen: new Date(),
          dataQuality: this.calculateWideFormatQuality(rows, baseName),
          format: 'wide'
        });
      } else {
        // Merge with existing
        const existing = variableMap.get(baseName)!;
        if (!existing.availableSources.includes(survey.type)) {
          existing.availableSources.push(survey.type);
        }
        existing.recordCount += rows.length;
      }
    });
  }
  
  /**
   * Calculate data quality for LONG format variables
   */
  private calculateDataQuality(rows: any[], variableName: string): number {
    const variableRows = rows.filter(r => {
      const data = r.data || r;
      return data.variable === variableName;
    });
    
    if (variableRows.length === 0) return 0;
    
    const nonZeroRows = variableRows.filter(r => {
      const data = r.data || r;
      return this.extractNumber(data.p50) > 0;
    });
    
    return nonZeroRows.length / variableRows.length;
  }
  
  /**
   * Calculate data quality for WIDE format variables
   */
  private calculateWideFormatQuality(rows: any[], baseName: string): number {
    if (rows.length === 0) return 0;
    
    const nonZeroRows = rows.filter(r => {
      const data = r.data || r;
      return this.extractNumber(data[`${baseName}_p50`]) > 0;
    });
    
    return nonZeroRows.length / rows.length;
  }
  
  /**
   * Extract number from various formats
   */
  private extractNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      if (value === '***' || value === '' || value === 'null' || value === 'undefined') return 0;
      const parsed = parseFloat(value.replace(/[,$]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    if (value === null || value === undefined) return 0;
    return 0;
  }
  
  /**
   * Format display name from normalized name
   */
  private formatDisplayName(normalizedName: string): string {
    // Handle common patterns
    const displayMap: Record<string, string> = {
      'tcc': 'TCC',
      'work_rvus': 'Work RVUs',
      'work_rvu': 'Work RVUs',
      'wrvu': 'Work RVUs',
      'tcc_per_work_rvu': 'TCC per Work RVU',
      'cf': 'Conversion Factor',
      'base_salary': 'Base Salary',
      'asa_units': 'ASA Units',
      'panel_size': 'Panel Size',
      'total_encounters': 'Total Encounters'
    };
    
    if (displayMap[normalizedName]) {
      return displayMap[normalizedName];
    }
    
    // Pattern-based formatting
    return normalizedName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * Get variables by category
   */
  async getVariablesByCategory(): Promise<Record<VariableCategory, DiscoveredVariable[]>> {
    const variables = await this.discoverAllVariables();
    const groups: Record<VariableCategory, DiscoveredVariable[]> = {
      compensation: [],
      productivity: [],
      ratio: [],
      other: []
    };
    
    variables.forEach(variable => {
      groups[variable.category].push(variable);
    });
    
    return groups;
  }
  
  /**
   * Get variable availability for a specific specialty
   */
  async getVariableAvailability(specialty: string): Promise<Record<string, string[]>> {
    const variables = await this.discoverAllVariables();
    const availability: Record<string, string[]> = {};
    
    variables.forEach(variable => {
      availability[variable.normalizedName] = variable.availableSources;
    });
    
    return availability;
  }
  
  /**
   * Clear cache - call after new survey upload
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
    console.log('🔄 VariableDiscoveryService: Cache cleared');
  }
  
  /**
   * Force refresh cache
   */
  async refreshCache(): Promise<DiscoveredVariable[]> {
    this.clearCache();
    return await this.discoverAllVariables();
  }
  
  /**
   * Get discovery statistics
   */
  async getDiscoveryStats(): Promise<VariableDiscoveryResult> {
    const startTime = performance.now();
    const variables = await this.discoverAllVariables();
    const discoveryTime = performance.now() - startTime;
    
    const surveys = await this.dataService.getAllSurveys();
    const totalRecords = variables.reduce((sum, v) => sum + v.recordCount, 0);
    
    return {
      variables,
      totalSurveys: surveys.length,
      totalRecords,
      discoveryTime
    };
  }
}
