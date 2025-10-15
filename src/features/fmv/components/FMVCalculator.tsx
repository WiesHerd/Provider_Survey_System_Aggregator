import React, { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useFMVData } from '../hooks/useFMVData';
import { FMVFilters } from './FMVFilters';
import { TCCItemization } from './TCCItemization';
import { WRVUsInput } from './WRVUsInput';
import { CFInput } from './CFInput';
import { ResultsPanel } from './ResultsPanel';
import BlendedResultsPanel from './BlendedResultsPanel';
import { SavedFMVManager } from './SavedFMVManager';
import FairMarketValuePrintable from '../../../components/FairMarketValuePrintable';
import { UnifiedLoadingSpinner } from '../../../shared/components/UnifiedLoadingSpinner';
import { useSmoothProgress } from '../../../shared/hooks/useSmoothProgress';
import { FMVCalculatorProps, SavedFMVCalculation } from '../types/fmv';

/**
 * Main FMV Calculator component that orchestrates all sub-components
 * 
 * @param onPrint - Optional callback for print functionality
 */
export const FMVCalculator: React.FC<FMVCalculatorProps> = ({ onPrint }) => {
  // Use smooth progress for dynamic loading
  const { progress, startProgress, completeProgress } = useSmoothProgress({
    duration: 3000,
    maxProgress: 90,
    intervalMs: 100
  });
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
    surveyCount,
    blendedData,
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

  // Track current provider name for printing
  const [currentProviderName, setCurrentProviderName] = useState<string>('');
  
  // Track saved calculations count for conditional rendering
  const [savedCalculationsCount, setSavedCalculationsCount] = useState<number>(0);

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

  // Handle saving a calculation
  const handleSaveCalculation = (calculation: Omit<SavedFMVCalculation, 'id' | 'created' | 'lastModified'>) => {
    // This will be handled by the SavedFMVManager component
    console.log('Saving FMV calculation:', calculation);
  };

  // Handle loading a saved calculation
  const handleLoadCalculation = (calculation: SavedFMVCalculation) => {
    // Update filters
    updateFilters(calculation.filters);
    
    // Update compensation components
    setCompComponents(calculation.compComponents);
    
    // Update other values
    setWRVUs(calculation.wrvus);
    setCF(calculation.cf);
    setCompareType(calculation.compareType);
    
    // Set provider name for printing
    setCurrentProviderName(calculation.providerName);
    
    console.log('Loaded FMV calculation:', calculation);
  };

  // Handle deleting a saved calculation
  const handleDeleteCalculation = (id: string) => {
    console.log('Deleting FMV calculation:', id);
  };

  // Get current calculation data for saving
  const getCurrentCalculationData = () => {
    if (!marketData) return undefined;

    const calculatedValue = compareType === 'TCC' ? tccFTEAdjusted : 
                           compareType === 'wRVUs' ? wrvusFTEAdjusted : 
                           Number(cf);

    const marketPercentile = compareType === 'TCC' ? (percentiles.tcc ?? 0) :
                            compareType === 'wRVUs' ? (percentiles.wrvu ?? 0) :
                            (percentiles.cf ?? 0);

    return {
      providerName: currentProviderName || 'Unnamed Provider',
      filters,
      compComponents,
      wrvus,
      cf,
      compareType,
      marketData,
      percentiles,
      calculatedValue,
      marketPercentile
    };
  };

  // Start progress animation when loading begins
  React.useEffect(() => {
    if (loading) {
      startProgress();
    } else {
      completeProgress();
    }
  }, [loading, startProgress, completeProgress]);

  // Show loading state
  if (loading) {
    return (
      <UnifiedLoadingSpinner
        message="Loading Fair Market Value data..."
        recordCount={0}
        progress={progress}
        showProgress={true}
      />
    );
  }

  return (
    <div className="w-full min-h-screen pb-8">
      <div className="w-full flex flex-col gap-4">
        {/* Integrated Data Configuration */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Data Configuration
              </h2>
              <p className="text-sm text-gray-600">
                Configure market data filters and specialty selection
              </p>
            </div>
            <button
              onClick={handlePrintClick}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Report
            </button>
          </div>
          
          {/* Standard Market Data Filters */}
          <FMVFilters 
            filters={filters}
            onFiltersChange={updateFilters}
            uniqueValues={uniqueValues}
          />
        </div>


        {/* Provider Name and Comparison Type */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            {/* Provider Name - Left Side */}
            <div className="w-80">
              <label htmlFor="provider-name" className="block text-sm font-medium text-gray-700 mb-2">
                Provider Name
              </label>
              <input
                id="provider-name"
                type="text"
                value={currentProviderName}
                onChange={(e) => setCurrentProviderName(e.target.value)}
                placeholder="Dr. John Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              />
            </div>
            
            {/* Comparison Type - Right Side with Better Styling */}
            <div className="flex items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comparison Type
                </label>
                <div className="inline-flex bg-gray-100 rounded-xl p-1 shadow-inner">
                  <button
                    onClick={() => setCompareType('TCC')}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      compareType === 'TCC'
                        ? 'bg-white text-blue-600 shadow-md border border-blue-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    TCC
                  </button>
                  <button
                    onClick={() => setCompareType('wRVUs')}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      compareType === 'wRVUs'
                        ? 'bg-white text-blue-600 shadow-md border border-blue-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    wRVUs
                  </button>
                  <button
                    onClick={() => setCompareType('CFs')}
                    className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      compareType === 'CFs'
                        ? 'bg-white text-blue-600 shadow-md border border-blue-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    CF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Input Components based on comparison type */}
        {compareType === 'TCC' && (
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
              fte={filters.fte}
              onFTEChange={(fte) => updateFilters({ fte })}
            />
          </div>
        )}
        
        {compareType === 'wRVUs' && (
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
              onFTEChange={(fte) => updateFilters({ fte })}
            />
          </div>
        )}
        
        {compareType === 'CFs' && (
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {filters.useSpecialtyBlending && blendedData ? (
            <BlendedResultsPanel
              blendedData={blendedData}
              compareType={compareType}
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
              aggregationMethod={filters.aggregationMethod}
              surveyCount={surveyCount}
            />
          ) : (
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
              aggregationMethod={filters.aggregationMethod}
              surveyCount={surveyCount}
              isFilteringSpecificSurvey={filters.surveySource !== 'All Sources'}
              onResetFilters={resetFilters}
              onAggregationMethodChange={(method) => updateFilters({ aggregationMethod: method })}
            />
          )}
        </div>

        {/* Saved Calculations Manager - Hide when no calculations exist */}
        <div className={`${savedCalculationsCount > 0 ? 'mt-8' : 'hidden'}`}>
          <SavedFMVManager
            onLoadCalculation={handleLoadCalculation}
            onSaveCalculation={handleSaveCalculation}
            onDeleteCalculation={handleDeleteCalculation}
            onCalculationsCountChange={setSavedCalculationsCount}
            currentCalculation={getCurrentCalculationData()}
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
            providerName={currentProviderName}
          />
        </div>
      </div>
    </div>
  );
};
