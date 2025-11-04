/**
 * MGMA source adapter
 * 
 * Handles MGMA survey data format and terminology
 */

import { RawInput } from '../types';
import { parseCSVContent } from './template';

/**
 * Parse MGMA CSV file and convert to RawInput[]
 */
export function toRawInputs(csvPath: string): RawInput[] {
  // In a real implementation, you would read the file here
  // For now, this is a placeholder
  throw new Error('File reading not implemented - use parseCSVContent with file content');
}

/**
 * Parse MGMA CSV content
 * 
 * MGMA typically uses these column names:
 * - "Specialty" or "Medical Specialty"
 * - "Provider Type" (optional)
 * - "Geographic Region" (optional)
 * - "Market" (optional)
 * - "Pediatric" (optional flag)
 */
export function parseMGMACSV(csvContent: string): RawInput[] {
  return parseCSVContent(csvContent, 'MGMA');
}

/**
 * MGMA-specific specialty name cleaning
 * 
 * MGMA often uses colons and dashes in specialty names like:
 * - "Cardiology: Interventional"
 * - "Radiology - Diagnostic"
 */
export function cleanMGMASpecialtyName(rawName: string): string {
  return rawName
    .trim()
    .replace(/^MGMA\s*/i, '') // Remove MGMA prefix if present
    .replace(/\s*\(MGMA\)/i, '') // Remove MGMA suffix if present
    .replace(/:\s*/g, ' ') // Replace colons with spaces
    .replace(/\s*-\s*/g, ' ') // Replace dashes with spaces
    .trim();
}

/**
 * MGMA-specific metadata extraction
 * 
 * MGMA may have specific columns for pediatric flags, market data, etc.
 */
export function extractMGMAMetadata(row: string[], headers: string[]): Record<string, any> {
  const meta: Record<string, any> = {};
  
  // MGMA may have specific columns we want to preserve
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
  
  // MGMA may have explicit pediatric flags
  const pediatricIndex = headers.findIndex(h => h.toLowerCase().includes('pediatric'));
  if (pediatricIndex !== -1 && row[pediatricIndex]) {
    meta.pediatric = row[pediatricIndex].toLowerCase().includes('yes') ||
                    row[pediatricIndex].toLowerCase().includes('true') ||
                    row[pediatricIndex].toLowerCase().includes('pediatric');
  }
  
  return meta;
}
