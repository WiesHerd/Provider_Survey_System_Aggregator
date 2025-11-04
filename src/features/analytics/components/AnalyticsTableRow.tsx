/**
 * Analytics Table Row Component
 * 
 * Individual data row for the analytics table with dynamic variable support.
 * Following enterprise patterns for component composition and reusability.
 */

import React, { memo } from 'react';
import { formatSpecialtyForDisplay, formatRegionForDisplay, formatProviderTypeForDisplay } from '../../../shared/utils/formatters';
import { 
  getVariableLightBackgroundColor,
  mapVariableNameToStandard
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
          {specialty ? formatSpecialtyForDisplay(specialty) : formatSpecialtyForDisplay(row.originalSpecialty)}
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
          {surveySource || row.surveySource}
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
          {formatRegionForDisplay(row.geographicRegion)}
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
          {formatProviderTypeForDisplay(row.providerType || 'Unknown')}
        </td>
      )}
      
      {/* Dynamic Variable Columns */}
      {selectedVariables.map((varName, varIndex) => {
        const dynamicRow = row as DynamicAggregatedData;
        const legacyRow = row as any; // Legacy data format
        const lightColor = getVariableLightBackgroundColor(varName, varIndex);
        
        // CRITICAL FIX: Normalize variable name properly - handle both display names and normalized names
        // First normalize if it's a display name (contains spaces or special formatting)
        let normalizedVarName: string;
        if (varName.includes(' ') || varName.includes('-') || varName.includes('(')) {
          // This is likely a display name, normalize it first
          const tempNormalized = varName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
          normalizedVarName = mapVariableNameToStandard(tempNormalized);
        } else {
          // Already normalized, just map to standard
          normalizedVarName = mapVariableNameToStandard(varName);
        }
        
        let metrics: any = null;
        
        // Enhanced logging for on-call compensation variables
        const isOnCallVariable = varName.toLowerCase().includes('on-call') || 
                                 varName.toLowerCase().includes('on call') ||
                                 varName.toLowerCase().includes('oncall') ||
                                 normalizedVarName === 'on_call_compensation';
        
        if (isOnCallVariable && index < 5) {
          console.log('🔍 On-Call Variable Debug:', {
            index,
            surveySource: legacyRow.surveySource,
            dataCategory: legacyRow.dataCategory,
            varName,
            normalizedVarName,
            hasVariables: !!dynamicRow.variables,
            variablesKeys: dynamicRow.variables ? Object.keys(dynamicRow.variables) : [],
            isLegacyFormat: !dynamicRow.variables,
            rowHasOnCall: dynamicRow.variables ? Object.keys(dynamicRow.variables).some(k => 
              k.includes('on_call') || k.includes('oncall')
            ) : false
          });
        }
        
        // General debug logging for first few rows
        if (index < 3 && varName === 'Total Cash Compensation Per Work RVUs') {
          console.log('🔍 General Data Structure Debug:', {
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
          
          // CRITICAL FIX: If exact match not found, try alternative keys for on-call variables
          if (!metrics && isOnCallVariable) {
            // Try alternative normalized names
            const altKeys = [
              'on_call_compensation',
              'oncall_compensation',
              'daily_rate_on_call',
              'daily_rate_oncall',
              'on_call_rate',
              'oncall_rate'
            ];
            for (const altKey of altKeys) {
              if (dynamicRow.variables[altKey]) {
                metrics = dynamicRow.variables[altKey];
                console.log(`✅ On-Call Variable Found with Alternative Key: ${altKey} (was looking for: ${normalizedVarName})`);
                break;
              }
            }
          }
          
          // Enhanced logging for on-call when metrics not found
          if (isOnCallVariable && !metrics && index < 5) {
            console.warn('⚠️ On-Call Variable Not Found in Row:', {
              surveySource: legacyRow.surveySource,
              dataCategory: legacyRow.dataCategory,
              varName,
              normalizedVarName,
              availableVariables: Object.keys(dynamicRow.variables),
              hasVariables: !!dynamicRow.variables
            });
          }
          
          // Debug logging for dynamic format
          if (varName === 'Total Cash Compensation Per Work RVUs' && (legacyRow.surveySource?.toLowerCase().includes('mgma') || legacyRow.surveySource?.toLowerCase().includes('sullivan') || legacyRow.surveySource?.toLowerCase().includes('gallagher'))) {
            console.log('🔍 Dynamic Format TCC per Work RVU Debug:', {
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
            console.log('🔍 TCC per Work RVU Debug:', {
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
