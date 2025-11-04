/**
 * SullivanCotter source adapter
 * 
 * Handles SullivanCotter survey data format and terminology
 */

import { RawInput } from '../types';
import { parseCSVContent } from './template';

/**
 * Parse SullivanCotter CSV file and convert to RawInput[]
 */
export function toRawInputs(csvPath: string): RawInput[] {
  // In a real implementation, you would read the file here
  // For now, this is a placeholder
  throw new Error('File reading not implemented - use parseCSVContent with file content');
}

/**
 * Parse SullivanCotter CSV content
 * 
 * SullivanCotter typically uses these column names:
 * - "Specialty" or "Medical Specialty"
 * - "Provider Type" (optional)
 * - "Geographic Region" (optional)
 * - "Market" (optional)
 */
export function parseSullivanCotterCSV(csvContent: string): RawInput[] {
  return parseCSVContent(csvContent, 'SullivanCotter');
}

/**
 * SullivanCotter-specific specialty name cleaning
 */
export function cleanSullivanCotterSpecialtyName(rawName: string): string {
  return rawName
    .trim()
    .replace(/^SullivanCotter\s*/i, '') // Remove SullivanCotter prefix if present
    .replace(/\s*\(SullivanCotter\)/i, '') // Remove SullivanCotter suffix if present
    .replace(/\s*\(SC\)/i, '') // Remove SC abbreviation if present
    .trim();
}

/**
 * SullivanCotter-specific metadata extraction
 */
export function extractSullivanCotterMetadata(row: string[], headers: string[]): Record<string, any> {
  const meta: Record<string, any> = {};
  
  // SullivanCotter may have specific columns we want to preserve
  const yearIndex = headers.findIndex(h => h.toLowerCase().includes('year'));
  if (yearIndex !== -1 && row[yearIndex]) {
    meta.year = row[yearIndex];
  }
  
  const marketIndex = headers.findIndex(h => h.toLowerCase().includes('market'));
  if (marketIndex !== -1 && row[marketIndex]) {
    meta.market = row[marketIndex];
  }
  
  const surveyIndex = headers.findIndex(h => h.toLowerCase().includes('survey'));
  if (surveyIndex !== -1 && row[surveyIndex]) {
    meta.survey = row[surveyIndex];
  }
  
  return meta;
}
