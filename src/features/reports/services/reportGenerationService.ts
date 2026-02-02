/**
 * Report Generation Service
 * 
 * Generates TCC, wRVU, and CF reports with filtering and blending support
 * Uses the same data fetching approach as benchmarking screen for consistency
 * Attempts to use cached data from TanStack Query when available
 */

import { AnalyticsDataService } from '../../analytics/services/analyticsDataService';
import { getDataService } from '../../../services/DataService';
import { DynamicAggregatedData } from '../../analytics/types/variables';
import { ISpecialtyMapping } from '../../../types/specialty';
import {
  ReportConfig,
  ReportData,
  ReportDataRow,
  ReportMetric,
  ReportGenerationOptions,
  BlendBreakdownItem,
  BlendingMethod
} from '../types/reports';
import {
  blendSpecialtyData,
  groupRowsBySpecialty,
  groupRowsBySpecialtyAndRegion,
  groupRowsBySpecialtyAndProviderType,
  groupRowsBySpecialtyRegionAndProviderType,
  groupRowsBySpecialtyProviderTypeSourceAndYear,
  groupRowsBySpecialtyRegionProviderTypeSourceAndYear,
  groupRowsBySpecialtyProviderTypeAndBaseSource,
  groupRowsBySpecialtyRegionProviderTypeAndBaseSource,
  isSpecialtyMapped
} from '../utils/reportBlendingUtils';
import { queryClient, queryKeys } from '../../../shared/services/queryClient';
import { formatSpecialtyForDisplay, formatRegionForDisplay, formatProviderTypeForDisplay } from '../../../shared/utils/formatters';

/**
 * Generate Total Cash Compensation report
 */
export async function generateTCCReport(config: ReportConfig): Promise<ReportData> {
  return generateReport(config, 'tcc');
}

/**
 * Generate Work RVUs report
 */
export async function generateWRVUReport(config: ReportConfig): Promise<ReportData> {
  return generateReport(config, 'wrvu');
}

/**
 * Generate Conversion Factors report
 */
export async function generateCFReport(config: ReportConfig): Promise<ReportData> {
  return generateReport(config, 'cf');
}

/**
 * Main report generation function
 */
async function generateReport(
  config: ReportConfig,
  metric: ReportMetric
): Promise<ReportData> {
  try {
    console.log('🔍 Report Generation: Starting report generation for metric:', metric);
    
    const dataService = getDataService();
    let allData: DynamicAggregatedData[] = [];

    // Try to get cached data from TanStack Query first (same as benchmarking screen)
    const queryKey = queryKeys.benchmarking({
      year: '',
      specialty: '',
      providerType: '',
      region: '',
      surveySource: ''
    });

    const cachedData = queryClient.getQueryData<{ data: DynamicAggregatedData[] }>(queryKey);
    
    if (cachedData && cachedData.data && cachedData.data.length > 0) {
      console.log('✅ Report Generation: Using cached data from query client:', cachedData.data.length, 'rows');
      allData = cachedData.data;
    } else {
      console.log('🔍 Report Generation: No cached data found, fetching from analytics service...');
      
      // Fetch analytics data - use same approach as benchmarking screen
      const analyticsService = new AnalyticsDataService();
      
      // Get all data (we'll filter in memory)
      // Use empty array to get ALL variables (same as benchmarking screen)
      allData = await analyticsService.getAnalyticsDataByVariables(
        {
          specialty: '',
          surveySource: '',
          geographicRegion: '',
          providerType: '',
          year: ''
        },
        [] // Get all variables - empty array means process all
      );

      console.log('🔍 Report Generation: Fetched', allData.length, 'total rows from analytics service');
    }

    if (allData.length === 0) {
      console.warn('⚠️ Report Generation: No data available from analytics service');
      return {
        config,
        rows: [],
        metadata: {
          generatedAt: new Date(),
          totalRows: 0,
          blendedRows: 0,
          unmappedRows: 0
        }
      };
    }

    // Get specialty mappings to detect mapped specialties
    const mappings = await dataService.getAllSpecialtyMappings();
    console.log('🔍 Report Generation: Loaded', mappings.length, 'specialty mappings');

    // Apply filters
    let filteredData = applyFilters(allData, config);
    console.log('🔍 Report Generation: After filtering:', filteredData.length, 'rows');
    console.log('🔍 Report Generation: Filter config:', {
      providerType: config.selectedProviderType,
      surveySource: config.selectedSurveySource,
      region: config.selectedRegion,
      year: config.selectedYear,
      metric
    });
    
    // ENTERPRISE FIX: Verify that filtered data only contains selected provider types
    if (config.selectedProviderType.length > 0) {
      const uniqueProviderTypesInFiltered = Array.from(new Set(
        filteredData.map(row => (row.providerType || '').trim().toUpperCase())
      )).sort();
      const selectedProviderTypesUpper = config.selectedProviderType.map(pt => pt.trim().toUpperCase()).sort();
      
      console.log(`🔍 Report Generation: Selected provider types:`, selectedProviderTypesUpper);
      console.log(`🔍 Report Generation: Provider types in filtered data:`, uniqueProviderTypesInFiltered);
      
      // Check for any provider types that shouldn't be there
      const unexpectedTypes = uniqueProviderTypesInFiltered.filter(pt => 
        !selectedProviderTypesUpper.some(selected => {
          // Handle special case: "PHYSICIAN" matches both "PHYSICIAN" and "STAFF PHYSICIAN"
          if (selected === 'PHYSICIAN') {
            return pt === 'PHYSICIAN' || pt === 'STAFF PHYSICIAN';
          }
          return pt === selected;
        })
      );
      
      if (unexpectedTypes.length > 0) {
        console.error(`❌ Report Generation: CRITICAL - Filtered data contains unexpected provider types!`, unexpectedTypes);
        console.error(`❌ Report Generation: This indicates the filter is not working correctly.`);
      } else {
        console.log(`✅ Report Generation: Filter verification passed - all provider types match selection`);
      }
    }
    
    // Debug: Show sample of filtered data
    if (filteredData.length > 0) {
      console.log('🔍 Report Generation: Sample filtered row:', {
        specialty: filteredData[0].standardizedName,
        region: filteredData[0].geographicRegion,
        providerType: filteredData[0].providerType,
        surveySource: filteredData[0].surveySource,
        year: filteredData[0].surveyYear,
        variables: Object.keys(filteredData[0].variables)
      });
    } else {
      console.warn('⚠️ Report Generation: No data after filtering. Sample of all data:', {
        totalRows: allData.length,
        sampleRow: allData[0] ? {
          specialty: allData[0].standardizedName,
          region: allData[0].geographicRegion,
          providerType: allData[0].providerType,
          surveySource: allData[0].surveySource,
          year: allData[0].surveyYear
        } : 'No data available'
      });
    }

    if (filteredData.length === 0) {
      console.warn('⚠️ Report Generation: No data after filtering');
      return {
        config,
        rows: [],
        metadata: {
          generatedAt: new Date(),
          totalRows: 0,
          blendedRows: 0,
          unmappedRows: 0
        }
      };
    }

    // When blendYears is on and 2+ years selected, group by base survey source (no year) so we can blend across years
    const useYearBlend = !!(config.blendYears && config.selectedYear.length >= 2);
    const displayYearBlended = useYearBlend && config.selectedYear.length >= 2
      ? config.selectedYear.slice().sort().join('-')
      : undefined;

    // Group by specialty, region, provider type, survey source, and year (or base source when blending years)
    const uniqueProviderTypesBeforeGrouping = Array.from(new Set(
      filteredData.map(row => (row.providerType || '').trim().toUpperCase())
    )).sort();
    console.log(`🔍 Report Generation: Provider types before grouping:`, uniqueProviderTypesBeforeGrouping);

    const groupedData = useYearBlend
      ? (config.selectedRegion && config.selectedRegion.length > 0
          ? groupRowsBySpecialtyProviderTypeAndBaseSource(filteredData)
          : groupRowsBySpecialtyRegionProviderTypeAndBaseSource(filteredData))
      : (config.selectedRegion && config.selectedRegion.length > 0
          ? groupRowsBySpecialtyProviderTypeSourceAndYear(filteredData)
          : groupRowsBySpecialtyRegionProviderTypeSourceAndYear(filteredData));
    console.log('🔍 Report Generation: Grouped into', groupedData.size, 'groups', useYearBlend ? '(year-blend)' : '');
    
    // ENTERPRISE FIX: Log sample group keys to verify provider types are in group keys
    const sampleGroupKeys = Array.from(groupedData.keys()).slice(0, 5);
    console.log(`🔍 Report Generation: Sample group keys (first 5):`, sampleGroupKeys);

    // Generate report rows
    const rows: ReportDataRow[] = [];
    let blendedRows = 0;
    let unmappedRows = 0;

    groupedData.forEach((specialtyRows, groupKey) => {
      // Extract dimensions from group key (format depends on useYearBlend and region filter)
      const parts = groupKey.split('|');
      const standardizedName = parts[0];
      let region: string | undefined;
      let providerType: string;
      let surveySource: string;
      let year: string | undefined;

      if (useYearBlend) {
        // Year-blend keys: "specialty|providerType|baseSource" (3) or "specialty|region|providerType|baseSource" (4)
        if (config.selectedRegion && config.selectedRegion.length > 0) {
          providerType = parts[1];
          surveySource = parts[2];
          region = undefined;
        } else {
          region = parts[1];
          providerType = parts[2];
          surveySource = parts[3];
        }
        year = displayYearBlended;
      } else {
        // Standard keys: "specialty|providerType|surveySource|year" (4) or "specialty|region|providerType|surveySource|year" (5)
        region = config.selectedRegion && config.selectedRegion.length > 0 ? undefined : parts[1];
        providerType = config.selectedRegion && config.selectedRegion.length > 0 ? parts[1] : parts[2];
        surveySource = config.selectedRegion && config.selectedRegion.length > 0 ? parts[2] : parts[3];
        year = config.selectedRegion && config.selectedRegion.length > 0 ? parts[3] : parts[4];
      }
      
      // ENTERPRISE FIX: Log provider type from group key to verify it matches filter
      if (groupedData.size < 10 || Array.from(groupedData.keys()).indexOf(groupKey) < 5) {
        console.log(`🔍 Report Generation: Group key "${groupKey}" -> providerType: "${providerType}"`);
        console.log(`🔍 Report Generation: Actual provider types in group:`, Array.from(new Set(
          specialtyRows.map(row => (row.providerType || '').trim().toUpperCase())
        )));
      }
      
      // ENTERPRISE FIX: Format specialty name for consistent display
      const displaySpecialty = formatSpecialtyForDisplay(standardizedName);
      // ENTERPRISE FIX: When multiple regions selected, show specific region for each row (not combined)
      // When single region selected, show that region. When no region filter, show row's region.
      const displayRegion: string = config.selectedRegion.length > 0
        ? (config.selectedRegion.length === 1 
            ? config.selectedRegion[0] 
            : (region || specialtyRows[0]?.geographicRegion ? formatRegionForDisplay(region || specialtyRows[0].geographicRegion) : 'All Regions'))
        : (region || specialtyRows[0]?.geographicRegion ? formatRegionForDisplay(region || specialtyRows[0].geographicRegion) : 'All Regions');

      const isMapped = isSpecialtyMapped(standardizedName, mappings);
      const shouldBlendThisGroup = useYearBlend
        ? specialtyRows.length >= 1
        : (config.enableBlending && isMapped && specialtyRows.length > 1);
      const blendMethodForGroup = useYearBlend && config.blendingMethod === 'none' ? 'weighted' : config.blendingMethod;

      if (shouldBlendThisGroup) {
        const blended = blendSpecialtyData(
          specialtyRows,
          blendMethodForGroup,
          metric,
          config.selectedPercentiles
        );

        if (blended) {
          const displayYear = useYearBlend
            ? displayYearBlended
            : (() => {
                const years = specialtyRows.map(r => r.surveyYear).filter((y): y is string => Boolean(y));
                const uniqueYears = Array.from(new Set(years));
                return uniqueYears.length === 1 ? uniqueYears[0] : uniqueYears.length > 1 ? 'Multiple' : undefined;
              })();
          
          // ENTERPRISE FIX: Always use the actual row's provider type for display, not the group key
          // For blended rows, use the first row's provider type (all rows in group should have same type)
          const displayProviderType = specialtyRows[0].providerType 
            ? formatProviderTypeForDisplay(specialtyRows[0].providerType) 
            : (providerType && providerType !== 'Unknown'
                ? formatProviderTypeForDisplay(providerType)
                : undefined);
          
          // Log if there's a mismatch between group key and row data
          if (providerType && providerType !== 'Unknown' && specialtyRows[0].providerType && 
              providerType.toUpperCase() !== specialtyRows[0].providerType.toUpperCase()) {
            console.warn(`⚠️ Report Generation: Provider type mismatch in blended row - group key: "${providerType}", row data: "${specialtyRows[0].providerType}"`);
          }
          
          // Verify all rows in group have same provider type
          const uniqueProviderTypes = Array.from(new Set(
            specialtyRows.map(r => (r.providerType || '').trim().toUpperCase())
          ));
          if (uniqueProviderTypes.length > 1) {
            console.error(`❌ Report Generation: CRITICAL - Blended group has multiple provider types! Group key: "${groupKey}", Provider types:`, uniqueProviderTypes);
          }

          const variableKeyForBreakdown = getVariableKeyForMetric(specialtyRows[0], metric);
          const totalN = variableKeyForBreakdown
            ? specialtyRows.reduce((sum, r) => sum + (r.variables[variableKeyForBreakdown]?.n_incumbents || 0), 0)
            : 0;
          const keyForWeights = variableKeyForBreakdown;
          const weightsForBreakdown =
            keyForWeights && blendMethodForGroup === 'weighted' && totalN > 0
              ? specialtyRows.map(r => (r.variables[keyForWeights]?.n_incumbents || 0) / totalN)
              : specialtyRows.map(() => 1 / specialtyRows.length);
          const blendBreakdown: BlendBreakdownItem[] = specialtyRows.map((row, i) => {
            const m = variableKeyForBreakdown ? row.variables[variableKeyForBreakdown] : undefined;
            return {
              year: row.surveyYear || 'Unknown',
              surveySource: row.surveySource || 'Unknown',
              n_incumbents: m?.n_incumbents || 0,
              n_orgs: m?.n_orgs,
              p25: config.selectedPercentiles.includes('p25') ? m?.p25 : undefined,
              p50: config.selectedPercentiles.includes('p50') ? m?.p50 : undefined,
              p75: config.selectedPercentiles.includes('p75') ? m?.p75 : undefined,
              p90: config.selectedPercentiles.includes('p90') ? m?.p90 : undefined,
              weight: weightsForBreakdown[i] ?? 0
            };
          });

          rows.push({
            specialty: displaySpecialty,
            region: displayRegion,
            providerType: displayProviderType,
            // ENTERPRISE FIX: When blending is enabled, show "Blended" to indicate data is combined
            // When multiple survey sources selected but not blended, show specific source
            surveySource: config.selectedSurveySource.length > 0
              ? (config.enableBlending ? 'Blended' : (surveySource && surveySource !== 'Unknown' ? surveySource : specialtyRows[0]?.surveySource))
              : undefined,
            surveyYear: config.selectedYear.length > 0 ? displayYear : undefined,
            p25: config.selectedPercentiles.includes('p25') ? blended.p25 : undefined,
            p50: config.selectedPercentiles.includes('p50') ? blended.p50 : undefined,
            p75: config.selectedPercentiles.includes('p75') ? blended.p75 : undefined,
            p90: config.selectedPercentiles.includes('p90') ? blended.p90 : undefined,
            n_orgs: blended.n_orgs,
            n_incumbents: blended.n_incumbents,
            isBlended: true,
            blendBreakdown,
            blendMethod: blendMethodForGroup as BlendingMethod
          });
          blendedRows++;
        }
      } else {
        // Show individual rows (no blending or unmapped specialty)
        // If there are multiple rows in the group, aggregate them (they should have same grouping dimensions)
        // Otherwise, show the single row
        if (specialtyRows.length === 1) {
          // Single row - show as-is
          const row = specialtyRows[0];
          const variableKey = getVariableKeyForMetric(row, metric);
          if (variableKey && row.variables[variableKey]) {
            const metrics = row.variables[variableKey];
            // Only add row if it has valid data (at least one percentile > 0 or n_orgs > 0)
            const hasValidData = 
              (metrics.p50 > 0 || metrics.p25 > 0 || metrics.p75 > 0 || metrics.p90 > 0) ||
              (metrics.n_orgs > 0 || metrics.n_incumbents > 0);
            
            if (hasValidData) {
              // ENTERPRISE FIX: Format region for display - show specific region for each row when multiple selected
              const rowRegion: string = config.selectedRegion.length > 0
                ? (config.selectedRegion.length === 1 
                    ? config.selectedRegion[0] 
                    : formatRegionForDisplay(row.geographicRegion)) // Show specific region, not combined
                : formatRegionForDisplay(row.geographicRegion);
              
              // ENTERPRISE FIX: Always use the actual row's provider type for display, not the group key
              // The group key might be normalized or incorrect, but the row data has the true provider type
              const displayProviderType = row.providerType 
                ? formatProviderTypeForDisplay(row.providerType) 
                : (providerType && providerType !== 'Unknown'
                    ? formatProviderTypeForDisplay(providerType)
                    : undefined);
              
              // ENTERPRISE FIX: Verify the row's provider type matches the selected filter
              if (config.selectedProviderType.length > 0 && row.providerType) {
                const rowProviderTypeUpper = (row.providerType || '').trim().toUpperCase();
                const matchesFilter = config.selectedProviderType.some(selectedPt => {
                  const selectedUpper = selectedPt.trim().toUpperCase();
                  if (selectedUpper === 'PHYSICIAN') {
                    return rowProviderTypeUpper === 'PHYSICIAN' || rowProviderTypeUpper === 'STAFF PHYSICIAN';
                  }
                  return rowProviderTypeUpper === selectedUpper;
                });
                
                if (!matchesFilter) {
                  console.error(`❌ Report Generation: CRITICAL - Row has provider type "${row.providerType}" but filter selected "${config.selectedProviderType.join(', ')}"`);
                  console.error(`❌ Report Generation: This row should have been filtered out! Row details:`, {
                    specialty: row.standardizedName,
                    providerType: row.providerType,
                    region: row.geographicRegion,
                    surveySource: row.surveySource
                  });
                }
              }
              
              // Log if there's a mismatch between group key and row data
              if (providerType && providerType !== 'Unknown' && row.providerType && 
                  providerType.toUpperCase() !== row.providerType.toUpperCase()) {
                console.warn(`⚠️ Report Generation: Provider type mismatch - group key: "${providerType}", row data: "${row.providerType}"`);
              }
              
              rows.push({
                specialty: displaySpecialty,
                region: rowRegion,
                providerType: displayProviderType,
                // ENTERPRISE FIX: Always show survey source when filter is applied (even if single selection)
                surveySource: config.selectedSurveySource.length > 0 
                  ? (surveySource && surveySource !== 'Unknown' ? surveySource : row.surveySource) 
                  : undefined,
                surveyYear: year && year !== 'Unknown' ? year : (row.surveyYear || undefined),
                p25: config.selectedPercentiles.includes('p25') ? metrics.p25 : undefined,
                p50: config.selectedPercentiles.includes('p50') ? metrics.p50 : undefined,
                p75: config.selectedPercentiles.includes('p75') ? metrics.p75 : undefined,
                p90: config.selectedPercentiles.includes('p90') ? metrics.p90 : undefined,
                n_orgs: metrics.n_orgs,
                n_incumbents: metrics.n_incumbents,
                isBlended: false
              });
              unmappedRows++;
            }
          } else {
            console.warn(`⚠️ Report Generation: No variable key found for metric ${metric} in row:`, {
              specialty: standardizedName,
              surveySource: row.surveySource,
              availableVariables: Object.keys(row.variables)
            });
          }
        } else {
          // Multiple rows in group - aggregate them (weighted by incumbents)
          // This handles cases where there might be multiple data categories or other subtle differences
          const variableKey = getVariableKeyForMetric(specialtyRows[0], metric);
          if (variableKey) {
            // Aggregate metrics across all rows in the group
            let totalIncumbents = 0;
            let totalOrgs = 0;
            const aggregatedMetrics: { p25: number; p50: number; p75: number; p90: number } = {
              p25: 0,
              p50: 0,
              p75: 0,
              p90: 0
            };
            
            // First pass: calculate totals
            specialtyRows.forEach(row => {
              const metrics = row.variables[variableKey];
              if (metrics) {
                totalIncumbents += metrics.n_incumbents || 0;
                totalOrgs += metrics.n_orgs || 0;
              }
            });
            
            // Second pass: calculate weighted averages
            specialtyRows.forEach(row => {
              const metrics = row.variables[variableKey];
              if (metrics && totalIncumbents > 0) {
                const incumbents = metrics.n_incumbents || 0;
                const weight = incumbents / totalIncumbents;
                aggregatedMetrics.p25 += (metrics.p25 || 0) * weight;
                aggregatedMetrics.p50 += (metrics.p50 || 0) * weight;
                aggregatedMetrics.p75 += (metrics.p75 || 0) * weight;
                aggregatedMetrics.p90 += (metrics.p90 || 0) * weight;
              }
            });
            
            // Only add row if it has valid data
            const hasValidData = 
              (aggregatedMetrics.p50 > 0 || aggregatedMetrics.p25 > 0 || aggregatedMetrics.p75 > 0 || aggregatedMetrics.p90 > 0) ||
              (totalOrgs > 0 || totalIncumbents > 0);
            
            if (hasValidData) {
              // ENTERPRISE FIX: Format region for display - show specific region for each row when multiple selected
              const rowRegion: string = config.selectedRegion.length > 0
                ? (config.selectedRegion.length === 1 
                    ? config.selectedRegion[0] 
                    : formatRegionForDisplay(specialtyRows[0].geographicRegion)) // Show specific region, not combined
                : formatRegionForDisplay(specialtyRows[0].geographicRegion);
              
              // ENTERPRISE FIX: Always use the actual row's provider type for display, not the group key
              // For aggregated rows, use the first row's provider type (all rows in group should have same type)
              const displayProviderType = specialtyRows[0].providerType 
                ? formatProviderTypeForDisplay(specialtyRows[0].providerType) 
                : (providerType && providerType !== 'Unknown'
                    ? formatProviderTypeForDisplay(providerType)
                    : undefined);
              
              // Log if there's a mismatch between group key and row data
              if (providerType && providerType !== 'Unknown' && specialtyRows[0].providerType && 
                  providerType.toUpperCase() !== specialtyRows[0].providerType.toUpperCase()) {
                console.warn(`⚠️ Report Generation: Provider type mismatch in aggregated row - group key: "${providerType}", row data: "${specialtyRows[0].providerType}"`);
              }
              
              // Verify all rows in group have same provider type
              const uniqueProviderTypes = Array.from(new Set(
                specialtyRows.map(r => (r.providerType || '').trim().toUpperCase())
              ));
              if (uniqueProviderTypes.length > 1) {
                console.error(`❌ Report Generation: CRITICAL - Group has multiple provider types! Group key: "${groupKey}", Provider types:`, uniqueProviderTypes);
              }
              
              rows.push({
                specialty: displaySpecialty,
                region: rowRegion,
                providerType: displayProviderType,
                // ENTERPRISE FIX: Always show survey source when filter is applied (even if single selection)
                surveySource: config.selectedSurveySource.length > 0 
                  ? (surveySource && surveySource !== 'Unknown' ? surveySource : specialtyRows[0].surveySource) 
                  : undefined,
                surveyYear: year && year !== 'Unknown' ? year : (specialtyRows[0].surveyYear || undefined),
                p25: config.selectedPercentiles.includes('p25') ? aggregatedMetrics.p25 : undefined,
                p50: config.selectedPercentiles.includes('p50') ? aggregatedMetrics.p50 : undefined,
                p75: config.selectedPercentiles.includes('p75') ? aggregatedMetrics.p75 : undefined,
                p90: config.selectedPercentiles.includes('p90') ? aggregatedMetrics.p90 : undefined,
                n_orgs: totalOrgs,
                n_incumbents: totalIncumbents,
                isBlended: false
              });
              unmappedRows++;
            }
          }
        }
      }
    });

    // Sort rows by specialty name, then by region
    rows.sort((a, b) => {
      const specialtyCompare = a.specialty.localeCompare(b.specialty);
      if (specialtyCompare !== 0) return specialtyCompare;
      return (a.region || '').localeCompare(b.region || '');
    });

    return {
      config,
      rows,
      metadata: {
        generatedAt: new Date(),
        totalRows: rows.length,
        blendedRows,
        unmappedRows
      }
    };
  } catch (error) {
    console.error('❌ Report Generation: Error generating report:', error);
    console.error('❌ Report Generation: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ Report Generation: Error details:', {
      metric,
      config,
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    throw new Error(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Format region name for matching (normalize display format to actual data format)
 * ENTERPRISE FIX: Handle "Eastern" and other region variations consistently
 */
function normalizeRegionForMatching(displayRegion: string, actualRegion: string): boolean {
  if (!actualRegion) return false;
  
  const displayLower = displayRegion.toLowerCase().trim();
  const actualLower = actualRegion.toLowerCase().trim();
  
  // Direct match
  if (displayLower === actualLower) return true;
  
  // Normalize both to standard region names for comparison
  const normalizeForMatching = (region: string): string => {
    const lower = region.toLowerCase().trim();
    if (lower === 'eastern' || lower.includes('eastern')) return 'northeast';
    if (lower.includes('northeast') || lower.includes('northeastern') || lower === 'ne') return 'northeast';
    if (lower.includes('southeast') || lower.includes('southern') || lower.includes('south') || lower === 'se') return 'south';
    if (lower.includes('midwest') || lower.includes('midwestern') || lower.includes('north central') || lower === 'nc') return 'midwest';
    if (lower.includes('west') || lower.includes('western')) return 'west';
    if (lower.includes('national') || lower === 'all') return 'national';
    return lower; // Return as-is for unknown regions
  };
  
  const normalizedDisplay = normalizeForMatching(displayRegion);
  const normalizedActual = normalizeForMatching(actualRegion);
  
  // Match normalized values
  if (normalizedDisplay === normalizedActual) return true;
  
  // Also check if actual region contains display region or vice versa (for edge cases)
  if (actualLower.includes(displayLower) || displayLower.includes(actualLower)) {
    console.log(`🔍 Report Generation: Region partial match: display="${displayRegion}" (normalized: "${normalizedDisplay}"), actual="${actualRegion}" (normalized: "${normalizedActual}")`);
    return true;
  }
  
  // Log mismatches for debugging (only log first few to avoid console spam)
  console.log(`🔍 Report Generation: Region mismatch: display="${displayRegion}" (normalized: "${normalizedDisplay}"), actual="${actualRegion}" (normalized: "${normalizedActual}")`);
  
  return false;
}

/**
 * Apply filters to data based on config
 */
function applyFilters(
  data: DynamicAggregatedData[],
  config: ReportConfig
): DynamicAggregatedData[] {
  let filtered = [...data];
  const initialCount = filtered.length;

  // Filter by provider type if selected (multi-select)
  // ENTERPRISE FIX: Strict exact matching - only match the exact provider type selected
  if (config.selectedProviderType.length > 0) {
    const beforeCount = filtered.length;
    
    // Log unique provider types in data before filtering (for debugging)
    const uniqueProviderTypesBefore = Array.from(new Set(
      filtered.map(row => (row.providerType || '').trim().toUpperCase())
    )).sort();
    console.log(`🔍 Report Generation: Provider types in data before filtering:`, uniqueProviderTypesBefore);
    console.log(`🔍 Report Generation: Selected provider types:`, config.selectedProviderType.map(pt => pt.trim().toUpperCase()));
    
    filtered = filtered.filter(row => {
      const rowProviderType = (row.providerType || '').trim().toUpperCase();
      const matches = config.selectedProviderType.some(selectedPt => {
        const selectedProviderType = selectedPt.trim().toUpperCase();
        
        // ENTERPRISE FIX: Strict exact match only - no substring matching
        // Handle special case: "PHYSICIAN" can match both "PHYSICIAN" and "STAFF PHYSICIAN"
        // But "STAFF PHYSICIAN" should ONLY match "STAFF PHYSICIAN", not other roles
        if (selectedProviderType === 'PHYSICIAN') {
          // Only match exact "PHYSICIAN" or "STAFF PHYSICIAN", not leadership roles
          return rowProviderType === 'PHYSICIAN' || rowProviderType === 'STAFF PHYSICIAN';
        }
        
        // For all other provider types, require exact match
        // This ensures "STAFF PHYSICIAN" doesn't match "CHIEF (SECOND-LEVEL PHYSICIAN LEADER)" etc.
        return rowProviderType === selectedProviderType;
      });
      
      // Log mismatches for first few rows to help debug
      if (!matches && beforeCount < 20) {
        console.log(`🔍 Report Generation: Provider type mismatch - row: "${rowProviderType}", selected: [${config.selectedProviderType.map(pt => pt.trim().toUpperCase()).join(', ')}]`);
      }
      
      return matches;
    });
    
    // Log unique provider types after filtering
    const uniqueProviderTypesAfter = Array.from(new Set(
      filtered.map(row => (row.providerType || '').trim().toUpperCase())
    )).sort();
    console.log(`🔍 Report Generation: Provider types in data after filtering:`, uniqueProviderTypesAfter);
    console.log(`🔍 Report Generation: Provider type filter (${config.selectedProviderType.join(', ')}): ${beforeCount} -> ${filtered.length}`);
  }

  // Filter by specialty if selected (multi-select) – e.g. Cardiology, Family Medicine
  const selectedSpecialty = config.selectedSpecialty ?? [];
  if (selectedSpecialty.length > 0) {
    const beforeCount = filtered.length;
    filtered = filtered.filter(row => {
      const rowSpecialty = (row.standardizedName || row.surveySpecialty || '').trim();
      return selectedSpecialty.some(selected =>
        rowSpecialty.toLowerCase() === selected.trim().toLowerCase()
      );
    });
    console.log(`🔍 Report Generation: Specialty filter (${selectedSpecialty.join(', ')}): ${beforeCount} -> ${filtered.length}`);
  }

  // Filter by survey source if selected (multi-select)
  if (config.selectedSurveySource.length > 0) {
    const beforeCount = filtered.length;
    filtered = filtered.filter(row => {
      const rowSource = (row.surveySource || '').trim();
      return config.selectedSurveySource.some(selectedSource => 
        rowSource.toLowerCase() === selectedSource.trim().toLowerCase()
      );
    });
    console.log(`🔍 Report Generation: Survey source filter (${config.selectedSurveySource.join(', ')}): ${beforeCount} -> ${filtered.length}`);
  }

  // Filter by region if selected (multi-select)
  if (config.selectedRegion.length > 0) {
    const beforeCount = filtered.length;
    filtered = filtered.filter(row => {
      return config.selectedRegion.some(selectedRegion => {
        const matches = normalizeRegionForMatching(selectedRegion, row.geographicRegion || '');
        if (!matches && filtered.length < 10) {
          // Log first few mismatches for debugging
          console.log(`🔍 Region mismatch: display="${selectedRegion}", actual="${row.geographicRegion}"`);
        }
        return matches;
      });
    });
    console.log(`🔍 Report Generation: Region filter (${config.selectedRegion.join(', ')}): ${beforeCount} -> ${filtered.length}`);
  }

  // Filter by year if selected (multi-select)
  if (config.selectedYear.length > 0) {
    const beforeCount = filtered.length;
    filtered = filtered.filter(row => {
      const rowYear = String(row.surveyYear || '').trim();
      return config.selectedYear.some(selectedYear => rowYear === selectedYear.trim());
    });
    console.log(`🔍 Report Generation: Year filter (${config.selectedYear.join(', ')}): ${beforeCount} -> ${filtered.length}`);
  }

  console.log(`🔍 Report Generation: Total filtering: ${initialCount} -> ${filtered.length} rows`);
  return filtered;
}

/**
 * Get variable key for a metric from a data row
 * Handles various naming conventions for TCC, wRVU, and CF
 */
function getVariableKeyForMetric(
  row: DynamicAggregatedData,
  metric: ReportMetric
): string | undefined {
  const variableKeys = Object.keys(row.variables);
  if (variableKeys.length === 0) return undefined;

  // Define possible variable name patterns for each metric
  const patterns: Record<ReportMetric, string[]> = {
    tcc: ['tcc', 'total_cash_compensation', 'total_compensation', 'total_cash_comp', 'cash_compensation'],
    wrvu: ['wrvu', 'wrvus', 'work_rvu', 'work_rvus', 'work_relative_value_units'],
    cf: ['cf', 'cfs', 'conversion_factor', 'tcc_per_work_rvu', 'tcc_per_work_rvus', 'tcc_per_wrvu', 
         'compensation_to_work_rvu', 'compensation_to_work_rvus', 'comp_to_work_rvu']
  };

  const searchPatterns = patterns[metric];

  // Try exact match first (case-insensitive)
  for (const pattern of searchPatterns) {
    const exactMatch = variableKeys.find(k => 
      k.toLowerCase() === pattern.toLowerCase()
    );
    if (exactMatch) return exactMatch;
  }

  // Try partial match (contains)
  for (const pattern of searchPatterns) {
    const partialMatch = variableKeys.find(k => 
      k.toLowerCase().includes(pattern.toLowerCase()) || 
      pattern.toLowerCase().includes(k.toLowerCase())
    );
    if (partialMatch) return partialMatch;
  }

  // Last resort: find any key that starts with the metric prefix
  const metricPrefix = metric === 'tcc' ? 'tcc' : metric === 'wrvu' ? 'wrvu' : 'cf';
  return variableKeys.find(k => 
    k.toLowerCase().startsWith(metricPrefix.toLowerCase())
  );
}

