import { Box, Typography, Table, TableBody, TableCell, TableRow, TableHead } from '@mui/material';
import { forwardRef } from 'react';
import { RegionalData, VariableRegionalData } from '../features/regional/types/regional';
import { PERCENTILES } from '../features/regional/utils/regionalCalculations';
import { formatSpecialtyForDisplay } from '../shared/utils/formatters';

interface Props {
  data: RegionalData[] | VariableRegionalData[];
  selectedVariables: string[];
  variableMetadata: Record<string, { label: string; format: (value: number) => string }>;
  filters: {
    specialty?: string;
    providerType?: string;
    surveySource?: string;
    year?: string;
    dataCategory?: string;
  };
  regionNames: string[];
}

const RegionalPrintable = forwardRef<HTMLDivElement, Props>(({
  data,
  selectedVariables,
  variableMetadata,
  filters,
  regionNames
}, ref) => {
  // Determine if using variable-aware format
  const isVariableAware = data.length > 0 && 'variables' in data[0];
  
  // Get variables to display
  let variablesToDisplay: string[] = [];
  if (isVariableAware && selectedVariables.length > 0) {
    variablesToDisplay = selectedVariables;
  } else if (!isVariableAware) {
    // Legacy format: use TCC, CF, wRVU
    variablesToDisplay = ['tcc', 'tcc_per_work_rvu', 'work_rvus'];
  } else {
    // Fallback: extract from data if available
    const firstData = data[0] as VariableRegionalData;
    if (firstData.variables) {
      variablesToDisplay = Object.keys(firstData.variables);
    }
  }

  // Get variable formatting function
  const getVariableFormat = (variableName: string): (value: number) => string => {
    // Check if metadata provides format function
    if (variableMetadata[variableName] && typeof variableMetadata[variableName].format === 'function') {
      return variableMetadata[variableName].format;
    }
    
    // Default formatting based on variable name patterns
    const lower = variableName.toLowerCase();
    if (lower.includes('tcc') || lower.includes('compensation') || lower.includes('salary') || lower.includes('call')) {
      return (value: number) => value.toLocaleString();
    }
    if (lower.includes('per') || lower.includes('factor') || lower.includes('conversion')) {
      return (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Get variable label
  const getVariableLabel = (variableName: string): string => {
    if (variableMetadata[variableName]?.label) {
      return variableMetadata[variableName].label;
    }
    // Format variable name for display
    return variableName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get value from data (supports both formats)
  const getValue = (regionData: RegionalData | VariableRegionalData, variableName: string, percentile: string): number => {
    if ('variables' in regionData) {
      // Variable-aware format
      const varData = regionData.variables[variableName];
      return varData?.[percentile as 'p25' | 'p50' | 'p75' | 'p90'] || 0;
    } else {
      // Legacy format - map variable names to legacy fields
      const legacyMap: Record<string, Record<string, keyof RegionalData>> = {
        'tcc': { p25: 'tcc_p25', p50: 'tcc_p50', p75: 'tcc_p75', p90: 'tcc_p90' },
        'tcc_per_work_rvu': { p25: 'cf_p25', p50: 'cf_p50', p75: 'cf_p75', p90: 'cf_p90' },
        'work_rvus': { p25: 'wrvus_p25', p50: 'wrvus_p50', p75: 'wrvus_p75', p90: 'wrvus_p90' }
      };
      
      const fieldMap = legacyMap[variableName];
      if (fieldMap && fieldMap[percentile]) {
        return (regionData[fieldMap[percentile]] as number) || 0;
      }
      return 0;
    }
  };

  // Build filter summary text
  const filterSummary = [
    filters.specialty && `Specialty: ${formatSpecialtyForDisplay(filters.specialty)}`,
    filters.providerType && `Provider Type: ${filters.providerType}`,
    filters.surveySource && `Survey Source: ${filters.surveySource}`,
    filters.year && `Year: ${filters.year}`,
    filters.dataCategory && `Data Category: ${filters.dataCategory}`
  ].filter(Boolean).join(' • ');

  return (
    <Box
      ref={ref}
      sx={{
        fontFamily: 'Inter, Roboto, Arial, Helvetica, sans-serif',
        background: 'white',
        color: 'black',
        maxWidth: 650,
        margin: '0 auto',
        p: 4,
        paddingBottom: '80px',
        boxSizing: 'border-box',
        '@media print': {
          color: 'black',
          backgroundColor: 'white',
          boxShadow: 'none',
          '-webkit-print-color-adjust': 'exact',
          printColorAdjust: 'exact',
          padding: '32px',
          maxWidth: '650px',
          margin: '0 auto',
        }
      }}
    >
      {/* Global print CSS for strong borders, font, and spacing */}
      <style>{`
        @media print {
          body { background: white !important; }
          * { box-sizing: border-box; }
          .regional-print-title { font-size: 24px !important; font-weight: 700 !important; letter-spacing: 0.3px; }
          .regional-print-section { font-size: 18px !important; font-weight: 700 !important; margin-bottom: 8px; }
          .regional-print-table, .regional-print-table th, .regional-print-table td {
            border: 2px solid #222 !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            color: #111 !important;
          }
          .regional-print-table th, .regional-print-table td { padding: 8px 10px !important; }
          .regional-print-bold { font-weight: 800 !important; }
          .regional-print-variable-title { font-size: 16px !important; font-weight: 700 !important; margin-bottom: 8px !important; }
          .regional-print-avoid-break { page-break-inside: avoid; }
          .regional-print-section-wrapper { page-break-inside: avoid; margin-bottom: 24px !important; }
          /* Smart page breaks: break after every 2nd table, or when needed */
          .regional-print-section-wrapper:nth-of-type(2n) {
            page-break-after: auto;
          }
        }
      `}</style>
      
      {/* Header with title and filters */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography className="regional-print-title" sx={{ color: 'black', fontSize: 24, fontWeight: 700 }}>
          Regional Analytics Report
        </Typography>
      </Box>
      
      {/* Filter Summary */}
      {filterSummary && (
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 13, color: '#666' }}>
            {filterSummary}
          </Typography>
        </Box>
      )}
      
      <Box sx={{ borderBottom: '2px solid #222', mb: 2 }} />
      
      {/* Variable Tables */}
      {variablesToDisplay.map((variableName, varIndex) => {
        const variableLabel = getVariableLabel(variableName);
        const formatValue = getVariableFormat(variableName);
        // Smart page breaks: break after every 2nd table (0-indexed: after 1st, 3rd, 5th, etc.)
        const shouldBreakAfter = varIndex > 0 && varIndex % 2 === 1 && varIndex < variablesToDisplay.length - 1;
        
        return (
          <Box
            key={variableName}
            className="regional-print-section-wrapper"
            sx={{
              mb: 3,
              pageBreakAfter: shouldBreakAfter ? 'always' : 'auto',
              pageBreakInside: 'avoid'
            }}
          >
            {/* Variable Title */}
            <Typography className="regional-print-variable-title" sx={{ color: 'black', mb: 1 }}>
              {variableLabel}
            </Typography>
            
            {/* Regional Comparison Table */}
            <Table 
              size="small" 
              className="regional-print-table regional-print-avoid-break" 
              sx={{ 
                mb: 0, 
                width: '100%', 
                border: '2px solid #222',
                pageBreakInside: 'avoid'
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ 
                    fontSize: 13, 
                    fontWeight: 700, 
                    borderRight: '1.5px solid #222',
                    backgroundColor: '#f5f5f5',
                    padding: '8px 10px'
                  }}>
                    Percentile
                  </TableCell>
                  {regionNames.map(region => (
                    <TableCell 
                      key={region}
                      sx={{ 
                        fontSize: 13, 
                        fontWeight: 700, 
                        textAlign: 'center',
                        borderRight: region !== regionNames[regionNames.length - 1] ? '1.5px solid #222' : 'none',
                        backgroundColor: '#f5f5f5',
                        padding: '8px 10px'
                      }}
                    >
                      {region}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {PERCENTILES.map((p, index) => {
                  const typedData = data as (RegionalData | VariableRegionalData)[];
                  
                  return (
                    <TableRow key={p.key}>
                      <TableCell sx={{ 
                        fontSize: 13, 
                        fontWeight: 500, 
                        borderRight: '1.5px solid #222',
                        backgroundColor: index % 2 === 0 ? 'white' : '#fafafa',
                        padding: '8px 10px'
                      }}>
                        {p.label}
                      </TableCell>
                      {regionNames.map(region => {
                        const regionData = typedData.find(d => d.region === region);
                        const value = regionData ? getValue(regionData, variableName, p.key) : 0;
                        
                        return (
                          <TableCell
                            key={region}
                            sx={{
                              fontSize: 13,
                              fontWeight: 500,
                              textAlign: 'right',
                              borderRight: region !== regionNames[regionNames.length - 1] ? '1.5px solid #222' : 'none',
                              backgroundColor: index % 2 === 0 ? 'white' : '#fafafa',
                              padding: '8px 10px'
                            }}
                          >
                            {value > 0 ? formatValue(value) : '—'}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        );
      })}
      
      {/* Footer - positioned at bottom of page */}
      <Box sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        mt: 6, 
        pt: 3, 
        borderTop: '1px solid #ccc',
        backgroundColor: 'white',
        padding: '12px 24px'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img src={process.env.PUBLIC_URL + '/benchpoint-icon.svg'} alt="BenchPoint Logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            <Typography sx={{ fontWeight: 700, fontSize: 16, letterSpacing: 1, fontFamily: 'inherit' }}>
              <span style={{ color: '#4F46E5' }}>Bench</span>
              <span style={{ color: '#7C3AED' }}>Point</span>
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 12, color: '#666' }}>
            Generated: {new Date().toLocaleDateString()}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
});

RegionalPrintable.displayName = 'RegionalPrintable';

export default RegionalPrintable;

