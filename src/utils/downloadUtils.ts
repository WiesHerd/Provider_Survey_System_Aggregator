/**
 * Download utilities for handling file downloads in different environments
 */

/**
 * Download a sample file with proper error handling
 */
export const downloadSampleFile = async (format: 'sullivan-cotter' | 'mgma' | 'gallagher' = 'sullivan-cotter') => {
  const fileMap = {
    'sullivan-cotter': 'sample-survey-sullivan-cotter.csv',
    'mgma': 'sample-survey-mgma.csv',
    'gallagher': 'sample-survey-gallagher.csv'
  };
  
  const filename = fileMap[format];
  try {
    // Create a proper URL for the file
    const fileUrl = `${window.location.origin}/${filename}`;
    
    // Fetch the file first to ensure it exists
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    
    // Get the file content
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log(`✅ Successfully downloaded ${filename}`);
  } catch (error) {
    console.error('❌ Download failed:', error);
    
    // Fallback: try direct link approach
    try {
      const link = document.createElement('a');
      link.href = `/${filename}`;
      link.download = filename;
      link.target = '_blank';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`🔄 Fallback download attempted for ${filename}`);
    } catch (fallbackError) {
      console.error('❌ Fallback download also failed:', fallbackError);
      throw new Error(`Unable to download ${filename}. Please try again or contact support.`);
    }
  }
};

/**
 * Download any file from the public directory
 */
export const downloadPublicFile = async (filename: string, displayName?: string) => {
  try {
    const fileUrl = `${window.location.origin}/${filename}`;
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`File not found: ${filename}`);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = displayName || filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error(`Failed to download ${filename}:`, error);
    throw error;
  }
};

/**
 * Get available sample files
 */
export const getAvailableSampleFiles = () => {
  return [
    { filename: 'sample-survey.csv', displayName: 'Sample Survey Data' },
    { filename: 'synthetic_mgma.csv', displayName: 'Synthetic MGMA Data' },
    { filename: 'synthetic_gallagher.csv', displayName: 'Synthetic Gallagher Data' },
    { filename: 'synthetic_sullivan_cotter.csv', displayName: 'Synthetic Sullivan Cotter Data' }
  ];
};

export type UploadTemplateFormat = 'normalized';

interface UploadTemplateRequest {
  dataCategory?: string;
  providerType?: string;
  format?: UploadTemplateFormat;
  expectedFormat?: UploadTemplateFormat;
}

const FORMAT_TEMPLATE_FILES: Record<UploadTemplateFormat, string> = {
  normalized: 'sample-normalized-format.csv'
};

const getScenarioTemplateFile = (dataCategory?: string, providerType?: string): string => {
  const normalizedCategory = (dataCategory || '').toUpperCase().trim();
  const normalizedProvider = (providerType || '').toUpperCase().trim();

  if (normalizedCategory === 'CALL_PAY') {
    return 'sample-call-pay.csv';
  }

  if (normalizedCategory === 'MOONLIGHTING') {
    return 'sample-moonlighting.csv';
  }

  if (normalizedCategory === 'COMPENSATION') {
    if (normalizedProvider === 'APP') {
      return 'sample-app-compensation.csv';
    }
    if (normalizedProvider === 'PHYSICIAN') {
      return 'sample-physician-compensation.csv';
    }
  }

  return 'sample-normalized-format.csv';
};

/**
 * Download the best matching template for the upload scenario.
 * Falls back to a normalized template if inputs are incomplete.
 */
export const downloadUploadTemplate = async ({
  dataCategory,
  providerType,
  format,
  expectedFormat
}: UploadTemplateRequest): Promise<void> => {
  const hasNonNormalizedExpected = expectedFormat && expectedFormat !== 'normalized';
  const filename = format
    ? FORMAT_TEMPLATE_FILES[format]
    : hasNonNormalizedExpected
      ? FORMAT_TEMPLATE_FILES[expectedFormat as UploadTemplateFormat]
      : getScenarioTemplateFile(dataCategory, providerType);

  try {
    await downloadPublicFile(filename);
  } catch (error) {
    console.error(`Failed to download template: ${filename}`, error);
    throw error;
  }
};








