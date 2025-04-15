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

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const SurveyAnalytics: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mappings, setMappings] = useState<ISpecialtyMapping[]>([]);
  const [surveys, setSurveys] = useState<Record<string, ISurveyRow[]>>({});
  const [filters, setFilters] = useState({
    specialty: '',
    providerType: '',
    region: ''
  });

  const mappingService = useMemo(() => new SpecialtyMappingService(new LocalStorageService()), []);
  const storageService = useMemo(() => new LocalStorageService(), []);

  // Get unique values for filters
  const uniqueValues = useMemo(() => {
    const values = {
      specialties: new Set<string>(),
      providerTypes: new Set<string>(),
      regions: new Set<string>()
    };

    // Get all standardized names from mappings
    mappings.forEach(mapping => {
      if (mapping.standardizedName) {
        values.specialties.add(mapping.standardizedName);
        console.log('Added specialty:', mapping.standardizedName);
      }
    });

    // Get provider types and regions from survey data
    Object.values(surveys).forEach(surveyRows => {
      surveyRows.forEach(row => {
        if (row.providerType) values.providerTypes.add(String(row.providerType));
        if (row.geographicRegion) values.regions.add(String(row.geographicRegion));
      });
    });

    console.log('Total specialties found:', values.specialties.size);
    console.log('All specialties:', Array.from(values.specialties));

    return {
      specialties: Array.from(values.specialties).sort(),
      providerTypes: Array.from(values.providerTypes).sort(),
      regions: Array.from(values.regions).sort()
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
          
          // Calculate aggregated metrics
          const metrics = {
            n_orgs: groupRows.reduce((sum, r) => sum + (Number(r.n_orgs) || 0), 0),
            n_incumbents: groupRows.reduce((sum, r) => sum + (Number(r.n_incumbents) || 0), 0),
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
      console.log('Checking specialty match for:', row.standardizedName, matchesSpecialty);
      
      // Filter based on the survey source and specialty directly
      const matchesProviderType = !filters.providerType || (
        Object.values(surveys).some(surveyRows =>
          surveyRows.some(s =>
            s.specialty === row.surveySpecialty &&
            s.surveySource === row.surveySource &&
            s.providerType?.toLowerCase().includes(filters.providerType.toLowerCase())
          )
        )
      );
      console.log('Provider type match:', matchesProviderType);

      const matchesRegion = !filters.region || (
        Object.values(surveys).some(surveyRows =>
          surveyRows.some(s =>
            s.specialty === row.surveySpecialty &&
            s.surveySource === row.surveySource &&
            s.geographicRegion?.toLowerCase().includes(filters.region.toLowerCase())
          )
        )
      );
      console.log('Region match:', matchesRegion);

      const matches = matchesSpecialty && matchesProviderType && matchesRegion;
      console.log('Final match result:', matches);
      return matches;
    });
  }, [aggregatedData, filters, surveys]);

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
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
      <Typography variant="h5" gutterBottom>
        Survey Analytics Results
      </Typography>

      {/* Filter Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Specialty</InputLabel>
          <Select
            value={filters.specialty}
            onChange={(e) => handleFilterChange('specialty', e.target.value)}
            label="Specialty"
          >
            <MenuItem value="">All</MenuItem>
            {uniqueValues.specialties.map(specialty => (
              <MenuItem key={specialty} value={specialty}>{specialty}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Provider Type</InputLabel>
          <Select
            value={filters.providerType}
            onChange={(e) => handleFilterChange('providerType', e.target.value)}
            label="Provider Type"
          >
            <MenuItem value="">All</MenuItem>
            {uniqueValues.providerTypes.map(type => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Region</InputLabel>
          <Select
            value={filters.region}
            onChange={(e) => handleFilterChange('region', e.target.value)}
            label="Region"
          >
            <MenuItem value="">All</MenuItem>
            {uniqueValues.regions.map(region => (
              <MenuItem key={region} value={region}>{region}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Standardized Specialty</TableCell>
              <TableCell>Survey Source</TableCell>
              <TableCell>Survey Specialty</TableCell>
              <TableCell align="right"># Orgs</TableCell>
              <TableCell align="right"># Incumbents</TableCell>
              <TableCell align="right">TCC P25</TableCell>
              <TableCell align="right">TCC P50</TableCell>
              <TableCell align="right">TCC P75</TableCell>
              <TableCell align="right">TCC P90</TableCell>
              <TableCell align="right">wRVU P25</TableCell>
              <TableCell align="right">wRVU P50</TableCell>
              <TableCell align="right">wRVU P75</TableCell>
              <TableCell align="right">wRVU P90</TableCell>
              <TableCell align="right">CF P25</TableCell>
              <TableCell align="right">CF P50</TableCell>
              <TableCell align="right">CF P75</TableCell>
              <TableCell align="right">CF P90</TableCell>
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
              filteredData.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{row.standardizedName}</TableCell>
                  <TableCell>{row.surveySource}</TableCell>
                  <TableCell>{row.surveySpecialty}</TableCell>
                  <TableCell>{row.n_orgs}</TableCell>
                  <TableCell>{row.n_incumbents}</TableCell>
                  <TableCell>{formatCurrency(row.tcc_p25)}</TableCell>
                  <TableCell>{formatCurrency(row.tcc_p50)}</TableCell>
                  <TableCell>{formatCurrency(row.tcc_p75)}</TableCell>
                  <TableCell>{formatCurrency(row.tcc_p90)}</TableCell>
                  <TableCell>{formatNumber(row.wrvu_p25)}</TableCell>
                  <TableCell>{formatNumber(row.wrvu_p50)}</TableCell>
                  <TableCell>{formatNumber(row.wrvu_p75)}</TableCell>
                  <TableCell>{formatNumber(row.wrvu_p90)}</TableCell>
                  <TableCell>{formatNumber(row.cf_p25)}</TableCell>
                  <TableCell>{formatNumber(row.cf_p50)}</TableCell>
                  <TableCell>{formatNumber(row.cf_p75)}</TableCell>
                  <TableCell>{formatNumber(row.cf_p90)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default SurveyAnalytics; 