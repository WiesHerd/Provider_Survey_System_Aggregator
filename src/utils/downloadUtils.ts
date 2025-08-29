/**
 * Download utilities for handling file downloads in different environments
 */

/**
 * Download a sample file with proper error handling
 */
export const downloadSampleFile = async (filename: string = 'sample-survey.csv') => {
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


