import React from 'react';
import { Box, Typography, Paper, Grid, Divider } from '@mui/material';
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

export const FairMarketValuePrintable: React.FC<PrintableFairMarketValueProps> = ({
  filters,
  compensation,
  productivity,
  marketData,
  conversionFactor,
}) => {
  const theme = useTheme();

  return (
    <Box 
      className="printable-report"
      sx={{ 
        p: 4, 
        maxWidth: '100%', 
        margin: '0 auto',
        '@media print': {
          padding: 0,
          margin: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'white',
          color: 'black',
          fontSize: '12pt',
          lineHeight: 1.5,
          pageBreakAfter: 'always',
          pageBreakInside: 'avoid',
        }
      }}
    >
      {/* Header */}
      <Box 
        sx={{ 
          textAlign: 'center', 
          mb: 4,
          '@media print': {
            marginBottom: '20px',
            pageBreakAfter: 'avoid',
          }
        }}
      >
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 'bold',
            '@media print': {
              fontSize: '24pt',
              marginBottom: '10px',
            }
          }}
        >
          Fair Market Value Analysis
        </Typography>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            color: 'text.secondary',
            '@media print': {
              fontSize: '14pt',
              color: 'black',
            }
          }}
        >
          {filters.specialty} {filters.providerType && `- ${filters.providerType}`} {filters.region && `- ${filters.region}`}
        </Typography>
      </Box>

      {/* Position Details */}
      <Box 
        sx={{ 
          mb: 4,
          '@media print': {
            marginBottom: '20px',
            pageBreakAfter: 'avoid',
          }
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            pb: 1,
            '@media print': {
              fontSize: '16pt',
              borderBottom: '1px solid black',
            }
          }}
        >
          Position Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: 'text.secondary',
                '@media print': {
                  color: 'black',
                  fontWeight: 'bold',
                }
              }}
            >
              Specialty
            </Typography>
            <Typography>{filters.specialty}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: 'text.secondary',
                '@media print': {
                  color: 'black',
                  fontWeight: 'bold',
                }
              }}
            >
              Provider Type
            </Typography>
            <Typography>{filters.providerType}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: 'text.secondary',
                '@media print': {
                  color: 'black',
                  fontWeight: 'bold',
                }
              }}
            >
              Region
            </Typography>
            <Typography>{filters.region}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: 'text.secondary',
                '@media print': {
                  color: 'black',
                  fontWeight: 'bold',
                }
              }}
            >
              Compare Type
            </Typography>
            <Typography>{filters.compareType}</Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Compensation Analysis */}
      <Box 
        sx={{ 
          mb: 4,
          '@media print': {
            marginBottom: '20px',
            pageBreakAfter: 'avoid',
          }
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            pb: 1,
            '@media print': {
              fontSize: '16pt',
              borderBottom: '1px solid black',
            }
          }}
        >
          Compensation Analysis
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: 'text.secondary',
                '@media print': {
                  color: 'black',
                  fontWeight: 'bold',
                }
              }}
            >
              Total Compensation
            </Typography>
            <Typography 
              variant="h5"
              sx={{
                '@media print': {
                  fontSize: '18pt',
                }
              }}
            >
              {formatCurrency(compensation.total)}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: 'text.secondary',
                '@media print': {
                  color: 'black',
                  fontWeight: 'bold',
                }
              }}
            >
              Market Percentile
            </Typography>
            <Typography 
              variant="h5"
              sx={{
                '@media print': {
                  fontSize: '18pt',
                }
              }}
            >
              {compensation.marketPercentile.toFixed(1)}th
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Compensation Components */}
      {compensation.components.length > 0 && (
        <Box 
          sx={{ 
            mb: 4,
            '@media print': {
              marginBottom: '20px',
              pageBreakAfter: 'avoid',
            }
          }}
        >
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
              pb: 1,
              '@media print': {
                fontSize: '16pt',
                borderBottom: '1px solid black',
              }
            }}
          >
            Compensation Components
          </Typography>
          <Grid container spacing={2}>
            {compensation.components.map((component) => (
              <Grid item xs={6} key={component.id}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    color: 'text.secondary',
                    '@media print': {
                      color: 'black',
                      fontWeight: 'bold',
                    }
                  }}
                >
                  {component.label}
                </Typography>
                <Typography>
                  {formatCurrency(parseFloat(component.value) || 0)}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Productivity Analysis */}
      {filters.compareType === 'wRVUs' && (
        <Box 
          sx={{ 
            mb: 4,
            '@media print': {
              marginBottom: '20px',
              pageBreakAfter: 'avoid',
            }
          }}
        >
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
              pb: 1,
              '@media print': {
                fontSize: '16pt',
                borderBottom: '1px solid black',
              }
            }}
          >
            Productivity Analysis
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  color: 'text.secondary',
                  '@media print': {
                    color: 'black',
                    fontWeight: 'bold',
                  }
                }}
              >
                Annual wRVUs
              </Typography>
              <Typography>
                {formatWRVUs(productivity.wrvus)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  color: 'text.secondary',
                  '@media print': {
                    color: 'black',
                    fontWeight: 'bold',
                  }
                }}
              >
                wRVU Percentile
              </Typography>
              <Typography>
                {productivity.wrvuPercentile.toFixed(1)}th
              </Typography>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Market Data */}
      {marketData && (
        <Box 
          sx={{ 
            '@media print': {
              pageBreakAfter: 'avoid',
            }
          }}
        >
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
              pb: 1,
              '@media print': {
                fontSize: '16pt',
                borderBottom: '1px solid black',
              }
            }}
          >
            Market Data
          </Typography>
          <Grid container spacing={2}>
            {['25th', '50th', '75th', '90th'].map((percentile) => {
              const key = `p${percentile.slice(0, 2)}` as keyof typeof marketData.tcc;
              return (
                <Grid item xs={3} key={percentile}>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      color: 'text.secondary',
                      '@media print': {
                        color: 'black',
                        fontWeight: 'bold',
                      }
                    }}
                  >
                    {percentile}
                  </Typography>
                  <Typography>
                    {filters.compareType === 'wRVUs'
                      ? formatWRVUs(marketData.wrvu[key])
                      : formatCurrency(marketData.tcc[key])}
                  </Typography>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Footer */}
      <Box 
        sx={{ 
          mt: 4, 
          pt: 2, 
          borderTop: `1px solid ${theme.palette.divider}`,
          '@media print': {
            marginTop: '20px',
            paddingTop: '10px',
            borderTop: '1px solid black',
            fontSize: '10pt',
            color: 'text.secondary',
          }
        }}
      >
        <Typography variant="body2" align="center">
          Generated on {new Date().toLocaleDateString()} | Fair Market Value Analysis Report
        </Typography>
      </Box>
    </Box>
  );
}; 