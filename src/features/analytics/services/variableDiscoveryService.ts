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
  detectVariableCategory,
  mapVariableNameToStandard 
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
   * 
   * @param dataCategory - Optional filter to only discover variables from surveys matching this data category
   *                       Values: 'CALL_PAY', 'COMPENSATION', 'MOONLIGHTING', 'CUSTOM', or undefined for all
   */
  async discoverAllVariables(dataCategory?: string): Promise<DiscoveredVariable[]> {
    const now = Date.now();
    
    // Return cached data if still fresh (but only if no dataCategory filter is applied)
    // CRITICAL FIX: Don't use cache when filtering by dataCategory as cache is for all variables
    if (!dataCategory && this.cache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cache;
    }
    
    console.log('🔍 VariableDiscoveryService: Starting variable discovery...', dataCategory ? `(filtered by: ${dataCategory})` : '(all categories)');
    const startTime = performance.now();
    
    try {
      let surveys = await this.dataService.getAllSurveys();
      console.log('🔍 VariableDiscoveryService: Found', surveys.length, 'surveys (before filtering)');
      
      // CRITICAL FIX: Filter surveys by dataCategory if provided
      if (dataCategory) {
        const normalizedCategory = dataCategory === 'Call Pay' ? 'CALL_PAY'
          : dataCategory === 'Moonlighting' ? 'MOONLIGHTING'
          : dataCategory === 'Compensation' ? 'COMPENSATION'
          : dataCategory === 'Custom' ? 'CUSTOM'
          : dataCategory; // Use as-is if already in internal format
        
        surveys = surveys.filter(survey => {
          const surveyDataCategory = (survey as any).dataCategory;
          // Also check old surveys that might have providerType='CALL' for backward compatibility
          const matchesCategory = surveyDataCategory === normalizedCategory ||
            (normalizedCategory === 'CALL_PAY' && survey.providerType === 'CALL' && !surveyDataCategory);
          return matchesCategory;
        });
        console.log('🔍 VariableDiscoveryService: After dataCategory filtering:', surveys.length, 'surveys');
      }
      
      // DEBUG: Log Call Pay surveys specifically
      const callPaySurveys = surveys.filter(s => s.providerType === 'CALL' || (s.name && s.name.toLowerCase().includes('call pay')));
      console.log('🔍 VariableDiscoveryService: Call Pay surveys found:', callPaySurveys.length);
      callPaySurveys.forEach(survey => {
        console.log('🔍 VariableDiscoveryService: Call Pay survey:', {
          id: survey.id,
          name: survey.name,
          type: survey.type,
          providerType: survey.providerType
        });
      });
      
      const variableMap = new Map<string, DiscoveredVariable>();
      
      // Process surveys in parallel for better performance
      const surveyPromises = surveys.map(survey => 
        this.processSurveyForVariables(survey, variableMap)
      );
      
      await Promise.all(surveyPromises);
      
      // DEBUG: Check for on_call_compensation variable after discovery
      const onCallVars = Array.from(variableMap.values()).filter(v => 
        v.normalizedName.includes('on_call') || 
        v.normalizedName.includes('oncall') ||
        v.name.toLowerCase().includes('on call') ||
        v.name.toLowerCase().includes('oncall')
      );
      if (onCallVars.length > 0) {
        console.log('✅ VariableDiscoveryService: Found on-call compensation variables:', onCallVars.map(v => ({
          name: v.name,
          normalizedName: v.normalizedName,
          sources: v.availableSources,
          recordCount: v.recordCount
        })));
      } else {
        console.warn('⚠️ VariableDiscoveryService: NO on-call compensation variables found after processing all surveys');
      }
      
      // Convert map to array and sort by category, then name
      this.cache = Array.from(variableMap.values()).sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.normalizedName.localeCompare(b.normalizedName);
      });
      
      this.cacheTimestamp = now;
      
      const duration = performance.now() - startTime;
      console.log(`✅ VariableDiscoveryService: Discovered ${this.cache.length} variables in ${duration.toFixed(2)}ms`);
      console.log('🔍 VariableDiscoveryService: Discovered variables:', this.cache.map(v => v.normalizedName));
      
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
      // DEBUG: Log Call Pay survey processing
      const isCallPaySurvey = survey.providerType === 'CALL' || (survey.name && survey.name.toLowerCase().includes('call pay'));
      if (isCallPaySurvey) {
        console.log('🔍 VariableDiscoveryService: Processing Call Pay survey:', {
          id: survey.id,
          name: survey.name,
          type: survey.type,
          providerType: survey.providerType
        });
      }
      
      const surveyData = await this.dataService.getSurveyData(survey.id, {}, { limit: 100 });
      
      if (surveyData.rows.length === 0) {
        if (isCallPaySurvey) {
          console.warn('⚠️ VariableDiscoveryService: Call Pay survey has no data rows:', survey.id);
        }
        return;
      }
      
      if (isCallPaySurvey) {
        const firstRow = surveyData.rows[0];
        const firstRowData = firstRow?.data || firstRow;
        const firstRowVariable = firstRowData && typeof firstRowData === 'object' && 'variable' in firstRowData 
          ? (firstRowData as any).variable 
          : 'No variable field';
        console.log('🔍 VariableDiscoveryService: Call Pay survey data loaded:', {
          surveyId: survey.id,
          rowCount: surveyData.rows.length,
          firstRowVariables: firstRowVariable,
          columns: firstRowData && typeof firstRowData === 'object' ? Object.keys(firstRowData).slice(0, 10) : []
        });
      }
      
      // Extract from LONG format (variable field)
      this.extractLongFormatVariables(surveyData.rows, survey, variableMap);
      
      // Extract from WIDE format (column patterns: *_p25, *_p50, etc.)
      this.extractWideFormatVariables(surveyData.rows, survey, variableMap);
      
      if (isCallPaySurvey) {
        console.log('✅ VariableDiscoveryService: Finished processing Call Pay survey:', survey.id);
      }
      
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
    const isCallPaySurvey = survey.providerType === 'CALL' || (survey.name && survey.name.toLowerCase().includes('call pay'));
    const variableSet = new Set<string>();
    
    rows.forEach(row => {
      const actualRowData = row.data || row;
      const variable = actualRowData.variable || actualRowData.Variable || actualRowData['Variable Name'];
      if (variable && typeof variable === 'string') {
        variableSet.add(variable.trim());
        
        // DEBUG: Log on-call related variables from Call Pay surveys
        if (isCallPaySurvey) {
          const lowerVar = variable.toLowerCase();
          if (lowerVar.includes('on') && (lowerVar.includes('call') || lowerVar.includes('oncall'))) {
            console.log('🔍 VariableDiscoveryService: Found on-call variable in Call Pay survey:', {
              surveyId: survey.id,
              surveyName: survey.name,
              variableName: variable,
              normalized: normalizeVariableName(variable)
            });
          }
        }
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
        
        // DEBUG: Log when on-call variable is added to map
        if (isCallPaySurvey && (normalized.includes('on_call') || normalized.includes('oncall'))) {
          console.log('✅ VariableDiscoveryService: Added on-call variable to map:', {
            name: varName,
            normalizedName: normalized,
            recordCount,
            surveySource: survey.type
          });
        }
      } else {
        // Merge with existing
        const existing = variableMap.get(normalized)!;
        if (!existing.availableSources.includes(survey.type)) {
          existing.availableSources.push(survey.type);
        }
        existing.recordCount += recordCount;
        
        // DEBUG: Log when on-call variable is merged
        if (isCallPaySurvey && (normalized.includes('on_call') || normalized.includes('oncall'))) {
          console.log('✅ VariableDiscoveryService: Merged on-call variable with existing:', {
            name: varName,
            normalizedName: normalized,
            totalRecordCount: existing.recordCount,
            allSources: existing.availableSources
          });
        }
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
    const baseNameMap = new Map<string, string>(); // Maps normalized name to original base name for data lookup
    
    console.log(`🔍 VariableDiscoveryService: Processing ${survey.type} survey - ${columns.length} columns`);
    
    // Log all columns for debugging
    const matchingColumns: string[] = [];
    const nonMatchingColumns: string[] = [];
    
    columns.forEach(col => {
      const match = col.match(pattern);
      if (match) {
        matchingColumns.push(col);
        const rawBaseName = match[1];
        // CRITICAL: Normalize the base name to handle variations like "ASA" -> "asa_units"
        const normalizedBaseName = normalizeVariableName(rawBaseName);
        
        // DEBUG: Log ASA-related columns
        if (rawBaseName.toLowerCase().includes('asa') || normalizedBaseName.includes('asa')) {
          console.log(`🔍 VariableDiscoveryService: Found ASA-related column: "${col}"`);
          console.log(`   → Raw base name: "${rawBaseName}"`);
          console.log(`   → Normalized: "${normalizedBaseName}"`);
        }
        
        // Store mapping from normalized name to raw base name (preserve original case for column lookup)
        if (!baseNameMap.has(normalizedBaseName)) {
          baseNameMap.set(normalizedBaseName, rawBaseName); // Keep original case for accurate column matching
        }
      } else {
        nonMatchingColumns.push(col);
      }
    });
    
    if (matchingColumns.length > 0) {
      console.log(`🔍 VariableDiscoveryService: ${matchingColumns.length} columns match percentile pattern`);
    }
    
    if (survey.type === 'SullivanCotter') {
      const asaColumns = columns.filter(col => col.toLowerCase().includes('asa'));
      if (asaColumns.length > 0) {
        console.log(`🔍 VariableDiscoveryService: Found ${asaColumns.length} ASA-related columns in Sullivan Cotter:`);
        asaColumns.forEach(col => {
          const match = col.match(pattern);
          if (match) {
            const normalized = normalizeVariableName(match[1]);
            console.log(`   ✅ "${col}" → normalized: "${normalized}"`);
          } else {
            console.log(`   ⚠️ "${col}" → does NOT match pattern *_p25/p50/p75/p90`);
          }
        });
      }
    }
    
    baseNameMap.forEach((rawBaseName, normalizedBaseName) => {
      if (!variableMap.has(normalizedBaseName)) {
        variableMap.set(normalizedBaseName, {
          name: this.formatDisplayName(normalizedBaseName),
          normalizedName: normalizedBaseName,
          category: detectVariableCategory(normalizedBaseName),
          availableSources: [survey.type],
          recordCount: rows.length,
          firstSeen: new Date(),
          dataQuality: this.calculateWideFormatQuality(rows, rawBaseName),
          format: 'wide'
        });
      } else {
        // Merge with existing
        const existing = variableMap.get(normalizedBaseName)!;
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
    // First, ensure we have the standardized name
    const standardizedName = mapVariableNameToStandard(normalizedName);
    
    // Handle common patterns with standardized names
    const displayMap: Record<string, string> = {
      'tcc': 'TCC',
      'work_rvus': 'Work RVUs',
      'work_rvu': 'Work RVUs',
      'wrvu': 'Work RVUs',
      'tcc_per_work_rvu': 'CFs',
      'cf': 'CFs',
      'base_salary': 'Base Salary',
      'asa_units': 'ASA Units',
      'panel_size': 'Panel Size',
      'total_encounters': 'Total Encounters',
      'on_call_compensation': 'Daily Rate On-Call Compensation',
      'oncall_compensation': 'Daily Rate On-Call Compensation',
      'daily_rate_on_call': 'Daily Rate On-Call Compensation'
    };
    
    if (displayMap[standardizedName]) {
      return displayMap[standardizedName];
    }
    
    // Pattern-based formatting
    return standardizedName
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
