/**
 * Analytics Table Style Constants
 * 
 * Centralized style definitions for the analytics table components.
 * Following enterprise patterns for maintainable styling.
 */

export const TABLE_STYLES = {
  // Container styles
  container: {
    overflow: 'hidden' as const,
  },
  
  tableWrapper: {
    maxHeight: '600px',
    maxWidth: '100%',
    overflow: 'auto' as const,
    backgroundColor: 'white',
    position: 'relative' as const,
  },
  
  table: {
    minWidth: '1200px',
    borderSpacing: '0',
    borderCollapse: 'collapse' as const,
    position: 'relative' as const,
  },
  
  // Header styles
  header: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  
  surveyDataHeader: {
    fontWeight: 'bold' as const,
    backgroundColor: '#F5F5F5',
    borderRight: '1px solid #E0E0E0',
    borderBottom: 'none',
    textAlign: 'center' as const,
    color: '#424242',
    minWidth: '440px',
    padding: '12px 8px',
  },
  
  surveyDataHeaderFrozen: {
    backgroundColor: '#e9ecef',
    position: 'sticky' as const,
    left: 0,
    top: 0,
    zIndex: 15,
    boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
  },
  
  // Sub-header styles
  subHeader: {
    fontWeight: 'bold' as const,
    padding: '8px',
    textAlign: 'left' as const,
    borderBottom: 'none',
  },
  
  subHeaderFrozen: {
    position: 'sticky' as const,
    top: '48px',
    zIndex: 15,
    boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
  },
  
  // Data row styles
  dataRow: {
    padding: '8px',
  },
  
  dataCellFrozen: {
    position: 'sticky' as const,
    backgroundColor: '#f8f9fa',
    borderRight: '1px solid #e0e0e0',
    zIndex: 5,
    boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
  },
  
  // Summary row styles
  summaryRowSimple: {
    backgroundColor: '#f5f5f5',
    borderTop: '1px solid #d1d5db',
  },
  
  summaryRowWeighted: {
    backgroundColor: '#e8eaf6',
    borderBottom: '1px solid #d1d5db',
  },
  
  summaryCell: {
    fontWeight: 'bold' as const,
    textAlign: 'right' as const,
    padding: '8px',
  },
  
  // Variable column styles
  variableColumn: {
    textAlign: 'right' as const,
    padding: '8px',
    borderBottom: 'none',
  },
  
  variableColumnSticky: {
    position: 'sticky' as const,
    top: '48px',
    zIndex: 11,
  },
  
  // Color schemes for different variable types
  variableColors: {
    tcc: '#E3F2FD',
    wrvu: '#E8F5E8',
    cf: '#FFF3E0',
  },
  
  // Fallback styles
  fallbackCell: {
    textAlign: 'center' as const,
    color: '#9ca3af',
    padding: '8px',
  },
} as const;

export const getVariableBackgroundColor = (variableName: string, index: number): string => {
  const colors = [
    '#E3F2FD', // Blue
    '#E8F5E8', // Green  
    '#FFF3E0', // Orange
    '#F3E5F5', // Purple
    '#E0F2F1', // Teal
  ];
  
  return colors[index % colors.length];
};

export const getFrozenCellStyle = (freezeLeftColumns: boolean, left: string) => ({
  position: freezeLeftColumns ? ('sticky' as const) : ('static' as const),
  left: freezeLeftColumns ? left : 'auto',
  backgroundColor: freezeLeftColumns ? '#f8f9fa' : 'white',
  borderRight: '1px solid #e0e0e0',
  zIndex: freezeLeftColumns ? 5 : 'auto',
  padding: '8px',
  boxShadow: freezeLeftColumns ? '2px 0 5px rgba(0,0,0,0.1)' : 'none',
});
