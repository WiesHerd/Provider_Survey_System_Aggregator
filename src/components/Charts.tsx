import React, { useState, useEffect, useMemo } from 'react';
import { 
  FormControl, 
  Select, 
  MenuItem, 
  TextField, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  Typography,
  Chip,
  Box,
  Tabs,
  Tab,
  Autocomplete,
  Checkbox,
  ListItemText,
  OutlinedInput,
  IconButton
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LabelList } from 'recharts';
import { CheckCircle, Circle } from '@mui/icons-material';
import { 
  ChartBarIcon, 
  ChartPieIcon, 
  ChartBarSquareIcon,
  FunnelIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import BackendService from '../services/BackendService';
import LoadingSpinner from './ui/loading-spinner';
import { formatSpecialtyForDisplay } from '../shared/utils/formatters';

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface Filters {
  specialty: string;
  surveySource: string;
  geographicRegion: string;
  providerType: string;
  year: string;
  search: string;
}

interface ChartsProps {
  data?: ChartData[];
  title?: string;
  type?: 'line' | 'bar' | 'pie';
  xAxisKey?: string;
  yAxisKey?: string;
}

interface MultiProviderData {
  surveySource: string;
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  wrvu_p25: number;
  wrvu_p50: number;
  wrvu_p75: number;
  wrvu_p90: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
  sampleSize: number;
  count: number;
  [key: string]: string | number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const Charts: React.FC<ChartsProps> = ({ 
  data: propData, 
  title = 'Analytics Dashboard', 
  type = 'line',
  xAxisKey = 'name',
  yAxisKey = 'value'
}) => {
  // State management
  const [loading, setLoading] = useState(true);
  const [surveyData, setSurveyData] = useState<any[]>([]);
  const [filters, setFilters] = useState<Filters>({
    specialty: '',
    surveySource: '',
    geographicRegion: '',
    providerType: '',
    year: '',
    search: ''
  });
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie' | 'multi-provider' | 'all-specialties-tcc'>('multi-provider');
  const [selectedMetric, setSelectedMetric] = useState('tcc_p50');
  const [selectedTCCPercentile, setSelectedTCCPercentile] = useState<'tcc_p25' | 'tcc_p50' | 'tcc_p75' | 'tcc_p90'>('tcc_p50');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [uniqueValues, setUniqueValues] = useState({
    specialties: [] as string[],
    surveySources: [] as string[],
    geographicRegions: [] as string[],
    providerTypes: [] as string[],
    years: [] as string[]
  });

  const backendService = BackendService.getInstance();

  // Load survey data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const surveys = await backendService.getAllSurveys();
        let allData: any[] = [];

        for (const survey of surveys) {
          const data = await backendService.getSurveyData(survey.id, undefined, { limit: 1000 });
          if (data && data.rows) {
            const surveyData = data.rows.map((row: any) => ({
              ...row,
              surveySource: (survey as any).type || 'Unknown',
              year: (survey as any).year || new Date().getFullYear().toString()
            }));
            allData = allData.concat(surveyData);
          }
        }

        setSurveyData(allData);

        // Extract unique values for filters
        const specialties = Array.from(new Set(allData.map(row => row.specialty).filter(Boolean)));
        const surveySources = Array.from(new Set(allData.map(row => row.surveySource).filter(Boolean)));
        const geographicRegions = Array.from(new Set(allData.map(row => row.geographic_region).filter(Boolean)));
        const years = Array.from(new Set(allData.map(row => row.year).filter(Boolean)));

        setUniqueValues({
          specialties: specialties.sort(),
          surveySources: surveySources.sort(),
          geographicRegions: geographicRegions.sort(),
          providerTypes: Array.from(new Set(allData.map(row => row.provider_type).filter(Boolean))).sort(),
          years: years.sort()
        });

        // Set default specialty if available
        if (specialties.length > 0 && !selectedSpecialty) {
          setSelectedSpecialty(specialties[0]);
        }
      } catch (error) {
        console.error('Error loading survey data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [backendService]);

  // Filter data based on current filters
  const filteredData = useMemo(() => {
    return surveyData.filter(row => {
      if (filters.specialty && row.specialty !== filters.specialty) return false;
      if (filters.surveySource && row.surveySource !== filters.surveySource) return false;
      if (filters.geographicRegion && row.geographic_region !== filters.geographicRegion) return false;
      if (filters.year && row.year !== filters.year) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          (row.specialty && row.specialty.toLowerCase().includes(searchLower)) ||
          (row.geographic_region && row.geographic_region.toLowerCase().includes(searchLower)) ||
          (row.surveySource && row.surveySource.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [surveyData, filters]);

  // Prepare multi-provider comparison data
  const multiProviderData = useMemo(() => {
    const specialtiesToCompare = selectedSpecialties.length > 0 ? selectedSpecialties : (selectedSpecialty ? [selectedSpecialty] : []);
    if (specialtiesToCompare.length === 0) return [];

    // If multiple specialties selected, create comparison data
    if (specialtiesToCompare.length > 1) {
      // Get all unique survey sources
      const allSurveySources = new Set<string>();
      surveyData.forEach(row => {
        if (row.surveySource) allSurveySources.add(row.surveySource);
      });
      
      // Create data structure for grouped bar chart
      const comparisonData: any[] = [];
      
      Array.from(allSurveySources).forEach(surveySource => {
        const dataPoint: any = { surveySource };
        
        specialtiesToCompare.forEach(specialty => {
          // Filter data for this specific specialty and survey source
          const specialtyData = surveyData.filter(row => 
            (row.specialty === specialty || row.normalizedSpecialty === specialty) &&
            row.surveySource === surveySource
          );

          if (specialtyData.length > 0) {
            // Calculate average for this specialty/source combination
            const avgTcc = Math.round(specialtyData.reduce((sum, row) => sum + (Number(row[selectedMetric]) || 0), 0) / specialtyData.length);
            dataPoint[formatSpecialtyForDisplay(specialty)] = avgTcc;
          } else {
            dataPoint[formatSpecialtyForDisplay(specialty)] = 0;
          }
        });
        
        comparisonData.push(dataPoint);
      });

      return comparisonData;
    } else {
      // Single specialty - use original logic
      const specialtyData = surveyData.filter(row => 
        row.specialty === specialtiesToCompare[0] || 
        row.normalizedSpecialty === specialtiesToCompare[0]
      );

      // Group by survey source
      const groupedBySource = specialtyData.reduce((acc, row) => {
        const source = row.surveySource || 'Unknown';
        if (!acc[source]) {
          acc[source] = {
            surveySource: source,
            tcc_p25: 0,
            tcc_p50: 0,
            tcc_p75: 0,
            tcc_p90: 0,
            wrvu_p25: 0,
            wrvu_p50: 0,
            wrvu_p75: 0,
            wrvu_p90: 0,
            cf_p25: 0,
            cf_p50: 0,
            cf_p75: 0,
            cf_p90: 0,
            sampleSize: 0,
            count: 0
          };
        }

        // Aggregate values
        acc[source].tcc_p25 += Number(row.tcc_p25) || 0;
        acc[source].tcc_p50 += Number(row.tcc_p50) || 0;
        acc[source].tcc_p75 += Number(row.tcc_p75) || 0;
        acc[source].tcc_p90 += Number(row.tcc_p90) || 0;
        acc[source].wrvu_p25 += Number(row.wrvu_p25) || 0;
        acc[source].wrvu_p50 += Number(row.wrvu_p50) || 0;
        acc[source].wrvu_p75 += Number(row.wrvu_p75) || 0;
        acc[source].wrvu_p90 += Number(row.wrvu_p90) || 0;
        acc[source].cf_p25 += Number(row.cf_p25) || 0;
        acc[source].cf_p50 += Number(row.cf_p50) || 0;
        acc[source].cf_p75 += Number(row.cf_p75) || 0;
        acc[source].cf_p90 += Number(row.cf_p90) || 0;
        acc[source].sampleSize += Number(row.n_incumbents) || 0;
        acc[source].count++;

        return acc;
      }, {} as Record<string, any>);

      // Calculate averages and format for chart
      return Object.values(groupedBySource)
        .filter(source => (source as any).count > 0)
        .map(source => {
          const typedSource = source as any;
          return {
            surveySource: typedSource.surveySource,
            tcc_p25: Math.round(typedSource.tcc_p25 / typedSource.count),
            tcc_p50: Math.round(typedSource.tcc_p50 / typedSource.count),
            tcc_p75: Math.round(typedSource.tcc_p75 / typedSource.count),
            tcc_p90: Math.round(typedSource.tcc_p90 / typedSource.count),
            wrvu_p25: Math.round(typedSource.wrvu_p25 / typedSource.count),
            wrvu_p50: Math.round(typedSource.wrvu_p50 / typedSource.count),
            wrvu_p75: Math.round(typedSource.wrvu_p75 / typedSource.count),
            wrvu_p90: Math.round(typedSource.wrvu_p90 / typedSource.count),
            cf_p25: Math.round((typedSource.cf_p25 / typedSource.count) * 100) / 100,
            cf_p50: Math.round((typedSource.cf_p50 / typedSource.count) * 100) / 100,
            cf_p75: Math.round((typedSource.cf_p75 / typedSource.count) * 100) / 100,
            cf_p90: Math.round((typedSource.cf_p90 / typedSource.count) * 100) / 100,
            sampleSize: typedSource.sampleSize,
            count: typedSource.count
          } as MultiProviderData;
        })
        .sort((a, b) => (b as any)[selectedMetric] - (a as any)[selectedMetric]);
    }
  }, [surveyData, selectedSpecialty, selectedSpecialties, selectedMetric]);

  // Prepare all specialties TCC comparison data
  const allSpecialtiesTCCData = useMemo(() => {
    if (chartType !== 'all-specialties-tcc') return [];

    // Get all unique specialties from the data
    const allSpecialties = [...new Set(surveyData.map(row => row.specialty || row.normalizedSpecialty).filter(Boolean))];
    
    // Calculate TCC percentiles for each specialty
    const specialtyTCCData = allSpecialties.map(specialty => {
      const specialtyData = surveyData.filter(row => 
        (row.specialty === specialty || row.normalizedSpecialty === specialty)
      );

      if (specialtyData.length === 0) {
        return {
          specialty: formatSpecialtyForDisplay(specialty),
          tcc_p25: 0,
          tcc_p50: 0,
          tcc_p75: 0,
          tcc_p90: 0,
          sampleSize: 0
        };
      }

      // Calculate percentiles from the data
      const tccValues = specialtyData
        .map(row => Number(row.tcc_p50) || 0)
        .filter(value => value > 0)
        .sort((a, b) => a - b);

      if (tccValues.length === 0) {
        return {
          specialty: formatSpecialtyForDisplay(specialty),
          tcc_p25: 0,
          tcc_p50: 0,
          tcc_p75: 0,
          tcc_p90: 0,
          sampleSize: 0
        };
      }

      const p25Index = Math.floor(tccValues.length * 0.25);
      const p50Index = Math.floor(tccValues.length * 0.50);
      const p75Index = Math.floor(tccValues.length * 0.75);
      const p90Index = Math.floor(tccValues.length * 0.90);

      const totalSampleSize = specialtyData.reduce((sum, row) => sum + (Number(row.n_incumbents) || 0), 0);

      return {
        specialty: formatSpecialtyForDisplay(specialty),
        tcc_p25: Math.round(tccValues[p25Index] || 0),
        tcc_p50: Math.round(tccValues[p50Index] || 0),
        tcc_p75: Math.round(tccValues[p75Index] || 0),
        tcc_p90: Math.round(tccValues[p90Index] || 0),
        sampleSize: totalSampleSize
      };
    });

    // Sort by 50th percentile (descending) to show highest paid first
    return specialtyTCCData
      .filter(item => item.tcc_p50 > 0) // Only show specialties with data
      .sort((a, b) => b.tcc_p50 - a.tcc_p50);
  }, [surveyData, chartType]);

  // Prepare chart data for other chart types
  const chartData = useMemo(() => {
    if (propData) return propData; // Use prop data if provided

    // Group by specialty and calculate averages
    const groupedData = filteredData.reduce((acc, row) => {
      const specialty = row.specialty || 'Unknown';
      if (!acc[specialty]) {
        acc[specialty] = {
          count: 0,
          total: 0,
          values: []
        };
      }
      
      const value = parseFloat(row[selectedMetric]) || 0;
      if (value > 0) {
        acc[specialty].count++;
        acc[specialty].total += value;
        acc[specialty].values.push(value);
      }
      
      return acc;
    }, {} as Record<string, { count: number; total: number; values: number[] }>);

    return Object.entries(groupedData)
      .filter(([_, data]) => (data as any).count > 0)
      .map(([specialty, data]) => {
        const typedData = data as { count: number; total: number; values: number[] };
        return {
          name: specialty,
          value: Math.round(typedData.total / typedData.count),
          count: typedData.count,
          avg: Math.round(typedData.total / typedData.count),
          min: Math.min(...typedData.values),
          max: Math.max(...typedData.values)
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 specialties
  }, [filteredData, selectedMetric, propData]);

  // Handle filter changes
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      specialty: '',
      surveySource: '',
      geographicRegion: '',
      providerType: '',
      year: '',
      search: ''
    });
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  // Render multi-provider comparison chart
  const renderMultiProviderChart = () => {
    const specialtiesToCompare = selectedSpecialties.length > 0 ? selectedSpecialties : (selectedSpecialty ? [selectedSpecialty] : []);
    if (specialtiesToCompare.length === 0 || multiProviderData.length === 0) {
      return (
        <div className="flex items-center justify-center h-96 text-gray-500">
          <div className="text-center">
            <BuildingOfficeIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm">Select specialties to compare survey sources</p>
          </div>
        </div>
      );
    }

    const metricLabel = selectedMetric.replace('_', ' ').toUpperCase();
    const isCurrency = selectedMetric.startsWith('tcc') || selectedMetric.startsWith('cf');
    const isWRVU = selectedMetric.startsWith('wrvu');

    return (
      <div className="space-y-6">
        {/* Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {specialtiesToCompare.length === 1 
                  ? `${formatSpecialtyForDisplay(specialtiesToCompare[0])} - ${metricLabel} Comparison`
                  : `${specialtiesToCompare.length} Specialties - ${metricLabel} Comparison`
                }
              </h3>
              <p className="text-gray-600">Comparing {metricLabel} across different survey sources</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {multiProviderData.length} sources
              </span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={600}>
            {specialtiesToCompare.length > 1 ? (
              // Multiple specialties - show grouped bar chart
              <BarChart data={multiProviderData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="surveySource" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={(value) => 
                    isCurrency ? `$${(value / 1000).toFixed(0)}K` : 
                    isWRVU ? value.toLocaleString() : 
                    `$${value}`
                  }
                />
                <RechartsTooltip 
                  formatter={(value: any) => [
                    isCurrency ? `$${value.toLocaleString()}` : 
                    isWRVU ? value.toLocaleString() : 
                    `$${value}`,
                    metricLabel
                  ]}
                  labelFormatter={(label: any) => `Survey Source: ${label}`}
                />
                <Legend />
                {specialtiesToCompare.map((specialty, index) => (
                  <Bar 
                    key={specialty}
                    dataKey={formatSpecialtyForDisplay(specialty)}
                    fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]}
                    radius={[4, 4, 0, 0]}
                    name={formatSpecialtyForDisplay(specialty)}
                  >
                    <LabelList 
                      dataKey={formatSpecialtyForDisplay(specialty)} 
                      position="top" 
                      formatter={(value: any) => {
                        if (value === undefined || value === null || value === 0) return '';
                        return isCurrency ? `$${(value / 1000).toFixed(0)}K` : 
                               isWRVU ? value.toLocaleString() : 
                               `$${(value / 1000).toFixed(0)}K`;
                      }}
                      style={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                  </Bar>
                ))}
              </BarChart>
            ) : (
              // Single specialty - show regular bar chart
              <BarChart data={multiProviderData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="surveySource" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={(value) => 
                    isCurrency ? `$${(value / 1000).toFixed(0)}K` : 
                    isWRVU ? value.toLocaleString() : 
                    `$${value}`
                  }
                />
                <RechartsTooltip 
                  formatter={(value: any) => [
                    isCurrency ? `$${value.toLocaleString()}` : 
                    isWRVU ? value.toLocaleString() : 
                    `$${value}`,
                    metricLabel
                  ]}
                  labelFormatter={(label: any) => `Survey Source: ${label}`}
                />
                <Legend />
                <Bar 
                  dataKey={selectedMetric} 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]}
                  name={metricLabel}
                >
                  <LabelList 
                    dataKey={selectedMetric} 
                    position="top" 
                    formatter={(value: any) => {
                      if (value === undefined || value === null || value === 0) return '';
                      return isCurrency ? `$${(value / 1000).toFixed(0)}K` : 
                             isWRVU ? value.toLocaleString() : 
                             `$${(value / 1000).toFixed(0)}K`;
                    }}
                    style={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Detailed Comparison</h4>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Survey Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Specialty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {metricLabel}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sample Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Points
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(() => {
                  if (specialtiesToCompare.length > 1) {
                    // For multiple specialties, create rows for each specialty
                    const tableRows: any[] = [];
                    
                    specialtiesToCompare.forEach(specialty => {
                      // Get all survey sources that have data for this specialty
                      const surveySources = new Set<string>();
                      surveyData.forEach(row => {
                        if ((row.specialty === specialty || row.normalizedSpecialty === specialty) && row.surveySource) {
                          surveySources.add(row.surveySource);
                        }
                      });
                      
                      Array.from(surveySources).forEach(surveySource => {
                        const specialtyData = surveyData.filter(row => 
                          (row.specialty === specialty || row.normalizedSpecialty === specialty) &&
                          row.surveySource === surveySource
                        );
                        
                        if (specialtyData.length > 0) {
                          const avgValue = Math.round(specialtyData.reduce((sum, row) => sum + (Number(row[selectedMetric]) || 0), 0) / specialtyData.length);
                          const totalSampleSize = specialtyData.reduce((sum, row) => sum + (Number(row.n_incumbents) || 0), 0);
                          
                          tableRows.push({
                            surveySource,
                            specialty: formatSpecialtyForDisplay(specialty),
                            value: avgValue,
                            sampleSize: totalSampleSize,
                            count: specialtyData.length
                          });
                        }
                      });
                    });
                    
                    return tableRows.map((row, index) => (
                      <tr key={`${row.surveySource}-${row.specialty}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {row.surveySource}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.specialty}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(() => {
                            if (row.value === 0) return 'N/A';
                            if (isCurrency) {
                              return `$${row.value.toLocaleString()}`;
                            } else if (isWRVU) {
                              return row.value.toLocaleString();
                            } else {
                              return `$${row.value}`;
                            }
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row.sampleSize > 0 ? row.sampleSize.toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row.count > 0 ? row.count : 'N/A'}
                        </td>
                      </tr>
                    ));
                  } else {
                    // Single specialty - use original logic
                    return multiProviderData.map((source, index) => (
                      <tr key={source.surveySource} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {source.surveySource}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatSpecialtyForDisplay(specialtiesToCompare[0])}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(() => {
                            const value = (source as any)[selectedMetric];
                            if (value === undefined || value === null) return 'N/A';
                            const numValue = Number(value);
                            if (isNaN(numValue)) return 'N/A';
                            
                            if (isCurrency) {
                              return `$${numValue.toLocaleString()}`;
                            } else if (isWRVU) {
                              return numValue.toLocaleString();
                            } else {
                              return `$${numValue}`;
                            }
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {source.sampleSize ? source.sampleSize.toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {source.count || 'N/A'}
                        </td>
                      </tr>
                    ));
                  }
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render all specialties TCC comparison chart
  const renderAllSpecialtiesTCCChart = () => {
    if (allSpecialtiesTCCData.length === 0) {
      return (
        <div className="flex items-center justify-center h-96 text-gray-500">
          <div className="text-center">
            <BuildingOfficeIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm">No specialty data found for TCC comparison</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                All Specialties TCC Comparison - {selectedTCCPercentile.replace('tcc_', '').toUpperCase()}
              </h3>
              <p className="text-gray-600">Specialties ranked by {selectedTCCPercentile.replace('tcc_', '').toUpperCase()} TCC values</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {allSpecialtiesTCCData.length} specialties
              </span>
            </div>
          </div>

          <div className="w-full" style={{ height: '600px', overflowY: 'auto' }}>
            <div style={{ height: `${Math.max(600, allSpecialtiesTCCData.length * 40)}px`, minHeight: '600px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={allSpecialtiesTCCData} 
                  margin={{ top: 20, right: 120, left: 20, bottom: 20 }}
                  layout="horizontal"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                    domain={[0, 'dataMax + 50000']}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="specialty" 
                    width={200}
                    tick={{ fontSize: 12 }}
                  />
                  <RechartsTooltip 
                    formatter={(value: any) => [`$${value.toLocaleString()}`, 'TCC']}
                    labelFormatter={(label: any) => `Specialty: ${label}`}
                  />
                  <Bar 
                    dataKey={selectedTCCPercentile} 
                    fill="#6A5ACD" 
                    radius={[0, 4, 4, 0]}
                    name={`TCC ${selectedTCCPercentile.replace('tcc_', '').toUpperCase()}`}
                  >
                    <LabelList 
                      dataKey={selectedTCCPercentile} 
                      position="right" 
                      formatter={(value: any) => {
                        if (value === undefined || value === null || value === 0) return '';
                        return `$${(value / 1000).toFixed(0)}K`;
                      }}
                      style={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Detailed TCC Comparison</h4>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Specialty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    25th Percentile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    50th Percentile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    75th Percentile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    90th Percentile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sample Size
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allSpecialtiesTCCData.map((row, index) => (
                  <tr key={row.specialty} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.specialty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.tcc_p25 > 0 ? `$${row.tcc_p25.toLocaleString()}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.tcc_p50 > 0 ? `$${row.tcc_p50.toLocaleString()}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.tcc_p75 > 0 ? `$${row.tcc_p75.toLocaleString()}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.tcc_p90 > 0 ? `$${row.tcc_p90.toLocaleString()}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.sampleSize > 0 ? row.sampleSize.toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render chart based on type
  const renderChart = () => {
    if (chartType === 'multi-provider') {
      return renderMultiProviderChart();
    }

    if (chartType === 'all-specialties-tcc') {
      return renderAllSpecialtiesTCCChart();
    }

    if (chartType === 'pie') {
      return (
        <PieChart width={800} height={400}>
          <Pie
            data={chartData}
            cx={400}
            cy={200}
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={150}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <RechartsTooltip formatter={(value: any) => [`$${value.toLocaleString()}`, selectedMetric ? selectedMetric.replace('_', ' ').toUpperCase() : 'Metric']} />
        </PieChart>
      );
    }

    if (chartType === 'bar') {
      return (
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
          <YAxis />
          <RechartsTooltip formatter={(value: any) => [`$${value.toLocaleString()}`, selectedMetric ? selectedMetric.replace('_', ' ').toUpperCase() : 'Metric']} />
          <Legend />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      );
    }

    return (
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
        <YAxis />
        <RechartsTooltip formatter={(value: any) => [`$${value.toLocaleString()}`, selectedMetric ? selectedMetric.replace('_', ' ').toUpperCase() : 'Metric']} />
        <Legend />
        <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
      </LineChart>
    );
  };

  if (loading) {
    return (
          <LoadingSpinner 
            message="Loading analytics data..."
            size="lg"
            variant="primary"
        fullScreen={true}
          />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-3">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
              <p className="text-gray-600">Comprehensive analytics and data visualization dashboard</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {filteredData.length} records
              </span>
            </div>
          </div>

          {/* Chart Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={chartType}
                  onChange={(e: SelectChangeEvent<string>) => setChartType(e.target.value as 'line' | 'bar' | 'pie' | 'multi-provider' | 'all-specialties-tcc')}
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    }
                  }}
                >
                  <MenuItem value="multi-provider">Multi-Provider Comparison</MenuItem>
                <MenuItem value="all-specialties-tcc">All Specialties TCC Comparison</MenuItem>
                  <MenuItem value="line">Line Chart</MenuItem>
                  <MenuItem value="bar">Bar Chart</MenuItem>
                  <MenuItem value="pie">Pie Chart</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={selectedMetric}
                  onChange={(e: SelectChangeEvent<string>) => setSelectedMetric(e.target.value)}
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    }
                  }}
                >
                  <MenuItem value="tcc_p25">TCC P25</MenuItem>
                  <MenuItem value="tcc_p50">TCC P50</MenuItem>
                  <MenuItem value="tcc_p75">TCC P75</MenuItem>
                  <MenuItem value="tcc_p90">TCC P90</MenuItem>
                  <MenuItem value="cf_p25">CF P25</MenuItem>
                  <MenuItem value="cf_p50">CF P50</MenuItem>
                  <MenuItem value="cf_p75">CF P75</MenuItem>
                  <MenuItem value="cf_p90">CF P90</MenuItem>
                  <MenuItem value="wrvu_p25">WRVU P25</MenuItem>
                  <MenuItem value="wrvu_p50">WRVU P50</MenuItem>
                  <MenuItem value="wrvu_p75">WRVU P75</MenuItem>
                  <MenuItem value="wrvu_p90">WRVU P90</MenuItem>
                </Select>
              </FormControl>

              {/* TCC Percentile Selector - Only show for all-specialties-tcc chart */}
              {chartType === 'all-specialties-tcc' && (
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <Select
                    value={selectedTCCPercentile}
                    onChange={(e: SelectChangeEvent<string>) => setSelectedTCCPercentile(e.target.value as 'tcc_p25' | 'tcc_p50' | 'tcc_p75' | 'tcc_p90')}
                    sx={{
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                      }
                    }}
                  >
                    <MenuItem value="tcc_p25">25th Percentile</MenuItem>
                    <MenuItem value="tcc_p50">50th Percentile</MenuItem>
                    <MenuItem value="tcc_p75">75th Percentile</MenuItem>
                    <MenuItem value="tcc_p90">90th Percentile</MenuItem>
                  </Select>
                </FormControl>
              )}


            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outlined"
                startIcon={<ArrowPathIcon className="h-4 w-4" />}
                onClick={() => window.location.reload()}
                sx={{ borderRadius: '8px' }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
                onClick={() => {
                  // Export functionality
                  const csvContent = chartType === 'multi-provider' 
                    ? multiProviderData.map(row => {
                        const value = (row as any)[selectedMetric];
                        const safeValue = value !== undefined && value !== null ? value : 'N/A';
                        return `${row.surveySource},${safeValue},${row.sampleSize},${row.count}`;
                      }).join('\n')
                    : chartData.map(row => 
                    `${row.name},${row.value},${row.count}`
                  ).join('\n');
                  
                  const headers = chartType === 'multi-provider'
                    ? `Survey Source,${selectedMetric ? selectedMetric.replace('_', ' ').toUpperCase() : 'Metric'},Sample Size,Data Points\n`
                    : `Specialty,${selectedMetric ? selectedMetric.replace('_', ' ').toUpperCase() : 'Metric'},Count\n`;
                  
                  const blob = new Blob([headers + csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `analytics-${selectedMetric || 'data'}-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                }}
                sx={{ borderRadius: '8px' }}
              >
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Grid - Only show for non-multi-provider charts */}
        {chartType !== 'multi-provider' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            </div>
            <Button
              variant="outlined"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              sx={{ borderRadius: '8px' }}
            >
              Clear All
            </Button>
          </div>

          <Grid container spacing={3}>
            {/* Specialty Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <Select
                  value={filters.specialty}
                  onChange={(e: SelectChangeEvent<string>) => handleFilterChange('specialty', e.target.value)}
                  displayEmpty
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    }
                  }}
                >
                  <MenuItem value="">All Specialties</MenuItem>
                  {uniqueValues.specialties.map((specialty) => (
                    <MenuItem key={specialty} value={specialty}>
                        {formatSpecialtyForDisplay(specialty)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Survey Source Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <Select
                  value={filters.surveySource}
                  onChange={(e: SelectChangeEvent<string>) => handleFilterChange('surveySource', e.target.value)}
                  displayEmpty
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    }
                  }}
                >
                  <MenuItem value="">All Sources</MenuItem>
                  {uniqueValues.surveySources.map((source) => (
                    <MenuItem key={source} value={source}>
                      {source}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Geographic Region Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <Select
                  value={filters.geographicRegion}
                  onChange={(e: SelectChangeEvent<string>) => handleFilterChange('geographicRegion', e.target.value)}
                  displayEmpty
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    }
                  }}
                >
                  <MenuItem value="">All Regions</MenuItem>
                  {uniqueValues.geographicRegions.map((region) => (
                    <MenuItem key={region} value={region}>
                      {region}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Year Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <Select
                  value={filters.year}
                  onChange={(e: SelectChangeEvent<string>) => handleFilterChange('year', e.target.value)}
                  displayEmpty
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    }
                  }}
                >
                  <MenuItem value="">All Years</MenuItem>
                  {uniqueValues.years.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Search Filter */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search specialties, regions, sources..."
                value={filters.search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('search', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    backgroundColor: 'white',
                  }
                }}
              />
            </Grid>
          </Grid>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(filters).map(([key, value]) => {
                if (!value) return null;
                return (
                  <Chip
                    key={key}
                    label={`${key}: ${value}`}
                    onDelete={() => handleFilterChange(key as keyof Filters, '')}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                );
              })}
            </Box>
          )}
        </div>
        )}

        {/* Specialty Selection Container */}
        {chartType === 'multi-provider' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <Typography variant="h6" sx={{ mb: 3, color: 'text.primary', fontWeight: 600 }}>
              Select Specialties to Compare
            </Typography>
            
            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Search Field */}
              <div className="md:col-span-1">
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search specialties..."
                  value={filters.search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('search', e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      backgroundColor: 'white',
                    }
                  }}
                />
              </div>

              {/* Provider Type Filter */}
              <FormControl fullWidth size="small">
                <Select
                  value={filters.providerType || ''}
                  onChange={(e: SelectChangeEvent<string>) => handleFilterChange('providerType', e.target.value)}
                  displayEmpty
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    }
                  }}
                >
                  <MenuItem value="">All Types</MenuItem>
                  {uniqueValues.providerTypes?.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  )) || []}
                </Select>
              </FormControl>

              {/* Region Filter */}
              <FormControl fullWidth size="small">
                <Select
                  value={filters.geographicRegion}
                  onChange={(e: SelectChangeEvent<string>) => handleFilterChange('geographicRegion', e.target.value)}
                  displayEmpty
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    }
                  }}
                >
                  <MenuItem value="">All Regions</MenuItem>
                  {uniqueValues.geographicRegions.map((region) => (
                    <MenuItem key={region} value={region}>
                      {region}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
              {(() => {
                const filteredSpecialties = uniqueValues.specialties.filter(specialty => {
                  // Search filter
                  if (filters.search && !formatSpecialtyForDisplay(specialty).toLowerCase().includes(filters.search.toLowerCase())) {
                    return false;
                  }
                  
                  // Region filter
                  if (filters.geographicRegion) {
                    const hasDataForRegion = surveyData.some(row => 
                      (row.specialty === specialty || row.normalizedSpecialty === specialty) &&
                      row.geographic_region === filters.geographicRegion
                    );
                    if (!hasDataForRegion) return false;
                  }
                  
                  // Provider type filter
                  if (filters.providerType) {
                    const hasDataForProviderType = surveyData.some(row => 
                      (row.specialty === specialty || row.normalizedSpecialty === specialty) &&
                      row.provider_type === filters.providerType
                    );
                    if (!hasDataForProviderType) return false;
                  }
                  
                  return true;
                });
                
                // Debug info
                if (filteredSpecialties.length === 0) {
                  return (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      <p>No specialties found matching the current filters.</p>
                      <p className="text-sm mt-2">
                        Total specialties: {uniqueValues.specialties.length} | 
                        Filtered: {filteredSpecialties.length}
                      </p>
                      <button 
                        onClick={() => setFilters({
                          specialty: '',
                          surveySource: '',
                          geographicRegion: '',
                          providerType: '',
                          year: '',
                          search: ''
                        })}
                        className="mt-2 text-blue-600 hover:text-blue-800 underline"
                      >
                        Clear all filters
                      </button>
                    </div>
                  );
                }
                
                return filteredSpecialties.map((specialty) => {
                const isSelected = selectedSpecialties.includes(specialty);
                return (
                  <Card
                    key={specialty}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedSpecialties(selectedSpecialties.filter(s => s !== specialty));
                        if (selectedSpecialties.length === 2) {
                          setSelectedSpecialty('');
                        }
                      } else {
                        setSelectedSpecialties([...selectedSpecialties, specialty]);
                        if (selectedSpecialties.length === 0) {
                          setSelectedSpecialty(specialty);
                        } else {
                          setSelectedSpecialty('');
                        }
                      }
                    }}
                                              sx={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out',
                                                    border: isSelected ? '2px solid #B8A9E8' : '1px solid #e5e7eb',
                        backgroundColor: isSelected ? '#F0EEFF' : 'white',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 8px 25px rgba(106, 90, 205, 0.15)',
                              borderColor: isSelected ? '#6A5ACD' : '#6A5ACD'
                            },
                            position: 'relative',
                            minHeight: '80px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                          }}
                  >
                    {isSelected && (
                                                  <CheckCircle
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                color: '#6A5ACD',
                                fontSize: 20
                              }}
                            />
                    )}
                    <CardContent sx={{ p: 2, textAlign: 'center' }}>
                                                  <Typography
                              variant="body2"
                              sx={{
                                fontWeight: isSelected ? 600 : 500,
                                color: isSelected ? '#6A5ACD' : 'text.primary',
                                fontSize: '0.875rem',
                                lineHeight: 1.3
                              }}
                            >
                        {formatSpecialtyForDisplay(specialty)}
                      </Typography>
                    </CardContent>
                  </Card>
                );
              });
            })()}
            </div>
            {selectedSpecialties.length > 0 && (
              <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'center' }}>
                  Selected:
                </Typography>
                {selectedSpecialties.map((specialty) => (
                  <Chip
                    key={specialty}
                    label={formatSpecialtyForDisplay(specialty)}
                    size="small"
                    onDelete={() => {
                      setSelectedSpecialties(selectedSpecialties.filter(s => s !== specialty));
                      if (selectedSpecialties.length === 2) {
                        setSelectedSpecialty('');
                      }
                    }}
                                              sx={{
                            backgroundColor: '#6A5ACD',
                            color: 'white',
                            '& .MuiChip-deleteIcon': {
                              color: 'white',
                              '&:hover': {
                                color: '#fbbf24'
                              }
                            }
                          }}
                  />
                ))}
              </Box>
            )}
          </div>
        )}

        {/* Chart Display */}
        {chartType !== 'multi-provider' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedMetric.replace('_', ' ').toUpperCase()} by Specialty
              </h3>
              <p className="text-gray-600">Top 10 specialties by average {selectedMetric.replace('_', ' ')}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {chartData.length} specialties
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height={500}>
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </div>
        )}

        {/* Multi-Provider Chart Display */}
        {chartType === 'multi-provider' && renderMultiProviderChart()}


      </div>
    </div>
  );
};

export default Charts;
