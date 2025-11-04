import React, { useState, useEffect, useMemo } from 'react';
import { 
  FormControl, 
  Select, 
  MenuItem, 
  TextField, 
  Card, 
  CardContent, 
  Typography,
  Chip,
  Box,
  IconButton,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { UnifiedLoadingSpinner } from '../shared/components/UnifiedLoadingSpinner';
import { useSmoothProgress } from '../shared/hooks/useSmoothProgress';
import { SelectChangeEvent } from '@mui/material/Select';
import { 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { EChartsBar, EChartsCF } from './charts';
import { 
  DocumentArrowDownIcon,
  BookmarkIcon,
  BookmarkSlashIcon
} from '@heroicons/react/24/outline';
import { EmptyState } from '../features/mapping/components/shared/EmptyState';
import { BoltIcon } from '@heroicons/react/24/outline';
import { getDataService } from '../services/DataService';
import { formatSpecialtyForDisplay } from '../shared/utils/formatters';
import { ISurveyRow } from '../types/survey';
// import { ISpecialtyMapping } from '../types/specialty'; // Not currently used
import { useYear } from '../contexts/YearContext';

interface ReportConfig {
  id: string;
  name: string;
  dimension: string;
  secondaryDimension?: string | null; // Add secondary grouping dimension
  metric: string;
  metrics: string[]; // Add multi-select metrics
  chartType: 'bar' | 'line' | 'pie';
  filters: {
    specialties: string[];
    regions: string[];
    surveySources: string[];
    providerTypes: string[];
    years: string[]; // Add year filtering
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
  metrics?: string[];
  metricValues?: Record<string, number>;
  metricTotals?: Record<string, number>;
  metricCounts?: Record<string, number>;
}

const COLORS = ['#6A5ACD', '#8B7DD6', '#A89DE0', '#C5BDE9', '#E2D1F2'];

// Helper functions for safe field access with multiple possible field names
const getSpecialtyField = (row: any): string => {
  return String(row.specialty || row.normalizedSpecialty || row.Specialty || '');
};

const getRegionField = (row: any): string => {
  return String(
    row.geographicRegion || 
    row.geographic_region || 
    row.Region || 
    row.region || 
    row.Geographic_Region || 
    row['Geographic Region'] || 
    ''
  );
};

const getProviderTypeField = (row: any): string => {
  return String(
    row.providerType || 
    row.provider_type || 
    row.ProviderType || 
    row.Provider_Type || 
    row['Provider Type'] || 
    row.Type || 
    ''
  );
};

const getSurveySourceField = (row: any): string => {
  return String(row.surveySource || row.type || row.surveyProvider || '');
};

const getYearField = (row: any): string => {
  return String(row.surveyYear || row.year || '');
};

const CustomReports: React.FC<CustomReportsProps> = ({ 
  data: propData, 
  title = 'Custom Reports' 
}) => {
  // Use smooth progress for dynamic loading
  const { progress, startProgress, completeProgress } = useSmoothProgress({
    duration: 3000,
    maxProgress: 90,
    intervalMs: 100
  });
  
  // Year context
  const { currentYear } = useYear();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [surveyData, setSurveyData] = useState<ISurveyRow[]>([]);
  const [savedReports, setSavedReports] = useState<ReportConfig[]>([]);
  // Specialty mappings are loaded but not currently used in component logic
  // const [specialtyMappings, setSpecialtyMappings] = useState<ISpecialtyMapping[]>([]);
  // Modal functionality removed for cleaner interface
  // const [showDataViewer, setShowDataViewer] = useState(false);
  // const [selectedDataItem, setSelectedDataItem] = useState<ChartDataItem | null>(null);
  // const [rawDataForItem, setRawDataForItem] = useState<ISurveyRow[]>([]);
  
  // Current report configuration
  const [currentConfig, setCurrentConfig] = useState<Omit<ReportConfig, 'id' | 'created'>>({
    name: '',
    dimension: 'specialty',
    secondaryDimension: null, // Add secondary grouping dimension
    metric: 'tcc_p50',
    metrics: ['tcc_p50'], // Add multi-select metrics
    chartType: 'bar',
    filters: {
      specialties: [],
      regions: [],
      surveySources: [],
      providerTypes: [],
      years: [currentYear] // Default to current year
    }
  });

  // Available options
  const [availableOptions, setAvailableOptions] = useState({
    dimensions: ['specialty', 'region', 'providerType', 'surveySource'],
    metrics: ['tcc_p25', 'tcc_p50', 'tcc_p75', 'tcc_p90', 'wrvu_p25', 'wrvu_p50', 'wrvu_p75', 'wrvu_p90', 'cf_p25', 'cf_p50', 'cf_p75', 'cf_p90'],
    specialties: [] as string[],
    regions: [] as string[],
    surveySources: [] as string[],
    providerTypes: [] as string[],
    years: [] as string[]
  });

  // All available options (before cascading)
  const [allAvailableOptions, setAllAvailableOptions] = useState({
    specialties: [] as string[],
    regions: [] as string[],
    surveySources: [] as string[],
    providerTypes: [] as string[]
  });

  // Services
  const dataService = useMemo(() => getDataService(), []);

  // Load data - Custom Reports needs raw ISurveyRow data, so we load directly
  // But we can benefit from shared query cache for surveys list and mappings
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔍 Custom Reports: Starting data load...');
        setLoading(true);
        
        // Load specialty mappings (for future use if needed)
        // const mappings = await dataService.getAllSpecialtyMappings();
        // setSpecialtyMappings(mappings);
        
        // Get all surveys - this benefits from query deduplication if other routes are open
        const surveys = await dataService.getAllSurveys();
        console.log('🔍 Custom Reports: Loaded surveys:', surveys.length);
        
        // Collect all data from all surveys with survey source information
        const allData: ISurveyRow[] = [];
        
        for (const survey of surveys) {
          try {
            const surveyData = await dataService.getSurveyData(survey.id);
            if (surveyData.rows && surveyData.rows.length > 0) {
              const surveySource = (survey as any).type || 'Unknown';
              const surveyYear = (survey as any).year || (survey as any).surveyYear || 'Unknown';
              
              // Transform data with proper TCC field population based on variable type
              const transformedRows = surveyData.rows.map((row: any) => {
                const transformedRow: any = {
                  ...row,
                  surveySource: surveySource,
                  surveyYear: surveyYear,
                  specialty: row.specialty || row.normalizedSpecialty || '',
                  geographicRegion: row.geographic_region || row.region || row.geographicRegion || 
                                  row.Geographic_Region || row.Region || row['Geographic Region'] || '',
                  providerType: row.providerType || row.provider_type || row.ProviderType || 
                              row.Provider_Type || row['Provider Type'] || row.Type || '',
                  // Initialize all fields to 0
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
                };

                // If we have variable-based data, populate the appropriate fields
                if (row.variable) {
                  const variable = String(row.variable).toLowerCase();
                  // Parse currency values (remove $ and commas)
                  const p25 = parseFloat(String(row.p25 || 0).replace(/[$,]/g, '')) || 0;
                  const p50 = parseFloat(String(row.p50 || 0).replace(/[$,]/g, '')) || 0;
                  const p75 = parseFloat(String(row.p75 || 0).replace(/[$,]/g, '')) || 0;
                  const p90 = parseFloat(String(row.p90 || 0).replace(/[$,]/g, '')) || 0;
                  
                  // Skip this row entirely if values are too small (conversion factors, not compensation)
                  if (p50 < 1000) {
                    return transformedRow; // Return empty row, will be filtered out later
                  }
                  
                  // Debug raw percentile values
                  if (Math.random() < 0.01) { // Log 1% of rows for debugging
                    console.log('🔍 Custom Reports: Raw percentile values:', { p25, p50, p75, p90, variable, row });
                    console.log('🔍 Custom Reports: Variable classification check:', {
                      variable,
                      isTCC: (variable.includes('tcc') || variable.includes('total') || variable.includes('cash') || variable.includes('salary') || variable.includes('compensation') || variable.includes('base salary') || variable.includes('base pay')) && !variable.includes('per') && !variable.includes('/') && !variable.includes('ratio') && !variable.includes('conversion'),
                      isCF: variable.includes('conversion') || variable.includes(' cf ') || variable.includes('_cf_') || variable.includes('factor') || variable.includes('conversion factor') || variable.includes('per rvu') || variable.includes('per work rvu') || variable.includes('per wrvu') || variable.includes('/rvu') || variable.includes('/ rvu') || variable.includes('/wrvu') || variable.includes('/ wrvu') || (variable.includes('tcc') && (variable.includes('per') || variable.includes('/'))) || variable.includes('tcc per') || variable.includes('tcc/') || variable.includes('compensation per') || variable.includes('dollars per'),
                      isWRVU: variable.includes('wrvu') || variable.includes('rvu') || variable.includes('work'),
                      hasPerOrSlash: variable.includes('per') || variable.includes('/'),
                      hasRatioOrConversion: variable.includes('ratio') || variable.includes('conversion')
                    });
                  }
                  
                  // Check CF patterns FIRST (most specific) - TCC per wRVU ratios
                  if (variable.includes('conversion') || 
                      variable.includes(' cf ') ||
                      variable.includes('_cf_') ||
                      variable.includes('factor') || 
                      variable.includes('conversion factor') ||
                      variable.includes('per rvu') || 
                      variable.includes('per work rvu') || 
                      variable.includes('per wrvu') ||
                      variable.includes('/rvu') ||
                      variable.includes('/ rvu') ||
                      variable.includes('/wrvu') ||
                      variable.includes('/ wrvu') ||
                      (variable.includes('tcc') && (variable.includes('per') || variable.includes('/'))) ||
                      variable.includes('tcc per') ||
                      variable.includes('tcc/') ||
                      variable.includes('compensation per') ||
                      variable.includes('dollars per')) {
                    transformedRow.cf_p25 = p25;
                    transformedRow.cf_p50 = p50;
                    transformedRow.cf_p75 = p75;
                    transformedRow.cf_p90 = p90;
                  }
                  // Check wRVU patterns SECOND - Work RVUs (before TCC to avoid conflicts)
                  else if (variable.includes('wrvu') || variable.includes('rvu') || variable.includes('work')) {
                    transformedRow.wrvu_p25 = p25;
                    transformedRow.wrvu_p50 = p50;
                    transformedRow.wrvu_p75 = p75;
                    transformedRow.wrvu_p90 = p90;
                  }
                  // Check TCC patterns LAST (least specific) - Raw TCC compensation
                  // BUT exclude conversion factor patterns that contain 'per' or ratios
                  // AND ensure values are in reasonable compensation range (not ratios)
                  else if ((variable.includes('tcc') || 
                           variable.includes('total') || 
                           variable.includes('cash') ||
                           variable.includes('salary') ||
                           variable.includes('compensation') ||
                           variable.includes('base salary') ||
                           variable.includes('base pay')) &&
                           !variable.includes('per') && 
                           !variable.includes('/') &&
                           !variable.includes('ratio') &&
                           !variable.includes('conversion') &&
                           p50 > 1000) { // Only process if P50 is > $1000 (reasonable compensation)
                    transformedRow.tcc_p25 = p25;
                    transformedRow.tcc_p50 = p50;
                    transformedRow.tcc_p75 = p75;
                    transformedRow.tcc_p90 = p90;
                  }
                } else {
                  // If no variable, try direct field access (for pre-processed data)
                  // But only use values that are in reasonable compensation range
                  const tcc_p50 = Number(row.tcc_p50) || 0;
                  if (tcc_p50 > 1000) { // Only use if reasonable compensation amount
                    transformedRow.tcc_p25 = row.tcc_p25 || 0;
                    transformedRow.tcc_p50 = row.tcc_p50 || 0;
                    transformedRow.tcc_p75 = row.tcc_p75 || 0;
                    transformedRow.tcc_p90 = row.tcc_p90 || 0;
                  }
                  
                  transformedRow.cf_p25 = row.cf_p25 || 0;
                  transformedRow.cf_p50 = row.cf_p50 || 0;
                  transformedRow.cf_p75 = row.cf_p75 || 0;
                  transformedRow.cf_p90 = row.cf_p90 || 0;
                  transformedRow.wrvu_p25 = row.wrvu_p25 || 0;
                  transformedRow.wrvu_p50 = row.wrvu_p50 || 0;
                  transformedRow.wrvu_p75 = row.wrvu_p75 || 0;
                  transformedRow.wrvu_p90 = row.wrvu_p90 || 0;
                }

                return transformedRow;
              });
              
              // Filter out empty rows (conversion factors with small values)
              const validRows = transformedRows.filter(row => 
                (row.tcc_p50 && row.tcc_p50 > 1000) || 
                (row.cf_p50 && row.cf_p50 > 0) || 
                (row.wrvu_p50 && row.wrvu_p50 > 0)
              );
              allData.push(...validRows);
            }
          } catch (error) {
          }
        }
        
        if (allData.length > 0) {
          console.log('🔍 Custom Reports: Loaded data rows:', allData.length);
          console.log('🔍 Custom Reports: Sample TCC data:', allData.slice(0, 3).map(row => ({
            specialty: row.specialty,
            tcc_p50: row.tcc_p50,
            region: row.geographicRegion
          })));
          
          setSurveyData(allData);
          
          // Extract available options from survey data (not just mapped specialties)
          // Extract unique RAW specialties directly from data (unmapped)
          const specialties = [...new Set(allData
            .map((row: ISurveyRow) => String(row.specialty || row.normalizedSpecialty || ''))
            .filter(Boolean)
          )].sort();

          
          const regions = [...new Set(allData.map((row: ISurveyRow) => String((row as any).geographic_region || (row as any).Region || row.region || row.geographicRegion || '')).filter(Boolean))] as string[];
          
          // For survey sources, we need to get the survey type from the surveys table
          // Since we don't have direct access to survey metadata in the rows, 
          // we'll need to get this from the surveys list
          const surveySources = [...new Set(surveys.map((survey: any) => (survey as any).type || survey.surveyProvider || '').filter(Boolean))] as string[];
          
          // Extract provider types from data
          const providerTypes = [...new Set(allData.map((row: ISurveyRow) => String((row as any).providerType || (row as any).provider_type || (row as any).ProviderType || (row as any).Provider_Type || (row as any)['Provider Type'] || (row as any).Type || '')).filter(Boolean))] as string[];
          
          
          // Store all available options
          setAllAvailableOptions({
            specialties,
            regions,
            surveySources,
            providerTypes
          });

          
          // Extract available years from survey data
          const years = [...new Set(allData.map((row: ISurveyRow) => String(row.surveyYear || '')).filter(Boolean))].sort();
          
          setAvailableOptions({
            dimensions: ['specialty', 'region', 'providerType'],
            metrics: ['tcc_p25', 'tcc_p50', 'tcc_p75', 'tcc_p90', 'wrvu_p25', 'wrvu_p50', 'wrvu_p75', 'wrvu_p90', 'cf_p25', 'cf_p50', 'cf_p75', 'cf_p90'],
            specialties,
            regions,
            surveySources,
            providerTypes,
            years
          });
        }
      } catch (error) {
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
      regions: allAvailableOptions.regions, // Always use all available regions (no cascading)
      surveySources: Array.from(availableSurveySources).sort()
    };
  }, [surveyData, currentConfig.filters.regions, currentConfig.filters.surveySources, allAvailableOptions.specialties, allAvailableOptions.regions, allAvailableOptions.surveySources]);

  // Update available options when filters change
  useEffect(() => {
    setAvailableOptions(prev => ({
      ...prev,
      ...(calculateCascadingOptions || {})
    }));
  }, [calculateCascadingOptions]);

  // Generate chart data based on current configuration
  const chartData = useMemo((): ChartDataItem[] => {
    console.log('🔍 Custom Reports: Starting chartData generation');
    console.log('🔍 Custom Reports: Current config:', currentConfig);
    console.log('🔍 Custom Reports: Survey data length:', surveyData.length);
    console.log('📊 Initial surveyData count:', surveyData.length);
    console.log('⚙️ Current config:', {
      dimension: currentConfig.dimension,
      metric: currentConfig.metric,
      metrics: currentConfig.metrics,
      filters: currentConfig.filters
    });
    
    if (!surveyData.length) {
      console.log('❌ No survey data available');
      return [];
    }

    // Check if we have metrics selected
    if (!currentConfig.metrics.length && !currentConfig.metric) {
      console.log('❌ No metrics selected');
      return [];
    }

    // Use the first metric for chart display, but collect all metrics for table
    const primaryMetric = currentConfig.metrics.length > 0 ? currentConfig.metrics[0] : currentConfig.metric;
    console.log('🎯 Primary metric:', primaryMetric);

    // Apply filters
    let filteredData = surveyData;
    console.log('📋 Starting with', filteredData.length, 'rows');
    
    if (currentConfig.filters.specialties.length > 0) {
      const beforeSpecialtyFilter = filteredData.length;
      console.log('🔍 Applying specialty filter:', currentConfig.filters.specialties);
      
      // Direct raw specialty filtering (NO mapping)
      filteredData = filteredData.filter(row => {
        const rowSpecialty = getSpecialtyField(row);
        const matches = currentConfig.filters.specialties.includes(rowSpecialty);
        
        if (!matches && Math.random() < 0.01) { // Log 1% of non-matching rows for debugging
          console.log('❌ Specialty filter miss:', { 
            rowSpecialty, 
            lookingFor: currentConfig.filters.specialties,
            row: { specialty: row.specialty, normalizedSpecialty: row.normalizedSpecialty }
          });
        }
        
        return matches;
      });
      
      console.log('📊 After specialty filter:', beforeSpecialtyFilter, '->', filteredData.length);
    }
    
    if (currentConfig.filters.regions.length > 0) {
      const beforeRegionFilter = filteredData.length;
      console.log('🔍 Applying region filter:', currentConfig.filters.regions);
      
      filteredData = filteredData.filter(row => {
        const region = getRegionField(row);
        const matches = currentConfig.filters.regions.includes(region);
        
        if (!matches && Math.random() < 0.01) { // Log 1% of non-matching rows for debugging
          console.log('❌ Region filter miss:', { 
            region, 
            lookingFor: currentConfig.filters.regions,
            row: { 
              geographicRegion: row.geographicRegion, 
              geographic_region: row.geographic_region, 
              Region: row.Region, 
              region: row.region 
            }
          });
        }
        
        return matches;
      });
      
      console.log('📊 After region filter:', beforeRegionFilter, '->', filteredData.length);
    }
    
    if (currentConfig.filters.surveySources.length > 0) {
      const beforeSourceFilter = filteredData.length;
      console.log('🔍 Applying survey source filter:', currentConfig.filters.surveySources);
      
      filteredData = filteredData.filter(row => {
        const surveySource = getSurveySourceField(row);
        const matches = currentConfig.filters.surveySources.includes(surveySource);
        
        if (!matches && Math.random() < 0.01) { // Log 1% of non-matching rows for debugging
          console.log('❌ Survey source filter miss:', { 
            surveySource, 
            lookingFor: currentConfig.filters.surveySources,
            row: { surveySource: row.surveySource, type: row.type, surveyProvider: row.surveyProvider }
          });
        }
        
        return matches;
      });
      
      console.log('📊 After survey source filter:', beforeSourceFilter, '->', filteredData.length);
    }
    
    if (currentConfig.filters.providerTypes.length > 0) {
      const beforeProviderTypeFilter = filteredData.length;
      console.log('🔍 Applying provider type filter:', currentConfig.filters.providerTypes);
      
      filteredData = filteredData.filter(row => {
        const providerType = getProviderTypeField(row);
        const matches = currentConfig.filters.providerTypes.includes(providerType);
        
        if (!matches && Math.random() < 0.01) { // Log 1% of non-matching rows for debugging
          console.log('❌ Provider type filter miss:', { 
            providerType, 
            lookingFor: currentConfig.filters.providerTypes,
            row: { 
              providerType: row.providerType, 
              provider_type: row.provider_type, 
              ProviderType: row.ProviderType 
            }
          });
        }
        
        return matches;
      });
      
      console.log('📊 After provider type filter:', beforeProviderTypeFilter, '->', filteredData.length);
    }
    
    if (currentConfig.filters.years.length > 0) {
      const beforeYearFilter = filteredData.length;
      console.log('🔍 Applying year filter:', currentConfig.filters.years);
      
      filteredData = filteredData.filter(row => {
        const year = getYearField(row);
        // If year is empty, include it (don't filter out data without year info)
        if (!year || year === '' || year === 'Unknown') {
          return true;
        }
        const matches = currentConfig.filters.years.includes(year);
        
        if (!matches && Math.random() < 0.01) { // Log 1% of non-matching rows for debugging
          console.log('❌ Year filter miss:', { 
            year, 
            lookingFor: currentConfig.filters.years,
            row: { surveyYear: row.surveyYear, year: row.year }
          });
        }
        
        return matches;
      });
      
      console.log('📊 After year filter:', beforeYearFilter, '->', filteredData.length);
    }

    // CRITICAL FIX: Handle multiple metrics by including ALL relevant data types
    const beforeVariableFilter = filteredData.length;
    console.log('🔍 Applying variable/metric filter. Before:', beforeVariableFilter);
    
    // Check if we have multiple metrics that require different data types
    const hasTccMetrics = currentConfig.metrics.some(m => m.includes('tcc') && !m.includes('cf'));
    const hasWrvuMetrics = currentConfig.metrics.some(m => m.includes('wrvu'));
    const hasCfMetrics = currentConfig.metrics.some(m => m.includes('cf'));
    
    console.log('📊 Metric requirements:', { hasTccMetrics, hasWrvuMetrics, hasCfMetrics });
    
    // Log sample variables to understand data structure
    if (filteredData.length > 0) {
      const sampleVariables = [...new Set(filteredData.slice(0, 10).map(row => String((row as any).variable || '').toLowerCase()))];
      console.log('📊 Sample variables in filtered data:', sampleVariables);
    }
    
    if (hasTccMetrics || hasWrvuMetrics || hasCfMetrics) {
      // Include ALL relevant data types when multiple metrics are selected
      filteredData = filteredData.filter(row => {
        const variable = String((row as any).variable || '').toLowerCase();
        const p50Value = (row as any).p50 || row.tcc_p50 || 0;
        
        // Check if this row matches any of the required data types
        const isTccData = hasTccMetrics && (
          variable === 'tcc' || 
          variable === 'total cash compensation' || 
          variable === 'compensation' ||
          variable === 'base salary' ||
          variable === 'total compensation' ||
          variable === 'total cash comp' ||
          variable === 'salary' ||
          variable === 'base pay' ||
          variable === 'total pay' ||
          variable.includes('tcc') ||
          variable.includes('total cash') ||
          variable.includes('compensation') ||
          variable.includes('salary')
        ) && !variable.includes('per') && !variable.includes('/') && !variable.includes('work rvu') && !variable.includes('benefits');
        
        const isWrvuData = hasWrvuMetrics && (variable.includes('wrvu') || variable.includes('rvu') || variable.includes('work'));
        
        const isCfData = hasCfMetrics && (variable.includes('per') || variable.includes('/') || 
                        variable.includes('conversion') || variable.includes('factor'));
        
        const matches = isTccData || isWrvuData || isCfData;
        
        if (!matches && Math.random() < 0.01) { // Log 1% of non-matching rows for debugging
          console.log('❌ Variable filter miss:', { 
            variable, 
            isTccData, 
            isWrvuData, 
            isCfData, 
            hasTccMetrics, 
            hasWrvuMetrics, 
            hasCfMetrics,
            p50Value
          });
        }
        
        return matches;
      });
      
      console.log('📊 After variable filter:', beforeVariableFilter, '->', filteredData.length);
    }

    

    // Group by dimension and aggregate metric
    let rowCount = 0;
    const grouped = filteredData.reduce((acc, row) => {
      rowCount++;
      let dimensionValue = 'Unknown';
      
      // Handle special cases for field name mapping using helper functions
      if (currentConfig.dimension === 'region') {
        dimensionValue = getRegionField(row) || 'Unknown';
      } else if (currentConfig.dimension === 'surveySource') {
        dimensionValue = getSurveySourceField(row) || 'Unknown';
      } else if (currentConfig.dimension === 'specialty') {
        // Create composite key for specialty to ensure uniqueness when filters are applied
        const specialty = getSpecialtyField(row) || 'Unknown';
        const surveySource = getSurveySourceField(row);
        const region = getRegionField(row);
        const providerType = getProviderTypeField(row);
        const year = getYearField(row);
        const variable = String((row as any).variable || '');
        
        // Create composite key that includes all relevant dimensions INCLUDING variable
        // This ensures each unique combination gets its own row and prevents mixing TCC/CF data
        dimensionValue = `${specialty}-${surveySource}-${region}-${providerType}-${year}-${variable}`;
      } else {
        dimensionValue = String(row[currentConfig.dimension as keyof ISurveyRow] || 'Unknown');
      }

      // Add secondary dimension to the key if specified
      if (currentConfig.secondaryDimension) {
        let secondaryValue = '';
        if (currentConfig.secondaryDimension === 'region') {
          secondaryValue = getRegionField(row);
        } else if (currentConfig.secondaryDimension === 'surveySource') {
          secondaryValue = getSurveySourceField(row);
        } else if (currentConfig.secondaryDimension === 'providerType') {
          secondaryValue = getProviderTypeField(row);
        } else {
          secondaryValue = String(row[currentConfig.secondaryDimension as keyof ISurveyRow] || '');
        }
        
        // Append secondary dimension to create hierarchical grouping
        dimensionValue = `${dimensionValue}-${secondaryValue}`;
      }
      
      // Handle multiple metrics - collect all selected metrics
      const selectedMetrics = currentConfig.metrics.length > 0 ? currentConfig.metrics : [currentConfig.metric];
      const primaryMetricValue = Number(row[primaryMetric as keyof ISurveyRow]) || 0;
      
      if (!acc[dimensionValue]) {
        acc[dimensionValue] = {
          name: dimensionValue,
          value: 0,
          count: 0,
          total: 0,
          // Store all selected metrics for multi-metric display
          metrics: selectedMetrics,
          metricValues: {} as Record<string, number>,
          metricTotals: {} as Record<string, number>,
          metricCounts: {} as Record<string, number>
        };
      }
      
      // Process each selected metric using direct field access (same as benchmarking screen)
      selectedMetrics.forEach(metric => {
        // Direct access to pre-populated fields - no variable matching needed
        const metricValue = Number(row[metric as keyof ISurveyRow]) || 0;
        
        // Debug logging for metric processing
        if (rowCount < 5) {
          console.log(`🔍 Processing metric: ${metric} = ${metricValue}`, 'Raw row data:', row);
          console.log(`🔍 Available fields in row:`, Object.keys(row));
          console.log(`🔍 TCC fields check:`, {
            tcc_p25: row.tcc_p25,
            tcc_p50: row.tcc_p50,
            tcc_p75: row.tcc_p75,
            tcc_p90: row.tcc_p90,
            p25: row.p25,
            p50: row.p50,
            p75: row.p75,
            p90: row.p90
          });
        }
      
        if (metricValue > 0) {
          acc[dimensionValue].metricValues[metric] = metricValue;
          
          // Debug logging for metric matching - removed for performance
        }
      });
      
      // Use primary metric for main aggregation
      if (primaryMetricValue > 0) {
        acc[dimensionValue].total += primaryMetricValue;
        acc[dimensionValue].count += 1;
      }
      
      return acc;
    }, {} as Record<string, { name: string; value: number; count: number; total: number; metrics: string[]; metricValues: Record<string, number>; metricTotals: Record<string, number>; metricCounts: Record<string, number> }>);


    // CRITICAL FIX: Combine metrics from different data types while preserving secondary grouping
    // First, group by specialty (and secondary dimension if present) to combine TCC and wRVU data
    const combinedData = Object.values(grouped).reduce((acc, item) => {
      // Extract specialty name and secondary dimension from the composite key
      let groupKey = item.name;
      let specialtyName = item.name;
      
      if (currentConfig.dimension === 'specialty' && item.name.includes('-')) {
        const parts = item.name.split('-');
        specialtyName = parts[0];
        
        // If secondary dimension is specified, include it in the group key
        if (currentConfig.secondaryDimension && parts.length > 6) {
          const secondaryValue = parts[6]; // Secondary dimension is after the variable
          groupKey = `${specialtyName}-${secondaryValue}`;
        } else {
          groupKey = specialtyName;
        }
      }
      
      if (!acc[groupKey]) {
        acc[groupKey] = {
          name: groupKey,
          metricValues: {},
          count: 0,
          originalName: item.name,
          metrics: currentConfig.metrics.length > 0 ? currentConfig.metrics : [currentConfig.metric]
        };
      }
      
      // Combine metrics from different data types
      Object.entries(item.metricValues || {}).forEach(([metric, value]) => {
        if (value > 0) {
          // Use the highest value for each metric
          if (value > (acc[groupKey].metricValues[metric] || 0)) {
            acc[groupKey].metricValues[metric] = value;
          }
        }
      });
      
      acc[groupKey].count += item.count;
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages and format
    const rawData = Object.values(combinedData)
      .map((item: any) => {
        // Use primary metric value directly (percentile data)
        const primaryValue = item.metricValues[primaryMetric] || 0;
        
        // Use percentile values directly (no averaging needed)
        const metricValues: Record<string, number> = {};
        item.metrics?.forEach((metric: string) => {
          // Use the direct percentile value from the data
          metricValues[metric] = item.metricValues[metric] || 0;
          
        // Minimal debug for metric processing
        });
        
        
        // For specialty dimension with composite keys, extract just the specialty name for display
        let displayName = item.name;
        if (currentConfig.dimension === 'specialty' && item.name.includes('-')) {
          // Extract just the specialty part from the composite key
          // Format: specialty-surveySource-region-providerType-year-variable-secondaryDimension
          const parts = item.name.split('-');
          const specialtyPart = parts[0];
          let formattedName = formatSpecialtyForDisplay(specialtyPart);
          
          // Add secondary dimension to display name if present
          if (currentConfig.secondaryDimension && parts.length > 6) {
            const secondaryValue = parts[6]; // Secondary dimension is after the variable
            formattedName = `${formattedName} (${secondaryValue})`;
          }
          
          displayName = formattedName;
        } else if (currentConfig.dimension === 'specialty') {
          displayName = formatSpecialtyForDisplay(item.name);
        } else if (currentConfig.dimension === 'surveySource') {
          // For survey source, use the source name directly
          displayName = item.name;
        } else if (currentConfig.secondaryDimension && item.name.includes('-')) {
          // Handle secondary dimension for other primary dimensions
          const parts = item.name.split('-');
          const primaryValue = parts[0];
          const secondaryValue = parts[1];
          displayName = `${primaryValue} (${secondaryValue})`;
        }
        
        return {
          name: displayName,
          value: primaryValue,
          count: item.count,
          originalName: item.name,
          metrics: item.metrics,
          metricValues: metricValues
        };
      })
      .filter(item => item.value > 1000); // Only show items with reasonable compensation values

    // CRITICAL FIX: Proper aggregation that combines metrics from different data types
    // Group by specialty name only (not composite key) to aggregate all metrics for each specialty
    const aggregatedData = rawData.reduce((acc, item) => {
      // Extract just the specialty name from the composite key for grouping
      let groupKey = item.name;
      
      // For specialty dimension, extract just the specialty part for grouping
      if (currentConfig.dimension === 'specialty' && item.originalName.includes('-')) {
        const parts = item.originalName.split('-');
        groupKey = parts[0]; // Use just the specialty name for grouping
      }
      
      if (!acc[groupKey]) {
        acc[groupKey] = {
          name: groupKey,
          value: 0,
          count: 0,
          originalName: item.originalName,
          metrics: item.metrics,
          metricValues: {}
        };
      }
      
      // CRITICAL: Process each metric separately to prevent mixing TCC/wRVU data
      Object.entries(item.metricValues || {}).forEach(([metric, value]) => {
        if (value > 0) {
          // For each metric, use the highest value (percentile data)
          if (value > (acc[groupKey].metricValues[metric] || 0)) {
            acc[groupKey].metricValues[metric] = value;
          }
        }
      });
      
      // Set the primary value based on the first selected metric
      const primaryMetric = currentConfig.metrics.length > 0 ? currentConfig.metrics[0] : currentConfig.metric;
      const primaryValue = acc[groupKey].metricValues[primaryMetric] || 0;
      if (primaryValue > acc[groupKey].value) {
        acc[groupKey].value = primaryValue;
        acc[groupKey].count = item.count;
      }
      
      return acc;
    }, {} as Record<string, any>);

    const allData = Object.values(aggregatedData)
      .sort((a, b) => b.value - a.value);
    
    console.log('📊 Final chart data count:', allData.length);
    console.log('📊 Sample chart data:', allData.slice(0, 3));
    
    // For specialty dimension, require at least one specialty to be selected
    if (currentConfig.dimension === 'specialty') {
      if (currentConfig.filters.specialties.length === 0) {
        console.log('❌ No specialty filter applied - returning empty data');
        return []; // Return empty data when no specialty filter is applied
      } else {
        console.log('✅ Returning filtered specialty data:', allData.length, 'items');
        return allData; // Show filtered specialties
      }
    } else {
      console.log('✅ Returning other dimension data:', allData.slice(0, 20).length, 'items (limited to 20)');
      return allData.slice(0, 20); // Limit other dimensions to top 20
    }
  }, [surveyData, currentConfig]);

  // Table sort: default to value desc for table-first clarity
  const [tableSortDesc, setTableSortDesc] = useState(true);
  const tableData = useMemo(() => {
    const rows = [...chartData];
    rows.sort((a, b) => (tableSortDesc ? b.value - a.value : a.value - b.value));
    return rows;
  }, [chartData, tableSortDesc]);

  // Handle configuration changes
  const handleConfigChange = (key: keyof typeof currentConfig, value: any) => {
    setCurrentConfig(prev => ({ ...prev, [key]: value }));
  };

  // Table row click functionality removed for cleaner interface
  // const handleTableRowClick = async (item: ChartDataItem) => { ... }

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
      metrics: report.metrics || [report.metric], // Use saved metrics or fallback to single metric
      chartType: report.chartType,
      filters: {
        ...report.filters,
        years: report.filters.years || [currentYear] // Default to current year if not saved
      }
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
    // Build metadata block for enterprise-grade exports
    const metricLabel = (() => {
      const map: Record<string, string> = {
        'tcc_p25': 'TCC 25th Percentile',
        'tcc_p50': 'TCC 50th Percentile',
        'tcc_p75': 'TCC 75th Percentile',
        'tcc_p90': 'TCC 90th Percentile',
        'wrvu_p25': 'wRVU 25th Percentile',
        'wrvu_p50': 'wRVU 50th Percentile',
        'wrvu_p75': 'wRVU 75th Percentile',
        'wrvu_p90': 'wRVU 90th Percentile',
        'cf_p25': 'CF 25th Percentile',
        'cf_p50': 'CF 50th Percentile',
        'cf_p75': 'CF 75th Percentile',
        'cf_p90': 'CF 90th Percentile'
      };
      return map[currentConfig.metric] || currentConfig.metric;
    })();

    const yearsText = currentConfig.filters.years.length > 0 ? currentConfig.filters.years.join(', ') : 'All';
    const regionsText = currentConfig.filters.regions.length > 0 ? `${currentConfig.filters.regions.length} selected` : 'All';
    const sourcesText = currentConfig.filters.surveySources.length > 0 ? `${currentConfig.filters.surveySources.length} selected` : 'All';
    const specialtiesText = currentConfig.filters.specialties.length > 0 ? `${currentConfig.filters.specialties.length} selected` : 'All';

    const metaLines = [
      `Report: ${currentConfig.dimension} × ${metricLabel}`,
      `Years: ${yearsText}`,
      `Regions: ${regionsText}`,
      `Survey Sources: ${sourcesText}`,
      `Specialties: ${specialtiesText}`,
      `Items: ${chartData.length}`,
      `Generated: ${new Date().toISOString()}`
    ].join('\n');

    const tableHeaders = `${currentConfig.dimension},${currentConfig.metric},Count\n`;
    const tableRows = chartData.map(row => `${row.name},${row.value},${row.count}`).join('\n');

    const blob = new Blob([metaLines + '\n\n' + tableHeaders + tableRows], { type: 'text/csv' });
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
    // Note: Empty state is handled at the parent level

    // For single metric charts (line/pie), determine the type
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
          <div className="w-full min-w-full">
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
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }


    // Default bar chart with ECharts - enterprise-grade visualization
    // Separate CF metrics (different scale) into their own chart
    const hasCFMetrics = currentConfig.metrics.some(m => m.includes('cf'));
    const hasOtherMetrics = currentConfig.metrics.some(m => m.includes('tcc') || m.includes('wrvu'));
    
    return (
      <div className="w-full space-y-6">
        {/* Main Chart: TCC + wRVU */}
        {hasOtherMetrics && (
          <div className="w-full">
            <div className="mb-4 text-center">
              <Typography variant="h6" className="text-gray-900 font-semibold">
                Compensation Analysis
              </Typography>
              <Typography variant="body2" className="text-gray-600">
                Total Cash Compensation (TCC) and Work RVU metrics
              </Typography>
            </div>
            <EChartsBar 
              key={`chart-${currentConfig.metrics.join('-')}`} // Force re-render when metrics change
              data={chartData}
              metrics={currentConfig.metrics} // Show all selected metrics
              chartHeight={600}
            />
          </div>
        )}
        
        {/* Secondary Chart: Conversion Factor (separate scale) */}
        {hasCFMetrics && (
          <div className="w-full">
            <div className="mb-4 text-center">
              <Typography variant="h6" className="text-gray-900 font-semibold">
                Conversion Factor Analysis
              </Typography>
              <Typography variant="body2" className="text-gray-600">
                Conversion Factor (CF) metrics shown separately due to different scale ($40-$200 vs $100K-$400K)
              </Typography>
            </div>
            <EChartsCF 
              key={`cf-chart-${currentConfig.metrics.join('-')}`} // Force re-render when metrics change
              data={chartData}
              metrics={currentConfig.metrics} // Show all selected metrics
              chartHeight={600}
            />
        </div>
        )}
      </div>
    );
  };

  // Start progress animation when loading begins
  React.useEffect(() => {
    if (loading) {
      startProgress();
    } else {
      completeProgress();
    }
  }, [loading, startProgress, completeProgress]);

  if (loading) {
    return (
      <UnifiedLoadingSpinner
        message="Loading analytics data..."
        recordCount={0}
        progress={progress}
        showProgress={true}
        overlay={true}
      />
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Action Buttons - Top of page */}
      <div className="flex justify-between items-center">
      <div className="flex gap-2">
        <button
          onClick={saveCurrentReport}
          disabled={!currentConfig.name.trim()}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <BookmarkIcon className="h-4 w-4 mr-2" />
          Save Report
        </button>
        <button
          onClick={exportData}
          disabled={chartData.length === 0}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
          Export
        </button>
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

            {/* Primary Dimension Selector */}
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
                <MenuItem value="surveySource">Survey Source</MenuItem>
              </Select>
            </FormControl>

            {/* Secondary Dimension Selector */}
            <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
              <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
                Secondary Grouping (Optional)
              </Typography>
              <Select
                value={currentConfig.secondaryDimension || ''}
                onChange={(e: SelectChangeEvent<string>) => handleConfigChange('secondaryDimension', e.target.value || null)}
                sx={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  }
                }}
              >
                <MenuItem value="">None</MenuItem>
                {availableOptions.dimensions
                  .filter(dim => dim !== currentConfig.dimension)
                  .map(dim => (
                    <MenuItem key={dim} value={dim}>
                      {dim === 'specialty' ? 'Specialty' : 
                       dim === 'region' ? 'Region' : 
                       dim === 'providerType' ? 'Provider Type' : 
                       dim === 'surveySource' ? 'Survey Source' : dim}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {/* Metrics Selector - Multi-select */}
            <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
              <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
                Measures (Y-Axis)
              </Typography>
              <Autocomplete
                multiple
                value={currentConfig.metrics}
                onChange={(event: any, newValue: string[]) => {
                  handleConfigChange('metrics', newValue);
                  // Also update the single metric for backward compatibility
                  if (newValue.length > 0) {
                    handleConfigChange('metric', newValue[0]);
                  }
                }}
                options={availableOptions.metrics}
                getOptionLabel={(option: string) => {
                  const labels: { [key: string]: string } = {
                    'tcc_p25': 'TCC 25th Percentile',
                    'tcc_p50': 'TCC 50th Percentile',
                    'tcc_p75': 'TCC 75th Percentile',
                    'tcc_p90': 'TCC 90th Percentile',
                    'wrvu_p25': 'wRVU 25th Percentile',
                    'wrvu_p50': 'wRVU 50th Percentile',
                    'wrvu_p75': 'wRVU 75th Percentile',
                    'wrvu_p90': 'wRVU 90th Percentile',
                    'cf_p25': 'CF 25th Percentile',
                    'cf_p50': 'CF 50th Percentile',
                    'cf_p75': 'CF 75th Percentile',
                    'cf_p90': 'CF 90th Percentile'
                  };
                  return labels[option] || option;
                }}
                renderInput={(params: any) => (
                  <TextField
                    {...params}
                    placeholder="Select measures..."
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        minHeight: '40px',
                        '& fieldset': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover fieldset': {
                          borderColor: '#9ca3af',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3b82f6',
                          borderWidth: '1px',
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
                        label={(() => {
                          const labels: { [key: string]: string } = {
                            'tcc_p25': 'TCC P25',
                            'tcc_p50': 'TCC P50',
                            'tcc_p75': 'TCC P75',
                            'tcc_p90': 'TCC P90',
                            'wrvu_p25': 'wRVU P25',
                            'wrvu_p50': 'wRVU P50',
                            'wrvu_p75': 'wRVU P75',
                            'wrvu_p90': 'wRVU P90',
                            'cf_p25': 'CF P25',
                            'cf_p50': 'CF P50',
                            'cf_p75': 'CF P75',
                            'cf_p90': 'CF P90'
                          };
                          return labels[option] || option;
                        })()}
                        size="small"
                        sx={{ 
                          backgroundColor: '#8B5CF6', 
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
                    maxHeight: '400px'
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
                noOptionsText="No measures found"
                clearOnBlur={false}
                disableCloseOnSelect={true}
              />
            </FormControl>

            {/* Year Filter */}
            <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
              <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
                Years
              </Typography>
              <Autocomplete
                multiple
                value={currentConfig.filters.years}
                onChange={(event: any, newValue: string[]) => handleFilterChange('years', newValue)}
                options={availableOptions.years || []}
                getOptionLabel={(option: string) => option}
                renderInput={(params: any) => (
                  <TextField
                    {...params}
                    placeholder="Select years..."
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        minHeight: '40px',
                        '& fieldset': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover fieldset': {
                          borderColor: '#9ca3af',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3b82f6',
                          borderWidth: '1px',
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
                        label={option}
                        size="small"
                        sx={{
                          backgroundColor: '#10B981',
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
                    maxHeight: '400px'
                  },
                  '& .MuiAutocomplete-option': {
                    padding: '8px 12px',
                    fontSize: '0.875rem',
                    '&:hover': { backgroundColor: '#f3f4f6' },
                    '&.Mui-selected': {
                      backgroundColor: '#d1fae5',
                      color: '#065f46'
                    }
                  }
                }}
                noOptionsText="No years found"
                clearOnBlur={false}
                disableCloseOnSelect={true}
              />
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
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Specialty Filter */}
            <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
              <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
                Specialties ({(availableOptions.specialties || []).length} available)
              </Typography>
              <Autocomplete
                multiple
                value={currentConfig.filters.specialties}
                onChange={(event: any, newValue: string[]) => {
                  handleFilterChange('specialties', newValue);
                }}
                options={availableOptions.specialties || []}
                getOptionKey={(option: string) => option}
                onOpen={() => {
                }}
                getOptionLabel={(option: string) => formatSpecialtyForDisplay(option)}
                disableListWrap={false}
                disablePortal={false}
                ListboxProps={{
                  style: {
                    maxHeight: '300px',
                    overflow: 'auto'
                  }
                }}
                noOptionsText="No specialties found"
                filterOptions={(options: string[], { inputValue }: { inputValue: string }) => {
                  const searchTerms = inputValue.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
                  const filtered = options.filter((option: string) => {
                    const displayName = formatSpecialtyForDisplay(option).toLowerCase();
                    
                    // If no search terms, show all options
                    if (searchTerms.length === 0) return true;
                    
                    // Check if all search terms are found in the display name (order doesn't matter)
                    // This allows "pediatric general" to match "General: Pediatrics"
                    return searchTerms.every(term => displayName.includes(term));
                  });
                  return filtered;
                }}
                freeSolo={false}
                selectOnFocus
                clearOnBlur
                handleHomeEndKeys
                renderInput={(params: any) => (
                  <TextField
                    {...params}
                    placeholder="Search and select specialties..."
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        minHeight: '40px',
                        '& fieldset': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover fieldset': {
                          borderColor: '#9ca3af',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3b82f6',
                          borderWidth: '1px',
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
                componentsProps={{
                  popper: {
                    style: {
                      maxHeight: '500px',
                      overflow: 'auto'
                    }
                  }
                }}
                slotProps={{
                  popper: {
                    modifiers: [
                      {
                        name: 'flip',
                        enabled: false,
                      },
                    ],
                    style: {
                      maxHeight: '500px',
                      zIndex: 1300,
                    },
                  },
                }}
                sx={{
                  '& .MuiAutocomplete-paper': {
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.08)',
                    maxHeight: '500px !important',
                    overflow: 'auto !important'
                  },
                  '& .MuiAutocomplete-listbox': {
                    maxHeight: '500px !important',
                    overflow: 'auto !important',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#cbd5e1 #f1f5f9',
                    scrollBehavior: 'smooth',
                    '&::-webkit-scrollbar': {
                      width: '12px !important',
                      display: 'block !important'
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f1f5f9 !important',
                      borderRadius: '4px !important',
                      display: 'block !important'
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#cbd5e1 !important',
                      borderRadius: '4px !important',
                      display: 'block !important',
                      '&:hover': {
                        background: '#94a3b8 !important'
                      }
                    }
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
                renderOption={(props: any, option: string) => (
                  <Box component="li" {...props} key={option}>
                    {formatSpecialtyForDisplay(option)}
                  </Box>
                )}
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
                options={availableOptions.regions || []}
                getOptionLabel={(option: string) => option}
                ListboxProps={{
                  style: {
                    maxHeight: '300px',
                    overflow: 'auto'
                  }
                }}
                noOptionsText="No regions found"
                filterOptions={(options: string[], { inputValue }: { inputValue: string }) => {
                  const filtered = options.filter((option: string) =>
                    option.toLowerCase().includes(inputValue.toLowerCase())
                  );
                  return filtered;
                }}
                freeSolo={false}
                selectOnFocus
                clearOnBlur
                handleHomeEndKeys
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
                        minHeight: '40px',
                        '& fieldset': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover fieldset': {
                          borderColor: '#9ca3af',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3b82f6',
                          borderWidth: '1px',
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
                    maxHeight: '400px',
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
                options={availableOptions.surveySources || []}
                getOptionLabel={(option: string) => option}
                ListboxProps={{
                  style: {
                    maxHeight: '300px',
                    overflow: 'auto'
                  }
                }}
                noOptionsText="No survey sources found"
                filterOptions={(options: string[], { inputValue }: { inputValue: string }) => {
                  const filtered = options.filter((option: string) =>
                    option.toLowerCase().includes(inputValue.toLowerCase())
                  );
                  return filtered;
                }}
                freeSolo={false}
                selectOnFocus
                clearOnBlur
                handleHomeEndKeys
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
                        minHeight: '40px',
                        '& fieldset': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover fieldset': {
                          borderColor: '#9ca3af',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3b82f6',
                          borderWidth: '1px',
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
                    maxHeight: '400px',
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
              />
            </FormControl>

            {/* Provider Type Filter */}
            <FormControl size="small" sx={{ width: '100%', maxWidth: '100%' }}>
              <Typography variant="body2" className="mb-2 text-gray-700 font-medium">
                Provider Types
              </Typography>
              <Autocomplete
                multiple
                value={currentConfig.filters.providerTypes}
                onChange={(event: any, newValue: string[]) => handleFilterChange('providerTypes', newValue)}
                options={availableOptions.providerTypes || []}
                getOptionLabel={(option: string) => option}
                renderInput={(params: any) => (
                  <TextField
                    {...params}
                    placeholder="Select provider types..."
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        minHeight: '40px',
                        '& fieldset': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover fieldset': {
                          borderColor: '#9ca3af',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3b82f6',
                          borderWidth: '1px',
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
                          backgroundColor: '#F59E0B', 
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
                    maxHeight: '400px',
                    marginTop: '4px'
                  },
                  '& .MuiAutocomplete-option': {
                    padding: '8px 12px',
                    fontSize: '0.875rem',
                    '&:hover': { backgroundColor: '#f3f4f6' },
                    '&.Mui-selected': { 
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                      fontWeight: 500
                    }
                  }
                }}
                noOptionsText="No provider types found"
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
                {(() => {
                  const metricLabelMap: Record<string, string> = {
                    'tcc_p25': 'TCC 25th', 'tcc_p50': 'TCC 50th', 'tcc_p75': 'TCC 75th', 'tcc_p90': 'TCC 90th',
                    'wrvu_p25': 'wRVU 25th', 'wrvu_p50': 'wRVU 50th', 'wrvu_p75': 'wRVU 75th', 'wrvu_p90': 'wRVU 90th',
                    'cf_p25': 'CF 25th', 'cf_p50': 'CF 50th', 'cf_p75': 'CF 75th', 'cf_p90': 'CF 90th'
                  };
                  const yearsText = currentConfig.filters.years.length > 0 ? `(${currentConfig.filters.years.join(', ')})` : '';
                  const regionsText = currentConfig.filters.regions.length > 0 ? `${currentConfig.filters.regions.length} regions` : 'All regions';
                  const sourcesText = currentConfig.filters.surveySources.length > 0 ? `${currentConfig.filters.surveySources.length} sources` : 'All sources';
                  const specialtiesText = currentConfig.dimension === 'specialty' ? (
                    currentConfig.filters.specialties.length > 0 ? `${currentConfig.filters.specialties.length} specialties` : 'All specialties'
                  ) : '';
                  return `${currentConfig.dimension.replace('_',' ')} × ${metricLabelMap[currentConfig.metric] || currentConfig.metric} ${yearsText} • ${chartData.length} items • ${regionsText} • ${sourcesText}${specialtiesText ? ' • ' + specialtiesText : ''}`;
                })()}
              </Typography>
            </div>
          </div>

          {/* Chart and Data Table - Show single empty state when no data */}
          {chartData.length > 0 ? (
            <>
              {renderChart()}
              
              {/* Data Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
                <Typography variant="h6" className="text-gray-900 font-semibold mb-4">
                  Data Table
                </Typography>
                <div className="rounded-lg border border-gray-200 overflow-x-auto">
                <TableContainer component={Paper} sx={{ maxHeight: '600px', overflow: 'auto' }}>
                  <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ 
                        fontWeight: 'bold', 
                        backgroundColor: '#F5F5F5',
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                        minWidth: '200px'
                      }}>
                        {currentConfig.dimension === 'specialty' ? 'Specialty' : 
                         currentConfig.dimension === 'region' ? 'Region' : 
                         currentConfig.dimension === 'providerType' ? 'Provider Type' : 
                         currentConfig.dimension === 'surveySource' ? 'Survey Source' :
                         currentConfig.dimension}
                      </TableCell>
                      {currentConfig.metrics.length > 1 ? (
                        currentConfig.metrics.map((metric, index) => (
                      <TableCell 
                        key={metric} 
                        sx={{ 
                          fontWeight: 'bold', 
                          backgroundColor: metric.includes('tcc') ? '#E3F2FD' : 
                                        metric.includes('wrvu') ? '#E8F5E8' : 
                                        metric.includes('cf') ? '#FFF3E0' : '#F5F5F5',
                          borderRight: '1px solid #E0E0E0',
                          cursor: index === 0 ? 'pointer' : 'default'
                        }} 
                        align="right"
                        onClick={index === 0 ? () => setTableSortDesc(prev => !prev) : undefined}
                        title={index === 0 ? 'Toggle sort' : undefined}
                      >
                        {(metric === 'tcc_p25' ? 'TCC 25th' :
                             metric === 'tcc_p50' ? 'TCC 50th' :
                             metric === 'tcc_p75' ? 'TCC 75th' :
                             metric === 'tcc_p90' ? 'TCC 90th' :
                             metric === 'wrvu_p25' ? 'wRVU 25th' :
                             metric === 'wrvu_p50' ? 'wRVU 50th' :
                             metric === 'wrvu_p75' ? 'wRVU 75th' :
                             metric === 'wrvu_p90' ? 'wRVU 90th' :
                             metric === 'cf_p25' ? 'CF 25th' :
                             metric === 'cf_p50' ? 'CF 50th' :
                             metric === 'cf_p75' ? 'CF 75th' :
                             metric === 'cf_p90' ? 'CF 90th' :
                         metric.replace('_', ' ').toUpperCase()) + (index === 0 ? (tableSortDesc ? ' ▼' : ' ▲') : '')}
                      </TableCell>
                        ))
                      ) : (
                    <TableCell sx={{ 
                      fontWeight: 'bold', 
                      backgroundColor: currentConfig.metric.includes('tcc') ? '#E3F2FD' : 
                                    currentConfig.metric.includes('wrvu') ? '#E8F5E8' : 
                                    currentConfig.metric.includes('cf') ? '#FFF3E0' : '#F5F5E5',
                      borderRight: '1px solid #E0E0E0',
                      cursor: 'pointer'
                    }} align="right" onClick={() => setTableSortDesc(prev => !prev)} title="Toggle sort">
                      {(currentConfig.metric === 'tcc_p25' ? 'TCC 25th Percentile' :
                           currentConfig.metric === 'tcc_p50' ? 'TCC 50th Percentile' :
                           currentConfig.metric === 'tcc_p75' ? 'TCC 75th Percentile' :
                           currentConfig.metric === 'tcc_p90' ? 'TCC 90th Percentile' :
                           currentConfig.metric === 'wrvu_p25' ? 'wRVU 25th Percentile' :
                           currentConfig.metric === 'wrvu_p50' ? 'wRVU 50th Percentile' :
                           currentConfig.metric === 'wrvu_p75' ? 'wRVU 75th Percentile' :
                           currentConfig.metric === 'wrvu_p90' ? 'wRVU 90th Percentile' :
                           currentConfig.metric === 'cf_p25' ? 'CF 25th Percentile' :
                           currentConfig.metric === 'cf_p50' ? 'CF 50th Percentile' :
                           currentConfig.metric === 'cf_p75' ? 'CF 75th Percentile' :
                           currentConfig.metric === 'cf_p90' ? 'CF 90th Percentile' :
                       currentConfig.metric.replace('_', ' ').toUpperCase()) + (tableSortDesc ? ' ▼' : ' ▲')}
                    </TableCell>
                      )}
                      <TableCell sx={{ 
                        fontWeight: 'bold', 
                        backgroundColor: '#F5F5F5'
                      }} align="right">
                        Count
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableData.map((item, index) => (
                      <TableRow 
                        key={index} 
                      >
                        <TableCell sx={{ 
                          position: 'sticky',
                          left: 0,
                          backgroundColor: 'white',
                          borderRight: '1px solid #e0e0e0',
                          zIndex: 1,
                          fontWeight: 'medium'
                        }}>
                          <span className="text-gray-900">{item.name}</span>
                        </TableCell>
                        {currentConfig.metrics.length > 1 ? (
                          currentConfig.metrics.map((metric, index) => (
                            <TableCell 
                              key={metric} 
                              sx={{ 
                                backgroundColor: metric.includes('tcc') ? '#E3F2FD' : 
                                              metric.includes('wrvu') ? '#E8F5E8' : 
                                              metric.includes('cf') ? '#FFF3E0' : 'white',
                                borderRight: '1px solid #E0E0E0'
                              }} 
                              align="right"
                            >
                              {metric.includes('wrvu') ? 
                                (item.metricValues?.[metric] || 0).toLocaleString() : 
                                `$${(item.metricValues?.[metric] || 0).toLocaleString()}`
                              }
                            </TableCell>
                          ))
                        ) : (
                          <TableCell sx={{ 
                            backgroundColor: currentConfig.metric.includes('tcc') ? '#E3F2FD' : 
                                          currentConfig.metric.includes('wrvu') ? '#E8F5E8' : 
                                          currentConfig.metric.includes('cf') ? '#FFF3E0' : 'white',
                            borderRight: '1px solid #E0E0E0'
                          }} align="right">
                            {currentConfig.metric.includes('wrvu') ? 
                              item.value.toLocaleString() : 
                              `$${item.value.toLocaleString()}`
                            }
                          </TableCell>
                        )}
                        <TableCell align="right" sx={{ backgroundColor: 'white' }}>
                          {item.count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-8">
              <EmptyState
                icon={<BoltIcon className="h-6 w-6 text-gray-500" />}
                title="No Data Available"
                message={currentConfig.dimension === 'specialty' && currentConfig.filters.specialties.length === 0 
                  ? "Select at least one specialty to view data. Try adjusting your filters or configuration."
                  : "Try adjusting your filters or configuration to see report data."
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Viewer Modal - Completely removed for cleaner interface */}
    </div>
  );
};

export default CustomReports;

