/**
 * Robust CSV parsing utilities
 * Handles quoted fields with commas, escaped quotes, and other CSV edge cases
 */

/**
 * Parse a single CSV line, handling quoted fields with commas
 * @param line - The CSV line to parse
 * @returns Array of field values
 */
export const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote - add one quote to current field
        current += '"';
        i += 2; // Skip both quotes
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator - add current field to result
      result.push(current.trim());
      current = '';
    } else {
      // Regular character - add to current field
      current += char;
    }
    i++;
  }

  // Add the last field
  result.push(current.trim());

  return result;
};

/**
 * Parse CSV text into rows and columns
 * @param csvText - The CSV text to parse
 * @returns Object with headers and rows
 */
export const parseCSV = (csvText: string): { headers: string[]; rows: string[][] } => {
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(line => parseCSVLine(line));

  return { headers, rows };
};

/**
 * Convert CSV rows to objects using headers
 * @param headers - Array of header names
 * @param rows - Array of row data
 * @returns Array of objects with header names as keys
 */
export const csvRowsToObjects = (headers: string[], rows: string[][]): Record<string, string>[] => {
  return rows.map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
};
