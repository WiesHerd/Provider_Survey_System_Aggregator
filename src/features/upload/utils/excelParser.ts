/**
 * Excel file parser using SheetJS (xlsx)
 * Handles .xlsx and .xls files with support for multiple sheets
 */

import * as XLSX from 'xlsx';
import { ExcelParseResult } from '../types/validation';

/**
 * Parse Excel file and return sheet information and data
 * 
 * @param file - Excel file to parse
 * @param selectedSheet - Optional sheet name to parse (defaults to first sheet)
 * @returns Excel parse result with sheets metadata and data
 */
export async function parseExcelFile(
  file: File,
  selectedSheet?: string
): Promise<ExcelParseResult> {
  try {
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { 
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false
    });

    // Get all sheet names
    const sheetNames = workbook.SheetNames;
    
    if (sheetNames.length === 0) {
      throw new Error('Excel file contains no sheets');
    }

    // Determine which sheet to parse
    const sheetToParse = selectedSheet || sheetNames[0];
    
    if (!sheetNames.includes(sheetToParse)) {
      throw new Error(`Sheet "${sheetToParse}" not found in Excel file`);
    }

    // Get the worksheet
    const worksheet = workbook.Sheets[sheetToParse];
    
    // Check for merged cells in header row
    const hasMergedCells = worksheet['!merges'] && worksheet['!merges'].length > 0;
    
    // Convert worksheet to JSON (array of objects)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // Use array format (row arrays)
      defval: '', // Default value for empty cells
      raw: false // Convert dates and numbers to strings
    }) as any[][];

    if (jsonData.length === 0) {
      throw new Error(`Sheet "${sheetToParse}" is empty`);
    }

    // First row is headers
    const headers = (jsonData[0] || []).map((header: any) => 
      String(header || '').trim()
    );

    // Check for merged/blank cells in header row
    const blankHeaders = headers
      .map((h, i) => ({ header: h, index: i }))
      .filter(({ header }) => !header || header === '');
    
    // Data rows (skip header row)
    const rows = jsonData.slice(1).filter(row => 
      row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
    );

    // Build sheet metadata
    const sheets = sheetNames.map(name => {
      const ws = workbook.Sheets[name];
      const sheetJson = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
      const dataRows = sheetJson.slice(1).filter(row => 
        row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
      );
      
      return {
        name,
        rowCount: dataRows.length,
        columnCount: sheetJson[0]?.length || 0
      };
    });

    // Normalize rows to match header length (pad with empty strings if needed)
    const normalizedRows = rows.map(row => {
      const normalizedRow = [...row];
      while (normalizedRow.length < headers.length) {
        normalizedRow.push('');
      }
      return normalizedRow.slice(0, headers.length);
    });

    return {
      sheets,
      data: {
        headers,
        rows: normalizedRows
      },
      selectedSheet: sheetToParse,
      hasMergedCells: hasMergedCells || blankHeaders.length > 0
    };
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error(
      `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get sheet names from Excel file without parsing full data
 * Useful for sheet selection UI
 * 
 * @param file - Excel file
 * @returns Array of sheet names with metadata
 */
export async function getExcelSheetNames(file: File): Promise<Array<{
  name: string;
  rowCount: number;
  columnCount: number;
}>> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { 
      type: 'array',
      sheetStubs: true // Only read sheet names, not full data
    });

    const sheetNames = workbook.SheetNames;
    
    // Get basic metadata for each sheet
    const sheets = sheetNames.map(name => {
      const worksheet = workbook.Sheets[name];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      return {
        name,
        rowCount: range.e.r, // End row (0-based, so +1 for actual count)
        columnCount: range.e.c + 1 // End column + 1
      };
    });

    return sheets;
  } catch (error) {
    console.error('Error reading Excel sheet names:', error);
    throw new Error(
      `Failed to read Excel sheet names: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

