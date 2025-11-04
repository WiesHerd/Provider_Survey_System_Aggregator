/**
 * Gallagher source adapter
 * 
 * Handles Gallagher survey data format and terminology
 */

import { RawInput } from '../types';
import { parseCSVContent } from './template';

/**
 * Parse Gallagher CSV file and convert to RawInput[]
 */
export function toRawInputs(csvPath: string): RawInput[] {
  // In a real implementation, you would read the file here
  // For now, this is a placeholder
  throw new Error('File reading not implemented - use parseCSVContent with file content');
}

/**
 * Parse Gallagher CSV content
 * 
 * Gallagher typically uses these column names:
 * - "Specialty" or "Medical Specialty"
 * - "Provider Type" (optional)
 * - "Geographic Region" (optional)
 */
export function parseGallagherCSV(csvContent: string): RawInput[] {
  return parseCSVContent(csvContent, 'Gallagher');
}

/**
 * Gallagher-specific specialty name cleaning
 */
export function cleanGallagherSpecialtyName(rawName: string): string {
  return rawName
    .trim()
    .replace(/^Gallagher\s*/i, '') // Remove Gallagher prefix if present
    .replace(/\s*\(Gallagher\)/i, '') // Remove Gallagher suffix if present
    .trim();
}

/**
 * Gallagher-specific metadata extraction
 */
export function extractGallagherMetadata(row: string[], headers: string[]): Record<string, any> {
  const meta: Record<string, any> = {};
  
  // Gallagher may have specific columns we want to preserve
  const yearIndex = headers.findIndex(h => h.toLowerCase().includes('year'));
  if (yearIndex !== -1 && row[yearIndex]) {
    meta.year = row[yearIndex];
  }
  
  const surveyIndex = headers.findIndex(h => h.toLowerCase().includes('survey'));
  if (surveyIndex !== -1 && row[surveyIndex]) {
    meta.survey = row[surveyIndex];
  }
  
  return meta;
}
