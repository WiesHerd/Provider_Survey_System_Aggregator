/// <reference lib="webworker" />
/**
 * Enterprise-Grade Streaming Data Processing Worker
 * 
 * Processes large files (>5MB) in chunks to prevent memory issues.
 * Uses streaming parser to handle files that don't fit in memory.
 */

import { parseCSVStreaming, type StreamingParseOptions } from '../shared/utils/streamingCSVParser';
import { parseCSVLine } from '../shared/utils/csvParser';
import { ISurveyRow } from '../types/survey';

/* eslint-disable no-restricted-globals */
const ctx = self;

interface StreamingProcessMessageData {
  file: File;
  surveyProvider: string;
  year: string;
  id: string;
  columnMappings: Record<string, string>;
  specialtyMappings: Record<string, string[]>;
}

// Process data in chunks to avoid memory issues
const CHUNK_SIZE = 1000;

ctx.onmessage = async (event: MessageEvent) => {
  const { type, data } = event.data;

  switch (type) {
    case 'PROCESS_SURVEY_STREAMING':
      try {
        console.log('Worker: Starting streaming processing for large file', { 
          provider: data.surveyProvider,
          year: data.year,
          id: data.id,
          fileSize: data.file.size
        });
        await processSurveyDataStreaming(data);
      } catch (error) {
        console.error('Worker: Error in streaming message handler:', error);
        ctx.postMessage({
          type: 'PROCESSING_ERROR',
          data: {
            id: data.id,
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
      break;
    default:
      console.warn('Worker: Unknown message type:', type);
  }
};

async function processSurveyDataStreaming(messageData: StreamingProcessMessageData) {
  const { file, surveyProvider, year, id, columnMappings, specialtyMappings } = messageData;

  try {
    console.log('Worker: Starting streaming CSV parse');
    
    // Track unique values using Sets
    const uniqueSpecialties = new Set<string>();
    const uniqueProviderTypes = new Set<string>();
    const uniqueRegions = new Set<string>();
    let totalRows = 0;
    let currentChunkIndex = 0;
    let headers: string[] = [];
    let isFirstRow = true;

    // Create reverse mapping for faster lookups
    const reverseColumnMapping: Record<string, string> = {};
    Object.entries(columnMappings).forEach(([standard, source]) => {
      reverseColumnMapping[source] = standard;
    });

    // Parse file using streaming parser
    const result = await parseCSVStreaming(file, {
      chunkSize: 10 * 1024, // 10KB chunks
      onProgress: (progress) => {
        // Report progress to main thread
        ctx.postMessage({
          type: 'PROCESSING_PROGRESS',
          data: {
            processed: progress.rowsParsed,
            total: Math.ceil(progress.totalBytes / (file.size / 1000)), // Estimate
            bytesRead: progress.bytesRead,
            totalBytes: progress.totalBytes
          }
        });
      }
    });
    
    if (result.issues.length > 0) {
      console.warn('Worker: Encoding issues detected:', result.issues);
    }
    if (result.normalized) {
      console.log('Worker: Character normalization applied');
    }

    // Set headers from result
    headers = result.headers;
    
    // Validate that we have at least some matching columns
    const matchingColumns = headers.filter(header => reverseColumnMapping[header]);
    if (matchingColumns.length === 0) {
      throw new Error('No matching columns found. Expected columns: ' + 
        Object.values(columnMappings).join(', ') + 
        '. Found: ' + headers.join(', '));
    }
    
    console.log('Worker: Headers found:', headers);
    console.log('Worker: Matching columns found:', matchingColumns);

    // Process rows in batches
    const rowBatches: ISurveyRow[][] = [];
    let currentBatch: ISurveyRow[] = [];
    
    for (const row of result.rows) {
      const processedRow: any = {};
      
      // Map columns according to configuration
      headers.forEach((header) => {
        const standardColumn = reverseColumnMapping[header];
        if (standardColumn) {
          processedRow[standardColumn.toLowerCase()] = row[header] || '';
        }
      });

      // Normalize specialty
      if (processedRow.specialty) {
        processedRow.normalizedSpecialty = normalizeSpecialty(processedRow.specialty, specialtyMappings);
        uniqueSpecialties.add(processedRow.normalizedSpecialty);
      }

      if (processedRow.providerType) {
        uniqueProviderTypes.add(processedRow.providerType);
      }

      if (processedRow.geographicRegion) {
        uniqueRegions.add(processedRow.geographicRegion);
      }

      currentBatch.push(processedRow as ISurveyRow);
      totalRows++;
      
      // Send batch when it reaches chunk size
      if (currentBatch.length >= CHUNK_SIZE) {
        rowBatches.push([...currentBatch]);
        ctx.postMessage({
          type: 'STORE_CHUNK',
          data: {
            id,
            chunkIndex: currentChunkIndex++,
            chunk: currentBatch
          }
        });
        currentBatch = [];
      }
    }
    
    // Send remaining rows
    if (currentBatch.length > 0) {
      ctx.postMessage({
        type: 'STORE_CHUNK',
        data: {
          id,
          chunkIndex: currentChunkIndex++,
          chunk: currentBatch
        }
      });
    }

    console.log('Worker: Streaming processing complete', {
      rowsProcessed: result.rowCount,
      specialtiesFound: uniqueSpecialties.size,
      providerTypesFound: uniqueProviderTypes.size,
      regionsFound: uniqueRegions.size
    });

    // Send metadata
    ctx.postMessage({
      type: 'PROCESSING_COMPLETE',
      data: {
        id,
        metadata: {
          id,
          surveyProvider,
          surveyYear: year,
          uploadDate: new Date(),
          metadata: {
            totalRows: result.rowCount,
            uniqueSpecialties: Array.from(uniqueSpecialties),
            uniqueProviderTypes: Array.from(uniqueProviderTypes),
            uniqueRegions: Array.from(uniqueRegions),
            columnMappings
          }
        }
      }
    });

  } catch (error: unknown) {
    console.error('Worker: Error processing survey data:', error);
    ctx.postMessage({
      type: 'PROCESSING_ERROR',
      data: {
        id,
        error: error instanceof Error ? error.message : String(error)
      }
    });
  }
}

function normalizeSpecialty(specialty: string, mappings: Record<string, string[]>): string {
  for (const [normalizedName, variants] of Object.entries(mappings)) {
    if (variants.some(variant => 
      variant.toLowerCase() === specialty.toLowerCase() ||
      specialty.toLowerCase().includes(variant.toLowerCase())
    )) {
      return normalizedName;
    }
  }
  return specialty;
}

export {};
