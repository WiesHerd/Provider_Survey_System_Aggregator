import React, { useRef } from 'react';
import { 
  Card, 
  Typography, 
  Divider, 
  Box, 
  Button 
} from '@mui/material';
import { useReactToPrint } from 'react-to-print';
import { useFMVData } from '../hooks/useFMVData';
import { FMVFilters } from './FMVFilters';
import { CompareTypeSelector } from './CompareTypeSelector';
import { TCCItemization } from './TCCItemization';
import { WRVUsInput } from './WRVUsInput';
import { CFInput } from './CFInput';
import { ResultsPanel } from './ResultsPanel';
import FairMarketValuePrintable from '../../../components/FairMarketValuePrintable';
import { FMVCalculatorProps } from '../types/fmv';

/**
 * Main FMV Calculator component that orchestrates all sub-components
 * 
 * @param onPrint - Optional callback for print functionality
 */
export const FMVCalculator: React.FC<FMVCalculatorProps> = ({ onPrint }) => {
  const {
    // State
    filters,
    compComponents,
    wrvus,
    cf,
    compareType,
    marketData,
    percentiles,
    uniqueValues,
    loading,
    error,
    
    // Calculated values
    tcc,
    tccFTEAdjusted,
    wrvusFTEAdjusted,
    
    // Actions
    updateFilters,
    setCompComponents,
    setWRVUs,
    setCF,
    setCompareType,
    resetFilters,
  } = useFMVData();

  // Print functionality
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: "@page { size: auto; margin: 0; }",
    documentTitle: "Fair Market Value Report"
  });

  // Handle print button click
  const handlePrintClick = () => {
    handlePrint();
    onPrint?.();
  };

  return (
    <>
      {/* Main App Content */}
      <div id="main-app-content" className="w-full bg-gray-50 min-h-screen">
        <Card sx={{
          p: 3,
          maxWidth: '90vw',
          width: '100%',
          margin: '40px auto 0 auto',
          boxShadow: 2,
          background: '#fff',
          borderRadius: 2,
          px: { xs: 2, sm: 4, md: 8 },
        }}>
          {/* Print Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handlePrintClick}
              sx={{
                borderRadius: '8px',
              }}
            >
              Print
            </Button>
          </Box>

          {/* Header */}
          <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
            Make your selections below to filter market data
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {/* Filters */}
          <Box sx={{ mb: 5 }}>
            <FMVFilters 
              filters={filters}
              onFiltersChange={updateFilters}
              uniqueValues={uniqueValues}
            />
          </Box>

          {/* Comparison Type Selector */}
          <CompareTypeSelector 
            compareType={compareType}
            onCompareTypeChange={setCompareType}
          />

          {/* Input Components based on comparison type */}
          {compareType === 'TCC' && (
            <TCCItemization 
              components={compComponents}
              onComponentsChange={setCompComponents}
            />
          )}
          
          {compareType === 'wRVUs' && (
            <WRVUsInput 
              value={wrvus}
              onChange={setWRVUs}
              fte={filters.fte}
            />
          )}
          
          {compareType === 'CFs' && (
            <CFInput 
              value={cf}
              onChange={setCF}
              fte={filters.fte}
            />
          )}

          {/* Results Panel */}
          <ResultsPanel 
            compareType={compareType}
            marketData={marketData}
            percentiles={percentiles}
            inputValue={
              compareType === 'TCC' ? tccFTEAdjusted : 
              compareType === 'wRVUs' ? wrvusFTEAdjusted : 
              Number(cf)
            }
            rawValue={
              compareType === 'TCC' ? Number(tcc) : 
              compareType === 'wRVUs' ? Number(wrvus) : 
              Number(cf)
            }
            fte={filters.fte}
            onResetFilters={resetFilters}
          />
        </Card>

        {/* Hidden printable component for react-to-print */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0, visibility: 'hidden' }}>
          <FairMarketValuePrintable
            ref={printRef}
            compareType={compareType}
            specialty={filters.specialty}
            providerType={filters.providerType}
            region={filters.region}
            year={filters.year}
            value={
              compareType === 'TCC' ? tcc : 
              compareType === 'wRVUs' ? Number(wrvus) : 
              Number(cf)
            }
            marketPercentile={
              compareType === 'TCC' ? percentiles.tcc ?? 0 :
              compareType === 'wRVUs' ? percentiles.wrvu ?? 0 :
              percentiles.cf ?? 0
            }
            marketData={
              compareType === 'TCC' ? (marketData?.tcc ?? { p25: 0, p50: 0, p75: 0, p90: 0 }) :
              compareType === 'wRVUs' ? (marketData?.wrvu ?? { p25: 0, p50: 0, p75: 0, p90: 0 }) :
              (marketData?.cf ?? { p25: 0, p50: 0, p75: 0, p90: 0 })
            }
          />
        </div>
      </div>
    </>
  );
};
