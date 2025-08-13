import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, ScatterChart, Scatter, AreaChart, Area, ComposedChart, Line
} from 'recharts';
import BackendService from '../services/BackendService';
import LoadingSpinner from './ui/loading-spinner';

interface ChartData {
  specialty: string;
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
  wrvu_p25: number;
  wrvu_p50: number;
  wrvu_p75: number;
  wrvu_p90: number;
  region: string;
  providerType: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const Charts: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedProviderType, setSelectedProviderType] = useState<string>('');
  const [chartType, setChartType] = useState<'comparison' | 'productivity' | 'percentiles' | 'regional'>('comparison');
  const [metricType, setMetricType] = useState<'tcc' | 'cf' | 'wrvu'>('tcc');
  const [percentileType, setPercentileType] = useState<'p25' | 'p50' | 'p75' | 'p90' | 'all'>('p50');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const backendService = BackendService.getInstance();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading chart data...');
      
      const surveys = await backendService.getAllSurveys();
      console.log('Surveys loaded:', surveys.length);
      
      let allData: ChartData[] = [];

      for (const survey of surveys) {
        try {
          const data = await backendService.getSurveyData(survey.id, undefined, { limit: 10000 });
          console.log(`Survey ${survey.id} data:`, data?.rows?.length || 0, 'rows');
          
          if (data && data.rows && data.rows.length > 0) {
            const transformedData = data.rows.map((row: any) => ({
              specialty: row.specialty || row.normalizedSpecialty || row.survey_specialty || 'Unknown',
              tcc_p25: Number(row.tcc_p25) || Number(row.tcc_p25th) || 0,
              tcc_p50: Number(row.tcc_p50) || Number(row.tcc_p50th) || Number(row.tcc_median) || 0,
              tcc_p75: Number(row.tcc_p75) || Number(row.tcc_p75th) || 0,
              tcc_p90: Number(row.tcc_p90) || Number(row.tcc_p90th) || 0,
              cf_p25: Number(row.cf_p25) || Number(row.cf_p25th) || Number(row.conversion_factor_p25) || 0,
              cf_p50: Number(row.cf_p50) || Number(row.cf_p50th) || Number(row.conversion_factor_p50) || Number(row.conversion_factor) || 0,
              cf_p75: Number(row.cf_p75) || Number(row.cf_p75th) || Number(row.conversion_factor_p75) || 0,
              cf_p90: Number(row.cf_p90) || Number(row.cf_p90th) || Number(row.conversion_factor_p90) || 0,
              wrvu_p25: Number(row.wrvu_p25) || Number(row.wrvu_p25th) || Number(row.work_rvu_p25) || 0,
              wrvu_p50: Number(row.wrvu_p50) || Number(row.wrvu_p50th) || Number(row.work_rvu_p50) || Number(row.work_rvu) || 0,
              wrvu_p75: Number(row.wrvu_p75) || Number(row.wrvu_p75th) || Number(row.work_rvu_p75) || 0,
              wrvu_p90: Number(row.wrvu_p90) || Number(row.wrvu_p90th) || Number(row.work_rvu_p90) || 0,
              region: row.geographic_region || row.region || row.geographicRegion || 'Unknown',
              providerType: row.provider_type || row.providerType || 'Unknown',
            }));
            allData = allData.concat(transformedData);
          }
        } catch (error) {
          console.error(`Error loading survey ${survey.id}:`, error);
        }
      }

      console.log('Total data loaded:', allData.length, 'rows');
      console.log('Sample data:', allData.slice(0, 3));
      
      setChartData(allData);
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const specialties = useMemo(() => {
    const unique = Array.from(new Set(chartData.map(d => d.specialty))).sort();
    return unique;
  }, [chartData]);

  const filteredSpecialties = useMemo(() => {
    if (!searchTerm) return specialties;
    return specialties.filter(specialty => 
      specialty.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [specialties, searchTerm]);

  const regions = useMemo(() => {
    const unique = Array.from(new Set(chartData.map(d => d.region))).sort();
    return unique;
  }, [chartData]);

  const providerTypes = useMemo(() => {
    const unique = Array.from(new Set(chartData.map(d => d.providerType))).sort();
    return unique;
  }, [chartData]);

  const filteredData = useMemo(() => {
    console.log('Filtering data with:', {
      totalData: chartData.length,
      selectedSpecialties,
      selectedRegion,
      selectedProviderType
    });
    
    const filtered = chartData.filter(d => {
      // Only filter by specialty if specialties are selected
      if (selectedSpecialties.length > 0 && !selectedSpecialties.includes(d.specialty)) {
        return false;
      }
      
      // Only filter by region if region is selected
      if (selectedRegion && d.region !== selectedRegion) {
        return false;
      }
      
      // Only filter by provider type if provider type is selected
      if (selectedProviderType && d.providerType !== selectedProviderType) {
        return false;
      }
      
      return true;
    });
    
    console.log('Filtered data result:', filtered.length, 'rows');
    return filtered;
  }, [chartData, selectedSpecialties, selectedRegion, selectedProviderType]);

  // Multi-specialty comparison data
  const comparisonData = useMemo(() => {
    console.log('Generating comparison data:', {
      selectedSpecialties: selectedSpecialties.length,
      filteredData: filteredData.length
    });
    
    if (selectedSpecialties.length === 0) {
      console.log('No specialties selected for comparison');
      return [];
    }
    
    if (filteredData.length === 0) {
      console.log('No filtered data available for comparison');
      return [];
    }
    
    const grouped = filteredData.reduce((acc, d) => {
      if (!acc[d.specialty]) {
        acc[d.specialty] = {
          specialty: d.specialty,
          tcc_p25: 0, tcc_p50: 0, tcc_p75: 0, tcc_p90: 0,
          cf_p25: 0, cf_p50: 0, cf_p75: 0, cf_p90: 0,
          wrvu_p25: 0, wrvu_p50: 0, wrvu_p75: 0, wrvu_p90: 0,
          count: 0
        };
      }
      acc[d.specialty].tcc_p25 += d.tcc_p25;
      acc[d.specialty].tcc_p50 += d.tcc_p50;
      acc[d.specialty].tcc_p75 += d.tcc_p75;
      acc[d.specialty].tcc_p90 += d.tcc_p90;
      acc[d.specialty].cf_p25 += d.cf_p25;
      acc[d.specialty].cf_p50 += d.cf_p50;
      acc[d.specialty].cf_p75 += d.cf_p75;
      acc[d.specialty].cf_p90 += d.cf_p90;
      acc[d.specialty].wrvu_p25 += d.wrvu_p25;
      acc[d.specialty].wrvu_p50 += d.wrvu_p50;
      acc[d.specialty].wrvu_p75 += d.wrvu_p75;
      acc[d.specialty].wrvu_p90 += d.wrvu_p90;
      acc[d.specialty].count += 1;
      return acc;
    }, {} as Record<string, any>);

    const result = Object.values(grouped).map(item => ({
      ...item,
      tcc_p25: Math.round(item.tcc_p25 / item.count),
      tcc_p50: Math.round(item.tcc_p50 / item.count),
      tcc_p75: Math.round(item.tcc_p75 / item.count),
      tcc_p90: Math.round(item.tcc_p90 / item.count),
      cf_p25: Math.round((item.cf_p25 / item.count) * 100) / 100,
      cf_p50: Math.round((item.cf_p50 / item.count) * 100) / 100,
      cf_p75: Math.round((item.cf_p75 / item.count) * 100) / 100,
      cf_p90: Math.round((item.cf_p90 / item.count) * 100) / 100,
      wrvu_p25: Math.round(item.wrvu_p25 / item.count),
      wrvu_p50: Math.round(item.wrvu_p50 / item.count),
      wrvu_p75: Math.round(item.wrvu_p75 / item.count),
      wrvu_p90: Math.round(item.wrvu_p90 / item.count),
    }));
    
    console.log('Comparison data generated:', result.length, 'specialties');
    return result;
  }, [filteredData, selectedSpecialties]);

  // If only one specialty is selected, show percentile breakdown instead of comparison
  const shouldShowPercentileBreakdown = selectedSpecialties.length === 1;
  
  // Percentile breakdown data for single specialty
  const percentileBreakdownData = useMemo(() => {
    if (!shouldShowPercentileBreakdown || comparisonData.length === 0) return [];
    
    const specialty = comparisonData[0];
    return [
      { percentile: '25th', value: specialty[`${metricType}_p25`] || 0 },
      { percentile: '50th', value: specialty[`${metricType}_p50`] || 0 },
      { percentile: '75th', value: specialty[`${metricType}_p75`] || 0 },
      { percentile: '90th', value: specialty[`${metricType}_p90`] || 0 },
    ];
  }, [shouldShowPercentileBreakdown, comparisonData, metricType]);

  // All percentiles data for multiple specialties
  const allPercentilesData = useMemo(() => {
    if (percentileType !== 'all' || comparisonData.length === 0) return [];
    
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
    
    const result: any[] = [];
    comparisonData.forEach((specialty, index) => {
      const color = colors[index % colors.length];
      result.push(
        { specialty: specialty.specialty, percentile: '25th', value: specialty[`${metricType}_p25`] || 0, color },
        { specialty: specialty.specialty, percentile: '50th', value: specialty[`${metricType}_p50`] || 0, color },
        { specialty: specialty.specialty, percentile: '75th', value: specialty[`${metricType}_p75`] || 0, color },
        { specialty: specialty.specialty, percentile: '90th', value: specialty[`${metricType}_p90`] || 0, color }
      );
    });
    return result;
  }, [comparisonData, metricType, percentileType]);

  // Check if we should show all percentiles chart
  const shouldShowAllPercentiles = percentileType === 'all' && selectedSpecialties.length > 1;

  // Productivity comparison data
  const productivityData = useMemo(() => {
    console.log('Generating productivity data:', {
      comparisonDataLength: comparisonData.length,
      metricType,
      percentileType
    });
    
    if (selectedSpecialties.length === 0) {
      console.log('No specialties selected for productivity chart');
      return [];
    }
    
    if (comparisonData.length === 0) {
      console.log('No comparison data available for productivity chart');
      return [];
    }
    
    // Handle "All Percentiles" case for productivity chart
    if (percentileType === 'all') {
      console.log('Generating productivity data for all percentiles');
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
      const result: any[] = [];
      
      comparisonData.forEach((specialty, specialtyIndex) => {
        const specialtyColor = colors[specialtyIndex % colors.length];
        // Calculate productivity for each percentile
        const percentiles = ['p25', 'p50', 'p75', 'p90'];
        percentiles.forEach(percentile => {
          const tccValue = specialty[`tcc_${percentile}`] || 0;
          const wrvuValue = specialty[`wrvu_${percentile}`] || 0;
          
          if (tccValue > 0 && wrvuValue > 0) {
            const compensationPerWRVU = tccValue / wrvuValue;
            result.push({
              specialty: specialty.specialty,
              percentile: percentile.replace('p', '') + 'th',
              tcc: tccValue,
              wrvu: wrvuValue,
              compensationPerWRVU: Math.round(compensationPerWRVU),
              productivityScore: Math.round(compensationPerWRVU * 100),
              x: wrvuValue,
              y: tccValue,
              color: specialtyColor
            });
          }
        });
      });
      
      console.log('Productivity data for all percentiles generated:', result.length, 'items');
      return result;
    }
    
    const result = comparisonData.map(item => {
      const tccValue = item[`tcc_${percentileType}`] || 0;
      const wrvuValue = item[`wrvu_${percentileType}`] || 0;
      const cfValue = item[`cf_${percentileType}`] || 0;
      
      // Calculate productivity metrics
      const compensationPerWRVU = wrvuValue > 0 ? tccValue / wrvuValue : 0;
      const productivityScore = wrvuValue > 0 ? (tccValue / wrvuValue) * 100 : 0;
      
      console.log(`Productivity data for ${item.specialty}:`, {
        tcc: tccValue,
        wrvu: wrvuValue,
        cf: cfValue,
        compensationPerWRVU,
        productivityScore
      });
      
      return {
        specialty: item.specialty,
        tcc: tccValue,
        wrvu: wrvuValue,
        cf: cfValue,
        compensationPerWRVU: Math.round(compensationPerWRVU),
        productivityScore: Math.round(productivityScore),
        // For scatter plot: x-axis = wRVU, y-axis = TCC
        x: wrvuValue,
        y: tccValue
      };
    }).filter(item => item.tcc > 0 && item.wrvu > 0); // Only include items with valid data
    
    console.log('Productivity data generated:', result.length, 'items');
    console.log('Sample productivity data:', result.slice(0, 3));
    return result;
  }, [comparisonData, metricType, percentileType, selectedSpecialties]);

  // Regional comparison data
  const regionalData = useMemo(() => {
    console.log('Generating regional data:', {
      filteredDataLength: filteredData.length,
      selectedSpecialtiesLength: selectedSpecialties.length,
      metricType,
      percentileType
    });
    
    if (selectedSpecialties.length === 0) {
      console.log('No specialties selected for regional chart');
      return [];
    }
    
    if (filteredData.length === 0) {
      console.log('No filtered data available for regional chart');
      return [];
    }
    
    // Skip regional chart if "All Percentiles" is selected
    if (percentileType === 'all') {
      console.log('Skipping regional chart for "All Percentiles" selection');
      return [];
    }
    
    const grouped = filteredData.reduce((acc, d) => {
      const key = `${d.specialty}-${d.region}`;
      if (!acc[key]) {
        acc[key] = {
          specialty: d.specialty,
          region: d.region,
          value: 0,
          count: 0
        };
      }
      acc[key].value += d[`${metricType}_${percentileType}`] || 0;
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, any>);

    const result = Object.values(grouped).map(item => ({
      specialty: item.specialty,
      region: item.region,
      value: Math.round(item.value / item.count)
    }));
    
    console.log('Regional data generated:', result.length, 'items');
    return result;
  }, [filteredData, selectedSpecialties, metricType, percentileType]);

  const handleSpecialtyToggle = (specialty: string) => {
    setSelectedSpecialties(prev => {
      if (prev.includes(specialty)) {
        return prev.filter(s => s !== specialty);
      } else {
        return [...prev, specialty];
      }
    });
  };

  const getMetricLabel = () => {
    const metricLabels = {
      tcc: 'Total Cash Compensation',
      cf: 'Conversion Factor',
      wrvu: 'Work RVUs'
    };
    const percentileLabels = {
      p25: '25th Percentile',
      p50: '50th Percentile (Median)',
      p75: '75th Percentile',
      p90: '90th Percentile',
      all: 'All Percentiles'
    };
    return `${metricLabels[metricType]} - ${percentileLabels[percentileType]}`;
  };

  const getYAxisFormatter = (value: number) => {
    if (metricType === 'tcc') {
      return `$${(value / 1000).toFixed(0)}K`;
    } else if (metricType === 'cf') {
      return `$${value.toFixed(2)}`;
    } else {
      return value.toLocaleString();
    }
  };

  const getTooltipFormatter = (value: any) => {
    if (metricType === 'tcc') {
      return [`$${value.toLocaleString()}`, getMetricLabel()];
    } else if (metricType === 'cf') {
      return [`$${value.toFixed(2)}`, getMetricLabel()];
    } else {
      return [value.toLocaleString(), getMetricLabel()];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <LoadingSpinner 
            message="Loading chart data..."
            size="lg"
            variant="primary"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Specialty Selection Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Select Specialties</h3>
            <p className="text-gray-600 text-sm">Choose specialties to compare in the charts below</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {selectedSpecialties.length} Selected
            </span>
          </div>
        </div>
        
        {/* Search Input */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search specialties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 bg-gray-50/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all duration-200 placeholder-gray-400"
          />
        </div>
        
        {/* Specialty Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-64 overflow-y-auto p-4 bg-gray-50/30 rounded-xl border border-gray-200">
          {filteredSpecialties.map(specialty => (
            <button
              key={specialty}
              onClick={() => handleSpecialtyToggle(specialty)}
              className={`group relative p-3 text-sm font-medium rounded-xl border-2 transition-all duration-200 min-h-[48px] flex items-center justify-center ${
                selectedSpecialties.includes(specialty)
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-500 shadow-lg shadow-blue-500/25 transform scale-105'
                  : 'bg-white/50 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-white/70 hover:shadow-md'
              }`}
            >
              {specialty}
              {selectedSpecialties.includes(specialty) && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Status Messages */}
        {filteredSpecialties.length === 0 && searchTerm && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm font-medium text-amber-800">No specialties found matching "{searchTerm}"</span>
            </div>
          </div>
        )}

        {selectedSpecialties.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-gray-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-gray-800">
                  {selectedSpecialties.length} {selectedSpecialties.length === 1 ? 'specialty' : 'specialties'} selected
                </span>
              </div>
              <button
                onClick={() => setSelectedSpecialties([])}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Clear all
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Chart Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Region Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 bg-gray-50/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all duration-200"
            >
              <option value="">All Regions</option>
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          {/* Provider Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Provider Type</label>
            <select
              value={selectedProviderType}
              onChange={(e) => setSelectedProviderType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 bg-gray-50/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all duration-200"
            >
              <option value="">All Types</option>
              {providerTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Chart Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 bg-gray-50/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all duration-200"
            >
              <option value="comparison">Comparison Chart</option>
              <option value="productivity">Productivity Chart</option>
              <option value="percentiles">Percentiles Chart</option>
              <option value="regional">Regional Chart</option>
            </select>
          </div>

          {/* Metric Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Metric</label>
            <select
              value={metricType}
              onChange={(e) => setMetricType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 bg-gray-50/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all duration-200"
            >
              <option value="tcc">Total Cash Compensation</option>
              <option value="cf">Conversion Factor</option>
              <option value="wrvu">Work RVU</option>
            </select>
          </div>
        </div>

        {/* Percentile Filter (only show for relevant chart types) */}
        {(chartType === 'comparison' || chartType === 'productivity' || chartType === 'regional') && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Percentile</label>
            <select
              value={percentileType}
              onChange={(e) => setPercentileType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 bg-gray-50/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 transition-all duration-200"
            >
              <option value="p25">25th Percentile</option>
              <option value="p50">50th Percentile (Median)</option>
              <option value="p75">75th Percentile</option>
              <option value="p90">90th Percentile</option>
              <option value="all">All Percentiles</option>
            </select>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="space-y-8">
        {selectedSpecialties.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Specialties Selected</h3>
            <p className="text-gray-600">Please select specialties above to start comparing them.</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">No survey data is available. Please upload surveys first.</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Matches Filters</h3>
            <p className="text-gray-600">The selected filters don't match any available data. Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            {chartType === 'comparison' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {shouldShowPercentileBreakdown ? 'Percentile Breakdown' : 
                     shouldShowAllPercentiles ? 'All Percentiles Comparison' : 'Side-by-Side Comparison'}
                  </h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {getMetricLabel()}
                  </span>
                </div>
                
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={shouldShowPercentileBreakdown ? percentileBreakdownData : 
                                   shouldShowAllPercentiles ? allPercentilesData : comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey={shouldShowPercentileBreakdown ? "percentile" : 
                               shouldShowAllPercentiles ? "specialty" : "specialty"} 
                      height={120} 
                      tick={{ fontSize: 11, fill: '#6b7280' }} 
                      angle={shouldShowPercentileBreakdown ? 0 : -30} 
                      textAnchor={shouldShowPercentileBreakdown ? "middle" : "end"} 
                      interval={0} 
                    />
                    <YAxis tickFormatter={getYAxisFormatter} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip 
                      formatter={getTooltipFormatter}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                      }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const value = payload[0].value;
                          
                          if (shouldShowPercentileBreakdown) {
                            return (
                              <div className="bg-white/95 backdrop-blur-sm p-4 border border-gray-200 rounded-xl shadow-xl">
                                <p className="font-semibold text-gray-900 mb-2">{selectedSpecialties[0]} - {label} Percentile</p>
                                <p className="text-blue-600 font-bold text-lg">
                                  {metricType === 'tcc' ? `$${value.toLocaleString()}` : 
                                   metricType === 'cf' ? `$${value.toFixed(2)}` : 
                                   value.toLocaleString()}
                                </p>
                              </div>
                            );
                          } else if (shouldShowAllPercentiles) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white/95 backdrop-blur-sm p-4 border border-gray-200 rounded-xl shadow-xl">
                                <p className="font-semibold text-gray-900 mb-2">{data.specialty} - {data.percentile} Percentile</p>
                                <p className="text-blue-600 font-bold text-lg">
                                  {metricType === 'tcc' ? `$${value.toLocaleString()}` : 
                                   metricType === 'cf' ? `$${value.toFixed(2)}` : 
                                   value.toLocaleString()}
                                </p>
                              </div>
                            );
                          } else {
                            const sorted = [...comparisonData].sort((a, b) => 
                              b[`${metricType}_${percentileType}`] - a[`${metricType}_${percentileType}`]
                            );
                            const highest = sorted[0];
                            const lowest = sorted[sorted.length - 1];
                            const currentItem = comparisonData.find(item => item.specialty === label);
                            
                            if (currentItem) {
                              const vsHighest = value - highest[`${metricType}_${percentileType}`];
                              const vsLowest = value - lowest[`${metricType}_${percentileType}`];
                              const percentVsHighest = (vsHighest / highest[`${metricType}_${percentileType}`]) * 100;
                              const percentVsLowest = (vsLowest / lowest[`${metricType}_${percentileType}`]) * 100;
                              
                              return (
                                <div className="bg-white/95 backdrop-blur-sm p-4 border border-gray-200 rounded-xl shadow-xl">
                                  <p className="font-semibold text-gray-900 mb-2">{label}</p>
                                  <p className="text-blue-600 font-bold text-lg mb-2">
                                    {metricType === 'tcc' ? `$${value.toLocaleString()}` : 
                                     metricType === 'cf' ? `$${value.toFixed(2)}` : 
                                     value.toLocaleString()}
                                  </p>
                                  {vsHighest !== 0 && (
                                    <p className="text-xs text-gray-600 mb-1">
                                      {vsHighest > 0 ? '+' : ''}{metricType === 'tcc' ? `$${vsHighest.toLocaleString()}` : vsHighest.toLocaleString()} vs highest
                                      ({percentVsHighest > 0 ? '+' : ''}{percentVsHighest.toFixed(1)}%)
                                    </p>
                                  )}
                                  {vsLowest !== 0 && (
                                    <p className="text-xs text-gray-600">
                                      {vsLowest > 0 ? '+' : ''}{metricType === 'tcc' ? `$${vsLowest.toLocaleString()}` : vsLowest.toLocaleString()} vs lowest
                                      ({percentVsLowest > 0 ? '+' : ''}{percentVsLowest.toFixed(1)}%)
                                    </p>
                                  )}
                                </div>
                              );
                            }
                          }
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey={shouldShowPercentileBreakdown ? "value" : 
                               shouldShowAllPercentiles ? "value" : `${metricType}_${percentileType}`} 
                      fill="url(#blueGradient)"
                      name={getMetricLabel()}
                      barSize={shouldShowPercentileBreakdown ? 60 : 40}
                      radius={[3, 3, 0, 0]}
                      label={({ value, x, y, width }) => {
                        if (metricType === 'tcc') {
                          return (
                            <text 
                              x={x + width / 2} 
                              y={y - 6} 
                              textAnchor="middle" 
                              fontSize="11" 
                              fontWeight="500" 
                              fill="#374151"
                            >
                              ${(value / 1000).toFixed(0)}K
                            </text>
                          );
                        } else if (metricType === 'cf') {
                          return (
                            <text 
                              x={x + width / 2} 
                              y={y - 6} 
                              textAnchor="middle" 
                              fontSize="11" 
                              fontWeight="500" 
                              fill="#374151"
                            >
                              ${value.toFixed(2)}
                            </text>
                          );
                        } else {
                          return (
                            <text 
                              x={x + width / 2} 
                              y={y - 6} 
                              textAnchor="middle" 
                              fontSize="11" 
                              fontWeight="500" 
                              fill="#374151"
                            >
                              {(value / 1000).toFixed(0)}K
                            </text>
                          );
                        }
                      }}
                    >
                      {shouldShowAllPercentiles && allPercentilesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                    <defs>
                      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#1d4ed8" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
                
                {shouldShowPercentileBreakdown && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Tip:</strong> Select multiple specialties to compare them side-by-side, or choose different percentiles to see the full range of compensation data.
                    </p>
                  </div>
                )}
                
                {shouldShowAllPercentiles && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>All Percentiles View:</strong> Each specialty shows 4 bars representing the 25th, 50th, 75th, and 90th percentiles for comprehensive comparison.
                    </p>
                  </div>
                )}
              </div>
            )}

            {chartType === 'productivity' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Productivity Analysis</h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    Compensation per Work RVU
                  </span>
                </div>
                
                {selectedSpecialties.length === 0 ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Specialties First</h3>
                      <p className="text-gray-600">Please select specialties above to view productivity analysis.</p>
                    </div>
                  </div>
                ) : productivityData.length === 0 ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Productivity Data</h3>
                      <p className="text-gray-600">No data available for the selected filters and specialties.</p>
                      <div className="mt-4 text-sm text-gray-500">
                        <p>Selected specialties: {selectedSpecialties.join(', ')}</p>
                        <p>Selected region: {selectedRegion || 'All'}</p>
                        <p>Selected provider type: {selectedProviderType || 'All'}</p>
                        <p>Selected percentile: {percentileType}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-6">
                      <p className="text-sm text-gray-600 mb-2">
                        This chart shows compensation per Work RVU for each specialty. Higher values indicate specialties that receive more compensation per unit of work productivity.
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Selected Percentile: {percentileType === 'all' ? 'All Percentiles' : 
                          percentileType === 'p25' ? '25th' : 
                          percentileType === 'p50' ? '50th (Median)' : 
                          percentileType === 'p75' ? '75th' : '90th'}</span>
                        <span>•</span>
                        <span>Data Points: {productivityData.length}</span>
                      </div>
                    </div>
                    
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={productivityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey={percentileType === 'all' ? "specialty" : "specialty"} 
                          height={120} 
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          angle={-30}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis 
                          tickFormatter={(value) => `$${value.toLocaleString()}`}
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                        />
                        <Tooltip 
                          formatter={(value: any) => [`$${value.toLocaleString()}`, 'Compensation per wRVU']}
                          labelFormatter={(label) => percentileType === 'all' ? 
                            `Specialty: ${label}` : `Specialty: ${label}`}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = productivityData.find(item => 
                                percentileType === 'all' ? 
                                item.specialty === label && item.percentile : 
                                item.specialty === label
                              );
                              if (data) {
                                return (
                                  <div className="bg-white/95 backdrop-blur-sm p-4 border border-gray-200 rounded-xl shadow-xl">
                                    <p className="font-semibold text-gray-900 mb-2">
                                      {percentileType === 'all' ? `${data.specialty} - ${data.percentile} Percentile` : label}
                                    </p>
                                    <div className="space-y-1 text-sm">
                                      <p><span className="font-medium">Compensation per wRVU:</span> ${data.compensationPerWRVU.toLocaleString()}</p>
                                      <p><span className="font-medium">Total Cash Compensation:</span> ${data.tcc.toLocaleString()}</p>
                                      <p><span className="font-medium">Work RVU:</span> {data.wrvu.toLocaleString()}</p>
                                      {data.cf && <p><span className="font-medium">Conversion Factor:</span> ${data.cf.toFixed(2)}</p>}
                                    </div>
                                  </div>
                                );
                              }
                            }
                            return null;
                          }}
                        />
                        <Bar 
                          dataKey="compensationPerWRVU" 
                          fill={percentileType === 'all' ? undefined : "url(#productivityGradient)"}
                          name="Compensation per wRVU"
                          radius={[3, 3, 0, 0]}
                          barSize={percentileType === 'all' ? 30 : 36}
                          label={({ value, x, y, width }) => (
                            <text 
                              x={x + width / 2} 
                              y={y - 6} 
                              textAnchor="middle" 
                              fontSize="11" 
                              fontWeight="500" 
                              fill="#374151"
                            >
                              ${value.toLocaleString()}
                            </text>
                          )}
                        >
                          {percentileType === 'all' && productivityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || '#3B82F6'} />
                          ))}
                        </Bar>
                        <defs>
                          <linearGradient id="productivityGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#1d4ed8" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {chartType === 'percentiles' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Percentile Breakdown</h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {metricType.toUpperCase()}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={allPercentilesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="specialty" height={120} tick={{ fontSize: 11, fill: '#6b7280' }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tickFormatter={getYAxisFormatter} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip formatter={getTooltipFormatter} 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center"
                      wrapperStyle={{
                        paddingTop: '20px',
                        display: 'flex',
                        justifyContent: 'space-evenly',
                        width: '100%'
                      }}
                      content={({ payload }) => (
                        <div className="flex justify-center space-x-16 mt-4">
                          {payload?.map((entry, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <div 
                                className="w-4 h-4 rounded"
                                style={{ 
                                  backgroundColor: entry.color,
                                  border: entry.type === 'line' ? '2px solid' : 'none'
                                }}
                              />
                              <span className="text-sm text-gray-700 font-medium">
                                {entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="url(#blueGradient)" 
                      name={getMetricLabel()}
                      barSize={40}
                      radius={[3, 3, 0, 0]}
                      label={({ value, x, y, width }) => {
                        if (metricType === 'tcc') {
                          return (
                            <text 
                              x={x + width / 2} 
                              y={y - 6} 
                              textAnchor="middle" 
                              fontSize="11" 
                              fontWeight="500" 
                              fill="#374151"
                            >
                              ${value.toLocaleString()}
                            </text>
                          );
                        } else if (metricType === 'cf') {
                          return (
                            <text 
                              x={x + width / 2} 
                              y={y - 6} 
                              textAnchor="middle" 
                              fontSize="11" 
                              fontWeight="500" 
                              fill="#374151"
                            >
                              ${value.toFixed(2)}
                            </text>
                          );
                        } else {
                          return (
                            <text 
                              x={x + width / 2} 
                              y={y - 6} 
                              textAnchor="middle" 
                              fontSize="11" 
                              fontWeight="500" 
                              fill="#374151"
                            >
                              {value.toLocaleString()}
                            </text>
                          );
                        }
                      }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} name="Median" />
                    <defs>
                      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#1d4ed8" />
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {chartType === 'regional' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Regional Comparison</h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {getMetricLabel()}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={regionalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="region" height={120} tick={{ fontSize: 11, fill: '#6b7280' }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tickFormatter={getYAxisFormatter} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip formatter={getTooltipFormatter} 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center"
                      wrapperStyle={{
                        paddingTop: '20px',
                        display: 'flex',
                        justifyContent: 'space-evenly',
                        width: '100%'
                      }}
                      content={({ payload }) => (
                        <div className="flex justify-center space-x-16 mt-4">
                          {payload?.map((entry, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <div 
                                className="w-4 h-4 rounded"
                                style={{ 
                                  backgroundColor: entry.color,
                                  border: entry.type === 'line' ? '2px solid' : 'none'
                                }}
                              />
                              <span className="text-sm text-gray-700 font-medium">
                                {entry.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="url(#greenGradient)" 
                      name={getMetricLabel()}
                      barSize={40}
                      radius={[3, 3, 0, 0]}
                      label={({ value, x, y, width }) => {
                        if (metricType === 'tcc') {
                          return (
                            <text 
                              x={x + width / 2} 
                              y={y - 6} 
                              textAnchor="middle" 
                              fontSize="11" 
                              fontWeight="500" 
                              fill="#374151"
                            >
                              ${value.toLocaleString()}
                            </text>
                          );
                        } else if (metricType === 'cf') {
                          return (
                            <text 
                              x={x + width / 2} 
                              y={y - 6} 
                              textAnchor="middle" 
                              fontSize="11" 
                              fontWeight="500" 
                              fill="#374151"
                            >
                              ${value.toFixed(2)}
                            </text>
                          );
                        } else {
                          return (
                            <text 
                              x={x + width / 2} 
                              y={y - 6} 
                              textAnchor="middle" 
                              fontSize="11" 
                              fontWeight="500" 
                              fill="#374151"
                            >
                              {value.toLocaleString()}
                            </text>
                          );
                        }
                      }}
                    />
                    <defs>
                      <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Charts;
