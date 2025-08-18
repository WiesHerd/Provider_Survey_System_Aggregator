import React, { useState, useEffect, useMemo } from 'react';
import { 
  FormControl, 
  Select, 
  MenuItem, 
  TextField, 
  Button, 
  Card, 
  CardContent, 
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip,
  Autocomplete
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  LabelList
} from 'recharts';
import { 
  ChartBarIcon, 
  DocumentArrowDownIcon,
  BookmarkIcon,
  BookmarkSlashIcon
} from '@heroicons/react/24/outline';
import { getDataService } from '../services/DataService';
import LoadingSpinner from './ui/loading-spinner';
import { formatSpecialtyForDisplay } from '../shared/utils/formatters';
import { ISurveyRow } from '../types/survey';
import { ISpecialtyMapping } from '../types/specialty';

interface ReportConfig {
  id: string;
  name: string;
  dimension: string;
  metric: string;
  chartType: 'bar' | 'line' | 'pie';
  filters: {
    specialties: string[];
    regions: string[];
    surveySources: string[];
  };
  created: Date;
}

interface CustomReportsProps {
  data?: any[];
  title?: string;
}

interface ChartDataItem {
  name: string;
  value: number;
  count: number;
  originalName: string;
}

const COLORS = ['#6A5ACD', '#8B7DD6', '#A89DE0', '#C5BDE9', '#E2D1F2'];

const CustomReports: React.FC<CustomReportsProps> = ({ 
  data: propData, 
  title = 'Custom Reports' 
}) => {
  // State management
  const [loading, setLoading] = useState(true);
  const [surveyData, setSurveyData] = useState<ISurveyRow[]>([]);
  const [savedReports, setSavedReports] = useState<ReportConfig[]>([]);
  const [specialtyMappings, setSpecialtyMappings] = useState<ISpecialtyMapping[]>([]);
  
  // Current report configuration
  const [currentConfig, setCurrentConfig] = useState<Omit<ReportConfig, 'id' | 'created'>>({
    name: '',
    dimension: 'specialty',
    metric: 'tcc_p50',
    chartType: 'bar',
    filters: {
      specialties: [],
      regions: [],
      surveySources: []
    }
  });

  // Available options
  const [availableOptions, setAvailableOptions] = useState({
    dimensions: [] as string[],
    metrics: [] as string[],
    specialties: [] as string[],
    regions: [] as string[],
    surveySources: [] as string[]
  });

  // Services
  const dataService = useMemo(() => getDataService(), []);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load specialty mappings first
        const mappings = await dataService.getAllSpecialtyMappings();
        setSpecialtyMappings(mappings);
        
        // Get all surveys first
        const surveys = await dataService.getAllSurveys();
        
        // Collect all data from all surveys
        const allData: ISurveyRow[] = [];
        
        for (const survey of surveys) {
          try {
            const surveyData = await dataService.getSurveyData(survey.id);
            if (surveyData.rows) {
              allData.push(...surveyData.rows);
            }
          } catch (error) {
            console.warn(`Failed to load data for survey ${survey.id}:`, error);
          }
        }
        
        if (allData.length > 0) {
          setSurveyData(allData);
          
          // Extract available options using specialty mappings (like analytics screen)
          const specialties = mappings.map((mapping: ISpecialtyMapping) => mapping.standardizedName).filter(Boolean);
          
          const regions = [...new Set(allData.map((row: ISurveyRow) => String((row as any).geographic_region || (row as any).Region || row.region || row.geographicRegion || '')).filter(Boolean))] as string[];
          
          // For survey sources, we need to get the survey type from the surveys table
          // Since we don't have direct access to survey metadata in the rows, 
          // we'll need to get this from the surveys list
          const surveySources = [...new Set(surveys.map((survey: any) => (survey as any).type || survey.surveyProvider || '').filter(Boolean))] as string[];
          
          setAvailableOptions({
            dimensions: ['specialty', 'region', 'providerType'],
            metrics: ['tcc_p25', 'tcc_p50', 'tcc_p75', 'tcc_p90', 'wrvu_p25', 'wrvu_p50', 'wrvu_p75', 'wrvu_p90', 'cf_p25', 'cf_p50', 'cf_p75', 'cf_p90'],
            specialties,
            regions,
            surveySources
          });
        }
      } catch (error) {
        console.error('Error loading survey data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dataService]);

  // Load saved reports from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('customReports');
    if (saved) {
      try {
        setSavedReports(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved reports:', error);
      }
    }
  }, []);

  // Save reports to localStorage
  const saveReports = (reports: ReportConfig[]) => {
    localStorage.setItem('customReports', JSON.stringify(reports));
  };

  // Generate chart data based on current configuration
  const chartData = useMemo((): ChartDataItem[] => {
    if (!surveyData.length) return [];

    // Apply filters
    let filteredData = surveyData;
    
    if (currentConfig.filters.specialties.length > 0) {
      // Create a mapping from standardized names to source specialties
      const specialtyMappingLookup = new Map<string, string[]>();
      specialtyMappings.forEach(mapping => {
        if (currentConfig.filters.specialties.includes(mapping.standardizedName)) {
          const sourceSpecialties = mapping.sourceSpecialties.map(src => src.specialty.toLowerCase());
          specialtyMappingLookup.set(mapping.standardizedName, sourceSpecialties);
        }
      });
      
      filteredData = filteredData.filter(row => {
        const rowSpecialty = String(row.specialty || row.normalizedSpecialty || '').toLowerCase();
        return Array.from(specialtyMappingLookup.values()).some(sourceSpecialties => 
          sourceSpecialties.includes(rowSpecialty)
        );
      });
    }
    
    if (currentConfig.filters.regions.length > 0) {
      filteredData = filteredData.filter(row => 
        currentConfig.filters.regions.includes(String((row as any).geographic_region || (row as any).Region || row.region || row.geographicRegion || ''))
      );
    }
    
    if (currentConfig.filters.surveySources.length > 0) {
      // For survey sources, we need to filter by survey ID since the source is stored at survey level
      // This is a limitation - we can't filter by survey source at the row level
      // For now, we'll skip this filter until we can implement proper survey-level filtering
      console.warn('Survey source filtering not implemented at row level');
    }

    // Group by dimension and aggregate metric
    const grouped = filteredData.reduce((acc, row) => {
      let dimensionValue = 'Unknown';
      
      // Handle special cases for field name mapping
      if (currentConfig.dimension === 'region') {
        dimensionValue = String((row as any).geographic_region || (row as any).Region || row.region || row.geographicRegion || 'Unknown');
      } else if (currentConfig.dimension === 'specialty') {
        // Use specialty mappings to get standardized name
        const rowSpecialty = String(row.specialty || row.normalizedSpecialty || '').toLowerCase();
        let standardizedName = 'Unknown';
        
        for (const mapping of specialtyMappings) {
          const sourceSpecialties = mapping.sourceSpecialties.map(src => src.specialty.toLowerCase());
          if (sourceSpecialties.includes(rowSpecialty)) {
            standardizedName = mapping.standardizedName;
            break;
          }
        }
        dimensionValue = standardizedName;
      } else {
        dimensionValue = String(row[currentConfig.dimension as keyof ISurveyRow] || 'Unknown');
      }
      
      const metricValue = Number(row[currentConfig.metric as keyof ISurveyRow]) || 0;
      
      if (!acc[dimensionValue]) {
        acc[dimensionValue] = {
          name: dimensionValue,
          value: 0,
          count: 0,
          total: 0
        };
      }
      
      if (metricValue > 0) {
        acc[dimensionValue].total += metricValue;
        acc[dimensionValue].count += 1;
      }
      
      return acc;
    }, {} as Record<string, { name: string; value: number; count: number; total: number }>);

    // Calculate averages and format
    const allData = Object.values(grouped)
      .map((item: { name: string; value: number; count: number; total: number }) => ({
        name: currentConfig.dimension === 'specialty' ? formatSpecialtyForDisplay(item.name) : item.name,
        value: item.count > 0 ? Math.round(item.total / item.count) : 0,
        count: item.count,
        originalName: item.name
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
    
    console.log('Data processing summary:');
    console.log('- Total survey data rows:', surveyData.length);
    console.log('- Filtered data rows:', filteredData.length);
    console.log('- Grouped items:', Object.keys(grouped).length);
    console.log('- Final allData items:', allData.length);
    console.log('- Current dimension:', currentConfig.dimension);
    console.log('- Current filters:', currentConfig.filters);
    
    // For specialty dimension, require at least one specialty to be selected
    if (currentConfig.dimension === 'specialty') {
      if (currentConfig.filters.specialties.length === 0) {
        console.log('Specialty dimension with no filters - returning empty data');
        return []; // Return empty data when no specialty filter is applied
      } else {
        console.log('Specialty dimension with filters - returning filtered data:', allData.length, 'items');
        return allData; // Show filtered specialties
      }
    } else {
      console.log('Non-specialty dimension - limiting to top 20');
      return allData.slice(0, 20); // Limit other dimensions to top 20
    }
  }, [surveyData, currentConfig, specialtyMappings]);

  // Handle configuration changes
  const handleConfigChange = (key: keyof typeof currentConfig, value: any) => {
    setCurrentConfig(prev => ({ ...prev, [key]: value }));
  };

  // Handle filter changes
  const handleFilterChange = (filterType: keyof typeof currentConfig.filters, value: string[]) => {
    setCurrentConfig(prev => ({
      ...prev,
      filters: { ...prev.filters, [filterType]: value }
    }));
  };

  // Save current report
  const saveCurrentReport = () => {
    if (!currentConfig.name.trim()) {
      alert('Please enter a report name');
      return;
    }

    const newReport: ReportConfig = {
      ...currentConfig,
      id: Date.now().toString(),
      created: new Date()
    };

    const updatedReports = [...savedReports, newReport];
    setSavedReports(updatedReports);
    saveReports(updatedReports);
    
    // Clear the name field
    setCurrentConfig(prev => ({ ...prev, name: '' }));
  };

  // Load a saved report
  const loadReport = (report: ReportConfig) => {
    setCurrentConfig({
      name: '',
      dimension: report.dimension,
      metric: report.metric,
      chartType: report.chartType,
      filters: report.filters
    });
  };

  // Delete a saved report
  const deleteReport = (reportId: string) => {
    const updatedReports = savedReports.filter(r => r.id !== reportId);
    setSavedReports(updatedReports);
    saveReports(updatedReports);
  };

  // Export chart data
  const exportData = () => {
    const csvContent = chartData.map(row => 
      `${row.name},${row.value},${row.count}`
    ).join('\n');
    
    const headers = `${currentConfig.dimension},${currentConfig.metric},Count\n`;
    const blob = new Blob([headers + csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom-report-${currentConfig.dimension}-${currentConfig.metric}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Render chart based on type
  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-96 text-gray-500">
          <div className="text-center">
            <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm">Try adjusting your filters or configuration</p>
          </div>
        </div>
      );
    }

    const isCurrency = currentConfig.metric.includes('tcc') || currentConfig.metric.includes('cf');
    const isWRVU = currentConfig.metric.includes('wrvu');

    if (currentConfig.chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
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
            <RechartsTooltip 
              formatter={(value: any) => [
                isCurrency ? `$${value.toLocaleString()}` : 
                isWRVU ? value.toLocaleString() : 
                `$${value}`,
                currentConfig.metric.replace('_', ' ').toUpperCase()
              ]} 
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (currentConfig.chartType === 'line') {
      const isManyItems = chartData.length > 15;
      const chartHeight = 400; // Fixed height for all charts - enterprise standard
      const xAxisHeight = isManyItems ? 120 : 100;
      
      return (
        <div className="w-full overflow-x-auto">
          <div style={{ 
            width: '100%',
            minWidth: '100%'
          }}>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                dataKey="name" 
                angle={isManyItems ? -45 : -45} 
                textAnchor="end" 
                height={xAxisHeight}
                tick={{ fontSize: isManyItems ? 9 : 12 }}
                interval={isManyItems ? 2 : 0} // Show every 3rd label for many items
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
                    currentConfig.metric.replace('_', ' ').toUpperCase()
                  ]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#6A5ACD" 
                  strokeWidth={2}
                  dot={{ fill: '#6A5ACD', strokeWidth: 2, r: 4 }}
                />
                {/* Add LabelList for value labels on line points */}
                <LabelList 
                  dataKey="value" 
                  position="top" 
                  formatter={(value: number) => 
                    isCurrency ? `$${(value / 1000).toFixed(0)}K` : 
                    isWRVU ? value.toLocaleString() : 
                    `$${value}`
                  }
                  style={{ fontSize: 10, fill: '#374151', fontWeight: 500 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    // Default bar chart
    const isManyItems = chartData.length > 15;
    const chartHeight = 400; // Fixed height for all charts - enterprise standard
    const xAxisHeight = isManyItems ? 120 : 100;
    
    return (
      <div className="w-full overflow-x-auto">
        <div style={{ 
          width: '100%',
          minWidth: '100%'
        }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={isManyItems ? -45 : -45} 
                textAnchor="end" 
                height={xAxisHeight}
                tick={{ fontSize: isManyItems ? 9 : 12 }}
                interval={isManyItems ? 2 : 0} // Show every 3rd label for many items
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
                  currentConfig.metric.replace('_', ' ').toUpperCase()
                ]}
              />
              <Legend />
              <Bar 
                dataKey="value" 
                fill="#6A5ACD" 
                radius={[4, 4, 0, 0]}
                name={currentConfig.metric.replace('_', ' ').toUpperCase()}
              >
                {/* Add value labels on top of each bar */}
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#6A5ACD" />
                ))}
              </Bar>
              {/* Add LabelList for value labels on bars */}
              <LabelList 
                dataKey="value" 
                position="top" 
                formatter={(value: number) => 
                  isCurrency ? `$${(value / 1000).toFixed(0)}K` : 
                  isWRVU ? value.toLocaleString() : 
                  `$${value}`
                }
                style={{ fontSize: 11, fill: '#374151', fontWeight: 500 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Action Buttons - Top of page */}
      <div className="flex gap-2">
        <Button
          variant="contained"
          startIcon={<BookmarkIcon className="h-4 w-4" />}
          onClick={saveCurrentReport}
          disabled={!currentConfig.name.trim()}
          sx={{
            backgroundColor: '#6A5ACD',
            borderRadius: '8px',
            '&:hover': {
              backgroundColor: '#5A4ACD'
            }
          }}
        >
          Save Report
        </Button>
        <Button
          variant="outlined"
          startIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
          onClick={exportData}
          disabled={chartData.length === 0}
          sx={{ borderRadius: '8px' }}
        >
          Export
        </Button>
      </div>

      {/* Filters - Spanning across both containers */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <Typography variant="h6" className="mb-4 text-gray-900 font-semibold">
            Filters
          </Typography>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Specialty Filter */}
            <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
              <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
                Specialties
              </Typography>
              <Autocomplete
                multiple
                value={currentConfig.filters.specialties}
                onChange={(event: any, newValue: string[]) => {
                  // Handle "Select All" logic
                  if (newValue.includes('__select_all__')) {
                    if (currentConfig.filters.specialties.length === availableOptions.specialties.length) {
                      // If all are selected, deselect all
                      handleFilterChange('specialties', []);
                    } else {
                      // Select all specialties
                      handleFilterChange('specialties', availableOptions.specialties);
                    }
                  } else {
                    // Normal selection
                    handleFilterChange('specialties', newValue);
                  }
                }}
                options={['__select_all__', ...availableOptions.specialties]}
                getOptionLabel={(option: string) => {
                  if (option === '__select_all__') {
                    return `☐ Select All Specialties (${availableOptions.specialties.length})`;
                  }
                  return formatSpecialtyForDisplay(option);
                }}
                renderInput={(params: any) => (
                  <TextField
                    {...params}
                    placeholder="Search for specialties..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          borderColor: '#9ca3af',
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'white',
                          boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)',
                          borderColor: '#3b82f6',
                        }
                      },
                      '& .MuiInputBase-input': {
                        paddingTop: '8px',
                        paddingBottom: '8px',
                        paddingLeft: '12px',
                        paddingRight: '12px',
                      }
                    }}
                  />
                )}
                renderTags={(value: string[], getTagProps: any) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {value.map((option: string, index: number) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option}
                        label={formatSpecialtyForDisplay(option)}
                        size="small"
                        sx={{ backgroundColor: '#6A5ACD', color: 'white' }}
                      />
                    ))}
                  </Box>
                )}
                sx={{
                  '& .MuiAutocomplete-paper': {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                    maxHeight: '300px'
                  },
                  '& .MuiAutocomplete-option': {
                    '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                    '&.Mui-selected': { 
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.2)' }
                    }
                  }
                }}
                noOptionsText="No specialties found"
                clearOnBlur={false}
                blurOnSelect={true}
              />
            </FormControl>

            {/* Region Filter */}
            <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
              <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
                Regions
              </Typography>
              <Select
                multiple
                value={currentConfig.filters.regions}
                onChange={(e: SelectChangeEvent<string[]>) => handleFilterChange('regions', e.target.value as string[])}
                renderValue={(selected: string[]) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value: string) => (
                      <Chip 
                        key={value} 
                        label={value} 
                        size="small"
                        sx={{ backgroundColor: '#6A5ACD', color: 'white' }}
                      />
                    ))}
                  </Box>
                )}
                sx={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  }
                }}
              >
                {availableOptions.regions.map((region) => (
                  <MenuItem key={region} value={region}>
                    {region}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Survey Source Filter */}
            <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
              <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
                Survey Sources
              </Typography>
              <Select
                multiple
                value={currentConfig.filters.surveySources}
                onChange={(e: SelectChangeEvent<string[]>) => handleFilterChange('surveySources', e.target.value as string[])}
                renderValue={(selected: string[]) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value: string) => (
                      <Chip 
                        key={value} 
                        label={value} 
                        size="small"
                        sx={{ backgroundColor: '#6A5ACD', color: 'white' }}
                      />
                    ))}
                  </Box>
                )}
                sx={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  }
                }}
              >
                {availableOptions.surveySources.map((source) => (
                  <MenuItem key={source} value={source}>
                    {source}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </CardContent>
      </Card>

      {/* Report Builder - Spanning across full width */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <Typography variant="h6" className="mb-4 text-gray-900 font-semibold">
            Report Builder
          </Typography>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Report Name */}
            <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
              <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
                Report Name
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Enter report name to save..."
                value={currentConfig.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleConfigChange('name', e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  }
                }}
              />
            </FormControl>

            {/* Dimension Selector */}
            <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
              <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
                Group By (X-Axis)
              </Typography>
              <Select
                value={currentConfig.dimension}
                onChange={(e: SelectChangeEvent<string>) => handleConfigChange('dimension', e.target.value)}
                sx={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  }
                }}
              >
                <MenuItem value="specialty">Specialty</MenuItem>
                <MenuItem value="region">Region</MenuItem>
                <MenuItem value="providerType">Provider Type</MenuItem>
              </Select>
            </FormControl>

            {/* Metric Selector */}
            <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
              <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
                Measure (Y-Axis)
              </Typography>
              <Select
                value={currentConfig.metric}
                onChange={(e: SelectChangeEvent<string>) => handleConfigChange('metric', e.target.value)}
                sx={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  }
                }}
              >
                <MenuItem value="tcc_p25">TCC 25th Percentile</MenuItem>
                <MenuItem value="tcc_p50">TCC 50th Percentile</MenuItem>
                <MenuItem value="tcc_p75">TCC 75th Percentile</MenuItem>
                <MenuItem value="tcc_p90">TCC 90th Percentile</MenuItem>
                <MenuItem value="wrvu_p25">wRVU 25th Percentile</MenuItem>
                <MenuItem value="wrvu_p50">wRVU 50th Percentile</MenuItem>
                <MenuItem value="wrvu_p75">wRVU 75th Percentile</MenuItem>
                <MenuItem value="wrvu_p90">wRVU 90th Percentile</MenuItem>
                <MenuItem value="cf_p25">CF 25th Percentile</MenuItem>
                <MenuItem value="cf_p50">CF 50th Percentile</MenuItem>
                <MenuItem value="cf_p75">CF 75th Percentile</MenuItem>
                <MenuItem value="cf_p90">CF 90th Percentile</MenuItem>
              </Select>
            </FormControl>

            {/* Chart Type Selector */}
            <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
              <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
                Chart Type
              </Typography>
              <Select
                value={currentConfig.chartType}
                onChange={(e: SelectChangeEvent<string>) => handleConfigChange('chartType', e.target.value)}
                sx={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  }
                }}
              >
                <MenuItem value="bar">Bar Chart</MenuItem>
                <MenuItem value="line">Line Chart</MenuItem>
                <MenuItem value="pie">Pie Chart</MenuItem>
              </Select>
            </FormControl>
          </div>
        </CardContent>
      </Card>

      {/* Saved Reports */}
      {savedReports.length > 0 && (
        <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <Typography variant="h6" className="mb-4 text-gray-900 font-semibold">
              Saved Reports
            </Typography>
            
            <div className="space-y-2">
              {savedReports.map((report) => (
                <div 
                  key={report.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <Typography variant="body2" className="font-medium text-gray-900 truncate">
                      {report.name}
                    </Typography>
                    <Typography variant="caption" className="text-gray-500">
                      {report.dimension} × {report.metric.replace('_', ' ')}
                    </Typography>
                  </div>
                  <div className="flex gap-1">
                    <Tooltip title="Load Report">
                      <IconButton 
                        size="small" 
                        onClick={() => loadReport(report)}
                        sx={{ color: '#6A5ACD' }}
                      >
                        <BookmarkIcon className="h-4 w-4" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Report">
                      <IconButton 
                        size="small" 
                        onClick={() => deleteReport(report.id)}
                        sx={{ color: '#ef4444' }}
                      >
                        <BookmarkSlashIcon className="h-4 w-4" />
                      </IconButton>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart Preview */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Typography variant="h6" className="text-gray-900 font-semibold">
                {currentConfig.name || 'Report Preview'}
              </Typography>
                            <Typography variant="body2" className="text-gray-600">
                {currentConfig.dimension.replace('_', ' ')} × {currentConfig.metric.replace('_', ' ')} ({chartData.length} items)

                {currentConfig.dimension === 'specialty' && currentConfig.filters.specialties.length === 0 && (
                  <span className="ml-2 text-orange-600 text-sm">
                    • Select at least one specialty to view data
                  </span>
                )}
              </Typography>
            </div>
          </div>

          {renderChart()}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomReports;
