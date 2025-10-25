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
  freezeLeftColumns: boolean;
}

/**
 * AnalyticsSummaryRow component for summary calculations
 * 
 * @param specialty - Specialty name for display
 * @param summaryData - Calculated summary data
 * @param selectedVariables - Selected variables for dynamic rendering
 * @param freezeLeftColumns - Whether left columns are frozen
 */
export const AnalyticsSummaryRow: React.FC<AnalyticsSummaryRowProps> = memo(({
  specialty,
  summaryData,
  selectedVariables,
  freezeLeftColumns
}) => {
  return (
    <>
      {/* Simple Average Row */}
      <tr style={{ backgroundColor: '#f5f5f5', borderTop: '1px solid #d1d5db' }}>
        <td 
          style={{ 
            fontWeight: 'bold',
            position: freezeLeftColumns ? 'sticky' : 'static',
            left: freezeLeftColumns ? 0 : 'auto',
            backgroundColor: '#f5f5f5',
            borderRight: '1px solid #e0e0e0',
            zIndex: freezeLeftColumns ? 5 : 'auto',
            padding: '8px'
          }}
        >
          {formatSpecialtyForDisplay(specialty)} - Simple Average
        </td>
        <td 
          style={{ 
            position: freezeLeftColumns ? 'sticky' : 'static',
            left: freezeLeftColumns ? '140px' : 'auto',
            backgroundColor: '#f5f5f5',
            borderRight: '1px solid #e0e0e0',
            zIndex: freezeLeftColumns ? 5 : 'auto',
            padding: '8px'
          }}
        ></td>
        <td 
          style={{ 
            position: freezeLeftColumns ? 'sticky' : 'static',
            left: freezeLeftColumns ? '320px' : 'auto',
            backgroundColor: '#f5f5f5',
            borderRight: '1px solid #e0e0e0',
            zIndex: freezeLeftColumns ? 5 : 'auto',
            padding: '8px'
          }}
        ></td>
        
        {/* Unified variable summary data */}
        {selectedVariables.map((varName, varIndex) => {
          const summary = summaryData.simple[varName];
          
          return summary ? (
            <React.Fragment key={varName}>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                {summary.n_orgs.toLocaleString()}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                {summary.n_incumbents.toLocaleString()}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                {formatVariableValue(summary.p25, varName)}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                {formatVariableValue(summary.p50, varName)}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                {formatVariableValue(summary.p75, varName)}
              </td>
              <td style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', borderRight: '1px solid #E0E0E0', textAlign: 'right', padding: '8px' }}>
                {formatVariableValue(summary.p90, varName)}
              </td>
            </React.Fragment>
          ) : (
            <React.Fragment key={varName}>
              <td style={{ backgroundColor: '#f5f5f5', textAlign: 'center', color: '#9ca3af', padding: '8px' }} colSpan={6}>
                n/a
              </td>
            </React.Fragment>
          );
        })}
      </tr>
      
      {/* Weighted Average Row */}
      <tr style={{ backgroundColor: '#e8eaf6', borderBottom: '1px solid #d1d5db' }}>
        <td 
          style={{ 
            fontWeight: 'bold',
            position: freezeLeftColumns ? 'sticky' : 'static',
            left: freezeLeftColumns ? 0 : 'auto',
            backgroundColor: '#e8eaf6',
            borderRight: '1px solid #e0e0e0',
            zIndex: freezeLeftColumns ? 5 : 'auto',
            padding: '8px'
          }}
        >
          {formatSpecialtyForDisplay(specialty)} - Weighted Average
        </td>
        <td 
          style={{ 
            position: freezeLeftColumns ? 'sticky' : 'static',
            left: freezeLeftColumns ? '140px' : 'auto',
            backgroundColor: '#e8eaf6',
            borderRight: '1px solid #e0e0e0',
            zIndex: freezeLeftColumns ? 5 : 'auto',
            padding: '8px'
          }}
        ></td>
        <td 
          style={{ 
            position: freezeLeftColumns ? 'sticky' : 'static',
            left: freezeLeftColumns ? '320px' : 'auto',
            backgroundColor: '#e8eaf6',
            borderRight: '1px solid #e0e0e0',
            zIndex: freezeLeftColumns ? 5 : 'auto',
            padding: '8px'
          }}
        ></td>
        
        {/* Unified variable weighted summary data */}
        {selectedVariables.map((varName, varIndex) => {
          const summary = summaryData.weighted[varName];
          
          return summary ? (
            <React.Fragment key={varName}>
              <td style={{ backgroundColor: '#e8eaf6', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                {summary.n_orgs.toLocaleString()}
              </td>
              <td style={{ backgroundColor: '#e8eaf6', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                {summary.n_incumbents.toLocaleString()}
              </td>
              <td style={{ backgroundColor: '#e8eaf6', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                {formatVariableValue(summary.p25, varName)}
              </td>
              <td style={{ backgroundColor: '#e8eaf6', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                {formatVariableValue(summary.p50, varName)}
              </td>
              <td style={{ backgroundColor: '#e8eaf6', fontWeight: 'bold', textAlign: 'right', padding: '8px' }}>
                {formatVariableValue(summary.p75, varName)}
              </td>
              <td style={{ backgroundColor: '#e8eaf6', fontWeight: 'bold', borderRight: '1px solid #E0E0E0', textAlign: 'right', padding: '8px' }}>
                {formatVariableValue(summary.p90, varName)}
              </td>
            </React.Fragment>
          ) : (
            <React.Fragment key={varName}>
              <td style={{ backgroundColor: '#e8eaf6', textAlign: 'center', color: '#9ca3af', padding: '8px' }} colSpan={6}>
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
