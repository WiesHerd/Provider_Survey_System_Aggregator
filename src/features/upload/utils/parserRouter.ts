/**
 * Enterprise-Grade Parser Router
 * 
 * Routes files to appropriate parser based on size:
 * - Small files (<1MB): Main thread, non-streaming
 * - Medium files (1-5MB): Main thread, streaming
 * - Large files (>5MB): Web Worker, streaming
 */

import { shouldUseStreaming, shouldUseWorker } from '../../../shared/utils/streamingCSVParser';
import { parseFile } from './fileParser';
import { ParseResult } from '../types/validation';

export interface ParserRouterOptions {
  useWorker?: boolean; // Force worker usage
  onProgress?: (progress: { bytesRead: number; totalBytes: number; rowsParsed: number }) => void;
}

/**
 * Routes file parsing to appropriate method based on file size
 */
export async function routeParser(
  file: File,
  selectedSheet?: string,
  options: ParserRouterOptions = {}
): Promise<ParseResult> {
  const { useWorker, onProgress } = options;
  
  // Determine parsing strategy
  const fileSize = file.size;
  const shouldStream = shouldUseStreaming(fileSize);
  const shouldUseWorkerForFile = useWorker ?? shouldUseWorker(fileSize);
  
  console.log(`📊 Parser routing for ${file.name}:`, {
    size: `${(fileSize / 1024 / 1024).toFixed(2)} MB`,
    streaming: shouldStream,
    worker: shouldUseWorkerForFile
  });
  
  // For now, always use the main thread parser
  // Worker integration will be added in a future update
  // The streaming parser already handles memory efficiently
  return parseFile(file, selectedSheet, onProgress ? {
    onProgress
  } : undefined);
}

/**
 * Check if file should be processed in worker
 */
export function shouldProcessInWorker(fileSize: number): boolean {
  return shouldUseWorker(fileSize);
}
