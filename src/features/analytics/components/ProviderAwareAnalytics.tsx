/**
 * Provider-Aware Analytics Component
 * 
 * This component provides analytics that can switch between Physician and APP data
 * based on the current provider type selection from the sidebar.
 */

import React, { memo, useState, useEffect } from 'react';
import { useAnalyticsData, AnalyticsTable, AnalyticsFilters } from '../index';
import { useYear } from '../../../contexts/YearContext';
import { IndexedDBService } from '../../../services/IndexedDBService';

/**
 * Provider-Aware Analytics Component
 * 
 * Automatically detects the current provider type selection and shows
 * analytics for the appropriate data type (Physician, APP, or Both).
 */
export const ProviderAwareAnalytics: React.FC = memo(() => {
  const { currentYear } = useYear();
  const [selectedProviderType, setSelectedProviderType] = useState<'PHYSICIAN' | 'APP' | 'BOTH'>('PHYSICIAN');
  const [availableProviderTypes, setAvailableProviderTypes] = useState<Set<string>>(new Set(['PHYSICIAN']));
  
  // Detect what provider types are actually loaded
  useEffect(() => {
    const detectLoadedProviderTypes = async () => {
      try {
        const indexedDB = new IndexedDBService();
        const surveys = await indexedDB.getAllSurveys();
        
        const providerTypes = new Set<string>();
        surveys.forEach(survey => {
          const providerType = (survey as any).providerType;
          if (providerType) {
            providerTypes.add(providerType);
          } else {
            // If no provider type is set, assume it's physician data (legacy)
            providerTypes.add('PHYSICIAN');
          }
        });
        
        // Always include PHYSICIAN as default
        providerTypes.add('PHYSICIAN');
        
        setAvailableProviderTypes(providerTypes);
        
        // If current selection is not available, default to first available
        if (!providerTypes.has(selectedProviderType) && providerTypes.size > 0) {
          const firstType = Array.from(providerTypes)[0] as 'PHYSICIAN' | 'APP' | 'BOTH';
          setSelectedProviderType(firstType);
        }
      } catch (error) {
        console.error('Error detecting provider types:', error);
        // Fallback to just PHYSICIAN
        setAvailableProviderTypes(new Set(['PHYSICIAN']));
      }
    };
    
    detectLoadedProviderTypes();
  }, [selectedProviderType]);

  // Initialize analytics data hook with provider-specific filtering
  const {
    data,
    allData,
    loading,
    error,
    filters,
    setFilters,
    exportToExcel,
    exportToCSV
  } = useAnalyticsData({
    specialty: '',
    surveySource: '',
    geographicRegion: '',
    providerType: selectedProviderType === 'BOTH' ? '' : selectedProviderType,
    year: ''
  });

  // Generate filter options based on selected provider type
  const filterOptions = React.useMemo(() => {
    console.log('🔍 ProviderAwareAnalytics: Generating filter options for', selectedProviderType, 'from', allData.length, 'records');
    
    // Filter data based on selected provider type
    let filteredData = allData;
    if (selectedProviderType === 'PHYSICIAN') {
      filteredData = allData.filter(row => row.providerType === 'PHYSICIAN' || !row.providerType);
    } else if (selectedProviderType === 'APP') {
      filteredData = allData.filter(row => row.providerType === 'APP');
    }
    // For 'BOTH', use all data
    
    const availableSpecialties = [...new Set(filteredData.map(row => row.standardizedName).filter((item): item is string => Boolean(item)))].sort();
    const availableSources = [...new Set(filteredData.map(row => row.surveySource).filter((item): item is string => Boolean(item)))].sort();
    const availableRegions = [...new Set(filteredData.map(row => row.geographicRegion).filter((item): item is string => Boolean(item)))].sort();
    const availableProviderTypes = [...new Set(filteredData.map(row => row.providerType).filter((item): item is string => Boolean(item)))].sort();
    const availableYears = [...new Set(filteredData.map(row => row.surveyYear).filter((item): item is string => Boolean(item)))].sort();

    console.log('🔍 ProviderAwareAnalytics: Filter options - specialties:', availableSpecialties.length, 'sources:', availableSources.length, 'regions:', availableRegions.length, 'providerTypes:', availableProviderTypes.length, 'years:', availableYears.length);

    return {
      specialties: availableSpecialties,
      sources: availableSources,
      regions: availableRegions,
      providerTypes: availableProviderTypes,
      years: availableYears
    };
  }, [allData, selectedProviderType, currentYear]);

  const getProviderTypeLabel = (type: string) => {
    switch (type) {
      case 'PHYSICIAN': return 'Physician';
      case 'APP': return 'Advanced Practice Provider';
      case 'BOTH': return 'Both Provider Types';
      default: return type;
    }
  };

  const getProviderTypeColor = (type: string) => {
    switch (type) {
      case 'PHYSICIAN': return 'bg-green-100 text-green-800';
      case 'APP': return 'bg-blue-100 text-blue-800';
      case 'BOTH': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider Type Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Survey Analytics</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive analysis of compensation data
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Provider Type Selector */}
          <div className="flex items-center space-x-2">
            <label htmlFor="provider-type-select" className="text-sm font-medium text-gray-700">
              Data View:
            </label>
            <select
              id="provider-type-select"
              value={selectedProviderType}
              onChange={(e) => setSelectedProviderType(e.target.value as 'PHYSICIAN' | 'APP' | 'BOTH')}
              className="px-3 py-2 text-sm bg-white border-2 border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 transition-colors"
            >
              {availableProviderTypes.has('PHYSICIAN') && (
                <option value="PHYSICIAN">Physician</option>
              )}
              {availableProviderTypes.has('APP') && (
                <option value="APP">Advanced Practice Provider</option>
              )}
              {availableProviderTypes.has('PHYSICIAN') && availableProviderTypes.has('APP') && (
                <option value="BOTH">Both</option>
              )}
            </select>
          </div>
          
          {/* Provider Type Badge */}
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getProviderTypeColor(selectedProviderType)}`}>
            {getProviderTypeLabel(selectedProviderType)}
          </span>
        </div>
      </div>

      {/* Analytics Content */}
      <div className="flex flex-col space-y-6">
        {/* Filters Section */}
        <div className="w-full">
          <AnalyticsFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableSpecialties={filterOptions.specialties}
            availableSources={filterOptions.sources}
            availableRegions={filterOptions.regions}
            availableProviderTypes={filterOptions.providerTypes}
            availableYears={filterOptions.years}
          />
        </div>

        {/* Data Table Section */}
        <div className="w-full">
          <AnalyticsTable
            data={data}
            loading={loading}
            error={error}
            onExport={exportToExcel}
          />
        </div>
      </div>
    </div>
  );
});

ProviderAwareAnalytics.displayName = 'ProviderAwareAnalytics';

export default ProviderAwareAnalytics;
