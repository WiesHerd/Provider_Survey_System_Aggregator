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
import { fuzzyMatchSpecialty } from '../shared/utils/specialtyMatching';
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

