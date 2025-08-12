import React from 'react';
import { 
  Paper, 
  Typography, 
  Grid, 
  Box, 
  Button 
} from '@mui/material';
import { keyframes } from '@mui/system';
import { ResultsPanelProps } from '../types/fmv';
import { formatFMVValue } from '../utils/fmvCalculations';

// CSS keyframes for marker pulse animation
const markerPulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(33, 150, 243, 0); }
  100% { box-shadow: 0 0 0 0 rgba(33, 150, 243, 0); }
`;

/**
 * Results Panel component for displaying market comparison results
 * 
 * @param compareType - Type of comparison being displayed
 * @param marketData - Market data with percentiles
 * @param percentiles - User percentile rankings
 * @param inputValue - User's input value
 * @param rawValue - Raw user value
 * @param fte - FTE value
 * @param onResetFilters - Optional callback to reset filters
 */
export const ResultsPanel: React.FC<ResultsPanelProps> = ({ 
  compareType, 
  marketData, 
  percentiles, 
  inputValue, 
  rawValue, 
  fte, 
  onResetFilters 
}) => {
  // Get the appropriate percentile data based on comparison type
  const percentileData = 
    compareType === 'wRVUs' ? marketData?.wrvu :
    compareType === 'TCC' ? marketData?.tcc :
    compareType === 'CFs' ? marketData?.cf :
    undefined;

  const currentPercentile = 
    compareType === 'wRVUs' ? percentiles.wrvu :
    compareType === 'TCC' ? percentiles.tcc :
    compareType === 'CFs' ? percentiles.cf :
    null;

  // Check if market data is available
  const noMarketData = !percentileData;

  return (
    <Paper sx={{ 
      p: 2, 
      mt: 3, 
      border: '1.5px solid #b0b4bb', 
      boxShadow: 'none' 
    }}>
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
        Market Comparison
      </Typography>
      
      {noMarketData ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No market data available for these filters.
          </Typography>
          {onResetFilters && (
            <Button 
              variant="outlined" 
              size="small" 
              onClick={onResetFilters}
              sx={{
                borderRadius: '8px',
              }}
            >
              Reset Filters
            </Button>
          )}
        </Box>
      ) : (
        <>
          {/* Percentile Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {['25th', '50th', '75th', '90th'].map((percentile) => {
              const key = `p${percentile.slice(0, 2)}` as keyof typeof percentileData;
              return (
                <Grid item xs={12} sm={6} md={3} key={percentile}>
                  <Paper sx={{ 
                    p: 1.5, 
                    textAlign: 'center', 
                    background: '#f8fafc', 
                    boxShadow: 2, 
                    border: '1.5px solid #b0b4bb' 
                  }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {percentile} Percentile
                    </Typography>
                    <Typography variant="h6">
                      {percentileData && percentileData[key] != null
                        ? formatFMVValue(percentileData[key], compareType)
                        : '-'}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>

          {/* Percentile Visualization */}
          <Box sx={{ mt: 7, mb: 2, textAlign: 'center' }}>
            {typeof currentPercentile === 'number' && !isNaN(currentPercentile) ? (
              <Typography
                variant="h6"
                gutterBottom
                color="primary"
                sx={{ fontWeight: 700, fontSize: '1.35rem', mb: 2 }}
              >
                You are in the {currentPercentile.toFixed(2)}th percentile
              </Typography>
            ) : (
              <Typography variant="h6" gutterBottom color="text.secondary" sx={{ mb: 2 }}>
                Enter a value to see your percentile
              </Typography>
            )}
            
            {/* Percentile Bar */}
            <Box sx={{ 
              position: 'relative', 
              height: 6, 
              bgcolor: 'grey.200', 
              borderRadius: 2, 
              mt: 3 
            }}>
              <Box
                sx={{
                  position: 'absolute',
                  left: `${typeof currentPercentile === 'number' && !isNaN(currentPercentile) ? currentPercentile : 0}%`,
                  top: -8,
                  width: 24,
                  height: 24,
                  bgcolor: 'primary.main',
                  border: '3px solid #fff',
                  boxShadow: 1,
                  borderRadius: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 1,
                  animation: `${markerPulse} 1.5s infinite`,
                }}
              />
              <Box sx={{ 
                position: 'absolute', 
                left: 0, 
                top: 0, 
                width: '100%', 
                height: 6, 
                bgcolor: 'primary.main', 
                borderRadius: 2, 
                opacity: 0.2 
              }} />
            </Box>
            
            {/* Percentile Labels */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                0th
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                100th
              </Typography>
            </Box>
          </Box>
        </>
      )}
    </Paper>
  );
};
