/**
 * Proper CSV parsing utility that handles quoted fields with commas
 * This prevents specialty names like "Cardiology - Cardiac Imaging (Echo, CT, MRI, Nuclear)"
 * from being incorrectly split into multiple fields
 */

/**
 * Parse a CSV line properly, handling quoted fields with commas
 * Also handles unquoted fields that contain commas in parentheses (common in specialty names)
 * @param line - CSV line to parse
 * @returns Array of field values
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let parenDepth = 0;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote (double quote)
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === '(') {
      parenDepth++;
      current += char;
    } else if (char === ')') {
      parenDepth--;
      current += char;
    } else if (char === ',' && !inQuotes && parenDepth === 0) {
      // Field separator (only when not in quotes and not inside parentheses)
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
 * Parse CSV content into rows and columns
 * @param csvContent - Raw CSV content as string
 * @returns Object with headers and rows
 */
export function parseCSVContent(csvContent: string): { headers: string[]; rows: string[][] } {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(line => parseCSVLine(line));
  
  return { headers, rows };
}

/**
 * Test function to verify CSV parsing works correctly
 */
export function testCSVParsing(): void {
  const testLine = 'Cardiology - Cardiac Imaging (Echo, CT, MRI, Nuclear),Staff Physician,National,2024';
  const result = parseCSVLine(testLine);
  
  console.log('CSV Parsing Test:');
  console.log('Input:', testLine);
  console.log('Parsed:', result);
  console.log('Expected 4 fields, got:', result.length);
  console.log('First field (specialty):', result[0]);
  
  // Should be exactly 4 fields, not 7
  if (result.length === 4 && result[0] === 'Cardiology - Cardiac Imaging (Echo, CT, MRI, Nuclear)') {
    console.log('✅ CSV parsing test PASSED');
  } else {
    console.log('❌ CSV parsing test FAILED');
  }
}
