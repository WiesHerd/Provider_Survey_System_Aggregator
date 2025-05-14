import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Typography, Divider, Grid, TextField, MenuItem, InputAdornment, Box, Paper, RadioGroup, FormControlLabel, Radio, Button } from '@mui/material';
import { LocalStorageService } from '../services/StorageService';
import { SpecialtyMappingService } from '../services/SpecialtyMappingService';
import Autocomplete from '@mui/material/Autocomplete';

// Real FilterBar implementation
const specialties = ['Cardiology', 'Family Medicine', 'Internal Medicine', 'Orthopedics'];
const providerTypes = ['MD', 'DO', 'NP', 'PA'];
const regions = ['Midwest', 'Northeast', 'South', 'West'];
const surveySources = ['MGMA', 'SullivanCotter', 'Gallagher', 'AMGA'];
const years = Array.from({ length: 10 }, (_, i) => `${2024 - i}`);

interface FilterBarProps {
  filters: any;
  setFilters: (f: any) => void;
  uniqueValues: {
    specialties: string[];
    providerTypes: string[];
    regions: string[];
    surveySources: string[];
    years: string[];
  };
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters, uniqueValues }) => (
  <Grid container spacing={2} sx={{ mb: 2 }}>
    <Grid item xs={12} md={4}>
      <TextField
        select
        label="Specialty"
        value={filters.specialty}
        onChange={e => setFilters((f: any) => ({ ...f, specialty: e.target.value }))}
        fullWidth
        size="small"
      >
        <MenuItem value="">All Specialties</MenuItem>
        {uniqueValues.specialties.map(option => (
          <MenuItem key={option} value={option}>{option}</MenuItem>
        ))}
      </TextField>
    </Grid>
    <Grid item xs={12} md={4}>
      <TextField
        select
        label="Provider Type"
        value={filters.providerType}
        onChange={e => setFilters((f: any) => ({ ...f, providerType: e.target.value }))}
        fullWidth
        size="small"
      >
        <MenuItem value="">All Types</MenuItem>
        {uniqueValues.providerTypes.map(option => (
          <MenuItem key={option} value={option}>{option}</MenuItem>
        ))}
      </TextField>
    </Grid>
    <Grid item xs={12} md={4}>
      <TextField
        select
        label="Region"
        value={filters.region}
        onChange={e => setFilters((f: any) => ({ ...f, region: e.target.value }))}
        fullWidth
        size="small"
      >
        <MenuItem value="">All Regions</MenuItem>
        {uniqueValues.regions.map(option => (
          <MenuItem key={option} value={option}>{option}</MenuItem>
        ))}
      </TextField>
    </Grid>
    <Grid item xs={12} md={4}>
      <TextField
        select
        label="Survey Source"
        value={filters.surveySource}
        onChange={e => setFilters((f: any) => ({ ...f, surveySource: e.target.value }))}
        fullWidth
        size="small"
      >
        <MenuItem value="">All Sources</MenuItem>
        {uniqueValues.surveySources.map(option => (
          <MenuItem key={option} value={option}>{option}</MenuItem>
        ))}
      </TextField>
    </Grid>
    <Grid item xs={12} md={4}>
      <TextField
        select
        label="Year"
        value={filters.year}
        onChange={e => setFilters((f: any) => ({ ...f, year: e.target.value }))}
        fullWidth
        size="small"
      >
        <MenuItem value="">All Years</MenuItem>
        {uniqueValues.years.map(option => (
          <MenuItem key={option} value={option}>{option}</MenuItem>
        ))}
      </TextField>
    </Grid>
    <Grid item xs={12} md={4}>
      <TextField
        label="FTE"
        type="number"
        value={filters.fte}
        onChange={e => setFilters((f: any) => ({ ...f, fte: Math.max(0, Math.min(1, Number(e.target.value))) }))}
        fullWidth
        size="small"
        inputProps={{ min: 0, max: 1, step: 0.01 }}
        InputProps={{
          endAdornment: <InputAdornment position="end">FTE</InputAdornment>
        }}
      />
    </Grid>
  </Grid>
);

// Replace CompareTypeSelector with a real component
const CompareTypeSelector: React.FC<{ compareType: string, setCompareType: (type: 'TCC' | 'wRVUs' | 'CFs') => void }> = ({ compareType, setCompareType }) => (
  <Paper sx={{ p: 2, mb: 2, mt: 1 }}>
    <Typography variant="subtitle1" sx={{ mb: 1 }}>
      Comparison Type
    </Typography>
    <RadioGroup
      row
      value={compareType}
      onChange={e => setCompareType(e.target.value as 'TCC' | 'wRVUs' | 'CFs')}
    >
      <FormControlLabel value="TCC" control={<Radio />} label="Total Cash Compensation" />
      <FormControlLabel value="wRVUs" control={<Radio />} label="Work RVUs" />
      <FormControlLabel value="CFs" control={<Radio />} label="Conversion Factors" />
    </RadioGroup>
  </Paper>
);

// Replace TCCItemization with a real component
const TCCItemization: React.FC<{
  components: { type: string; amount: string; notes: string }[];
  setComponents: (c: { type: string; amount: string; notes: string }[]) => void;
}> = ({ components, setComponents }) => {
  const addComponent = () => setComponents([...components, { type: '', amount: '', notes: '' }]);
  const removeComponent = (idx: number) => setComponents(components.filter((_, i) => i !== idx));
  const updateComponent = (idx: number, field: 'type' | 'amount' | 'notes', value: string) => {
    const newComps = [...components];
    newComps[idx] = { ...newComps[idx], [field]: value };
    setComponents(newComps);
  };
  const total = components.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>Compensation Components</Typography>
      <Grid container spacing={2} alignItems="center">
        {components.map((c, idx) => (
          <React.Fragment key={idx}>
            <Grid item xs={12} md={3}>
              <Autocomplete
                freeSolo
                options={["Base Salary", "Bonus", "Incentive", "Other"]}
                value={c.type}
                onInputChange={(_, newValue) => updateComponent(idx, 'type', newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Type" fullWidth size="small" />
                )}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Amount"
                type="number"
                value={c.amount}
                onChange={e => updateComponent(idx, 'amount', e.target.value)}
                fullWidth
                size="small"
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Notes"
                value={c.notes}
                onChange={e => updateComponent(idx, 'notes', e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button onClick={() => removeComponent(idx)} color="error" size="small" sx={{ mt: 0.5 }}>Remove</Button>
            </Grid>
          </React.Fragment>
        ))}
      </Grid>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button onClick={addComponent} size="small" variant="outlined">Add Component</Button>
        <Typography variant="subtitle1">Total TCC: ${total.toLocaleString()}</Typography>
      </Box>
    </Paper>
  );
};

// Update WRVUsInput for compact, centered layout
const WRVUsInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  fte: number;
}> = ({ value, onChange, fte }) => {
  const normalized = fte ? (Number(value) / fte) : Number(value);
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>Work RVUs</Typography>
      <Grid container spacing={2} alignItems="center" justifyContent="center">
        <Grid item xs={12} md={4}>
          <TextField
            label="Annual wRVUs"
            type="number"
            value={value}
            onChange={e => onChange(e.target.value)}
            fullWidth
            size="small"
            InputProps={{ endAdornment: <InputAdornment position="end">wRVUs</InputAdornment> }}
          />
        </Grid>
        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            FTE-adjusted: {normalized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} wRVUs
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Your value will be annualized to 1.0 FTE for market comparison.
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};

// Update CFInput for compact, centered layout
const CFInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  fte: number;
}> = ({ value, onChange }) => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>Conversion Factor ($/wRVU)</Typography>
      <Grid container spacing={2} alignItems="center" justifyContent="center">
        <Grid item xs={12} md={4}>
          <TextField
            label="Conversion Factor"
            type="number"
            value={value}
            onChange={e => onChange(e.target.value)}
            fullWidth
            size="small"
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment>, endAdornment: <InputAdornment position="end">/wRVU</InputAdornment> }}
          />
        </Grid>
        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Enter your conversion factor, or calculate as TCC / wRVUs. FTE does not affect this value.
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
};

// In ResultsPanel, show message if no market data or percentile is available, and add Reset Filters button
const ResultsPanel: React.FC<{
  compareType: 'TCC' | 'wRVUs' | 'CFs';
  marketData: any;
  percentiles: { tcc: number | null; wrvu: number | null; cf: number | null };
  inputValue: string | number;
  rawValue: number;
  fte: number;
  onResetFilters?: () => void;
}> = ({ compareType, marketData, percentiles, inputValue, rawValue, fte, onResetFilters }) => {
  const formatValue = (value: number) => {
    if (compareType === 'wRVUs') {
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  const getPercentileData = () => {
    if (!marketData) return null;
    return marketData[compareType.toLowerCase()];
  };
  const percentileData = getPercentileData();
  const currentPercentile = percentiles[compareType.toLowerCase() as keyof typeof percentiles];

  const noMarketData = !percentileData || Object.values(percentileData).every(v => !v || v === 0);

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>Market Comparison</Typography>
      {noMarketData ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No market data available for these filters.
          </Typography>
          {onResetFilters && (
            <Button variant="outlined" size="small" onClick={onResetFilters}>Reset Filters</Button>
          )}
        </Box>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {['25th', '50th', '75th', '90th'].map((percentile) => {
              const key = `p${percentile.slice(0, 2)}` as keyof typeof percentileData;
              return (
                <Grid item xs={12} sm={6} md={3} key={percentile}>
                  <Paper sx={{ p: 1.5, textAlign: 'center', background: '#f8fafc', boxShadow: 2, border: '1px solid #e0e7ef' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {percentile} Percentile
                    </Typography>
                    <Typography variant="h6">
                      {percentileData ? formatValue(percentileData[key]) : '-'}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
          {typeof currentPercentile === 'number' && !isNaN(currentPercentile) ? (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" gutterBottom color="primary" sx={{ mr: 1 }}>
                  You are in the {currentPercentile.toFixed(2)}th percentile
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', bgcolor: 'grey.100', px: 1.5, py: 0.5, borderRadius: 1, ml: 1 }}>
                  Your Value: {formatValue(Number(inputValue))}
                </Typography>
              </Box>
              <Box sx={{ position: 'relative', height: 6, bgcolor: 'grey.200', borderRadius: 2 }}>
                <Box
                  sx={{
                    position: 'absolute',
                    left: `${currentPercentile}%`,
                    top: -4,
                    width: 14,
                    height: 14,
                    bgcolor: 'primary.main',
                    border: '2px solid #fff',
                    boxShadow: 1,
                    borderRadius: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1,
                  }}
                />
                <Box sx={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 6, bgcolor: 'primary.light', borderRadius: 2, opacity: 0.2 }} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="caption">0th</Typography>
                <Typography variant="caption">100th</Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No percentile can be calculated for the current selection.
              </Typography>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
};

// Utility function for percentile calculation (copied from SurveyAnalytics)
const calculatePercentile = (numbers: number[], percentile: number): number => {
  if (numbers.length === 0) return 0;
  const sortedNumbers = numbers.sort((a, b) => a - b);
  const index = Math.floor((percentile / 100) * sortedNumbers.length);
  return sortedNumbers[index] || 0;
};

const FMVCalculator: React.FC = () => {
  // Filters
  const [filters, setFilters] = useState({
    specialty: '',
    providerType: '',
    region: '',
    surveySource: '',
    year: '',
    fte: 1.0,
  });

  // Compensation components
  const [compComponents, setCompComponents] = useState([
    { type: 'Base Salary', amount: '', notes: '' }
  ]);
  const tcc = compComponents.reduce((sum, c) => sum + Number(c.amount || 0), 0);

  // Productivity
  const [wrvus, setWRVUs] = useState('');
  const [cf, setCF] = useState('');

  // Compare type
  const [compareType, setCompareType] = useState<'TCC' | 'wRVUs' | 'CFs'>('TCC');

  // Market data and percentiles
  const [marketData, setMarketData] = useState<any | null>(null);
  const [percentiles, setPercentiles] = useState<{ tcc: number | null; wrvu: number | null; cf: number | null }>({ tcc: null, wrvu: null, cf: null });

  // Fetch unique filter values from survey data and mappings
  const [uniqueValues, setUniqueValues] = useState<{
    specialties: string[];
    providerTypes: string[];
    regions: string[];
    surveySources: string[];
    years: string[];
  }>({
    specialties: [],
    providerTypes: [],
    regions: [],
    surveySources: [],
    years: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUniqueValues = async () => {
      const storageService = new LocalStorageService();
      const mappingService = new SpecialtyMappingService(storageService);
      const allMappings = await mappingService.getAllMappings();
      const uploadedSurveys = await storageService.listSurveys();
      const yearsSet = new Set<string>();
      const values = {
        specialties: new Set<string>(),
        providerTypes: new Set<string>(),
        regions: new Set<string>(),
        surveySources: new Set<string>()
      };
      allMappings.forEach(mapping => {
        if (mapping.standardizedName) values.specialties.add(mapping.standardizedName);
      });
      for (const survey of uploadedSurveys) {
        // Prefer columnMappings.surveyYear if present, else fallback
        let year = '';
        if (survey.metadata && survey.metadata.columnMappings && survey.metadata.columnMappings.surveyYear) {
          year = String(survey.metadata.columnMappings.surveyYear);
        } else if (survey.metadata && survey.metadata.surveyYear) {
          year = String(survey.metadata.surveyYear);
        }
        if (year) {
          yearsSet.add(year);
        }
        if (survey.metadata.uniqueProviderTypes) {
          survey.metadata.uniqueProviderTypes.forEach((pt: string) => values.providerTypes.add(pt));
        }
        if (survey.metadata.uniqueRegions) {
          survey.metadata.uniqueRegions.forEach((r: string) => values.regions.add(r));
        }
        if (survey.metadata.surveyType) values.surveySources.add(survey.metadata.surveyType);
      }
      console.log('Uploaded surveys:', uploadedSurveys);
      console.log('Extracted years for dropdown:', Array.from(yearsSet));
      setUniqueValues({
        specialties: Array.from(values.specialties).sort(),
        providerTypes: Array.from(values.providerTypes).sort(),
        regions: Array.from(values.regions).sort(),
        surveySources: Array.from(values.surveySources).sort(),
        years: Array.from(yearsSet).sort((a, b) => Number(b) - Number(a))
      });
    };
    fetchUniqueValues();
  }, []);

  // Data integration and percentile calculation
  const fetchMarketData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const storageService = new LocalStorageService();
      const mappingService = new SpecialtyMappingService(storageService);
      const allMappings = await mappingService.getAllMappings();
      const uploadedSurveys = await storageService.listSurveys();
      let allRows: any[] = [];
      for (const survey of uploadedSurveys) {
        const data = await storageService.getSurveyData(survey.id);
        if (data && data.rows) {
          allRows = allRows.concat(data.rows.map(row => ({
            ...row,
            surveySource: survey.metadata.surveyType,
            specialty: row.specialty || row.normalizedSpecialty || '',
            providerType: row.providerType || '',
            geographicRegion: row.geographicRegion || '',
            year: survey.metadata.surveyYear || '',
            tcc_p25: Number(row.tcc_p25) || 0,
            tcc_p50: Number(row.tcc_p50) || 0,
            tcc_p75: Number(row.tcc_p75) || 0,
            tcc_p90: Number(row.tcc_p90) || 0,
            wrvu_p25: Number(row.wrvu_p25) || 0,
            wrvu_p50: Number(row.wrvu_p50) || 0,
            wrvu_p75: Number(row.wrvu_p75) || 0,
            wrvu_p90: Number(row.wrvu_p90) || 0,
            cf_p25: Number(row.cf_p25) || 0,
            cf_p50: Number(row.cf_p50) || 0,
            cf_p75: Number(row.cf_p75) || 0,
            cf_p90: Number(row.cf_p90) || 0,
          })));
        }
      }
      // Filter rows based on user filters
      let filteredRows = allRows;
      if (filters.specialty) filteredRows = filteredRows.filter(r => r.specialty === filters.specialty);
      if (filters.providerType) filteredRows = filteredRows.filter(r => r.providerType === filters.providerType);
      if (filters.region) filteredRows = filteredRows.filter(r => r.geographicRegion === filters.region);
      if (filters.surveySource) filteredRows = filteredRows.filter(r => r.surveySource === filters.surveySource);
      if (filters.year) filteredRows = filteredRows.filter(r => String(r.year) === String(filters.year));
      // Aggregate percentiles for TCC, wRVUs, CF
      const tccs = filteredRows.flatMap(r => [r.tcc_p25, r.tcc_p50, r.tcc_p75, r.tcc_p90].filter(Boolean));
      const wrvus = filteredRows.flatMap(r => [r.wrvu_p25, r.wrvu_p50, r.wrvu_p75, r.wrvu_p90].filter(Boolean));
      const cfs = filteredRows.flatMap(r => [r.cf_p25, r.cf_p50, r.cf_p75, r.cf_p90].filter(Boolean));
      const marketData = {
        tcc: {
          p25: calculatePercentile(tccs, 25),
          p50: calculatePercentile(tccs, 50),
          p75: calculatePercentile(tccs, 75),
          p90: calculatePercentile(tccs, 90),
        },
        wrvu: {
          p25: calculatePercentile(wrvus, 25),
          p50: calculatePercentile(wrvus, 50),
          p75: calculatePercentile(wrvus, 75),
          p90: calculatePercentile(wrvus, 90),
        },
        cf: {
          p25: calculatePercentile(cfs, 25),
          p50: calculatePercentile(cfs, 50),
          p75: calculatePercentile(cfs, 75),
          p90: calculatePercentile(cfs, 90),
        },
      };
      // Calculate user value percentile using linear interpolation
      const getPercentileRank = (percentileObj: any, value: number) => {
        if (!percentileObj) return null;
        const points = [
          { p: 25, v: percentileObj.p25 },
          { p: 50, v: percentileObj.p50 },
          { p: 75, v: percentileObj.p75 },
          { p: 90, v: percentileObj.p90 },
        ];
        // Below 25th
        if (value <= points[0].v) return 0;
        // Above 90th
        if (value >= points[3].v) return 100;
        // Interpolate between points
        for (let i = 0; i < points.length - 1; i++) {
          if (value >= points[i].v && value < points[i + 1].v) {
            const { p: p1, v: v1 } = points[i];
            const { p: p2, v: v2 } = points[i + 1];
            const percent = p1 + ((value - v1) / (v2 - v1)) * (p2 - p1);
            return percent;
          }
        }
        return null;
      };
      const tccValue = tcc;
      const wrvuValue = Number(wrvus);
      const cfValue = Number(cf);
      const percentiles = {
        tcc: getPercentileRank(marketData?.tcc, tccValue),
        wrvu: getPercentileRank(marketData?.wrvu, wrvuValue),
        cf: getPercentileRank(marketData?.cf, cfValue),
      };
      setMarketData(() => marketData);
      setPercentiles(() => percentiles);
    } catch (err) {
      setError('Failed to load market data');
    } finally {
      setLoading(false);
    }
  }, [filters, tcc, wrvus, cf]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Adjust TCC and wRVUs for FTE in percentile calculation
  const tccFTEAdjusted = filters.fte ? Number(tcc) / filters.fte : Number(tcc);
  const wrvusFTEAdjusted = filters.fte ? Number(wrvus) / filters.fte : Number(wrvus);

  return (
    <Box sx={{ pl: 4, pr: 2, pt: 4 }}>
      <Card sx={{ p: 2.5, width: '100%', maxWidth: 1400, boxShadow: 2, background: '#fff' }}>
        <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
          Make your selections below to filter market data
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <FilterBar filters={filters} setFilters={setFilters} uniqueValues={uniqueValues} />
        <CompareTypeSelector compareType={compareType} setCompareType={setCompareType} />
        {compareType === 'TCC' && (
          <TCCItemization components={compComponents} setComponents={setCompComponents} />
        )}
        {compareType === 'wRVUs' && <WRVUsInput value={wrvus} onChange={setWRVUs} fte={filters.fte} />}
        {compareType === 'CFs' && <CFInput value={cf} onChange={setCF} fte={filters.fte} />}
        <ResultsPanel 
          compareType={compareType}
          marketData={marketData}
          percentiles={percentiles}
          inputValue={compareType === 'TCC' ? tccFTEAdjusted : compareType === 'wRVUs' ? wrvusFTEAdjusted : Number(cf)}
          rawValue={compareType === 'TCC' ? Number(tcc) : compareType === 'wRVUs' ? Number(wrvus) : Number(cf)}
          fte={filters.fte}
          onResetFilters={() => setFilters({ ...filters, specialty: '', providerType: '', region: '', surveySource: '', year: '' })}
        />
      </Card>
    </Box>
  );
};

export default FMVCalculator; 