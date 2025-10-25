/**
 * Analytics Table Row Component
 * 
 * Individual data row for the analytics table with dynamic variable support.
 * Following enterprise patterns for component composition and reusability.
 */

import React, { memo } from 'react';
import { formatSpecialtyForDisplay, formatRegionForDisplay } from '../../../shared/utils/formatters';
import { 
  formatVariableValue, 
  getVariableLightBackgroundColor,
  mapVariableNameToStandard
} from '../utils/variableFormatters';
import { DynamicAggregatedData } from '../types/variables';

interface AnalyticsTableRowProps {
  row: any; // DynamicAggregatedData | AggregatedData
  selectedVariables: string[];
  freezeLeftColumns: boolean;
  index: number;
}

/**
 * AnalyticsTableRow component for individual data rows
 * 
 * @param row - Data row to display
 * @param selectedVariables - Selected variables for dynamic rendering
 * @param freezeLeftColumns - Whether left columns are frozen
 * @param index - Row index for key
 */
export const AnalyticsTableRow: React.FC<AnalyticsTableRowProps> = memo(({
  row,
  selectedVariables,
  freezeLeftColumns,
  index
}) => {
  return (
    <tr key={`${row.surveySource}-${row.geographicRegion}-${index}`} className="hover:bg-gray-50">
      {/* Survey Data Columns (Frozen) */}
      <td 
        style={{ 
          position: freezeLeftColumns ? 'sticky' : 'static',
          left: freezeLeftColumns ? 0 : 'auto',
          backgroundColor: freezeLeftColumns ? '#f8f9fa' : 'white',
          borderRight: '1px solid #e0e0e0',
          zIndex: freezeLeftColumns ? 5 : 'auto',
          padding: '8px',
          boxShadow: freezeLeftColumns ? '2px 0 5px rgba(0,0,0,0.1)' : 'none'
        }}
      >
        {row.surveySource}
      </td>
      <td 
        style={{ 
          position: freezeLeftColumns ? 'sticky' : 'static',
          left: freezeLeftColumns ? '140px' : 'auto',
          backgroundColor: freezeLeftColumns ? '#f8f9fa' : 'white',
          borderRight: '1px solid #e0e0e0',
          zIndex: freezeLeftColumns ? 5 : 'auto',
          padding: '8px',
          boxShadow: freezeLeftColumns ? '2px 0 5px rgba(0,0,0,0.1)' : 'none'
        }}
      >
        {formatSpecialtyForDisplay(row.originalSpecialty)}
      </td>
      <td 
        style={{ 
          position: freezeLeftColumns ? 'sticky' : 'static',
          left: freezeLeftColumns ? '320px' : 'auto',
          backgroundColor: freezeLeftColumns ? '#f8f9fa' : 'white',
          borderRight: '1px solid #e0e0e0',
          zIndex: freezeLeftColumns ? 5 : 'auto',
          padding: '8px',
          boxShadow: freezeLeftColumns ? '2px 0 5px rgba(0,0,0,0.1)' : 'none'
        }}
      >
        {formatRegionForDisplay(row.geographicRegion)}
      </td>
      
      {/* Dynamic Variable Columns */}
      {selectedVariables.map((varName, varIndex) => {
        const dynamicRow = row as DynamicAggregatedData;
        const legacyRow = row as any; // Legacy data format
        const lightColor = getVariableLightBackgroundColor(varName, varIndex);
        
        // Try dynamic format first
        const normalizedVarName = mapVariableNameToStandard(varName);
        let metrics = dynamicRow.variables?.[normalizedVarName];
        
        // Fallback to legacy format if dynamic format not available
        if (!metrics && !dynamicRow.variables) {
          const legacyFieldMap: Record<string, string> = {
            'tcc': 'tcc',
            'work_rvus': 'wrvu',
            'wrvu': 'wrvu',
            'cf': 'cf',
            'conversion_factor': 'cf',
            'tcc_per_work_rvu': 'cf',
            'cfs': 'cf',  // Map 'cfs' to 'cf' for legacy data
            'tcc_per_work_rvus': 'cf'
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
            <td style={{ backgroundColor: lightColor, textAlign: 'right', padding: '8px' }}>{metrics.n_orgs.toLocaleString()}</td>
            <td style={{ backgroundColor: lightColor, textAlign: 'right', padding: '8px' }}>{metrics.n_incumbents.toLocaleString()}</td>
            <td style={{ backgroundColor: lightColor, textAlign: 'right', padding: '8px' }}>{formatVariableValue(metrics.p25, varName)}</td>
            <td style={{ backgroundColor: lightColor, textAlign: 'right', padding: '8px' }}>{formatVariableValue(metrics.p50, varName)}</td>
            <td style={{ backgroundColor: lightColor, textAlign: 'right', padding: '8px' }}>{formatVariableValue(metrics.p75, varName)}</td>
            <td style={{ backgroundColor: lightColor, borderRight: '1px solid #E0E0E0', textAlign: 'right', padding: '8px' }}>{formatVariableValue(metrics.p90, varName)}</td>
          </React.Fragment>
        ) : (
          <React.Fragment key={varName}>
            <td style={{ backgroundColor: lightColor, textAlign: 'center', color: '#9ca3af', padding: '8px' }} colSpan={6}>
              n/a
            </td>
          </React.Fragment>
        );
      })}
    </tr>
  );
});

AnalyticsTableRow.displayName = 'AnalyticsTableRow';
