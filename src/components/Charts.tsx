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
  const [percentileType, setPercentileType] = useState<'p25' | 'p50' | 'p75' | 'p90'>('p50');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const backendService = BackendService.getInstance();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const surveys = await backendService.getAllSurveys();
      let allData: ChartData[] = [];

      for (const survey of surveys) {
        const data = await backendService.getSurveyData(survey.id, undefined, { limit: 10000 });
        if (data && data.rows) {
          const transformedData = data.rows.map((row: any) => ({
            specialty: row.specialty || row.normalizedSpecialty || 'Unknown',
            tcc_p25: Number(row.tcc_p25) || 0,
            tcc_p50: Number(row.tcc_p50) || 0,
            tcc_p75: Number(row.tcc_p75) || 0,
            tcc_p90: Number(row.tcc_p90) || 0,
            cf_p25: Number(row.cf_p25) || 0,
            cf_p50: Number(row.cf_p50) || 0,
            cf_p75: Number(row.cf_p75) || 0,
            cf_p90: Number(row.cf_p90) || 0,
            wrvu_p25: Number(row.wrvu_p25) || 0,
            wrvu_p50: Number(row.wrvu_p50) || 0,
            wrvu_p75: Number(row.wrvu_p75) || 0,
            wrvu_p90: Number(row.wrvu_p90) || 0,
            region: row.geographic_region || row.region || 'Unknown',
            providerType: row.provider_type || 'Unknown',
          }));
          allData = allData.concat(transformedData);
        }
      }

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
    return chartData.filter(d => {
      if (selectedSpecialties.length > 0 && !selectedSpecialties.includes(d.specialty)) return false;
      if (selectedRegion && d.region !== selectedRegion) return false;
      if (selectedProviderType && d.providerType !== selectedProviderType) return false;
      return true;
    });
  }, [chartData, selectedSpecialties, selectedRegion, selectedProviderType]);

  // Multi-specialty comparison data
  const comparisonData = useMemo(() => {
    if (selectedSpecialties.length === 0) return [];
    
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

    return Object.values(grouped).map(item => ({
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
  }, [filteredData]);

  // Productivity comparison data
  const productivityData = useMemo(() => {
    if (selectedSpecialties.length === 0) return [];
    
    return comparisonData.map(item => ({
      specialty: item.specialty,
      tcc: item[`${metricType}_${percentileType}`],
      wrvu: item[`wrvu_${percentileType}`],
      cf: item[`cf_${percentileType}`],
    }));
  }, [comparisonData, metricType, percentileType]);

  // Regional comparison data
  const regionalData = useMemo(() => {
    if (selectedSpecialties.length === 0) return [];
    
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
      acc[key].value += d[`${metricType}_${percentileType}`];
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).map(item => ({
      ...item,
      value: Math.round(item.value / item.count),
    }));
  }, [filteredData, selectedSpecialties, metricType, percentileType]);

  const handleSpecialtyToggle = (specialty: string) => {
    setSelectedSpecialties(prev => {
      if (prev.includes(specialty)) {
        return prev.filter(s => s !== specialty);
      } else if (prev.length < 3) {
        return [...prev, specialty];
      } else {
        // Replace the first one if we're at max
        return [prev[1], prev[2], specialty];
      }
    });
  };

  const getMetricLabel = () => {
    const metricLabels = {
      tcc: 'Total Cash Compensation',
      cf: 'Conversion Factor',
      wrvu: 'Work RVU'
    };
    const percentileLabels = {
      p25: '25th Percentile',
      p50: 'Median (50th Percentile)',
      p75: '75th Percentile',
      p90: '90th Percentile'
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
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Multi-Specialty Comparison Tool</h1>
        
                 {/* Specialty Selection */}
         <div className="mb-8">
           <h3 className="text-lg font-semibold mb-4">Select Specialties to Compare (Max 3)</h3>
           
           {/* Search Input */}
           <div className="mb-4">
             <input
               type="text"
               placeholder="Search specialties..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
             />
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto border rounded p-4">
             {filteredSpecialties.map(specialty => (
               <button
                 key={specialty}
                 onClick={() => handleSpecialtyToggle(specialty)}
                 className={`h-12 px-2 text-sm rounded border transition-colors flex items-center justify-center text-center ${
                   selectedSpecialties.includes(specialty)
                     ? 'bg-blue-500 text-white border-blue-500'
                     : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                 }`}
               >
                 {specialty}
               </button>
             ))}
           </div>
           
           {filteredSpecialties.length === 0 && searchTerm && (
             <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
               <p className="text-sm text-yellow-800">
                 No specialties found matching "{searchTerm}"
               </p>
             </div>
           )}
           
           {selectedSpecialties.length > 0 && (
             <div className="mt-4 p-3 bg-blue-50 rounded-lg">
               <p className="text-sm text-blue-800">
                 <strong>Selected:</strong> {selectedSpecialties.join(', ')}
               </p>
             </div>
           )}
         </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              <option value="">All Regions</option>
              {regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Provider Type</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={selectedProviderType}
              onChange={(e) => setSelectedProviderType(e.target.value)}
            >
              <option value="">All Types</option>
              {providerTypes.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Metric</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={metricType}
              onChange={(e) => setMetricType(e.target.value as any)}
            >
              <option value="tcc">Total Cash Compensation</option>
              <option value="cf">Conversion Factor</option>
              <option value="wrvu">Work RVU</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Percentile</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={percentileType}
              onChange={(e) => setPercentileType(e.target.value as any)}
            >
              <option value="p25">25th Percentile</option>
              <option value="p50">Median (50th)</option>
              <option value="p75">75th Percentile</option>
              <option value="p90">90th Percentile</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
            >
              <option value="comparison">Side-by-Side Comparison</option>
              <option value="productivity">Productivity Analysis</option>
              <option value="percentiles">Percentile Breakdown</option>
              <option value="regional">Regional Comparison</option>
            </select>
          </div>
        </div>

        

        {/* Charts */}
        <div className="space-y-8">
          {selectedSpecialties.length === 0 ? (
            <div className="bg-yellow-50 p-8 rounded-lg text-center">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Specialties Selected</h3>
              <p className="text-yellow-700">Please select 1-3 specialties above to start comparing them.</p>
            </div>
          ) : (
            <>
                             {chartType === 'comparison' && (
                 <div className="bg-gray-50 p-6 rounded-lg">
                   <h3 className="text-lg font-semibold mb-4">Side-by-Side Comparison: {getMetricLabel()}</h3>
                   
                   
                   
                                       <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="specialty" height={80} />
                        <YAxis tickFormatter={getYAxisFormatter} />
                        <Tooltip 
                          formatter={getTooltipFormatter}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const value = payload[0].value;
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
                                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                    <p className="font-semibold text-gray-900">{label}</p>
                                    <p className="text-blue-600 font-bold">
                                      {metricType === 'tcc' ? `$${value.toLocaleString()}` : 
                                       metricType === 'cf' ? `$${value.toFixed(2)}` : 
                                       value.toLocaleString()}
                                    </p>
                                    {vsHighest !== 0 && (
                                      <p className="text-xs text-gray-600">
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
                            return null;
                          }}
                        />
                                                 <Bar 
                           dataKey={`${metricType}_${percentileType}`} 
                           fill="#8884d8" 
                           name={getMetricLabel()}
                           barSize={40}
                           radius={[4, 4, 0, 0]}
                           label={({ value }) => {
                             if (metricType === 'tcc') {
                               return `$${value.toLocaleString()}`;
                             } else if (metricType === 'cf') {
                               return `$${value.toFixed(2)}`;
                             } else {
                               return value.toLocaleString();
                             }
                           }}
                         />
                      </BarChart>
                    </ResponsiveContainer>
                   
                   
                 </div>
               )}

              {chartType === 'productivity' && (
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Productivity vs Compensation Analysis</h3>
                  <ResponsiveContainer width="100%" height={500}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        dataKey="wrvu" 
                        name="wRVU" 
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(value) => value.toLocaleString()}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="tcc" 
                        name="TCC" 
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                      />
                      <Tooltip 
                        formatter={(value: any, name: string) => [
                          name === 'tcc' ? `$${value.toLocaleString()}` : value.toLocaleString(),
                          name === 'tcc' ? 'TCC' : 'wRVU'
                        ]}
                        labelFormatter={(label) => `Specialty: ${label}`}
                      />
                      <Legend />
                      <Scatter dataKey="tcc" fill="#8884d8" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              )}

                             {chartType === 'percentiles' && (
                 <div className="bg-gray-50 p-6 rounded-lg">
                   <h3 className="text-lg font-semibold mb-4">Percentile Breakdown: {metricType.toUpperCase()}</h3>
                   <ResponsiveContainer width="100%" height={400}>
                     <ComposedChart data={comparisonData}>
                       <CartesianGrid strokeDasharray="3 3" />
                       <XAxis dataKey="specialty" height={80} />
                       <YAxis tickFormatter={getYAxisFormatter} />
                       <Tooltip formatter={getTooltipFormatter} />
                       <Legend />
                       <Bar 
                         dataKey={`${metricType}_p50`} 
                         fill="#8884d8" 
                         name="Median"
                         barSize={40}
                         radius={[4, 4, 0, 0]}
                         label={({ value }) => {
                           if (metricType === 'tcc') {
                             return `$${value.toLocaleString()}`;
                           } else if (metricType === 'cf') {
                             return `$${value.toFixed(2)}`;
                           } else {
                             return value.toLocaleString();
                           }
                         }}
                       />
                       <Line type="monotone" dataKey={`${metricType}_p75`} stroke="#ff7300" strokeWidth={2} name="75th Percentile" />
                       <Line type="monotone" dataKey={`${metricType}_p25`} stroke="#82ca9d" strokeWidth={2} name="25th Percentile" />
                     </ComposedChart>
                   </ResponsiveContainer>
                 </div>
               )}

                             {chartType === 'regional' && (
                 <div className="bg-gray-50 p-6 rounded-lg">
                   <h3 className="text-lg font-semibold mb-4">Regional Comparison: {getMetricLabel()}</h3>
                   <ResponsiveContainer width="100%" height={400}>
                     <BarChart data={regionalData}>
                       <CartesianGrid strokeDasharray="3 3" />
                       <XAxis dataKey="region" height={80} />
                       <YAxis tickFormatter={getYAxisFormatter} />
                       <Tooltip formatter={getTooltipFormatter} />
                       <Legend />
                       <Bar 
                         dataKey="value" 
                         fill="#82ca9d" 
                         name={getMetricLabel()}
                         barSize={40}
                         radius={[4, 4, 0, 0]}
                         label={({ value }) => {
                           if (metricType === 'tcc') {
                             return `$${value.toLocaleString()}`;
                           } else if (metricType === 'cf') {
                             return `$${value.toFixed(2)}`;
                           } else {
                             return value.toLocaleString();
                           }
                         }}
                       />
                     </BarChart>
                   </ResponsiveContainer>
                 </div>
               )}
            </>
          )}
        </div>

        {/* Insights Panel */}
        <div className="mt-8 bg-indigo-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-indigo-900">How to Use This Tool</h3>
          <div className="space-y-2 text-indigo-800">
            <p>• <strong>Select Specialties:</strong> Click on 1-3 specialties to compare them side-by-side</p>
            <p>• <strong>Choose Metrics:</strong> Compare TCC, Conversion Factor, or Work RVU</p>
            <p>• <strong>Select Percentiles:</strong> View 25th, 50th (median), 75th, or 90th percentile data</p>
            <p>• <strong>Filter by Region/Type:</strong> Narrow down the comparison by geographic region or provider type</p>
            <p>• <strong>Chart Types:</strong> Switch between different visualization types for deeper insights</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Charts;
