/**
 * Enterprise-Grade Data Integrity Verification
 * 
 * Provides checksum calculation, row count validation, and data integrity checks
 * to ensure uploaded data matches parsed data.
 */

/**
 * Calculate CRC32 checksum for a string
 * Simple and fast checksum algorithm suitable for data verification
 */
export function calculateCRC32(data: string): string {
  let crc = 0xFFFFFFFF;
  const polynomial = 0xEDB88320;
  
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? polynomial : 0);
    }
  }
  
  return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, '0');
}

/**
 * Calculate checksum for a row of data
 */
export function calculateRowChecksum(row: Record<string, any>): string {
  // Convert row to stable string representation
  const rowString = JSON.stringify(row, Object.keys(row).sort());
  return calculateCRC32(rowString);
}

/**
 * Calculate checksum for multiple rows
 */
export function calculateRowsChecksum(rows: Record<string, any>[]): string {
  const rowsString = rows
    .map(row => JSON.stringify(row, Object.keys(row).sort()))
    .join('\n');
  return calculateCRC32(rowsString);
}

/**
 * Verification result
 */
export interface VerificationResult {
  isValid: boolean;
  rowCountMatch: boolean;
  checksumMatch: boolean;
  sampleDataMatch: boolean;
  issues: VerificationIssue[];
}

export interface VerificationIssue {
  type: 'row_count_mismatch' | 'checksum_mismatch' | 'sample_data_mismatch' | 'missing_data';
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Verify uploaded data integrity
 */
export async function verifyUploadIntegrity(
  originalRows: Record<string, any>[],
  savedRows: Record<string, any>[],
  options: {
    verifyChecksum?: boolean;
    verifySampleData?: boolean;
    sampleSize?: number;
  } = {}
): Promise<VerificationResult> {
  const {
    verifyChecksum = true,
    verifySampleData = true,
    sampleSize = 10
  } = options;
  
  const issues: VerificationIssue[] = [];
  let rowCountMatch = false;
  let checksumMatch = false;
  let sampleDataMatch = false;
  
  // 1. Row count verification
  if (originalRows.length === savedRows.length) {
    rowCountMatch = true;
  } else {
    issues.push({
      type: 'row_count_mismatch',
      message: `Row count mismatch: expected ${originalRows.length}, got ${savedRows.length}`,
      severity: 'error'
    });
  }
  
  // 2. Checksum verification
  if (verifyChecksum && rowCountMatch) {
    const originalChecksum = calculateRowsChecksum(originalRows);
    const savedChecksum = calculateRowsChecksum(savedRows);
    
    if (originalChecksum === savedChecksum) {
      checksumMatch = true;
    } else {
      issues.push({
        type: 'checksum_mismatch',
        message: 'Data checksum mismatch - data may have been corrupted during upload',
        severity: 'error'
      });
    }
  } else if (verifyChecksum && !rowCountMatch) {
    // Skip checksum if row count doesn't match
    issues.push({
      type: 'checksum_mismatch',
      message: 'Checksum verification skipped due to row count mismatch',
      severity: 'warning'
    });
  }
  
  // 3. Sample data verification
  if (verifySampleData && rowCountMatch && savedRows.length > 0) {
    const sampleIndices = [
      0, // First row
      Math.floor(savedRows.length / 2), // Middle row
      savedRows.length - 1 // Last row
    ].filter(idx => idx < savedRows.length);
    
    // Add random samples if we have more rows
    if (savedRows.length > sampleSize) {
      for (let i = 0; i < sampleSize - 3; i++) {
        const randomIdx = Math.floor(Math.random() * savedRows.length);
        if (!sampleIndices.includes(randomIdx)) {
          sampleIndices.push(randomIdx);
        }
      }
    }
    
    let allSamplesMatch = true;
    for (const idx of sampleIndices) {
      if (idx >= originalRows.length || idx >= savedRows.length) {
        continue;
      }
      
      const originalRow = originalRows[idx];
      const savedRow = savedRows[idx];
      
      // Compare row checksums
      const originalRowChecksum = calculateRowChecksum(originalRow);
      const savedRowChecksum = calculateRowChecksum(savedRow);
      
      if (originalRowChecksum !== savedRowChecksum) {
        allSamplesMatch = false;
        issues.push({
          type: 'sample_data_mismatch',
          message: `Sample data mismatch at row ${idx + 1}`,
          severity: 'error'
        });
        break; // Stop on first mismatch
      }
    }
    
    sampleDataMatch = allSamplesMatch;
  }
  
  const isValid = rowCountMatch && 
    (!verifyChecksum || checksumMatch) && 
    (!verifySampleData || sampleDataMatch) &&
    issues.filter(i => i.severity === 'error').length === 0;
  
  return {
    isValid,
    rowCountMatch,
    checksumMatch: verifyChecksum ? checksumMatch : true, // Assume match if not verified
    sampleDataMatch: verifySampleData ? sampleDataMatch : true, // Assume match if not verified
    issues
  };
}

/**
 * Verify row count matches expected
 */
export function verifyRowCount(
  expected: number,
  actual: number
): { isValid: boolean; message: string } {
  if (expected === actual) {
    return { isValid: true, message: 'Row count matches' };
  } else {
    return {
      isValid: false,
      message: `Row count mismatch: expected ${expected}, got ${actual}`
    };
  }
}

/**
 * Calculate data statistics for verification
 */
export function calculateDataStatistics(rows: Record<string, any>[]): {
  rowCount: number;
  columnCount: number;
  checksum: string;
  sampleRows: Record<string, any>[];
} {
  const rowCount = rows.length;
  const columnCount = rows.length > 0 ? Object.keys(rows[0]).length : 0;
  const checksum = rows.length > 0 ? calculateRowsChecksum(rows) : '';
  
  // Get sample rows (first, middle, last)
  const sampleRows: Record<string, any>[] = [];
  if (rows.length > 0) {
    sampleRows.push(rows[0]);
    if (rows.length > 2) {
      sampleRows.push(rows[Math.floor(rows.length / 2)]);
      sampleRows.push(rows[rows.length - 1]);
    } else if (rows.length === 2) {
      sampleRows.push(rows[1]);
    }
  }
  
  return {
    rowCount,
    columnCount,
    checksum,
    sampleRows
  };
}
