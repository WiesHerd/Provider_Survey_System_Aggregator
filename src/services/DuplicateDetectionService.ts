/**
 * Enterprise Duplicate Detection Service
 * Provides comprehensive duplicate detection for survey uploads
 * Following enterprise patterns (Google Drive, Microsoft OneDrive, Amazon S3)
 */

import { DataCategory, ProviderType } from '../types/provider';
import { calculateFileHash, calculateContentHash } from '../features/upload/utils/fileHash';
import { getDataService } from './DataService';
import { logger } from '../shared/utils/logger';

export interface SurveyMetadata {
  source: string;
  dataCategory: DataCategory | string;
  providerType: ProviderType | string;
  year: string;
  surveyLabel?: string;
}

export interface DuplicateCheckInput {
  metadata: SurveyMetadata;
  file?: File;
  fileHash?: string;
  rowCount?: number;
  contentHash?: string;
}

export interface DuplicateMatch {
  survey: any;
  matchType: 'exact' | 'content' | 'similar';
  similarity?: number;
  fileHash?: string;
}

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  exactMatch?: DuplicateMatch;
  contentMatch?: DuplicateMatch;
  similarSurveys: DuplicateMatch[];
  matchType: 'exact' | 'content' | 'similar' | 'none';
  compositeKey: string;
}

/**
 * Duplicate Detection Service
 */
export class DuplicateDetectionService {
  private static instance: DuplicateDetectionService;
  private surveysCache: any[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  private constructor() {}

  public static getInstance(): DuplicateDetectionService {
    if (!DuplicateDetectionService.instance) {
      DuplicateDetectionService.instance = new DuplicateDetectionService();
    }
    return DuplicateDetectionService.instance;
  }

  /**
   * Generate composite key from survey metadata
   * Format: source|dataCategory|providerType|year|surveyLabel
   */
  public generateCompositeKey(metadata: SurveyMetadata): string {
    const normalizedSource = (metadata.source || '').trim().toLowerCase();
    const normalizedCategory = (metadata.dataCategory || '').trim().toLowerCase();
    const normalizedProviderType = (metadata.providerType || '').trim().toLowerCase();
    const normalizedYear = (metadata.year || '').trim();
    const normalizedLabel = (metadata.surveyLabel || '').trim().toLowerCase();
    
    return `${normalizedSource}|${normalizedCategory}|${normalizedProviderType}|${normalizedYear}|${normalizedLabel}`;
  }

  /**
   * Get all surveys with caching
   */
  private async getAllSurveys(): Promise<any[]> {
    const now = Date.now();
    
    // Return cached surveys if still valid
    if (this.surveysCache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.surveysCache;
    }

    try {
      const dataService = getDataService();
      const surveys = await dataService.getAllSurveys();
      
      // Update cache
      this.surveysCache = surveys;
      this.cacheTimestamp = now;
      
      return surveys;
    } catch (error) {
      logger.error('Error fetching surveys for duplicate detection:', error);
      // Return cached data if available, even if stale
      if (this.surveysCache) {
        return this.surveysCache;
      }
      return [];
    }
  }

  /**
   * Check for exact duplicate using composite key
   */
  private checkExactDuplicate(
    compositeKey: string,
    surveys: any[]
  ): DuplicateMatch | undefined {
    for (const survey of surveys) {
      // Handle legacy surveys without new metadata fields
      // Try to extract source from type field if source is missing
      let source = survey.source || '';
      if (!source && survey.type) {
        // Extract source from type (e.g., "MGMA Physician" -> "MGMA")
        const typeParts = survey.type.split(' ');
        source = typeParts[0] || '';
      }
      
      // Handle legacy dataCategory - try to infer from type
      let dataCategory = survey.dataCategory || '';
      if (!dataCategory && survey.type) {
        if (survey.type.toLowerCase().includes('call pay')) {
          dataCategory = 'CALL_PAY';
        } else if (survey.type.toLowerCase().includes('moonlighting')) {
          dataCategory = 'MOONLIGHTING';
        } else {
          dataCategory = 'COMPENSATION'; // Default
        }
      }
      
      const surveyMetadata: SurveyMetadata = {
        source: source,
        dataCategory: dataCategory,
        providerType: survey.providerType || '',
        year: survey.year || '',
        surveyLabel: survey.surveyLabel || survey.metadata?.surveyLabel || ''
      };
      
      const surveyKey = this.generateCompositeKey(surveyMetadata);
      
      if (surveyKey === compositeKey) {
        return {
          survey,
          matchType: 'exact'
        };
      }
    }
    
    return undefined;
  }

  /**
   * Check for content duplicate using file hash
   */
  private async checkContentDuplicate(
    fileHash: string | undefined,
    surveys: any[]
  ): Promise<DuplicateMatch | undefined> {
    if (!fileHash) {
      return undefined;
    }

    for (const survey of surveys) {
      const storedHash = survey.metadata?.fileHash || survey.fileHash;
      
      if (storedHash && storedHash === fileHash) {
        return {
          survey,
          matchType: 'content',
          fileHash: storedHash
        };
      }
    }
    
    return undefined;
  }

  /**
   * Check for similar surveys using fuzzy matching
   */
  private checkSimilarSurveys(
    metadata: SurveyMetadata,
    surveys: any[],
    excludeSurveyId?: string
  ): DuplicateMatch[] {
    const similarSurveys: DuplicateMatch[] = [];
    
    for (const survey of surveys) {
      // Skip if this is the survey we're checking against
      if (excludeSurveyId && survey.id === excludeSurveyId) {
        continue;
      }

      const surveyMetadata: SurveyMetadata = {
        source: survey.source || '',
        dataCategory: survey.dataCategory || '',
        providerType: survey.providerType || '',
        year: survey.year || '',
        surveyLabel: survey.surveyLabel || survey.metadata?.surveyLabel || ''
      };
      
      const similarity = this.calculateSimilarity(metadata, surveyMetadata);
      
      // Consider similar if similarity > 0.7
      if (similarity > 0.7) {
        similarSurveys.push({
          survey,
          matchType: 'similar',
          similarity
        });
      }
    }
    
    // Sort by similarity (highest first)
    similarSurveys.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    
    return similarSurveys;
  }

  /**
   * Calculate similarity between two survey metadata objects
   */
  private calculateSimilarity(
    metadata1: SurveyMetadata,
    metadata2: SurveyMetadata
  ): number {
    let similarity = 0;
    let weight = 0;

    // Source similarity (30% weight)
    if (metadata1.source && metadata2.source) {
      const sourceSim = this.levenshteinSimilarity(
        metadata1.source.toLowerCase(),
        metadata2.source.toLowerCase()
      );
      similarity += sourceSim * 0.3;
      weight += 0.3;
    }

    // Data category similarity (20% weight)
    if (metadata1.dataCategory && metadata2.dataCategory) {
      const categorySim = metadata1.dataCategory === metadata2.dataCategory ? 1 : 0;
      similarity += categorySim * 0.2;
      weight += 0.2;
    }

    // Provider type similarity (20% weight)
    if (metadata1.providerType && metadata2.providerType) {
      const providerSim = metadata1.providerType === metadata2.providerType ? 1 : 0;
      similarity += providerSim * 0.2;
      weight += 0.2;
    }

    // Year similarity (20% weight)
    if (metadata1.year && metadata2.year) {
      const yearSim = metadata1.year === metadata2.year ? 1 : 0;
      similarity += yearSim * 0.2;
      weight += 0.2;
    }

    // Label similarity (10% weight)
    if (metadata1.surveyLabel && metadata2.surveyLabel) {
      const labelSim = this.levenshteinSimilarity(
        metadata1.surveyLabel.toLowerCase(),
        metadata2.surveyLabel.toLowerCase()
      );
      similarity += labelSim * 0.1;
      weight += 0.1;
    }

    // Normalize by weight
    return weight > 0 ? similarity / weight : 0;
  }

  /**
   * Levenshtein similarity (0-1, where 1 is identical)
   */
  private levenshteinSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    const distance = matrix[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  /**
   * Main method to check for duplicates
   */
  public async checkForDuplicates(
    input: DuplicateCheckInput
  ): Promise<DuplicateCheckResult> {
    const startTime = Date.now();
    
    try {
      // Generate composite key
      const compositeKey = this.generateCompositeKey(input.metadata);
      
      // Get all surveys
      const surveys = await this.getAllSurveys();
      
      // Check for exact duplicate
      const exactMatch = this.checkExactDuplicate(compositeKey, surveys);
      
      if (exactMatch) {
        const duration = Date.now() - startTime;
        logger.log(`🔍 Duplicate check completed in ${duration}ms: Exact match found`);
        
        return {
          hasDuplicate: true,
          exactMatch,
          similarSurveys: [],
          matchType: 'exact',
          compositeKey
        };
      }

      // Check for content duplicate (if file hash provided)
      // Only calculate hash if needed (lazy evaluation for performance)
      let fileHash = input.fileHash;
      if (!fileHash && input.file) {
        // Only calculate hash if no exact match found (performance optimization)
        // We already returned above if exact match was found, so we can proceed
        try {
          fileHash = await calculateFileHash(input.file);
        } catch (error) {
          logger.warn('Failed to calculate file hash:', error);
          // Continue without hash - exact match detection still works
        }
      }

      const contentMatch = fileHash
        ? await this.checkContentDuplicate(fileHash, surveys)
        : undefined;

      if (contentMatch) {
        const duration = Date.now() - startTime;
        logger.log(`🔍 Duplicate check completed in ${duration}ms: Content match found`);
        
        return {
          hasDuplicate: true,
          contentMatch,
          similarSurveys: [],
          matchType: 'content',
          compositeKey
        };
      }

      // Check for similar surveys
      const similarSurveys = this.checkSimilarSurveys(input.metadata, surveys);

      const duration = Date.now() - startTime;
      logger.log(`🔍 Duplicate check completed in ${duration}ms: ${similarSurveys.length} similar surveys found`);

      return {
        hasDuplicate: similarSurveys.length > 0,
        similarSurveys,
        matchType: similarSurveys.length > 0 ? 'similar' : 'none',
        compositeKey
      };
    } catch (error) {
      logger.error('Error checking for duplicates:', error);
      
      // On error, return no duplicates to allow upload to proceed
      // User will be warned but not blocked
      return {
        hasDuplicate: false,
        similarSurveys: [],
        matchType: 'none',
        compositeKey: this.generateCompositeKey(input.metadata)
      };
    }
  }

  /**
   * Clear the surveys cache
   * Call this after uploads to ensure fresh data
   */
  public clearCache(): void {
    this.surveysCache = null;
    this.cacheTimestamp = 0;
  }
}

// Export singleton instance
export const duplicateDetectionService = DuplicateDetectionService.getInstance();
