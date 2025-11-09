/**
 * Enterprise-Grade Character Encoding Handling
 * 
 * Provides encoding detection, conversion, and character normalization
 * following enterprise standards (Google/BigQuery approach).
 * 
 * Handles:
 * - UTF-8 (default)
 * - Windows-1252 (common CSV encoding)
 * - ISO-8859-1 (fallback)
 * - Character normalization (em dashes, smart quotes, etc.)
 */

/**
 * Represents an encoding issue detected in the text
 */
export interface EncodingIssue {
  type: 'replacement_character' | 'question_mark' | 'invalid_sequence' | 'suspicious_pattern';
  position?: number;
  description: string;
}

/**
 * Result of reading a file with encoding detection
 */
export interface FileEncodingResult {
  text: string;
  encoding: string;
  issues: EncodingIssue[];
  normalized: boolean;
}

/**
 * Detects encoding issues in text
 * Scans for Unicode replacement characters, suspicious patterns, and encoding errors
 * 
 * @param text - Text to analyze
 * @returns Array of detected encoding issues
 */
export function detectEncodingIssues(text: string): EncodingIssue[] {
  const issues: EncodingIssue[] = [];
  
  // Unicode replacement character (U+FFFD) - indicates invalid UTF-8
  const replacementCharPattern = /\uFFFD/g;
  let match;
  while ((match = replacementCharPattern.exec(text)) !== null) {
    issues.push({
      type: 'replacement_character',
      position: match.index,
      description: 'Unicode replacement character detected (invalid UTF-8 sequence)'
    });
  }
  
  // Check for suspicious patterns that might indicate encoding issues
  // Question marks in contexts where they shouldn't appear (e.g., in the middle of words)
  const suspiciousQuestionMarkPattern = /[a-zA-Z]\?[a-zA-Z]/g;
  while ((match = suspiciousQuestionMarkPattern.exec(text)) !== null) {
    issues.push({
      type: 'question_mark',
      position: match.index + 1,
      description: 'Question mark in unexpected context (possible encoding error)'
    });
  }
  
  // Check for high-frequency replacement characters (indicates systematic encoding issue)
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  if (replacementCount > text.length * 0.01) { // More than 1% replacement characters
    issues.push({
      type: 'suspicious_pattern',
      description: `High frequency of replacement characters (${replacementCount} found) - likely encoding mismatch`
    });
  }
  
  return issues;
}

/**
 * Reads a file with encoding detection and conversion
 * Attempts multiple encodings with fallback strategy
 * 
 * @param file - File to read
 * @returns Promise resolving to text, detected encoding, and any issues found
 */
export async function readFileWithEncoding(
  file: File
): Promise<{ text: string; encoding: string; issues: EncodingIssue[] }> {
  const encodings = ['utf-8', 'windows-1252', 'iso-8859-1'];
  let bestResult: { text: string; encoding: string; issues: EncodingIssue[] } | null = null;
  let bestIssueCount = Infinity;
  
  // Try each encoding
  for (const encoding of encodings) {
    try {
      let text: string;
      
      if (encoding === 'utf-8') {
        // Use browser's default UTF-8 reading
        text = await file.text();
      } else {
        // Use TextDecoder for other encodings
        const arrayBuffer = await file.arrayBuffer();
        const decoder = new TextDecoder(encoding, { fatal: false });
        text = decoder.decode(arrayBuffer);
      }
      
      // Detect issues with this encoding
      const issues = detectEncodingIssues(text);
      
      // If no issues, this is our best result
      if (issues.length === 0) {
        console.log(`🔍 Encoding detection: ${encoding} - No issues detected`);
        return { text, encoding, issues: [] };
      }
      
      // Track the encoding with the fewest issues
      if (issues.length < bestIssueCount) {
        bestIssueCount = issues.length;
        bestResult = { text, encoding, issues };
      }
      
      console.log(`🔍 Encoding detection: ${encoding} - ${issues.length} issues found`);
    } catch (error) {
      console.warn(`⚠️ Failed to decode with ${encoding}:`, error);
      continue;
    }
  }
  
  // Return the best result we found, or fallback to UTF-8
  if (bestResult) {
    console.log(`✅ Using encoding: ${bestResult.encoding} (${bestResult.issues.length} issues)`);
    return bestResult;
  }
  
  // Final fallback: UTF-8 with whatever we get
  console.warn('⚠️ All encoding attempts had issues, using UTF-8 fallback');
  const fallbackText = await file.text();
  const fallbackIssues = detectEncodingIssues(fallbackText);
  return {
    text: fallbackText,
    encoding: 'utf-8',
    issues: fallbackIssues
  };
}

/**
 * Normalizes special characters in text
 * Converts Unicode special characters to standard ASCII equivalents
 * 
 * @param text - Text to normalize
 * @returns Normalized text
 */
export function normalizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  let normalized = text;
  
  // Normalize dashes
  normalized = normalized.replace(/\u2014/g, '-');  // Em dash (—) → hyphen (-)
  normalized = normalized.replace(/\u2013/g, '-');  // En dash (–) → hyphen (-)
  
  // Normalize quotes
  normalized = normalized.replace(/\u201C/g, '"');  // Left double quote (") → regular quote (")
  normalized = normalized.replace(/\u201D/g, '"');  // Right double quote (") → regular quote (")
  normalized = normalized.replace(/\u2018/g, "'");   // Left single quote (') → regular apostrophe (')
  normalized = normalized.replace(/\u2019/g, "'");   // Right single quote (') → regular apostrophe (')
  
  // Normalize ellipsis
  normalized = normalized.replace(/\u2026/g, '...'); // Ellipsis (…) → three dots (...)
  
  // Remove zero-width characters
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width space, zero-width non-joiner, zero-width joiner, zero-width no-break space
  
  // Remove other problematic invisible characters
  normalized = normalized.replace(/[\u2000-\u200A]/g, ' '); // Various space characters → regular space
  
  // Replace suspicious question marks (likely encoding errors) with hyphens
  // Pattern: letter?letter (e.g., "Pediatrics?General" → "Pediatrics-General")
  normalized = normalized.replace(/([a-zA-Z])\?([a-zA-Z])/g, '$1-$2');
  
  // Remove standalone replacement characters (box characters)
  normalized = normalized.replace(/\uFFFD/g, '');
  
  return normalized;
}

/**
 * High-level function to read a CSV file with encoding detection and normalization
 * This is the main function to use for reading CSV files in the application
 * 
 * @param file - CSV file to read
 * @returns Promise resolving to comprehensive file reading result
 * 
 * @example
 * ```typescript
 * const { text, encoding, issues, normalized } = await readCSVFile(file);
 * if (issues.length > 0) {
 *   console.warn('Encoding issues detected:', issues);
 * }
 * ```
 */
export async function readCSVFile(file: File): Promise<FileEncodingResult> {
  console.log(`📄 Reading CSV file: ${file.name} (${file.size} bytes)`);
  
  // Step 1: Read file with encoding detection
  const { text: rawText, encoding, issues: encodingIssues } = await readFileWithEncoding(file);
  
  // Step 2: Normalize special characters
  const normalizedText = normalizeText(rawText);
  const wasNormalized = normalizedText !== rawText;
  
  if (wasNormalized) {
    console.log('✨ Applied character normalization');
  }
  
  // Step 3: Detect any remaining issues after normalization
  const finalIssues = detectEncodingIssues(normalizedText);
  
  // Combine encoding issues with any remaining issues
  const allIssues = [...encodingIssues, ...finalIssues];
  
  if (allIssues.length > 0) {
    console.warn(`⚠️ Encoding issues detected: ${allIssues.length} total`);
    allIssues.forEach((issue, index) => {
      console.warn(`  ${index + 1}. ${issue.description}${issue.position !== undefined ? ` (position: ${issue.position})` : ''}`);
    });
  } else {
    console.log('✅ No encoding issues detected');
  }
  
  return {
    text: normalizedText,
    encoding,
    issues: allIssues,
    normalized: wasNormalized
  };
}

