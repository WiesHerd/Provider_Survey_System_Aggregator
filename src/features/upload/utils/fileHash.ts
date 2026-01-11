/**
 * File Hash Utility
 * Uses Web Crypto API for SHA-256 hash calculation
 * Fast and efficient for large files
 */

/**
 * Calculate SHA-256 hash of a file
 * @param file - File to hash
 * @returns Promise resolving to hex string of hash
 */
export async function calculateFileHash(file: File): Promise<string> {
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Calculate SHA-256 hash using Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    
    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.error('Error calculating file hash:', error);
    throw new Error(`Failed to calculate file hash: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate hash of file content (text)
 * Useful for comparing CSV content without file metadata
 * @param content - Text content to hash
 * @returns Promise resolving to hex string of hash
 */
export async function calculateContentHash(content: string): Promise<string> {
  try {
    // Convert string to ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    
    // Calculate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.error('Error calculating content hash:', error);
    throw new Error(`Failed to calculate content hash: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
