/**
 * Analytics Table Header Component
 * 
 * Table header with dynamic column groups and frozen column support.
 * Following enterprise patterns for component composition and reusability.
 */

import React, { memo } from 'react';
import { getVariableLightBackgroundColor } from '../utils/variableFormatters';

interface ColumnGroup {
  normalizedName: string;
  displayName: string;
  color: string;
  category: string;
}

interface AnalyticsTableHeaderProps {
  columnGroups: ColumnGroup[];
  selectedVariables: string[];
}

/**
 * AnalyticsTableHeader component for table headers
 * 
 * @param columnGroups - Dynamic column groups
 * @param selectedVariables - Selected variables for fallback headers
 */
export const AnalyticsTableHeader: React.FC<AnalyticsTableHeaderProps> = memo(({
  columnGroups,
  selectedVariables
}) => {
  return (
    <thead style={{ 
      position: 'sticky', 
      top: 0, 
      zIndex: 10, 
      backgroundColor: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      {/* Main header row */}
      <tr style={{ margin: '0', padding: '0' }}>
        {/* Survey Data Section Header */}
        <th 
          style={{ 
            fontWeight: '600', 
            backgroundColor: '#F5F5F5', 
            borderRight: '1px solid #E0E0E0',
            borderBottom: 'none',
            textAlign: 'center',
            color: '#424242',
            position: 'static',
            left: 'auto',
            top: 0,
            zIndex: 'auto',
            minWidth: '440px',
            padding: '12px 8px',
            boxShadow: 'none',
            fontSize: '15px'
          }} 
          colSpan={3}
        >
          Survey Data
        </th>
        
        {/* DYNAMIC: Generate headers for selected variables */}
        {columnGroups.length > 0 && columnGroups.map((group, index) => (
          <th 
            key={group.normalizedName}
            style={{
              fontWeight: '600',
              backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index),
              textAlign: 'center',
              borderRight: '1px solid #E0E0E0',
              borderBottom: 'none',
              position: 'sticky',
              top: 0,
              zIndex: 11,
              padding: '12px 8px',
              fontSize: '15px'
            }}
            colSpan={6}
          >
            {group.displayName}
          </th>
        ))}
        
        {/* FALLBACK: Original hardcoded headers for backward compatibility */}
        {columnGroups.length === 0 && (
          <>
            <th 
              style={{ 
                fontWeight: 'bold', 
                backgroundColor: '#E3F2FD', 
                borderRight: '1px solid #E0E0E0',
                borderBottom: 'none',
                textAlign: 'center',
                color: '#1976D2',
                position: 'sticky',
                top: 0,
                zIndex: 11,
                padding: '12px 8px'
              }} 
              colSpan={6}
            >
              Total Cash Compensation
            </th>
            
            <th 
              style={{ 
                fontWeight: 'bold', 
                backgroundColor: '#E8F5E8', 
                borderRight: '1px solid #E0E0E0',
                borderBottom: 'none',
                textAlign: 'center',
                color: '#388E3C',
                position: 'sticky',
                top: 0,
                zIndex: 11,
                padding: '12px 8px'
              }} 
              colSpan={6}
            >
              Productivity - wRVUs
            </th>
            
            <th 
              style={{ 
                fontWeight: 'bold',
                backgroundColor: '#FFF3E0', 
                borderBottom: 'none',
                textAlign: 'center',
                color: '#F57C00',
                position: 'sticky',
                top: 0,
                zIndex: 11,
                padding: '12px 8px'
              }} 
              colSpan={6}
            >
              Conversion Factors
            </th>
          </>
        )}
      </tr>
      
      {/* Sub-header row with column names */}
      <tr style={{
        borderBottom: 'none',
        marginTop: '0',
        marginBottom: '0'
      }}>
        {/* Survey Data Sub-headers */}
        <th 
          style={{ 
            fontWeight: 'bold', 
            backgroundColor: '#F5F5F5',
            position: 'static',
            left: 'auto',
            top: 'auto',
            zIndex: 'auto',
            minWidth: '140px',
            padding: '8px',
            textAlign: 'left',
            borderBottom: 'none',
            boxShadow: 'none'
          }}
        >
          Survey Source
        </th>
        <th 
          style={{ 
            fontWeight: 'bold', 
            backgroundColor: '#F5F5F5',
            position: 'static',
            left: 'auto',
            top: 'auto',
            zIndex: 'auto',
            minWidth: '180px',
            padding: '8px',
            textAlign: 'left',
            borderBottom: 'none',
            boxShadow: 'none'
          }}
        >
          Specialty
        </th>
        <th 
          style={{ 
            fontWeight: 'bold', 
            backgroundColor: '#F5F5F5',
            position: 'static',
            left: 'auto',
            top: 'auto',
            zIndex: 'auto',
            minWidth: '120px',
            borderRight: '1px solid #E0E0E0',
            padding: '8px',
            textAlign: 'left',
            borderBottom: 'none',
            boxShadow: 'none'
          }}
        >
          Region
        </th>
         
        {/* DYNAMIC: Generate sub-headers for selected variables */}
        {columnGroups.length > 0 && columnGroups.map((group, index) => (
          <React.Fragment key={group.normalizedName}>
            <th 
              style={{ 
                fontWeight: 'bold', 
                backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index),
                position: 'sticky',
                top: '48px',
                zIndex: 11,
                padding: '8px',
                textAlign: 'right',
                borderBottom: 'none'
              }}
            >
              # Orgs
            </th>
            <th 
              style={{ 
                fontWeight: 'bold', 
                backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index),
                position: 'sticky',
                top: '48px',
                zIndex: 11,
                padding: '8px',
                textAlign: 'right',
                borderBottom: 'none'
              }}
            >
              # Inc
            </th>
            <th 
              style={{ 
                fontWeight: 'bold', 
                backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index),
                position: 'sticky',
                top: '48px',
                zIndex: 11,
                padding: '8px',
                textAlign: 'right',
                borderBottom: 'none'
              }}
            >
              P25
            </th>
            <th 
              style={{ 
                fontWeight: 'bold', 
                backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index),
                position: 'sticky',
                top: '48px',
                zIndex: 11,
                padding: '8px',
                textAlign: 'right',
                borderBottom: 'none'
              }}
            >
              P50
            </th>
            <th 
              style={{ 
                fontWeight: 'bold', 
                backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index),
                position: 'sticky',
                top: '48px',
                zIndex: 11,
                padding: '8px',
                textAlign: 'right',
                borderBottom: 'none'
              }}
            >
              P75
            </th>
            <th 
              style={{ 
                fontWeight: 'bold', 
                backgroundColor: getVariableLightBackgroundColor(group.normalizedName, index), 
                borderRight: '1px solid #E0E0E0',
                position: 'sticky',
                top: '48px',
                zIndex: 11,
                padding: '8px',
                textAlign: 'right',
                borderBottom: 'none'
              }}
            >
              P90
            </th>
          </React.Fragment>
        ))}
         
        {/* FALLBACK: Original hardcoded sub-headers for backward compatibility */}
        {columnGroups.length === 0 && (
          <>
            {/* TCC Sub-headers */}
            <th style={{ fontWeight: 'bold', backgroundColor: '#E3F2FD', position: 'sticky', top: '48px', zIndex: 11, padding: '8px', textAlign: 'right', borderBottom: 'none' }}># Orgs</th>
            <th style={{ fontWeight: 'bold', backgroundColor: '#E3F2FD', position: 'sticky', top: '48px', zIndex: 11, padding: '8px', textAlign: 'right', borderBottom: 'none' }}># Incumbents</th>
            <th style={{ fontWeight: 'bold', backgroundColor: '#E3F2FD', position: 'sticky', top: '48px', zIndex: 11, padding: '8px', textAlign: 'right', borderBottom: 'none' }}>TCC P25</th>
            <th style={{ fontWeight: 'bold', backgroundColor: '#E3F2FD', position: 'sticky', top: '48px', zIndex: 11, padding: '8px', textAlign: 'right', borderBottom: 'none' }}>TCC P50</th>
            <th style={{ fontWeight: 'bold', backgroundColor: '#E3F2FD', position: 'sticky', top: '48px', zIndex: 11, padding: '8px', textAlign: 'right', borderBottom: 'none' }}>TCC P75</th>
            <th style={{ fontWeight: 'bold', backgroundColor: '#E3F2FD', borderRight: '1px solid #E0E0E0', position: 'sticky', top: '48px', zIndex: 11, padding: '8px', textAlign: 'right', borderBottom: 'none' }}>TCC P90</th>
            
            {/* wRVU Sub-headers */}
            <th style={{ fontWeight: 'bold', backgroundColor: '#E8F5E8', position: 'sticky', top: '48px', zIndex: 11, padding: '8px', textAlign: 'right', borderBottom: 'none' }}># Orgs</th>
            <th style={{ fontWeight: 'bold', backgroundColor: '#E8F5E8', position: 'sticky', top: '48px', zIndex: 11, padding: '8px', textAlign: 'right', borderBottom: 'none' }}># Incumbents</th>
            <th style={{ fontWeight: 'bold', backgroundColor: '#E8F5E8', position: 'sticky', top: '48px', zIndex: 11, padding: '8px', textAlign: 'right', borderBottom: 'none' }}>wRVU P25</th>
            <th style={{ fontWeight: 'bold', backgroundColor: '#E8F5E8', position: 'sticky', top: '48px', zIndex: 11, padding: '8px', textAlign: 'right', borderBottom: 'none' }}>wRVU P50</th>
            <th style={{ fontWeight: 'bold', backgroundColor: '#E8F5E8', position: 'sticky', top: '48px', zIndex: 11, padding: '8px', textAlign: 'right', borderBottom: 'none' }}>wRVU P75</th>
            <th style={{ fontWeight: 'bold', backgroundColor: '#E8F5E8', borderRight: '1px solid #E0E0E0', position: 'sticky', top: '48px', zIndex: 11, padding: '8px', textAlign: 'right', borderBottom: 'none' }}>wRVU P90</th>
            
            {/* CF Sub-headers */}
            <th style={{ fontWeight: 'bold', backgroundColor: '#FFF3E0', position: 'sticky', top: '48px', zIndex: 11, padding: '8px', textAlign: 'right', borderBottom: 'none' }}># Orgs</th>
            <th style={{ fontWeight: 'bold', backgroundColor: '#FFF3E0', position: 'sticky', top: '48px', zIndex: 11, padding: '8px', textAlign: 'right', borderBottom: 'none' }}># Incumbents</th>
            <th style={{ fontWeight: 'bold', backgroundColor: '#FFF3E0', position: 'sticky', top: '48px', zIndex: 11, padding: '8px', textAlign: 'right', borderBottom: 'none' }}>CF P25</th>
            <th style={{ fontWeight: 'bold', backgroundColor: '#FFF3E0', position: 'sticky', top: '48px', zIndex: 11, padding: '8px', textAlign: 'right', borderBottom: 'none' }}>CF P50</th>
            <th style={{ fontWeight: 'bold', backgroundColor: '#FFF3E0', position: 'sticky', top: '48px', zIndex: 11, padding: '8px', textAlign: 'right', borderBottom: 'none' }}>CF P75</th>
            <th style={{ fontWeight: 'bold', backgroundColor: '#FFF3E0', position: 'sticky', top: '48px', zIndex: 11, padding: '8px', textAlign: 'right', borderBottom: 'none' }}>CF P90</th>
          </>
        )}
      </tr>
    </thead>
  );
});

AnalyticsTableHeader.displayName = 'AnalyticsTableHeader';
