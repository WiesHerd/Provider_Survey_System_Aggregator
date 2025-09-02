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
import { filterSpecialtyOptions } from '../shared/utils/specialtyMatching';
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
  console.log('🔄 CustomReports component rendering...');
  
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

  // All available options (before cascading)
  const [allAvailableOptions, setAllAvailableOptions] = useState({
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
        
        // Load specialty mappings and column mappings first
        const mappings = await dataService.getAllSpecialtyMappings();
        const columnMappings = await dataService.getAllColumnMappings();
        console.log('🗺️ Loaded specialty mappings:', mappings.length, 'mappings');
        console.log('📋 Sample mappings:', mappings.slice(0, 3).map(mapping => ({
          standardizedName: mapping.standardizedName,
          sourceSpecialties: mapping.sourceSpecialties.map(src => src.specialty)
        })));
        setSpecialtyMappings(mappings);
        
        // Get all surveys first
        const surveys = await dataService.getAllSurveys();
        
        // Collect all data from all surveys with survey source information
        const allData: ISurveyRow[] = [];
        
        for (const survey of surveys) {
          try {
            const surveyData = await dataService.getSurveyData(survey.id);
            if (surveyData.rows) {
              const surveySource = (survey as any).type || 'Unknown';
              
              // Apply the same variable-based transformation as RegionalAnalytics
              const transformedRows = surveyData.rows.map(row => {
                const transformedRow: any = {
                  ...row,
                  surveySource: surveySource,
                  specialty: row.specialty || row.normalizedSpecialty || '',
                  geographicRegion: row.geographic_region || row.region || row.geographicRegion || 
                                  row.Geographic_Region || row.Region || row['Geographic Region'] || '',
                  providerType: row.providerType || row.provider_type || row.ProviderType || 
                              row.Provider_Type || row['Provider Type'] || row.Type || '',
                  // Initialize compensation fields
                  tcc_p25: 0,
                  tcc_p50: 0,
                  tcc_p75: 0,
                  tcc_p90: 0,
                  cf_p25: 0,
                  cf_p50: 0,
                  cf_p75: 0,
                  cf_p90: 0,
                  wrvu_p25: 0,
                  wrvu_p50: 0,
                  wrvu_p75: 0,
                  wrvu_p90: 0,
                  n_orgs: 0,
                  n_incumbents: 0
                };

                // Handle variable-based data structure (same as RegionalAnalytics)
                if (row.variable) {
                  const variable = String(row.variable).toLowerCase();
                  const p25 = Number(row.p25) || 0;
                  const p50 = Number(row.p50) || 0;
                  const p75 = Number(row.p75) || 0;
                  const p90 = Number(row.p90) || 0;
                  
                  if (variable.includes('tcc') || variable.includes('total') || variable.includes('cash')) {
                    transformedRow.tcc_p25 = p25;
                    transformedRow.tcc_p50 = p50;
                    transformedRow.tcc_p75 = p75;
                    transformedRow.tcc_p90 = p90;
                  } else if (variable.includes('cf') || variable.includes('conversion')) {
                    transformedRow.cf_p25 = p25;
                    transformedRow.cf_p50 = p50;
                    transformedRow.cf_p75 = p75;
                    transformedRow.cf_p90 = p90;
                  } else if (variable.includes('wrvu') || variable.includes('rvu') || variable.includes('work')) {
                    transformedRow.wrvu_p25 = p25;
                    transformedRow.wrvu_p50 = p50;
                    transformedRow.wrvu_p75 = p75;
                    transformedRow.wrvu_p90 = p90;
                  }
                }

                return transformedRow;
              });
              
              allData.push(...transformedRows);
            }
          } catch (error) {
            console.warn(`Failed to load data for survey ${survey.id}:`, error);
          }
        }
        
        if (allData.length > 0) {
          console.log('📊 Loaded survey data:', allData.length, 'total rows');
          console.log('📋 Sample data rows:', allData.slice(0, 3).map(row => ({
            specialty: row.specialty,
            normalizedSpecialty: row.normalizedSpecialty,
            surveySource: (row as any).surveySource,
            region: (row as any).geographic_region || (row as any).Region || row.region || row.geographicRegion,
            tcc_p50: row.tcc_p50
          })));
          
          setSurveyData(allData);
          
          // Extract available options from survey data (not just mapped specialties)
          const allSpecialtiesFromData = [...new Set(allData.map((row: ISurveyRow) => String(row.specialty || row.normalizedSpecialty || '')).filter(Boolean))] as string[];
          const mappedSpecialties = mappings.map((mapping: ISpecialtyMapping) => mapping.standardizedName).filter(Boolean);
          
          console.log('🔍 Raw specialties from data:', allSpecialtiesFromData);
          console.log('🗺️ Mapped specialties:', mappedSpecialties);
          
          // Use ONLY standardized specialty names from mappings (like Regional Analytics)
          // This ensures we show the parent specialties, not the raw data specialties
          const specialties = mappedSpecialties.filter(mappedSpecialty => {
            // Check if this mapped specialty has any data by looking at source specialties
            const mapping = mappings.find(m => m.standardizedName === mappedSpecialty);
            if (mapping) {
              const sourceSpecialties = mapping.sourceSpecialties.map(src => src.specialty.toLowerCase());
              const hasData = allSpecialtiesFromData.some(dataSpecialty => 
                sourceSpecialties.some(sourceSpec => 
                  dataSpecialty.toLowerCase().includes(sourceSpec) || 
                  sourceSpec.includes(dataSpecialty.toLowerCase())
                )
              );
              
              if (hasData) {
                console.log(`✅ Mapped specialty "${mappedSpecialty}" has data`);
                return true;
              } else {
                console.log(`❌ Mapped specialty "${mappedSpecialty}" has NO data`);
                return false;
              }
            }
            return false;
          }).sort();
          
          console.log(`📊 Specialty filtering summary:`);
          console.log(`   - Raw specialties from data: ${allSpecialtiesFromData.length}`);
          console.log(`   - Total mapped specialties: ${mappedSpecialties.length}`);
          console.log(`   - Final standardized specialties with data: ${specialties.length}`);
          console.log(`   - Filtered out: ${mappedSpecialties.length - specialties.length} mapped specialties without data`);
          console.log(`   - Using parent/standardized names only (like Regional Analytics)`);
          
          const regions = [...new Set(allData.map((row: ISurveyRow) => String((row as any).geographic_region || (row as any).Region || row.region || row.geographicRegion || '')).filter(Boolean))] as string[];
          
          // For survey sources, we need to get the survey type from the surveys table
          // Since we don't have direct access to survey metadata in the rows, 
          // we'll need to get this from the surveys list
          const surveySources = [...new Set(surveys.map((survey: any) => (survey as any).type || survey.surveyProvider || '').filter(Boolean))] as string[];
          
          console.log(`📊 Data summary:`);
          console.log(`   - Regions with data: ${regions.length}`);
          console.log(`   - Survey sources with data: ${surveySources.length}`);
          
          // Store all available options
          setAllAvailableOptions({
            specialties,
            regions,
            surveySources
          });

          console.log('🔍 DEBUG - Available specialties for filter:', specialties);
          console.log('🔍 DEBUG - Available regions for filter:', regions);
          console.log('🔍 DEBUG - Available survey sources for filter:', surveySources);
          
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

  // Calculate cascading options based on current filters
  const calculateCascadingOptions = useMemo(() => {
    if (!surveyData.length) {
      return {
        specialties: allAvailableOptions.specialties,
        regions: allAvailableOptions.regions,
        surveySources: allAvailableOptions.surveySources
      };
    }

    let filteredData = surveyData;

    // Apply region filter (but NOT specialty filter to avoid circular dependency)
    if (currentConfig.filters.regions.length > 0) {
      filteredData = filteredData.filter(row => 
        currentConfig.filters.regions.includes(String((row as any).geographic_region || (row as any).Region || row.region || row.geographicRegion || ''))
      );
    }

    // Apply survey source filter
    if (currentConfig.filters.surveySources.length > 0) {
      filteredData = filteredData.filter(row => 
        currentConfig.filters.surveySources.includes(String((row as any).surveySource || ''))
      );
    }

    // Extract available options from filtered data
    const availableRegions = new Set<string>();
    const availableSurveySources = new Set<string>();

    filteredData.forEach(row => {
      // Add regions
      const region = String((row as any).geographic_region || (row as any).Region || row.region || row.geographicRegion || '');
      if (region) availableRegions.add(region);

      // Add survey sources
      const surveySource = String((row as any).surveySource || '');
      if (surveySource) availableSurveySources.add(surveySource);
    });

    return {
      specialties: allAvailableOptions.specialties, // Always use all available specialties
      regions: Array.from(availableRegions).sort(),
      surveySources: Array.from(availableSurveySources).sort()
    };
  }, [surveyData, currentConfig.filters.regions, currentConfig.filters.surveySources, specialtyMappings, allAvailableOptions.specialties, allAvailableOptions.regions, allAvailableOptions.surveySources]);

  // Update available options when filters change
  useEffect(() => {
    setAvailableOptions(prev => ({
      ...prev,
      ...calculateCascadingOptions
    }));
  }, [calculateCascadingOptions]);

  // Generate chart data based on current configuration
  const chartData = useMemo((): ChartDataItem[] => {
    console.log('🔄 Generating chart data...');
    console.log('📊 Total survey data rows:', surveyData.length);
    console.log('🎯 Current config:', currentConfig);
    console.log('🗺️ Specialty mappings count:', specialtyMappings.length);
    
    if (!surveyData.length) {
      console.log('❌ No survey data available');
      return [];
    }

    // Apply filters
    let filteredData = surveyData;
    console.log('🔍 Starting with', filteredData.length, 'rows');
    
    if (currentConfig.filters.specialties.length > 0) {
        console.log('🎯 Filtering by specialties:', currentConfig.filters.specialties);
        
      // Create a mapping from standardized names to source specialties
      const specialtyMappingLookup = new Map<string, string[]>();
        console.log('🎯 Selected specialties:', currentConfig.filters.specialties);
        console.log('🗺️ Available mappings:', specialtyMappings.map(m => m.standardizedName));
        
      specialtyMappings.forEach(mapping => {
        if (currentConfig.filters.specialties.includes(mapping.standardizedName)) {
          const sourceSpecialties = mapping.sourceSpecialties.map(src => src.specialty.toLowerCase());
          specialtyMappingLookup.set(mapping.standardizedName, sourceSpecialties);
            console.log(`📋 Mapping "${mapping.standardizedName}" to:`, sourceSpecialties);
          }
        });
        
        // If no mappings found, try to find partial matches
        if (specialtyMappingLookup.size === 0) {
          console.log('⚠️ No exact mappings found, trying partial matches...');
          specialtyMappings.forEach(mapping => {
            const standardizedName = mapping.standardizedName.toLowerCase();
            if (currentConfig.filters.specialties.some(selected => 
              selected.toLowerCase().includes(standardizedName) || 
              standardizedName.includes(selected.toLowerCase())
            )) {
              const sourceSpecialties = mapping.sourceSpecialties.map(src => src.specialty.toLowerCase());
              specialtyMappingLookup.set(mapping.standardizedName, sourceSpecialties);
              console.log(`📋 Partial match: "${mapping.standardizedName}" to:`, sourceSpecialties);
            }
          });
        }
        
        console.log('🔍 Specialty mapping lookup:', Object.fromEntries(specialtyMappingLookup));
        
        const beforeSpecialtyFilter = filteredData.length;
      filteredData = filteredData.filter(row => {
        const rowSpecialty = String(row.specialty || row.normalizedSpecialty || '').toLowerCase();
          
          // Check if it matches any of the mapped specialties
          let matches = false;
          
          // First, try exact match with mapped specialties
          for (const [standardizedName, sourceSpecialties] of specialtyMappingLookup.entries()) {
            if (sourceSpecialties.includes(rowSpecialty)) {
              matches = true;
              break;
            }
          }
          
          // If no exact match, try partial matching for specialty names
          if (!matches) {
            for (const [standardizedName, sourceSpecialties] of specialtyMappingLookup.entries()) {
              if (sourceSpecialties.some(sourceSpec => 
                rowSpecialty.includes(sourceSpec.toLowerCase()) || 
                sourceSpec.toLowerCase().includes(rowSpecialty)
              )) {
                matches = true;
                break;
              }
            }
          }
          
          // If still no match, try matching against the standardized name itself
          if (!matches) {
            for (const [standardizedName, sourceSpecialties] of specialtyMappingLookup.entries()) {
              if (rowSpecialty.includes(standardizedName.toLowerCase()) || 
                  standardizedName.toLowerCase().includes(rowSpecialty)) {
                matches = true;
                break;
              }
            }
          }
          
          // Debug: Log what we're looking for vs what we found
          if (filteredData.indexOf(row) < 3) {
            console.log(`🔍 Row specialty: "${rowSpecialty}" - looking for:`, Array.from(specialtyMappingLookup.keys()));
            console.log(`🔍 Available source specialties:`, Array.from(specialtyMappingLookup.values()).flat());
          }
          
          // Debug first few rows
          if (filteredData.indexOf(row) < 5) {
            console.log(`🔍 Row specialty: "${rowSpecialty}" - matches: ${matches}`);
          }
          
          return matches;
        });
        console.log(`🎯 Specialty filter: ${beforeSpecialtyFilter} → ${filteredData.length} rows`);
    }
    
    if (currentConfig.filters.regions.length > 0) {
      console.log('🌍 Filtering by regions:', currentConfig.filters.regions);
      const beforeRegionFilter = filteredData.length;
      filteredData = filteredData.filter(row => {
        const region = String((row as any).geographic_region || (row as any).Region || row.region || row.geographicRegion || '');
        const matches = currentConfig.filters.regions.includes(region);
        
        // Debug first few rows
        if (filteredData.indexOf(row) < 5) {
          console.log(`🌍 Row region: "${region}" - matches: ${matches}`);
        }
        
        return matches;
      });
      console.log(`🌍 Region filter: ${beforeRegionFilter} → ${filteredData.length} rows`);
    }
    
    if (currentConfig.filters.surveySources.length > 0) {
      console.log('📋 Filtering by survey sources:', currentConfig.filters.surveySources);
      const beforeSourceFilter = filteredData.length;
      filteredData = filteredData.filter(row => {
        const surveySource = String((row as any).surveySource || '');
        const matches = currentConfig.filters.surveySources.includes(surveySource);
        
        // Debug first few rows
        if (filteredData.indexOf(row) < 5) {
          console.log(`📋 Row survey source: "${surveySource}" - matches: ${matches}`);
        }
        
        return matches;
      });
      console.log(`📋 Survey source filter: ${beforeSourceFilter} → ${filteredData.length} rows`);
    }

    console.log('✅ After all filters:', filteredData.length, 'rows remaining');

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

    console.log('📊 Grouped data keys:', Object.keys(grouped));

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
    
    console.log('📈 Final chart data:', allData.length, 'items');
    console.log('📊 Sample chart data:', allData.slice(0, 3));
    
    // For specialty dimension, require at least one specialty to be selected
    if (currentConfig.dimension === 'specialty') {
      if (currentConfig.filters.specialties.length === 0) {
        console.log('❌ Specialty dimension with no filters - returning empty data');
        return []; // Return empty data when no specialty filter is applied
      } else {
        console.log('✅ Specialty dimension with filters - returning filtered data:', allData.length, 'items');
        return allData; // Show filtered specialties
      }
    } else {
      console.log('📊 Non-specialty dimension - limiting to top 20');
      return allData.slice(0, 20); // Limit other dimensions to top 20
    }
  }, [surveyData, currentConfig, specialtyMappings]);

  // Handle configuration changes
  const handleConfigChange = (key: keyof typeof currentConfig, value: any) => {
    setCurrentConfig(prev => ({ ...prev, [key]: value }));
  };

  // Handle filter changes
  const handleFilterChange = (filterType: keyof typeof currentConfig.filters, value: string[]) => {
    setCurrentConfig(prev => {
      const newFilters = { ...prev.filters, [filterType]: value };
      
      // Clear dependent filters when parent filter changes
      if (filterType === 'specialties') {
        // When specialties change, clear regions and survey sources
        newFilters.regions = [];
        newFilters.surveySources = [];
      } else if (filterType === 'regions') {
        // When regions change, clear survey sources
        newFilters.surveySources = [];
      }
      
      return {
        ...prev,
        filters: newFilters
      };
    });
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

  // Smart scaling function to make differences more prominent
  const calculateOptimalYAxis = (data: any[], isCurrency: boolean, isWRVU: boolean) => {
    if (data.length === 0) return { min: 0, max: 100 };
    
    const values = data.map(item => item.value).filter(val => val !== null && val !== undefined);
    if (values.length === 0) return { min: 0, max: 100 };
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    // If values are very close together (less than 5% difference), use smart scaling
    const percentageDifference = range / max;
    
    if (percentageDifference < 0.05 && range > 0) {
      // Use a tighter range to make differences more visible
      const padding = range * 0.2; // 20% padding
      const smartMin = Math.max(0, min - padding);
      const smartMax = max + padding;
      
      return { min: smartMin, max: smartMax };
    }
    
    // Default scaling with 10% padding
    const padding = range * 0.1;
    return { 
      min: Math.max(0, min - padding), 
      max: max + padding 
    };
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
    
    // Calculate optimal Y-axis scaling
    const yAxisConfig = calculateOptimalYAxis(chartData, isCurrency, isWRVU);

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
                  domain={[yAxisConfig.min, yAxisConfig.max]}
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
                domain={[yAxisConfig.min, yAxisConfig.max]}
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
      <div className="flex justify-between items-center">
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

        {/* Saved Reports Dropdown */}
        {savedReports.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              value=""
              onChange={(e: SelectChangeEvent<string>) => {
                const report = savedReports.find(r => r.id === e.target.value);
                if (report) loadReport(report);
              }}
              displayEmpty
              sx={{
                backgroundColor: 'white',
                borderRadius: '8px',
                fontSize: '0.875rem',
                border: '1px solid #d1d5db',
                '&:hover': {
                  borderColor: '#6366f1',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                },
                '&.Mui-focused': {
                  backgroundColor: 'white',
                  boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
                  borderColor: '#6366f1',
                }
              }}
            >
              <MenuItem value="" disabled>
                <em>📁 Saved Reports</em>
              </MenuItem>
              {savedReports.map((report) => (
                <MenuItem key={report.id} value={report.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="font-medium text-gray-900">{report.name}</div>
                    <div className="text-xs text-gray-500">{report.dimension} × {report.metric.replace('_', ' ')}</div>
                  </div>
                  <IconButton 
                    size="small" 
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      deleteReport(report.id);
                    }}
                    sx={{ 
                      color: '#ef4444',
                      '&:hover': { backgroundColor: '#fee2e2' }
                    }}
                  >
                    <BookmarkSlashIcon className="h-3 w-3" />
                  </IconButton>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </div>

      {/* Report Builder - First, define what you want to build */}
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

      {/* Filters - Then filter the data */}
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <Typography variant="h6" className="mb-4 text-gray-900 font-semibold">
            Filters
          </Typography>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Specialty Filter */}
            <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
              <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
                Specialties ({availableOptions.specialties.length} available)
              </Typography>
              <Autocomplete
                multiple
                value={currentConfig.filters.specialties}
                onChange={(event: any, newValue: string[]) => {
                  console.log('AUTOCOMPLETE onChange - newValue:', newValue);
                  handleFilterChange('specialties', newValue);
                }}
                options={availableOptions.specialties}
                getOptionKey={(option: string) => option}
                onOpen={() => {
                  console.log('🚨 AUTOCOMPLETE OPENED - Available options:', availableOptions.specialties);
                  console.log('🚨 AUTOCOMPLETE OPENED - Options length:', availableOptions.specialties.length);
                }}
                getOptionLabel={(option: string) => formatSpecialtyForDisplay(option)}
                renderInput={(params: any) => (
                  <TextField
                    {...params}
                    placeholder="Search and select specialties..."
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        height: '40px',
                        border: '1px solid #d1d5db',
                        '&:hover': {
                          borderColor: '#9ca3af',
                        },
                        '&.Mui-focused': {
                          borderColor: '#3b82f6',
                          boxShadow: 'none',
                        }
                      }
                    }}
                  />
                )}
                renderTags={(value: string[], getTagProps: any) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {value.map((option: string, index: number) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={`${option}-${index}`}
                        label={formatSpecialtyForDisplay(option)}
                        size="small"
                        sx={{ 
                          backgroundColor: '#6366f1', 
                          color: 'white',
                          '& .MuiChip-deleteIcon': {
                            color: 'rgba(255, 255, 255, 0.8)',
                            '&:hover': { color: 'white' }
                          }
                        }}
                      />
                    ))}
                  </Box>
                )}
                sx={{
                  '& .MuiAutocomplete-paper': {
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.08)',
                    maxHeight: '300px'
                  },
                  '& .MuiAutocomplete-option': {
                    padding: '8px 12px',
                    fontSize: '0.875rem',
                    '&:hover': { backgroundColor: '#f3f4f6' },
                    '&.Mui-selected': { 
                      backgroundColor: '#ede9fe',
                      color: '#5b21b6'
                    }
                  }
                }}
                noOptionsText="No specialties found"
                clearOnBlur={false}
                disableCloseOnSelect={true}
                filterOptions={(options: string[], { inputValue }: { inputValue: string }) => filterSpecialtyOptions(options, inputValue)}
              />
            </FormControl>

            {/* Region Filter */}
            <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
              <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
                Regions
              </Typography>
              <Autocomplete
                multiple
                value={currentConfig.filters.regions}
                onChange={(event: any, newValue: string[]) => handleFilterChange('regions', newValue)}
                options={availableOptions.regions}
                getOptionLabel={(option: string) => option}
                renderInput={(params: any) => (
                  <TextField
                    {...params}
                    placeholder="Select regions..."
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        height: '40px',
                        border: '1px solid #d1d5db',
                        '&:hover': {
                          borderColor: '#9ca3af',
                          backgroundColor: 'rgba(255, 255, 255, 0.95)'
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'white',
                          boxShadow: 'none',
                          borderColor: '#3b82f6'
                        }
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
                        label={option}
                        size="small"
                        sx={{ 
                          backgroundColor: '#059669', 
                          color: 'white',
                          fontWeight: '500',
                          '& .MuiChip-deleteIcon': {
                            color: 'rgba(255, 255, 255, 0.8)',
                            '&:hover': { color: 'white' }
                          }
                        }}
                      />
                    ))}
                  </Box>
                )}
                sx={{
                  '& .MuiAutocomplete-paper': {
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
                    maxHeight: '300px',
                    marginTop: '4px'
                  },
                  '& .MuiAutocomplete-option': {
                    padding: '8px 12px',
                    fontSize: '0.875rem',
                    '&:hover': { backgroundColor: '#f3f4f6' },
                    '&.Mui-selected': { 
                      backgroundColor: '#e5f3ee',
                      color: '#065f46',
                      fontWeight: 500
                    }
                  }
                }}
                noOptionsText="No regions found"
                clearOnBlur={false}
                disableCloseOnSelect={true}
              />
            </FormControl>

            {/* Survey Source Filter */}
            <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
              <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
                Survey Sources
              </Typography>
              <Autocomplete
                multiple
                value={currentConfig.filters.surveySources}
                onChange={(event: any, newValue: string[]) => handleFilterChange('surveySources', newValue)}
                options={availableOptions.surveySources}
                getOptionLabel={(option: string) => option}
                renderInput={(params: any) => (
                  <TextField
                    {...params}
                    placeholder="Select survey sources..."
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        height: '40px',
                        border: '1px solid #d1d5db',
                        '&:hover': {
                          borderColor: '#9ca3af',
                          backgroundColor: 'rgba(255, 255, 255, 0.95)'
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'white',
                          boxShadow: 'none',
                          borderColor: '#3b82f6'
                        }
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
                        label={option}
                        size="small"
                        sx={{ 
                          backgroundColor: '#dc2626', 
                          color: 'white',
                          fontWeight: '500',
                          '& .MuiChip-deleteIcon': {
                            color: 'rgba(255, 255, 255, 0.8)',
                            '&:hover': { color: 'white' }
                          }
                        }}
                      />
                    ))}
                  </Box>
                )}
                sx={{
                  '& .MuiAutocomplete-paper': {
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.08)',
                    maxHeight: '300px',
                    marginTop: '4px'
                  },
                  '& .MuiAutocomplete-option': {
                    padding: '8px 12px',
                    fontSize: '0.875rem',
                    '&:hover': { backgroundColor: '#f3f4f6' },
                    '&.Mui-selected': { 
                      backgroundColor: '#fde8e8',
                      color: '#b91c1c',
                      fontWeight: 500
                    }
                  }
                }}
                noOptionsText="No survey sources found"
                clearOnBlur={false}
                disableCloseOnSelect={true}
              />
            </FormControl>
          </div>
        </CardContent>
      </Card>


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
                {(() => {
                  const values = chartData.map(item => item.value);
                  const min = Math.min(...values);
                  const max = Math.max(...values);
                  const range = max - min;
                  const percentageDifference = range / max;
                  
                  if (percentageDifference < 0.05 && range > 0) {
                    return (
                      <span className="ml-2 text-blue-600 text-sm">
                        • Enhanced scaling applied for better visibility
                      </span>
                    );
                  }
                  return null;
                })()}

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
