/**
 * Template for source adapters
 * 
 * Each survey source has idiosyncratic strings and formats.
 * This template shows how to create an adapter that standardizes RawInput.
 */

import { RawInput, Source } from '../types';

/**
 * Template function for parsing source CSV and emitting RawInput[]
 * 
 * @param csvPath - Path to the source CSV file
 * @returns Array of RawInput objects
 */
export function toRawInputs(csvPath: string): RawInput[] {
  // This is a template - implement based on your source format
  throw new Error('Template function - implement based on source format');
}

/**
 * Parse CSV content and extract specialty information
 * 
 * @param csvContent - Raw CSV content as string
 * @param source - Source identifier
 * @returns Array of RawInput objects
 */
export function parseCSVContent(csvContent: string, source: Source): RawInput[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header and one data row');
  }
  
  const headers = parseCSVLine(lines[0]);
  const specialtyColumnIndex = findSpecialtyColumn(headers);
  
  if (specialtyColumnIndex === -1) {
    throw new Error(`No specialty column found in headers: ${headers.join(', ')}`);
  }
  
  const rawInputs: RawInput[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length <= specialtyColumnIndex) {
      continue; // Skip malformed rows
    }
    
    const rawName = row[specialtyColumnIndex].trim();
    if (!rawName) {
      continue; // Skip empty specialty names
    }
    
    // Extract metadata from other columns if available
    const meta: Record<string, any> = {};
    
    // Look for pediatric flag column
    const pediatricColumnIndex = findPediatricColumn(headers);
    if (pediatricColumnIndex !== -1 && row[pediatricColumnIndex]) {
      meta.pediatric = row[pediatricColumnIndex].toLowerCase().includes('pediatric') ||
                      row[pediatricColumnIndex].toLowerCase().includes('ped');
    }
    
    // Look for provider type column
    const providerTypeColumnIndex = findProviderTypeColumn(headers);
    if (providerTypeColumnIndex !== -1 && row[providerTypeColumnIndex]) {
      meta.providerType = row[providerTypeColumnIndex];
    }
    
    // Look for geographic region column
    const regionColumnIndex = findRegionColumn(headers);
    if (regionColumnIndex !== -1 && row[regionColumnIndex]) {
      meta.region = row[regionColumnIndex];
    }
    
    rawInputs.push({
      source,
      rawName,
      meta
    });
  }
  
  return rawInputs;
}

/**
 * Parse a single CSV line, handling quoted fields with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
}

/**
 * Find the specialty column index in headers
 */
function findSpecialtyColumn(headers: string[]): number {
  const specialtyKeywords = [
    'specialty',
    'speciality',
    'medical specialty',
    'physician specialty',
    'department',
    'service',
    'division'
  ];
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase().trim();
    for (const keyword of specialtyKeywords) {
      if (header.includes(keyword)) {
        return i;
      }
    }
  }
  
  return -1;
}

/**
 * Find the pediatric flag column index in headers
 */
function findPediatricColumn(headers: string[]): number {
  const pediatricKeywords = [
    'pediatric',
    'pediatrics',
    'ped',
    'peds',
    'age group',
    'patient type',
    'population'
  ];
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase().trim();
    for (const keyword of pediatricKeywords) {
      if (header.includes(keyword)) {
        return i;
      }
    }
  }
  
  return -1;
}

/**
 * Find the provider type column index in headers
 */
function findProviderTypeColumn(headers: string[]): number {
  const providerTypeKeywords = [
    'provider type',
    'physician type',
    'doctor type',
    'provider',
    'type'
  ];
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase().trim();
    for (const keyword of providerTypeKeywords) {
      if (header.includes(keyword)) {
        return i;
      }
    }
  }
  
  return -1;
}

/**
 * Find the geographic region column index in headers
 */
function findRegionColumn(headers: string[]): number {
  const regionKeywords = [
    'region',
    'geographic',
    'location',
    'state',
    'area',
    'market'
  ];
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase().trim();
    for (const keyword of regionKeywords) {
      if (header.includes(keyword)) {
        return i;
      }
    }
  }
  
  return -1;
}
