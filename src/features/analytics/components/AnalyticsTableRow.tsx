/**
 * Analytics Table Row Component
 * 
 * Individual data row for the analytics table with dynamic variable support.
 * Following enterprise patterns for component composition and reusability.
 */

import React, { memo } from 'react';
import { formatSpecialtyForDisplay, formatRegionForDisplay } from '../../../shared/utils/formatters';
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
  formattingRules = []
}) => {
  return (
    <tr key={`${row.surveySource}-${row.geographicRegion}-${index}`} className="hover:bg-gray-50">
      {/* Survey Data Columns (Frozen) */}
      <td 
        style={{ 
          position: 'static',
          left: 'auto',
          backgroundColor: 'white',
          borderRight: '1px solid #e0e0e0',
          zIndex: 'auto',
          padding: '8px',
          boxShadow: 'none',
          fontSize: '15px'
        }}
      >
        {row.surveySource}
      </td>
      <td 
        style={{ 
          position: 'static',
          left: 'auto',
          backgroundColor: 'white',
          borderRight: '1px solid #e0e0e0',
          zIndex: 'auto',
          padding: '8px',
          boxShadow: 'none',
          fontSize: '15px'
        }}
      >
        {formatSpecialtyForDisplay(row.originalSpecialty)}
      </td>
      <td 
        style={{ 
          position: 'static',
          left: 'auto',
          backgroundColor: 'white',
          borderRight: '1px solid #e0e0e0',
          zIndex: 'auto',
          padding: '8px',
          boxShadow: 'none',
          fontSize: '15px'
        }}
      >
        {formatRegionForDisplay(row.geographicRegion)}
      </td>
      
      {/* Dynamic Variable Columns */}
      {selectedVariables.map((varName, varIndex) => {
        const dynamicRow = row as DynamicAggregatedData;
        const legacyRow = row as any; // Legacy data format
        const lightColor = getVariableLightBackgroundColor(varName, varIndex);
        
        // FIXED: Improved format detection and variable handling
        const normalizedVarName = mapVariableNameToStandard(varName);
        let metrics: any = null;
        
        // Check if this is dynamic format (has variables property)
        if (dynamicRow.variables && typeof dynamicRow.variables === 'object') {
          // Dynamic format: use variables object directly
          metrics = dynamicRow.variables[normalizedVarName];
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
            'collections': 'net_collections'
          };
          
          const legacyPrefix = legacyFieldMap[varName] || varName;
          const nOrgs = legacyRow[`${legacyPrefix}_n_orgs`] || 0;
          const nIncumbents = legacyRow[`${legacyPrefix}_n_incumbents`] || 0;
          const p25 = legacyRow[`${legacyPrefix}_p25`] || 0;
          const p50 = legacyRow[`${legacyPrefix}_p50`] || 0;
          const p75 = legacyRow[`${legacyPrefix}_p75`] || 0;
          const p90 = legacyRow[`${legacyPrefix}_p90`] || 0;
          
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
            <td style={{ backgroundColor: lightColor, textAlign: 'right', padding: '8px', fontSize: '15px' }}>{metrics.n_orgs.toLocaleString()}</td>
            <td style={{ backgroundColor: lightColor, textAlign: 'right', padding: '8px', fontSize: '15px' }}>{metrics.n_incumbents.toLocaleString()}</td>
            <td style={{ backgroundColor: lightColor, textAlign: 'right', padding: '8px', fontSize: '15px' }}>
              {VariableFormattingService.getInstance().formatVariableValue(metrics.p25, varName, { rules: formattingRules })}
            </td>
            <td style={{ backgroundColor: lightColor, textAlign: 'right', padding: '8px', fontSize: '15px' }}>
              {VariableFormattingService.getInstance().formatVariableValue(metrics.p50, varName, { rules: formattingRules })}
            </td>
            <td style={{ backgroundColor: lightColor, textAlign: 'right', padding: '8px', fontSize: '15px' }}>
              {VariableFormattingService.getInstance().formatVariableValue(metrics.p75, varName, { rules: formattingRules })}
            </td>
            <td style={{ backgroundColor: lightColor, borderRight: '1px solid #E0E0E0', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
              {VariableFormattingService.getInstance().formatVariableValue(metrics.p90, varName, { rules: formattingRules })}
            </td>
          </React.Fragment>
        ) : (
          <React.Fragment key={varName}>
            <td style={{ backgroundColor: lightColor, textAlign: 'center', color: '#9ca3af', padding: '8px', fontSize: '15px' }} colSpan={6}>
              n/a
            </td>
          </React.Fragment>
        );
      })}
    </tr>
  );
});

AnalyticsTableRow.displayName = 'AnalyticsTableRow';
