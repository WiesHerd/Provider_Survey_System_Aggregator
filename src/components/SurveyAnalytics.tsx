import React, { useEffect, useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Autocomplete,
  TextField,
} from '@mui/material';
import { 
  DocumentTextIcon
} from '@heroicons/react/24/outline';

import { getDataService } from '../services/DataService';
import { ISurveyRow } from '../types/survey';
import { ISpecialtyMapping, ISourceSpecialty } from '../types/specialty';
import LoadingSpinner from './ui/loading-spinner';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { formatSpecialtyForDisplay, formatRegionForDisplay } from '../shared/utils/formatters';
import { fuzzyMatchSpecialty, filterSpecialtyOptions } from '../shared/utils/specialtyMatching';
import { useYear } from '../contexts/YearContext';
import { performanceMonitor } from '../shared/utils/performance';
import { analyticsDataService } from '../features/analytics/services/analyticsDataService';
import { filterAnalyticsData } from '../features/analytics/utils/analyticsCalculations';
import { AggregatedData, AnalyticsFilters } from '../features/analytics/types/analytics';

const SHOW_DEBUG = false; // Set to false for production performance

// Utility functions
const calculatePercentile = (numbers: number[], percentile: number): number => {
  if (numbers.length === 0) return 0;
  const sortedNumbers = numbers.sort((a, b) => a - b);
  const index = Math.floor((percentile / 100) * sortedNumbers.length);
  return sortedNumbers[index] || 0;
};

const formatCurrency = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

const SurveyAnalytics = React.memo(function SurveyAnalytics() {
  // Export functions
  const exportToExcel = () => {
    const headers = [
      'Survey Source',
      'Specialty',
      'Geographic Region',
      'Provider Type',
      'N Orgs',
      'N Incumbents',
      'TCC P25',
      'TCC P50',
      'TCC P75',
      'TCC P90',
      'wRVU P25',
      'wRVU P50',
      'wRVU P75',
      'wRVU P90',
      'CF P25',
      'CF P50',
      'CF P75',
      'CF P90'
    ];

    const csvData = aggregatedData.map(row => [
      row.surveySource,
      row.standardizedName,
      row.geographicRegion,
      row.providerType,
      row.tcc_n_orgs || 0,
      row.tcc_n_incumbents || 0,
      row.tcc_p25,
      row.tcc_p50,
      row.tcc_p75,
      row.tcc_p90,
      row.wrvu_p25,
      row.wrvu_p50,
      row.wrvu_p75,
      row.wrvu_p90,
      row.cf_p25,
      row.cf_p50,
      row.cf_p75,
      row.cf_p90
    ]);

    // Convert to CSV string
    const csvContent = csvData
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Create and download file
    const blob = new Blob([headers.join(',') + '\n' + csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_data_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allAnalyticsData, setAllAnalyticsData] = useState<AggregatedData[]>([]);
  
  // Persist filters in localStorage to survive component re-renders (e.g., sidebar toggle)
  const [filters, setFilters] = useState(() => {
    try {
      const savedFilters = localStorage.getItem('analyticsFilters');
      if (savedFilters) {
        return JSON.parse(savedFilters);
      }
    } catch (error) {
      console.warn('Failed to load saved filters:', error);
    }
    return {
      specialty: '',
      providerType: '',
      region: '',
      surveySource: ''
    };
  });

  const { currentYear, availableYears, setCurrentYear } = useYear();
  const dataService = useMemo(() => getDataService(), []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('analyticsFilters', JSON.stringify(filters));
    } catch (error) {
      console.warn('Failed to save filters:', error);
    }
  }, [filters]);

  // Load analytics data using the proper analytics service
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🔍 SurveyAnalytics: Loading analytics data...');
        
        // Force refresh cache to ensure we get the latest data with the fixed aggregation logic
        analyticsDataService.forceRefreshCache();
        
        // Get all analytics data (unfiltered)
        const allData = await analyticsDataService.getAnalyticsData();
        setAllAnalyticsData(allData);
        
        console.log('🔍 SurveyAnalytics: Loaded analytics data:', {
          totalRecords: allData.length,
          specialties: [...new Set(allData.map(d => d.standardizedName))].slice(0, 10),
          sources: [...new Set(allData.map(d => d.surveySource))],
          regions: [...new Set(allData.map(d => d.geographicRegion))]
        });
        
      } catch (error) {
        console.error('🔍 SurveyAnalytics: Error loading analytics data:', error);
        setError('Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, [currentYear]);

  // FIXED: Use new analytics filtering for consistent data
  const aggregatedData = useMemo(() => {
    if (!allAnalyticsData || allAnalyticsData.length === 0) {
      console.log('No analytics data available');
      return [];
    }

    // Convert filters to analytics format
    const analyticsFilters: AnalyticsFilters = {
      specialty: filters.specialty || '',
      surveySource: filters.surveySource || '',
      geographicRegion: filters.region || '',
      providerType: filters.providerType || '',
      year: currentYear || ''
    };

    console.log('🔍 SurveyAnalytics: Filtering analytics data with filters:', analyticsFilters);

    // Use the new analytics filtering function
    const filteredData = filterAnalyticsData(allAnalyticsData, analyticsFilters);
    
    console.log('🔍 SurveyAnalytics: Filtered data results:', {
      originalCount: allAnalyticsData.length,
      filteredCount: filteredData.length,
      sampleData: filteredData.slice(0, 3).map(d => ({
        specialty: d.standardizedName,
        source: d.surveySource,
        region: d.geographicRegion,
        providerType: d.providerType,
        tcc_p50: d.tcc_p50,
        wrvu_p50: d.wrvu_p50,
        cf_p50: d.cf_p50
      }))
    });

    return filteredData;
  }, [allAnalyticsData, filters, currentYear]);

  // Get unique values for filter options
  const uniqueValues = useMemo(() => {
    const values = {
      specialties: new Set<string>(),
      providerTypes: new Set<string>(),
      regions: new Set<string>(),
      surveySources: new Set<string>()
    };

    allAnalyticsData.forEach(row => {
      if (row.standardizedName) values.specialties.add(row.standardizedName);
      if (row.providerType) values.providerTypes.add(row.providerType);
      if (row.geographicRegion) values.regions.add(row.geographicRegion);
      if (row.surveySource) values.surveySources.add(row.surveySource);
    });

    return {
      specialties: Array.from(values.specialties).sort(),
      providerTypes: Array.from(values.providerTypes).sort(),
      regions: Array.from(values.regions).sort(),
      surveySources: Array.from(values.surveySources).sort()
    };
  }, [allAnalyticsData]);

  // Debounced filter change handler
  const debouncedFilterChange = useMemo(
    () => performanceMonitor.debounce((filterName: string, value: string) => {
      setFilters((prev: typeof filters) => {
        const newFilters = { ...prev, [filterName]: value };
        
        if (filterName === 'specialty') {
          newFilters.providerType = '';
          newFilters.region = '';
          newFilters.surveySource = '';
        }
        
        return newFilters;
      });
    }, 300),
    []
  );

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    debouncedFilterChange(filterName as string, value);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner 
          message="Loading analytics data..." 
          size="lg" 
          variant="primary" 
        />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Survey Analytics</h1>
              <p className="mt-2 text-gray-600">
                Analyze survey data with consistent filtering and aggregation
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outlined"
                startIcon={<DocumentTextIcon className="h-5 w-5" />}
                onClick={exportToExcel}
                disabled={aggregatedData.length === 0}
                sx={{ borderRadius: '8px' }}
              >
                Export to CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Specialty Filter */}
            <FormControl fullWidth size="small">
              <Autocomplete
                value={filters.specialty}
                onChange={(_: any, newValue: string | null) => handleFilterChange('specialty', newValue || '')}
                options={uniqueValues.specialties}
                getOptionLabel={(option: string) => formatSpecialtyForDisplay(option)}
                renderInput={(params: any) => (
                  <TextField
                    {...params}
                    label="Specialty"
                    variant="outlined"
                    size="small"
                    placeholder="Select specialty..."
                  />
                )}
                clearOnEscape
                clearOnBlur
                selectOnFocus
                handleHomeEndKeys
              />
            </FormControl>

            {/* Survey Source Filter */}
            <FormControl fullWidth size="small">
              <InputLabel>Survey Source</InputLabel>
              <Select
                value={filters.surveySource}
                label="Survey Source"
                onChange={(e: any) => handleFilterChange('surveySource', e.target.value)}
              >
                <MenuItem value="">All Sources</MenuItem>
                {uniqueValues.surveySources.map((source) => (
                  <MenuItem key={source} value={source}>
                    {source}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Geographic Region Filter */}
            <FormControl fullWidth size="small">
              <Autocomplete
                value={filters.region}
                onChange={(_: any, newValue: string | null) => handleFilterChange('region', newValue || '')}
                options={uniqueValues.regions}
                renderInput={(params: any) => (
                  <TextField
                    {...params}
                    label="Geographic Region"
                    variant="outlined"
                    size="small"
                    placeholder="Select region..."
                  />
                )}
                clearOnEscape
                clearOnBlur
                selectOnFocus
                handleHomeEndKeys
              />
            </FormControl>

            {/* Provider Type Filter */}
            <FormControl fullWidth size="small">
              <InputLabel>Provider Type</InputLabel>
              <Select
                value={filters.providerType}
                label="Provider Type"
                onChange={(e: any) => handleFilterChange('providerType', e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                {uniqueValues.providerTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Analytics Data ({aggregatedData.length} records)
              </h3>
            </div>

            {aggregatedData.length === 0 ? (
              <div className="text-center py-12">
                <Typography variant="h6" color="text.secondary">
                  No data available for the selected filters
                </Typography>
                <Typography variant="body2" color="text.secondary" className="mt-2">
                  Try adjusting your filter criteria
                </Typography>
              </div>
            ) : (
              <TableContainer component={Paper} elevation={0}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Survey Source</TableCell>
                      <TableCell>Specialty</TableCell>
                      <TableCell>Region</TableCell>
                      <TableCell>Provider Type</TableCell>
                      <TableCell align="right">N Orgs</TableCell>
                      <TableCell align="right">N Incumbents</TableCell>
                      <TableCell align="right">TCC P25</TableCell>
                      <TableCell align="right">TCC P50</TableCell>
                      <TableCell align="right">TCC P75</TableCell>
                      <TableCell align="right">TCC P90</TableCell>
                      <TableCell align="right">wRVU P25</TableCell>
                      <TableCell align="right">wRVU P50</TableCell>
                      <TableCell align="right">wRVU P75</TableCell>
                      <TableCell align="right">wRVU P90</TableCell>
                      <TableCell align="right">CF P25</TableCell>
                      <TableCell align="right">CF P50</TableCell>
                      <TableCell align="right">CF P75</TableCell>
                      <TableCell align="right">CF P90</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {aggregatedData.map((row, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{row.surveySource}</TableCell>
                        <TableCell>{formatSpecialtyForDisplay(row.standardizedName)}</TableCell>
                        <TableCell>{formatRegionForDisplay(row.geographicRegion)}</TableCell>
                        <TableCell>{row.providerType}</TableCell>
                        <TableCell align="right">{row.tcc_n_orgs?.toLocaleString() || 0}</TableCell>
                        <TableCell align="right">{row.tcc_n_incumbents?.toLocaleString() || 0}</TableCell>
                        <TableCell align="right">{formatCurrency(row.tcc_p25)}</TableCell>
                        <TableCell align="right">{formatCurrency(row.tcc_p50)}</TableCell>
                        <TableCell align="right">{formatCurrency(row.tcc_p75)}</TableCell>
                        <TableCell align="right">{formatCurrency(row.tcc_p90)}</TableCell>
                        <TableCell align="right">{row.wrvu_p25.toLocaleString()}</TableCell>
                        <TableCell align="right">{row.wrvu_p50.toLocaleString()}</TableCell>
                        <TableCell align="right">{row.wrvu_p75.toLocaleString()}</TableCell>
                        <TableCell align="right">{row.wrvu_p90.toLocaleString()}</TableCell>
                        <TableCell align="right">{row.cf_p25.toFixed(2)}</TableCell>
                        <TableCell align="right">{row.cf_p50.toFixed(2)}</TableCell>
                        <TableCell align="right">{row.cf_p75.toFixed(2)}</TableCell>
                        <TableCell align="right">{row.cf_p90.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

SurveyAnalytics.displayName = 'SurveyAnalytics';

export default SurveyAnalytics;
