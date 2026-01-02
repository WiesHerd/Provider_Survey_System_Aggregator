/**
 * Enterprise-Grade Streaming CSV Parser
 * 
 * Processes CSV files in chunks to prevent memory issues with large files.
 * Handles encoding, normalization, and proper CSV parsing with quoted fields.
 * 
 * Memory Management:
 * - Small files (<1MB): Process in main thread
 * - Medium files (1-5MB): Process in chunks
 * - Large files (>5MB): Should use Web Worker (handled by caller)
 */

import { parseCSVLine } from './csvParser';
import { normalizeText, detectEncodingIssues, type EncodingIssue } from './textEncoding';

export interface StreamingParseOptions {
  chunkSize?: number; // Bytes per chunk (default: 10KB)
  onProgress?: (progress: { bytesRead: number; totalBytes: number; rowsParsed: number }) => void;
  onRow?: (row: Record<string, string>, rowIndex: number) => void;
  encoding?: string; // Auto-detect if not provided
  normalize?: boolean; // Apply character normalization (default: true)
}

export interface StreamingParseResult {
  headers: string[];
  rows: Record<string, string>[];
  encoding: string;
  issues: EncodingIssue[];
  normalized: boolean;
  rowCount: number;
  bytesProcessed: number;
}

const DEFAULT_CHUNK_SIZE = 10 * 1024; // 10KB
const MEMORY_LIMIT_SMALL = 1024 * 1024; // 1MB
const MEMORY_LIMIT_MEDIUM = 5 * 1024 * 1024; // 5MB

/**
 * Determines if a file should be processed with streaming
 */
export function shouldUseStreaming(fileSize: number): boolean {
  return fileSize > MEMORY_LIMIT_SMALL;
}

/**
 * Determines if a file should be processed in a Web Worker
 */
export function shouldUseWorker(fileSize: number): boolean {
  return fileSize > MEMORY_LIMIT_MEDIUM;
}

/**
 * Reads a file chunk with encoding detection
 */
async function readChunkWithEncoding(
  file: File,
  start: number,
  end: number,
  encoding: string = 'utf-8'
): Promise<string> {
  const chunk = file.slice(start, end);
  
  if (encoding === 'utf-8') {
    return await chunk.text();
  } else {
    const arrayBuffer = await chunk.arrayBuffer();
    const decoder = new TextDecoder(encoding, { fatal: false });
    return decoder.decode(arrayBuffer);
  }
}

/**
 * Detects encoding from first chunk of file
 */
async function detectEncodingFromFile(file: File): Promise<string> {
  const sampleSize = Math.min(1024, file.size);
  const encodings = ['utf-8', 'windows-1252', 'iso-8859-1'];
  
  for (const encoding of encodings) {
    try {
      const text = await readChunkWithEncoding(file, 0, sampleSize, encoding);
      const issues = detectEncodingIssues(text);
      
      if (issues.length === 0) {
        return encoding;
      }
    } catch (error) {
      continue;
    }
  }
  
  return 'utf-8'; // Fallback
}

/**
 * Streaming CSV parser that processes files in chunks
 * Handles partial lines at chunk boundaries correctly
 */
export async function parseCSVStreaming(
  file: File,
  options: StreamingParseOptions = {}
): Promise<StreamingParseResult> {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    onProgress,
    onRow,
    encoding: providedEncoding,
    normalize = true
  } = options;

  // Detect encoding if not provided
  const encoding = providedEncoding || await detectEncodingFromFile(file);
  
  const issues: EncodingIssue[] = [];
  let normalized = false;
  let headers: string[] = [];
  const rows: Record<string, string>[] = [];
  let bytesProcessed = 0;
  let rowIndex = 0;
  
  // Buffer for partial line at chunk boundary
  let lineBuffer = '';
  let isFirstChunk = true;
  let headerParsed = false;

  // Process file in chunks
  for (let offset = 0; offset < file.size; offset += chunkSize) {
    const chunkEnd = Math.min(offset + chunkSize, file.size);
    const chunkText = await readChunkWithEncoding(file, offset, chunkEnd, encoding);
    
    // Normalize if requested
    let processedText = normalize ? normalizeText(chunkText) : chunkText;
    if (normalize && processedText !== chunkText) {
      normalized = true;
    }
    
    // Detect encoding issues in chunk
    const chunkIssues = detectEncodingIssues(processedText);
    issues.push(...chunkIssues);
    
    // Combine with previous line buffer
    const fullText = lineBuffer + processedText;
    
    // Split into lines (keep last incomplete line in buffer)
    const lines = fullText.split('\n');
    
    // Last line might be incomplete, keep it in buffer
    lineBuffer = lines.pop() || '';
    
    // Process complete lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse header on first line
      if (!headerParsed) {
        headers = parseCSVLine(line);
        headerParsed = true;
        isFirstChunk = false;
        continue;
      }
      
      // Parse data row
      const values = parseCSVLine(line);
      
      // Create row object
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row);
      rowIndex++;
      
      // Call onRow callback if provided
      if (onRow) {
        onRow(row, rowIndex - 1);
      }
    }
    
    bytesProcessed = chunkEnd;
    
    // Report progress
    if (onProgress) {
      onProgress({
        bytesRead: bytesProcessed,
        totalBytes: file.size,
        rowsParsed: rows.length
      });
    }
    
    // Yield to event loop periodically to prevent blocking
    if (offset % (chunkSize * 10) === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  // Process remaining line buffer
  if (lineBuffer.trim()) {
    if (!headerParsed) {
      headers = parseCSVLine(lineBuffer.trim());
      headerParsed = true;
    } else {
      const values = parseCSVLine(lineBuffer.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
      rowIndex++;
      
      if (onRow) {
        onRow(row, rowIndex - 1);
      }
    }
  }
  
  return {
    headers,
    rows,
    encoding,
    issues,
    normalized,
    rowCount: rows.length,
    bytesProcessed
  };
}

/**
 * Non-streaming parser for small files (backward compatibility)
 * Uses traditional approach for files that fit in memory
 */
export async function parseCSVNonStreaming(
  file: File,
  options: Omit<StreamingParseOptions, 'chunkSize'> = {}
): Promise<StreamingParseResult> {
  const { onProgress, onRow, encoding: providedEncoding, normalize = true } = options;
  
  // Read entire file
  const encoding = providedEncoding || 'utf-8';
  let text: string;
  
  if (encoding === 'utf-8') {
    text = await file.text();
  } else {
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder(encoding, { fatal: false });
    text = decoder.decode(arrayBuffer);
  }
  
  // Normalize if requested
  let normalized = false;
  if (normalize) {
    const normalizedText = normalizeText(text);
    normalized = normalizedText !== text;
    text = normalizedText;
  }
  
  // Detect encoding issues
  const issues = detectEncodingIssues(text);
  
  // Parse CSV content
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return {
      headers: [],
      rows: [],
      encoding,
      issues,
      normalized,
      rowCount: 0,
      bytesProcessed: file.size
    };
  }
  
  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
    
    if (onRow) {
      onRow(row, i - 1);
    }
  }
  
  if (onProgress) {
    onProgress({
      bytesRead: file.size,
      totalBytes: file.size,
      rowsParsed: rows.length
    });
  }
  
  return {
    headers,
    rows,
    encoding,
    issues,
    normalized,
    rowCount: rows.length,
    bytesProcessed: file.size
  };
}

/**
 * Smart CSV parser that chooses streaming or non-streaming based on file size
 */
export async function parseCSVSmart(
  file: File,
  options: StreamingParseOptions = {}
): Promise<StreamingParseResult> {
  if (shouldUseStreaming(file.size)) {
    return parseCSVStreaming(file, options);
  } else {
    return parseCSVNonStreaming(file, options);
  }
}
