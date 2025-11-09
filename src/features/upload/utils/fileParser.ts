/**
 * Unified file parser for CSV and Excel files
 * Routes files to appropriate parser and returns consistent structure
 */

import { readCSVFile } from '../../../shared/utils';
import { parseCSVContent } from '../../../shared/utils/csvParser';
import { parseExcelFile } from './excelParser';
import { ParseResult, FileMetadata } from '../types/validation';

/**
 * Parse file (CSV or Excel) and return unified structure
 * 
 * @param file - File to parse (CSV or Excel)
 * @param selectedSheet - Optional sheet name for Excel files
 * @returns Parse result with headers, rows, and metadata
 */
export async function parseFile(
  file: File,
  selectedSheet?: string
): Promise<ParseResult> {
  const fileName = file.name.toLowerCase();
  const fileType = fileName.endsWith('.xlsx') 
    ? 'xlsx' 
    : fileName.endsWith('.xls') 
    ? 'xls' 
    : 'csv';

  const metadata: FileMetadata = {
    fileName: file.name,
    fileType,
    fileSize: file.size,
    rowCount: 0,
    columnCount: 0
  };

  try {
    if (fileType === 'csv') {
      // Parse CSV file
      const { text, encoding, issues, normalized } = await readCSVFile(file);
      
      if (issues.length > 0) {
        console.warn('CSV encoding issues detected:', issues);
      }
      if (normalized) {
        console.log('Character normalization applied to CSV file');
      }

      const { headers, rows } = parseCSVContent(text);
      
      metadata.rowCount = rows.length;
      metadata.columnCount = headers.length;

      return {
        headers,
        rows,
        metadata
      };
    } else {
      // Parse Excel file
      const excelResult = await parseExcelFile(file, selectedSheet);
      
      metadata.sheetName = excelResult.selectedSheet;
      metadata.sheetCount = excelResult.sheets.length;
      metadata.hasMergedCells = excelResult.hasMergedCells;
      metadata.rowCount = excelResult.data.rows.length;
      metadata.columnCount = excelResult.data.headers.length;

      return {
        headers: excelResult.data.headers,
        rows: excelResult.data.rows,
        metadata
      };
    }
  } catch (error) {
    console.error('Error parsing file:', error);
    throw new Error(
      `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Detect file type from file name
 * 
 * @param fileName - File name
 * @returns File type ('csv', 'xlsx', or 'xls')
 */
export function detectFileType(fileName: string): 'csv' | 'xlsx' | 'xls' {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.xlsx')) return 'xlsx';
  if (lowerName.endsWith('.xls')) return 'xls';
  return 'csv';
}

/**
 * Check if file is Excel format
 * 
 * @param file - File to check
 * @returns True if file is Excel format
 */
export function isExcelFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  return fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
}

/**
 * Check if file is CSV format
 * 
 * @param file - File to check
 * @returns True if file is CSV format
 */
export function isCSVFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv');
}

