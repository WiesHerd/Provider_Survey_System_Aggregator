import { Box, Typography, Table, TableBody, TableCell, TableRow, Grid } from '@mui/material';
import { forwardRef } from 'react';

interface Props {
  compareType: 'TCC' | 'wRVUs' | 'CFs';
  specialty: string;
  providerType: string;
  region: string;
  year: string;
  value: number;
  marketPercentile: number;
  marketData: { p25: number; p50: number; p75: number; p90: number };
  providerName?: string;
}

const FairMarketValuePrintable = forwardRef<HTMLDivElement, Props>(({
  compareType, specialty, providerType, region, year,
  value, marketPercentile, marketData, providerName
}, ref) => {
  // Label and formatting based on compareType
  let valueLabel = 'Total Compensation';
  let valuePrefix = '$';
  let valueSuffix = '';
  if (compareType === 'wRVUs') {
    valueLabel = 'Work RVUs';
    valuePrefix = '';
    valueSuffix = ' wRVUs';
  } else if (compareType === 'CFs') {
    valueLabel = 'Conversion Factor';
    valuePrefix = '$';
    valueSuffix = ' /wRVU';
  }
  const formatValue = (v: number) =>
    compareType === 'wRVUs'
      ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : v.toLocaleString();

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
          .fmv-print-title { font-size: 24px !important; font-weight: 700 !important; letter-spacing: 0.3px; }
          .fmv-print-section { font-size: 18px !important; font-weight: 700 !important; margin-bottom: 8px; }
          .fmv-print-table, .fmv-print-table th, .fmv-print-table td {
            border: 2px solid #222 !important;
            font-size: 16px !important;
            font-weight: 500 !important;
            color: #111 !important;
          }
          .fmv-print-table th, .fmv-print-table td { padding: 12px 16px !important; }
          .fmv-print-bold { font-weight: 800 !important; }
          .fmv-print-market-label { font-size: 15px !important; font-weight: 700 !important; }
          .fmv-print-market-value { font-size: 20px !important; font-weight: 800 !important; }
        }
      `}</style>
      {/* Header with title and provider name */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography className="fmv-print-title" sx={{ color: 'black', fontSize: 24, fontWeight: 700 }}>
          FMV Summary
        </Typography>
        {providerName && (
          <Typography sx={{ fontSize: 18, fontWeight: 600, color: 'black' }}>
            {providerName}
          </Typography>
        )}
      </Box>
      <Box sx={{ borderBottom: '2px solid #222', mb: 2 }} />
      {/* Position Details */}
      <Typography className="fmv-print-section" sx={{ color: 'black', mb: 0 }}>Position Details</Typography>
      <Table size="small" className="fmv-print-table" sx={{ mb: 3, minWidth: 400, border: '2px solid #222', borderRadius: 1 }}>
        <TableBody>
          <TableRow>
            <TableCell>{specialty}</TableCell>
            <TableCell>{providerType}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>{region}</TableCell>
            <TableCell>Year {year}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {/* Compensation/Productivity/CF Analysis */}
      <Typography className="fmv-print-section" sx={{ color: 'black', mb: 0 }}>{valueLabel} Analysis</Typography>
      <Table size="small" className="fmv-print-table" sx={{ mb: 3, minWidth: 400, border: '2px solid #222', borderRadius: 1 }}>
        <TableBody>
          <TableRow>
            <TableCell sx={{ width: '60%', fontSize: 16, fontWeight: 500, borderRight: '1.5px solid #222' }}>{valueLabel}</TableCell>
            <TableCell sx={{ width: '40%', textAlign: 'right', fontWeight: 700, fontSize: 20 }}>
              {valuePrefix}{formatValue(value)}{valueSuffix}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontSize: 16, fontWeight: 500, borderRight: '1.5px solid #222' }}>Market Percentile</TableCell>
            <TableCell sx={{ textAlign: 'right', fontWeight: 500, fontSize: 16 }}>
              {marketPercentile.toFixed(1)}th
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {/* Market Data */}
      <Typography className="fmv-print-section" sx={{ color: 'black', mb: 0 }}>Market Data</Typography>
      <Box sx={{ border: '2px solid #222', borderRadius: 1, mb: 3, p: 0 }}>
        <Grid container>
          {['25th', '50th', '75th', '90th'].map((label, i) => {
            const valueKey = ['p25', 'p50', 'p75', 'p90'][i] as keyof typeof marketData;
            return (
              <Grid item xs={3} key={label} sx={{
                borderRight: i < 3 ? '1.5px solid #222' : 'none',
                p: 2,
                textAlign: 'center',
              }}>
                <Typography className="fmv-print-market-label" sx={{ mb: 0.5 }}>{label} Percentile</Typography>
                <Typography className="fmv-print-market-value" sx={{ color: 'black' }}>
                  {valuePrefix}{formatValue(marketData[valueKey] ?? 0)}{valueSuffix}
                </Typography>
              </Grid>
            );
          })}
        </Grid>
      </Box>
      {/* Percentile Bar */}
      <Box sx={{ mt: 2, mb: 0 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" fontSize="1.1rem" mb={0.5}>
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>0th</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>100th</Typography>
        </Box>
        <Box position="relative" height={18} bgcolor="#e0e0e0" borderRadius={3} mb={1}>
          <Box
            sx={{
              position: 'absolute',
              left: `${Math.max(0, Math.min(100, marketPercentile))}%`,
              width: 22, height: 22,
              bgcolor: 'black',
              borderRadius: '50%',
              border: '3px solid white',
              boxShadow: 1,
              transform: 'translateX(-50%)',
              top: -2,
            }}
          />
        </Box>
        <Typography textAlign="center" fontSize={16} fontWeight={700} mt={1} mb={1}>
          In {marketPercentile.toFixed(1)}th percentile
        </Typography>
      </Box>
      
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

export default FairMarketValuePrintable; 