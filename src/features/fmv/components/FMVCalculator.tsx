import React, { useRef } from 'react';
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
    <div className="min-h-screen bg-gray-50">
      {/* Main Container with proper spacing and max-width */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Fair Market Value Calculator
              </h1>
              <p className="text-lg text-gray-600">
                Compare your compensation against market benchmarks
              </p>
            </div>
            <button
              onClick={handlePrintClick}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Report
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Market Data Filters
            </h2>
            <p className="text-sm text-gray-600">
              Select criteria to filter the market data for comparison
            </p>
          </div>
          <FMVFilters 
            filters={filters}
            onFiltersChange={updateFilters}
            uniqueValues={uniqueValues}
          />
        </div>

        {/* Comparison Type Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Comparison Type
            </h2>
            <p className="text-sm text-gray-600">
              Choose what type of compensation data you want to compare
            </p>
          </div>
          <CompareTypeSelector 
            compareType={compareType}
            onCompareTypeChange={setCompareType}
          />
        </div>

        {/* Input Components based on comparison type */}
        {compareType === 'TCC' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Total Cash Compensation
              </h2>
              <p className="text-sm text-gray-600">
                Enter your compensation components for analysis
              </p>
            </div>
            <TCCItemization 
              components={compComponents}
              onComponentsChange={setCompComponents}
            />
          </div>
        )}
        
        {compareType === 'wRVUs' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Work RVUs
              </h2>
              <p className="text-sm text-gray-600">
                Enter your Work RVU data for productivity analysis
              </p>
            </div>
            <WRVUsInput 
              value={wrvus}
              onChange={setWRVUs}
              fte={filters.fte}
            />
          </div>
        )}
        
        {compareType === 'CFs' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Conversion Factor
              </h2>
              <p className="text-sm text-gray-600">
                Enter your conversion factor for analysis
              </p>
            </div>
            <CFInput 
              value={cf}
              onChange={setCF}
              fte={filters.fte}
            />
          </div>
        )}

        {/* Results Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
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
        </div>

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
    </div>
  );
};
