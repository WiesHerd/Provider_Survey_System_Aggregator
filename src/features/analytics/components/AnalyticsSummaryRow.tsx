/**
 * Analytics Summary Row Component
 * 
 * Summary rows (simple and weighted averages) for the analytics table.
 * Following enterprise patterns for component composition and reusability.
 */

import React, { memo } from 'react';
import { formatSpecialtyForDisplay } from '../../../shared/utils/formatters';
import { VariableFormattingService } from '../services/variableFormattingService';

interface AnalyticsSummaryRowProps {
  specialty: string;
  summaryData: {
    simple: Record<string, any>;
    weighted: Record<string, any>;
  };
  selectedVariables: string[];
  formattingRules?: any[]; // User-defined formatting rules
  showSpecialty?: boolean; // Whether to show specialty column
  showSurveySource?: boolean; // Whether to show survey source column
  showRegion?: boolean; // Whether to show region column
  showProviderType?: boolean; // Whether to show provider type column
}

/**
 * AnalyticsSummaryRow component for summary calculations
 * 
 * @param specialty *** Specialty name for display
 * @param summaryData *** Calculated summary data
 * @param selectedVariables *** Selected variables for dynamic rendering
 */
export const AnalyticsSummaryRow: React.FC<AnalyticsSummaryRowProps> = memo(({
  specialty,
  summaryData,
  selectedVariables,
  formattingRules = [],
  showSpecialty = true,
  showSurveySource = true,
  showRegion = true,
  showProviderType = true
}) => {
  return (
    <>
      {/* Simple Average Row */}
      <tr style={{ backgroundColor: '#f5f5f5', borderTop: '1px solid #d1d5db' }}>
        {/* Survey Data Columns - Conditionally rendered to match data rows */}
        {showSpecialty && (
          <td 
            style={{ 
              fontWeight: '600',
              position: 'static',
              left: 'auto',
              backgroundColor: '#f5f5f5',
              borderRight: '1px solid #e0e0e0',
              zIndex: 'auto',
              padding: '8px',
              fontSize: '15px',
              width: 'auto',
              minWidth: '150px'
            }}
          >
            Simple Average
          </td>
        )}
        {showSurveySource && (
          <td 
            style={{ 
              fontWeight: '600',
              position: 'static',
              left: 'auto',
              backgroundColor: '#f5f5f5',
              borderRight: '1px solid #e0e0e0',
              zIndex: 'auto',
              padding: '8px',
              fontSize: '15px',
              width: 'auto',
              minWidth: '120px'
            }}
          >
            {/* Empty for survey source */}
          </td>
        )}
        {showRegion && (
          <td 
            style={{ 
              fontWeight: '600',
              position: 'static',
              left: 'auto',
              backgroundColor: '#f5f5f5',
              borderRight: '1px solid #e0e0e0',
              zIndex: 'auto',
              padding: '8px',
              fontSize: '15px',
              width: 'auto',
              minWidth: '100px'
            }}
          >
            {/* Empty for region */}
          </td>
        )}
        {showProviderType && (
          <td 
            style={{ 
              fontWeight: '600',
              position: 'static',
              left: 'auto',
              backgroundColor: '#f5f5f5',
              borderRight: '1px solid #e0e0e0',
              zIndex: 'auto',
              padding: '8px',
              fontSize: '15px',
              width: 'auto',
              minWidth: '120px'
            }}
          >
            {/* Empty for provider type */}
          </td>
        )}
        
        {/* Unified variable summary data */}
        {selectedVariables.map((varName, varIndex) => {
          const summary = summaryData.simple[varName];
          
          // Check if summary exists and has valid data (p50 > 0 indicates real data)
          const hasValidData = summary && summary.p50 > 0;
          
          return hasValidData ? (
            <React.Fragment key={varName}>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {summary.n_orgs.toLocaleString()}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {summary.n_incumbents.toLocaleString()}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {VariableFormattingService.getInstance().formatVariableValue(summary.p25, varName, { rules: formattingRules })}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {VariableFormattingService.getInstance().formatVariableValue(summary.p50, varName, { rules: formattingRules })}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {VariableFormattingService.getInstance().formatVariableValue(summary.p75, varName, { rules: formattingRules })}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', borderRight: '1px solid #E0E0E0', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {VariableFormattingService.getInstance().formatVariableValue(summary.p90, varName, { rules: formattingRules })}
              </td>
            </React.Fragment>
          ) : (
            <React.Fragment key={varName}>
              <td style={{ backgroundColor: '#f5f5f5', textAlign: 'right', color: '#9ca3af', padding: '8px', fontSize: '15px' }}>
                ***
              </td>
              <td style={{ backgroundColor: '#f5f5f5', textAlign: 'right', color: '#9ca3af', padding: '8px', fontSize: '15px', borderRight: '1px solid #E5E7EB' }}>
                ***
              </td>
              <td style={{ backgroundColor: '#f5f5f5', textAlign: 'right', color: '#9ca3af', padding: '8px', fontSize: '15px' }}>
                ***
              </td>
              <td style={{ backgroundColor: '#f5f5f5', textAlign: 'right', color: '#9ca3af', padding: '8px', fontSize: '15px' }}>
                ***
              </td>
              <td style={{ backgroundColor: '#f5f5f5', textAlign: 'right', color: '#9ca3af', padding: '8px', fontSize: '15px' }}>
                ***
              </td>
              <td style={{ backgroundColor: '#f5f5f5', textAlign: 'right', color: '#9ca3af', padding: '8px', fontSize: '15px', borderRight: '1px solid #E0E0E0' }}>
                ***
              </td>
            </React.Fragment>
          );
        })}
      </tr>
      
      {/* Weighted Average Row */}
      <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #d1d5db' }}>
        {/* Survey Data Columns - Conditionally rendered to match data rows */}
        {showSpecialty && (
          <td 
            style={{ 
              fontWeight: '600',
              position: 'static',
              left: 'auto',
              backgroundColor: '#f5f5f5',
              borderRight: '1px solid #e0e0e0',
              zIndex: 'auto',
              padding: '8px',
              fontSize: '15px',
              width: 'auto',
              minWidth: '150px'
            }}
          >
            Weighted Average
          </td>
        )}
        {showSurveySource && (
          <td 
            style={{ 
              fontWeight: '600',
              position: 'static',
              left: 'auto',
              backgroundColor: '#f5f5f5',
              borderRight: '1px solid #e0e0e0',
              zIndex: 'auto',
              padding: '8px',
              fontSize: '15px',
              width: 'auto',
              minWidth: '120px'
            }}
          >
            {/* Empty for survey source */}
          </td>
        )}
        {showRegion && (
          <td 
            style={{ 
              fontWeight: '600',
              position: 'static',
              left: 'auto',
              backgroundColor: '#f5f5f5',
              borderRight: '1px solid #e0e0e0',
              zIndex: 'auto',
              padding: '8px',
              fontSize: '15px',
              width: 'auto',
              minWidth: '100px'
            }}
          >
            {/* Empty for region */}
          </td>
        )}
        {showProviderType && (
          <td 
            style={{ 
              fontWeight: '600',
              position: 'static',
              left: 'auto',
              backgroundColor: '#f5f5f5',
              borderRight: '1px solid #e0e0e0',
              zIndex: 'auto',
              padding: '8px',
              fontSize: '15px',
              width: 'auto',
              minWidth: '120px'
            }}
          >
            {/* Empty for provider type */}
          </td>
        )}
        
        {/* Unified variable weighted summary data */}
        {selectedVariables.map((varName, varIndex) => {
          const summary = summaryData.weighted[varName];
          
          // Check if summary exists and has valid data (p50 > 0 indicates real data)
          const hasValidData = summary && summary.p50 > 0;
          
          return hasValidData ? (
            <React.Fragment key={varName}>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {summary.n_orgs.toLocaleString()}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {summary.n_incumbents.toLocaleString()}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {VariableFormattingService.getInstance().formatVariableValue(summary.p25, varName, { rules: formattingRules })}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {VariableFormattingService.getInstance().formatVariableValue(summary.p50, varName, { rules: formattingRules })}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {VariableFormattingService.getInstance().formatVariableValue(summary.p75, varName, { rules: formattingRules })}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', borderRight: '1px solid #E0E0E0', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {VariableFormattingService.getInstance().formatVariableValue(summary.p90, varName, { rules: formattingRules })}
              </td>
            </React.Fragment>
          ) : (
            <React.Fragment key={varName}>
              <td style={{ backgroundColor: '#f5f5f5', textAlign: 'right', color: '#9ca3af', padding: '8px', fontSize: '15px' }}>
                ***
              </td>
              <td style={{ backgroundColor: '#f5f5f5', textAlign: 'right', color: '#9ca3af', padding: '8px', fontSize: '15px', borderRight: '1px solid #E5E7EB' }}>
                ***
              </td>
              <td style={{ backgroundColor: '#f5f5f5', textAlign: 'right', color: '#9ca3af', padding: '8px', fontSize: '15px' }}>
                ***
              </td>
              <td style={{ backgroundColor: '#f5f5f5', textAlign: 'right', color: '#9ca3af', padding: '8px', fontSize: '15px' }}>
                ***
              </td>
              <td style={{ backgroundColor: '#f5f5f5', textAlign: 'right', color: '#9ca3af', padding: '8px', fontSize: '15px' }}>
                ***
              </td>
              <td style={{ backgroundColor: '#f5f5f5', textAlign: 'right', color: '#9ca3af', padding: '8px', fontSize: '15px', borderRight: '1px solid #E0E0E0' }}>
                ***
              </td>
            </React.Fragment>
          );
        })}
      </tr>
    </>
  );
});

AnalyticsSummaryRow.displayName = 'AnalyticsSummaryRow';
