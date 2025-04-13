/// <reference lib="webworker" />
import { ISurveyData, ISurveyRow } from '../types/survey';

/* eslint-disable no-restricted-globals */
const ctx = self;

interface ProcessMessageData {
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
    case 'PROCESS_SURVEY':
      try {
        console.log('Worker: Starting to process survey data', { 
          provider: data.surveyProvider,
          year: data.year,
          id: data.id 
        });
        await processSurveyData(data);
      } catch (error) {
        console.error('Worker: Error in main message handler:', error);
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

async function processSurveyData(messageData: ProcessMessageData) {
  const { file, surveyProvider, year, id, columnMappings, specialtyMappings } = messageData;

  try {
    console.log('Worker: Reading file contents');
    const text = await file.text();
    const lines = text.split('\n');
    
    if (lines.length === 0) {
      throw new Error('File is empty');
    }

    console.log('Worker: Processing headers');
    const headers = lines[0].split(',').map(h => h.trim());
    
    if (headers.length === 0) {
      throw new Error('No headers found in file');
    }

    // Log available mappings
    console.log('Worker: Column mappings:', columnMappings);
    console.log('Worker: Headers found:', headers);

    // Create reverse mapping for faster lookups
    const reverseColumnMapping: Record<string, string> = {};
    Object.entries(columnMappings).forEach(([standard, source]) => {
      reverseColumnMapping[source] = standard;
    });

    // Validate that we have at least some matching columns
    const matchingColumns = headers.filter(header => reverseColumnMapping[header]);
    if (matchingColumns.length === 0) {
      throw new Error('No matching columns found. Expected columns: ' + 
        Object.values(columnMappings).join(', ') + 
        '. Found: ' + headers.join(', '));
    }

    console.log('Worker: Matching columns found:', matchingColumns);

    // Track unique values using Sets
    const uniqueSpecialties = new Set<string>();
    const uniqueProviderTypes = new Set<string>();
    const uniqueRegions = new Set<string>();
    let totalRows = 0;
    let currentChunkIndex = 0;

    // Process chunks
    for (let i = 1; i < lines.length; i += CHUNK_SIZE) {
      const chunk = lines.slice(i, i + CHUNK_SIZE);
      
      const processedChunk = chunk
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          if (values.length !== headers.length) {
            console.warn('Worker: Mismatched column count in row', i, 'Expected:', headers.length, 'Got:', values.length);
            return null;
          }

          const row: any = {};

          // Map columns according to configuration
          headers.forEach((header, index) => {
            const standardColumn = reverseColumnMapping[header];
            if (standardColumn) {
              row[standardColumn.toLowerCase()] = values[index];
            }
          });

          // Normalize specialty
          if (row.specialty) {
            row.normalizedSpecialty = normalizeSpecialty(row.specialty, specialtyMappings);
            uniqueSpecialties.add(row.normalizedSpecialty);
          }

          if (row.providerType) {
            uniqueProviderTypes.add(row.providerType);
          }

          if (row.geographicRegion) {
            uniqueRegions.add(row.geographicRegion);
          }

          return row;
        })
        .filter((row): row is ISurveyRow => row !== null);

      // Send chunk immediately to main thread for storage
      if (processedChunk.length > 0) {
        totalRows += processedChunk.length;
        ctx.postMessage({
          type: 'STORE_CHUNK',
          data: {
            id,
            chunkIndex: currentChunkIndex++,
            chunk: processedChunk
          }
        });
      }

      // Notify progress
      ctx.postMessage({
        type: 'PROCESSING_PROGRESS',
        data: {
          processed: totalRows,
          total: lines.length - 1
        }
      });
    }

    console.log('Worker: Processing complete', {
      rowsProcessed: totalRows,
      specialtiesFound: uniqueSpecialties.size,
      providerTypesFound: uniqueProviderTypes.size,
      regionsFound: uniqueRegions.size
    });

    // Send metadata separately
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
            totalRows,
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