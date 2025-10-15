/**
 * Centralized survey source color constants
 * Ensures consistent colors across all mapping screens
 */

export const SURVEY_COLORS = {
  'SullivanCotter': '#818CF8',  // Indigo
  'MGMA': '#34D399',            // Green
  'Gallagher': '#F472B6',       // Pink
  'ECG': '#FBBF24',             // Amber
  'AMGA': '#60A5FA',            // Blue
  'Learned': '#9CA3AF'          // Gray
} as const;

/**
 * Get survey source color with fallback
 * @param source - Survey source name
 * @returns Hex color code
 */
export const getSurveySourceColor = (source: string): string => {
  // Handle variations in survey source names
  const normalizedSource = source.toLowerCase();
  
  if (normalizedSource.includes('sullivancotter')) {
    return SURVEY_COLORS['SullivanCotter'];
  }
  if (normalizedSource.includes('gallagher')) {
    return SURVEY_COLORS['Gallagher'];
  }
  if (normalizedSource.includes('mgma')) {
    return SURVEY_COLORS['MGMA'];
  }
  if (normalizedSource.includes('ecg')) {
    return SURVEY_COLORS['ECG'];
  }
  if (normalizedSource.includes('amga')) {
    return SURVEY_COLORS['AMGA'];
  }
  if (normalizedSource.includes('learned')) {
    return SURVEY_COLORS['Learned'];
  }
  
  // Fallback to exact match
  return SURVEY_COLORS[source as keyof typeof SURVEY_COLORS] || '#9CA3AF';
};
