/**
 * Character encoding utilities for handling Unicode characters in CSV files
 */

/**
 * Common Unicode character replacements for CSV data
 */
const UNICODE_REPLACEMENTS: Record<string, string> = {
  // Em dashes and en dashes
  '—': '-', // Em dash
  '–': '-', // En dash
  '−': '-', // Minus sign
  
  // Smart quotes
  '"': '"', // Left double quotation mark
  '"': '"', // Right double quotation mark
  ''': "'", // Left single quotation mark
  ''': "'", // Right single quotation mark
  
  // Other common problematic characters
  '…': '...', // Horizontal ellipsis
  '–': '-', // En dash (alternative)
  '—': '-', // Em dash (alternative)
  '−': '-', // Minus sign (alternative)
  '×': 'x', // Multiplication sign
  '÷': '/', // Division sign
  '±': '+/-', // Plus-minus sign
  '°': ' degrees', // Degree sign
  '™': ' (TM)', // Trademark
  '®': ' (R)', // Registered trademark
  '©': ' (C)', // Copyright
  '¢': ' cents', // Cent sign
  '£': ' pounds', // Pound sign
  '¥': ' yen', // Yen sign
  '€': ' euros', // Euro sign
  '§': ' Section ', // Section sign
  '¶': ' Paragraph ', // Paragraph sign
  '†': ' *', // Dagger
  '‡': ' **', // Double dagger
  '•': ' * ', // Bullet
  '·': ' * ', // Middle dot
  '‣': ' * ', // Triangular bullet
  '◦': ' * ', // White bullet
  '▪': ' * ', // Black square
  '▫': ' * ', // White square
  '▬': ' * ', // Black rectangle
  '▭': ' * ', // White rectangle
  '▮': ' * ', // Black vertical rectangle
  '▯': ' * ', // White vertical rectangle
  '▰': ' * ', // Black parallelogram
  '▱': ' * ', // White parallelogram
  '▲': ' ^ ', // Black up-pointing triangle
  '△': ' ^ ', // White up-pointing triangle
  '▶': ' > ', // Black right-pointing triangle
  '▷': ' > ', // White right-pointing triangle
  '▼': ' v ', // Black down-pointing triangle
  '▽': ' v ', // White down-pointing triangle
  '◀': ' < ', // Black left-pointing triangle
  '◁': ' < ', // White left-pointing triangle
  '◆': ' * ', // Black diamond
  '◇': ' * ', // White diamond
  '◈': ' * ', // White diamond containing black small diamond
  '◉': ' * ', // Fisheye
  '◎': ' * ', // Bullseye
  '●': ' * ', // Black circle
  '○': ' * ', // White circle
  '◐': ' * ', // Circle with left half black
  '◑': ' * ', // Circle with right half black
  '◒': ' * ', // Circle with lower half black
  '◓': ' * ', // Circle with upper half black
  '◔': ' * ', // Circle with upper right quadrant black
  '◕': ' * ', // Circle with all but upper left quadrant black
  '◖': ' * ', // Left half black circle
  '◗': ' * ', // Right half black circle
  '◘': ' * ', // Inverse bullet
  '◙': ' * ', // Inverse white circle
  '◚': ' * ', // Upper half inverse white circle
  '◛': ' * ', // Lower half inverse white circle
  '◜': ' * ', // Upper left quadrant circular arc
  '◝': ' * ', // Upper right quadrant circular arc
  '◞': ' * ', // Lower right quadrant circular arc
  '◟': ' * ', // Lower left quadrant circular arc
  '◠': ' * ', // Upper half circle
  '◡': ' * ', // Lower half circle
  '◢': ' * ', // Black lower right triangle
  '◣': ' * ', // Black lower left triangle
  '◤': ' * ', // Black upper left triangle
  '◥': ' * ', // Black upper right triangle
  '◦': ' * ', // White bullet
  '◧': ' * ', // Square with left half black
  '◨': ' * ', // Square with right half black
  '◩': ' * ', // Square with upper left diagonal half black
  '◪': ' * ', // Square with lower right diagonal half black
  '◫': ' * ', // White square with vertical bisecting line
  '◬': ' * ', // White up-pointing triangle with dot
  '◭': ' * ', // Up-pointing triangle with left half black
  '◮': ' * ', // Up-pointing triangle with right half black
  '◯': ' * ', // Large circle
  '◰': ' * ', // White square with upper left quadrant
  '◱': ' * ', // White square with lower left quadrant
  '◲': ' * ', // White square with lower right quadrant
  '◳': ' * ', // White square with upper right quadrant
  '◴': ' * ', // White circle with upper left quadrant
  '◵': ' * ', // White circle with lower left quadrant
  '◶': ' * ', // White circle with lower right quadrant
  '◷': ' * ', // White circle with upper right quadrant
  '◸': ' * ', // Upper left triangle
  '◹': ' * ', // Upper right triangle
  '◺': ' * ', // Lower left triangle
  '◻': ' * ', // White medium square
  '◼': ' * ', // Black medium square
  '◽': ' * ', // White medium small square
  '◾': ' * ', // Black medium small square
  '◿': ' * ', // Lower right triangle
};

/**
 * Clean text by replacing problematic Unicode characters
 */
export const cleanUnicodeText = (text: string): string => {
  if (!text) return text;
  
  let cleaned = text;
  
  // Replace known Unicode characters
  Object.entries(UNICODE_REPLACEMENTS).forEach(([unicode, replacement]) => {
    cleaned = cleaned.replace(new RegExp(unicode, 'g'), replacement);
  });
  
  // Remove any remaining non-printable characters except tabs and newlines
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize whitespace (but preserve intentional spaces)
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
};

/**
 * Clean an array of strings (like CSV headers or values)
 */
export const cleanUnicodeArray = (array: string[]): string[] => {
  return array.map(item => cleanUnicodeText(item));
};

/**
 * Clean CSV data by processing headers and all values
 */
export const cleanCSVData = (csvText: string): string => {
  if (!csvText) return csvText;
  
  // Split into lines
  const lines = csvText.split('\n');
  
  // Clean each line
  const cleanedLines = lines.map(line => {
    // Split by comma, but be careful with quoted values
    const parts = line.split(',');
    const cleanedParts = parts.map(part => cleanUnicodeText(part));
    return cleanedParts.join(',');
  });
  
  return cleanedLines.join('\n');
};

/**
 * Detect encoding issues in text
 */
export const detectEncodingIssues = (text: string): string[] => {
  const issues: string[] = [];
  
  // Check for replacement characters (diamond with question mark)
  if (text.includes('')) {
    issues.push('Found replacement characters () - possible encoding issues');
  }
  
  // Check for common problematic Unicode characters
  Object.keys(UNICODE_REPLACEMENTS).forEach(unicode => {
    if (text.includes(unicode)) {
      issues.push(`Found Unicode character: ${unicode} (${unicode.charCodeAt(0).toString(16)})`);
    }
  });
  
  return issues;
};

/**
 * Get a summary of encoding issues found
 */
export const getEncodingSummary = (text: string): {
  hasIssues: boolean;
  issues: string[];
  recommendations: string[];
} => {
  const issues = detectEncodingIssues(text);
  const hasIssues = issues.length > 0;
  
  const recommendations = hasIssues ? [
    'Consider saving your CSV file with UTF-8 encoding',
    'Avoid using special characters like em dashes (—) or smart quotes',
    'Use standard hyphens (-) instead of em dashes (—)',
    'Use straight quotes (") instead of curly quotes (" ")'
  ] : [];
  
  return {
    hasIssues,
    issues,
    recommendations
  };
};
