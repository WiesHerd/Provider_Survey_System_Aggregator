import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Typography, Divider, Grid, TextField, MenuItem, InputAdornment, Box, Paper, RadioGroup, FormControlLabel, Radio, Button, FormControl, FormHelperText } from '@mui/material';
import { LocalStorageService } from '../services/StorageService';
import { SpecialtyMappingService } from '../services/SpecialtyMappingService';
import Autocomplete from '@mui/material/Autocomplete';
import { TrashIcon } from '@heroicons/react/24/outline';

// At the top level, after LocalStorageService is imported
(window as any).LocalStorageService = LocalStorageService;

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
  <Grid container spacing={2} sx={{ mb: 3 }}>
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

// Update CompareTypeSelector for lighter border and no shadow
const CompareTypeSelector: React.FC<{ compareType: string, setCompareType: (type: 'TCC' | 'wRVUs' | 'CFs') => void }> = ({ compareType, setCompareType }) => (
  <Paper sx={{ p: 2, mb: 3, background: '#f8fafc', boxShadow: 'none', border: '1.5px solid #b0b4bb' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 600, color: 'text.primary', mb: 0, minWidth: 180 }}
        component="label"
        htmlFor="comparison-type-radio-group"
      >
        Comparison Type
      </Typography>
      <RadioGroup
        row
        id="comparison-type-radio-group"
        value={compareType}
        onChange={e => setCompareType(e.target.value as 'TCC' | 'wRVUs' | 'CFs')}
        sx={{ gap: 4 }}
      >
        <FormControlLabel value="TCC" control={<Radio />} label="Total Cash Compensation" />
        <FormControlLabel value="wRVUs" control={<Radio />} label="Work RVUs" />
        <FormControlLabel value="CFs" control={<Radio />} label="Conversion Factors" />
      </RadioGroup>
    </Box>
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
    <Paper sx={{ p: 2, mb: 3 }}>
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
            <Grid item xs={12} md={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                label="Notes"
                value={c.notes}
                onChange={e => updateComponent(idx, 'notes', e.target.value)}
                size="small"
                sx={{ flex: 1, mr: 2 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 120, justifyContent: 'flex-end' }}>
                <Button
                  onClick={() => removeComponent(idx)}
                  color="error"
                  size="small"
                  sx={{ minWidth: 0, p: 1, mr: 1 }}
                  aria-label="Remove"
                >
                  <TrashIcon className="h-5 w-5 text-gray-500" />
                </Button>
                <Typography variant="subtitle1" sx={{ whiteSpace: 'nowrap' }}>
                  {idx === components.length - 1 && `Total TCC: $${total.toLocaleString()}`}
                </Typography>
              </Box>
            </Grid>
          </React.Fragment>
        ))}
      </Grid>
    </Paper>
  );
};

// Refactor WRVUsInput for consistent vertical layout with CFInput
const WRVUsInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  fte: number;
}> = ({ value, onChange, fte }) => {
  const normalized = fte ? (Number(value) / fte) : Number(value);
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <FormControl fullWidth>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Work RVUs</Typography>
        <TextField
          label="Annual wRVUs"
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          size="small"
          InputProps={{ endAdornment: <InputAdornment position="end">wRVUs</InputAdornment> }}
          sx={{ mb: 1, width: 220 }}
        />
        <FormHelperText>
          <span style={{ fontWeight: 500, color: '#333' }}>
            FTE-adjusted: {normalized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} wRVUs
          </span>
          <br />
          <span style={{ color: '#888' }}>
            Your value will be annualized to 1.0 FTE for market comparison.
          </span>
        </FormHelperText>
      </FormControl>
    </Paper>
  );
};

// Update CFInput for lighter border and no shadow
const CFInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  fte: number;
  percentile?: number | null;
}> = ({ value, onChange }) => {
  return (
    <Paper sx={{ p: 2, mb: 2, border: '1.5px solid #b0b4bb', boxShadow: 'none' }}>
      <FormControl fullWidth>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Conversion Factor ($/wRVU)</Typography>
        <TextField
          label="Conversion Factor"
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          size="small"
          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment>, endAdornment: <InputAdornment position="end">/wRVU</InputAdornment> }}
          sx={{ mb: 1, width: 220 }}
        />
        <FormHelperText>
          Enter your conversion factor, or calculate as TCC / wRVUs.<br />
          <span style={{ color: '#888' }}>FTE does not affect this value.</span>
        </FormHelperText>
      </FormControl>
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Use explicit mapping for marketData keys
  const percentileData =
    compareType === 'wRVUs'
      ? marketData?.wrvu
      : compareType === 'TCC'
      ? marketData?.tcc
      : compareType === 'CFs'
      ? marketData?.cf
      : undefined;
  const currentPercentile =
    compareType === 'wRVUs'
      ? percentiles.wrvu
      : compareType === 'TCC'
      ? percentiles.tcc
      : compareType === 'CFs'
      ? percentiles.cf
      : null;
  // Always show cards if percentileData exists (even if values are zero)
  const noMarketData = !percentileData;

  // Debug logs
  console.log('ResultsPanel compareType:', compareType);
  console.log('ResultsPanel percentileData:', percentileData);
  console.log('ResultsPanel marketData:', marketData);
  console.log('ResultsPanel currentPercentile:', currentPercentile);

  return (
    <Paper sx={{ p: 2, mt: 3, border: '1.5px solid #b0b4bb', boxShadow: 'none' }}>
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
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {['25th', '50th', '75th', '90th'].map((percentile) => {
              const key = `p${percentile.slice(0, 2)}` as keyof typeof percentileData;
              return (
                <Grid item xs={12} sm={6} md={3} key={percentile}>
                  <Paper sx={{ p: 1.5, textAlign: 'center', background: '#f8fafc', boxShadow: 2, border: '1.5px solid #888' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {percentile} Percentile
                    </Typography>
                    <Typography variant="h6">
                      {percentileData && percentileData[key] != null
                        ? formatValue(percentileData[key])
                        : '-'}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
          {/* Blue percentile bar and marker, always show for wRVUs */}
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              {typeof currentPercentile === 'number' && !isNaN(currentPercentile) ? (
                <>
                  <Typography variant="body2" gutterBottom color="primary" sx={{ mr: 1 }}>
                    You are in the {currentPercentile.toFixed(2)}th percentile
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', bgcolor: 'grey.100', px: 1.5, py: 0.5, borderRadius: 1, ml: 1 }}>
                    Your Value: {formatValue(Number(inputValue))}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" gutterBottom color="text.secondary">
                  Enter a value to see your percentile
                </Typography>
              )}
            </Box>
            <Box sx={{ position: 'relative', height: 6, bgcolor: 'grey.200', borderRadius: 2 }}>
              <Box
                sx={{
                  position: 'absolute',
                  left: `${typeof currentPercentile === 'number' && !isNaN(currentPercentile) ? currentPercentile : 0}%`,
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
              <Box sx={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 6, bgcolor: 'primary.main', borderRadius: 2, opacity: 0.2 }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption">0th</Typography>
              <Typography variant="caption">100th</Typography>
            </Box>
          </Box>
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

const DebugSurveyData: React.FC = () => {
  useEffect(() => {
    const storageService = new LocalStorageService();
    storageService.getSurveyData('ziimyk').then(data => {
      if (data && data.rows && data.rows.length > 0) {
        console.log('First row:', data.rows[0]);
        console.log('All column names:', Object.keys(data.rows[0]));
      } else {
        console.log('No rows found for this survey.');
      }
    });
  }, []);
  return null;
};

// Utility to normalize a survey row
const normalizeSurveyRow = (row: any, surveyMeta: any, cm: any = {}) => ({
  ...row,
  providerType: row[cm.providerType || 'providerType'] || row.providerType || row.provider_type || '',
  geographicRegion: row[cm.geographicRegion || 'geographicRegion'] || row.geographicRegion || row.geographic_region || '',
  specialty: row[cm.specialty || 'specialty'] || row.specialty || row.normalizedSpecialty || '',
  normalizedSpecialty: row.normalizedSpecialty || '',
  surveySource: surveyMeta?.surveyType || '',
  year: surveyMeta?.surveyYear || '',
  tcc_p25: Number(row[cm.tcc_p25 || 'tcc_p25']) || 0,
  tcc_p50: Number(row[cm.tcc_p50 || 'tcc_p50']) || 0,
  tcc_p75: Number(row[cm.tcc_p75 || 'tcc_p75']) || 0,
  tcc_p90: Number(row[cm.tcc_p90 || 'tcc_p90']) || 0,
  wrvu_p25: Number(row[cm.wrvu_p25 || 'wrvu_p25']) || 0,
  wrvu_p50: Number(row[cm.wrvu_p50 || 'wrvu_p50']) || 0,
  wrvu_p75: Number(row[cm.wrvu_p75 || 'wrvu_p75']) || 0,
  wrvu_p90: Number(row[cm.wrvu_p90 || 'wrvu_p90']) || 0,
  cf_p25: Number(row[cm.cf_p25 || 'cf_p25']) || 0,
  cf_p50: Number(row[cm.cf_p50 || 'cf_p50']) || 0,
  cf_p75: Number(row[cm.cf_p75 || 'cf_p75']) || 0,
  cf_p90: Number(row[cm.cf_p90 || 'cf_p90']) || 0,
});

// Utility to robustly normalize strings for comparison
const normalizeString = (str: string) => (str || '').toLowerCase().replace(/\s+/g, ' ').trim();

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

  // FTE-adjusted values (move here for use in ResultsPanel)
  const tccFTEAdjusted = filters.fte ? Number(tcc) / filters.fte : Number(tcc);
  const wrvusFTEAdjusted = filters.fte ? Number(wrvus) / filters.fte : Number(wrvus);

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
      let allRows: any[] = [];
      allMappings.forEach(mapping => {
        if (mapping.standardizedName) values.specialties.add(mapping.standardizedName);
      });
      for (const survey of uploadedSurveys) {
        let year = '';
        if (survey.metadata && survey.metadata.columnMappings && survey.metadata.columnMappings.surveyYear) {
          year = String(survey.metadata.columnMappings.surveyYear);
        } else if (survey.metadata && survey.metadata.surveyYear) {
          year = String(survey.metadata.surveyYear);
        }
        if (year) yearsSet.add(year);
        if (survey.metadata.uniqueProviderTypes) {
          survey.metadata.uniqueProviderTypes.forEach((pt: string) => values.providerTypes.add(pt));
        }
        if (survey.metadata.uniqueRegions) {
          survey.metadata.uniqueRegions.forEach((r: string) => values.regions.add(r));
        }
        if (survey.metadata.surveyType) values.surveySources.add(survey.metadata.surveyType);
        const data = await storageService.getSurveyData(survey.id);
        if (data && data.rows) {
          const cm = survey.metadata?.columnMappings || {};
          const normalizedRows = data.rows.map(row => normalizeSurveyRow(row, survey.metadata, cm));
          normalizedRows.forEach((row: any) => {
            if (row.providerType) values.providerTypes.add(row.providerType);
            if (row.geographicRegion) values.regions.add(row.geographicRegion);
            // Always extract unique specialties from uploaded survey data rows to ensure the dropdown is populated,
            // even if the mapping table is empty or out of sync.
            if (row.specialty) values.specialties.add(row.specialty);
            if (row.year) yearsSet.add(String(row.year));
          });
          allRows = allRows.concat(normalizedRows);
        }
      }
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
          const cm = survey.metadata?.columnMappings || {};
          const normalizedRows = data.rows.map(row => normalizeSurveyRow(row, survey.metadata, cm));
          allRows = allRows.concat(normalizedRows);
        }
      }
      // Use mapping service for robust specialty matching
      let filteredRows = allRows;
      if (filters.specialty) {
        // Find all mapped source specialties for the selected standardized specialty
        const mapping = allMappings.find(m => normalizeString(m.standardizedName) === normalizeString(filters.specialty));
        let mappedSpecs: string[] = [];
        if (mapping) {
          mappedSpecs = mapping.sourceSpecialties.map(s => normalizeString(s.specialty));
        } else {
          mappedSpecs = [normalizeString(filters.specialty)];
        }
        filteredRows = filteredRows.filter(r => mappedSpecs.includes(normalizeString(r.specialty)));
      }
      if (filters.providerType) {
        console.log('Provider Types in data:', filteredRows.map(r => r.providerType));
        console.log('Filtering for providerType:', filters.providerType);
        filteredRows = filteredRows.filter(r => normalizeString(r.providerType) === normalizeString(filters.providerType));
      }
      if (filters.region) filteredRows = filteredRows.filter(r => normalizeString(r.geographicRegion) === normalizeString(filters.region));
      if (filters.surveySource) filteredRows = filteredRows.filter(r => normalizeString(r.surveySource) === normalizeString(filters.surveySource));
      if (filters.year) filteredRows = filteredRows.filter(r => String(r.year) === String(filters.year));
      console.log('Filtered rows:', filteredRows);
      console.log('wRVU values:', filteredRows.map(r => [r.wrvu_p25, r.wrvu_p50, r.wrvu_p75, r.wrvu_p90]));
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
        if (!percentileObj || value === null || value === undefined || isNaN(value)) return null;
        const points = [
          { p: 0, v: percentileObj.p0 ?? 0 }, // Add 0th percentile for interpolation
          { p: 25, v: percentileObj.p25 },
          { p: 50, v: percentileObj.p50 },
          { p: 75, v: percentileObj.p75 },
          { p: 90, v: percentileObj.p90 },
          { p: 100, v: percentileObj.p100 ?? percentileObj.p90 + (percentileObj.p90 - percentileObj.p75) }, // Estimate 100th if not present
        ];
        // Below 25th percentile
        if (value < points[1].v) {
          const { p: p0, v: v0 } = points[0];
          const { p: p1, v: v1 } = points[1];
          if (v1 === v0) return p0;
          return p0 + ((value - v0) / (v1 - v0)) * (p1 - p0);
        }
        // Above 90th percentile
        if (value > points[4].v) {
          const { p: p1, v: v1 } = points[4];
          const { p: p2, v: v2 } = points[5];
          if (v2 === v1) return p1;
          return p1 + ((value - v1) / (v2 - v1)) * (p2 - p1);
        }
        // Between 25th and 90th
        for (let i = 1; i < points.length - 2; i++) {
          if (value >= points[i].v && value < points[i + 1].v) {
            const { p: p1, v: v1 } = points[i];
            const { p: p2, v: v2 } = points[i + 1];
            if (v2 === v1) return p1;
            return p1 + ((value - v1) / (v2 - v1)) * (p2 - p1);
          }
        }
        return null;
      };
      // Use FTE-adjusted values for percentile calculation
      const tccValue = tccFTEAdjusted;
      const wrvuValue = wrvusFTEAdjusted;
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

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <Card sx={{
        p: 3,
        maxWidth: '90vw',
        width: '100%',
        margin: '40px auto 0 auto',
        boxShadow: 2,
        background: '#fff',
        borderRadius: 2,
        px: { xs: 2, sm: 4, md: 8 },
      }}>
        <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
          Make your selections below to filter market data
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ mb: 5 }}>
          <FilterBar filters={filters} setFilters={setFilters} uniqueValues={uniqueValues} />
        </Box>
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
    </div>
  );
};

export default FMVCalculator; 