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

import { getDataService } from '../services/DataService';
import { ISurveyRow } from '../types/survey';
import { ISpecialtyMapping, ISourceSpecialty } from '../types/specialty';
import LoadingSpinner from './ui/loading-spinner';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { formatSpecialtyForDisplay, formatRegionForDisplay } from '../shared/utils/formatters';
import { fuzzyMatchSpecialty, filterSpecialtyOptions } from '../shared/utils/specialtyMatching';
import { useYear } from '../contexts/YearContext';
import { performanceMonitor } from '../shared/utils/performance';
const SHOW_DEBUG = false; // Set to false for production performance

// Variable mapping interface
interface VariableMapping {
  id: string;
  standardizedName: string;
  variableType: 'compensation' | 'categorical';
  variableSubType: string;
  sourceVariables: Array<{
    surveySource: string;
    originalVariableName: string;
    frequency?: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface AggregatedData {
  standardizedName: string;
  surveySource: string;
  surveySpecialty: string;
  geographicRegion: string;
  n_orgs: number;
  n_incumbents: number;
  
  // TCC metrics with their own organizational data
  tcc_n_orgs?: number;
  tcc_n_incumbents?: number;
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  
  // wRVU metrics with their own organizational data
  wrvu_n_orgs?: number;
  wrvu_n_incumbents?: number;
  wrvu_p25: number;
  wrvu_p50: number;
  wrvu_p75: number;
  wrvu_p90: number;
  
  // CF metrics with their own organizational data
  cf_n_orgs?: number;
  cf_n_incumbents?: number;
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

// Dynamic variable detection and categorization
const detectVariableType = (variableName: string): { type: string; standardizedName: string } => {
  const name = variableName.toLowerCase();
  
  // Define patterns for different variable types
  // NOTE: Order matters! More specific patterns should come first
  const patterns = {
    // Conversion factors (ratios) - check these FIRST before generic TCC
    cf: [
      'conversion', 'cf', 'factor', 'conversion factor',
      'tcc per rvu', 'tcc per work rvu', 'compensation per rvu', 
      'dollars per rvu', 'per work rvu', 'per rvu', 'tcc/rvu',
      'compensation/rvu', 'comp per rvu', 'cash per rvu'
    ],
    // Now check generic compensation patterns
    tcc: ['compensation', 'salary', 'total cash', 'tcc', 'total compensation'],
    wrvu: ['rvu', 'relative value', 'work rvu', 'wrvu', 'work relative value'],
    bonus: ['bonus', 'incentive', 'performance', 'productivity'],
    quality: ['quality', 'metrics', 'score', 'outcome'],
    stipend: ['stipend', 'allowance', 'supplement'],
    retention: ['retention', 'loyalty', 'longevity'],
    call: ['call', 'coverage', 'duty'],
    admin: ['admin', 'administrative', 'leadership'],
    research: ['research', 'academic', 'teaching']
  };
  
  // Find matching pattern
  for (const [type, keywords] of Object.entries(patterns)) {
    const matchedKeyword = keywords.find(keyword => name.includes(keyword));
    if (matchedKeyword) {
      // Debug: Log TCC per RVU detection
      if (name.includes('tcc') && name.includes('rvu')) {
        console.log('🔍 TCC per RVU detection:', {
          originalName: variableName,
          normalizedName: name,
          detectedType: type,
          matchedKeyword,
          standardizedName: `${type}_variable`
        });
      }
      
      return { 
        type, 
        standardizedName: `${type}_variable` 
      };
    }
  }
  
  // If no pattern matches, create a generic mapping
  return { 
    type: 'custom', 
    standardizedName: `custom_${name.replace(/[^a-z0-9]/g, '_')}` 
  };
};

// Generate standardized field names for any variable type
const generateStandardizedFields = (variableType: string, percentile: string): string => {
  return `${variableType}_${percentile}`;
};

// Get variable mappings from the database
const getVariableMappings = async (): Promise<VariableMapping[]> => {
  try {
    const dataService = getDataService();
    const mappings = await dataService.getVariableMappings();
    return mappings || [];
  } catch (error) {
    console.error('Error loading variable mappings:', error);
    return [];
  }
};

// Find variable mapping for a given variable name and survey source
const findVariableMapping = (
  variableName: string, 
  surveySource: string, 
  variableMappings: VariableMapping[],
  variableType?: 'compensation' | 'categorical',
  variableSubType?: string
): VariableMapping | null => {
  return variableMappings.find(mapping => {
    // If variableType and variableSubType are specified, filter by them
    if (variableType && mapping.variableType !== variableType) return false;
    if (variableSubType && mapping.variableSubType !== variableSubType) return false;
    
    return mapping.sourceVariables.some(source => 
      source.surveySource === surveySource && 
      source.originalVariableName.toLowerCase() === variableName.toLowerCase()
    );
  }) || null;
};

// Enterprise-grade intelligent column mapping function
const createIntelligentMappings = (row: any, surveySource: string): Array<{sourceColumn: string, targetColumn: string, confidence: number}> => {
  const mappings: Array<{sourceColumn: string, targetColumn: string, confidence: number}> = [];
  
  // Define standardized column patterns with confidence scores
  const columnPatterns = [
    // TCC patterns (Total Cash Compensation)
    { pattern: /tcc.*p25|p25.*tcc|total.*cash.*25|25.*total.*cash/i, target: 'tcc_p25', confidence: 0.9 },
    { pattern: /tcc.*p50|p50.*tcc|total.*cash.*50|50.*total.*cash|median.*tcc|tcc.*median/i, target: 'tcc_p50', confidence: 0.9 },
    { pattern: /tcc.*p75|p75.*tcc|total.*cash.*75|75.*total.*cash/i, target: 'tcc_p75', confidence: 0.9 },
    { pattern: /tcc.*p90|p90.*tcc|total.*cash.*90|90.*total.*cash/i, target: 'tcc_p90', confidence: 0.9 },
    
    // wRVU patterns (Work RVUs)
    { pattern: /wrvu.*p25|p25.*wrvu|work.*rvu.*25|25.*work.*rvu/i, target: 'wrvu_p25', confidence: 0.9 },
    { pattern: /wrvu.*p50|p50.*wrvu|work.*rvu.*50|50.*work.*rvu|median.*wrvu|wrvu.*median/i, target: 'wrvu_p50', confidence: 0.9 },
    { pattern: /wrvu.*p75|p75.*wrvu|work.*rvu.*75|75.*work.*rvu/i, target: 'wrvu_p75', confidence: 0.9 },
    { pattern: /wrvu.*p90|p90.*wrvu|work.*rvu.*90|90.*work.*rvu/i, target: 'wrvu_p90', confidence: 0.9 },
    
    // CF patterns (Conversion Factor) - including TCC per RVU ratios
    { pattern: /cf.*p25|p25.*cf|conversion.*factor.*25|25.*conversion.*factor|tcc.*per.*rvu.*25|25.*tcc.*per.*rvu|compensation.*per.*rvu.*25|25.*compensation.*per.*rvu/i, target: 'cf_p25', confidence: 0.9 },
    { pattern: /cf.*p50|p50.*cf|conversion.*factor.*50|50.*conversion.*factor|median.*cf|cf.*median|tcc.*per.*rvu.*50|50.*tcc.*per.*rvu|compensation.*per.*rvu.*50|50.*compensation.*per.*rvu|tcc.*per.*rvu.*median|median.*tcc.*per.*rvu/i, target: 'cf_p50', confidence: 0.9 },
    { pattern: /cf.*p75|p75.*cf|conversion.*factor.*75|75.*conversion.*factor|tcc.*per.*rvu.*75|75.*tcc.*per.*rvu|compensation.*per.*rvu.*75|75.*compensation.*per.*rvu/i, target: 'cf_p75', confidence: 0.9 },
    { pattern: /cf.*p90|p90.*cf|conversion.*factor.*90|90.*conversion.*factor|tcc.*per.*rvu.*90|90.*tcc.*per.*rvu|compensation.*per.*rvu.*90|90.*compensation.*per.*rvu/i, target: 'cf_p90', confidence: 0.9 },
    
    // Organization and incumbent patterns
    { pattern: /n_orgs|orgs|organizations|number.*org/i, target: 'n_orgs', confidence: 0.8 },
    { pattern: /n_incumbents|incumbents|number.*incumbent/i, target: 'n_incumbents', confidence: 0.8 },
    
    // Direct matches (highest confidence)
    { pattern: /^tcc_p25$/i, target: 'tcc_p25', confidence: 1.0 },
    { pattern: /^tcc_p50$/i, target: 'tcc_p50', confidence: 1.0 },
    { pattern: /^tcc_p75$/i, target: 'tcc_p75', confidence: 1.0 },
    { pattern: /^tcc_p90$/i, target: 'tcc_p90', confidence: 1.0 },
    { pattern: /^wrvu_p25$/i, target: 'wrvu_p25', confidence: 1.0 },
    { pattern: /^wrvu_p50$/i, target: 'wrvu_p50', confidence: 1.0 },
    { pattern: /^wrvu_p75$/i, target: 'wrvu_p75', confidence: 1.0 },
    { pattern: /^wrvu_p90$/i, target: 'wrvu_p90', confidence: 1.0 },
    { pattern: /^cf_p25$/i, target: 'cf_p25', confidence: 1.0 },
    { pattern: /^cf_p50$/i, target: 'cf_p50', confidence: 1.0 },
    { pattern: /^cf_p75$/i, target: 'cf_p75', confidence: 1.0 },
    { pattern: /^cf_p90$/i, target: 'cf_p90', confidence: 1.0 },
    { pattern: /^n_orgs$/i, target: 'n_orgs', confidence: 1.0 },
    { pattern: /^n_incumbents$/i, target: 'n_incumbents', confidence: 1.0 }
  ];
  
  // Test each column against patterns
  Object.keys(row).forEach(columnName => {
    let bestMatch: string | null = null;
    let highestConfidence = 0;
    
    columnPatterns.forEach(pattern => {
      if (pattern.pattern.test(columnName)) {
        if (pattern.confidence > highestConfidence) {
          highestConfidence = pattern.confidence;
          bestMatch = pattern.target;
        }
      }
    });
    
    if (bestMatch && highestConfidence > 0.7) {
      // Debug: Log TCC per RVU intelligent mappings
      if (columnName.toLowerCase().includes('tcc') && columnName.toLowerCase().includes('rvu')) {
        console.log('🎯 TCC per RVU intelligent mapping:', {
          sourceColumn: columnName,
          targetColumn: bestMatch,
          confidence: highestConfidence,
          isCorrectType: (bestMatch as string).includes('cf') ? 'CORRECT (CF)' : 'WRONG (should be CF)'
        });
      }
      
      mappings.push({
        sourceColumn: columnName,
        targetColumn: bestMatch,
        confidence: highestConfidence
      });
    }
  });
  
  return mappings;
};

// Extract clean survey name from filename
const extractCleanSurveyName = (filename: string): string => {
  if (!filename) return 'Survey';
  
  // Convert to lowercase for easier matching
  const lowerFilename = filename.toLowerCase();
  
  // Check for known survey types
  if (lowerFilename.includes('mgma')) return 'MGMA';
  if (lowerFilename.includes('sullivancotter') || lowerFilename.includes('sullivan_cotter')) return 'SullivanCotter';
  if (lowerFilename.includes('gallagher')) return 'Gallagher';
  if (lowerFilename.includes('ecg')) return 'ECG';
  if (lowerFilename.includes('amga')) return 'AMGA';
  
  // If no known type found, extract the first word before underscore or special characters
  const cleanName = filename.split(/[_\-\s]/)[0];
  return cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
};

// PERFORMANCE OPTIMIZATION: Optimized data transformation function
const transformSurveyData = (rawData: any[], columnMappings: any[], specialtyMappings: any[], surveySource: string, variableMappings: VariableMapping[] = [], regionMappings: any[] = []): any[] => {
  if (rawData.length === 0) return [];

  // PERFORMANCE OPTIMIZATION: Pre-compute lookups once
  const columnMappingLookup = new Map();
  const specialtyMappingLookup = new Map();
  const regionMappingLookup = new Map();
  
  // Build column mapping lookup for this survey source
  columnMappings.forEach(mapping => {
    mapping.sourceColumns.forEach((column: any) => {
      if (column.surveySource === surveySource) {
        columnMappingLookup.set(column.name, mapping.standardizedName);
      }
    });
  });

  // Build specialty mapping lookup for this survey source
  specialtyMappings.forEach(mapping => {
    mapping.sourceSpecialties.forEach((specialty: any) => {
      if (specialty.surveySource === surveySource) {
        specialtyMappingLookup.set(specialty.specialty.toLowerCase(), mapping.standardizedName);
      }
    });
  });

  // Build region mapping lookup for this survey source
  regionMappings.forEach(mapping => {
    mapping.sourceRegions.forEach((region: any) => {
      if (region.surveySource === surveySource) {
        regionMappingLookup.set(region.region.toLowerCase(), mapping.standardizedName);
      }
    });
  });

  // PERFORMANCE OPTIMIZATION: Use map instead of forEach for better performance
  return rawData.map(row => {
    const transformedRow: any = {
      surveySource: (row as any)._surveyName || surveySource, // Use readable name instead of UUID
      specialty: row.specialty || row.normalizedSpecialty || '',
      originalSpecialty: row.specialty || '',
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

    // PERFORMANCE OPTIMIZATION: Apply specialty mapping with early return
    const originalSpecialty = String(row.specialty || '').toLowerCase();
    let standardizedSpecialty = specialtyMappingLookup.get(originalSpecialty);
    
    // Debug: Log specialty mapping for heart-related specialties
    if (originalSpecialty.includes('heart')) {
      console.log('Specialty mapping debug:', {
        originalSpecialty,
        standardizedSpecialty,
        availableMappings: Array.from(specialtyMappingLookup.keys()).filter(k => k.includes('heart')).slice(0, 5)
      });
    }
    
    // Only do fuzzy matching if no direct match found
    if (!standardizedSpecialty) {
      // More precise fuzzy matching - prefer exact matches and word boundaries
      let bestMatch: string | null = null;
      let bestScore = 0;
      
      for (const [key, value] of specialtyMappingLookup.entries()) {
        const keyLower = key.toLowerCase();
        
        // Exact match gets highest priority
        if (originalSpecialty === keyLower) {
          standardizedSpecialty = value;
          break;
        }
        
        // Word-based matching for better precision
        const originalWords = originalSpecialty.split(/\s+/).filter((w: string) => w.length > 2);
        const keyWords = keyLower.split(/\s+/).filter((w: string) => w.length > 2);
        
        if (originalWords.length > 0 && keyWords.length > 0) {
          const commonWords = originalWords.filter((w: string) => keyWords.includes(w));
          const score = commonWords.length / Math.max(originalWords.length, keyWords.length);
          
          if (score > bestScore && score >= 0.7) {
            bestScore = score;
            bestMatch = value;
          }
        }
      }
      
      if (bestMatch) {
        standardizedSpecialty = bestMatch;
      }
    }
    
    if (standardizedSpecialty) {
      transformedRow.specialty = standardizedSpecialty;
      transformedRow.originalSpecialty = row.specialty || '';
    } else {
      transformedRow.specialty = row.specialty || '';
      transformedRow.originalSpecialty = row.specialty || '';
    }

    // PERFORMANCE OPTIMIZATION: Apply column mappings efficiently
    let mappedColumns = 0;
    
    // Apply region mappings
    const originalRegion = String(row.geographicRegion || row.geographic_region || '').toLowerCase();
    if (originalRegion) {
      const standardizedRegion = regionMappingLookup.get(originalRegion);
      if (standardizedRegion) {
        transformedRow.geographicRegion = standardizedRegion;
        transformedRow.originalRegion = row.geographicRegion || row.geographic_region;
        
        // Debug: Log successful region mapping
        if (Math.random() < 0.1) { // Log 10% of successful mappings
          console.log('🌍 Region mapping applied:', {
            originalRegion: row.geographicRegion || row.geographic_region,
            standardizedRegion,
            surveySource
          });
        }
      } else {
        transformedRow.geographicRegion = row.geographicRegion || row.geographic_region || '';
        transformedRow.originalRegion = row.geographicRegion || row.geographic_region || '';
        
        // Debug: Log unmapped regions
        if (Math.random() < 0.05) { // Log 5% of unmapped regions
          console.log('⚠️ Region not mapped:', {
            originalRegion: row.geographicRegion || row.geographic_region,
            availableMappings: Array.from(regionMappingLookup.keys()).slice(0, 5),
            surveySource
          });
        }
      }
    }
    
    if (row.providerType) {
      const providerMapping = findVariableMapping(row.providerType, surveySource, variableMappings, 'categorical', 'providerType');
      if (providerMapping) {
        transformedRow.providerType = providerMapping.standardizedName;
        transformedRow.originalProviderType = row.providerType;
      }
    }
    
    // Handle variable-based data structure (pivot format)
    if (row.variable && (row.p25 !== undefined || row.p50 !== undefined || row.p75 !== undefined || row.p90 !== undefined)) {
      // First try to find a variable mapping
      const variableMapping = findVariableMapping(row.variable, surveySource, variableMappings);
      
      if (variableMapping) {
        // Use the stored variable mapping
        const percentiles = ['p25', 'p50', 'p75', 'p90'];
        
        percentiles.forEach(percentile => {
          if (row[percentile] !== undefined) {
            const fieldName = generateStandardizedFields(variableMapping.variableType, percentile);
            transformedRow[fieldName] = Number(row[percentile]) || 0;
            mappedColumns++;
          }
        });
        
        console.log('🔍 Variable mapping found:', {
          variable: row.variable,
          mappingType: variableMapping.variableType,
          standardizedName: variableMapping.standardizedName,
          mappedFields: percentiles.map(p => generateStandardizedFields(variableMapping.variableType, p))
        });
      } else {
        // Fallback to auto-detection
        const variableType = detectVariableType(row.variable);
        const percentiles = ['p25', 'p50', 'p75', 'p90'];
        
        percentiles.forEach(percentile => {
          if (row[percentile] !== undefined) {
            const fieldName = generateStandardizedFields(variableType.type, percentile);
            transformedRow[fieldName] = Number(row[percentile]) || 0;
            mappedColumns++;
          }
        });
        
        console.log('🔍 Variable-based mapping (auto-detected):', {
          variable: row.variable,
          detectedType: variableType.type,
          standardizedName: variableType.standardizedName,
          mappedFields: percentiles.map(p => generateStandardizedFields(variableType.type, p))
        });
      }
    }
    
    // Handle traditional column-based mappings
    for (const [originalColumn, value] of Object.entries(row)) {
      const standardizedName = columnMappingLookup.get(originalColumn);
      if (standardizedName) {
        mappedColumns++;
        
        // PERFORMANCE OPTIMIZATION: Use switch-like logic for better performance
        const lowerName = standardizedName.toLowerCase();
        if (lowerName.includes('tcc')) {
          if (lowerName.includes('p25')) transformedRow.tcc_p25 = Number(value) || 0;
          else if (lowerName.includes('p50')) transformedRow.tcc_p50 = Number(value) || 0;
          else if (lowerName.includes('p75')) transformedRow.tcc_p75 = Number(value) || 0;
          else if (lowerName.includes('p90')) transformedRow.tcc_p90 = Number(value) || 0;
        } else if (lowerName.includes('wrvu')) {
          if (lowerName.includes('p25')) transformedRow.wrvu_p25 = Number(value) || 0;
          else if (lowerName.includes('p50')) transformedRow.wrvu_p50 = Number(value) || 0;
          else if (lowerName.includes('p75')) transformedRow.wrvu_p75 = Number(value) || 0;
          else if (lowerName.includes('p90')) transformedRow.wrvu_p90 = Number(value) || 0;
        } else if (lowerName.includes('cf')) {
          if (lowerName.includes('p25')) transformedRow.cf_p25 = Number(value) || 0;
          else if (lowerName.includes('p50')) transformedRow.cf_p50 = Number(value) || 0;
          else if (lowerName.includes('p75')) transformedRow.cf_p75 = Number(value) || 0;
          else if (lowerName.includes('p90')) transformedRow.cf_p90 = Number(value) || 0;
        } else if (lowerName.includes('orgs')) {
          transformedRow.n_orgs = Number(value) || 0;
        } else if (lowerName.includes('incumbents')) {
          transformedRow.n_incumbents = Number(value) || 0;
        }
      }
    }
    
    // ENHANCED FALLBACK: If no columns mapped, try intelligent mapping with compensation detection
    if (mappedColumns === 0) {
      const intelligentMappings = createIntelligentMappings(row, surveySource);
      
      for (const [originalColumn, value] of Object.entries(row)) {
        const mapping = intelligentMappings.find((m: {sourceColumn: string, targetColumn: string, confidence: number}) => m.sourceColumn === originalColumn);
        if (mapping && value !== undefined && value !== null) {
          transformedRow[mapping.targetColumn] = Number(value) || 0;
          mappedColumns++;
        }
      }
    }
    
    // Always attempt to extract organization and incumbent counts from raw columns
    // even when other columns were mapped successfully (these counts are often
    // independent of percentile mappings and may not be in column mappings)
    if (transformedRow.n_orgs === 0 || transformedRow.n_orgs === undefined ||
        transformedRow.n_incumbents === 0 || transformedRow.n_incumbents === undefined) {
      for (const [originalColumn, value] of Object.entries(row)) {
        const columnName = String(originalColumn || '').toLowerCase();
        const numValue = Number(value) || 0;
        if ((transformedRow.n_orgs === 0 || transformedRow.n_orgs === undefined) && columnName.includes('org') && !columnName.includes('incumbent')) {
          transformedRow.n_orgs = numValue;
        }
        if ((transformedRow.n_incumbents === 0 || transformedRow.n_incumbents === undefined) && columnName.includes('incumbent')) {
          transformedRow.n_incumbents = numValue;
        }
      }
    }

    // ULTIMATE FALLBACK: Direct column name matching for compensation data
    if (mappedColumns === 0) {
      for (const [originalColumn, value] of Object.entries(row)) {
        const columnName = String(originalColumn || '').toLowerCase();
        const numValue = Number(value) || 0;
        
        // TCC (Total Cash Compensation) patterns
        if (columnName.includes('total') && columnName.includes('comp') && columnName.includes('25')) transformedRow.tcc_p25 = numValue;
        else if (columnName.includes('total') && columnName.includes('comp') && columnName.includes('median')) transformedRow.tcc_p50 = numValue;
        else if (columnName.includes('total') && columnName.includes('comp') && columnName.includes('75')) transformedRow.tcc_p75 = numValue;
        else if (columnName.includes('total') && columnName.includes('comp') && columnName.includes('90')) transformedRow.tcc_p90 = numValue;
        else if (columnName.includes('tcc') && columnName.includes('25')) transformedRow.tcc_p25 = numValue;
        else if (columnName.includes('tcc') && columnName.includes('median')) transformedRow.tcc_p50 = numValue;
        else if (columnName.includes('tcc') && columnName.includes('75')) transformedRow.tcc_p75 = numValue;
        else if (columnName.includes('tcc') && columnName.includes('90')) transformedRow.tcc_p90 = numValue;
        
        // WRVU (Work RVU) patterns
        else if (columnName.includes('wrvu') && columnName.includes('25')) transformedRow.wrvu_p25 = numValue;
        else if (columnName.includes('wrvu') && columnName.includes('median')) transformedRow.wrvu_p50 = numValue;
        else if (columnName.includes('wrvu') && columnName.includes('75')) transformedRow.wrvu_p75 = numValue;
        else if (columnName.includes('wrvu') && columnName.includes('90')) transformedRow.wrvu_p90 = numValue;
        else if (columnName.includes('rvu') && columnName.includes('25')) transformedRow.wrvu_p25 = numValue;
        else if (columnName.includes('rvu') && columnName.includes('median')) transformedRow.wrvu_p50 = numValue;
        else if (columnName.includes('rvu') && columnName.includes('75')) transformedRow.wrvu_p75 = numValue;
        else if (columnName.includes('rvu') && columnName.includes('90')) transformedRow.wrvu_p90 = numValue;
        
        // CF (Conversion Factor) patterns
        else if (columnName.includes('cf') && columnName.includes('25')) transformedRow.cf_p25 = numValue;
        else if (columnName.includes('cf') && columnName.includes('median')) transformedRow.cf_p50 = numValue;
        else if (columnName.includes('cf') && columnName.includes('75')) transformedRow.cf_p75 = numValue;
        else if (columnName.includes('cf') && columnName.includes('90')) transformedRow.cf_p90 = numValue;
        else if (columnName.includes('conversion') && columnName.includes('25')) transformedRow.cf_p25 = numValue;
        else if (columnName.includes('conversion') && columnName.includes('median')) transformedRow.cf_p50 = numValue;
        else if (columnName.includes('conversion') && columnName.includes('75')) transformedRow.cf_p75 = numValue;
        else if (columnName.includes('conversion') && columnName.includes('90')) transformedRow.cf_p90 = numValue;
        
        // Organization and incumbent patterns
        else if (columnName.includes('org') && !columnName.includes('incumbent')) transformedRow.n_orgs = numValue;
        else if (columnName.includes('incumbent')) transformedRow.n_incumbents = numValue;
      }
    }
    
    // Debug: Log column mapping results for first few rows
    if (Math.random() < 0.05) { // Log 5% of rows for debugging - more frequent
      console.log('🔍 Column mapping debug:', {
        surveySource,
        originalSpecialty: row.specialty,
        mappedColumns,
        availableColumns: Object.keys(row),
        columnMappingLookupSize: columnMappingLookup.size,
        sampleMappings: Array.from(columnMappingLookup.entries()).slice(0, 5),
        // Add compensation-specific debugging
        tccValues: {
          p25: transformedRow.tcc_p25,
          p50: transformedRow.tcc_p50,
          p75: transformedRow.tcc_p75,
          p90: transformedRow.tcc_p90
        },
        wrvuValues: {
          p25: transformedRow.wrvu_p25,
          p50: transformedRow.wrvu_p50,
          p75: transformedRow.wrvu_p75,
          p90: transformedRow.wrvu_p90
        },
        cfValues: {
          p25: transformedRow.cf_p25,
          p50: transformedRow.cf_p50,
          p75: transformedRow.cf_p75,
          p90: transformedRow.cf_p90
        }
      });
      
      // Also log the actual row data to see what columns exist
      console.log('📊 Raw row data sample:', {
        surveySource,
        specialty: row.specialty,
        allColumns: Object.keys(row),
        sampleValues: Object.entries(row).slice(0, 10).map(([k, v]) => `${k}: ${v}`)
      });
    }
    
    // PERFORMANCE OPTIMIZATION: Only do intelligent mapping if no columns mapped
    if (mappedColumns === 0) {
      const intelligentMappings = createIntelligentMappings(row, surveySource);
      
      for (const [originalColumn, value] of Object.entries(row)) {
        const mapping = intelligentMappings.find((m: {sourceColumn: string, targetColumn: string, confidence: number}) => m.sourceColumn === originalColumn);
        if (mapping && value !== undefined && value !== null) {
          transformedRow[mapping.targetColumn] = Number(value) || 0;
          mappedColumns++;
        }
      }
    }
    
    // Debug: Log if no TCC/WRVU/CF values were mapped
    if (mappedColumns === 0) {
      console.log('⚠️ No columns mapped for row:', {
        surveySource,
        originalSpecialty: row.specialty,
        availableColumns: Object.keys(row),
        sampleValues: Object.entries(row).slice(0, 5).map(([k, v]) => `${k}: ${v}`),
        // Show all column names that might contain compensation data
        compensationColumns: Object.keys(row).filter(col => 
          col.toLowerCase().includes('tcc') || 
          col.toLowerCase().includes('wrvu') || 
          col.toLowerCase().includes('rvu') || 
          col.toLowerCase().includes('cf') || 
          col.toLowerCase().includes('conversion') || 
          col.toLowerCase().includes('comp') ||
          col.toLowerCase().includes('total')
        )
      });
    }
    
    // Debug: Log if compensation values are all zero
    if (transformedRow.tcc_p50 === 0 && transformedRow.wrvu_p50 === 0 && transformedRow.cf_p50 === 0) {
      console.log('💰 No compensation data found for row:', {
        surveySource,
        originalSpecialty: row.specialty,
        mappedColumns,
        availableColumns: Object.keys(row),
        compensationColumns: Object.keys(row).filter(col => 
          col.toLowerCase().includes('tcc') || 
          col.toLowerCase().includes('wrvu') || 
          col.toLowerCase().includes('rvu') || 
          col.toLowerCase().includes('cf') || 
          col.toLowerCase().includes('conversion') || 
          col.toLowerCase().includes('comp') ||
          col.toLowerCase().includes('total')
        ),
        finalValues: {
          tcc_p50: transformedRow.tcc_p50,
          wrvu_p50: transformedRow.wrvu_p50,
          cf_p50: transformedRow.cf_p50
        }
      });
    }
    
    // ALWAYS log the first few rows to see what's happening
    if (Math.random() < 0.02) { // Log 2% of rows - very frequent
      console.log('🔍 ALWAYS DEBUG - Row transformation:', {
        surveySource,
        originalSpecialty: row.specialty,
        mappedColumns,
        availableColumns: Object.keys(row),
        compensationColumns: Object.keys(row).filter(col => 
          col.toLowerCase().includes('tcc') || 
          col.toLowerCase().includes('wrvu') || 
          col.toLowerCase().includes('rvu') || 
          col.toLowerCase().includes('cf') || 
          col.toLowerCase().includes('conversion') || 
          col.toLowerCase().includes('comp') ||
          col.toLowerCase().includes('total')
        ),
        sampleValues: Object.entries(row).slice(0, 10).map(([k, v]) => `${k}: ${v}`),
        finalCompensationValues: {
          tcc_p25: transformedRow.tcc_p25,
          tcc_p50: transformedRow.tcc_p50,
          tcc_p75: transformedRow.tcc_p75,
          tcc_p90: transformedRow.tcc_p90,
          wrvu_p25: transformedRow.wrvu_p25,
          wrvu_p50: transformedRow.wrvu_p50,
          wrvu_p75: transformedRow.wrvu_p75,
          wrvu_p90: transformedRow.wrvu_p90,
          cf_p25: transformedRow.cf_p25,
          cf_p50: transformedRow.cf_p50,
          cf_p75: transformedRow.cf_p75,
          cf_p90: transformedRow.cf_p90
        }
      });
    }

    return transformedRow;
  });
};

const SurveyAnalytics = React.memo(function SurveyAnalytics() {
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
  const [columnMappings, setColumnMappings] = useState<any[]>([]);
  const [regionMappings, setRegionMappings] = useState<any[]>([]);
  const [surveys, setSurveys] = useState<Record<string, ISurveyRow[]>>({});
  // Persist filters in localStorage to survive component re-renders (e.g., sidebar toggle)
  const [filters, setFilters] = useState(() => {
    try {
      const savedFilters = localStorage.getItem('analyticsFilters');
      if (savedFilters) {
        return JSON.parse(savedFilters);
      }
    } catch (error) {
      console.warn('Failed to load saved filters:', error);
    }
    return {
      specialty: '',
      providerType: '',
      region: '',
      surveySource: ''
    };
  });

  // PERFORMANCE OPTIMIZATION: Add loading states for better UX
  const [isDataProcessing, setIsDataProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<any[]>([]);

  const { currentYear, availableYears, setCurrentYear } = useYear();
  const dataService = useMemo(() => getDataService(), []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('analyticsFilters', JSON.stringify(filters));
    } catch (error) {
      console.warn('Failed to save filters:', error);
    }
  }, [filters]);

  // PERFORMANCE OPTIMIZATION: Memoize expensive lookups
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

  // PERFORMANCE OPTIMIZATION: Move data transformation to a separate effect
  useEffect(() => {
    if (!surveys || Object.keys(surveys).length === 0 || !columnMappings.length || !mappings.length) {
      console.log('Missing data for processing:', {
        surveysCount: surveys ? Object.keys(surveys).length : 0,
        columnMappingsLength: columnMappings.length,
        mappingsLength: mappings.length
      });
      setProcessedData([]);
      return;
    }

    setIsDataProcessing(true);
    
    // Use setTimeout to defer heavy processing and prevent blocking the UI
    const timeoutId = setTimeout(async () => {
      const startTime = performance.now();
      
      // Load variable mappings
      const variableMappings = await getVariableMappings();
      console.log('📊 Variable mappings loaded:', {
        count: variableMappings.length,
        mappings: variableMappings.map(m => ({
          type: m.variableType,
          standardizedName: m.standardizedName,
          sources: m.sourceVariables.map(s => `${s.surveySource}: ${s.originalVariableName}`)
        }))
      });
      
      const allData: any[] = [];
      Object.entries(surveys).forEach(([surveyId, surveyData]) => {
        if (surveyData && surveyData.length > 0) {
          const transformed = transformSurveyData(surveyData, columnMappings, mappings, surveyId, variableMappings, regionMappings);
          allData.push(...transformed);
        }
      });
      
      console.log('Data processing results:', {
        totalProcessedRows: allData.length,
        availableSpecialties: [...new Set(allData.map(row => row.specialty))].slice(0, 10),
        surveySources: [...new Set(allData.map(row => row.surveySource))].slice(0, 5),
        sampleRow: allData[0],
        // Debug: Show heart-related specialties
        heartSpecialties: [...new Set(allData.map(row => row.specialty))].filter(s => s && s.toLowerCase().includes('heart')).slice(0, 10),
        // Debug: Check for TCC/WRVU/CF values
        rowsWithTCC: allData.filter(row => row.tcc_p50 > 0).length,
        rowsWithWRVU: allData.filter(row => row.wrvu_p50 > 0).length,
        rowsWithCF: allData.filter(row => row.cf_p50 > 0).length,
        totalRows: allData.length
      });
      
      setProcessedData(allData);
      setIsDataProcessing(false);
      
      const endTime = performance.now();
      console.log(`Data transformation completed in ${endTime - startTime}ms`);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [surveys, columnMappings, mappings]);

  // Debug: Log column mappings on load
  useEffect(() => {
    console.log('🔧 Column mappings loaded:', {
      totalMappings: columnMappings.length,
      mappingsBySurvey: columnMappings.reduce((acc: any, mapping: any) => {
        mapping.sourceColumns.forEach((col: any) => {
          if (!acc[col.surveySource]) acc[col.surveySource] = [];
          acc[col.surveySource].push({
            originalName: col.name,
            standardizedName: mapping.standardizedName
          });
        });
        return acc;
      }, {}),
      sampleMappings: columnMappings.slice(0, 3).map(m => ({
        standardizedName: m.standardizedName,
        sourceColumns: m.sourceColumns.map((c: any) => c.name)
      })),
      // Check for compensation-related mappings
      compensationMappings: columnMappings.filter(m => 
        m.standardizedName.toLowerCase().includes('tcc') || 
        m.standardizedName.toLowerCase().includes('wrvu') || 
        m.standardizedName.toLowerCase().includes('cf') ||
        m.standardizedName.toLowerCase().includes('comp')
      ).map(m => ({
        standardizedName: m.standardizedName,
        sourceColumns: m.sourceColumns.map((c: any) => c.name)
      }))
    });
  }, [columnMappings]);

  // PERFORMANCE OPTIMIZATION: Memoize unique values calculation
  const uniqueValues = useMemo(() => {
    if (!processedData.length) {
      return {
        specialties: [],
        providerTypes: [],
        regions: [],
        surveySources: []
      };
    }

    const values = {
      specialties: new Set<string>(),
      providerTypes: new Set<string>(),
      regions: new Set<string>(),
      surveySources: new Set<string>()
    };

    // Get all standardized names from actual mappings
    mappings.forEach(mapping => {
      if (mapping.standardizedName) {
        values.specialties.add(mapping.standardizedName);
      }
    });

    // Build cascading sets based on current selections
    const selectedMapping = mappings.find(m => m.standardizedName === filters.specialty);
    const sourceNamesBySurvey = new Map<string, string[]>();
    if (selectedMapping) {
      selectedMapping.sourceSpecialties.forEach(src => {
        const list = sourceNamesBySurvey.get(src.surveySource) || [];
        list.push(src.specialty);
        sourceNamesBySurvey.set(src.surveySource, list);
      });
    }

    processedData.forEach(row => {
      const surveySource = String(row.surveySource || '');
      
      // Always add survey sources to maintain all options in dropdown
      if (row.surveySource) {
        values.surveySources.add(String(row.surveySource));
      }

      // For other filters, apply cascading logic
      if (filters.surveySource && surveySource.toLowerCase() !== filters.surveySource.toLowerCase()) return;

      if (filters.specialty) {
        const rowSpec = String(row.specialty || '');
        const direct = rowSpec.toLowerCase() === filters.specialty.toLowerCase();
        const srcList = sourceNamesBySurvey.get(surveySource) || [];
        const viaSource = srcList.some(name => fuzzyMatchSpecialty(rowSpec, name));
        if (!direct && !viaSource) return;
      }

      if (row.providerType) {
        values.providerTypes.add(String(row.providerType));
      }
      const region = (row as any).geographicRegion || (row as any).geographic_region;
      if (region) {
        values.regions.add(String(region));
      }
    });

    // Build region options from parent (standardized) region mappings when available
    const parentRegionSet = new Set<string>();
    if (Array.isArray(regionMappings) && regionMappings.length > 0) {
      regionMappings.forEach((mapping: any) => {
        if (mapping && mapping.standardizedName) {
          parentRegionSet.add(String(mapping.standardizedName));
        }
      });
    }

    const regionOptions = parentRegionSet.size > 0
      ? Array.from(parentRegionSet).sort()
      : Array.from(values.regions).sort();

    return {
      specialties: Array.from(values.specialties).sort(),
      providerTypes: Array.from(values.providerTypes).sort(),
      regions: regionOptions,
      surveySources: Array.from(values.surveySources).sort()
    };
  }, [processedData, mappings, filters, regionMappings]);

  // PERFORMANCE OPTIMIZATION: Optimize data loading with pagination
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Load specialty mappings from DataService
        const allMappings = await dataService.getAllSpecialtyMappings();
        setMappings(allMappings);

        // Load column mappings
        const loadedColumnMappings = await dataService.getAllColumnMappings();
        console.log('📋 Loaded column mappings:', {
          count: loadedColumnMappings.length,
          mappings: loadedColumnMappings.map(m => ({
            standardizedName: m.standardizedName,
            sourceColumns: m.sourceColumns?.length || 0
          }))
        });
        setColumnMappings(loadedColumnMappings);

        // Load region mappings
        const loadedRegionMappings = await dataService.getRegionMappings();
        console.log('🌍 Loaded region mappings:', {
          count: loadedRegionMappings.length,
          mappings: loadedRegionMappings.map(m => ({
            standardizedName: m.standardizedName,
            sourceRegions: m.sourceRegions?.length || 0
          }))
        });
        setRegionMappings(loadedRegionMappings);

        // Get survey data from DataService with pagination
        const uploadedSurveys = await dataService.getAllSurveys();
        
        // Debug: Log the actual survey data structure
        console.log('🔍 SurveyAnalytics: Raw survey data from DataService:', uploadedSurveys.map((s: any) => ({
          id: s.id,
          name: s.name,
          year: s.year,
          surveyYear: s.surveyYear,
          type: s.type,
          surveyType: s.surveyType,
          uploadDate: s.uploadDate
        })));
        
        if (uploadedSurveys.length === 0) {
          setError('No surveys found. Please upload some survey data first.');
          return;
        }
        
        // Filter surveys by current year
        const yearFilteredSurveys = (uploadedSurveys as any[]).filter((survey: any) => {
          // IndexedDB uses 'year' field, BackendService uses 'surveyYear' field
          const surveyYear = survey.year || survey.surveyYear || '';
          return surveyYear === currentYear;
        });
        
        console.log(`📅 Filtering surveys by year ${currentYear}:`, {
          totalSurveys: uploadedSurveys.length,
          yearFilteredSurveys: yearFilteredSurveys.length,
          availableYears: [...new Set(uploadedSurveys.map((s: any) => s.year || s.surveyYear))].sort()
        });
        
        if (yearFilteredSurveys.length === 0) {
          setError(`No surveys found for year ${currentYear}. Available years: ${[...new Set(uploadedSurveys.map((s: any) => s.year || s.surveyYear))].join(', ')}`);
          return;
        }
        
        const surveyData: Record<string, ISurveyRow[]> = {};
        
        // PERFORMANCE OPTIMIZATION: Load surveys in batches
        const batchSize = 3; // Load 3 surveys at a time
        for (let i = 0; i < yearFilteredSurveys.length; i += batchSize) {
          const batch = yearFilteredSurveys.slice(i, i + batchSize);
          
          await Promise.all(batch.map(async (survey: any) => {
            try {
              const surveyType = (survey as any).type;
              const data = await dataService.getSurveyData(survey.id, undefined, { limit: 10000 });
              if (data && data.rows) {
                // Add survey metadata to each row for better display
                const rowsWithMetadata = data.rows.map((row: any) => ({
                  ...row,
                  _surveyId: survey.id,
                  _surveyName: extractCleanSurveyName((survey as any).name || (survey as any).filename || survey.id),
                  _surveyType: surveyType
                }));
                surveyData[survey.id] = rowsWithMetadata;
              }
            } catch (error) {
              console.error(`Error processing survey ${survey.id}:`, error);
            }
          }));
          
          // Update state incrementally for better UX
          setSurveys(prev => ({ ...prev, ...surveyData }));
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [dataService, currentYear]);

  // PERFORMANCE OPTIMIZATION: Optimize aggregated data calculation
  const aggregatedData = useMemo(() => {
    if (!processedData || processedData.length === 0) {
      console.log('No processed data available');
      return [];
    }

    // If no specialty filter is selected, return empty array (no data should be shown)
    if (!filters.specialty) {
      console.log('No specialty filter selected - showing no data');
      return [];
    }

    // If specialty filter is active, find the matching mapping
    console.log('Filtering by specialty:', filters.specialty);
    console.log('Available mappings:', mappings.map(m => m.standardizedName));
    
    // More precise specialty matching - prefer exact matches first
    let selectedMapping = mappings.find(m => 
      m.standardizedName.toLowerCase() === filters.specialty.toLowerCase()
    );
    
    // If no exact match, try partial matching but be more careful
    if (!selectedMapping) {
      selectedMapping = mappings.find(m => {
        const mappingName = m.standardizedName.toLowerCase();
        const filterName = filters.specialty.toLowerCase();
        
        // Only match if the filter is a complete word or the mapping starts with the filter
        return mappingName.startsWith(filterName + ' ') || 
               mappingName === filterName ||
               (filterName.includes(' ') && mappingName.includes(filterName));
      });
    }
    
    if (!selectedMapping) {
      console.log('No mapping found for specialty:', filters.specialty);
      console.log('Available mappings:', mappings.map(m => m.standardizedName));
      return [];
    }

    console.log('Found mapping:', selectedMapping.standardizedName);

    // Debug: Show what specialties are actually in the processed data
    const availableSpecialties = [...new Set(processedData.map(row => row.specialty))].filter(Boolean);
    console.log('Available specialties in processed data:', availableSpecialties.slice(0, 20));
    console.log('Looking for specialty:', selectedMapping.standardizedName);
    
    // Show heart-related specialties specifically
    const heartSpecialties = availableSpecialties.filter(s => s.toLowerCase().includes('heart'));
    console.log('Heart-related specialties in data:', heartSpecialties);
    
    // Use the same approach as Regional Analytics - filter by source specialties
    const mappedSpecialtyNames = selectedMapping.sourceSpecialties.map((spec: any) => spec.specialty);
    console.log('Mapped source specialties:', mappedSpecialtyNames);

    // Use processed data instead of transforming again
    const allMatchingRows = processedData.filter(row => {
      if (!row || !selectedMapping) return false;
      
      // Filter out placeholder or invalid rows
      const surveySource = String(row.surveySource || '').trim();
      const specialty = String(row.specialty || '').trim();
      
      // Skip rows with placeholder values
      if (surveySource.toLowerCase().includes('simple average') || 
          surveySource.toLowerCase().includes('average') ||
          specialty.toLowerCase().includes('simple average') ||
          specialty === '-' || specialty === '') {
        return false;
      }
      
      const rowSpecialty = String(row.specialty || '').trim();
      
      // Use the same filtering logic as Regional Analytics
      const specialtyMatch = mappedSpecialtyNames.some((mappedName: string) => 
        rowSpecialty.toLowerCase().includes(mappedName.toLowerCase()) ||
        mappedName.toLowerCase().includes(rowSpecialty.toLowerCase())
      );
      
      // Debug: Log specialty matching for General Pediatrics specifically
      if (filters.specialty.toLowerCase().includes('pediatrics') || rowSpecialty.toLowerCase().includes('pediatrics')) {
        console.log('🔍 Pediatrics specialty matching:', {
          rowSpecialty: rowSpecialty,
          mappedSpecialtyNames: mappedSpecialtyNames,
          specialtyMatch: specialtyMatch,
          surveySource: surveySource
        });
      }
      
      // Debug: Log the comparison for heart-related specialties
      if (rowSpecialty.toLowerCase().includes('heart') || mappedSpecialtyNames.some(name => name.toLowerCase().includes('heart'))) {
        console.log('Comparing:', {
          rowSpecialty: rowSpecialty,
          mappedSpecialtyNames: mappedSpecialtyNames,
          specialtyMatch: specialtyMatch,
          rowSpecialtyLower: rowSpecialty.toLowerCase()
        });
      }
      
      const providerTypeMatch = !filters.providerType || 
        String((row as any).providerType || (row as any).provider_type || '').toLowerCase().trim() === filters.providerType.toLowerCase().trim();
      const regionMatch = !filters.region || 
        String((row as any).geographicRegion || (row as any).geographic_region || '').toLowerCase().trim() === filters.region.toLowerCase().trim();
      const surveySourceMatch = !filters.surveySource || 
        String(row.surveySource || '').toLowerCase().trim() === filters.surveySource.toLowerCase().trim();
      
      return specialtyMatch && providerTypeMatch && regionMatch && surveySourceMatch;
    });

    console.log('Matching rows found:', allMatchingRows.length);
    
    // Debug: Show what rows are being matched for the selected specialty
    if (allMatchingRows.length > 0) {
      console.log('🔍 Debug: Rows being aggregated for specialty:', filters.specialty);
      console.log('Total matching rows:', allMatchingRows.length);
      
      // Show unique combinations to understand the data structure
      const uniqueCombinations = new Map<string, number>();
      allMatchingRows.forEach(row => {
        const combo = `${row.surveySource}-${row.providerType}-${row.geographicRegion}`;
        uniqueCombinations.set(combo, (uniqueCombinations.get(combo) || 0) + 1);
      });
      
      console.log('🔍 Unique survey-provider-region combinations:', Array.from(uniqueCombinations.entries()));
      
      console.log('Sample matching rows:', allMatchingRows.slice(0, 3).map(row => ({
        surveySource: row.surveySource,
        specialty: row.specialty,
        providerType: row.providerType,
        geographicRegion: row.geographicRegion,
        tcc_p50: row.tcc_p50,
        wrvu_p50: row.wrvu_p50,
        cf_p50: row.cf_p50,
        n_orgs: row.n_orgs,
        n_incumbents: row.n_incumbents
      })));
    }

    if (allMatchingRows.length === 0) return [];

    // Group rows by survey source, provider type, and region only
    // Since we're already filtering by specialty, we don't need to include it in the grouping key
    const groupedRows = new Map<string, ISurveyRow[]>();
    allMatchingRows.forEach(row => {
      // Group by survey source, provider type, and region only
      const key = `${row.surveySource || ''}-${row.providerType || ''}-${row.geographicRegion || ''}`;
      if (!groupedRows.has(key)) {
        groupedRows.set(key, []);
      }
      groupedRows.get(key)?.push(row);
    });

    // Create aggregated rows for each group
    const rows: AggregatedData[] = [];
    
    // Debug: Show grouping information
    console.log('🔍 Debug: Grouping results for specialty:', filters.specialty);
    console.log('Number of groups created:', groupedRows.size);
    
    groupedRows.forEach((groupRows, key) => {
      const row = groupRows[0];
      
      // Debug: Show what's in each group
      console.log('🔍 Group key:', key, 'contains', groupRows.length, 'rows');
      console.log('🔍 Group specialties:', [...new Set(groupRows.map(r => r.specialty))]);
      
      if (groupRows.length > 1) {
        console.log('⚠️ Multiple rows in group - checking for data consistency:', {
          groupKey: key,
          rowCount: groupRows.length,
          specialties: [...new Set(groupRows.map(r => r.specialty))],
          tccValues: groupRows.map(r => r.tcc_p50).filter(v => Number(v) > 0),
          wrvuValues: groupRows.map(r => r.wrvu_p50).filter(v => Number(v) > 0),
          cfValues: groupRows.map(r => r.cf_p50).filter(v => Number(v) > 0)
        });
      }
      
      if (!selectedMapping) return; // Skip if no mapping found
      
      // Dynamic metrics calculation for any variable type
      const metrics: any = {
        n_orgs: groupRows.reduce((sum, r) => sum + (Number(r.n_orgs) || 0), 0),
        n_incumbents: groupRows.reduce((sum, r) => sum + (Number(r.n_incumbents) || 0), 0),
      };
      
      // Standard compensation metrics with their own organizational data
      const standardMetrics = ['tcc', 'wrvu', 'cf'];
      standardMetrics.forEach(type => {
        // Calculate metric-specific organizational data
        const metricOrgField = `${type}_n_orgs`;
        const metricIncField = `${type}_n_incumbents`;
        
        // For metric-specific orgs/incumbents, only count rows that have data for this metric
        const rowsWithMetricData = groupRows.filter(r => {
          const hasData = ['p25', 'p50', 'p75', 'p90'].some(percentile => {
            const fieldName = `${type}_${percentile}`;
            return Number(r[fieldName]) > 0;
          });
          return hasData;
        });
        
        // Calculate metric-specific organizational counts
        metrics[metricOrgField] = rowsWithMetricData.reduce((sum, r) => sum + (Number(r.n_orgs) || 0), 0);
        metrics[metricIncField] = rowsWithMetricData.reduce((sum, r) => sum + (Number(r.n_incumbents) || 0), 0);
        
        // Calculate percentiles
        ['p25', 'p50', 'p75', 'p90'].forEach(percentile => {
          const fieldName = `${type}_${percentile}`;
          // Only include non-zero values in percentile calculations to prevent inflation
          const validValues = groupRows.map(r => Number(r[fieldName]) || 0).filter(v => v > 0);
          if (validValues.length > 0) {
            metrics[fieldName] = calculatePercentile(validValues, parseInt(percentile.replace('p', '')));
            
            // Debug: Log percentile calculations for high values
            if (metrics[fieldName] > 500000) {
              console.log('⚠️ High value detected in percentile calculation:', {
                fieldName,
                validValues,
                calculatedPercentile: metrics[fieldName],
                groupKey: key,
                rowCount: groupRows.length
              });
            }
          } else {
            metrics[fieldName] = 0;
          }
        });
      });
      
      // Dynamic metrics for any other variable types
      const allFields = new Set<string>();
      groupRows.forEach(row => {
        Object.keys(row).forEach(key => {
          if (key.includes('_p25') || key.includes('_p50') || key.includes('_p75') || key.includes('_p90')) {
            allFields.add(key);
          }
        });
      });
      
      allFields.forEach(fieldName => {
        if (!metrics[fieldName]) {
          const percentile = fieldName.match(/_p(\d+)$/)?.[1];
          if (percentile) {
            // Only include non-zero values in percentile calculations to prevent inflation
            const validValues = groupRows.map(r => Number(r[fieldName]) || 0).filter(v => v > 0);
            if (validValues.length > 0) {
              metrics[fieldName] = calculatePercentile(validValues, parseInt(percentile));
            } else {
              metrics[fieldName] = 0;
            }
          }
        }
      });

      rows.push({
        standardizedName: selectedMapping.standardizedName,
        surveySource: String(row.surveySource || ''),
        surveySpecialty: String(row.specialty || ''),
        geographicRegion: String(row.geographicRegion || ''),
        ...metrics // Include all dynamic metrics
      });
    });

    console.log('Generated rows for filtered specialty:', rows.length);
    
    // Debug: Show final aggregated results
    if (rows.length > 0) {
      console.log('🔍 Final aggregated results for specialty:', filters.specialty);
      rows.forEach((row, index) => {
        console.log(`Row ${index + 1}:`, {
          surveySource: row.surveySource,
          specialty: row.surveySpecialty,
          region: row.geographicRegion,
          tcc_p50: row.tcc_p50,
          wrvu_p50: row.wrvu_p50,
          cf_p50: row.cf_p50,
          n_orgs: row.n_orgs,
          n_incumbents: row.n_incumbents
        });
      });
    }
    
    return rows;
  }, [filters, mappings, processedData]);

  // PERFORMANCE OPTIMIZATION: Optimize filtering
  const filteredData = useMemo(() => {
    const hasActiveFilters = filters.specialty || filters.surveySource || filters.providerType || filters.region;
    if (!hasActiveFilters) return aggregatedData;
    
    return aggregatedData.filter(row => {
      if (filters.specialty && !row.standardizedName.toLowerCase().includes(filters.specialty.toLowerCase())) {
        return false;
      }
      if (filters.surveySource && !row.surveySource.toLowerCase().includes(filters.surveySource.toLowerCase())) {
        return false;
      }
      if (filters.providerType) {
        const hasProviderType = processedData.some(s =>
          s.specialty === row.surveySpecialty &&
          s.surveySource === row.surveySource &&
          s.providerType?.toLowerCase().includes(filters.providerType.toLowerCase())
        );
        if (!hasProviderType) return false;
      }
      if (filters.region) {
        const hasRegion = processedData.some(s =>
          s.specialty === row.surveySpecialty &&
          s.surveySource === row.surveySource &&
          s.geographicRegion?.toLowerCase().includes(filters.region.toLowerCase())
        );
        if (!hasRegion) return false;
      }

      return true;
    });
  }, [aggregatedData, filters, processedData]);

  // PERFORMANCE OPTIMIZATION: Debounced filter change handler
  const debouncedFilterChange = useMemo(
    () => performanceMonitor.debounce((filterName: string, value: string) => {
      setFilters((prev: typeof filters) => {
        const newFilters = { ...prev, [filterName]: value };
        
        if (filterName === 'specialty') {
          newFilters.providerType = '';
          newFilters.region = '';
          newFilters.surveySource = '';
        }
        
        if (filterName === 'surveySource') {
          newFilters.providerType = '';
          newFilters.region = '';
        }
        
        if (filterName === 'providerType') {
          newFilters.region = '';
        }
        
        return newFilters;
      });
    }, 300),
    []
  );

  const handleFilterChange = (filterName: string, value: string) => {
    debouncedFilterChange(filterName, value);
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
      // TCC metrics with organizational data
      tcc_n_orgs: rows.reduce((sum, r) => sum + (r.tcc_n_orgs || 0), 0),
      tcc_n_incumbents: rows.reduce((sum, r) => sum + (r.tcc_n_incumbents || 0), 0),
      tcc_p25: calculateAverage(rows.map(r => r.tcc_p25)),
      tcc_p50: calculateAverage(rows.map(r => r.tcc_p50)),
      tcc_p75: calculateAverage(rows.map(r => r.tcc_p75)),
      tcc_p90: calculateAverage(rows.map(r => r.tcc_p90)),
      // wRVU metrics with organizational data
      wrvu_n_orgs: rows.reduce((sum, r) => sum + (r.wrvu_n_orgs || 0), 0),
      wrvu_n_incumbents: rows.reduce((sum, r) => sum + (r.wrvu_n_incumbents || 0), 0),
      wrvu_p25: calculateAverage(rows.map(r => r.wrvu_p25)),
      wrvu_p50: calculateAverage(rows.map(r => r.wrvu_p50)),
      wrvu_p75: calculateAverage(rows.map(r => r.wrvu_p75)),
      wrvu_p90: calculateAverage(rows.map(r => r.wrvu_p90)),
      // CF metrics with organizational data
      cf_n_orgs: rows.reduce((sum, r) => sum + (r.cf_n_orgs || 0), 0),
      cf_n_incumbents: rows.reduce((sum, r) => sum + (r.cf_n_incumbents || 0), 0),
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
      // TCC metrics with organizational data
      tcc_n_orgs: rows.reduce((sum, r) => sum + (r.tcc_n_orgs || 0), 0),
      tcc_n_incumbents: rows.reduce((sum, r) => sum + (r.tcc_n_incumbents || 0), 0),
      tcc_p25: calculateWeightedAverage(rows.map(r => r.tcc_p25), rows.map(r => r.n_incumbents)),
      tcc_p50: calculateWeightedAverage(rows.map(r => r.tcc_p50), rows.map(r => r.n_incumbents)),
      tcc_p75: calculateWeightedAverage(rows.map(r => r.tcc_p75), rows.map(r => r.n_incumbents)),
      tcc_p90: calculateWeightedAverage(rows.map(r => r.tcc_p90), rows.map(r => r.n_incumbents)),
      // wRVU metrics with organizational data
      wrvu_n_orgs: rows.reduce((sum, r) => sum + (r.wrvu_n_orgs || 0), 0),
      wrvu_n_incumbents: rows.reduce((sum, r) => sum + (r.wrvu_n_incumbents || 0), 0),
      wrvu_p25: calculateWeightedAverage(rows.map(r => r.wrvu_p25), rows.map(r => r.n_incumbents)),
      wrvu_p50: calculateWeightedAverage(rows.map(r => r.wrvu_p50), rows.map(r => r.n_incumbents)),
      wrvu_p75: calculateWeightedAverage(rows.map(r => r.wrvu_p75), rows.map(r => r.n_incumbents)),
      wrvu_p90: calculateWeightedAverage(rows.map(r => r.wrvu_p90), rows.map(r => r.n_incumbents)),
      // CF metrics with organizational data
      cf_n_orgs: rows.reduce((sum, r) => sum + (r.cf_n_orgs || 0), 0),
      cf_n_incumbents: rows.reduce((sum, r) => sum + (r.cf_n_incumbents || 0), 0),
      cf_p25: calculateWeightedAverage(rows.map(r => r.cf_p25), rows.map(r => r.n_incumbents)),
      cf_p50: calculateWeightedAverage(rows.map(r => r.cf_p50), rows.map(r => r.n_incumbents)),
      cf_p75: calculateWeightedAverage(rows.map(r => r.cf_p75), rows.map(r => r.n_incumbents)),
      cf_p90: calculateWeightedAverage(rows.map(r => r.cf_p90), rows.map(r => r.n_incumbents))
    };

    return { simple, weighted };
  };

  // PERFORMANCE OPTIMIZATION: Show loading state for data processing
  if (isLoading || isDataProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner 
          message={isDataProcessing ? "Processing survey data..." : "Loading survey analytics..."} 
          fullScreen={false}
          size="lg"
        />
      </div>
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
    <>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          {/* Year Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <FormControl fullWidth size="small">
              <Select
                value={currentYear}
                onChange={(e: React.ChangeEvent<{ value: unknown }>) => {
                  setCurrentYear(e.target.value as string);
                }}
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
                {availableYears.map(year => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

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
              renderOption={(props: any, option: string) => {
                const { key, ...otherProps } = props;
                return (
                  <li key={key} {...otherProps}>
                    {option === '' ? 'All Specialties' : formatSpecialtyForDisplay(option)}
                  </li>
                );
              }}
              filterOptions={(options: string[], { inputValue }: { inputValue: string }) => {
                const base = filterSpecialtyOptions(options, inputValue);
                // Keep "All Specialties" if present
                return options[0] === '' && base.indexOf('') === -1 ? ['', ...base.filter(o => o !== '')] : base;
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
                renderValue={(value: unknown) => {
                  const v = (value as string) || '';
                  if (!v) {
                    return <span style={{ color: '#9ca3af' }}>All Regions</span>;
                  }
                  return formatRegionForDisplay(v);
                }}
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
                    {formatRegionForDisplay(region)}
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
                const clearedFilters = { specialty: '', providerType: '', region: '', surveySource: '' };
                setFilters(clearedFilters);
                // Also clear from localStorage
                try {
                  localStorage.setItem('analyticsFilters', JSON.stringify(clearedFilters));
                } catch (error) {
                  console.warn('Failed to clear saved filters:', error);
                }
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Survey Analytics Data</h3>
            <p className="text-sm text-gray-600 mt-1">Scroll horizontally to view all columns • Hover over truncated text for full content</p>
          </div>
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
          <div>
            <TableContainer 
              sx={{ 
                overflowX: 'auto', 
                overflowY: 'hidden',
                border: '1px solid #e5e7eb', 
                borderRadius: '8px',
                width: '100%',
                padding: 0,
                margin: 0,
                '& .MuiTable-root': {
                  width: '100%', // Use full container width
                  tableLayout: 'auto', // Allow flexible column sizing
                  margin: 0,
                  padding: 0
                },
                '& .MuiTableContainer-root': {
                  padding: 0,
                  margin: 0
                },
                '&::-webkit-scrollbar': {
                  height: '12px'
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f1f1',
                  borderRadius: '6px'
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#cbd5e1',
                  borderRadius: '6px',
                  '&:hover': {
                    background: '#94a3b8'
                  }
                }
              }}
            >
              <Table size="small" sx={{ width: '100%' }}>
                <TableHead>
                  <TableRow>
                    <TableCell colSpan={2} sx={{ backgroundColor: '#f8fafc', fontWeight: 'bold', borderBottom: '2px solid #e2e8f0' }}>
                      Survey Information
                    </TableCell>
                    <TableCell colSpan={6} align="center" sx={{ backgroundColor: '#dbeafe', fontWeight: 'bold', borderLeft: '2px solid #e2e8f0', borderBottom: '2px solid #e2e8f0' }}>
                      Total Cash Compensation (TCC)
                    </TableCell>
                    <TableCell colSpan={6} align="center" sx={{ backgroundColor: '#dcfce7', fontWeight: 'bold', borderLeft: '2px solid #e2e8f0', borderBottom: '2px solid #e2e8f0' }}>
                      Work RVUs (wRVU)
                    </TableCell>
                    <TableCell colSpan={6} align="center" sx={{ backgroundColor: '#fef3c7', fontWeight: 'bold', borderLeft: '2px solid #e2e8f0', borderBottom: '2px solid #e2e8f0' }}>
                      Conversion Factor (CF)
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    {/* Survey Info Headers - Removed specialty column */}
                    <TableCell sx={{ 
                      backgroundColor: '#f8fafc', 
                      fontWeight: 'bold', 
                      fontSize: '0.875rem', 
                      width: '20%', 
                      minWidth: '200px',
                      whiteSpace: 'normal',
                      wordWrap: 'break-word',
                      lineHeight: '1.4'
                    }}>Survey Source</TableCell>
                    <TableCell sx={{ 
                      backgroundColor: '#f8fafc', 
                      fontWeight: 'bold', 
                      fontSize: '0.875rem', 
                      width: '12%', 
                      minWidth: '120px',
                      whiteSpace: 'normal',
                      wordWrap: 'break-word',
                      lineHeight: '1.4'
                    }}>Region</TableCell>

                    
                    {/* TCC Headers - Increased for currency formatting */}
                    <TableCell sx={{ backgroundColor: '#dbeafe', borderLeft: '2px solid #e2e8f0', textAlign: 'right', fontSize: '0.875rem', width: '7%', minWidth: '80px' }}>N Orgs</TableCell>
                    <TableCell sx={{ backgroundColor: '#dbeafe', textAlign: 'right', fontSize: '0.875rem', width: '7%', minWidth: '80px' }}>N Inc</TableCell>
                    <TableCell sx={{ backgroundColor: '#dbeafe', textAlign: 'right', fontSize: '0.875rem', width: '7%', minWidth: '80px' }}>P25</TableCell>
                    <TableCell sx={{ backgroundColor: '#dbeafe', textAlign: 'right', fontSize: '0.875rem', width: '7%', minWidth: '80px' }}>P50</TableCell>
                    <TableCell sx={{ backgroundColor: '#dbeafe', textAlign: 'right', fontSize: '0.875rem', width: '7%', minWidth: '80px' }}>P75</TableCell>
                    <TableCell sx={{ backgroundColor: '#dbeafe', textAlign: 'right', fontSize: '0.875rem', width: '7%', minWidth: '80px' }}>P90</TableCell>
                    
                    {/* wRVU Headers - Increased for decimal formatting */}
                    <TableCell sx={{ backgroundColor: '#dcfce7', borderLeft: '2px solid #e2e8f0', textAlign: 'right', fontSize: '0.875rem', width: '7%', minWidth: '80px' }}>N Orgs</TableCell>
                    <TableCell sx={{ backgroundColor: '#dcfce7', textAlign: 'right', fontSize: '0.875rem', width: '7%', minWidth: '80px' }}>N Inc</TableCell>
                    <TableCell sx={{ backgroundColor: '#dcfce7', textAlign: 'right', fontSize: '0.875rem', width: '7%', minWidth: '80px' }}>P25</TableCell>
                    <TableCell sx={{ backgroundColor: '#dcfce7', textAlign: 'right', fontSize: '0.875rem', width: '7%', minWidth: '80px' }}>P50</TableCell>
                    <TableCell sx={{ backgroundColor: '#dcfce7', textAlign: 'right', fontSize: '0.875rem', width: '7%', minWidth: '80px' }}>P75</TableCell>
                    <TableCell sx={{ backgroundColor: '#dcfce7', textAlign: 'right', fontSize: '0.875rem', width: '7%', minWidth: '80px' }}>P90</TableCell>
                    
                    {/* CF Headers - Increased for currency formatting */}
                    <TableCell sx={{ backgroundColor: '#fef3c7', borderLeft: '2px solid #e2e8f0', textAlign: 'right', fontSize: '0.875rem', width: '7%', minWidth: '80px' }}>N Orgs</TableCell>
                    <TableCell sx={{ backgroundColor: '#fef3c7', textAlign: 'right', fontSize: '0.875rem', width: '7%', minWidth: '80px' }}>N Inc</TableCell>
                    <TableCell sx={{ backgroundColor: '#fef3c7', textAlign: 'right', fontSize: '0.875rem', width: '7%', minWidth: '80px' }}>P25</TableCell>
                    <TableCell sx={{ backgroundColor: '#fef3c7', textAlign: 'right', fontSize: '0.875rem', width: '7%', minWidth: '80px' }}>P50</TableCell>
                    <TableCell sx={{ backgroundColor: '#fef3c7', textAlign: 'right', fontSize: '0.875rem', width: '7%', minWidth: '80px' }}>P75</TableCell>
                    <TableCell sx={{ backgroundColor: '#fef3c7', textAlign: 'right', fontSize: '0.875rem', width: '7%', minWidth: '80px' }}>P90</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* PERFORMANCE OPTIMIZATION: Limit displayed data for better performance */}
          {Object.entries(groupBySpecialty(filteredData)).slice(0, 25).map(([specialty, rows]) => (
                      <React.Fragment key={specialty}>
                        {rows.map((row, idx) => (
                          <TableRow 
                            key={`${specialty}-${idx}`}
                            sx={{ 
                              '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' },
                              '&:hover': { backgroundColor: '#f1f5f9' },
                              transition: 'background-color 0.2s',
                              '& td': {
                                borderBottom: '1px solid #e5e7eb',
                                padding: '12px 16px',
                                verticalAlign: 'top'
                              }
                            }}
                          >
                            <TableCell sx={{ 
                              fontSize: '0.875rem', 
                              width: '20%', 
                              minWidth: '200px',
                              whiteSpace: 'normal',
                              wordWrap: 'break-word',
                              lineHeight: '1.4',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }}>{row.surveySource}</TableCell>
                            <TableCell sx={{ 
                              fontSize: '0.875rem', 
                              width: '12%', 
                              minWidth: '120px',
                              whiteSpace: 'normal',
                              wordWrap: 'break-word',
                              lineHeight: '1.4',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }}>{row.geographicRegion || 'N/A'}</TableCell>

                            
                            {/* TCC Values */}
                            <TableCell sx={{ 
                              borderLeft: '2px solid #e2e8f0', 
                              width: '7%', 
                              minWidth: '80px',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }} align="right">{row.tcc_n_orgs?.toLocaleString() || row.n_orgs?.toLocaleString() || '0'}</TableCell>
                            <TableCell sx={{ 
                              width: '7%', 
                              minWidth: '80px',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }} align="right">{row.tcc_n_incumbents?.toLocaleString() || row.n_incumbents?.toLocaleString() || '0'}</TableCell>
                            <TableCell sx={{ 
                              width: '7%', 
                              minWidth: '80px',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }} align="right">{formatCurrency(row.tcc_p25, 2)}</TableCell>
                            <TableCell sx={{ 
                              width: '7%', 
                              minWidth: '80px',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }} align="right">{formatCurrency(row.tcc_p50, 2)}</TableCell>
                            <TableCell sx={{ 
                              width: '7%', 
                              minWidth: '80px',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }} align="right">{formatCurrency(row.tcc_p75, 2)}</TableCell>
                            <TableCell sx={{ 
                              width: '7%', 
                              minWidth: '80px',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }} align="right">{formatCurrency(row.tcc_p90, 2)}</TableCell>
                            
                            {/* wRVU Values */}
                            <TableCell sx={{ 
                              borderLeft: '2px solid #e2e8f0', 
                              width: '7%', 
                              minWidth: '80px',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }} align="right">{row.wrvu_n_orgs?.toLocaleString() || row.n_orgs?.toLocaleString() || '0'}</TableCell>
                            <TableCell sx={{ 
                              width: '7%', 
                              minWidth: '80px',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }} align="right">{row.wrvu_n_incumbents?.toLocaleString() || row.n_incumbents?.toLocaleString() || '0'}</TableCell>
                            <TableCell sx={{ 
                              width: '7%', 
                              minWidth: '80px',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }} align="right">{formatNumber(row.wrvu_p25)}</TableCell>
                            <TableCell sx={{ 
                              width: '7%', 
                              minWidth: '80px',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }} align="right">{formatNumber(row.wrvu_p50)}</TableCell>
                            <TableCell sx={{ 
                              width: '7%', 
                              minWidth: '80px',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }} align="right">{formatNumber(row.wrvu_p75)}</TableCell>
                            <TableCell sx={{ 
                              width: '7%', 
                              minWidth: '80px',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }} align="right">{formatNumber(row.wrvu_p90)}</TableCell>
                            
                            {/* CF Values */}
                            <TableCell sx={{ 
                              borderLeft: '2px solid #e2e8f0', 
                              width: '7%', 
                              minWidth: '80px',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }} align="right">{row.cf_n_orgs?.toLocaleString() || row.n_orgs?.toLocaleString() || '0'}</TableCell>
                            <TableCell sx={{ 
                              width: '7%', 
                              minWidth: '80px',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }} align="right">{row.cf_n_incumbents?.toLocaleString() || row.n_incumbents?.toLocaleString() || '0'}</TableCell>
                            <TableCell sx={{ 
                              width: '7%', 
                              minWidth: '80px',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }} align="right">{formatCurrency(row.cf_p25, 2)}</TableCell>
                            <TableCell sx={{ 
                              width: '7%', 
                              minWidth: '80px',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }} align="right">{formatCurrency(row.cf_p50, 2)}</TableCell>
                            <TableCell sx={{ 
                              width: '7%', 
                              minWidth: '80px',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }} align="right">{formatCurrency(row.cf_p75, 2)}</TableCell>
                            <TableCell sx={{ 
                              width: '7%', 
                              minWidth: '80px',
                              padding: '12px 16px',
                              verticalAlign: 'top',
                              borderBottom: '1px solid #e5e7eb'
                            }} align="right">{formatCurrency(row.cf_p90, 2)}</TableCell>
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
                                <TableCell sx={{ 
                                  fontWeight: 'bold', 
                                  fontSize: '0.875rem',
                                  width: '20%', 
                                  minWidth: '200px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }}>Simple Average</TableCell>
                                <TableCell sx={{ 
                                  fontSize: '0.875rem',
                                  width: '12%', 
                                  minWidth: '120px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }}>-</TableCell>

                                
                                {/* TCC Values */}
                                <TableCell sx={{ 
                                  borderLeft: '2px solid #e2e8f0',
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{simple.tcc_n_orgs?.toLocaleString() || simple.n_orgs?.toLocaleString() || '0'}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{simple.tcc_n_incumbents?.toLocaleString() || simple.n_incumbents?.toLocaleString() || '0'}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatCurrency(simple.tcc_p25)}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatCurrency(simple.tcc_p50)}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatCurrency(simple.tcc_p75)}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatCurrency(simple.tcc_p90)}</TableCell>
                                
                                {/* wRVU Values */}
                                <TableCell sx={{ 
                                  borderLeft: '2px solid #e2e8f0',
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{simple.wrvu_n_orgs?.toLocaleString() || simple.n_orgs?.toLocaleString() || '0'}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{simple.wrvu_n_incumbents?.toLocaleString() || simple.n_incumbents?.toLocaleString() || '0'}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatNumber(simple.wrvu_p25)}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatNumber(simple.wrvu_p50)}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatNumber(simple.wrvu_p75)}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatNumber(simple.wrvu_p90)}</TableCell>
                                
                                {/* CF Values */}
                                <TableCell sx={{ 
                                  borderLeft: '2px solid #e2e8f0',
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{simple.cf_n_orgs?.toLocaleString() || simple.n_orgs?.toLocaleString() || '0'}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{simple.cf_n_incumbents?.toLocaleString() || simple.n_incumbents?.toLocaleString() || '0'}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatCurrency(simple.cf_p25, 2)}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatCurrency(simple.cf_p50, 2)}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatCurrency(simple.cf_p75, 2)}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatCurrency(simple.cf_p90, 2)}</TableCell>
                              </TableRow>
                              <TableRow sx={{ 
                                backgroundColor: '#dbeafe',
                                borderBottom: '2px solid #e2e8f0'
                              }}>
                                <TableCell sx={{ 
                                  fontWeight: 'bold', 
                                  fontSize: '0.875rem',
                                  width: '20%', 
                                  minWidth: '200px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }}>Weighted Average</TableCell>
                                <TableCell sx={{ 
                                  fontSize: '0.875rem',
                                  width: '12%', 
                                  minWidth: '120px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }}>-</TableCell>

                                
                                {/* TCC Values */}
                                <TableCell sx={{ 
                                  borderLeft: '2px solid #e2e8f0',
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{weighted.tcc_n_orgs?.toLocaleString() || weighted.n_orgs?.toLocaleString() || '0'}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{weighted.tcc_n_incumbents?.toLocaleString() || weighted.n_incumbents?.toLocaleString() || '0'}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatCurrency(weighted.tcc_p25)}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatCurrency(weighted.tcc_p50)}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatCurrency(weighted.tcc_p75)}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatCurrency(weighted.tcc_p90)}</TableCell>
                                
                                {/* wRVU Values */}
                                <TableCell sx={{ 
                                  borderLeft: '2px solid #e2e8f0',
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{weighted.wrvu_n_orgs?.toLocaleString() || weighted.n_orgs?.toLocaleString() || '0'}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{weighted.wrvu_n_incumbents?.toLocaleString() || weighted.n_incumbents?.toLocaleString() || '0'}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatNumber(weighted.wrvu_p25)}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatNumber(weighted.wrvu_p50)}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatNumber(weighted.wrvu_p75)}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatNumber(weighted.wrvu_p90)}</TableCell>
                                
                                {/* CF Values */}
                                <TableCell sx={{ 
                                  borderLeft: '2px solid #e2e8f0',
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{weighted.cf_n_orgs?.toLocaleString() || weighted.n_orgs?.toLocaleString() || '0'}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{weighted.cf_n_incumbents?.toLocaleString() || weighted.n_incumbents?.toLocaleString() || '0'}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatCurrency(weighted.cf_p25, 2)}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatCurrency(weighted.cf_p50, 2)}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatCurrency(weighted.cf_p75, 2)}</TableCell>
                                <TableCell sx={{ 
                                  width: '7%', 
                                  minWidth: '80px',
                                  padding: '12px 16px',
                                  verticalAlign: 'top'
                                }} align="right">{formatCurrency(weighted.cf_p90, 2)}</TableCell>
                              </TableRow>
                            </>
                          );
                        })()}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {Object.entries(groupBySpecialty(filteredData)).length > 25 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Showing first 25 specialties for performance. Total: {Object.entries(groupBySpecialty(filteredData)).length} specialties.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
});

SurveyAnalytics.displayName = 'SurveyAnalytics';

export default SurveyAnalytics; 
