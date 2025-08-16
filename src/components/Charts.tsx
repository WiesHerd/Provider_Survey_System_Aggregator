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
  Box
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { 
  ChartBarIcon, 
  ChartPieIcon, 
  ChartBarSquareIcon,
  FunnelIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon
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
    year: '',
    search: ''
  });
  const [chartType, setChartType] = useState<'line' | 'bar' | 'pie'>(type);
  const [selectedMetric, setSelectedMetric] = useState('tcc_p50');
  const [uniqueValues, setUniqueValues] = useState({
    specialties: [] as string[],
    surveySources: [] as string[],
    geographicRegions: [] as string[],
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
          years: years.sort()
        });
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

  // Prepare chart data
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
      year: '',
      search: ''
    });
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  // Render chart based on type
  const renderChart = () => {
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
          <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, selectedMetric.replace('_', ' ').toUpperCase()]} />
        </PieChart>
      );
    }

    if (chartType === 'bar') {
      return (
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
          <YAxis />
          <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, selectedMetric.replace('_', ' ').toUpperCase()]} />
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
        <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, selectedMetric.replace('_', ' ').toUpperCase()]} />
        <Legend />
        <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
      </LineChart>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-3">
          <LoadingSpinner 
            message="Loading analytics data..."
            size="lg"
            variant="primary"
          />
        </div>
      </div>
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
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={chartType}
                  onChange={(e: SelectChangeEvent<string>) => setChartType(e.target.value as 'line' | 'bar' | 'pie')}
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    }
                  }}
                >
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
                  <MenuItem value="tcc_p50">TCC P50</MenuItem>
                  <MenuItem value="tcc_p75">TCC P75</MenuItem>
                  <MenuItem value="tcc_p90">TCC P90</MenuItem>
                  <MenuItem value="cf_p50">CF P50</MenuItem>
                  <MenuItem value="cf_p75">CF P75</MenuItem>
                  <MenuItem value="wrvu_p50">WRVU P50</MenuItem>
                </Select>
              </FormControl>
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
                  const csvContent = chartData.map(row => 
                    `${row.name},${row.value},${row.count}`
                  ).join('\n');
                  const blob = new Blob([`Specialty,${selectedMetric},Count\n${csvContent}`], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `analytics-${selectedMetric}-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                }}
                sx={{ borderRadius: '8px' }}
              >
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Grid */}
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

        {/* Chart Display */}
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card sx={{ borderRadius: 2, backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', border: '1px solid #e5e7eb' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Records
              </Typography>
              <Typography variant="h4" component="div">
                {filteredData.length.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 2, backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', border: '1px solid #e5e7eb' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Average {selectedMetric.replace('_', ' ').toUpperCase()}
              </Typography>
              <Typography variant="h4" component="div">
                ${chartData.length > 0 ? Math.round(chartData.reduce((sum, item) => sum + item.value, 0) / chartData.length).toLocaleString() : 0}
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 2, backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', border: '1px solid #e5e7eb' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Filters
              </Typography>
              <Typography variant="h4" component="div">
                {Object.values(filters).filter(value => value !== '').length}
              </Typography>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Charts;
