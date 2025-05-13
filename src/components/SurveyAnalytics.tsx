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
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { SpecialtyMappingService } from '../services/SpecialtyMappingService';
import { IStorageService, LocalStorageService } from '../services/StorageService';
import { ISurveyRow } from '../types/survey';
import { ISpecialtyMapping, ISourceSpecialty } from '../types/specialty';

interface AggregatedData {
  standardizedName: string;
  surveySource: string;
  surveySpecialty: string;
  geographicRegion: string;
  n_orgs: number;
  n_incumbents: number;
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
}

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

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Add utility function for calculating weighted average
const calculateWeightedAverage = (values: number[], weights: number[]): number => {
  if (values.length === 0 || values.length !== weights.length) return 0;
  const sum = weights.reduce((acc, weight, index) => acc + weight * values[index], 0);
  const weightSum = weights.reduce((acc, weight) => acc + weight, 0);
  return weightSum === 0 ? 0 : sum / weightSum;
};

// Add utility function for calculating simple average
const calculateAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((acc, val) => acc + val, 0) / values.length;
};

const SurveyAnalytics: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mappings, setMappings] = useState<ISpecialtyMapping[]>([]);
  const [surveys, setSurveys] = useState<Record<string, ISurveyRow[]>>({});
  const [filters, setFilters] = useState({
    specialty: '',
    providerType: '',
    region: '',
    surveySource: ''
  });

  const mappingService = useMemo(() => new SpecialtyMappingService(new LocalStorageService()), []);
  const storageService = useMemo(() => new LocalStorageService(), []);

  // Get unique values for filters
  const uniqueValues = useMemo(() => {
    const values = {
      specialties: new Set<string>(),
      providerTypes: new Set<string>(),
      regions: new Set<string>(),
      surveySources: new Set<string>()
    };

    // Get all standardized names from mappings
    mappings.forEach(mapping => {
      if (mapping.standardizedName) {
        values.specialties.add(mapping.standardizedName);
        console.log('Added specialty:', mapping.standardizedName);
      }
    });

    // Get provider types, regions, and survey sources from survey data
    Object.values(surveys).forEach(surveyRows => {
      surveyRows.forEach(row => {
        if (row.providerType) values.providerTypes.add(String(row.providerType));
        if (row.geographicRegion) values.regions.add(String(row.geographicRegion));
        if (row.surveySource) values.surveySources.add(String(row.surveySource));
      });
    });

    console.log('Total specialties found:', values.specialties.size);
    console.log('All specialties:', Array.from(values.specialties));

    return {
      specialties: Array.from(values.specialties).sort(),
      providerTypes: Array.from(values.providerTypes).sort(),
      regions: Array.from(values.regions).sort(),
      surveySources: Array.from(values.surveySources).sort()
    };
  }, [mappings, surveys]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // First get all mappings directly
        const allMappings = await mappingService.getAllMappings();
        console.log('Loaded mappings:', allMappings.length, 'mappings found');
        
        setMappings(allMappings);

        // Then get survey data
        const uploadedSurveys = await storageService.listSurveys();
        console.log('Found surveys:', uploadedSurveys.map(s => ({
          id: s.id,
          type: s.metadata.surveyType,
          totalRows: s.metadata.totalRows
        })));
        
        const surveyData: Record<string, ISurveyRow[]> = {};
        
        for (const survey of uploadedSurveys) {
          try {
            console.log(`Loading data for survey ${survey.id} (${survey.metadata.surveyType})`);
            const data = await storageService.getSurveyData(survey.id);
            if (data && data.rows) {
              // Log the column names from the first row
              if (data.rows.length > 0) {
                console.log('Available columns:', Object.keys(data.rows[0]));
              }

              surveyData[survey.id] = data.rows.map(row => {
                // Ensure all required fields are present and properly typed
                const processedRow = {
                  ...row,
                  surveySource: survey.metadata.surveyType,
                  specialty: row.specialty || row.normalizedSpecialty || '',
                  providerType: row.providerType || '',
                  geographicRegion: row.geographicRegion || '',
                  n_orgs: Number(row.n_orgs) || 0,
                  n_incumbents: Number(row.n_incumbents) || 0,
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
                };

                // Log the first row of each survey to verify data
                if (data.rows.indexOf(row) === 0) {
                  console.log('Sample processed row:', {
                    surveySource: processedRow.surveySource,
                    specialty: processedRow.specialty,
                    providerType: processedRow.providerType,
                    metrics: {
                      tcc: { p25: processedRow.tcc_p25, p50: processedRow.tcc_p50, p75: processedRow.tcc_p75, p90: processedRow.tcc_p90 },
                      wrvu: { p25: processedRow.wrvu_p25, p50: processedRow.wrvu_p50, p75: processedRow.wrvu_p75, p90: processedRow.wrvu_p90 },
                      cf: { p25: processedRow.cf_p25, p50: processedRow.cf_p50, p75: processedRow.cf_p75, p90: processedRow.cf_p90 }
                    }
                  });
                }

                return processedRow;
              });
            }
          } catch (error) {
            console.error(`Error processing survey ${survey.id}:`, error);
          }
        }

        console.log('Total surveys loaded:', Object.keys(surveyData).length);
        Object.entries(surveyData).forEach(([id, rows]) => {
          console.log(`Survey ${id}:`, {
            rowCount: rows.length,
            specialties: Array.from(new Set(rows.map(r => r.specialty))),
            hasData: rows.some(r => r.tcc_p50 > 0 || r.wrvu_p50 > 0)
          });
        });

        setSurveys(surveyData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [mappingService, storageService]);

  const aggregatedData = useMemo(() => {
    if (!filters.specialty) return [];

    // Find the selected mapping
    const selectedMapping = mappings.find(
      m => m.standardizedName === filters.specialty
    );
    if (!selectedMapping) return [];

    console.log('Selected mapping:', selectedMapping);
    console.log('Available surveys:', Object.keys(surveys));
    console.log('First survey data sample:', Object.values(surveys)[0]?.[0]);
    
    // For each mapped survey specialty, create a row
    const rows: AggregatedData[] = [];

    selectedMapping.sourceSpecialties.forEach(sourceSpec => {
      // Find all matching rows from surveys
      const matchingRows: ISurveyRow[] = [];
      
      // Look through all surveys
      Object.entries(surveys).forEach(([surveyId, surveyRows]) => {
        if (!surveyRows || !surveyRows.length) {
          console.log(`No data found for survey ${surveyId}`);
          return;
        }

        // Check if this survey matches the source
        const surveySource = surveyRows[0]?.surveySource;
        if (surveySource !== sourceSpec.surveySource) {
          console.log(`Survey ${surveyId} source ${surveySource} doesn't match ${sourceSpec.surveySource}`);
          return;
        }
        
        console.log(`Checking survey ${surveyId} for specialty "${sourceSpec.specialty}" from "${sourceSpec.surveySource}"`);
        console.log('Sample row from survey:', surveyRows[0]);
        
        // Filter rows that match this source specialty
        const filtered = surveyRows.filter(row => {
          if (!row) return false;
          
          const rowSpecialty = String(row.specialty || '').toLowerCase().trim();
          const sourceSpecialty = sourceSpec.specialty.toLowerCase().trim();
          
          // Exact match on specialty and source
          const specialtyMatch = rowSpecialty === sourceSpecialty;
          const sourceMatch = row.surveySource === sourceSpec.surveySource;
          const providerTypeMatch = !filters.providerType || 
            String(row.providerType || '').toLowerCase().trim() === filters.providerType.toLowerCase().trim();
          const regionMatch = !filters.region || 
            String(row.geographicRegion || '').toLowerCase().trim() === filters.region.toLowerCase().trim();
          
          const matches = specialtyMatch && sourceMatch && providerTypeMatch && regionMatch;
          if (matches) {
            console.log('Found matching row:', {
              rowSpecialty,
              sourceSpecialty,
              surveySource: row.surveySource,
              providerType: row.providerType,
              region: row.geographicRegion,
              metrics: {
                tcc: { p25: row.tcc_p25, p50: row.tcc_p50, p75: row.tcc_p75, p90: row.tcc_p90 },
                wrvu: { p25: row.wrvu_p25, p50: row.wrvu_p50, p75: row.wrvu_p75, p90: row.wrvu_p90 },
                cf: { p25: row.cf_p25, p50: row.cf_p50, p75: row.cf_p75, p90: row.cf_p90 }
              }
            });
          }
          
          return matches;
        });

        if (filtered.length > 0) {
          console.log(`Found ${filtered.length} matching rows in survey ${surveyId} for specialty "${sourceSpec.specialty}"`);
          matchingRows.push(...filtered);
        }
      });

      if (matchingRows.length > 0) {
        console.log(`Processing ${matchingRows.length} matching rows for ${sourceSpec.specialty} from ${sourceSpec.surveySource}`);
        
        // For each unique combination of provider type and region, create a row
        const groupedRows = new Map<string, ISurveyRow[]>();
        matchingRows.forEach(row => {
          const key = `${row.providerType || ''}-${row.geographicRegion || ''}`;
          if (!groupedRows.has(key)) {
            groupedRows.set(key, []);
          }
          groupedRows.get(key)?.push(row);
        });

        // Create aggregated rows for each group
        groupedRows.forEach((groupRows, key) => {
          // Use the first row as base for metadata
          const row = groupRows[0];
          
          // Calculate metrics including averages
          const metrics = {
            n_orgs: groupRows.reduce((sum, r) => sum + (Number(r.n_orgs) || 0), 0),
            n_incumbents: groupRows.reduce((sum, r) => sum + (Number(r.n_incumbents) || 0), 0),
            // Simple averages
            tcc_avg: calculateAverage([
              ...groupRows.map(r => Number(r.tcc_p25) || 0),
              ...groupRows.map(r => Number(r.tcc_p50) || 0),
              ...groupRows.map(r => Number(r.tcc_p75) || 0),
              ...groupRows.map(r => Number(r.tcc_p90) || 0)
            ].filter(Boolean)),
            wrvu_avg: calculateAverage([
              ...groupRows.map(r => Number(r.wrvu_p25) || 0),
              ...groupRows.map(r => Number(r.wrvu_p50) || 0),
              ...groupRows.map(r => Number(r.wrvu_p75) || 0),
              ...groupRows.map(r => Number(r.wrvu_p90) || 0)
            ].filter(Boolean)),
            cf_avg: calculateAverage([
              ...groupRows.map(r => Number(r.cf_p25) || 0),
              ...groupRows.map(r => Number(r.cf_p50) || 0),
              ...groupRows.map(r => Number(r.cf_p75) || 0),
              ...groupRows.map(r => Number(r.cf_p90) || 0)
            ].filter(Boolean)),
            // Weighted averages
            tcc_weighted_avg: calculateWeightedAverage(
              groupRows.map(r => (Number(r.tcc_p50) || 0)),
              groupRows.map(r => (Number(r.n_incumbents) || 0))
            ),
            wrvu_weighted_avg: calculateWeightedAverage(
              groupRows.map(r => (Number(r.wrvu_p50) || 0)),
              groupRows.map(r => (Number(r.n_incumbents) || 0))
            ),
            cf_weighted_avg: calculateWeightedAverage(
              groupRows.map(r => (Number(r.cf_p50) || 0)),
              groupRows.map(r => (Number(r.n_incumbents) || 0))
            ),
            // Percentiles
            tcc_p25: calculatePercentile(groupRows.map(r => Number(r.tcc_p25) || 0).filter(Boolean), 25),
            tcc_p50: calculatePercentile(groupRows.map(r => Number(r.tcc_p50) || 0).filter(Boolean), 50),
            tcc_p75: calculatePercentile(groupRows.map(r => Number(r.tcc_p75) || 0).filter(Boolean), 75),
            tcc_p90: calculatePercentile(groupRows.map(r => Number(r.tcc_p90) || 0).filter(Boolean), 90),
            wrvu_p25: calculatePercentile(groupRows.map(r => Number(r.wrvu_p25) || 0).filter(Boolean), 25),
            wrvu_p50: calculatePercentile(groupRows.map(r => Number(r.wrvu_p50) || 0).filter(Boolean), 50),
            wrvu_p75: calculatePercentile(groupRows.map(r => Number(r.wrvu_p75) || 0).filter(Boolean), 75),
            wrvu_p90: calculatePercentile(groupRows.map(r => Number(r.wrvu_p90) || 0).filter(Boolean), 90),
            cf_p25: calculatePercentile(groupRows.map(r => Number(r.cf_p25) || 0).filter(Boolean), 25),
            cf_p50: calculatePercentile(groupRows.map(r => Number(r.cf_p50) || 0).filter(Boolean), 50),
            cf_p75: calculatePercentile(groupRows.map(r => Number(r.cf_p75) || 0).filter(Boolean), 75),
            cf_p90: calculatePercentile(groupRows.map(r => Number(r.cf_p90) || 0).filter(Boolean), 90),
          };

          rows.push({
            standardizedName: selectedMapping.standardizedName,
            surveySource: sourceSpec.surveySource,
            surveySpecialty: sourceSpec.specialty,
            geographicRegion: row.geographicRegion || '',
            ...metrics
          });
        });
      } else {
        console.log(`No matching rows found for ${sourceSpec.specialty} from ${sourceSpec.surveySource}`);
      }
    });

    console.log('Generated rows:', rows);
    return rows;
  }, [filters, mappings, surveys]);

  // Filter the data
  const filteredData = useMemo(() => {
    console.log('Filtering data with:', filters);
    console.log('Available aggregated data:', aggregatedData);
    
    return aggregatedData.filter(row => {
      const matchesSpecialty = !filters.specialty || row.standardizedName.toLowerCase().includes(filters.specialty.toLowerCase());
      const matchesSurveySource = !filters.surveySource || row.surveySource.toLowerCase().includes(filters.surveySource.toLowerCase());
      const matchesProviderType = !filters.providerType || (
        Object.values(surveys).some(surveyRows =>
          surveyRows.some(s =>
            s.specialty === row.surveySpecialty &&
            s.surveySource === row.surveySource &&
            s.providerType?.toLowerCase().includes(filters.providerType.toLowerCase())
          )
        )
      );
      const matchesRegion = !filters.region || (
        Object.values(surveys).some(surveyRows =>
          surveyRows.some(s =>
            s.specialty === row.surveySpecialty &&
            s.surveySource === row.surveySource &&
            s.geographicRegion?.toLowerCase().includes(filters.region.toLowerCase())
          )
        )
      );

      return matchesSpecialty && matchesSurveySource && matchesProviderType && matchesRegion;
    });
  }, [aggregatedData, filters, surveys]);

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Add function to group data by standardized specialty
  const groupBySpecialty = (data: AggregatedData[]): Record<string, AggregatedData[]> => {
    return data.reduce((acc, row) => {
      if (!acc[row.standardizedName]) {
        acc[row.standardizedName] = [];
      }
      acc[row.standardizedName].push(row);
      return acc;
    }, {} as Record<string, AggregatedData[]>);
  };

  // Add function to calculate summary rows
  const calculateSummaryRows = (rows: AggregatedData[]): { simple: AggregatedData, weighted: AggregatedData } => {
    const totalIncumbents = rows.reduce((sum, row) => sum + row.n_incumbents, 0);
    
    const simple: AggregatedData = {
      standardizedName: 'Simple Avg',
      surveySource: '',
      surveySpecialty: '',
      geographicRegion: '',
      n_orgs: 0,
      n_incumbents: 0,
      tcc_p25: calculateAverage(rows.map(r => r.tcc_p25)),
      tcc_p50: calculateAverage(rows.map(r => r.tcc_p50)),
      tcc_p75: calculateAverage(rows.map(r => r.tcc_p75)),
      tcc_p90: calculateAverage(rows.map(r => r.tcc_p90)),
      wrvu_p25: calculateAverage(rows.map(r => r.wrvu_p25)),
      wrvu_p50: calculateAverage(rows.map(r => r.wrvu_p50)),
      wrvu_p75: calculateAverage(rows.map(r => r.wrvu_p75)),
      wrvu_p90: calculateAverage(rows.map(r => r.wrvu_p90)),
      cf_p25: calculateAverage(rows.map(r => r.cf_p25)),
      cf_p50: calculateAverage(rows.map(r => r.cf_p50)),
      cf_p75: calculateAverage(rows.map(r => r.cf_p75)),
      cf_p90: calculateAverage(rows.map(r => r.cf_p90))
    };

    const weighted: AggregatedData = {
      standardizedName: 'Weighted Avg',
      surveySource: '',
      surveySpecialty: '',
      geographicRegion: '',
      n_orgs: 0,
      n_incumbents: totalIncumbents,
      tcc_p25: calculateWeightedAverage(rows.map(r => r.tcc_p25), rows.map(r => r.n_incumbents)),
      tcc_p50: calculateWeightedAverage(rows.map(r => r.tcc_p50), rows.map(r => r.n_incumbents)),
      tcc_p75: calculateWeightedAverage(rows.map(r => r.tcc_p75), rows.map(r => r.n_incumbents)),
      tcc_p90: calculateWeightedAverage(rows.map(r => r.tcc_p90), rows.map(r => r.n_incumbents)),
      wrvu_p25: calculateWeightedAverage(rows.map(r => r.wrvu_p25), rows.map(r => r.n_incumbents)),
      wrvu_p50: calculateWeightedAverage(rows.map(r => r.wrvu_p50), rows.map(r => r.n_incumbents)),
      wrvu_p75: calculateWeightedAverage(rows.map(r => r.wrvu_p75), rows.map(r => r.n_incumbents)),
      wrvu_p90: calculateWeightedAverage(rows.map(r => r.wrvu_p90), rows.map(r => r.n_incumbents)),
      cf_p25: calculateWeightedAverage(rows.map(r => r.cf_p25), rows.map(r => r.n_incumbents)),
      cf_p50: calculateWeightedAverage(rows.map(r => r.cf_p50), rows.map(r => r.n_incumbents)),
      cf_p75: calculateWeightedAverage(rows.map(r => r.cf_p75), rows.map(r => r.n_incumbents)),
      cf_p90: calculateWeightedAverage(rows.map(r => r.cf_p90), rows.map(r => r.n_incumbents))
    };

    return { simple, weighted };
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        mb: 3,
        '& .MuiFormControl-root': {
          backgroundColor: 'white',
          borderRadius: 1,
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'white'
          }
        }
      }}>
        <FormControl fullWidth>
          <InputLabel id="specialty-label">Specialty</InputLabel>
          <Select
            labelId="specialty-label"
            value={filters.specialty}
            label="Specialty"
            onChange={(e) => handleFilterChange('specialty', e.target.value)}
          >
            <MenuItem value="">All Specialties</MenuItem>
            {uniqueValues.specialties.map((specialty) => (
              <MenuItem key={specialty} value={specialty}>
                {specialty}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="survey-source-label">Survey Source</InputLabel>
          <Select
            labelId="survey-source-label"
            value={filters.surveySource}
            label="Survey Source"
            onChange={(e) => handleFilterChange('surveySource', e.target.value)}
          >
            <MenuItem value="">All Sources</MenuItem>
            {uniqueValues.surveySources.map((source) => (
              <MenuItem key={source} value={source}>
                {source}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="provider-type-label">Provider Type</InputLabel>
          <Select
            labelId="provider-type-label"
            value={filters.providerType}
            label="Provider Type"
            onChange={(e) => handleFilterChange('providerType', e.target.value)}
          >
            <MenuItem value="">All Types</MenuItem>
            {uniqueValues.providerTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="region-label">Region</InputLabel>
          <Select
            labelId="region-label"
            value={filters.region}
            label="Region"
            onChange={(e) => handleFilterChange('region', e.target.value)}
          >
            <MenuItem value="">All Regions</MenuItem>
            {uniqueValues.regions.map((region) => (
              <MenuItem key={region} value={region}>
                {region}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: 'auto', mt: 2 }}>
        <Table size="small" sx={{ minWidth: 1400 }}>
          <TableHead>
            <TableRow>
              <TableCell colSpan={5} sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                Survey Information
              </TableCell>
              <TableCell colSpan={4} align="center" sx={{ backgroundColor: '#e3f2fd', fontWeight: 'bold', borderLeft: '2px solid #ccc' }}>
                Total Cash Compensation (TCC)
              </TableCell>
              <TableCell colSpan={4} align="center" sx={{ backgroundColor: '#e8f5e9', fontWeight: 'bold', borderLeft: '2px solid #ccc' }}>
                Work RVUs (wRVU)
              </TableCell>
              <TableCell colSpan={4} align="center" sx={{ backgroundColor: '#fff3e0', fontWeight: 'bold', borderLeft: '2px solid #ccc' }}>
                Conversion Factor (CF)
              </TableCell>
            </TableRow>
            <TableRow>
              {/* Survey Info Headers */}
              <TableCell sx={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>Survey Source</TableCell>
              <TableCell sx={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>Survey Specialty</TableCell>
              <TableCell sx={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>Region</TableCell>
              <TableCell sx={{ backgroundColor: '#fafafa', fontWeight: 'bold' }} align="right"># Orgs</TableCell>
              <TableCell sx={{ backgroundColor: '#fafafa', fontWeight: 'bold' }} align="right"># Incumbents</TableCell>
              
              {/* TCC Headers */}
              <TableCell sx={{ backgroundColor: '#e3f2fd', borderLeft: '2px solid #ccc' }} align="right">P25</TableCell>
              <TableCell sx={{ backgroundColor: '#e3f2fd' }} align="right">P50</TableCell>
              <TableCell sx={{ backgroundColor: '#e3f2fd' }} align="right">P75</TableCell>
              <TableCell sx={{ backgroundColor: '#e3f2fd' }} align="right">P90</TableCell>
              
              {/* wRVU Headers */}
              <TableCell sx={{ backgroundColor: '#e8f5e9', borderLeft: '2px solid #ccc' }} align="right">P25</TableCell>
              <TableCell sx={{ backgroundColor: '#e8f5e9' }} align="right">P50</TableCell>
              <TableCell sx={{ backgroundColor: '#e8f5e9' }} align="right">P75</TableCell>
              <TableCell sx={{ backgroundColor: '#e8f5e9' }} align="right">P90</TableCell>
              
              {/* CF Headers */}
              <TableCell sx={{ backgroundColor: '#fff3e0', borderLeft: '2px solid #ccc' }} align="right">P25</TableCell>
              <TableCell sx={{ backgroundColor: '#fff3e0' }} align="right">P50</TableCell>
              <TableCell sx={{ backgroundColor: '#fff3e0' }} align="right">P75</TableCell>
              <TableCell sx={{ backgroundColor: '#fff3e0' }} align="right">P90</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={17} align="center">
                  No data available for the selected filters
                </TableCell>
              </TableRow>
            ) : (
              Object.entries(groupBySpecialty(filteredData)).map(([specialty, rows]) => (
                <React.Fragment key={specialty}>
                  {rows.map((row, idx) => (
                    <TableRow 
                      key={`${specialty}-${idx}`}
                      sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}
                    >
                      <TableCell>{row.surveySource}</TableCell>
                      <TableCell>{row.surveySpecialty}</TableCell>
                      <TableCell>{row.geographicRegion || 'N/A'}</TableCell>
                      <TableCell align="right">{row.n_orgs}</TableCell>
                      <TableCell align="right">{row.n_incumbents}</TableCell>
                      
                      {/* TCC Values */}
                      <TableCell sx={{ borderLeft: '2px solid #ccc' }} align="right">{formatCurrency(row.tcc_p25)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.tcc_p50)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.tcc_p75)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.tcc_p90)}</TableCell>
                      
                      {/* wRVU Values */}
                      <TableCell sx={{ borderLeft: '2px solid #ccc' }} align="right">{formatNumber(row.wrvu_p25)}</TableCell>
                      <TableCell align="right">{formatNumber(row.wrvu_p50)}</TableCell>
                      <TableCell align="right">{formatNumber(row.wrvu_p75)}</TableCell>
                      <TableCell align="right">{formatNumber(row.wrvu_p90)}</TableCell>
                      
                      {/* CF Values */}
                      <TableCell sx={{ borderLeft: '2px solid #ccc' }} align="right">{formatCurrency(row.cf_p25, 2)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.cf_p50, 2)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.cf_p75, 2)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.cf_p90, 2)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Summary Rows */}
                  {(() => {
                    const { simple, weighted } = calculateSummaryRows(rows);
                    return (
                      <>
                        <TableRow sx={{ 
                          backgroundColor: '#f5f5f5',
                          borderTop: '2px solid #ccc'
                        }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>Simple Average</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell align="right">{simple.n_orgs}</TableCell>
                          <TableCell align="right">{simple.n_incumbents}</TableCell>
                          
                          {/* TCC Values */}
                          <TableCell sx={{ borderLeft: '2px solid #ccc' }} align="right">{formatCurrency(simple.tcc_p25)}</TableCell>
                          <TableCell align="right">{formatCurrency(simple.tcc_p50)}</TableCell>
                          <TableCell align="right">{formatCurrency(simple.tcc_p75)}</TableCell>
                          <TableCell align="right">{formatCurrency(simple.tcc_p90)}</TableCell>
                          
                          {/* wRVU Values */}
                          <TableCell sx={{ borderLeft: '2px solid #ccc' }} align="right">{formatNumber(simple.wrvu_p25)}</TableCell>
                          <TableCell align="right">{formatNumber(simple.wrvu_p50)}</TableCell>
                          <TableCell align="right">{formatNumber(simple.wrvu_p75)}</TableCell>
                          <TableCell align="right">{formatNumber(simple.wrvu_p90)}</TableCell>
                          
                          {/* CF Values */}
                          <TableCell sx={{ borderLeft: '2px solid #ccc' }} align="right">{formatCurrency(simple.cf_p25, 2)}</TableCell>
                          <TableCell align="right">{formatCurrency(simple.cf_p50, 2)}</TableCell>
                          <TableCell align="right">{formatCurrency(simple.cf_p75, 2)}</TableCell>
                          <TableCell align="right">{formatCurrency(simple.cf_p90, 2)}</TableCell>
                        </TableRow>
                        <TableRow sx={{ 
                          backgroundColor: '#e3f2fd',
                          borderBottom: '2px solid #ccc'
                        }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>Weighted Average</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell align="right">{weighted.n_orgs}</TableCell>
                          <TableCell align="right">{weighted.n_incumbents}</TableCell>
                          
                          {/* TCC Values */}
                          <TableCell sx={{ borderLeft: '2px solid #ccc' }} align="right">{formatCurrency(weighted.tcc_p25)}</TableCell>
                          <TableCell align="right">{formatCurrency(weighted.tcc_p50)}</TableCell>
                          <TableCell align="right">{formatCurrency(weighted.tcc_p75)}</TableCell>
                          <TableCell align="right">{formatCurrency(weighted.tcc_p90)}</TableCell>
                          
                          {/* wRVU Values */}
                          <TableCell sx={{ borderLeft: '2px solid #ccc' }} align="right">{formatNumber(weighted.wrvu_p25)}</TableCell>
                          <TableCell align="right">{formatNumber(weighted.wrvu_p50)}</TableCell>
                          <TableCell align="right">{formatNumber(weighted.wrvu_p75)}</TableCell>
                          <TableCell align="right">{formatNumber(weighted.wrvu_p90)}</TableCell>
                          
                          {/* CF Values */}
                          <TableCell sx={{ borderLeft: '2px solid #ccc' }} align="right">{formatCurrency(weighted.cf_p25, 2)}</TableCell>
                          <TableCell align="right">{formatCurrency(weighted.cf_p50, 2)}</TableCell>
                          <TableCell align="right">{formatCurrency(weighted.cf_p75, 2)}</TableCell>
                          <TableCell align="right">{formatCurrency(weighted.cf_p90, 2)}</TableCell>
                        </TableRow>
                      </>
                    );
                  })()}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SurveyAnalytics; 