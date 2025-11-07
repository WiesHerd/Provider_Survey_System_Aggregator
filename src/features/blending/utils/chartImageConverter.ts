/**
 * Chart Image Converter Utility
 * 
 * Converts Chart.js chart instances to base64 images for PDF generation
 * Handles waiting for charts to fully render before conversion
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js';

// Register Chart.js components (required for Chart.js to work)
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, Title);

/**
 * Waits for a chart to fully render by checking if the canvas has non-white pixels
 * 
 * @param canvas - The canvas element to check
 * @param maxWaitMs - Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when chart is ready
 */
const waitForChartRender = async (
  canvas: HTMLCanvasElement,
  maxWaitMs: number = 5000
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkInterval = 100; // Check every 100ms
    
    const checkChart = () => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed > maxWaitMs) {
        console.warn('Chart render timeout - proceeding anyway');
        resolve();
        return;
      }
      
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setTimeout(checkChart, checkInterval);
          return;
        }
        
        // Check if canvas has any non-white pixels (indicating chart is rendered)
        const imageData = ctx.getImageData(
          0, 
          0, 
          Math.min(100, canvas.width), 
          Math.min(100, canvas.height)
        );
        const pixels = imageData.data;
        
        // Check for non-white pixels
        let hasContent = false;
        for (let i = 0; i < pixels.length; i += 4) {
          // Check if pixel is not white (allowing for slight variations)
          if (pixels[i] < 250 || pixels[i + 1] < 250 || pixels[i + 2] < 250) {
            hasContent = true;
            break;
          }
        }
        
        if (hasContent) {
          // Chart appears to be rendered, wait a bit more for animations
          setTimeout(() => resolve(), 300);
        } else {
          setTimeout(checkChart, checkInterval);
        }
      } catch (error) {
        console.error('Error checking chart render:', error);
        // If we can't check, assume it's ready after a delay
        setTimeout(() => resolve(), 500);
      }
    };
    
    checkChart();
  });
};

/**
 * Converts a Chart.js chart canvas to a base64 image string
 * 
 * @param canvas - The canvas element containing the chart
 * @param quality - Image quality (0-1, default: 1.0 for high quality)
 * @returns Promise that resolves with base64 image string
 */
export const convertChartToImage = async (
  canvas: HTMLCanvasElement,
  quality: number = 1.0
): Promise<string> => {
  // Wait for chart to fully render
  await waitForChartRender(canvas);
  
  // Convert canvas to base64 image
  return canvas.toDataURL('image/png', quality);
};

/**
 * Converts multiple Chart.js chart canvases to base64 images
 * Processes them sequentially to avoid memory issues
 * 
 * @param canvases - Array of canvas elements
 * @param quality - Image quality (0-1, default: 1.0)
 * @returns Promise that resolves with array of base64 image strings
 */
export const convertChartsToImages = async (
  canvases: HTMLCanvasElement[],
  quality: number = 1.0
): Promise<string[]> => {
  const images: string[] = [];
  
  for (const canvas of canvases) {
    try {
      const image = await convertChartToImage(canvas, quality);
      images.push(image);
    } catch (error) {
      console.error('Error converting chart to image:', error);
      // Add placeholder or empty string to maintain array order
      images.push('');
    }
  }
  
  return images;
};

/**
 * Creates a temporary chart container and renders a chart, then converts it to an image
 * Useful when you need to render a chart specifically for PDF generation
 * 
 * @param chartConfig - Chart.js configuration object
 * @param width - Chart width in pixels (default: 400)
 * @param height - Chart height in pixels (default: 300)
 * @returns Promise that resolves with base64 image string
 */
export const renderChartToImage = async (
  chartConfig: any,
  width: number = 400,
  height: number = 300
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Check if ChartJS is available
      if (typeof ChartJS === 'undefined') {
        console.error('Chart.js is not available. Make sure Chart.js is imported.');
        reject(new Error('Chart.js library is not loaded. Please refresh the page and try again.'));
        return;
      }
      
      // Create temporary container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;
      document.body.appendChild(container);
      
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      container.appendChild(canvas);
      
      // Create chart
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        document.body.removeChild(container);
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      let chart: ChartJS | null = null;
      
      try {
        chart = new ChartJS(ctx, {
          ...chartConfig,
          options: {
            ...chartConfig.options,
            animation: {
              ...chartConfig.options?.animation,
              duration: 0 // Disable animation for faster rendering
            }
          }
        });
      } catch (chartError) {
        console.error('Error creating chart:', chartError);
        document.body.removeChild(container);
        reject(new Error(`Failed to create chart: ${chartError instanceof Error ? chartError.message : 'Unknown error'}`));
        return;
      }
      
      // Wait for chart to render, then convert to image
      waitForChartRender(canvas, 5000).then(() => {
        try {
          const imageData = canvas.toDataURL('image/png', 1.0);
          
          // Clean up
          if (chart) {
            chart.destroy();
          }
          if (container.parentNode) {
            document.body.removeChild(container);
          }
          
          resolve(imageData);
        } catch (error) {
          console.error('Error converting chart to image:', error);
          // Clean up on error
          try {
            if (chart) {
              chart.destroy();
            }
            if (container.parentNode) {
              document.body.removeChild(container);
            }
          } catch (e) {
            // Ignore cleanup errors
          }
          reject(error);
        }
      }).catch((error) => {
        console.error('Error waiting for chart render:', error);
        // Clean up on error
        try {
          if (chart) {
            chart.destroy();
          }
          if (container.parentNode) {
            document.body.removeChild(container);
          }
        } catch (e) {
          // Ignore cleanup errors
        }
        reject(error);
      });
    } catch (error) {
      console.error('Unexpected error in renderChartToImage:', error);
      reject(error);
    }
  });
};

