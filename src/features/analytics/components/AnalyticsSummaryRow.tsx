/**
 * Analytics Summary Row Component
 * 
 * Summary rows (simple and weighted averages) for the analytics table.
 * Following enterprise patterns for component composition and reusability.
 */

import React, { memo } from 'react';
import { formatSpecialtyForDisplay } from '../../../shared/utils/formatters';
import { formatVariableValue } from '../utils/variableFormatters';

interface AnalyticsSummaryRowProps {
  specialty: string;
  summaryData: {
    simple: Record<string, any>;
    weighted: Record<string, any>;
  };
  selectedVariables: string[];
}

/**
 * AnalyticsSummaryRow component for summary calculations
 * 
 * @param specialty - Specialty name for display
 * @param summaryData - Calculated summary data
 * @param selectedVariables - Selected variables for dynamic rendering
 */
export const AnalyticsSummaryRow: React.FC<AnalyticsSummaryRowProps> = memo(({
  specialty,
  summaryData,
  selectedVariables
}) => {
  return (
    <>
      {/* Simple Average Row */}
      <tr style={{ backgroundColor: '#f5f5f5', borderTop: '1px solid #d1d5db' }}>
        <td 
          style={{ 
            fontWeight: '600',
            position: 'static',
            left: 'auto',
            backgroundColor: '#f5f5f5',
            borderRight: '1px solid #e0e0e0',
            zIndex: 'auto',
            padding: '8px',
            fontSize: '15px'
          }}
          colSpan={3}
        >
          Simple Average
        </td>
        
        {/* Unified variable summary data */}
        {selectedVariables.map((varName, varIndex) => {
          const summary = summaryData.simple[varName];
          
          return summary ? (
            <React.Fragment key={varName}>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {summary.n_orgs.toLocaleString()}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {summary.n_incumbents.toLocaleString()}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {formatVariableValue(summary.p25, varName)}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {formatVariableValue(summary.p50, varName)}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {formatVariableValue(summary.p75, varName)}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', borderRight: '1px solid #E0E0E0', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {formatVariableValue(summary.p90, varName)}
              </td>
            </React.Fragment>
          ) : (
            <React.Fragment key={varName}>
              <td style={{ backgroundColor: '#f5f5f5', textAlign: 'center', color: '#9ca3af', padding: '8px', fontSize: '15px' }} colSpan={6}>
                n/a
              </td>
            </React.Fragment>
          );
        })}
      </tr>
      
      {/* Weighted Average Row */}
      <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #d1d5db' }}>
        <td 
          style={{ 
            fontWeight: '600',
            position: 'static',
            left: 'auto',
            backgroundColor: '#f5f5f5',
            borderRight: '1px solid #e0e0e0',
            zIndex: 'auto',
            padding: '8px',
            fontSize: '15px'
          }}
          colSpan={3}
        >
          Weighted Average
        </td>
        
        {/* Unified variable weighted summary data */}
        {selectedVariables.map((varName, varIndex) => {
          const summary = summaryData.weighted[varName];
          
          return summary ? (
            <React.Fragment key={varName}>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {summary.n_orgs.toLocaleString()}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {summary.n_incumbents.toLocaleString()}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {formatVariableValue(summary.p25, varName)}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {formatVariableValue(summary.p50, varName)}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {formatVariableValue(summary.p75, varName)}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: '600', borderRight: '1px solid #E0E0E0', textAlign: 'right', padding: '8px', fontSize: '15px' }}>
                {formatVariableValue(summary.p90, varName)}
              </td>
            </React.Fragment>
          ) : (
            <React.Fragment key={varName}>
              <td style={{ backgroundColor: '#f5f5f5', textAlign: 'center', color: '#9ca3af', padding: '8px', fontSize: '15px' }} colSpan={6}>
                n/a
              </td>
            </React.Fragment>
          );
        })}
      </tr>
    </>
  );
});

AnalyticsSummaryRow.displayName = 'AnalyticsSummaryRow';
