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
}

const FairMarketValuePrintable = forwardRef<HTMLDivElement, Props>(({
  compareType, specialty, providerType, region, year,
  value, marketPercentile, marketData
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
          .fmv-print-title { font-size: 32px !important; font-weight: 800 !important; letter-spacing: 0.5px; }
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
      {/* Header with real logo */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <img src="/Icon.png" alt="BenchPoint Logo" style={{ width: 40, height: 40, objectFit: 'contain', marginRight: 16 }} />
          <Typography sx={{ fontWeight: 700, fontSize: 28, letterSpacing: 1, fontFamily: 'inherit' }}>BenchPoint</Typography>
        </Box>
        <Box textAlign="right">
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'black', mb: 0.5 }}>Fair Market Value Report</Typography>
          <Typography sx={{ fontSize: 13, color: 'black' }}>Generated: {new Date().toLocaleDateString()}</Typography>
        </Box>
      </Box>
      <Box sx={{ borderBottom: '2px solid #222', mb: 2 }} />
      {/* Title */}
      <Typography className="fmv-print-title" sx={{ mb: 2, mt: 1, color: 'black', textAlign: 'left' }}>
        Fair Market Value Summary
      </Typography>
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
      <Box sx={{ border: '2px solid #222', borderRadius: 1, mb: 3 }}>
        <Grid container>
          <Grid item xs={7} sx={{ p: 1.5, borderRight: '1.5px solid #222', fontSize: 16, fontWeight: 500 }}>{valueLabel}</Grid>
          <Grid item xs={5} sx={{ p: 1.5, textAlign: 'right', fontWeight: 700, fontSize: 20 }}>
            {valuePrefix}{formatValue(value)}{valueSuffix}
          </Grid>
        </Grid>
        <Box sx={{ borderTop: '1.5px solid #222' }} />
        <Grid container>
          <Grid item xs={7} sx={{ p: 1.5, borderRight: '1.5px solid #222', fontSize: 16, fontWeight: 500 }}>Market Percentile</Grid>
          <Grid item xs={5} sx={{ p: 1.5, textAlign: 'right', fontWeight: 500, fontSize: 16 }}>
            {marketPercentile.toFixed(1)}th
          </Grid>
        </Grid>
      </Box>
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
    </Box>
  );
});

export default FairMarketValuePrintable; 