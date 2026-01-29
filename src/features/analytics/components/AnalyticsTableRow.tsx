/**
 * Analytics Table Row Component
 * 
 * Individual data row for the analytics table with dynamic variable support.
 * Following enterprise patterns for component composition and reusability.
 */

import React, { memo } from 'react';
import { formatSpecialtyForDisplay, formatRegionForDisplay, formatProviderTypeForDisplay } from '../../../shared/utils/formatters';
import { sanitizeHtml } from '../../../shared/utils/sanitization';
import { logger } from '../../../shared/utils/logger';
import { 
  getVariableLightBackgroundColor,
  mapVariableNameToStandard,
  displayNameToNormalizedKey,
  normalizeVariableName
} from '../utils/variableFormatters';
import { VariableFormattingService } from '../services/variableFormattingService';
import { DynamicAggregatedData } from '../types/variables';

interface AnalyticsTableRowProps {
  row: any; // DynamicAggregatedData | AggregatedData
  selectedVariables: string[];
  index: number;
  formattingRules?: any[]; // User-defined formatting rules
  showSpecialty?: boolean; // Whether to show specialty column
  showSurveySource?: boolean; // Whether to show survey source column
  showRegion?: boolean; // Whether to show region column
  showProviderType?: boolean; // Whether to show provider type column
  specialty?: string; // Group specialty name
  surveySource?: string; // Group survey source
}

/**
 * AnalyticsTableRow component for individual data rows
 * 
 * @param row - Data row to display
 * @param selectedVariables - Selected variables for dynamic rendering
 * @param index - Row index for key
 */
export const AnalyticsTableRow: React.FC<AnalyticsTableRowProps> = memo(({
  row,
  selectedVariables,
  index,
  formattingRules = [],
  showSpecialty = true,
  showSurveySource = true,
  showRegion = true,
  showProviderType = true,
  specialty,
  surveySource
}) => {
  return (
    <tr key={`${row.surveySource}-${row.geographicRegion}-${index}`} className="hover:bg-gray-50">
      {/* Survey Data Columns - Conditionally rendered */}
      {showSpecialty && (
        <td 
          style={{ 
            position: 'static',
            left: 'auto',
            backgroundColor: 'white',
            borderRight: '1px solid #e0e0e0',
            zIndex: 'auto',
            padding: '8px',
            boxShadow: 'none',
            fontSize: '15px',
            width: 'auto',
            minWidth: '150px'
          }}
        >
          {specialty ? formatSpecialtyForDisplay(sanitizeHtml(specialty)) : formatSpecialtyForDisplay(sanitizeHtml(row.originalSpecialty))}
        </td>
      )}
      {showSurveySource && (
        <td 
          style={{ 
            position: 'static',
            left: 'auto',
            backgroundColor: 'white',
            borderRight: '1px solid #e0e0e0',
            zIndex: 'auto',
            padding: '8px',
            boxShadow: 'none',
            fontSize: '15px',
            width: 'auto',
            minWidth: '120px'
          }}
        >
          {sanitizeHtml(surveySource || row.surveySource)}
        </td>
      )}
      {showRegion && (
        <td 
          style={{ 
            position: 'static',
            left: 'auto',
            backgroundColor: 'white',
            borderRight: '1px solid #e0e0e0',
            zIndex: 'auto',
            padding: '8px',
            boxShadow: 'none',
            fontSize: '15px',
            width: 'auto',
            minWidth: '100px'
          }}
        >
          {formatRegionForDisplay(sanitizeHtml(row.geographicRegion))}
        </td>
      )}
      {showProviderType && (
        <td 
          style={{ 
            position: 'static',
            left: 'auto',
            backgroundColor: 'white',
            borderRight: '1px solid #e0e0e0',
            zIndex: 'auto',
            padding: '8px',
            boxShadow: 'none',
            fontSize: '15px',
            width: 'auto',
            minWidth: '120px'
          }}
        >
          {formatProviderTypeForDisplay(sanitizeHtml(row.providerType || 'Unknown'))}
        </td>
      )}
      
      {/* Dynamic Variable Columns */}
      {selectedVariables.map((varName, varIndex) => {
        // CRITICAL DEBUG: Log variable rendering for first few rows and specific variables
        if (index < 2 && (varName === 'base_salary' || varName === 'on_call_compensation' || varName.includes('base') || varName.includes('on_call'))) {
          logger.debug('🔍 AnalyticsTableRow: Rendering variable column:', {
            rowIndex: index,
            varIndex,
            varName,
            selectedVariablesCount: selectedVariables.length,
            allSelectedVariables: selectedVariables
          });
        }
        
        const dynamicRow = row as DynamicAggregatedData;
        const legacyRow = row as any; // Legacy data format
        const lightColor = getVariableLightBackgroundColor(varName, varIndex);
        
        // CRITICAL FIX: Handle both display names and normalized names
        // First, try to convert display name to normalized key (e.g., "Daily Rate On-Call Compensation" -> "on_call_compensation")
        // If that doesn't work, normalize the name and map to standard
        let normalizedVarName: string;
        const isDisplayName = varName.includes(' ') || varName.includes('-') || varName.includes('(');
        if (isDisplayName) {
          // Try reverse mapping from display name
          normalizedVarName = displayNameToNormalizedKey(varName);
        } else {
          // Already normalized, just map to standard
          normalizedVarName = mapVariableNameToStandard(normalizeVariableName(varName));
        }
        
        let metrics: any = null;
        
        // General debug logging for first few rows
        if (index < 3 && varName === 'Total Cash Compensation Per Work RVUs') {
          logger.debug('🔍 General Data Structure Debug:', {
            index,
            surveySource: legacyRow.surveySource,
            varName,
            normalizedVarName,
            hasVariables: !!dynamicRow.variables,
            variablesKeys: dynamicRow.variables ? Object.keys(dynamicRow.variables) : [],
            isLegacyFormat: !dynamicRow.variables,
            sampleLegacyFields: Object.keys(legacyRow).filter(key => key.includes('cf') || key.includes('tcc') || key.includes('per')).slice(0, 5)
          });
        }
        
        // Check if this is dynamic format (has variables property)
        if (dynamicRow.variables && typeof dynamicRow.variables === 'object') {
          // Dynamic format: use variables object directly
          metrics = dynamicRow.variables[normalizedVarName];
          
          // CRITICAL DEBUG: Log data lookup for base_salary and other variables that are failing
          // ENHANCED: Also log for SullivanCotter APP data to diagnose TCC issue
          const isSullivanCotterAPP = legacyRow.surveySource?.toLowerCase().includes('sullivan') && 
                                      (legacyRow.providerType === 'APP' || legacyRow.providerType === 'Nurse Practitioner');
          const shouldLog = index < 3 && (
            varName === 'base_salary' || 
            normalizedVarName === 'base_salary' || 
            !metrics || 
            (isSullivanCotterAPP && (varName.toLowerCase().includes('tcc') || varName.toLowerCase().includes('total cash')))
          );
          
          if (shouldLog) {
            logger.debug('🔍 AnalyticsTableRow: Variable Data Lookup:', {
              rowIndex: index,
              surveySource: legacyRow.surveySource,
              specialty: legacyRow.standardizedName || legacyRow.surveySpecialty,
              providerType: legacyRow.providerType,
              varName,
              normalizedVarName,
              isDisplayName,
              hasVariables: !!dynamicRow.variables,
              variablesObject: dynamicRow.variables,
              availableVariableKeys: dynamicRow.variables ? Object.keys(dynamicRow.variables) : [],
              lookingForKey: normalizedVarName,
              metricsFound: !!metrics,
              metrics: metrics ? {
                n_orgs: metrics.n_orgs,
                n_incumbents: metrics.n_incumbents,
                p25: metrics.p25,
                p50: metrics.p50,
                p75: metrics.p75,
                p90: metrics.p90
              } : null,
              allVariableKeys: dynamicRow.variables ? Object.keys(dynamicRow.variables).join(', ') : 'none',
              exactMatchFound: dynamicRow.variables ? dynamicRow.variables.hasOwnProperty(normalizedVarName) : false,
              isSullivanCotterAPP,
              // CRITICAL: Show all variable keys and their p50 values for SullivanCotter APP
              allVariablesWithValues: isSullivanCotterAPP && dynamicRow.variables ? 
                Object.entries(dynamicRow.variables).map(([key, val]: [string, any]) => ({
                  key,
                  p50: val?.p50 || 0,
                  hasData: val?.p50 > 0
                })) : []
            });
          }
          
          // CRITICAL FIX: If lookup failed, try alternative key variations for Call Pay
          if (!metrics && (normalizedVarName === 'on_call_compensation' || varName.toLowerCase().includes('on call') || varName.toLowerCase().includes('on-call'))) {
            // Try alternative key variations
            const alternativeKeys = [
              'oncall_compensation',
              'daily_rate_on_call',
              'daily_rate_oncall',
              'daily_rate_on_call_compensation',
              'on_call_rate',
              'oncall_rate'
            ];
            
            for (const altKey of alternativeKeys) {
              if (dynamicRow.variables[altKey]) {
                metrics = dynamicRow.variables[altKey];
                logger.debug(`✅ Found Call Pay variable with alternative key: ${altKey} (was looking for ${normalizedVarName})`);
                break;
              }
            }
          }
          
          // CRITICAL FIX: If lookup failed for TCC, try alternative key variations
          // This handles cases where variable names don't normalize correctly (e.g., SullivanCotter APP)
          if (!metrics && (normalizedVarName === 'tcc' || varName.toLowerCase().includes('tcc') || varName.toLowerCase().includes('total cash'))) {
            // Try alternative key variations for TCC
            const tccAlternativeKeys = [
              'total_cash_compensation',
              'total_compensation',
              'total_cash_comp',
              'cash_compensation',
              'total_comp',
              'tcc', // Try exact match again
              'compensation' // Last resort
            ];
            
            for (const altKey of tccAlternativeKeys) {
              if (dynamicRow.variables[altKey] && dynamicRow.variables[altKey].p50 > 0) {
                metrics = dynamicRow.variables[altKey];
                logger.debug(`✅ Found TCC variable with alternative key: ${altKey} (was looking for ${normalizedVarName})`, {
                  surveySource: legacyRow.surveySource,
                  metrics: {
                    p50: metrics.p50,
                    p25: metrics.p25,
                    p75: metrics.p75,
                    p90: metrics.p90
                  }
                });
                break;
              }
            }
            
            // ENTERPRISE FIX: If still no match, try fuzzy matching on all available variables
            // This handles cases where variable names are completely different (e.g., "Compensation" instead of "TCC")
            if (!metrics && dynamicRow.variables) {
              const allVariableKeys = Object.keys(dynamicRow.variables);
              // Look for any variable that might be TCC based on name similarity
              for (const key of allVariableKeys) {
                const keyLower = key.toLowerCase();
                const varMetrics = dynamicRow.variables[key];
                // Check if this variable name suggests it's TCC and has data
                if (varMetrics && varMetrics.p50 > 0 && (
                  keyLower.includes('tcc') ||
                  keyLower.includes('total') && (keyLower.includes('cash') || keyLower.includes('comp')) ||
                  keyLower === 'compensation' ||
                  (keyLower.includes('comp') && !keyLower.includes('per') && !keyLower.includes('rvu'))
                )) {
                  metrics = varMetrics;
                  logger.debug(`✅ Found TCC variable via fuzzy match: ${key} (was looking for ${normalizedVarName})`, {
                    surveySource: legacyRow.surveySource,
                    specialty: legacyRow.standardizedName || legacyRow.surveySpecialty,
                    allAvailableKeys: allVariableKeys,
                    selectedKey: key,
                    metrics: {
                      p50: metrics.p50,
                      p25: metrics.p25,
                      p75: metrics.p75,
                      p90: metrics.p90
                    }
                  });
                  break;
                }
              }
            }
          }
          
          // ENTERPRISE DEBUG: Comprehensive logging for Call Pay variables
          const isCallPayVariable = normalizedVarName === 'on_call_compensation' || 
                                    normalizedVarName.includes('on_call') || 
                                    normalizedVarName.includes('oncall') ||
                                    varName.toLowerCase().includes('on call') ||
                                    varName.toLowerCase().includes('on-call');
          const isCallPaySurvey = (legacyRow.surveySource?.toLowerCase().includes('call pay')) ||
                                  (legacyRow as any).dataCategory === 'CALL_PAY' ||
                                  legacyRow.providerType === 'CALL';
          
          if (isCallPayVariable || (isCallPaySurvey && isCallPayVariable)) {
            logger.debug('🔍 AnalyticsTableRow: Call Pay Variable Lookup:', {
              index,
              surveySource: legacyRow.surveySource,
              specialty: legacyRow.standardizedName || legacyRow.surveySpecialty,
              dataCategory: (legacyRow as any).dataCategory,
              providerType: legacyRow.providerType,
              varName,
              normalizedVarName,
              isDisplayName,
              hasVariables: !!dynamicRow.variables,
              availableVariableKeys: dynamicRow.variables ? Object.keys(dynamicRow.variables) : [],
              metricsFound: !!metrics,
              metrics: metrics ? {
                n_orgs: metrics.n_orgs,
                n_incumbents: metrics.n_incumbents,
                p50: metrics.p50
              } : null,
              allVariableKeys: dynamicRow.variables ? Object.keys(dynamicRow.variables).join(', ') : 'none'
            });
          }
          
          // Debug logging for dynamic format
          if (varName === 'Total Cash Compensation Per Work RVUs' && (legacyRow.surveySource?.toLowerCase().includes('mgma') || legacyRow.surveySource?.toLowerCase().includes('sullivan') || legacyRow.surveySource?.toLowerCase().includes('gallagher'))) {
            logger.debug('🔍 Dynamic Format TCC per Work RVU Debug:', {
              surveySource: legacyRow.surveySource,
              varName,
              normalizedVarName,
              hasVariables: !!dynamicRow.variables,
              variablesKeys: dynamicRow.variables ? Object.keys(dynamicRow.variables) : [],
              metrics,
              allFields: Object.keys(legacyRow).filter(key => key.includes('cf') || key.includes('tcc') || key.includes('per')).slice(0, 10)
            });
          }
        } else {
          // Legacy format: use expanded field mapping
          const legacyFieldMap: Record<string, string> = {
            'tcc': 'tcc',
            'work_rvus': 'wrvu',
            'wrvu': 'wrvu',
            'cf': 'cf',
            'conversion_factor': 'cf',
            'tcc_per_work_rvu': 'cf',
            'cfs': 'cf',  // Map 'cfs' to 'cf' for legacy data
            'tcc_per_work_rvus': 'cf',
            // FIXED: Add support for new variables
            'base_salary': 'base_salary',
            'base_compensation': 'base_salary',
            'salary': 'base_salary',
            'panel_size': 'panel_size',
            'total_encounters': 'total_encounters',
            'encounters': 'total_encounters',
            'asa_units': 'asa_units',
            'asa': 'asa_units',
            'net_collections': 'net_collections',
            'collections': 'net_collections',
            // On-Call Compensation support
            'on_call_compensation': 'on_call',
            'oncall_compensation': 'on_call',
            'daily_rate_on_call': 'on_call',
            'on_call': 'on_call',
            'oncall': 'on_call'
          };
          
          const legacyPrefix = legacyFieldMap[varName] || varName;
          const nOrgs = legacyRow[`${legacyPrefix}_n_orgs`] || 0;
          const nIncumbents = legacyRow[`${legacyPrefix}_n_incumbents`] || 0;
          const p25 = legacyRow[`${legacyPrefix}_p25`] || 0;
          const p50 = legacyRow[`${legacyPrefix}_p50`] || 0;
          const p75 = legacyRow[`${legacyPrefix}_p75`] || 0;
          const p90 = legacyRow[`${legacyPrefix}_p90`] || 0;
          
          // Debug logging for TCC per Work RVU data
          if (varName === 'Total Cash Compensation Per Work RVUs' && (legacyRow.surveySource?.toLowerCase().includes('mgma') || legacyRow.surveySource?.toLowerCase().includes('sullivan') || legacyRow.surveySource?.toLowerCase().includes('gallagher'))) {
            logger.debug('🔍 TCC per Work RVU Debug:', {
              surveySource: legacyRow.surveySource,
              varName,
              normalizedVarName,
              legacyPrefix,
              nOrgs,
              nIncumbents,
              p25,
              p50,
              p75,
              p90,
              allFields: Object.keys(legacyRow).filter(key => key.includes('cf') || key.includes('tcc') || key.includes('per')).slice(0, 10)
            });
          }
          
          if (p50 > 0) {
            metrics = {
              variableName: varName,
              n_orgs: nOrgs,
              n_incumbents: nIncumbents,
              p25: p25,
              p50: p50,
              p75: p75,
              p90: p90
            };
          }
        }
        
        return metrics ? (
          <React.Fragment key={varName}>
            <td style={{ backgroundColor: '#F8F9FA', textAlign: 'right', padding: '8px', fontSize: '15px' }}>{metrics.n_orgs.toLocaleString()}</td>
            <td style={{ backgroundColor: '#F8F9FA', textAlign: 'right', padding: '8px', fontSize: '15px', borderRight: '1px solid #E5E7EB' }}>{metrics.n_incumbents.toLocaleString()}</td>
            <td style={{ backgroundColor: 'white', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
              {VariableFormattingService.getInstance().formatVariableValue(metrics.p25, varName, { rules: formattingRules })}
            </td>
            <td style={{ backgroundColor: 'white', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
              {VariableFormattingService.getInstance().formatVariableValue(metrics.p50, varName, { rules: formattingRules })}
            </td>
            <td style={{ backgroundColor: 'white', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
              {VariableFormattingService.getInstance().formatVariableValue(metrics.p75, varName, { rules: formattingRules })}
            </td>
            <td style={{ backgroundColor: 'white', borderRight: '1px solid #E0E0E0', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
              {VariableFormattingService.getInstance().formatVariableValue(metrics.p90, varName, { rules: formattingRules })}
            </td>
          </React.Fragment>
        ) : (
          <React.Fragment key={varName}>
            <td style={{ backgroundColor: '#F8F9FA', textAlign: 'right', color: '#9ca3af', padding: '8px', fontSize: '15px' }}>
              ***
            </td>
            <td style={{ backgroundColor: '#F8F9FA', textAlign: 'right', color: '#9ca3af', padding: '8px', fontSize: '15px', borderRight: '1px solid #E5E7EB' }}>
              ***
            </td>
            <td style={{ backgroundColor: '#F8F9FA', textAlign: 'right', color: '#9ca3af', padding: '8px', fontSize: '15px' }}>
              ***
            </td>
            <td style={{ backgroundColor: '#F8F9FA', textAlign: 'right', color: '#9ca3af', padding: '8px', fontSize: '15px' }}>
              ***
            </td>
            <td style={{ backgroundColor: '#F8F9FA', textAlign: 'right', color: '#9ca3af', padding: '8px', fontSize: '15px' }}>
              ***
            </td>
            <td style={{ backgroundColor: '#F8F9FA', textAlign: 'right', color: '#9ca3af', padding: '8px', fontSize: '15px', borderRight: '1px solid #E0E0E0' }}>
              ***
            </td>
          </React.Fragment>
        );
      })}
    </tr>
  );
});

AnalyticsTableRow.displayName = 'AnalyticsTableRow';
