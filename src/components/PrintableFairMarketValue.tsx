import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';

type CompareType = 'TCC' | 'wRVUs' | 'CFs';

interface CompensationComponent {
  id: string;
  name: string;
  value: string;
  label: string;
}

interface MarketData {
  tcc: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  wrvu: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  cf: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

interface PrintableFairMarketValueProps {
  filters: {
    specialty: string;
    providerType: string;
    region: string;
    compareType: CompareType;
  };
  compensation: {
    total: number;
    components: CompensationComponent[];
    marketPercentile: number;
  };
  productivity: {
    wrvus: number;
    wrvuPercentile: number;
  };
  marketData: MarketData | null;
  conversionFactor: number;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatWRVUs = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

export const PrintableFairMarketValue: React.FC<PrintableFairMarketValueProps> = ({
  filters,
  compensation,
  productivity,
  marketData,
  conversionFactor,
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ p: 4, maxWidth: 800, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        Fair Market Value Analysis
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Position Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">Specialty</Typography>
            <Typography>{filters.specialty}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">Provider Type</Typography>
            <Typography>{filters.providerType}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">Region</Typography>
            <Typography>{filters.region}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">Compare Type</Typography>
            <Typography>{filters.compareType}</Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Compensation Analysis
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">Total Compensation</Typography>
            <Typography variant="h5">{formatCurrency(compensation.total)}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">Market Percentile</Typography>
            <Typography variant="h5">{compensation.marketPercentile.toFixed(1)}th</Typography>
          </Grid>
        </Grid>
      </Paper>

      {filters.compareType === 'wRVUs' && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Productivity Analysis
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">Annual wRVUs</Typography>
              <Typography>{formatWRVUs(productivity.wrvus)}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">wRVU Percentile</Typography>
              <Typography>{productivity.wrvuPercentile.toFixed(1)}th</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {marketData && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Market Data
          </Typography>
          <Grid container spacing={2}>
            {['25th', '50th', '75th', '90th'].map((percentile) => {
              const key = `p${percentile.slice(0, 2)}` as keyof typeof marketData.tcc;
              return (
                <Grid item xs={3} key={percentile}>
                  <Typography variant="subtitle2" color="text.secondary">{percentile}</Typography>
                  <Typography>
                    {filters.compareType === 'wRVUs'
                      ? formatWRVUs(marketData.wrvu[key])
                      : formatCurrency(marketData.tcc[key])}
                  </Typography>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      )}
    </Box>
  );
}; 