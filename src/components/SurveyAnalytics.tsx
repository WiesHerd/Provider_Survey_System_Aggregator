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
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Autocomplete,
  TextField,
} from '@mui/material';
import { 
  DocumentTextIcon
} from '@heroicons/react/24/outline';

import { SpecialtyMappingService } from '../services/SpecialtyMappingService';
import { ColumnMappingService } from '../services/ColumnMappingService';
import { IStorageService, LocalStorageService } from '../services/StorageService';
import BackendService from '../services/BackendService';
import { ISurveyRow } from '../types/survey';
import { ISpecialtyMapping, ISourceSpecialty } from '../types/specialty';
import LoadingSpinner from './ui/loading-spinner';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { formatSpecialtyForDisplay } from '../shared/utils/formatters';
const SHOW_DEBUG = true;

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

// Fuzzy matching function for specialty names (word-based, not letter-based)
const fuzzyMatchSpecialty = (specialty1: string, specialty2: string): boolean => {
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const norm1 = normalize(specialty1);
  const norm2 = normalize(specialty2);

  if (!norm1 || !norm2) return false;

  // Exact or simple contains
  if (norm1 === norm2) return true;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  const words1 = norm1.split(/\s+/).filter(w => w.length > 2);
  const words2 = norm2.split(/\s+/).filter(w => w.length > 2);
  if (words1.length === 0 || words2.length === 0) return false;

  const common = words1.filter(w => words2.includes(w));
  const jaccard = common.length / new Set([...words1, ...words2]).size;

  return jaccard >= 0.6 || common.length >= Math.min(words1.length, words2.length) * 0.8;
};

// Data transformation function that applies column mappings and specialty mappings
const transformSurveyData = (rawData: any[], columnMappings: any[], specialtyMappings: any[], surveySource: string): any[] => {
  console.log('🔄 Transforming survey data with mappings:', {
    rawDataLength: rawData.length,
    columnMappingsCount: columnMappings.length,
    specialtyMappingsCount: specialtyMappings.length,
    surveySource
  });
  
  console.log('🔍 First few raw specialties:', rawData.slice(0, 3).map(row => row.specialty));
  
  // Special debugging for SullivanCotter raw data
  if (surveySource === 'SullivanCotter') {
    const allergyRows = rawData.filter(row => 
      row.specialty && (row.specialty.toLowerCase().includes('allergy') || row.specialty.toLowerCase().includes('immunology'))
    );
    console.log('🔍 Found', allergyRows.length, 'Allergy & Immunology rows in SullivanCotter raw data');
    if (allergyRows.length > 0) {
      console.log('📋 Sample Allergy & Immunology rows:', allergyRows.slice(0, 3).map(row => row.specialty));
    }
  }

  if (rawData.length === 0) return [];

  // Create column mapping lookup for this survey source
  const columnMappingLookup = new Map();
  columnMappings.forEach(mapping => {
    mapping.sourceColumns.forEach((column: any) => {
      if (column.surveySource === surveySource) {
        columnMappingLookup.set(column.name, mapping.standardizedName);
      }
    });
  });

  // Create specialty mapping lookup for this survey source
  const specialtyMappingLookup = new Map();
  specialtyMappings.forEach(mapping => {
    mapping.sourceSpecialties.forEach((specialty: any) => {
      if (specialty.surveySource === surveySource) {
        specialtyMappingLookup.set(specialty.specialty.toLowerCase(), mapping.standardizedName);
      }
    });
  });

  console.log('📋 Column mapping lookup for', surveySource, ':', Object.fromEntries(columnMappingLookup));
  console.log('📋 Specialty mapping lookup for', surveySource, ':', Object.fromEntries(specialtyMappingLookup));
  
  // Special debugging for SullivanCotter Allergy & Immunology
  if (surveySource === 'SullivanCotter') {
    console.log('🔍 Checking SullivanCotter specialty mappings for Allergy & Immunology...');
    const allergyMappings = Array.from(specialtyMappingLookup.entries()).filter(([key, value]) => 
      key.includes('allergy') || key.includes('immunology') || value.includes('Allergy') || value.includes('Immunology')
    );
    console.log('📋 Allergy & Immunology mappings for SullivanCotter:', allergyMappings);
  }
  
  // Debug: Show all available survey sources in mappings
  const allSurveySources = new Set();
  specialtyMappings.forEach(mapping => {
    mapping.sourceSpecialties.forEach((specialty: any) => {
      allSurveySources.add(specialty.surveySource);
    });
  });
  console.log('📋 All available survey sources in mappings:', Array.from(allSurveySources));
  console.log('🔍 Looking for survey source:', surveySource);
  


  return rawData.map(row => {
    const transformedRow: any = {
      surveySource,
      specialty: row.specialty || row.normalizedSpecialty || '',
      originalSpecialty: row.specialty || '', // Keep the original specialty name
      // Carry through non-metric identity fields from common column names
      providerType: (row as any).providerType || (row as any).provider_type || '',
      geographicRegion: (row as any).geographicRegion || (row as any).geographic_region || '',
      n_orgs: 0,
      n_incumbents: 0,
      tcc_p25: 0,
      tcc_p50: 0,
      tcc_p75: 0,
      tcc_p90: 0,
      wrvu_p25: 0,
      wrvu_p50: 0,
      wrvu_p75: 0,
      wrvu_p90: 0,
      cf_p25: 0,
      cf_p50: 0,
      cf_p75: 0,
      cf_p90: 0,
    };

    // Apply specialty mapping
    const originalSpecialty = String(row.specialty || '').toLowerCase();
    let standardizedSpecialty = specialtyMappingLookup.get(originalSpecialty);
    
    // Special debugging for Allergy & Immunology
    if (row.specialty && (row.specialty.toLowerCase().includes('allergy') || row.specialty.toLowerCase().includes('immunology'))) {
      console.log(`🔍 Processing Allergy/Immunology specialty: "${row.specialty}" (normalized: "${originalSpecialty}")`);
      console.log(`📋 Available mappings for ${surveySource}:`, Array.from(specialtyMappingLookup.entries()));
      console.log(`🔍 Looking for mapping: "${originalSpecialty}"`);
      console.log(`🔍 Found mapping: ${standardizedSpecialty || 'NOT FOUND'}`);
    }
    
    // Debug: Log all specialties being processed
    if (originalSpecialty && !standardizedSpecialty) {
      console.log(`🔍 Processing specialty: "${row.specialty}" (normalized: "${originalSpecialty}")`);
      console.log(`📋 Available mappings for ${surveySource}:`, Array.from(specialtyMappingLookup.entries()));
    }
    
    // If no direct match, try fuzzy matching
    if (!standardizedSpecialty) {
      Array.from(specialtyMappingLookup.entries()).forEach(([key, value]) => {
        if (fuzzyMatchSpecialty(originalSpecialty, key)) {
          standardizedSpecialty = value;
          console.log(`🔄 Fuzzy mapped specialty: "${row.specialty}" → "${standardizedSpecialty}" (matched "${key}")`);
        }
      });
    }
    
    if (standardizedSpecialty) {
      transformedRow.specialty = standardizedSpecialty;
      transformedRow.originalSpecialty = row.specialty || ''; // Keep original for fallback matching
      console.log(`✅ Mapped specialty: "${row.specialty}" → "${standardizedSpecialty}"`);
    } else {
      console.log(`❌ No mapping found for specialty: "${row.specialty}" (normalized: "${originalSpecialty}")`);
      console.log('📋 Available mappings for this survey source:', Array.from(specialtyMappingLookup.entries()));
      // Keep the original specialty if no mapping found
      transformedRow.specialty = row.specialty || '';
      transformedRow.originalSpecialty = row.specialty || '';
    }

    // Apply column mappings
    Object.keys(row).forEach(originalColumn => {
      const standardizedName = columnMappingLookup.get(originalColumn);
      if (standardizedName) {
        // Map the value to the standardized column name
        const value = row[originalColumn];
        
        // Handle different metric types
        if (standardizedName.toLowerCase().includes('tcc')) {
          if (standardizedName.toLowerCase().includes('p25')) transformedRow.tcc_p25 = Number(value) || 0;
          else if (standardizedName.toLowerCase().includes('p50')) transformedRow.tcc_p50 = Number(value) || 0;
          else if (standardizedName.toLowerCase().includes('p75')) transformedRow.tcc_p75 = Number(value) || 0;
          else if (standardizedName.toLowerCase().includes('p90')) transformedRow.tcc_p90 = Number(value) || 0;
        } else if (standardizedName.toLowerCase().includes('wrvu')) {
          if (standardizedName.toLowerCase().includes('p25')) transformedRow.wrvu_p25 = Number(value) || 0;
          else if (standardizedName.toLowerCase().includes('p50')) transformedRow.wrvu_p50 = Number(value) || 0;
          else if (standardizedName.toLowerCase().includes('p75')) transformedRow.wrvu_p75 = Number(value) || 0;
          else if (standardizedName.toLowerCase().includes('p90')) transformedRow.wrvu_p90 = Number(value) || 0;
        } else if (standardizedName.toLowerCase().includes('cf')) {
          if (standardizedName.toLowerCase().includes('p25')) transformedRow.cf_p25 = Number(value) || 0;
          else if (standardizedName.toLowerCase().includes('p50')) transformedRow.cf_p50 = Number(value) || 0;
          else if (standardizedName.toLowerCase().includes('p75')) transformedRow.cf_p75 = Number(value) || 0;
          else if (standardizedName.toLowerCase().includes('p90')) transformedRow.cf_p90 = Number(value) || 0;
        } else if (standardizedName.toLowerCase().includes('orgs')) {
          transformedRow.n_orgs = Number(value) || 0;
        } else if (standardizedName.toLowerCase().includes('incumbents')) {
          transformedRow.n_incumbents = Number(value) || 0;
        }
      }
    });

    return transformedRow;
  });
};

const SurveyAnalytics: React.FC = () => {
  // Export functions
  const exportToExcel = () => {
    const headers = [
      'Survey Source',
      'Survey Specialty', 
      'Geographic Region',
      '# Organizations',
      '# Incumbents',
      'TCC P25',
      'TCC P50',
      'TCC P75',
      'TCC P90',
      'wRVU P25',
      'wRVU P50',
      'wRVU P75',
      'wRVU P90',
      'CF P25',
      'CF P50',
      'CF P75',
      'CF P90'
    ];

    const csvData = filteredData.map(row => [
      row.surveySource,
      row.surveySpecialty,
      row.geographicRegion,
      row.n_orgs,
      row.n_incumbents,
      row.tcc_p25,
      row.tcc_p50,
      row.tcc_p75,
      row.tcc_p90,
      row.wrvu_p25,
      row.wrvu_p50,
      row.wrvu_p75,
      row.wrvu_p90,
      row.cf_p25,
      row.cf_p50,
      row.cf_p75,
      row.cf_p90
    ]);

    // Add headers
    csvData.unshift(headers);

    // Convert to CSV string
    const csvContent = csvData
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `survey-analytics-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToCSV = () => {
    exportToExcel(); // Same function for now
  };

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
  const columnMappingService = useMemo(() => new ColumnMappingService(new LocalStorageService()), []);
  const storageService = useMemo(() => new LocalStorageService(), []);
  const backendService = useMemo(() => BackendService.getInstance(), []);

  // Build chain map: standardizedName -> surveySource -> [source specialties]
  const chainByStandardized = useMemo(() => {
    const result = new Map<string, Map<string, string[]>>();
    mappings.forEach(m => {
      const bySource = new Map<string, string[]>();
      m.sourceSpecialties.forEach(src => {
        const list = bySource.get(src.surveySource) || [];
        list.push(src.specialty);
        bySource.set(src.surveySource, list);
      });
      result.set(m.standardizedName, bySource);
    });
    return result;
  }, [mappings]);

  // Survey counts by source for quick diagnostics
  const surveyCountsBySource = useMemo(() => {
    const counts = new Map<string, number>();
    Object.values(surveys).forEach(rows => {
      const source = String(rows[0]?.surveySource || 'unknown');
      counts.set(source, (counts.get(source) || 0) + 1);
    });
    return counts;
  }, [surveys]);

  // Get unique values for filters
  const uniqueValues = useMemo(() => {
    const values = {
      specialties: new Set<string>(),
      providerTypes: new Set<string>(),
      regions: new Set<string>(),
      surveySources: new Set<string>()
    };

    // Get all standardized names from actual mappings (not just initial mappings)
    mappings.forEach(mapping => {
      if (mapping.standardizedName) {
        values.specialties.add(mapping.standardizedName);
        console.log('Added specialty from mapping:', mapping.standardizedName);
      }
    });

    // Build cascading sets based on current selections (specialty/survey source)
    console.log('Extracting unique values from surveys with cascading filters:', filters, Object.keys(surveys));

    // Pre-compute selected mapping and source names per survey for specialty cascade
    const selectedMapping = mappings.find(m => m.standardizedName === filters.specialty);
    const sourceNamesBySurvey = new Map<string, string[]>();
    if (selectedMapping) {
      selectedMapping.sourceSpecialties.forEach(src => {
        const list = sourceNamesBySurvey.get(src.surveySource) || [];
        list.push(src.specialty);
        sourceNamesBySurvey.set(src.surveySource, list);
      });
    }

    Object.entries(surveys).forEach(([surveyId, surveyRows]) => {
      console.log(`Processing survey ${surveyId} with ${surveyRows.length} rows`);
      surveyRows.forEach(row => {
        const surveySource = String(row.surveySource || '');
        // Respect survey source filter
        if (filters.surveySource && surveySource.toLowerCase() !== filters.surveySource.toLowerCase()) return;

        // Respect specialty filter using standardized or source names
        if (filters.specialty) {
          const rowSpec = String(row.specialty || '');
          const direct = rowSpec.toLowerCase() === filters.specialty.toLowerCase();
          const srcList = sourceNamesBySurvey.get(surveySource) || [];
          const viaSource = srcList.some(name => fuzzyMatchSpecialty(rowSpec, name));
          if (!direct && !viaSource) return;
        }

        if (row.providerType) {
          values.providerTypes.add(String(row.providerType));
          console.log('Added provider type:', row.providerType);
        }
        const region = (row as any).geographicRegion || (row as any).geographic_region;
        if (region) {
          values.regions.add(String(region));
          console.log('Added region:', region);
        }
        if (row.surveySource) {
          values.surveySources.add(String(row.surveySource));
          console.log('Added survey source:', row.surveySource);
        }
      });
    });

    console.log('Total specialties found:', values.specialties.size);
    console.log('All specialties:', Array.from(values.specialties));
    console.log('Total survey sources found:', values.surveySources.size);
    console.log('All survey sources:', Array.from(values.surveySources));
    console.log('Total provider types found:', values.providerTypes.size);
    console.log('All provider types:', Array.from(values.providerTypes));
    console.log('Total regions found:', values.regions.size);
    console.log('All regions:', Array.from(values.regions));

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
        // Load specialty mappings from the actual service (not just initial mappings)
        const allMappings = await mappingService.getAllMappings();
        console.log('Loaded specialty mappings:', allMappings.length, 'mappings found');
        console.log('Available standardized names:', allMappings.map(m => m.standardizedName));
        

        
        setMappings(allMappings);

        // Load column mappings
        const columnMappings = await columnMappingService.getAllMappings();
        console.log('Loaded column mappings:', columnMappings.length, 'mappings found');

        // Then get survey data from backend
        const uploadedSurveys = await backendService.getAllSurveys();
        console.log('📊 Found surveys:', uploadedSurveys.map(s => ({
          id: s.id,
          type: (s as any).type,
          totalRows: (s as any).rowCount,
          fileName: (s as any).fileName,
          uploadDate: (s as any).uploadDate
        })));
        
        if (uploadedSurveys.length === 0) {
          console.error('❌ No surveys found! This is the problem.');
          setError('No surveys found. Please upload some survey data first.');
          return;
        }
        
        const surveyData: Record<string, ISurveyRow[]> = {};
        
        for (const survey of uploadedSurveys) {
          try {
            const surveyType = (survey as any).type;
            console.log(`🔍 Loading data for survey ${survey.id} (${surveyType})`);
            // CRITICAL: Request sufficient rows to get all data, including specialties that appear later in the dataset
        // See docs/ALLERGY_IMMUNOLOGY_FIX.md for details on why this is necessary
        const data = await backendService.getSurveyData(survey.id, undefined, { limit: 10000 }); // Request up to 10,000 rows to get all data
            if (data && data.rows) {
              // Log the column names from the first row
              if (data.rows.length > 0) {
                console.log('📋 Available columns:', Object.keys(data.rows[0]));
              }



              // Apply column mappings to transform the data
              console.log(`🔄 Transforming ${data.rows.length} rows for survey ${survey.id} (${surveyType})`);
              console.log('📋 Available column mappings:', columnMappings.map(m => ({
                standardizedName: m.standardizedName,
                sourceColumns: m.sourceColumns.map(c => `${c.name} (${c.surveySource})`)
              })));
              

              
              console.log(`🔄 About to transform ${data.rows.length} rows for survey ${survey.id} (${surveyType})`);
              const transformedRows = transformSurveyData(data.rows, columnMappings, allMappings, surveyType);
              console.log(`✅ Transformed ${transformedRows.length} rows for survey ${survey.id}`);
              
              // Special debugging for SullivanCotter transformed data
              if (surveyType === 'SullivanCotter') {
                const allergyTransformedRows = transformedRows.filter(row => 
                  row.specialty && (row.specialty.toLowerCase().includes('allergy') || row.specialty.toLowerCase().includes('immunology'))
                );
                console.log('🔍 Found', allergyTransformedRows.length, 'Allergy & Immunology rows in SullivanCotter transformed data');
                if (allergyTransformedRows.length > 0) {
                  console.log('📋 Sample transformed Allergy & Immunology rows:', allergyTransformedRows.slice(0, 3).map(row => row.specialty));
                }
              }
              
              // Check if any specialties were actually transformed
              const originalSpecialties = data.rows.slice(0, 5).map(row => row.specialty);
              const transformedSpecialties = transformedRows.slice(0, 5).map(row => row.specialty);
              console.log(`📋 Original specialties (first 5):`, originalSpecialties);
              console.log(`📋 Transformed specialties (first 5):`, transformedSpecialties);
              

              
              // Log some sample specialties from the raw data
              if (data.rows.length > 0) {
                const sampleSpecialties = data.rows.slice(0, 5).map(row => row.specialty);
                console.log(`📋 Sample specialties from ${surveyType}:`, sampleSpecialties);
              }
              
              if (transformedRows.length > 0) {
                console.log('Sample transformed row:', {
                  surveySource: transformedRows[0].surveySource,
                  specialty: transformedRows[0].specialty,
                  tcc_p50: transformedRows[0].tcc_p50,
                  wrvu_p50: transformedRows[0].wrvu_p50,
                  cf_p50: transformedRows[0].cf_p50
                });
              }
              
              surveyData[survey.id] = transformedRows.map(row => {
                // Ensure all required fields are present and properly typed
                const processedRow = {
                  ...row,
                  surveySource: surveyType,
                  specialty: row.specialty || row.normalizedSpecialty || '',
                  originalSpecialty: row.originalSpecialty || row.specialty || row.normalizedSpecialty || '',
                  // Normalize provider type and region fields from possible snake_case inputs
                  providerType: (row as any).providerType || (row as any).provider_type || '',
                  geographicRegion: (row as any).geographicRegion || (row as any).geographic_region || '',
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
                if (transformedRows.indexOf(row) === 0) {
                  console.log('Sample transformed row:', {
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
        console.log('Survey data keys:', Object.keys(surveyData));
        
        // Collect all specialties from all surveys to see what's available
        const allSpecialties: string[] = [];
        Object.entries(surveyData).forEach(([id, rows]) => {
          const surveySpecialties = Array.from(new Set(rows.map(r => String(r.specialty || '')).filter(Boolean)));
          allSpecialties.push(...surveySpecialties);
          
          console.log(`Survey ${id}:`, {
            rowCount: rows.length,
            surveySource: rows[0]?.surveySource,
            specialties: surveySpecialties,
            hasData: rows.some(r => r.tcc_p50 > 0 || r.wrvu_p50 > 0),
            sampleRow: rows[0]
          });
        });
        
        // Check for Allergy & Immunology specifically
        const uniqueSpecialties = Array.from(new Set(allSpecialties));
        console.log('📋 All unique specialties across all surveys:', uniqueSpecialties);
        
        const allergySpecialties = uniqueSpecialties.filter(s => 
          String(s).toLowerCase().includes('allergy') || String(s).toLowerCase().includes('immunology')
        );
        console.log('🎯 Allergy & Immunology related specialties found:', allergySpecialties);
        
        // Check if any survey has Allergy & Immunology rows
        Object.entries(surveyData).forEach(([id, rows]) => {
          const allergyRows = rows.filter(row => 
            row.specialty && 
            (String(row.specialty).toLowerCase().includes('allergy') || 
             String(row.specialty).toLowerCase().includes('immunology'))
          );
          if (allergyRows.length > 0) {
            console.log(`✅ Survey ${id} has ${allergyRows.length} Allergy & Immunology rows:`, 
              allergyRows.slice(0, 3).map(row => ({
                specialty: row.specialty,
                originalSpecialty: row.originalSpecialty,
                surveySource: row.surveySource
              }))
            );
          }
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
    if (!selectedMapping) {
      console.log('❌ No mapping found for specialty:', filters.specialty);
      console.log('📋 Available mappings:', mappings.map(m => m.standardizedName));
      return [];
    }

    console.log('✅ Selected mapping:', selectedMapping);
    console.log('📊 Available surveys:', Object.keys(surveys));
    
    // Collect ALL matching rows from ALL surveys for this standardized specialty
    const allMatchingRows: ISurveyRow[] = [];
    
    // Look through ALL surveys for data matching the selected standardized specialty
    Object.entries(surveys).forEach(([surveyId, surveyRows]) => {
      if (!surveyRows || !surveyRows.length) {
        console.log(`❌ No data found for survey ${surveyId}`);
        return;
      }

      const surveySource = surveyRows[0]?.surveySource;
      console.log(`🔍 Checking survey ${surveyId} (${surveySource}) for specialty "${filters.specialty}"`);
      
      
      
      // Show what source specialties this mapping expects for this survey source
      const expectedSourceSpecialties = selectedMapping.sourceSpecialties
        .filter(src => src.surveySource === surveySource)
        .map(src => src.specialty);
      console.log(`🎯 Expected source specialties for ${surveySource}:`, expectedSourceSpecialties);
      
      // Filter rows that match the selected standardized specialty
      const filtered = surveyRows.filter(row => {
        if (!row) return false;
        
        // Use the transformed specialty name (which should already be standardized)
        const rowSpecialty = String(row.specialty || '').trim();
        const selectedSpecialty = selectedMapping.standardizedName.trim();
        
        // Check if the row specialty matches the selected standardized specialty
        const specialtyMatch = rowSpecialty.toLowerCase() === selectedSpecialty.toLowerCase();
        
        // If no direct match, check if this row's original specialty maps to the selected specialty
        if (!specialtyMatch && row.originalSpecialty) {
          const originalSpecialty = String(row.originalSpecialty).toLowerCase();
          const mappingForThisSource = selectedMapping.sourceSpecialties.find(
            src => src.surveySource === surveySource && src.specialty.toLowerCase() === originalSpecialty
          );
          if (mappingForThisSource) {
            console.log(`✅ Found mapping match: "${row.originalSpecialty}" → "${selectedSpecialty}"`);
            return true;
          }
        }
        
        // Apply other filters
        const providerTypeMatch = !filters.providerType || 
          String((row as any).providerType || (row as any).provider_type || '').toLowerCase().trim() === filters.providerType.toLowerCase().trim();
        const regionMatch = !filters.region || 
          String((row as any).geographicRegion || (row as any).geographic_region || '').toLowerCase().trim() === filters.region.toLowerCase().trim();
        const surveySourceMatch = !filters.surveySource || 
          String(row.surveySource || '').toLowerCase().trim() === filters.surveySource.toLowerCase().trim();
        
        const matches = specialtyMatch && providerTypeMatch && regionMatch && surveySourceMatch;
        
        if (specialtyMatch) {
          console.log(`✅ Found matching row: "${rowSpecialty}" matches "${selectedSpecialty}"`);
        } else {
          console.log(`❌ No direct match: "${rowSpecialty}" != "${selectedSpecialty}"`);
          // Debug: Show what the row actually contains
          console.log(`🔍 Row details:`, {
            surveySource: row.surveySource,
            specialty: row.specialty,
            originalSpecialty: (row as any).originalSpecialty,
            providerType: row.providerType,
            geographicRegion: row.geographicRegion
          });
        }
        
        return matches;
      });

      if (filtered.length > 0) {
        console.log(`✅ Found ${filtered.length} matching rows in survey ${surveyId} (${surveySource}) for specialty "${filters.specialty}"`);
        allMatchingRows.push(...filtered);
      } else {
        console.log(`❌ No matching rows found in survey ${surveyId} (${surveySource}) for specialty "${filters.specialty}"`);
      }
    });

    console.log(`📊 Total matching rows found across all surveys: ${allMatchingRows.length}`);

    if (allMatchingRows.length === 0) {
      console.log('❌ No matching rows found for any survey');
      console.log('📋 Available specialties in mappings:', mappings.map(m => m.standardizedName));
      console.log('🎯 Selected specialty:', filters.specialty);
      return [];
    }

    // Group rows by survey source, provider type, and region
    const groupedRows = new Map<string, ISurveyRow[]>();
    allMatchingRows.forEach(row => {
      const key = `${row.surveySource || ''}-${row.providerType || ''}-${row.geographicRegion || ''}`;
      if (!groupedRows.has(key)) {
        groupedRows.set(key, []);
      }
      groupedRows.get(key)?.push(row);
    });

    console.log(`Grouped into ${groupedRows.size} unique combinations`);

    // Create aggregated rows for each group
    const rows: AggregatedData[] = [];
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
            surveySource: String(row.surveySource || ''),
            surveySpecialty: String(row.specialty || ''),
            geographicRegion: String(row.geographicRegion || ''),
            n_orgs: metrics.n_orgs,
            n_incumbents: metrics.n_incumbents,
            tcc_p25: metrics.tcc_p25,
            tcc_p50: metrics.tcc_p50,
            tcc_p75: metrics.tcc_p75,
            tcc_p90: metrics.tcc_p90,
            wrvu_p25: metrics.wrvu_p25,
            wrvu_p50: metrics.wrvu_p50,
            wrvu_p75: metrics.wrvu_p75,
            wrvu_p90: metrics.wrvu_p90,
            cf_p25: metrics.cf_p25,
            cf_p50: metrics.cf_p50,
            cf_p75: metrics.cf_p75,
            cf_p90: metrics.cf_p90
          });
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
    setFilters(prev => {
      const newFilters = { ...prev, [filterName]: value };
      
      // Cascading logic: when specialty changes, reset other filters
      if (filterName === 'specialty') {
        newFilters.providerType = '';
        newFilters.region = '';
        newFilters.surveySource = '';
      }
      
      // When survey source changes, reset provider type and region
      if (filterName === 'surveySource') {
        newFilters.providerType = '';
        newFilters.region = '';
      }
      
      // When provider type changes, reset region
      if (filterName === 'providerType') {
        newFilters.region = '';
      }
      
      console.log('Filter changed:', filterName, 'to', value, 'New filters:', newFilters);
      return newFilters;
    });
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
      <LoadingSpinner 
        message="Loading survey analytics..." 
        fullScreen={true}
        size="lg"
      />
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
    <div className="min-h-screen bg-gray-50">
      {/* Filters Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 mt-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Data Filters</h3>
            <p className="text-sm text-gray-600 mt-1">Refine your survey analytics view</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Download Button */}
            <button
              onClick={exportToCSV}
              disabled={filteredData.length === 0}
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-all duration-200"
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Download to Excel
            </button>
          </div>
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Specialty Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specialty
            </label>
            <Autocomplete<string>
              value={filters.specialty}
              onChange={(event: any, newValue: string | null) => handleFilterChange('specialty', newValue || '')}
              options={['', ...uniqueValues.specialties]}
              getOptionLabel={(option: string) => option === '' ? 'All Specialties' : formatSpecialtyForDisplay(option)}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Search specialties..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: '0.875rem',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      border: '1px solid #d1d5db',
                      '&:hover': {
                        borderColor: '#9ca3af',
                      },
                      '&.Mui-focused': {
                        borderColor: '#3b82f6',
                      }
                    }
                  }}
                />
              )}
              renderOption={(props: any, option: string) => (
                <li {...props}>
                  {option === '' ? 'All Specialties' : formatSpecialtyForDisplay(option)}
                </li>
              )}
              filterOptions={(options: string[], { inputValue }: { inputValue: string }) => {
                if (inputValue === '') {
                  return options;
                }
                return options.filter((option: string) => 
                  option === '' || 
                  formatSpecialtyForDisplay(option).toLowerCase().includes(inputValue.toLowerCase()) ||
                  option.toLowerCase().includes(inputValue.toLowerCase())
                );
              }}
            />
          </div>

          {/* Survey Source Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Survey Source
            </label>
            <FormControl fullWidth size="small">
              <Select
                value={filters.surveySource}
                onChange={(e: React.ChangeEvent<{ value: unknown }>) => handleFilterChange('surveySource', e.target.value as string)}
                sx={{
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                    borderRadius: '8px',
                  },
                  '&:hover': {
                    borderColor: '#9ca3af',
                  },
                  '&.Mui-focused': {
                    borderColor: '#3b82f6',
                  }
                }}
                displayEmpty
              >
                <MenuItem value="">All Sources</MenuItem>
                {uniqueValues.surveySources.map((source) => (
                  <MenuItem key={source} value={source}>
                    {source}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {/* Provider Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provider Type
            </label>
            <FormControl fullWidth size="small">
              <Select
                value={filters.providerType}
                onChange={(e: React.ChangeEvent<{ value: unknown }>) => handleFilterChange('providerType', e.target.value as string)}
                sx={{
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                    borderRadius: '8px',
                  },
                  '&:hover': {
                    borderColor: '#9ca3af',
                  },
                  '&.Mui-focused': {
                    borderColor: '#3b82f6',
                  }
                }}
                displayEmpty
              >
                <MenuItem value="">All Types</MenuItem>
                {uniqueValues.providerTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          {/* Region Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Region
            </label>
            <FormControl fullWidth size="small">
              <Select
                value={filters.region}
                onChange={(e: React.ChangeEvent<{ value: unknown }>) => handleFilterChange('region', e.target.value as string)}
                sx={{
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                    borderRadius: '8px',
                  },
                  '&:hover': {
                    borderColor: '#9ca3af',
                  },
                  '&.Mui-focused': {
                    borderColor: '#3b82f6',
                  }
                }}
                displayEmpty
              >
                <MenuItem value="">All Regions</MenuItem>
                {uniqueValues.regions.map((region) => (
                  <MenuItem key={region} value={region}>
                    {region}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>

        {/* Clear Filters Button */}
        {(filters.specialty || filters.providerType || filters.region || filters.surveySource) && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                setFilters({ specialty: '', providerType: '', region: '', surveySource: '' });
              }}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
              title="Clear all filters"
            >
              <div className="relative w-4 h-4 mr-2">
                <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" />
                </svg>
                <svg className="absolute -top-1 -right-1 w-3 h-3 text-red-500 bg-white rounded-full" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Data Table Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Survey Analytics Data</h3>
        </div>

        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
            <p className="text-gray-500">Try adjusting your filters to see results</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <TableContainer 
              component={Paper} 
              sx={{ 
                overflowX: 'auto', 
                overflowY: 'hidden',
                border: '1px solid #e5e7eb', 
                borderRadius: '12px',
                '& .MuiTable-root': {
                  minWidth: '100%'
                },
                '&::-webkit-scrollbar': {
                  height: '8px'
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f1f1',
                  borderRadius: '4px'
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#cbd5e1',
                  borderRadius: '4px',
                  '&:hover': {
                    background: '#94a3b8'
                  }
                }
              }}
            >
              <Table size="small" sx={{ width: '100%' }}>
                <TableHead>
                  <TableRow>
                    <TableCell colSpan={5} sx={{ backgroundColor: '#f8fafc', fontWeight: 'bold', borderBottom: '2px solid #e2e8f0' }}>
                      Survey Information
                    </TableCell>
                    <TableCell colSpan={4} align="center" sx={{ backgroundColor: '#dbeafe', fontWeight: 'bold', borderLeft: '2px solid #e2e8f0', borderBottom: '2px solid #e2e8f0' }}>
                      Total Cash Compensation (TCC)
                    </TableCell>
                    <TableCell colSpan={4} align="center" sx={{ backgroundColor: '#dcfce7', fontWeight: 'bold', borderLeft: '2px solid #e2e8f0', borderBottom: '2px solid #e2e8f0' }}>
                      Work RVUs (wRVU)
                    </TableCell>
                    <TableCell colSpan={4} align="center" sx={{ backgroundColor: '#fef3c7', fontWeight: 'bold', borderLeft: '2px solid #e2e8f0', borderBottom: '2px solid #e2e8f0' }}>
                      Conversion Factor (CF)
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    {/* Survey Info Headers */}
                    <TableCell sx={{ backgroundColor: '#f8fafc', fontWeight: 'bold', fontSize: '0.875rem' }}>Survey Source</TableCell>
                    <TableCell sx={{ backgroundColor: '#f8fafc', fontWeight: 'bold', fontSize: '0.875rem' }}>Survey Specialty</TableCell>
                    <TableCell sx={{ backgroundColor: '#f8fafc', fontWeight: 'bold', fontSize: '0.875rem' }}>Region</TableCell>
                    <TableCell sx={{ backgroundColor: '#f8fafc', fontWeight: 'bold', fontSize: '0.875rem', textAlign: 'right' }}># Orgs</TableCell>
                    <TableCell sx={{ backgroundColor: '#f8fafc', fontWeight: 'bold', fontSize: '0.875rem', textAlign: 'right' }}># Incumbents</TableCell>
                    
                    {/* TCC Headers */}
                    <TableCell sx={{ backgroundColor: '#dbeafe', borderLeft: '2px solid #e2e8f0', textAlign: 'right', fontSize: '0.875rem' }}>P25</TableCell>
                    <TableCell sx={{ backgroundColor: '#dbeafe', textAlign: 'right', fontSize: '0.875rem' }}>P50</TableCell>
                    <TableCell sx={{ backgroundColor: '#dbeafe', textAlign: 'right', fontSize: '0.875rem' }}>P75</TableCell>
                    <TableCell sx={{ backgroundColor: '#dbeafe', textAlign: 'right', fontSize: '0.875rem' }}>P90</TableCell>
                    
                    {/* wRVU Headers */}
                    <TableCell sx={{ backgroundColor: '#dcfce7', borderLeft: '2px solid #e2e8f0', textAlign: 'right', fontSize: '0.875rem' }}>P25</TableCell>
                    <TableCell sx={{ backgroundColor: '#dcfce7', textAlign: 'right', fontSize: '0.875rem' }}>P50</TableCell>
                    <TableCell sx={{ backgroundColor: '#dcfce7', textAlign: 'right', fontSize: '0.875rem' }}>P75</TableCell>
                    <TableCell sx={{ backgroundColor: '#dcfce7', textAlign: 'right', fontSize: '0.875rem' }}>P90</TableCell>
                    
                    {/* CF Headers */}
                    <TableCell sx={{ backgroundColor: '#fef3c7', borderLeft: '2px solid #e2e8f0', textAlign: 'right', fontSize: '0.875rem' }}>P25</TableCell>
                    <TableCell sx={{ backgroundColor: '#fef3c7', textAlign: 'right', fontSize: '0.875rem' }}>P50</TableCell>
                    <TableCell sx={{ backgroundColor: '#fef3c7', textAlign: 'right', fontSize: '0.875rem' }}>P75</TableCell>
                    <TableCell sx={{ backgroundColor: '#fef3c7', textAlign: 'right', fontSize: '0.875rem' }}>P90</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(groupBySpecialty(filteredData)).map(([specialty, rows]) => (
                    <React.Fragment key={specialty}>
                      {rows.map((row, idx) => (
                        <TableRow 
                          key={`${specialty}-${idx}`}
                          sx={{ 
                            '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                            '&:hover': { backgroundColor: '#f1f5f9' },
                            transition: 'background-color 0.2s'
                          }}
                        >
                          <TableCell sx={{ fontSize: '0.875rem' }}>{row.surveySource}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>{row.surveySpecialty}</TableCell>
                          <TableCell sx={{ fontSize: '0.875rem' }}>{row.geographicRegion || 'N/A'}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.875rem' }}>{row.n_orgs.toLocaleString()}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.875rem' }}>{row.n_incumbents.toLocaleString()}</TableCell>
                          
                          {/* TCC Values */}
                          <TableCell sx={{ borderLeft: '2px solid #e2e8f0' }} align="right">{formatCurrency(row.tcc_p25)}</TableCell>
                          <TableCell align="right">{formatCurrency(row.tcc_p50)}</TableCell>
                          <TableCell align="right">{formatCurrency(row.tcc_p75)}</TableCell>
                          <TableCell align="right">{formatCurrency(row.tcc_p90)}</TableCell>
                          
                          {/* wRVU Values */}
                          <TableCell sx={{ borderLeft: '2px solid #e2e8f0' }} align="right">{formatNumber(row.wrvu_p25)}</TableCell>
                          <TableCell align="right">{formatNumber(row.wrvu_p50)}</TableCell>
                          <TableCell align="right">{formatNumber(row.wrvu_p75)}</TableCell>
                          <TableCell align="right">{formatNumber(row.wrvu_p90)}</TableCell>
                          
                          {/* CF Values */}
                          <TableCell sx={{ borderLeft: '2px solid #e2e8f0' }} align="right">{formatCurrency(row.cf_p25, 2)}</TableCell>
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
                              backgroundColor: '#f1f5f9',
                              borderTop: '2px solid #e2e8f0'
                            }}>
                              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Simple Average</TableCell>
                              <TableCell sx={{ fontSize: '0.875rem' }}>-</TableCell>
                              <TableCell sx={{ fontSize: '0.875rem' }}>-</TableCell>
                              <TableCell align="right" sx={{ fontSize: '0.875rem' }}>{simple.n_orgs}</TableCell>
                              <TableCell align="right" sx={{ fontSize: '0.875rem' }}>{simple.n_incumbents}</TableCell>
                              
                              {/* TCC Values */}
                              <TableCell sx={{ borderLeft: '2px solid #e2e8f0' }} align="right">{formatCurrency(simple.tcc_p25)}</TableCell>
                              <TableCell align="right">{formatCurrency(simple.tcc_p50)}</TableCell>
                              <TableCell align="right">{formatCurrency(simple.tcc_p75)}</TableCell>
                              <TableCell align="right">{formatCurrency(simple.tcc_p90)}</TableCell>
                              
                              {/* wRVU Values */}
                              <TableCell sx={{ borderLeft: '2px solid #e2e8f0' }} align="right">{formatNumber(simple.wrvu_p25)}</TableCell>
                              <TableCell align="right">{formatNumber(simple.wrvu_p50)}</TableCell>
                              <TableCell align="right">{formatNumber(simple.wrvu_p75)}</TableCell>
                              <TableCell align="right">{formatNumber(simple.wrvu_p90)}</TableCell>
                              
                              {/* CF Values */}
                              <TableCell sx={{ borderLeft: '2px solid #e2e8f0' }} align="right">{formatCurrency(simple.cf_p25, 2)}</TableCell>
                              <TableCell align="right">{formatCurrency(simple.cf_p50, 2)}</TableCell>
                              <TableCell align="right">{formatCurrency(simple.cf_p75, 2)}</TableCell>
                              <TableCell align="right">{formatCurrency(simple.cf_p90, 2)}</TableCell>
                            </TableRow>
                            <TableRow sx={{ 
                              backgroundColor: '#dbeafe',
                              borderBottom: '2px solid #e2e8f0'
                            }}>
                              <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Weighted Average</TableCell>
                              <TableCell sx={{ fontSize: '0.875rem' }}>-</TableCell>
                              <TableCell sx={{ fontSize: '0.875rem' }}>-</TableCell>
                              <TableCell align="right" sx={{ fontSize: '0.875rem' }}>{weighted.n_orgs}</TableCell>
                              <TableCell align="right" sx={{ fontSize: '0.875rem' }}>{weighted.n_incumbents}</TableCell>
                              
                              {/* TCC Values */}
                              <TableCell sx={{ borderLeft: '2px solid #e2e8f0' }} align="right">{formatCurrency(weighted.tcc_p25)}</TableCell>
                              <TableCell align="right">{formatCurrency(weighted.tcc_p50)}</TableCell>
                              <TableCell align="right">{formatCurrency(weighted.tcc_p75)}</TableCell>
                              <TableCell align="right">{formatCurrency(weighted.tcc_p90)}</TableCell>
                              
                              {/* wRVU Values */}
                              <TableCell sx={{ borderLeft: '2px solid #e2e8f0' }} align="right">{formatNumber(weighted.wrvu_p25)}</TableCell>
                              <TableCell align="right">{formatNumber(weighted.wrvu_p50)}</TableCell>
                              <TableCell align="right">{formatNumber(weighted.wrvu_p75)}</TableCell>
                              <TableCell align="right">{formatNumber(weighted.wrvu_p90)}</TableCell>
                              
                              {/* CF Values */}
                              <TableCell sx={{ borderLeft: '2px solid #e2e8f0' }} align="right">{formatCurrency(weighted.cf_p25, 2)}</TableCell>
                              <TableCell align="right">{formatCurrency(weighted.cf_p50, 2)}</TableCell>
                              <TableCell align="right">{formatCurrency(weighted.cf_p75, 2)}</TableCell>
                              <TableCell align="right">{formatCurrency(weighted.cf_p90, 2)}</TableCell>
                            </TableRow>
                          </>
                        );
                      })()}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyAnalytics; 