/**
 * Auto-Detection Utility
 * 
 * Automatically detects survey metadata (source, year, provider type, data category)
 * from filename and file content to pre-fill the upload form.
 */

import { ProviderDetectionService } from '../../../services/ProviderDetectionService';
import { SURVEY_SOURCES } from '../../../shared/constants';
import { ProviderType, DataCategory } from '../../../types/provider';

export interface AutoDetectionResult {
  surveySource: string;
  surveyYear: string;
  providerType: ProviderType | '';
  dataCategory: DataCategory | '';
  confidence: {
    source: number;
    year: number;
    providerType: number;
    dataCategory: number;
  };
  detectionMethod: {
    source: 'filename' | 'content' | 'none';
    year: 'filename' | 'content' | 'default' | 'none';
    providerType: 'filename' | 'content' | 'none';
    dataCategory: 'filename' | 'content' | 'none';
  };
}

/**
 * Detect survey metadata from filename
 */
export const detectFromFilename = (filename: string): Partial<AutoDetectionResult> => {
  const result: Partial<AutoDetectionResult> = {
    surveySource: '',
    surveyYear: '',
    providerType: '',
    dataCategory: '',
    confidence: {
      source: 0,
      year: 0,
      providerType: 0,
      dataCategory: 0
    },
    detectionMethod: {
      source: 'none',
      year: 'none',
      providerType: 'none',
      dataCategory: 'none'
    }
  };

  const filenameLower = filename.toLowerCase();
  const filenameWithoutExt = filename.replace(/\.(csv|xlsx|xls)$/i, '');

  // Detect year (20XX pattern)
  const yearMatch = filenameWithoutExt.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    const year = yearMatch[1];
    const currentYear = new Date().getFullYear();
    const yearNum = parseInt(year, 10);
    
    // Validate year is reasonable (between 2000 and current year + 1)
    if (yearNum >= 2000 && yearNum <= currentYear + 1) {
      result.surveyYear = year;
      result.confidence!.year = 0.95;
      result.detectionMethod!.year = 'filename';
      console.log(`✅ Auto-detected year: ${year} from filename "${filename}"`);
    }
  }

  // Detect survey source
  for (const source of SURVEY_SOURCES) {
    const sourceLower = source.toLowerCase();
    // More flexible matching - handle variations like "SullivanCotter" vs "Sullivan Cotter"
    const sourcePattern = sourceLower.replace(/\s+/g, '');
    const filenamePattern = filenameLower.replace(/\s+/g, '');
    
    if (filenamePattern.includes(sourcePattern) || filenameLower.includes(sourceLower)) {
      result.surveySource = source;
      result.confidence!.source = 0.9;
      result.detectionMethod!.source = 'filename';
      console.log(`✅ Auto-detected survey source: ${source} from filename "${filename}"`);
      break;
    }
  }

  // Detect provider type from filename
  if (filenameLower.includes('app') || 
      filenameLower.includes('advanced practice') ||
      filenameLower.includes('nurse practitioner') ||
      filenameLower.includes('physician assistant')) {
    result.providerType = 'APP';
    result.confidence!.providerType = 0.85;
    result.detectionMethod!.providerType = 'filename';
  } else if (filenameLower.includes('call pay') || 
             filenameLower.includes('callpay') ||
             filenameLower.includes('call_pay')) {
    result.providerType = 'CALL';
    result.confidence!.providerType = 0.85;
    result.detectionMethod!.providerType = 'filename';
  } else if (filenameLower.includes('physician') || 
             filenameLower.includes('phys') ||
             filenameLower.includes('md') ||
             filenameLower.includes('do')) {
    result.providerType = 'PHYSICIAN';
    result.confidence!.providerType = 0.8;
    result.detectionMethod!.providerType = 'filename';
  }

  // Detect data category from filename
  if (filenameLower.includes('call pay') || 
      filenameLower.includes('callpay') ||
      filenameLower.includes('call_pay')) {
    result.dataCategory = 'CALL_PAY';
    result.confidence!.dataCategory = 0.9;
    result.detectionMethod!.dataCategory = 'filename';
  } else if (filenameLower.includes('moonlighting')) {
    result.dataCategory = 'MOONLIGHTING';
    result.confidence!.dataCategory = 0.9;
    result.detectionMethod!.dataCategory = 'filename';
  } else if (filenameLower.includes('compensation') || 
             filenameLower.includes('comp')) {
    result.dataCategory = 'COMPENSATION';
    result.confidence!.dataCategory = 0.8;
    result.detectionMethod!.dataCategory = 'filename';
  }

  return result;
};

/**
 * Detect survey metadata from file content (headers and sample rows)
 */
export const detectFromContent = async (
  headers: string[],
  sampleRows: any[]
): Promise<Partial<AutoDetectionResult>> => {
  const result: Partial<AutoDetectionResult> = {
    surveySource: '',
    surveyYear: '',
    providerType: '',
    dataCategory: '',
    confidence: {
      source: 0,
      year: 0,
      providerType: 0,
      dataCategory: 0
    },
    detectionMethod: {
      source: 'none',
      year: 'none',
      providerType: 'none',
      dataCategory: 'none'
    }
  };

  const headersLower = headers.map(h => h.toLowerCase());

  // Detect provider type from content using ProviderDetectionService
  if (sampleRows.length > 0) {
    try {
      const providerData = ProviderDetectionService.extractProviderTypesFromData(sampleRows);
      
      if (providerData.dominantType !== 'MIXED' && providerData.confidence > 0.5) {
        result.providerType = providerData.dominantType;
        result.confidence!.providerType = providerData.confidence;
        result.detectionMethod!.providerType = 'content';
      }
    } catch (error) {
      console.warn('Error detecting provider type from content:', error);
    }
  }

  // Detect data category from headers
  const hasCallPayHeaders = headersLower.some(h => 
    h.includes('call') || h.includes('call pay') || h.includes('callpay')
  );
  const hasMoonlightingHeaders = headersLower.some(h => 
    h.includes('moonlighting')
  );
  const hasCompensationHeaders = headersLower.some(h => 
    h.includes('compensation') || h.includes('tcc') || h.includes('total cash')
  );

  if (hasCallPayHeaders) {
    result.dataCategory = 'CALL_PAY';
    result.confidence!.dataCategory = 0.7;
    result.detectionMethod!.dataCategory = 'content';
  } else if (hasMoonlightingHeaders) {
    result.dataCategory = 'MOONLIGHTING';
    result.confidence!.dataCategory = 0.7;
    result.detectionMethod!.dataCategory = 'content';
  } else if (hasCompensationHeaders) {
    result.dataCategory = 'COMPENSATION';
    result.confidence!.dataCategory = 0.6;
    result.detectionMethod!.dataCategory = 'content';
  }

  // Detect year from data (check for year column or year in sample data)
  const yearColumnIndex = headersLower.findIndex(h => 
    h.includes('year') && !h.includes('survey')
  );
  if (yearColumnIndex >= 0 && sampleRows.length > 0) {
    const yearValue = sampleRows[0][headers[yearColumnIndex]];
    if (yearValue) {
      const yearMatch = String(yearValue).match(/\b(20\d{2})\b/);
      if (yearMatch) {
        const year = yearMatch[1];
        const currentYear = new Date().getFullYear();
        const yearNum = parseInt(year, 10);
        if (yearNum >= 2000 && yearNum <= currentYear + 1) {
          result.surveyYear = year;
          result.confidence!.year = 0.8;
          result.detectionMethod!.year = 'content';
        }
      }
    }
  }

  return result;
};

/**
 * Get smart defaults from localStorage (last used values)
 */
export const getSmartDefaults = (): Partial<AutoDetectionResult> => {
  try {
    const stored = localStorage.getItem('uploadFormDefaults');
    if (stored) {
      const defaults = JSON.parse(stored);
      return {
        surveySource: defaults.surveySource || '',
        surveyYear: defaults.surveyYear || '',
        providerType: (defaults.providerType as ProviderType) || '',
        dataCategory: (defaults.dataCategory as DataCategory) || '',
        confidence: {
          source: 0.5, // Lower confidence for stored defaults
          year: 0.5,
          providerType: 0.5,
          dataCategory: 0.5
        },
        detectionMethod: {
          source: 'none',
          year: 'default',
          providerType: 'none',
          dataCategory: 'none'
        }
      };
    }
  } catch (error) {
    console.warn('Error loading smart defaults:', error);
  }

  return {
    surveySource: '',
    surveyYear: '',
    providerType: '',
    dataCategory: '',
    confidence: {
      source: 0,
      year: 0,
      providerType: 0,
      dataCategory: 0
    },
    detectionMethod: {
      source: 'none',
      year: 'default',
      providerType: 'none',
      dataCategory: 'none'
    }
  };
};

/**
 * Save smart defaults to localStorage
 */
export const saveSmartDefaults = (
  surveySource: string,
  surveyYear: string,
  providerType: ProviderType | '',
  dataCategory: DataCategory | ''
): void => {
  try {
    const defaults = {
      surveySource,
      surveyYear,
      providerType,
      dataCategory,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('uploadFormDefaults', JSON.stringify(defaults));
  } catch (error) {
    console.warn('Error saving smart defaults:', error);
  }
};

/**
 * Main auto-detection function
 * Combines filename detection, content detection, and smart defaults
 */
export const autoDetectSurveyMetadata = async (
  file: File,
  headers?: string[],
  sampleRows?: any[]
): Promise<AutoDetectionResult> => {
  // Start with smart defaults (lowest priority)
  const defaults = getSmartDefaults();
  
  // Detect from filename (medium priority)
  const filenameDetection = detectFromFilename(file.name);
  
  // Detect from content if available (highest priority for provider type)
  let contentDetection: Partial<AutoDetectionResult> = {};
  if (headers && sampleRows) {
    contentDetection = await detectFromContent(headers, sampleRows);
  }

  // Merge results with priority: content > filename > defaults
  const result: AutoDetectionResult = {
    surveySource: contentDetection.surveySource || 
                   filenameDetection.surveySource || 
                   defaults.surveySource || 
                   '',
    surveyYear: contentDetection.surveyYear || 
                filenameDetection.surveyYear || 
                defaults.surveyYear || 
                String(new Date().getFullYear()),
    providerType: (contentDetection.providerType || 
                   filenameDetection.providerType || 
                   defaults.providerType || 
                   '') as ProviderType | '',
    dataCategory: contentDetection.dataCategory || 
                  filenameDetection.dataCategory || 
                  defaults.dataCategory || 
                  'COMPENSATION' as DataCategory,
    confidence: {
      source: Math.max(
        contentDetection.confidence?.source || 0,
        filenameDetection.confidence?.source || 0,
        defaults.confidence?.source || 0
      ),
      year: Math.max(
        contentDetection.confidence?.year || 0,
        filenameDetection.confidence?.year || 0,
        defaults.confidence?.year || 0
      ),
      providerType: Math.max(
        contentDetection.confidence?.providerType || 0,
        filenameDetection.confidence?.providerType || 0,
        defaults.confidence?.providerType || 0
      ),
      dataCategory: Math.max(
        contentDetection.confidence?.dataCategory || 0,
        filenameDetection.dataCategory ? 0.8 : 0,
        defaults.confidence?.dataCategory || 0
      )
    },
    detectionMethod: {
      source: contentDetection.detectionMethod?.source || 
              filenameDetection.detectionMethod?.source || 
              defaults.detectionMethod?.source || 
              'none',
      year: contentDetection.detectionMethod?.year || 
            filenameDetection.detectionMethod?.year || 
            defaults.detectionMethod?.year || 
            'default',
      providerType: contentDetection.detectionMethod?.providerType || 
                    filenameDetection.detectionMethod?.providerType || 
                    defaults.detectionMethod?.providerType || 
                    'none',
      dataCategory: contentDetection.detectionMethod?.dataCategory || 
                    filenameDetection.detectionMethod?.dataCategory || 
                    defaults.detectionMethod?.dataCategory || 
                    'none'
    }
  };

  // If data category wasn't detected but provider type is CALL, set it
  if (result.providerType === 'CALL' && !result.dataCategory) {
    result.dataCategory = 'CALL_PAY';
    result.confidence.dataCategory = 0.9;
    result.detectionMethod.dataCategory = 'filename';
  }

  // If no data category detected, default to COMPENSATION
  if (!result.dataCategory) {
    result.dataCategory = 'COMPENSATION';
    result.confidence.dataCategory = 0.5;
    result.detectionMethod.dataCategory = 'none';
  }

  return result;
};
